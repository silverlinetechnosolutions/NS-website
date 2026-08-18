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

    var sheet = getTargetSheet();

    var row = [
      d.name || '',
      d.company || '',
      d.email || '',
      d.phone || '',
      d.service || '',
      d.message || '',
      d.timestamp || new Date().toLocaleString()
    ];
    sheet.appendRow(row);

    // Remember the row we just added so onChange() does not email it again.
    CacheService.getScriptCache().put('lastWebAppRow', String(sheet.getLastRow()), 60);

    // Send the email directly from the web app call so it works
    // without requiring the onChange trigger to be installed.
    response.email = sendInquiryEmail(d);
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
    'Name:      ' + (d.name || '-'),
    'Company:   ' + (d.company || '-'),
    'Email:     ' + (d.email || '-'),
    'Phone:     ' + (d.phone || '-'),
    'Service:   ' + (d.service || '-'),
    'Message:   ' + (d.message || '-'),
    'Submitted: ' + (d.timestamp || '-'),
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

    var values = sheet.getRange(lastRow, 1, 1, 7).getValues()[0] || [];
    var d = {
      name: values[0] || '',
      company: values[1] || '',
      email: values[2] || '',
      phone: values[3] || '',
      service: values[4] || '',
      message: values[5] || '',
      timestamp: values[6] || new Date().toLocaleString()
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
