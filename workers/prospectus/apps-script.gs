// Paste into the "ZMMC Franchisee Enquiries" sheet: Extensions > Apps Script.
// Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
// SHEET_SECRET must match the Worker's SHEET_SECRET.
const SHEET_SECRET = 'PASTE_SECRET_HERE';
const TAB_NAME = 'Enquiries';

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.secret !== SHEET_SECRET) return reply({ ok: false, error: 'unauthorised' });

    lock.waitLock(10000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_NAME);
    const row = sheet.getLastRow() + 1;

    sheet.getRange(row, 1).setNumberFormat('dd mmm yyyy');
    sheet.getRange(row, 4).setNumberFormat('@');
    sheet.getRange(row, 1, 1, 11).setValues([[
      new Date(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.location || '',
      data.message || '',
      data.source || 'Website form',
      'Enquiry',
      '',
      data.nextAction || '',
      data.notes || '',
    ]]);
    if (row > 2) {
      sheet.getRange(2, 8).copyTo(sheet.getRange(row, 8), SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
    }
    return reply({ ok: true, row: row });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
