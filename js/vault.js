"use strict";
// ---------- Vault (คลังข้อมูล): folders holding notes / links / files, behind a 6-digit screen lock ----------
// Data lives in fin.items next to the money records, so it is persisted, exported and synced the same way:
//   { kind:"vfold", id, name, color, parent:"" | folderId }
//   { kind:"vitem", id, type:"note"|"link"|"file", folder, title, body, url, desc, fileName, fileType, fileSize, data,
//     color, tags:[], pinned }
// The lock (PIN hash + recovery-code hash + idle minutes) stays on this device only (localStorage), never synced.

(function () {
  var TXT = [
    ["navVault", "คลังข้อมูล", "Vault"],
    ["navGroupVault", "คลังข้อมูล", "Vault"],
    ["vtLockNow", "ล็อกตอนนี้", "Lock now"],
    ["vtNewFolder", "โฟลเดอร์", "Folder"],
    ["vtNewFolderFull", "โฟลเดอร์ใหม่", "New folder"],
    ["vtNewItem", "เพิ่มรายการ", "Add item"],
    ["vtUnlocked", "ปลดล็อกแล้ว · เก็บในเครื่องนี้เท่านั้น", "Unlocked · stored on this device only"],
    ["vtFolders", "โฟลเดอร์", "Folders"],
    ["vtAll", "คลังทั้งหมด", "All items"],
    ["vtPinned", "ปักหมุด", "Pinned"],
    ["vtRecent", "ล่าสุด", "Recent"],
    ["vtSubfolders", "โฟลเดอร์ย่อย", "Subfolders"],
    ["vtItems", "รายการ", "Items"],
    ["vtItemsN", "{n} รายการ", "{n} items"],
    ["vtFoldersN", "{n} โฟลเดอร์", "{n} folders"],
    ["vtSearchAll", "ค้นหาในคลัง…", "Search the vault…"],
    ["vtSearchHere", "ค้นหาในโฟลเดอร์นี้…", "Search this folder…"],
    ["vtViewIcons", "ไอคอน", "Icons"],
    ["vtViewList", "รายการ", "List"],
    ["vtTypeAll", "ทั้งหมด", "All"],
    ["vtTypeNote", "โน้ต", "Notes"],
    ["vtTypeLink", "ลิงก์", "Links"],
    ["vtTypeFile", "ไฟล์", "Files"],
    ["vtTypeNote1", "โน้ต", "Note"],
    ["vtTypeLink1", "ลิงก์", "Link"],
    ["vtTypeFile1", "ไฟล์", "File"],
    ["vtTypeFolder1", "โฟลเดอร์", "Folder"],
    ["vtColName", "ชื่อ", "Name"],
    ["vtColType", "ประเภท", "Type"],
    ["vtColCount", "จำนวน", "Items"],
    ["vtColDate", "แก้ไขล่าสุด", "Modified"],
    ["vtEmptyFolder", "โฟลเดอร์นี้ยังว่างอยู่ — กด “เพิ่มรายการ” หรือสร้างโฟลเดอร์ย่อย", "This folder is empty — add an item or create a subfolder"],
    ["vtEmptyAll", "ยังไม่มีอะไรในคลัง — เริ่มจากสร้างโฟลเดอร์หรือเพิ่มโน้ตแรกของคุณ", "Nothing here yet — start with a folder or your first note"],
    ["vtEmptyFound", "ไม่พบรายการที่ตรงกับคำค้น", "No matches"],
    ["vtEmptyPinned", "ยังไม่มีรายการที่ปักหมุด", "Nothing pinned yet"],
    ["vtMore", "ที่นี่", "here"],
    ["vtAutoLock", "ล็อกอัตโนมัติ", "Auto-lock"],
    ["vtAutoLockIn", "เมื่อไม่ใช้งาน {m} นาที", "After {m} min idle"],
    ["vtAutoLockOff", "ปิดอยู่", "Off"],
    ["vtLockSettings", "ตั้งค่าการล็อก", "Lock settings"],
    // folder modal
    ["vtFolderNew", "โฟลเดอร์ใหม่", "New folder"],
    ["vtFolderEdit", "แก้ไขโฟลเดอร์", "Edit folder"],
    ["vtFName", "ชื่อโฟลเดอร์", "Folder name"],
    ["vtFNamePh", "เช่น งาน, ส่วนตัว", "e.g. Work, Personal"],
    ["vtFColor", "สี", "Colour"],
    ["vtFParent", "อยู่ใน", "Inside"],
    ["vtFRoot", "คลังทั้งหมด (ชั้นบนสุด)", "Vault (top level)"],
    ["vtFDelete", "ลบโฟลเดอร์นี้", "Delete this folder"],
    ["vtFDeleteConfirm", "ลบโฟลเดอร์ “{name}” พร้อมโฟลเดอร์ย่อย {f} อัน และรายการข้างใน {n} รายการ? ย้อนกลับไม่ได้", "Delete “{name}” with {f} subfolders and {n} items inside? This can't be undone."],
    // item modal
    ["vtItemNew", "เพิ่มรายการ", "Add item"],
    ["vtItemEdit", "แก้ไขรายการ", "Edit item"],
    ["vtIFolder", "โฟลเดอร์", "Folder"],
    ["vtITitle", "ชื่อเรื่อง", "Title"],
    ["vtIBody", "เนื้อหา", "Content"],
    ["vtIUrl", "ลิงก์ (URL)", "Link (URL)"],
    ["vtIDesc", "คำอธิบายสั้นๆ (ไม่บังคับ)", "Short description (optional)"],
    ["vtIFile", "ไฟล์", "File"],
    ["vtIFilePick", "เลือกไฟล์ (ไม่เกิน 3 MB)", "Choose a file (max 3 MB)"],
    ["vtIFileChange", "เปลี่ยนไฟล์", "Change file"],
    ["vtIColor", "สี", "Colour"],
    ["vtITags", "แท็ก (คั่นด้วยจุลภาค)", "Tags (comma separated)"],
    ["vtIPin", "ปักหมุด", "Pin"],
    ["vtIDelete", "ลบรายการนี้", "Delete this item"],
    ["vtIDeleteConfirm", "ลบรายการนี้? ย้อนกลับไม่ได้", "Delete this item? This can't be undone."],
    ["vtIOpenLink", "เปิดลิงก์", "Open link"],
    ["vtIDownload", "ดาวน์โหลด", "Download"],
    ["vtINeedFile", "เลือกไฟล์ก่อน", "Choose a file first"],
    ["vtINeedUrl", "ใส่ลิงก์ก่อน", "Enter a link first"],
    ["vtINeedTitle", "ใส่ชื่อเรื่องก่อน", "Enter a title first"],
    ["vtTooBig", "ไฟล์ใหญ่เกิน 3 MB", "File is larger than 3 MB"],
    ["vtDragHint", "ลากรายการไปวางบนโฟลเดอร์ทางซ้ายเพื่อย้าย", "Drag an item onto a folder on the left to move it"],
    ["vtMoved", "ย้ายแล้ว", "Moved"],
    ["vtNoTitle", "(ไม่มีชื่อ)", "(untitled)"],
    // lock screens
    ["vtSetupTitle", "ตั้งรหัสล็อกคลัง", "Set a vault PIN"],
    ["vtSetupSub", "ตั้งรหัส 6 หลักเพื่อเปิดดูคลังนี้ · ข้อมูลเก็บในเครื่องนี้เท่านั้น", "Choose a 6-digit PIN to open this vault · data stays on this device"],
    ["vtSetupAgain", "ใส่รหัสอีกครั้งเพื่อยืนยัน", "Enter the PIN again to confirm"],
    ["vtMismatch", "รหัสสองครั้งไม่ตรงกัน ลองใหม่", "The PINs didn't match — try again"],
    ["vtLockedTitle", "คลังข้อมูลล็อกอยู่", "The vault is locked"],
    ["vtLockedSub", "ใส่รหัส 6 หลักเพื่อเปิดดู · ข้อมูลเก็บในเครื่องนี้เท่านั้น", "Enter your 6-digit PIN · data stays on this device"],
    ["vtWrong", "รหัสไม่ถูกต้อง", "Wrong PIN"],
    ["vtWrongLeft", "รหัสไม่ถูกต้อง · เหลืออีก {n} ครั้ง", "Wrong PIN · {n} tries left"],
    ["vtWait", "ลองผิดหลายครั้ง รออีก {s} วินาที", "Too many tries — wait {s}s"],
    ["vtForgot", "ลืมรหัส?", "Forgot PIN?"],
    ["vtCodeTitle", "จดรหัสกู้คืนไว้", "Save your recovery code"],
    ["vtCodeSub", "ถ้าลืม PIN ใช้รหัสนี้ตั้ง PIN ใหม่ได้ · จะแสดงครั้งเดียวเท่านั้น จดหรือถ่ายภาพเก็บไว้ในที่ปลอดภัย", "If you forget your PIN, this code lets you set a new one. It is shown only once — write it down or take a photo and keep it safe."],
    ["vtCodeCopy", "คัดลอกรหัส", "Copy code"],
    ["vtCodeCopied", "คัดลอกแล้ว", "Copied"],
    ["vtCodeSaved", "ฉันจดรหัสกู้คืนไว้แล้ว", "I have saved the recovery code"],
    ["vtCodeEnter", "เข้าคลัง", "Open the vault"],
    ["vtRecoverTitle", "กู้คืนด้วยรหัสกู้คืน", "Recover with your recovery code"],
    ["vtRecoverSub", "ใส่รหัสกู้คืน 12 ตัวอักษรที่จดไว้ตอนตั้ง PIN", "Enter the 12-character code you saved when you set the PIN"],
    ["vtRecoverBad", "รหัสกู้คืนไม่ถูกต้อง", "That recovery code is wrong"],
    ["vtRecoverGo", "ยืนยัน", "Confirm"],
    ["vtRecoverNew", "ตั้ง PIN ใหม่", "Set a new PIN"],
    ["vtBack", "กลับ", "Back"],
    ["vtLostBoth", "หายทั้งรหัสและรหัสกู้คืน?", "Lost both PIN and recovery code?"],
    ["vtResetTitle", "ล้างคลังแล้วเริ่มใหม่", "Erase the vault and start over"],
    ["vtResetSub", "จะลบโฟลเดอร์และรายการทั้งหมดในคลังนี้ถาวร แล้วให้ตั้ง PIN ใหม่ ข้อมูลส่วนอื่น (รายรับ-จ่าย ออเดอร์ ตาราง) ไม่ถูกแตะ", "This permanently deletes every folder and item in the vault and lets you set a new PIN. Money, orders and schedule are not touched."],
    ["vtResetType", "พิมพ์คำว่า “{w}” เพื่อยืนยัน", "Type “{w}” to confirm"],
    ["vtResetWord", "ลบคลัง", "DELETE"],
    ["vtResetGo", "ล้างคลัง", "Erase vault"],
    // lock settings modal
    ["vtSetIdle", "ล็อกอัตโนมัติเมื่อไม่ใช้งาน", "Auto-lock when idle"],
    ["vtSetMin", "{m} นาที", "{m} min"],
    ["vtSetOff", "ไม่ล็อกอัตโนมัติ", "Never"],
    ["vtSetCur", "PIN ปัจจุบัน", "Current PIN"],
    ["vtSetNew", "PIN ใหม่ (6 หลัก)", "New PIN (6 digits)"],
    ["vtSetNew2", "ยืนยัน PIN ใหม่", "Confirm new PIN"],
    ["vtSetChange", "เปลี่ยน PIN", "Change PIN"],
    ["vtSetNewCode", "สร้างรหัสกู้คืนใหม่", "Make a new recovery code"],
    ["vtSetPinOk", "เปลี่ยน PIN แล้ว", "PIN changed"],
    ["vtSetBadFmt", "PIN ต้องเป็นตัวเลข 6 หลัก", "The PIN must be 6 digits"],
    ["vtSetCodeIs", "รหัสกู้คืนใหม่ (รหัสเดิมใช้ไม่ได้แล้ว):", "Your new recovery code (the old one no longer works):"],
    ["vtLimit", "ไฟล์ที่เก็บในคลังจะถูกซิงก์ไปกับข้อมูลอื่นด้วย จึงจำกัดไฟล์ละ 3 MB", "Files are synced along with your other data, so each is limited to 3 MB"]
  ];
  TXT.forEach(function (r) { I18N.th[r[0]] = r[1]; I18N.en[r[0]] = r[2]; });
})();

