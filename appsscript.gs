/**
 * North Star Technologies
 * Google Apps Script: Website Inquiry -> Google Sheet + Email Notification
 *
 * SETUP:
 * 1. EITHER open your sheet and go to Extensions > Apps Script
 *    (script becomes "bound" to the sheet), OR create a standalone
 *    project at script.google.com and set SPREADSHEET_ID below.
 * 2. Paste this entire script into the editor.
 * 3. Replace ADMIN_EMAIL below with the notification inbox.
 * 4. Deploy > New deployment > Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 *      - Copy the /exec URL and paste it into script.js (SHEET_API_URL).
 * 5. Run installTrigger() ONCE to enable email on manual row insertions.
 */

var ADMIN_EMAIL = 'northstartechnologies.in@gmail.com'; // change to your inbox
var SHEET_NAME = 'Sheet1';                          // change if your tab is named differently

// OPTIONAL: for standalone scripts only. Find it in the sheet URL:
// https://docs.google.com/spreadsheets/d/THIS_ID_IS_HERE/edit
var SPREADSHEET_ID = '';

/**
 * Input sanitization utilities for server-side validation
 */
function sanitizeInput(input, type) {
  if (input === undefined || input === null) return '';
  var str = String(input);
  
  switch (type) {
    case 'text':
      return str
        .trim()
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .slice(0, 5000);
    case 'email':
      return str.trim().toLowerCase().slice(0, 254);
    case 'phone':
      return str.replace(/\D/g, '').slice(0, 15);
    case 'service':
      return str.trim().slice(0, 100);
    case 'message':
      return str
        .trim()
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .slice(0, 10000);
    case 'ip':
      return str.trim().slice(0, 45);
    default:
      return str.trim().slice(0, 5000);
  }
}

