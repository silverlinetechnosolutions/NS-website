/**
 * North Star Technologies
 * Google Apps Script: Website Inquiry -> Google Sheet + Email Notification
 *
 * SETUP:
 * 1. Paste this entire script into Extensions > Apps Script on your target sheet.
 * 2. Replace ADMIN_EMAIL below with the notification inbox.
 * 3. Deploy > New deployment > Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 *      - Copy the /exec URL and paste it into script.js (SHEET_API_URL).
 * 4. Run installTrigger() ONCE to enable email on manual row insertions.
 */

var ADMIN_EMAIL = 'info@northstartechnologies.net'; // change to your inbox
var SHEET_NAME = 'Sheet1';                          // change if your tab is named differently

/**
 * Receives form POSTs from the website, appends a row to the sheet,
 * and emails the admin inbox with the inquiry details.
 */
function doPost(e) {
  var response = { result: 'success', error: '', email: '' };

  try {
    var d = (e && e.parameter) || {};

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

    var row = [
      d.name || '',
      d.email || '',
      d.phone || '',
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
    'Email:     ' + (d.email || '-'),
    'Phone:     ' + (d.phone || '-'),
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
    email: 'test@example.com',
    phone: '+91 98765 43210',
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    // Skip if this row was just added by the web app (already emailed by doPost).
    var cached = CacheService.getScriptCache().get('lastWebAppRow');
    if (cached === String(lastRow)) return;

    var values = sheet.getRange(lastRow, 1, 1, 5).getValues()[0] || [];
    var d = {
      name: values[0] || '',
      email: values[1] || '',
      phone: values[2] || '',
      message: values[3] || '',
      timestamp: values[4] || new Date().toLocaleString()
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