var VT_COLORS = ["#f7c419", "#f48ba6", "#b8a0ea", "#cbc5b3", "#fbf8ee", "#1b3fd0", "#ee4a2a", "#1e7a40"];
var VT_FOLDER_COLORS = ["#1b3fd0", "#ee4a2a", "#f7c419", "#b8a0ea", "#f48ba6", "#1e7a40", "#121212", "#cbc5b3"];
var VT_DEF_COLOR = { note: 0, link: 5, file: 6 };
var VT_CFG_KEY = "daybook_vault_cfg";
var VT_UI_KEY = "daybook_vault_ui";
var VT_MAX_FILE = 3 * 1024 * 1024;
var VT_IDLE_CHOICES = [1, 5, 10, 30, 60, 0];
var vault = { unlocked: false, scr: "", pin: "", pin1: "", err: "", code: "", recovering: false, nav: "folder", folder: "", view: "icons",
  type: "all", q: "", open: {}, idleAt: 0, saved: false };
var vtDraft = null;

// ---------- config (this device only) ----------
function vtCfg() { try { return JSON.parse(localStorage.getItem(VT_CFG_KEY) || "null"); } catch (e) { return null; } }
function vtSaveCfg(c) { try { localStorage.setItem(VT_CFG_KEY, JSON.stringify(c)); } catch (e) { /* ignore */ } }
function vtLoadUi() {
  try {
    var u = JSON.parse(localStorage.getItem(VT_UI_KEY) || "null");
    if (u) { if (u.view === "icons" || u.view === "list") vault.view = u.view; if (u.open && typeof u.open === "object") vault.open = u.open; }
  } catch (e) { /* ignore */ }
}
function vtSaveUi() { try { localStorage.setItem(VT_UI_KEY, JSON.stringify({ view: vault.view, open: vault.open })); } catch (e) { /* ignore */ } }
function vtIdleMin() { var c = vtCfg(); return c && typeof c.idle === "number" ? c.idle : 10; }