function validateEmail(email) {
  var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

function validatePhone(phone) {
  var pattern = /^[0-9]{10}$/;
  return pattern.test(phone);
}

/**
 * Returns the target spreadsheet. Works for both bound scripts
 * (Extensions > Apps Script) and standalone scripts (SPREADSHEET_ID set).
 */
function getTargetSheet() {
  var ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

/**
 * GET handler: lets you verify the web app is alive and reachable
 * by opening the /exec URL directly in a browser.
 */
function doGet() {
  var sheet = getTargetSheet();
  var html =
    '<h2>North Star Technologies — Web App OK</h2>' +
    '<p>Sheet: ' + sheet.getName() + '</p>' +
    '<p>Rows: ' + sheet.getLastRow() + '</p>' +
    '<p>Send a POST (or use the website form) to add an inquiry.</p>';
  return HtmlService.createHtmlOutput(html);
}

/**
 * Receives form POSTs from the website, appends a row to the sheet,
 * and emails the admin inbox with the inquiry details.
 */
function doPost(e) {
  var response = { result: 'success', error: '', email: '' };

  try {
    var d = (e && e.parameter) || {};

    // 1. Honeypot check - silent drop for spam bots
    if (d.website_hp) {
      Logger.log('Spam blocked via honeypot trap.');
      return ContentService.createTextOutput(JSON.stringify({ result: 'success', note: 'bot_ignored' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Keyword Spam Filter
    var spamKeywords = ['casino', 'poker', 'viagra', 'crypto', 'seo ranking', 'backlinks', 'telegram.me', 'wa.me'];
    var msgLower = (d.message || '').toLowerCase();
    var nameLower = (d.name || '').toLowerCase();
    var isSpam = spamKeywords.some(function(kw) {
      return msgLower.indexOf(kw) !== -1 || nameLower.indexOf(kw) !== -1;
    });

    if (isSpam) {
      Logger.log('Spam blocked via keyword filter. Email: ' + d.email);
      return ContentService.createTextOutput(JSON.stringify({ result: 'success', note: 'spam_keyword_ignored' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Server-side sanitization
    var clientIp = sanitizeInput(d.ip, 'ip');
    var clientLoc = sanitizeInput(d.location, 'text');
    if (!clientLoc || clientLoc === 'Unknown') {
      clientLoc = getLocationFromIP(clientIp);
    }

    var sanitized = {
      name: sanitizeInput(d.name, 'text'),
      company: sanitizeInput(d.company, 'text'),
      email: sanitizeInput(d.email, 'email'),
      phone: sanitizeInput(d.phone, 'phone'),
      service: sanitizeInput(d.service, 'service'),
      message: sanitizeInput(d.message, 'message'),
      ip: clientIp,
      location: clientLoc,
      consent: d.consent || '',
      timestamp: d.timestamp || new Date().toLocaleString()
    };

    // Server-side validation
    if (!sanitized.name || !sanitized.email || !sanitized.message) {
      response.result = 'error';
      response.error = 'Name, email, and message are required.';
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (!validateEmail(sanitized.email)) {
      response.result = 'error';
      response.error = 'Invalid email address.';
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (sanitized.phone && !validatePhone(sanitized.phone)) {
      response.result = 'error';
      response.error = 'Invalid phone number. Must be 10 digits.';
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (sanitized.consent !== 'Yes') {
      response.result = 'error';
      response.error = 'Privacy policy consent is required.';
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = getTargetSheet();

    var row = [
      sanitized.name,
      sanitized.company,
      sanitized.email,
      sanitized.phone,
      sanitized.service,
      sanitized.message,
      sanitized.ip,
      sanitized.location,
      sanitized.timestamp
    ];
    sheet.appendRow(row);

    // Remember the row we just added so onChange() does not email it again.
    CacheService.getScriptCache().put('lastWebAppRow', String(sheet.getLastRow()), 60);

    // Send the email directly from the web app call so it works
    // without requiring the onChange trigger to be installed.
    response.email = sendInquiryEmail(sanitized);
  } catch (err) {
    response.result = 'error';
    response.error = String(err);
    Logger.log('doPost ERROR: ' + err);
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Sends a formatted email of the inquiry to the admin inbox.
 * Returns 'sent' or the error message so it can be surfaced.
 */
function sendInquiryEmail(d) {
  d = d || {};
  var subject = 'New Website Inquiry - ' + (d.name || 'North Star Website');
  var body = [
    'A new inquiry was received on the North Star Technologies website.',
    '-------------------------------------------',
    'Name:        ' + (d.name || '-'),
    'Company:     ' + (d.company || '-'),
    'Email:       ' + (d.email || '-'),
    'Phone:       ' + (d.phone || '-'),
    'Service:     ' + (d.service || '-'),
    'IP Address:  ' + (d.ip || 'Unknown'),
    'Location:    ' + (d.location || 'Unknown'),
    'Message:     ' + (d.message || '-'),
    'Submitted:   ' + (d.timestamp || '-'),
    '-------------------------------------------',
    'Please respond to the client at the earliest.'
  ].join('\n');

  try {
    MailApp.sendEmail(ADMIN_EMAIL, subject, body);
    Logger.log('Email sent to ' + ADMIN_EMAIL);
    return 'sent';
  } catch (err) {
    Logger.log('Email send failed: ' + err);
    return 'FAILED: ' + err;
  }
}

/**
 * Run this from the editor to verify email sending works (View > Logs).
 */
function testEmail() {
  var status = sendInquiryEmail({
    name: 'Test User',
    company: 'Test Company Pvt Ltd',
    email: 'test@example.com',
    phone: '+91 98765 43210',
    service: 'Electronic Security',
    message: 'This is a test email from the Apps Script.',
    ip: '192.168.1.1',
    timestamp: new Date().toLocaleString()
  });
  Logger.log('testEmail result: ' + status);
}

/**
 * Emails the latest row when a new row is inserted manually
 * (requires the installable onChange trigger installed via installTrigger()).
 */
function onChange(e) {
  if (!e || e.changeType !== 'INSERT_ROW') return;

  try {
    var sheet = getTargetSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    // Skip if this row was just added by the web app (already emailed by doPost).
    var cached = CacheService.getScriptCache().get('lastWebAppRow');
    if (cached === String(lastRow)) return;

    var values = sheet.getRange(lastRow, 1, 1, 8).getValues()[0] || [];
    var d = {
      name: values[0] || '',
      company: values[1] || '',
      email: values[2] || '',
      phone: values[3] || '',
      service: values[4] || '',
      message: values[5] || '',
      ip: values[6] || 'Unknown',
      timestamp: values[7] || new Date().toLocaleString()
    };

    // Skip blank/partial rows so we don't email empty data.
    if (!d.name || !d.email) return;

    sendInquiryEmail(d);
  } catch (err) {
    Logger.log('onChange ERROR: ' + err);
  }
}

/**
 * Run this once from the Apps Script editor (click Run) to install
 * the onChange trigger that emails you when rows are added manually.
 */
function installTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (t) {
    if (t.getHandlerFunction() === 'onChange') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('onChange')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onChange()
    .create();
  Logger.log('onChange trigger installed.');
}

/**
 * Server-side IP-to-Geo lookup fallback.
 */
function getLocationFromIP(ip) {
  if (!ip || ip === 'Unknown') return 'Unknown';
  try {
    var response = UrlFetchApp.fetch('http://ip-api.com/json/' + ip + '?fields=status,country,regionName,city', { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      var data = JSON.parse(response.getContentText());
      if (data.status === 'success') {
        var loc = [data.city, data.regionName, data.country].filter(Boolean).join(', ');
        return loc || 'Unknown';
      }
    }
  } catch (err) {
    Logger.log('getLocationFromIP error: ' + err);
  }
  return 'Unknown';
}
