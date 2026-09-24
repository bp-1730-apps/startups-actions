/**
 * Startups Action List — Apps Script backend
 * ===========================================
 * This turns a Google Sheet into the API the HTML/JS app talks to.
 *
 * SET UP (one time):
 *   1. Create a new Google Sheet (any name). Open Extensions > Apps Script.
 *   2. Delete anything in the editor and paste this whole file in.
 *   3. Change DASHBOARD_KEY below to a passcode of your choosing.
 *      It must match CONFIG.DASHBOARD_KEY in config.js exactly.
 *   4. Run the "setup" function once (select it in the dropdown at the
 *      top of the editor, click Run). Approve the permissions prompt.
 *      This creates the "Actions" tab with the right headers.
 *   5. Click Deploy > New deployment > gear icon > Web app.
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      Click Deploy, authorize again if asked, then copy the "Web app URL".
 *   6. Paste that URL into API_BASE_URL in config.js.
 *
 * WHEN YOU EDIT THIS FILE LATER: you must create a NEW deployment (or
 * use Deploy > Manage deployments > edit > New version) for changes to
 * go live — saving alone does not update the running web app.
 *
 * SECURITY NOTE: "create" (floor reports) is intentionally open to
 * anyone with the report link — that's the point, no login for the
 * floor. "list" and "update" require DASHBOARD_KEY, which is what
 * gates the management dashboard. This is a light deterrent, not real
 * security — anyone who learns the key can read/edit everything, and
 * anyone with the Sheet's own edit link can bypass the API entirely.
 * Don't put anything sensitive in this sheet.
 */

const DASHBOARD_KEY = "01730"; // must match config.js
const SHEET_NAME = "Actions";
const HEADERS = [
  "id", "line", "type", "startedOnTime", "startDate", "area",
  "action", "owner", "expectedCompletion", "status", "comments",
  "createdAt", "updatedAt",
];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  sheet.clear();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  sheet.setFrozenRows(1);
  // Keep every column as plain text so date-looking strings aren't
  // silently reformatted by Sheets' locale auto-detection.
  sheet.getRange(1, 1, 1000, HEADERS.length).setNumberFormat("@");
  SpreadsheetApp.flush();
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    setup();
    sheet = ss.getSheetByName(SHEET_NAME);
  }
  return sheet;
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function toIsoDateString_(val) {
  if (val === null || val === undefined || val === "") return "";
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(val);
}

function toBool_(val) {
  return val === true || val === "true" || val === "TRUE";
}

function rowToObject_(row, idxById) {
  const obj = {};
  HEADERS.forEach((h, i) => (obj[h] = row[i]));
  obj.startedOnTime = obj.startedOnTime === "" ? "" : toBool_(obj.startedOnTime);
  obj.startDate = toIsoDateString_(obj.startDate);
  obj.expectedCompletion = toIsoDateString_(obj.expectedCompletion);
  obj.createdAt = toIsoDateString_(obj.createdAt) === "" ? obj.createdAt : obj.createdAt;
  return obj;
}

function listRows_(lineFilter) {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  let items = values.filter((r) => r[0]).map((r) => rowToObject_(r));
  if (lineFilter) items = items.filter((i) => i.line === lineFilter);
  return items;
}

function createRow_(body) {
  const sheet = getSheet_();
  const id = Utilities.getUuid();
  const now = new Date().toISOString();
  const row = HEADERS.map((h) => {
    switch (h) {
      case "id": return id;
      case "action": return body.action_text || "";
      case "createdAt": return now;
      case "updatedAt": return now;
      case "startedOnTime": return body.startedOnTime === true ? "true" : body.startedOnTime === false ? "false" : "";
      default: return body[h] !== undefined ? body[h] : "";
    }
  });
  sheet.appendRow(row);
  return id;
}

function updateRow_(body) {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("not found");
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let targetRow = -1;
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === body.id) {
      targetRow = i + 2;
      break;
    }
  }
  if (targetRow === -1) throw new Error("not found");

  const updatable = ["status", "area", "action", "owner", "expectedCompletion", "comments", "type"];
  updatable.forEach((field) => {
    if (body[field] !== undefined) {
      const col = HEADERS.indexOf(field) + 1;
      sheet.getRange(targetRow, col).setValue(body[field]);
    }
  });
  const updatedAtCol = HEADERS.indexOf("updatedAt") + 1;
  sheet.getRange(targetRow, updatedAtCol).setValue(new Date().toISOString());
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === "list") {
      if (e.parameter.key !== DASHBOARD_KEY) return jsonOutput_({ ok: false, error: "unauthorized" });
      return jsonOutput_({ ok: true, items: listRows_(e.parameter.line || null) });
    }
    return jsonOutput_({ ok: false, error: "unknown action" });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === "create") {
      if (!body.line || !String(body.line).trim()) {
        return jsonOutput_({ ok: false, error: "missing line" });
      }
      const id = createRow_(body);
      return jsonOutput_({ ok: true, id: id });
    }
    if (body.action === "update") {
      if (body.key !== DASHBOARD_KEY) return jsonOutput_({ ok: false, error: "unauthorized" });
      updateRow_(body);
      return jsonOutput_({ ok: true });
    }
    return jsonOutput_({ ok: false, error: "unknown action" });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}