function vtHash(salt, text) {
  var s = salt + ":" + text;
  if (window.crypto && crypto.subtle && window.TextEncoder) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    });
  }
  return Promise.resolve("h" + hashStr(s));
}
function vtRand(n) {
  var a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", out = "";
  var buf = new Uint8Array(n);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(buf); else for (var i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256);
  for (var j = 0; j < n; j++) out += a.charAt(buf[j] % a.length);
  return out;
}
function vtNormCode(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function vtFmtCode(c) { return c.replace(/(.{4})(?=.)/g, "$1-"); }

// Stores a new PIN + a fresh recovery code (keeps the idle setting). Resolves with the code.
function vtSetPin(pin) {
  var old = vtCfg() || {}, salt = vtRand(10), rsalt = vtRand(10), code = vtRand(12);
  return Promise.all([vtHash(salt, pin), vtHash(rsalt, code)]).then(function (h) {
    vtSaveCfg({ salt: salt, hash: h[0], rsalt: rsalt, rhash: h[1], idle: typeof old.idle === "number" ? old.idle : 10, fails: 0, until: 0 });
    return code;
  });
}
function vtCheckPin(pin) { var c = vtCfg(); return c ? vtHash(c.salt, pin).then(function (h) { return h === c.hash; }) : Promise.resolve(false); }
function vtCheckCode(code) { var c = vtCfg(); return c ? vtHash(c.rsalt, vtNormCode(code)).then(function (h) { return h === c.rhash; }) : Promise.resolve(false); }

// ---------- data ----------
function vtFolders() { return fin.items.filter(function (x) { return x.kind === "vfold"; }); }
function vtAllItems() { return fin.items.filter(function (x) { return x.kind === "vitem"; }); }
function vtFolderById(id) { return fin.items.find(function (x) { return x.kind === "vfold" && x.id === id; }) || null; }
function vtChildren(id) {
  return vtFolders().filter(function (f) { return (f.parent || "") === (id || ""); })
    .sort(function (a, b) { return String(a.name).localeCompare(String(b.name), state.lang); });
}
function vtItemsIn(id) { return vtAllItems().filter(function (x) { return (x.folder || "") === (id || ""); }); }
function vtDescendants(id) {   // folder ids below `id` (not including it)
  var out = [], stack = [id];
  while (stack.length) {
    var cur = stack.pop();
    vtChildren(cur).forEach(function (c) { out.push(c.id); stack.push(c.id); });
  }
  return out;
}
function vtCount(id) {   // items in the folder and everything below it ("" = whole vault)
  if (!id) return vtAllItems().length;
  var ids = {}; ids[id] = true; vtDescendants(id).forEach(function (d) { ids[d] = true; });
  return vtAllItems().filter(function (x) { return ids[x.folder || ""]; }).length;
}
function vtPath(id) {
  var out = [], cur = vtFolderById(id), guard = 0;
  while (cur && guard++ < 50) { out.unshift(cur); cur = cur.parent ? vtFolderById(cur.parent) : null; }
  return out;
}
function vtItemTitle(x) { return x.title || x.fileName || vtDomain(x.url) || t("vtNoTitle"); }
function vtDomain(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return String(u || "").replace(/^https?:\/\//, "").split("/")[0]; } }
function vtExt(x) { var m = /\.([A-Za-z0-9]{1,5})$/.exec(x.fileName || ""); return m ? m[1].toUpperCase() : "FILE"; }
function vtSize(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
function vtDate(ms) { return ms ? new Date(ms).toLocaleDateString(I18N[state.lang].locale, { day: "numeric", month: "short" }) : ""; }
function vtDateLong(ms) { return ms ? new Date(ms).toLocaleDateString(I18N[state.lang].locale, { year: "numeric", month: "short", day: "numeric" }) : ""; }
function vtRot(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return ((Math.abs(h) % 5) - 2) * 0.45; }
function vtTypeKey(type) { return type === "link" ? "vtTypeLink1" : type === "file" ? "vtTypeFile1" : "vtTypeNote1"; }
function vtFg(ci) { return ci >= 5 ? "#fff" : "#121212"; }
function vtColor(x) { var i = typeof x.color === "number" ? x.color : VT_DEF_COLOR[x.type]; return VT_COLORS[i] ? i : VT_DEF_COLOR[x.type]; }
function vtIco(n, s) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"' + (s ? ' style="width:' + s + "px;height:" + s + 'px"' : "") + '><use href="#i-' + n + '"/></svg>'; }
function vtFolderSvg(c, s) {
  return '<svg class="vt-fold" width="' + s + '" height="' + Math.round(s * 0.82) + '" viewBox="0 0 40 33" fill="none"><path d="M3 6a3 3 0 0 1 3-3h9l4 4h15a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" fill="' + c + '" stroke="#121212" stroke-width="2.4" stroke-linejoin="round"/><path d="M3 12h34" stroke="#121212" stroke-width="2.4"/></svg>';
}

// ---------- lock screens ----------
function vtDots() {
  var h = "";
  for (var i = 0; i < 6; i++) h += '<i class="' + (i < vault.pin.length ? "on" : "") + '"></i>';
  return '<div class="vt-dots' + (vault.err ? " shake" : "") + '">' + h + "</div>";
}
function vtKeypad(extra) {
  var h = "";
  for (var d = 1; d <= 9; d++) h += '<button type="button" class="vt-key" data-vkey="' + d + '">' + d + "</button>";
  h += (extra || '<span class="vt-key blank"></span>') + '<button type="button" class="vt-key" data-vkey="0">0</button>' +
    '<button type="button" class="vt-key alt" data-vkey="del" aria-label="⌫">' + vtIco("close", 26) + "</button>";
  return '<div class="vt-pad">' + h + "</div>";
}
function vtLockCard(icon, title, sub, inner) {
  return '<div class="vt-lockwrap"><div class="vt-lockcard"><div class="vt-lockico">' + vtIco(icon, 54) + "</div><h3>" + escapeHtml(title) + "</h3>" +
    '<p class="vt-locksub">' + escapeHtml(sub) + "</p>" + inner + "</div></div>";
}
function vtScreenHtml() {
  var cfg = vtCfg(), s = vault.scr, errHtml = vault.err ? '<div class="vt-err">' + escapeHtml(vault.err) + "</div>" : '<div class="vt-err">&nbsp;</div>';
  if (s === "setup1" || s === "rec1") {
    return vtLockCard("lock", t(s === "rec1" ? "vtRecoverNew" : "vtSetupTitle"), t("vtSetupSub"), vtDots() + errHtml + vtKeypad() +
      (s === "rec1" ? '<button type="button" class="vt-link" data-vact="back">' + t("vtBack") + "</button>" : ""));
  }
  if (s === "setup2" || s === "rec2") return vtLockCard("lock", t("vtSetupAgain"), t("vtSetupSub"), vtDots() + errHtml + vtKeypad());
  if (s === "code") {
    return vtLockCard("lock", t("vtCodeTitle"), t("vtCodeSub"),
      '<div class="vt-code" id="vtCode">' + escapeHtml(vtFmtCode(vault.code)) + "</div>" +
      '<div class="vt-code-acts"><button type="button" class="btn-secondary" data-vact="copycode">' + t("vtCodeCopy") + "</button></div>" +
      '<label class="check-line vt-saved"><input type="checkbox" id="vtSavedChk"' + (vault.saved ? " checked" : "") + '> <span>' + t("vtCodeSaved") + "</span></label>" +
      '<button type="button" class="btn-primary vt-go" data-vact="entercode"' + (vault.saved ? "" : " disabled") + ">" + t("vtCodeEnter") + "</button>");
  }
  if (s === "recover") {
    return vtLockCard("lock", t("vtRecoverTitle"), t("vtRecoverSub"),
      '<input type="text" class="vt-codein" id="vtCodeIn" autocomplete="off" spellcheck="false" maxlength="14" placeholder="XXXX-XXXX-XXXX">' + errHtml +
      '<div class="vt-code-acts"><button type="button" class="btn-primary" data-vact="recovergo">' + t("vtRecoverGo") + "</button>" +
      '<button type="button" class="btn-secondary" data-vact="back">' + t("vtBack") + "</button></div>" +
      '<button type="button" class="vt-link" data-vact="reset">' + t("vtLostBoth") + "</button>");
  }
  if (s === "reset") {
    return vtLockCard("lock", t("vtResetTitle"), t("vtResetSub"),
      '<label class="vt-resetlbl">' + escapeHtml(t("vtResetType", { w: t("vtResetWord") })) + '</label><input type="text" class="vt-codein" id="vtResetIn" autocomplete="off">' +
      '<div class="vt-code-acts"><button type="button" class="btn-primary vt-danger" data-vact="resetgo">' + t("vtResetGo") + "</button>" +
      '<button type="button" class="btn-secondary" data-vact="back">' + t("vtBack") + "</button></div>");
  }
  // lock
  var wait = cfg && cfg.until > Date.now() ? Math.ceil((cfg.until - Date.now()) / 1000) : 0;
  var msg = wait ? t("vtWait", { s: wait }) : vault.err;
  return vtLockCard("lock", t("vtLockedTitle"), t("vtLockedSub"), vtDots() + '<div class="vt-err">' + (msg ? escapeHtml(msg) : "&nbsp;") + "</div>" +
    vtKeypad('<button type="button" class="vt-key blank" data-vact="forgot">' + t("vtForgot") + "</button>"));
}

// ---------- main UI ----------
function vtTreeHtml(parent, depth) {
  var out = "";
  vtChildren(parent).forEach(function (f) {
    var kids = vtChildren(f.id), isOpen = !!vault.open[f.id], on = vault.nav === "folder" && vault.folder === f.id;
    out += '<div class="vt-trow' + (on ? " on" : "") + '" data-vtree="' + f.id + '" style="padding-left:' + (10 + depth * 28) + 'px">' +
      '<button type="button" class="vt-tog" data-vtoggle="' + f.id + '" aria-label="toggle">' + (kids.length ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="' + (isOpen ? "M6 9l6 6 6-6" : "M9 6l6 6-6 6") + '"/></svg>' : "") + "</button>" +
      vtFolderSvg(f.color || VT_FOLDER_COLORS[0], 28) + '<span class="nm">' + escapeHtml(f.name) + '</span><span class="ct">' + vtCount(f.id) + "</span></div>";
    if (kids.length && isOpen) out += vtTreeHtml(f.id, depth + 1);
  });
  return out;
}
function vtSideHtml() {
  var pinned = vtAllItems().filter(function (x) { return x.pinned; }).length;
  var rootOn = vault.nav === "folder" && !vault.folder;
  var C = 2 * Math.PI * 30, idle = vtIdleMin();
  var auto = '<button type="button" class="vt-auto" data-vact="locksettings"><svg width="62" height="62" viewBox="0 0 80 80"><circle cx="40" cy="40" r="30" fill="none" stroke="#3a3a33" stroke-width="10"/>' +
    '<circle id="vtRing" cx="40" cy="40" r="30" fill="none" stroke="#ee4a2a" stroke-width="10" stroke-dasharray="' + C.toFixed(1) + " " + C.toFixed(1) + '" stroke-dashoffset="0" transform="rotate(-90 40 40)" stroke-linecap="round"/>' +
    '<text id="vtClock" x="40" y="46" text-anchor="middle" font-family="K2D, sans-serif" font-weight="700" font-size="16" fill="#fff"></text></svg>' +
    "<div><b>" + t("vtAutoLock") + "</b><span>" + (idle ? t("vtAutoLockIn", { m: idle }) : t("vtAutoLockOff")) + "</span></div></button>";
  return '<section class="panel vt-sidepanel"><div class="ph"><div class="tg"></div><h2>' + t("vtFolders") + '</h2><button type="button" class="vt-plus" data-vact="newfolder" title="' + escapeHtml(t("vtNewFolderFull")) + '">' + vtIco("plus", 22) + "</button></div>" +
    '<div class="pb vt-sidebody">' +
    '<div class="vt-trow vt-quick' + (vault.nav === "pinned" ? " on" : "") + '" data-vnav="pinned">' + vtIco("flag", 20) + '<span class="nm">' + t("vtPinned") + '</span><span class="ct">' + pinned + "</span></div>" +
    '<div class="vt-trow vt-quick' + (vault.nav === "recent" ? " on" : "") + '" data-vnav="recent">' + vtIco("clock", 20) + '<span class="nm">' + t("vtRecent") + '</span><span class="ct">' + Math.min(8, vtAllItems().length) + "</span></div>" +
    '<div class="vt-sub">' + t("vtFolders") + "</div>" +
    '<div class="vt-trow' + (rootOn ? " on" : "") + '" data-vtree="" style="padding-left:10px"><span class="vt-tog"></span>' + vtFolderSvg("#121212", 28) + '<span class="nm">' + t("vtAll") + '</span><span class="ct">' + vtCount("") + "</span></div>" +
    vtTreeHtml("", 1) + '<div class="vt-grow"></div>' + auto + "</div></section>";
}
function vtCardHtml(x) {
  var ci = vtColor(x), c = VT_COLORS[ci], fg = vtFg(ci), pin = '<button type="button" class="vt-pin' + (x.pinned ? " on" : "") + '" data-vpin="' + x.id + '" aria-label="pin">' + vtIco("flag", 16) + "</button>";
  var tags = (x.tags || []).slice(0, 3).map(function (g) { return '<span class="tag">#' + escapeHtml(g) + "</span>"; }).join("");
  var date = '<span class="vt-d">' + vtDate(x.updatedAt || x.created) + "</span>";
  var attr = ' draggable="true" data-vitem="' + x.id + '"';
  if (x.type === "link") {
    return '<article class="vt-card vt-link"' + attr + ">" + pin + '<div class="vt-lh" style="background:' + c + ";color:" + fg + '"><span class="vt-gl">' + vtIco("tag", 16) + '</span><span class="vt-dom">' + escapeHtml(vtDomain(x.url)) + '</span><button type="button" class="vt-go2" data-vopen="' + x.id + '" aria-label="open">' + vtIco("arrow-out", 18) + "</button></div>" +
      '<div class="vt-lb"><b>' + escapeHtml(vtItemTitle(x)) + "</b>" + (x.desc ? "<p>" + escapeHtml(x.desc) + "</p>" : "") + '<div class="vt-meta">' + tags + date + "</div></div></article>";
  }
  if (x.type === "file") {
    var isImg = /^image\//.test(x.fileType || "") && x.data;
    return '<article class="vt-card vt-file"' + attr + ">" + pin + '<i class="vt-ftab" style="background:' + c + '"></i><div class="vt-fb">' +
      (isImg ? '<div class="vt-fimg"><img src="' + x.data.replace(/"/g, "&quot;") + '" alt=""></div>' : '<div class="vt-fext" style="border-top-color:' + c + '">' + escapeHtml(vtExt(x)) + "</div>") +
      '<div class="vt-ft"><b>' + escapeHtml(x.title || x.fileName || "") + "</b><span>" + escapeHtml(vtExt(x)) + " · " + vtSize(x.fileSize || 0) + "</span>" + (tags ? '<div class="vt-meta">' + tags + "</div>" : "") + "</div>" +
      '<button type="button" class="vt-go2 dl" data-vdl="' + x.id + '" aria-label="download">' + vtIco("arrow-in", 18) + "</button></div></article>";
  }
  return '<article class="vt-card vt-note"' + attr + ' style="transform:rotate(' + vtRot(x.id) + 'deg)"><i class="vt-tape"></i>' + pin + '<div class="vt-nb" style="background:' + c + ";color:" + fg + '"><b>' +
    escapeHtml(vtItemTitle(x)) + '</b><div class="vt-text">' + escapeHtml((x.body || "").slice(0, 400)) + '</div><div class="vt-meta">' + tags + date + "</div></div></article>";
}
function vtFolderCardHtml(f) {
  var kids = vtChildren(f.id).length, own = vtItemsIn(f.id).length, c = f.color || VT_FOLDER_COLORS[0];
  var sub = [kids ? t("vtFoldersN", { n: kids }) : "", own ? t("vtItemsN", { n: own }) : ""].filter(Boolean).join(" · ") || t("vtItemsN", { n: 0 });
  return '<article class="vt-fcard" data-vfolder="' + f.id + '" draggable="true" data-vdragfold="' + f.id + '"><div class="vt-fchead" style="background:' + c + ";color:" + (c === "#121212" || c === "#1b3fd0" || c === "#1e7a40" || c === "#ee4a2a" ? "#fff" : "#121212") + '"><span class="vt-cnt">' +
    t("vtItemsN", { n: vtCount(f.id) }) + '</span><button type="button" class="vt-fedit" data-vfedit="' + f.id + '" aria-label="edit">' + vtIco("edit", 17) + "</button></div>" +
    '<div class="vt-fcbody">' + vtFolderSvg(c, 58) + "<div><b>" + escapeHtml(f.name) + "</b><span>" + sub + "</span></div></div></article>";
}
function vtListRow(kind, o) {
  var thumb, name, sub, typ, cnt = "—", date;
  if (kind === "f") {
    thumb = vtFolderSvg(o.color || VT_FOLDER_COLORS[0], 36); name = o.name; sub = [vtChildren(o.id).length ? t("vtFoldersN", { n: vtChildren(o.id).length }) : "", t("vtItemsN", { n: vtItemsIn(o.id).length })].filter(Boolean).join(" · ");
    typ = t("vtTypeFolder1"); cnt = t("vtItemsN", { n: vtCount(o.id) }); date = vtDateLong(o.updatedAt);
  } else {
    var ci = vtColor(o);
    thumb = '<span class="vt-lt" style="background:' + VT_COLORS[ci] + ";color:" + vtFg(ci) + '">' + vtIco(o.type === "link" ? "tag" : o.type === "file" ? "arrow-in" : "edit", 18) + "</span>";
    name = vtItemTitle(o); sub = o.type === "link" ? vtDomain(o.url) : o.type === "file" ? vtExt(o) + " · " + vtSize(o.fileSize || 0) : (o.body || "").replace(/\s+/g, " ").slice(0, 70);
    typ = t(vtTypeKey(o.type)); date = vtDateLong(o.updatedAt || o.created);
  }
  return '<div class="vt-lrow" ' + (kind === "f" ? 'data-vfolder="' + o.id + '"' : 'data-vitem="' + o.id + '" draggable="true"') + '><span class="th">' + thumb + '</span><span class="nm"><b>' + escapeHtml(name) + "</b><small>" + escapeHtml(sub) + "</small></span><span>" + typ + '</span><span class="num">' + cnt + "</span><span>" + date + "</span>" +
    (kind === "i" ? '<button type="button" class="vt-pin inl' + (o.pinned ? " on" : "") + '" data-vpin="' + o.id + '" aria-label="pin">' + vtIco("flag", 16) + "</button>" : "<span></span>") + "</div>";
}
function vtMatch(x, q) {
  var hay = [x.title, x.body, x.url, x.desc, x.fileName, (x.tags || []).join(" ")].join(" ").toLowerCase();
  return hay.indexOf(q) !== -1;
}
function vtScope() {   // what the content area shows right now
  var q = vault.q.trim().toLowerCase(), folders = [], items;
  if (q) {
    folders = vtFolders().filter(function (f) { return String(f.name).toLowerCase().indexOf(q) !== -1; });
    items = vtAllItems().filter(function (x) { return vtMatch(x, q); });
  } else if (vault.nav === "pinned") items = vtAllItems().filter(function (x) { return x.pinned; });
  else if (vault.nav === "recent") items = vtAllItems().slice().sort(function (a, b) { return (b.updatedAt || b.created || 0) - (a.updatedAt || a.created || 0); }).slice(0, 8);
  else { folders = vtChildren(vault.folder); items = vtItemsIn(vault.folder); }
  var counts = { all: items.length, note: 0, link: 0, file: 0 };
  items.forEach(function (x) { counts[x.type] = (counts[x.type] || 0) + 1; });
  if (vault.type !== "all") items = items.filter(function (x) { return x.type === vault.type; });
  if (vault.type !== "all") folders = [];
  if (vault.nav !== "recent") items = items.slice().sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updatedAt || b.created || 0) - (a.updatedAt || a.created || 0); });
  return { folders: folders, items: items, counts: counts, q: q };
}
function vtContentHtml() {
  var sc = vtScope(), h = "";
  var chips = [["all", "vtTypeAll"], ["note", "vtTypeNote"], ["link", "vtTypeLink"], ["file", "vtTypeFile"]].map(function (c) {
    return '<button type="button" class="tag vt-chip' + (vault.type === c[0] ? " on" : "") + '" data-vtype="' + c[0] + '">' + t(c[1]) + " " + sc.counts[c[0]] + "</button>";
  }).join("");
  h += '<div class="vt-chips">' + chips + "</div>";
  if (!sc.folders.length && !sc.items.length) {
    var empty = sc.q ? "vtEmptyFound" : vault.nav === "pinned" ? "vtEmptyPinned" : (vault.nav === "folder" && !vault.folder && !vtFolders().length && !vtAllItems().length) ? "vtEmptyAll" : "vtEmptyFolder";
    return h + '<div class="vt-empty">' + t(empty) + "</div>";
  }
  if (vault.view === "list") {
    h += '<div class="vt-lhead"><span></span><span>' + t("vtColName") + "</span><span>" + t("vtColType") + "</span><span>" + t("vtColCount") + "</span><span>" + t("vtColDate") + "</span><span></span></div>" +
      '<div class="vt-lbody">' + sc.folders.map(function (f) { return vtListRow("f", f); }).join("") + sc.items.map(function (x) { return vtListRow("i", x); }).join("") + "</div>";
    return h;
  }
  if (sc.folders.length || (vault.nav === "folder" && !sc.q && vault.type === "all")) {
    h += '<div class="vt-sub">' + t("vtSubfolders") + " · " + sc.folders.length + '</div><div class="vt-fgrid">' + sc.folders.map(vtFolderCardHtml).join("") +
      (vault.nav === "folder" && !sc.q && vault.type === "all" ? '<button type="button" class="vt-fnew" data-vact="newfolder">' + vtIco("plus", 24) + t("vtNewFolderFull") + "</button>" : "") + "</div>";
  }
  if (sc.items.length) h += '<div class="vt-sub">' + t("vtItems") + " · " + sc.items.length + '</div><div class="vt-cols">' + sc.items.map(vtCardHtml).join("") + "</div>";
  return h;
}
function vtCrumbHtml() {
  if (vault.q.trim()) return '<div class="vt-crumb"><span class="cur">' + t("vtSearchAll").replace("…", "") + "</span></div>";
  if (vault.nav === "pinned") return '<div class="vt-crumb"><span class="cur">' + t("vtPinned") + "</span></div>";
  if (vault.nav === "recent") return '<div class="vt-crumb"><span class="cur">' + t("vtRecent") + "</span></div>";
  var path = vtPath(vault.folder), h = '<button type="button" class="cr' + (path.length ? "" : " cur") + '" data-vgo="">' + t("vtAll") + "</button>";
  path.forEach(function (f, i) {
    h += vtIco("chev-r", 18) + '<button type="button" class="cr' + (i === path.length - 1 ? " cur" : "") + '" data-vgo="' + f.id + '">' + escapeHtml(f.name) + "</button>";
  });
  return '<div class="vt-crumb">' + h + (vault.folder ? '<button type="button" class="vt-fedit hd" data-vfedit="' + vault.folder + '" aria-label="edit">' + vtIco("edit", 17) + "</button>" : "") +
    (vault.nav === "folder" && !vault.folder ? '<span class="vt-total">' + t("vtItemsN", { n: vtCount("") }) + " · " + t("vtFoldersN", { n: vtFolders().length }) + "</span>" : "") + "</div>";
}
function vtMainHtml() {
  return vtSideHtml() + '<section class="panel vt-mainpanel"><div class="ph">' + '<span id="vtCrumb">' + vtCrumbHtml() + "</span>" +
    '<div class="srch vt-search">' + vtIco("list", 18) + '<input type="text" id="vtQ" value="' + escapeHtml(vault.q) + '" placeholder="' + escapeHtml(t(vault.folder && vault.nav === "folder" ? "vtSearchHere" : "vtSearchAll")) + '" autocomplete="off"></div>' +
    '<div class="seg vt-seg"><button type="button" class="' + (vault.view === "icons" ? "on" : "") + '" data-vview="icons">' + t("vtViewIcons") + '</button><button type="button" class="' + (vault.view === "list" ? "on" : "") + '" data-vview="list">' + t("vtViewList") + "</button></div></div>" +
    '<div class="pb vt-content" id="vtContent">' + vtContentHtml() + "</div></section>";
}

function renderVault() {
  var body = el("vaultBody"), tools = el("vaultTools");
  if (!body || !tools) return;
  if (!fin.loaded) { body.innerHTML = ""; tools.innerHTML = ""; return; }
  var cfg = vtCfg(), s = vault.scr;
  if (!vault.unlocked) {
    if (!cfg) { if (["setup1", "setup2", "code"].indexOf(s) === -1) vault.scr = "setup1"; }
    else if (["lock", "recover", "reset", "rec1", "rec2", "code"].indexOf(s) === -1) vault.scr = "lock";
  }
  if (!vault.unlocked) {
    tools.innerHTML = "";
    body.className = "vt-locked";
    body.innerHTML = vtScreenHtml();
    var ci = el("vtCodeIn") || el("vtResetIn"); if (ci) ci.focus();
    return;
  }
  tools.innerHTML = '<span class="vt-badge">' + vtIco("lock", 14) + t("vtUnlocked") + '</span><button type="button" class="btn-secondary vt-lockbtn" data-vact="lock">' + vtIco("lock", 17) + t("vtLockNow") + "</button>" +
    '<button type="button" class="btn-secondary" data-vact="newfolder">' + vtIco("plus", 17) + t("vtNewFolder") + '</button><button type="button" class="btn-primary" data-vact="newitem">' + vtIco("plus", 17) + '<span class="btn-label">' + t("vtNewItem") + "</span></button>";
  body.className = "vt-layout";
  body.innerHTML = vtMainHtml();
  vtTick();
}
function vtRefreshContent() {
  var c = el("vtContent"), cr = el("vtCrumb");
  if (c) c.innerHTML = vtContentHtml();
  if (cr) cr.innerHTML = vtCrumbHtml();
}

// ---------- lock / idle ----------
function vtLock() {
  vault.unlocked = false; vault.scr = "lock"; vault.pin = ""; vault.err = ""; vault.q = "";
  vtCloseModal();
  if (currentPageId === "vault") renderVault();
}
function vtTouch() { var m = vtIdleMin(); vault.idleAt = m ? Date.now() + m * 60000 : 0; }
function vtTick() {
  var ring = el("vtRing"), clock = el("vtClock"), cfg = vtCfg();
  if (vault.unlocked && vault.idleAt && Date.now() >= vault.idleAt) { vtLock(); return; }
  if (!ring || !clock) { if (!vault.unlocked && vault.scr === "lock" && cfg && cfg.until > Date.now() && currentPageId === "vault") { var e = document.querySelector(".vt-lockcard .vt-err"); if (e) e.textContent = t("vtWait", { s: Math.ceil((cfg.until - Date.now()) / 1000) }); } return; }
  var m = vtIdleMin();
  if (!m || !vault.idleAt) { clock.textContent = "∞"; ring.setAttribute("stroke-dashoffset", "0"); return; }
  var left = Math.max(0, vault.idleAt - Date.now()), C = 2 * Math.PI * 30;
  clock.textContent = Math.floor(left / 60000) + ":" + ("0" + Math.floor(left / 1000) % 60).slice(-2);
  ring.setAttribute("stroke-dashoffset", String(C * (1 - left / (m * 60000))));
}

// ---------- pin entry ----------
function vtKey(k) {
  var cfg = vtCfg();
  if (vault.scr === "lock" && cfg && cfg.until > Date.now()) return;
  vault.err = "";
  if (k === "del") vault.pin = vault.pin.slice(0, -1);
  else if (vault.pin.length < 6) vault.pin += k;
  if (vault.pin.length < 6) { renderVault(); return; }
  var pin = vault.pin, s = vault.scr;
  vault.pin = "";
  if (s === "setup1" || s === "rec1") { vault.pin1 = pin; vault.scr = s === "setup1" ? "setup2" : "rec2"; renderVault(); return; }
  if (s === "setup2" || s === "rec2") {
    if (pin !== vault.pin1) { vault.err = t("vtMismatch"); vault.scr = s === "setup2" ? "setup1" : "rec1"; renderVault(); return; }
    vtSetPin(pin).then(function (code) { vault.code = code; vault.saved = false; vault.scr = "code"; renderVault(); });
    return;
  }
  vtCheckPin(pin).then(function (ok) {
    var c = vtCfg() || {};
    if (ok) { c.fails = 0; c.until = 0; vtSaveCfg(c); vault.unlocked = true; vault.scr = ""; vtTouch(); renderVault(); return; }
    c.fails = (c.fails || 0) + 1;
    if (c.fails >= 5) { c.until = Date.now() + 30000; c.fails = 0; vault.err = ""; } else vault.err = t("vtWrongLeft", { n: 5 - c.fails });
    vtSaveCfg(c); renderVault();
  });
}

// ---------- modal plumbing ----------
function vtOpenModal(html) {
  var ov = el("vtOverlay"); if (!ov) return;
  el("vtModal").innerHTML = html;
  ov.classList.add("open");
  var f = el("vtModal").querySelector("input[type=text], textarea"); if (f) setTimeout(function () { f.focus(); }, 60);
}
function vtCloseModal() { var ov = el("vtOverlay"); if (ov) ov.classList.remove("open"); vtDraft = null; }
function vtModalOpen() { var ov = el("vtOverlay"); return !!(ov && ov.classList.contains("open")); }
function vtColorRow(list, cur, attr) {
  return '<div class="ev-colors vt-colors">' + list.map(function (c, i) {
    return '<button type="button" class="ev-dot' + (i === cur ? " on" : "") + '" ' + attr + '="' + i + '" style="background:' + c + '" aria-label="' + (i + 1) + '"></button>';
  }).join("") + "</div>";
}
function vtFolderOptions(selected, excludeId) {
  var ex = {}; if (excludeId) { ex[excludeId] = true; vtDescendants(excludeId).forEach(function (d) { ex[d] = true; }); }
  var out = '<option value=""' + (!selected ? " selected" : "") + ">" + escapeHtml(t("vtFRoot")) + "</option>";
  (function walk(pid, depth) {
    vtChildren(pid).forEach(function (f) {
      if (ex[f.id]) return;
      out += '<option value="' + f.id + '"' + (selected === f.id ? " selected" : "") + ">" + new Array(depth + 1).join("   ") + escapeHtml(f.name) + "</option>";
      walk(f.id, depth + 1);
    });
  })("", 0);
  return out;
}
function vtModalShell(title, inner, deleteLabel, submitLabel) {
  return '<div class="modal-header"><h2>' + escapeHtml(title) + '</h2><button class="icon-btn" type="button" data-vact="closemodal" aria-label="Close">' + vtIco("close", 18) + '</button></div><form id="vtForm" autocomplete="off">' + inner +
    '<div class="modal-footer">' + (deleteLabel ? '<button type="button" class="btn-danger-text" data-vact="deletemodal">' + escapeHtml(deleteLabel) + "</button>" : "<span></span>") +
    '<div class="footer-right"><button type="button" class="btn-secondary" data-vact="closemodal">' + t("cancelBtn") + '</button><button type="submit" class="btn-primary" style="margin-left:0;">' + escapeHtml(submitLabel || t("saveBtn")) + "</button></div></div></form>";
}

// ---- folder modal ----
function vtOpenFolderModal(id, parent) {
  var f = id ? vtFolderById(id) : null;
  vtDraft = { type: "folder", id: id || null, color: f ? Math.max(0, VT_FOLDER_COLORS.indexOf(f.color)) : 0 };
  var inner = '<div class="form-row"><label>' + t("vtFName") + '</label><input type="text" id="vtfName" required maxlength="60" placeholder="' + escapeHtml(t("vtFNamePh")) + '" value="' + escapeHtml(f ? f.name : "") + '"></div>' +
    '<div class="form-row"><label>' + t("vtFParent") + '</label><select id="vtfParent">' + vtFolderOptions(f ? f.parent || "" : (parent || ""), id) + "</select></div>" +
    '<div class="form-row"><label>' + t("vtFColor") + "</label>" + vtColorRow(VT_FOLDER_COLORS, vtDraft.color, "data-vcol") + "</div>";
  vtOpenModal(vtModalShell(t(f ? "vtFolderEdit" : "vtFolderNew"), inner, f ? t("vtFDelete") : ""));
}
function vtSubmitFolder() {
  var name = el("vtfName").value.trim(); if (!name) { el("vtfName").focus(); return; }
  var parent = el("vtfParent").value, color = VT_FOLDER_COLORS[vtDraft.color];
  if (vtDraft.id) {
    var f = vtFolderById(vtDraft.id);
    if (f) { f.name = name; f.color = color; f.parent = parent; }
  } else {
    var nf = { id: uid(), kind: "vfold", name: name, color: color, parent: parent };
    fin.items.push(nf);
    vault.nav = "folder"; vault.folder = nf.id; if (parent) vault.open[parent] = true; vtSaveUi();
  }
  finSave(); vtCloseModal(); renderVault(); showToast(t("toastUpdated"));
}
function vtDeleteFolder(id) {
  var f = vtFolderById(id); if (!f) return;
  var subs = vtDescendants(id), ids = {}; ids[id] = true; subs.forEach(function (d) { ids[d] = true; });
  var n = vtAllItems().filter(function (x) { return ids[x.folder || ""]; }).length;
  if (!confirm(t("vtFDeleteConfirm", { name: f.name, f: subs.length, n: n }))) return;
  fin.items = fin.items.filter(function (x) { return !((x.kind === "vfold" && ids[x.id]) || (x.kind === "vitem" && ids[x.folder || ""])); });
  if (ids[vault.folder]) vault.folder = f.parent || "";
  finSave(); vtCloseModal(); renderVault();
}

// ---- item modal ----
function vtItemFormInner() {
  var d = vtDraft, ty = d.itemType, h = "";
  if (!d.id) {
    h += '<div class="seg vt-typeseg">' + ["note", "link", "file"].map(function (k) { return '<button type="button" class="' + (ty === k ? "on" : "") + '" data-vtypesel="' + k + '">' + t(vtTypeKey(k)) + "</button>"; }).join("") + "</div>";
  }
  h += '<div class="form-row"><label>' + t("vtIFolder") + '</label><select id="vtiFolder">' + vtFolderOptions(d.folder, null) + "</select></div>";
  h += '<div class="form-row"><label>' + t("vtITitle") + '</label><input type="text" id="vtiTitle" maxlength="120" value="' + escapeHtml(d.title) + '"></div>';
  if (ty === "note") h += '<div class="form-row"><label>' + t("vtIBody") + '</label><textarea id="vtiBody" rows="7">' + escapeHtml(d.body) + "</textarea></div>";
  if (ty === "link") {
    h += '<div class="form-row"><label>' + t("vtIUrl") + '</label><input type="text" id="vtiUrl" placeholder="https://" value="' + escapeHtml(d.url) + '"></div>' +
      '<div class="form-row"><label>' + t("vtIDesc") + '</label><input type="text" id="vtiDesc" maxlength="200" value="' + escapeHtml(d.desc) + '"></div>';
  }
  if (ty === "file") {
    h += '<div class="form-row"><label>' + t("vtIFile") + '</label><div class="vt-filepick"><button type="button" class="btn-secondary" data-vact="pickfile">' + vtIco("arrow-out", 17) + (d.fileName ? t("vtIFileChange") : t("vtIFilePick")) + "</button>" +
      '<span class="vt-fname">' + escapeHtml(d.fileName ? d.fileName + " · " + vtSize(d.fileSize) : "") + '</span><input type="file" id="vtiFile" hidden></div><div class="vt-hint">' + t("vtLimit") + "</div></div>";
  }
  h += '<div class="form-row"><label>' + t("vtIColor") + "</label>" + vtColorRow(VT_COLORS, d.color, "data-vcol") + "</div>" +
    '<div class="form-row"><label>' + t("vtITags") + '</label><input type="text" id="vtiTags" value="' + escapeHtml(d.tags) + '"></div>' +
    '<div class="form-row"><label class="check-line"><input type="checkbox" id="vtiPin"' + (d.pinned ? " checked" : "") + "> <span>" + t("vtIPin") + "</span></label></div>";
  if (d.id && ty === "link" && d.url) h += '<div class="form-row"><button type="button" class="btn-secondary" data-vopen="' + d.id + '">' + vtIco("arrow-out", 17) + t("vtIOpenLink") + "</button></div>";
  if (d.id && ty === "file" && d.data) h += '<div class="form-row"><button type="button" class="btn-secondary" data-vdl="' + d.id + '">' + vtIco("arrow-in", 17) + t("vtIDownload") + "</button></div>";
  return h;
}
function vtOpenItemModal(id, type) {
  var x = id ? fin.items.find(function (i) { return i.id === id; }) : null;
  vtDraft = x ? { type: "item", id: x.id, itemType: x.type, folder: x.folder || "", title: x.title || "", body: x.body || "", url: x.url || "", desc: x.desc || "", fileName: x.fileName || "", fileType: x.fileType || "",
      fileSize: x.fileSize || 0, data: x.data || "", color: vtColor(x), tags: (x.tags || []).join(", "), pinned: !!x.pinned }
    : { type: "item", id: null, itemType: type || "note", folder: vault.nav === "folder" ? vault.folder : "", title: "", body: "", url: "", desc: "", fileName: "", fileType: "", fileSize: 0, data: "", color: VT_DEF_COLOR[type || "note"], tags: "", pinned: false };
  vtRenderItemModal();
}
function vtGrabItemFields() {
  var d = vtDraft, g = function (id) { var e = el(id); return e ? e.value : null; };
  var v;
  if ((v = g("vtiFolder")) !== null) d.folder = v; if ((v = g("vtiTitle")) !== null) d.title = v; if ((v = g("vtiBody")) !== null) d.body = v;
  if ((v = g("vtiUrl")) !== null) d.url = v; if ((v = g("vtiDesc")) !== null) d.desc = v; if ((v = g("vtiTags")) !== null) d.tags = v;
  if (el("vtiPin")) d.pinned = el("vtiPin").checked;
}
function vtRenderItemModal() {
  var d = vtDraft;
  vtOpenModal(vtModalShell(t(d.id ? "vtItemEdit" : "vtItemNew"), vtItemFormInner(), d.id ? t("vtIDelete") : ""));
}
function vtSubmitItem() {
  vtGrabItemFields();
  var d = vtDraft, ty = d.itemType, rec = { id: d.id || uid(), kind: "vitem", type: ty, folder: d.folder || "", title: d.title.trim(), color: d.color,
    tags: d.tags.split(",").map(function (s) { return s.trim().replace(/^#/, ""); }).filter(Boolean).slice(0, 8), pinned: !!d.pinned };
  if (ty === "note") { rec.body = d.body; if (!rec.title && !rec.body.trim()) { showToast(t("vtINeedTitle")); return; } }
  if (ty === "link") {
    var u = d.url.trim(); if (!u) { showToast(t("vtINeedUrl")); return; }
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u;
    rec.url = u; rec.desc = d.desc.trim();
  }
  if (ty === "file") {
    if (!d.data) { showToast(t("vtINeedFile")); return; }
    rec.fileName = d.fileName; rec.fileType = d.fileType; rec.fileSize = d.fileSize; rec.data = d.data;
  }
  var old = d.id ? fin.items.find(function (i) { return i.id === d.id; }) : null;
  rec.created = old && old.created ? old.created : Date.now();
  var i = d.id ? fin.items.findIndex(function (x) { return x.id === d.id; }) : -1;
  if (i >= 0) fin.items[i] = rec; else fin.items.push(rec);
  finSave(); vtCloseModal(); renderVault(); showToast(t(i >= 0 ? "toastUpdated" : "finAdded"));
}
function vtReadFile(file) {
  if (!file) return;
  if (file.size > VT_MAX_FILE) { showToast(t("vtTooBig")); return; }
  var r = new FileReader();
  r.onload = function () {
    vtGrabItemFields();
    vtDraft.data = String(r.result); vtDraft.fileName = file.name; vtDraft.fileType = file.type || ""; vtDraft.fileSize = file.size;
    if (!vtDraft.title) vtDraft.title = file.name.replace(/\.[^.]+$/, "");
    vtRenderItemModal();
  };
  r.readAsDataURL(file);
}
function vtDownload(id) {
  var x = fin.items.find(function (i) { return i.id === id; }); if (!x || !x.data) return;
  var a = document.createElement("a"); a.href = x.data; a.download = x.fileName || "file"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function vtOpenLink(id) {
  var x = fin.items.find(function (i) { return i.id === id; }); if (!x || !x.url) return;
  window.open(x.url, "_blank", "noopener,noreferrer");
}
function vtDeleteItem(id) {
  if (!id || !confirm(t("vtIDeleteConfirm"))) return;
  fin.items = fin.items.filter(function (x) { return x.id !== id; });
  finSave(); vtCloseModal(); renderVault();
}
function vtTogglePin(id) {
  var x = fin.items.find(function (i) { return i.id === id; }); if (!x) return;
  x.pinned = !x.pinned; finSave(); renderVault();
}
function vtMoveItem(id, folderId) {
  var x = fin.items.find(function (i) { return i.id === id && i.kind === "vitem"; });
  if (!x || (x.folder || "") === (folderId || "")) return;
  x.folder = folderId || ""; finSave(); renderVault(); showToast(t("vtMoved"));
}
function vtMoveFolder(id, parentId) {
  var f = vtFolderById(id);
  if (!f || (f.parent || "") === (parentId || "") || id === parentId || vtDescendants(id).indexOf(parentId) !== -1) return;
  f.parent = parentId || ""; if (parentId) vault.open[parentId] = true; vtSaveUi(); finSave(); renderVault(); showToast(t("vtMoved"));
}

// ---- lock settings modal ----
function vtOpenLockSettings() {
  var idle = vtIdleMin();
  var opts = VT_IDLE_CHOICES.map(function (m) { return '<option value="' + m + '"' + (m === idle ? " selected" : "") + ">" + (m ? t("vtSetMin", { m: m }) : t("vtSetOff")) + "</option>"; }).join("");
  var pinIn = function (id, lbl) { return '<div class="form-row"><label>' + lbl + '</label><input type="password" id="' + id + '" inputmode="numeric" maxlength="6" autocomplete="off"></div>'; };
  vtDraft = { type: "lock" };
  vtOpenModal('<div class="modal-header"><h2>' + t("vtLockSettings") + '</h2><button class="icon-btn" type="button" data-vact="closemodal" aria-label="Close">' + vtIco("close", 18) + "</button></div>" +
    '<div class="form-row"><label>' + t("vtSetIdle") + '</label><select id="vtsIdle">' + opts + "</select></div>" +
    '<div class="vt-setbox">' + pinIn("vtsCur", t("vtSetCur")) + '<div class="form-row-2">' + pinIn("vtsNew", t("vtSetNew")) + pinIn("vtsNew2", t("vtSetNew2")) + "</div>" +
    '<div class="vt-code-acts"><button type="button" class="btn-primary" data-vact="changepin">' + t("vtSetChange") + '</button><button type="button" class="btn-secondary" data-vact="newcode">' + t("vtSetNewCode") + '</button></div><div id="vtsMsg" class="vt-hint"></div></div>');
}
function vtSetMsg(txt, bad) { var m = el("vtsMsg"); if (m) { m.textContent = txt; m.className = "vt-hint" + (bad ? " bad" : ""); } }

// ---------- events ----------
function vtAction(a, node) {
  var cfg = vtCfg();
  if (a === "lock") vtLock();
  else if (a === "newfolder") vtOpenFolderModal(null, vault.nav === "folder" ? vault.folder : "");
  else if (a === "newitem") vtOpenItemModal(null, vault.type !== "all" ? vault.type : "note");
  else if (a === "closemodal") vtCloseModal();
  else if (a === "deletemodal") { if (vtDraft && vtDraft.type === "folder") vtDeleteFolder(vtDraft.id); else if (vtDraft && vtDraft.type === "item") vtDeleteItem(vtDraft.id); }
  else if (a === "pickfile") { var fi = el("vtiFile"); if (fi) fi.click(); }
  else if (a === "locksettings") vtOpenLockSettings();
  else if (a === "forgot") { vault.scr = "recover"; vault.err = ""; renderVault(); }
  else if (a === "back") { vault.scr = vault.recovering && (vault.scr === "rec1") ? "recover" : "lock"; vault.err = ""; vault.pin = ""; vault.recovering = false; renderVault(); }
  else if (a === "reset") { vault.scr = "reset"; vault.err = ""; renderVault(); }
  else if (a === "resetgo") {
    if (el("vtResetIn").value.trim().toUpperCase() !== t("vtResetWord").toUpperCase()) { el("vtResetIn").focus(); return; }
    fin.items = fin.items.filter(function (x) { return x.kind !== "vfold" && x.kind !== "vitem"; });
    try { localStorage.removeItem(VT_CFG_KEY); } catch (e) { /* ignore */ }
    finSave(); vault.scr = "setup1"; vault.pin = ""; vault.err = ""; vault.nav = "folder"; vault.folder = ""; vault.recovering = false; renderVault();
  }
  else if (a === "copycode") {
    var done = function () { node.textContent = t("vtCodeCopied"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(vtFmtCode(vault.code)).then(done, done); else done();
  }
  else if (a === "entercode") { if (!vault.saved) return; vault.unlocked = true; vault.scr = ""; vault.code = ""; vault.recovering = false; vtTouch(); renderVault(); }
  else if (a === "recovergo") {
    var v = el("vtCodeIn").value;
    vtCheckCode(v).then(function (ok) {
      if (!ok) { vault.err = t("vtRecoverBad"); renderVault(); return; }
      vault.recovering = true; vault.scr = "rec1"; vault.pin = ""; vault.err = ""; renderVault();
    });
  }
  else if (a === "changepin") {
    var cur = el("vtsCur").value, n1 = el("vtsNew").value, n2 = el("vtsNew2").value;
    if (!/^\d{6}$/.test(n1) || n1 !== n2) { vtSetMsg(n1 !== n2 ? t("vtMismatch") : t("vtSetBadFmt"), true); return; }
    vtCheckPin(cur).then(function (ok) {
      if (!ok) { vtSetMsg(t("vtWrong"), true); return; }
      vtSetPin(n1).then(function (code) { vault.code = code; vault.saved = false; vault.unlocked = false; vault.scr = "code"; vtCloseModal(); showToast(t("vtSetPinOk")); renderVault(); });
    });
  }
  else if (a === "newcode") {
    vtCheckPin(el("vtsCur").value).then(function (ok) {
      if (!ok) { vtSetMsg(t("vtWrong"), true); return; }
      var rs = vtRand(10), code = vtRand(12), c = vtCfg() || {};
      vtHash(rs, code).then(function (h) { c.rsalt = rs; c.rhash = h; vtSaveCfg(c); vtSetMsg(t("vtSetCodeIs") + "  " + vtFmtCode(code), false); });
    });
  }
}
function vtClick(e) {
  var b;
  if ((b = e.target.closest("[data-vkey]"))) { vtKey(b.getAttribute("data-vkey")); return; }
  if ((b = e.target.closest("[data-vact]"))) { vtAction(b.getAttribute("data-vact"), b); return; }
  if (!vault.unlocked) return;
  if ((b = e.target.closest("[data-vpin]"))) { e.stopPropagation(); vtTogglePin(b.getAttribute("data-vpin")); return; }
  if ((b = e.target.closest("[data-vopen]"))) { e.stopPropagation(); vtOpenLink(b.getAttribute("data-vopen")); return; }
  if ((b = e.target.closest("[data-vdl]"))) { e.stopPropagation(); vtDownload(b.getAttribute("data-vdl")); return; }
  if ((b = e.target.closest("[data-vfedit]"))) { e.stopPropagation(); vtOpenFolderModal(b.getAttribute("data-vfedit")); return; }
  if ((b = e.target.closest("[data-vtoggle]"))) { e.stopPropagation(); var id = b.getAttribute("data-vtoggle"); vault.open[id] = !vault.open[id]; vtSaveUi(); renderVault(); return; }
  if ((b = e.target.closest("[data-vtree]"))) { vault.nav = "folder"; vault.folder = b.getAttribute("data-vtree"); vault.q = ""; vault.type = "all"; if (vault.folder) vault.open[vault.folder] = true; vtSaveUi(); renderVault(); return; }
  if ((b = e.target.closest("[data-vnav]"))) { vault.nav = b.getAttribute("data-vnav"); vault.q = ""; vault.type = "all"; renderVault(); return; }
  if ((b = e.target.closest("[data-vgo]"))) { vault.nav = "folder"; vault.folder = b.getAttribute("data-vgo"); vault.q = ""; vault.type = "all"; renderVault(); return; }
  if ((b = e.target.closest("[data-vview]"))) { vault.view = b.getAttribute("data-vview"); vtSaveUi(); renderVault(); return; }
  if ((b = e.target.closest("[data-vtype]"))) { vault.type = b.getAttribute("data-vtype"); vtRefreshContent(); return; }
  if ((b = e.target.closest("[data-vfolder]"))) {
    var fid = b.getAttribute("data-vfolder"); vault.nav = "folder"; vault.folder = fid; vault.q = ""; vault.type = "all"; vault.open[fid] = true; vtSaveUi(); renderVault(); return;
  }
  if ((b = e.target.closest("[data-vitem]"))) { vtOpenItemModal(b.getAttribute("data-vitem")); return; }
}
function vtModalClick(e) {
  var b;
  if (e.target === el("vtOverlay")) { vtCloseModal(); return; }
  if ((b = e.target.closest("[data-vact]"))) { vtAction(b.getAttribute("data-vact"), b); return; }
  if ((b = e.target.closest("[data-vopen]"))) { vtOpenLink(b.getAttribute("data-vopen")); return; }
  if ((b = e.target.closest("[data-vdl]"))) { vtDownload(b.getAttribute("data-vdl")); return; }
  if ((b = e.target.closest("[data-vcol]"))) {
    var i = parseInt(b.getAttribute("data-vcol"), 10);
    if (vtDraft && vtDraft.type === "folder") vtDraft.color = i; else if (vtDraft) { vtDraft.color = i; }
    Array.prototype.forEach.call(el("vtModal").querySelectorAll("[data-vcol]"), function (n) { n.classList.toggle("on", n === b); });
    return;
  }
  if ((b = e.target.closest("[data-vtypesel]")) && vtDraft && vtDraft.type === "item") {
    vtGrabItemFields(); var nt = b.getAttribute("data-vtypesel");
    if (nt !== vtDraft.itemType) { vtDraft.itemType = nt; vtDraft.color = VT_DEF_COLOR[nt]; vtRenderItemModal(); }
  }
}

function initVault() {
  vtLoadUi();
  var ov = document.createElement("div");
  ov.className = "modal-overlay"; ov.id = "vtOverlay";
  ov.innerHTML = '<div class="modal vt-modal" id="vtModal"></div>';
  document.body.appendChild(ov);
  ov.addEventListener("click", vtModalClick);
  ov.addEventListener("submit", function (e) {
    e.preventDefault();
    if (vtDraft && vtDraft.type === "folder") vtSubmitFolder(); else if (vtDraft && vtDraft.type === "item") vtSubmitItem();
  });
  ov.addEventListener("change", function (e) {
    if (e.target.id === "vtiFile") vtReadFile(e.target.files && e.target.files[0]);
    if (e.target.id === "vtsIdle") { var c = vtCfg() || {}; c.idle = parseInt(e.target.value, 10) || 0; vtSaveCfg(c); vtTouch(); if (currentPageId === "vault") { var s = el("vtRing"); renderVault(); } }
  });
  var page = el("page-vault");
  if (!page) return;
  page.addEventListener("click", vtClick);
  page.addEventListener("input", function (e) {
    if (e.target.id === "vtQ") { vault.q = e.target.value; vtRefreshContent(); }
  });
  page.addEventListener("change", function (e) {
    if (e.target.id === "vtSavedChk") { vault.saved = e.target.checked; var g = page.querySelector(".vt-go"); if (g) g.disabled = !vault.saved; }
  });
  page.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.id === "vtCodeIn") { e.preventDefault(); vtAction("recovergo"); }
    if (e.key === "Enter" && e.target.id === "vtResetIn") { e.preventDefault(); vtAction("resetgo"); }
  });
  // drag an item (or folder) onto a folder in the tree / a folder card
  page.addEventListener("dragstart", function (e) {
    var c = e.target.closest ? e.target.closest("[data-vitem], [data-vdragfold]") : null;
    if (!c) return;
    var v = c.hasAttribute("data-vitem") ? "i:" + c.getAttribute("data-vitem") : "f:" + c.getAttribute("data-vdragfold");
    e.dataTransfer.setData("text/plain", v); e.dataTransfer.effectAllowed = "move";
  });
  page.addEventListener("dragover", function (e) {
    var t1 = e.target.closest("[data-vtree], .vt-fcard"); if (!t1) return;
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; t1.classList.add("drop");
  });
  page.addEventListener("dragleave", function (e) { var t1 = e.target.closest("[data-vtree], .vt-fcard"); if (t1) t1.classList.remove("drop"); });
  page.addEventListener("drop", function (e) {
    var t1 = e.target.closest("[data-vtree], .vt-fcard"); if (!t1) return;
    e.preventDefault(); t1.classList.remove("drop");
    var v = e.dataTransfer.getData("text/plain") || "", dest = t1.hasAttribute("data-vtree") ? t1.getAttribute("data-vtree") : t1.getAttribute("data-vfolder");
    if (v.indexOf("i:") === 0) vtMoveItem(v.slice(2), dest); else if (v.indexOf("f:") === 0) vtMoveFolder(v.slice(2), dest);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && vtModalOpen()) { vtCloseModal(); return; }
    if (currentPageId !== "vault" || vault.unlocked || vtModalOpen()) return;
    if (["setup1", "setup2", "lock", "rec1", "rec2"].indexOf(vault.scr) === -1) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (/^\d$/.test(e.key)) { e.preventDefault(); vtKey(e.key); }
    else if (e.key === "Backspace") { e.preventDefault(); vtKey("del"); }
  });
  ["pointerdown", "keydown", "wheel"].forEach(function (ev) {
    document.addEventListener(ev, function () { if (vault.unlocked) vtTouch(); }, { passive: true, capture: true });
  });
  setInterval(function () { if (currentPageId === "vault" || vault.unlocked) vtTick(); }, 1000);
}
