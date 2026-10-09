const OWNER_EMAIL = "anieeshmenon@gmail.com";
const SHEET_ID = "1XfpKLyYl-K12rLrVs1hmmwMljt_eF5ur2gPUZ8RraVM";

const SUB_COLS = ["Timestamp","Status","Company","Website","LinkedIn","Type","District","Sector","Stage","Founded","Description","email"];
const NL_COLS  = ["Timestamp","email"];

function book_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function sheet_(name, cols) {
  const ss = book_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(cols);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, cols.length).setFontWeight("bold");
    if (name === "Submissions") {
      const rule = SpreadsheetApp.newDataValidation().requireValueInList(["Pending","Approved","Rejected"]).build();
      sh.getRange("B2:B").setDataValidation(rule);
    }
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Runs automatically when the website sends a form. Don't run this by hand.
function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p._honey) return json_({ ok: true });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (p.Source === "Newsletter") {
      sheet_("Newsletter", NL_COLS).appendRow([new Date(), p.email || ""]);
      MailApp.sendEmail(OWNER_EMAIL, "DXB Startup Map - newsletter signup", "New subscriber: " + (p.email || ""));
    } else {
      const row = SUB_COLS.map(function (c) {
        if (c === "Timestamp") return new Date();
        if (c === "Status") return "Pending";
        return p[c] || "";
      });
      sheet_("Submissions", SUB_COLS).appendRow(row);
      const lines = SUB_COLS.slice(2).map(function (c) { return c + ": " + (p[c] || "-"); }).join("\n");
      const body = lines + "\n\nTo approve: open the sheet and set Status to Approved.\n" + book_().getUrl();
      MailApp.sendEmail({
        to: OWNER_EMAIL,
        subject: "DXB Startup Map - new submission: " + (p.Company || ""),
        body: body,
        replyTo: p.email || OWNER_EMAIL
      });
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Runs automatically when the website loads. Returns only Approved rows.
function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.action !== "approved") return json_({ ok: true });
  const sh = sheet_("Submissions", SUB_COLS);
  const data = sh.getDataRange().getValues();
  const head = data[0];
  const rows = data.slice(1);
  const out = rows
    .filter(function (r) { return String(r[head.indexOf("Status")]).trim() === "Approved"; })
    .map(function (r) {
      const o = {};
      ["Company","Website","Type","District","Sector","Stage","Description"].forEach(function (k) {
        o[k] = r[head.indexOf(k)];
      });
      return o;
    });
  return json_(out);
}

// RUN THIS ONE BY HAND: imports past submissions from your Gmail.
function importFromGmail() {
  const label = GmailApp.getUserLabelByName("DXB-imported") || GmailApp.createLabel("DXB-imported");
  const query = 'subject:("Startup Map") -label:DXB-imported';
  const sub = sheet_("Submissions", SUB_COLS);
  const nl = sheet_("Newsletter", NL_COLS);
  let added = 0, subs = 0;
  const threads = GmailApp.search(query, 0, 200);
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (m) {
      const f = parseFields_(m.getBody());
      if (Object.keys(f).length === 0) return;
      if (/newsletter/i.test(m.getSubject()) || f.Source === "Newsletter") {
        nl.appendRow([m.getDate(), f.email || ""]);
        subs++;
      } else {
        sub.appendRow(SUB_COLS.map(function (c) {
          if (c === "Timestamp") return m.getDate();
          if (c === "Status") return "Pending";
          return f[c] || "";
        }));
        added++;
      }
    });
    thread.addLabel(label);
  });
  Logger.log("Found " + threads.length + " email threads. Imported " + added + " submissions and " + subs + " newsletter signups.");
}

// Reads the field table inside FormSubmit emails.
function parseFields_(html) {
  const out = {};
  function strip(s) {
    return s.replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .trim();
  }
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  rows.forEach(function (r) {
    const cells = (r.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || []).map(strip);
    if (cells.length >= 2 && cells[0]) out[cells[0]] = cells[1];
  });
  return out;
}
