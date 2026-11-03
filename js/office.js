"use strict";
// ---------- Office (ออฟฟิศ): time clock, weekly timesheet, projects, tasks, progress log ----------
// Everything lives in fin.items (persisted / exported / synced like the other records):
//   { kind:"oproj", id, name, color:0-5, start, due, progress:0-100, status:"active"|"hold"|"done", notes, ms:[{d,t}] }
//   { kind:"otask", id, title, proj, due, est (minutes), done, doneAt (ms), created (ms) }
//   { kind:"osess", id, date, start:"HH:MM", end:"HH:MM"|"", type:"work"|"break", note }
//   { kind:"oupd",  id, proj, at (ms), text, from, to }
//   { kind:"oset",  id:"oset", day (hours), week (hours) }

(function () {
  var TXT = [
    ["navOffice", "ออฟฟิศ", "Office"], ["navGroupOffice", "ออฟฟิศ", "Office"],
    ["ofSub", "ทำงานคนเดียว · ลงเวลา · โปรเจกต์ · ความคืบหน้า", "Solo work · time clock · projects · progress"],
    ["ofTabOv", "ภาพรวม", "Overview"], ["ofTabTime", "ลงเวลา", "Time"], ["ofTabProj", "โปรเจกต์", "Projects"], ["ofTabTask", "งานที่ต้องทำ", "Tasks"],
    ["ofAddProj", "เพิ่มโปรเจกต์", "Add project"], ["ofAddTask", "เพิ่มงาน", "Add task"], ["ofAddSess", "เพิ่มเวลาย้อนหลัง", "Add past time"],
    ["ofPunch", "ตอกบัตร", "Time clock"], ["ofHistory", "ประวัติ", "History"], ["ofAll", "ทั้งหมด", "All"],
    ["ofWorked", "ชม. ที่ทำงานแล้ว", "hours worked"], ["ofLive", "LIVE", "LIVE"], ["ofOff", "ยังไม่เข้างาน", "Not clocked in"], ["ofBreakNow", "กำลังพัก", "On break"],
    ["ofTodayGoal", "วันนี้ · เป้า {h} ชม.", "Today · goal {h} h"], ["ofLeft", "เหลือ {d}", "{d} left"], ["ofLeaveAt", "ออกได้ตั้งแต่ {t}", "Done by {t}"], ["ofOver", "เกินเป้า {d}", "{d} over goal"],
    ["ofIn", "เข้างาน", "Clock in"], ["ofOut", "ออกงาน", "Clock out"], ["ofBreak", "พักเที่ยง", "Break"], ["ofResume", "กลับมาทำงาน", "Back to work"], ["ofInAgain", "เข้างานอีกครั้ง", "Clock in again"],
    ["ofWork", "ทำงาน", "Work"], ["ofBreakT", "พัก", "Break"], ["ofCounting", "กำลังนับเวลา", "Counting"], ["ofNoSess", "ยังไม่มีบันทึกเวลาวันนี้", "No time logged today"], ["ofForgot", "ลืมออกงาน", "Forgot to clock out"],
    ["ofSheet", "ไทม์ชีต", "Timesheet"], ["ofWeekOf", "สัปดาห์ {a}–{b}", "Week {a}–{b}"], ["ofWeekTotal", "รวมสัปดาห์นี้", "This week"], ["ofAvg", "เฉลี่ย {d}/วัน", "avg {d}/day"],
    ["ofRemain", "เหลือ {d}", "{d} left"], ["ofThisWeek", "สัปดาห์นี้", "This week"], ["ofSetGoal", "ตั้งเป้าหมาย", "Set goals"], ["ofGoalTitle", "เป้าหมายชั่วโมงทำงาน", "Work-hour goals"], ["ofGoalDay", "ชั่วโมงต่อวัน", "Hours per day"], ["ofGoalWeek", "ชั่วโมงต่อสัปดาห์", "Hours per week"],
    ["ofFocus", "โฟกัสวันนี้", "Today's focus"], ["ofTasksLeft", "เหลือ {n} งาน", "{n} open"], ["ofDoneToday", "เสร็จแล้ววันนี้", "Done today"], ["ofNoFocus", "ไม่มีงานค้าง เยี่ยมเลย", "Nothing open — nice"],
    ["ofBefore", "ก่อน {t}", "by {t}"], ["ofToday", "วันนี้", "Today"], ["ofOverdue", "เลยกำหนด", "Overdue"], ["ofNoDue", "ไม่กำหนด", "No date"],
    ["ofTimeline", "ไทม์ไลน์โปรเจกต์", "Project timeline"], ["ofNoProj", "ยังไม่มีโปรเจกต์ เริ่มจากกด “เพิ่มโปรเจกต์”", "No projects yet — tap “Add project”"], ["ofDaysLeft", "เหลือ {n} วัน", "{n} d left"], ["ofDueToday", "ครบวันนี้", "Due today"], ["ofLate", "เลยมา {n} วัน", "{n} d late"], ["ofOutWin", "อยู่นอกช่วงนี้", "Outside this range"],
    ["ofProgress", "ความคืบหน้าล่าสุด", "Latest progress"], ["ofWrite", "เขียนอัปเดตวันนี้…", "Write today's update…"], ["ofAddUpd", "เพิ่ม", "Add"], ["ofNoUpd", "ยังไม่มีอัปเดต", "No updates yet"], ["ofUpdProj", "โปรเจกต์ของอัปเดต", "Project"],
    ["ofProjects", "โปรเจกต์", "Projects"], ["ofActive", "กำลังเดิน", "Active"], ["ofHold", "พักไว้", "On hold"], ["ofDone", "เสร็จแล้ว", "Done"], ["ofUpdate", "อัปเดต", "Update"], ["ofEdit", "แก้ไข", "Edit"],
    ["ofTasksN", "งาน {a}/{b}", "Tasks {a}/{b}"], ["ofNextMs", "ถัดไป: {t}", "Next: {t}"], ["ofDue", "กำหนดส่ง", "Due"],
    ["ofPName", "ชื่อโปรเจกต์", "Project name"], ["ofPNamePh", "เช่น รีโนเวตเว็บไซต์ลูกค้า A", "e.g. Client A website"], ["ofPColor", "สี", "Colour"], ["ofPStart", "เริ่ม", "Start"], ["ofPDue", "กำหนดส่ง", "Due"], ["ofPProg", "ความคืบหน้า", "Progress"],
    ["ofPStatus", "สถานะ", "Status"], ["ofPNotes", "บันทึก", "Notes"], ["ofPMs", "หมุดหมาย", "Milestones"], ["ofPMsAdd", "เพิ่มหมุดหมาย", "Add milestone"], ["ofPMsPh", "ชื่อหมุดหมาย", "Milestone name"], ["ofPNew", "โปรเจกต์ใหม่", "New project"], ["ofPEdit", "แก้โปรเจกต์", "Edit project"],
    ["ofPDel", "ลบโปรเจกต์", "Delete project"], ["ofPDelAsk", "ลบโปรเจกต์ “{n}” พร้อมงานและอัปเดต {t} รายการของโปรเจกต์นี้?", "Delete “{n}” with its {t} tasks and updates?"], ["ofPFinish", "ความคืบหน้าถึง 100% แล้ว ตั้งเป็น “เสร็จแล้ว” เลยไหม?", "Progress is 100% — mark the project as done?"],
    ["ofTTitle", "ชื่องาน", "Task"], ["ofTTitlePh", "เช่น ส่งร่างรายงานให้หัวหน้า", "e.g. Send the draft report"], ["ofTProj", "โปรเจกต์", "Project"], ["ofTNoProj", "ไม่ระบุโปรเจกต์", "No project"], ["ofTDue", "กำหนดทำ", "Due"], ["ofTEst", "ประมาณเวลา (นาที)", "Estimate (min)"],
    ["ofTNew", "งานใหม่", "New task"], ["ofTEdit", "แก้งาน", "Edit task"], ["ofTDel", "ลบงาน", "Delete task"], ["ofTAddPh", "เพิ่มงานใหม่…", "Add a task…"], ["ofTNone", "ไม่มีงานในมุมมองนี้", "No tasks here"], ["ofMin", "{n} นาที", "{n} min"],
    ["ofSStart", "เข้า", "From"], ["ofSEnd", "ออก", "To"], ["ofSType", "ประเภท", "Type"], ["ofSDate", "วันที่", "Date"], ["ofSNote", "โน้ต", "Note"], ["ofSNew", "เพิ่มบันทึกเวลา", "Add time entry"], ["ofSEdit", "แก้บันทึกเวลา", "Edit time entry"], ["ofSDel", "ลบบันทึก", "Delete entry"], ["ofSBad", "เวลาออกต้องหลังเวลาเข้า", "End time must be after start"],
    ["ofSOpen", "ยังไม่ออก", "still open"], ["ofSNotePh", "เช่น ทำงานที่บ้าน", "e.g. working from home"], ["ofLog", "บันทึกเวลา", "Time entries"],
    ["ofUTitle", "อัปเดตความคืบหน้า", "Progress update"], ["ofUText", "ทำอะไรไปบ้าง", "What got done"], ["ofUTextPh", "เช่น ทำหน้า checkout เสร็จ รอลูกค้าตรวจ", "e.g. Checkout page done, waiting for review"],
    ["ofStaleT", "ยังไม่ได้ออกงานของ {d} (เข้า {s}) · ตอนนี้ยังทำอยู่หรือออกไปแล้ว?", "Still clocked in from {d} ({s}) — still working, or already off?"],
    ["ofStaleCut", "ออกงานที่เวลานี้", "Clock out at this time"], ["ofStaleRoll", "ยังทำอยู่ (ข้ามเที่ยงคืน)", "Still working (past midnight)"],
    ["ofSCross", "เวลาออกน้อยกว่าเวลาเข้า ถือว่าทำข้ามเที่ยงคืนไปจบอีกวันใช่ไหม? (จะแบ่งเป็น 2 วัน)", "End is earlier than start. Count it as working past midnight (split across two days)?"],
    ["ofViewList", "รายการ", "List"], ["ofViewBoard", "บอร์ด", "Board"], ["ofSearch", "ค้นหางาน โน้ต หรือประวัติ…", "Search tasks, notes, history…"], ["ofArch", "พัก/ยกเลิก", "Hold/Cancelled"],
    ["ofStTodo", "ต้องทำ", "To do"], ["ofStDoing", "กำลังทำ", "Doing"], ["ofStWait", "รอ", "Waiting"], ["ofStSent", "ส่งแล้ว", "Sent"], ["ofStBack", "ตีกลับ", "Sent back"], ["ofStDone", "เสร็จสมบูรณ์", "Done"], ["ofStHold", "พักไว้", "On hold"], ["ofStCancel", "ยกเลิก", "Cancelled"],
    ["ofColTodo", "ต้องทำ", "To do"], ["ofColTodoS", "ยังไม่เริ่ม", "Not started"], ["ofColDoing", "กำลังทำ", "Doing"], ["ofColDoingS", "รวมที่ต้องแก้", "Incl. sent back"], ["ofColWait", "รอ · ส่งแล้ว", "Waiting · Sent"], ["ofColWaitS", "รอผลจากคนอื่น", "Ball is with others"], ["ofColDone", "เสร็จสมบูรณ์", "Done"], ["ofColDoneS", "7 วันล่าสุด", "Last 7 days"],
    ["ofColSide", "เก็บไว้", "Archive"], ["ofColSideS", "ไม่นับในบอร์ด", "Not on the board"], ["ofOldDone", "เสร็จก่อนหน้านี้", "Done earlier"], ["ofDropHere", "วางที่นี่", "Drop here"], ["ofColAdd", "เพิ่มงานในคอลัมน์นี้", "Add a task here"],
    ["ofTStatus", "สถานะ", "Status"], ["ofTNote", "โน้ตสถานะ", "Status note"], ["ofTNotePh", "เช่น รอลูกค้าตอบเรื่องโลโก้", "e.g. waiting for the client's reply"],
    ["ofLogT", "ประวัติของงานนี้", "Task history"], ["ofLogCmt", "เพิ่มโน้ตลงประวัติ", "Add a note to the history"], ["ofLogCmtPh", "เขียนโน้ต…", "Write a note…"], ["ofLogAdd", "เพิ่ม", "Add"], ["ofLogAge", "อายุงาน {d}", "Age {d}"],
    ["ofLogCreate", "สร้างงาน", "Task created"], ["ofLogDue", "กำหนดทำ {a} → {b}", "Due {a} → {b}"], ["ofLogDueSet", "ตั้งกำหนดทำ {b}", "Due set to {b}"], ["ofLogDueClr", "ยกเลิกกำหนดทำ (เดิม {a})", "Due date cleared (was {a})"], ["ofLogNote", "แก้โน้ตสถานะ", "Status note changed"], ["ofLogCmtT", "โน้ต", "Note"],
    ["ofLogStay", "อยู่ในสถานะ “{s}” {d}", "Stayed “{s}” for {d}"], ["ofLogNow", "ตอนนี้อยู่ที่นี่มา {d}", "Here for {d} so far"], ["ofLogNone", "ยังไม่มีประวัติ", "No history yet"],
    ["ofSpanD", "{n} วัน", "{n} d"], ["ofSpanH", "{n} ชม.", "{n} h"], ["ofSpanM", "{n} นาที", "{n} min"], ["ofSpanLt", "ไม่ถึงนาที", "under a minute"],
    ["ofDelAsk", "ลบรายการนี้?", "Delete this?"]
  ];
  TXT.forEach(function (r) { I18N.th[r[0]] = r[1]; I18N.en[r[0]] = r[2]; });
})();

var OFF_COLORS = ["#1b3fd0", "#b8a0ea", "#f7c419", "#f48ba6", "#1e7a40", "#ee4a2a"];
var OFF_UI_KEY = "daybook_office_ui";
var off = { tab: "ov", gw: 0, sw: 0, tf: "all", tp: "", updProj: "", tv: "list", q: "" };
var offDraft = null;

// ---- data ----
function offProjs() { return fin.items.filter(function (x) { return x.kind === "oproj"; }); }
function offTasks() { return fin.items.filter(function (x) { return x.kind === "otask"; }); }
function offSessAll() { return fin.items.filter(function (x) { return x.kind === "osess"; }); }
function offUpds() { return fin.items.filter(function (x) { return x.kind === "oupd"; }).sort(function (a, b) { return b.at - a.at; }); }
function offProj(id) { return id ? fin.items.find(function (x) { return x.kind === "oproj" && x.id === id; }) || null : null; }
function offSet() {
  var s = fin.items.find(function (x) { return x.kind === "oset"; });
  return { day: s && s.day > 0 ? s.day : 8, week: s && s.week > 0 ? s.week : 40 };
}
function offLoadUi() { try { var u = JSON.parse(localStorage.getItem(OFF_UI_KEY) || "null"); if (u && ["ov", "time", "proj", "task"].indexOf(u.tab) !== -1) off.tab = u.tab; if (u && (u.tv === "board" || u.tv === "list")) off.tv = u.tv; } catch (e) { /* ignore */ } }
function offSaveUi() { try { localStorage.setItem(OFF_UI_KEY, JSON.stringify({ tab: off.tab, tv: off.tv })); } catch (e) { /* ignore */ } }

// ---- time helpers ----
function offPad(n) { return (n < 10 ? "0" : "") + n; }
function offHM(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(s || ""); return m ? (+m[1]) * 60 + (+m[2]) : 0; }
function offNowMin() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
function offNowStr() { return offPad(Math.floor(offNowMin() / 60)) + ":" + offPad(offNowMin() % 60); }
function offDur(min) { min = Math.max(0, Math.round(min)); return Math.floor(min / 60) + ":" + offPad(min % 60); }
function offDur2(min) { min = Math.max(0, Math.round(min)); return offPad(Math.floor(min / 60)) + ":" + offPad(min % 60); }
function offMonday(s) { var d = pDate(s), k = (d.getDay() + 6) % 7; return pAdd(s, -k); }
function offDShort(s) { return s ? pDate(s).toLocaleDateString(I18N[state.lang].locale, { day: "numeric", month: "short" }) : ""; }
function offDLong(s) { return s ? pDate(s).toLocaleDateString(I18N[state.lang].locale, { weekday: "long", day: "numeric", month: "short" }) : ""; }
function offDow(s) { return pDate(s).toLocaleDateString(I18N[state.lang].locale, { weekday: "short" }).replace(/\.$/, ""); }
function offSessMin(s, today, nowMin) {
  var a = offHM(s.start), b;
  if (s.end) b = offHM(s.end); else if (s.date === today) b = nowMin; else return 0;
  return Math.max(0, b - a);
}
function offDay(date) { return offSessAll().filter(function (s) { return s.date === date; }).sort(function (a, b) { return offHM(a.start) - offHM(b.start); }); }
function offDayWork(date) { var today = todayStr(), nm = offNowMin(); return offDay(date).filter(function (s) { return s.type === "work"; }).reduce(function (m, s) { return m + offSessMin(s, today, nm); }, 0); }
function offOpen() { var today = todayStr(); return offDay(today).filter(function (s) { return !s.end; })[0] || null; }
function offStale() { var today = todayStr(); return offSessAll().filter(function (x) { return !x.end && x.date < today; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }
// Split an open session that crosses midnight: close it at 24:00 and carry on from 00:00 each following day.
function offRoll(sess) {
  var today = todayStr(), d = sess.date, cur = sess;
  while (d < today) {
    cur.end = "24:00"; d = pAdd(d, 1);
    var n = { id: uid(), kind: "osess", date: d, start: "00:00", end: "", type: cur.type, note: cur.note || "" };
    fin.items.push(n); cur = n;
  }
  finSave();
}
var offBootDay = todayStr();
function offFg(ci) { return ci === 0 || ci === 5 || ci === 4 ? "#fff" : "#121212"; }
function offCol(p) { return OFF_COLORS[p && OFF_COLORS[p.color] ? p.color : 0]; }
function offIco(n, s) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"' + (s ? ' style="width:' + s + "px;height:" + s + 'px"' : "") + '><use href="#i-' + n + '"/></svg>'; }
var OFF_ST = {
  todo: { k: "ofStTodo", bg: "#fbf8ee" }, doing: { k: "ofStDoing", bg: "#1b3fd0", fg: "#fff" }, wait: { k: "ofStWait", bg: "#f7c419" }, sent: { k: "ofStSent", bg: "#b8a0ea" },
  back: { k: "ofStBack", bg: "#ee4a2a", fg: "#fff" }, done: { k: "ofStDone", bg: "#1e7a40", fg: "#fff" }, hold: { k: "ofStHold", bg: "#cbc5b3" }, cancel: { k: "ofStCancel", bg: "transparent", dash: true }
};
var OFF_ST_ORDER = ["todo", "doing", "wait", "sent", "back", "done", "hold", "cancel"];
var OFF_COLS = [
  { key: "todo", title: "ofColTodo", sub: "ofColTodoS", bg: "#fbf8ee", fg: "#121212", sts: ["todo"] },
  { key: "doing", title: "ofColDoing", sub: "ofColDoingS", bg: "#1b3fd0", fg: "#fff", sts: ["doing", "back"] },
  { key: "wait", title: "ofColWait", sub: "ofColWaitS", bg: "#f7c419", fg: "#121212", sts: ["wait", "sent"] },
  { key: "done", title: "ofColDone", sub: "ofColDoneS", bg: "#1e7a40", fg: "#fff", sts: ["done"] }
];
function offTStatus(x) { return x.status && OFF_ST[x.status] ? x.status : (x.done ? "done" : "todo"); }
function offTOpen(x) { var s = offTStatus(x); return s !== "done" && s !== "hold" && s !== "cancel"; }
function offTMine(x) { var s = offTStatus(x); return s === "todo" || s === "doing" || s === "back"; }
function offTaskOpen() { return offTasks().filter(offTOpen); }
function offColOf(st) { return st === "back" ? "doing" : st === "sent" ? "wait" : st; }
function offStPill(st, extra) {
  var d = OFF_ST[st]; return '<span class="kb-st' + (d.dash ? " dash" : "") + '" style="--sc:' + d.bg + ";--stx:" + (d.fg || "#121212") + '"><i></i>' + t(d.k) + (extra || "") + "</span>";
}
function offSpan(ms) {
  var m = Math.floor(ms / 60000); if (m < 1) return t("ofSpanLt");
  var d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60;
  if (d) return t("ofSpanD", { n: d }) + (h ? " " + t("ofSpanH", { n: h }) : "");
  if (h) return t("ofSpanH", { n: h }) + (mm ? " " + t("ofSpanM", { n: mm }) : "");
  return t("ofSpanM", { n: mm });
}
function offEnsureLog(x) {
  if (x.log && x.log.length) return x.log;
  var st = offTStatus(x);
  x.log = [{ at: x.created || Date.now(), type: "create", to: "todo" }];
  if (st !== "todo") x.log.push({ at: st === "done" && x.doneAt ? x.doneAt : Date.now(), type: "status", from: "todo", to: st, text: "" });
  return x.log;
}
function offSetStatus(x, to, note) {
  var from = offTStatus(x); if (from === to) return;
  offEnsureLog(x);
  x.status = to; x.done = to === "done"; x.doneAt = x.done ? Date.now() : 0;
  x.log.push({ at: Date.now(), type: "status", from: from, to: to, text: note || "" });
}
function offQMatch(x, q) {
  if (!q) return true; q = q.toLowerCase();
  var p = offProj(x.proj), hay = [x.title, x.note, p ? p.name : ""].concat((x.log || []).map(function (l) { return l.text || ""; })).join("\n").toLowerCase();
  return hay.indexOf(q) !== -1;
}
function offTaskRank(x) { var today = todayStr(); return (x.due ? (x.due < today ? 0 : x.due === today ? 1 : 2) : 3) * 1e9 + (x.due ? pDate(x.due).getTime() / 1e5 : 0) + (x.created || 0) / 1e13; }
function offTaskSorted(list) { return list.slice().sort(function (a, b) { return offTaskRank(a) - offTaskRank(b); }); }
function offDueTag(x) {
  var today = todayStr();
  if (!x.due) return '<span class="of-tag">' + t("ofNoDue") + "</span>";
  if (x.due < today) return '<span class="of-tag red">' + t("ofOverdue") + "</span>";
  if (x.due === today) return '<span class="of-tag yel">' + t("ofToday") + "</span>";
  return '<span class="of-tag">' + offDShort(x.due) + "</span>";
}
function offAgo(ms) {
  var today = todayStr(), d = dateOfStamp(ms), dt = new Date(ms), hm = offPad(dt.getHours()) + ":" + offPad(dt.getMinutes());
  if (d === today) return t("ofToday") + " " + hm;
  if (d === pAdd(today, -1)) return (state.lang === "th" ? "เมื่อวาน " : "Yesterday ") + hm;
  return offDShort(d) + " " + hm;
}

// ---- actions on the clock ----
function offClock(act) {
  var today = todayStr(), now = offNowStr(), open = offOpen();
  if (act === "in" || act === "resume") {
    if (open) { open.end = now; }
    fin.items.push({ id: uid(), kind: "osess", date: today, start: now, end: "", type: "work", note: "" });
  } else if (act === "break") {
    if (open) open.end = now;
    fin.items.push({ id: uid(), kind: "osess", date: today, start: now, end: "", type: "break", note: "" });
  } else if (act === "out") {
    if (open) open.end = now;
  }
  // drop zero-length entries created by a quick double tap
  fin.items = fin.items.filter(function (x) { return !(x.kind === "osess" && x.end && x.end === x.start && x.date === today); });
  finSave(); renderOffice();
}

// ---- pieces ----
function offRingHtml(worked, goal, mode) {
  var C = 2 * Math.PI * 118, today = todayStr(), nm = offNowMin(), segs = "", acc = 0, goalMin = goal * 60;
  var work = offDay(today).filter(function (s) { return s.type === "work"; });
  work.forEach(function (s, i) {
    var d = offSessMin(s, today, nm); if (!d) return;
    var len = Math.min(C - acc, d / goalMin * C); if (len <= 0) return;
    var gap = i > 0 ? 6 : 0;
    segs += '<circle class="of-arc" cx="150" cy="150" r="118" fill="none" stroke="#ee4a2a" stroke-width="30" stroke-dasharray="' + Math.max(0, len - gap).toFixed(1) + " " + (C - Math.max(0, len - gap)).toFixed(1) + '" stroke-dashoffset="' + (-(acc + gap)).toFixed(1) + '" transform="rotate(-90 150 150)"/>';
    acc += len;
  });
  var ang = Math.min(1, worked / goalMin) * 360 - 90;
  var ticks = ""; for (var k = 0; k < 8; k++) ticks += '<line x1="150" y1="6" x2="150" y2="16" stroke="currentColor" stroke-width="3" transform="rotate(' + k * 45 + ' 150 150)"/>';
  return '<svg class="of-ringsvg" viewBox="0 0 300 300" aria-hidden="true"><circle class="of-ring-o" cx="150" cy="150" r="118" fill="none" stroke-width="36"/><circle class="of-ring-t" cx="150" cy="150" r="118" fill="none" stroke-width="30"/>' + segs +
    '<circle class="of-ring-l" cx="150" cy="150" r="97" fill="none" stroke-width="2"/><circle class="of-ring-l" cx="150" cy="150" r="139" fill="none" stroke-width="2"/>' +
    '<g transform="rotate(' + ang.toFixed(1) + ' 150 150)"><circle class="of-knob" cx="268" cy="150" r="13" stroke-width="3"/></g>' + ticks + "</svg>";
}
function offPunchHtml(big) {
  var today = todayStr(), nm = offNowMin(), set = offSet(), goal = set.day, goalMin = goal * 60;
  var worked = offDayWork(today), open = offOpen(), mode = open ? (open.type === "break" ? "break" : "work") : "off";
  var sess = offDay(today);
  var tl = sess.length ? sess.map(function (s) {
    var isB = s.type === "break", d = offSessMin(s, today, nm);
    var title = isB ? t("ofBreak") : (s === sess.filter(function (x) { return x.type === "work"; })[0] ? t("ofIn") : t("ofResume"));
    var sub = !s.end ? t("ofCounting") : offDur(d) + " " + (state.lang === "th" ? "ชม." : "h") + (s.note ? " · " + escapeHtml(s.note) : "");
    return '<button type="button" class="of-ev" data-oa="sess" data-id="' + s.id + '"><span class="of-evt">' + s.start + '</span><i class="of-dot ' + (isB ? "gr" : "rd") + '"></i><span class="of-evx"><b>' + title + "</b><small>" + sub + "</small></span></button>";
  }).join("") : '<div class="of-empty">' + t("ofNoSess") + "</div>";
  var left = goalMin - worked, line;
  if (mode === "off" && !sess.length) line = '<b class="of-big">' + t("ofOff") + "</b>";
  else if (left > 0) line = '<b class="of-big">' + t("ofLeft", { d: offDur(left) }) + "</b>" + (mode === "work" ? '<span class="of-mut">' + t("ofLeaveAt", { t: offDur2((nm + left) % 1440) }) + "</span>" : "");
  else line = '<b class="of-big">' + t("ofOver", { d: offDur(-left) }) + "</b>";
  var btns = mode === "off" ? '<button type="button" class="btn-primary of-btn" data-oa="clock" data-act="in">' + offIco("clock", 22) + (sess.length ? t("ofInAgain") : t("ofIn")) + "</button>"
    : '<button type="button" class="btn-secondary of-btn" data-oa="clock" data-act="' + (mode === "break" ? "resume" : "break") + '">' + offIco("clock", 22) + (mode === "break" ? t("ofResume") : t("ofBreak")) + '</button><button type="button" class="of-btn of-out" data-oa="clock" data-act="out">' + t("ofOut") + "</button>";
  var stale = offStale()[0], ban = "";
  if (stale) {
    var se = offHM(stale.start) + 480, defEnd = offDur2(Math.min(se, 1439));
    ban = '<div class="of-stale"><b>' + t("ofStaleT", { d: offDShort(stale.date), s: stale.start }) + '</b><div class="of-srow"><input type="time" id="offStaleEnd" value="' + defEnd + '"><button type="button" class="btn-secondary of-sm" data-oa="stalecut" data-id="' + stale.id + '">' + t("ofStaleCut") + "</button>" +
      (pDiff(stale.date, todayStr()) === 1 ? '<button type="button" class="btn-primary of-sm" data-oa="staleroll" data-id="' + stale.id + '">' + t("ofStaleRoll") + "</button>" : "") + "</div></div>";
  }
  return '<section class="panel of-punch"><div class="ph"><i class="tg" style="background:var(--c-red)"></i><h2>' + t("ofPunch") + '</h2><span class="of-m">' + offDLong(today) + '</span><button type="button" class="of-more" data-oa="tab" data-tab="time">' + t("ofHistory") + offIco("chev-r", 18) + '</button></div>' +
    '<div class="of-pbody"><div class="of-ringwrap">' + offRingHtml(worked, goal, mode) + '<div class="of-ringtxt"><div class="of-ringt" id="offClockT">' + offDur2(worked) + '</div><div class="of-ringsub">' + t("ofWorked") + "</div>" +
    (mode === "work" ? '<span class="of-livepill"><i></i>' + t("ofLive") + "</span>" : mode === "break" ? '<span class="of-livepill brk">' + t("ofBreakNow") + "</span>" : "") + "</div></div>" +
    '<div class="of-pside"><div class="of-sub">' + t("ofTodayGoal", { h: goal }) + '</div><div class="of-lrow">' + line + '</div>' + ban + '<div class="of-evs">' + tl + '</div><div class="of-btns">' + btns + "</div></div></div></section>";
}

function offAxis(days) {
  var lo = 8, hi = 20, today = todayStr(), nm = offNowMin();
  days.forEach(function (d) { offDay(d).forEach(function (s) {
    lo = Math.min(lo, Math.floor(offHM(s.start) / 60));
    var e = s.end ? offHM(s.end) : (d === today ? nm : offHM(s.start)); hi = Math.max(hi, Math.ceil(e / 60));
  }); });
  lo = Math.max(0, Math.min(lo, 8)); hi = Math.min(24, Math.max(hi, 20));
  if ((hi - lo) % 2) hi = Math.min(24, hi + 1);
  return { lo: lo, hi: hi };
}
function offSheetHtml(full) {
  var today = todayStr(), nm = offNowMin(), set = offSet();
  var mon = pAdd(offMonday(today), 7 * off.sw), days = [];
  for (var i = 0; i < 7; i++) days.push(pAdd(mon, i));
  var shown = days.filter(function (d, i) { return i < 5 || offDay(d).length; });
  var ax = offAxis(shown), span = (ax.hi - ax.lo) * 60;
  var X = function (m) { return Math.max(0, Math.min(100, (m - ax.lo * 60) / span * 100)); };
  var total = 0, rows = shown.map(function (d) {
    var sess = offDay(d).filter(function (s) { return s.type === "work"; }), tot = offDayWork(d), isT = d === today, fut = d > today; total += tot;
    var blocks = sess.map(function (s) {
      var a = offHM(s.start), b = s.end ? offHM(s.end) : (isT ? nm : a), live = !s.end && isT;
      return '<button type="button" class="of-blk' + (live ? " live" : "") + '" data-oa="sess" data-id="' + s.id + '" style="left:' + X(a).toFixed(2) + "%;width:" + Math.max(0.8, X(b) - X(a)).toFixed(2) + '%"><span>' + offDur(b - a) + "</span></button>";
    }).join("");
    var grid = ""; for (var h = ax.lo + 2; h < ax.hi; h += 2) grid += '<i class="of-gl" style="left:' + X(h * 60).toFixed(2) + '%"></i>';
    return '<div class="of-trow"><div class="of-tday"><span class="of-dchip' + (isT ? " today" : "") + '" title="' + offDShort(d) + '">' + offDow(d) + '</span></div><div class="of-ttrack' + (fut ? " fut" : "") + '">' + grid + blocks + '</div><div class="of-ttot' + (tot ? "" : " z") + '">' + (tot ? offDur(tot) : "–") + "</div></div>";
  }).join("");
  var axis = ""; for (var h2 = ax.lo; h2 <= ax.hi; h2 += 2) axis += '<span style="left:' + X(h2 * 60).toFixed(2) + '%">' + offPad(h2) + ":00</span>";
  var nowL = mon === offMonday(today) && nm >= ax.lo * 60 && nm <= ax.hi * 60 ? '<div class="of-now" style="left:' + X(nm).toFixed(2) + '%"><b>' + offNowStr() + "</b></div>" : "";
  var wkGoal = set.week * 60, pct = Math.min(100, Math.round(total / wkGoal * 100));
  var worked = days.filter(function (d) { return offDayWork(d) > 0; }).length, avg = worked ? total / worked : 0, rest = wkGoal - total;
  var nav = '<button type="button" class="of-nb" data-oa="sw" data-d="-1" aria-label="prev">' + offIco("chev-l", 16) + '</button><button type="button" class="of-nb" data-oa="sw" data-d="1" aria-label="next">' + offIco("chev-r", 16) + "</button>";
  return '<section class="panel of-sheet"><div class="ph"><i class="tg" style="background:var(--c-red)"></i><h2>' + t("ofSheet") + '</h2><span class="of-m">' + t("ofWeekOf", { a: offDShort(days[0]), b: offDShort(days[6]) }) + '</span><span class="of-nav">' + nav + '</span></div>' +
    '<div class="of-sbody"><div class="of-tgrid"><div class="of-tlay">' + nowL + "</div>" + rows + '<div class="of-trow ax"><div class="of-tday"></div><div class="of-axis">' + axis + '</div><div class="of-ttot"></div></div></div>' +
    '<div class="of-sfoot"><div><div class="of-sub">' + (mon === offMonday(today) ? t("ofWeekTotal") : t("ofWeekOf", { a: offDShort(days[0]), b: offDShort(days[6]) })) + '</div><b class="of-wk">' + offDur(total) + '</b><span class="of-mut"> / ' + set.week + ':00</span></div>' +
    '<div class="of-sbar"><div class="pbar"><i style="width:' + pct + '%;background:var(--c-red)"></i></div><div class="of-sbl"><span>' + t("ofAvg", { d: offDur(avg) }) + "</span><span>" + (rest > 0 ? t("ofRemain", { d: offDur(rest) }) : t("ofOver", { d: offDur(-rest) })) + '</span></div></div><button type="button" class="of-goalb" data-oa="goal" title="' + t("ofSetGoal") + '">' + offIco("edit", 18) + "</button></div></div></section>";
}

function offFocusHtml() {
  var today = todayStr(), open = offTaskSorted(offTasks().filter(offTMine)), top = open.slice(0, 3);
  var cards = top.map(function (x, i) {
    var p = offProj(x.proj), c = p ? offCol(p) : "#cbc5b3", fg = p ? offFg(p.color) : "#121212";
    return '<div class="of-fcard' + (i === 0 ? " first" : "") + '" data-oa="task" data-id="' + x.id + '"><span class="of-fnum" style="background:' + c + ";color:" + fg + '">' + (i + 1) + '</span><span class="of-ftx"><b>' + escapeHtml(x.title) + "</b><small>" + (p ? '<i class="of-dot" style="background:' + c + '"></i>' + escapeHtml(p.name) : escapeHtml(t("ofTNoProj"))) + (x.est ? " · ~ " + t("ofMin", { n: x.est }) : "") + '</small></span>' + offDueTag(x) +
      '<button type="button" class="of-chk" data-oa="tdone" data-id="' + x.id + '" aria-label="done"></button></div>';
  }).join("") || '<div class="of-empty">' + t("ofNoFocus") + "</div>";
  var done = offTasks().filter(function (x) { return offTStatus(x) === "done" && x.doneAt && dateOfStamp(x.doneAt) === today; });
  var dl = done.map(function (x) {
    var d = new Date(x.doneAt);
    return '<div class="of-done"><button type="button" class="of-ck on" data-oa="tundo" data-id="' + x.id + '" aria-label="undo">' + offIco("check", 16) + "</button><span>" + escapeHtml(x.title) + "</span><em>" + offPad(d.getHours()) + ":" + offPad(d.getMinutes()) + "</em></div>";
  }).join("");
  return '<section class="panel of-focus"><div class="ph"><i class="tg" style="background:var(--c-yellow)"></i><h2>' + t("ofFocus") + '</h2><span class="of-m">' + t("ofTasksLeft", { n: open.length }) + '</span><button type="button" class="of-more" data-oa="tab" data-tab="task">' + t("ofAll") + offIco("chev-r", 18) + '</button></div><div class="pb"><div class="of-fcards">' + cards + "</div>" +
    (done.length ? '<div class="of-sub of-sp">' + t("ofDoneToday") + " · " + done.length + "</div>" + dl : "") + "</div></section>";
}

function offGanttHtml() {
  var today = todayStr(), win = pAdd(offMonday(today), 7 * off.gw), N = 28, W = 100 / N;
  var act = offProjs().filter(function (p) { return p.status !== "done"; }).sort(function (a, b) { return (a.due || "9") < (b.due || "9") ? -1 : 1; });
  var head = "", grid = "";
  for (var i = 0; i < N; i++) {
    var d = pAdd(win, i), wd = i % 7, isT = d === today;
    head += '<div class="of-gh' + (wd === 0 ? " wk" : "") + (wd >= 5 ? " we" : "") + (isT ? " today" : "") + '"><small>' + offDow(d) + "</small><b>" + pDate(d).getDate() + "</b></div>";
    grid += '<i class="of-gcol' + (wd === 0 ? " wk" : "") + (wd >= 5 ? " we" : "") + '" style="left:' + (i * W).toFixed(3) + "%;width:" + W.toFixed(3) + '%"></i>';
  }
  var ti = pDiff(win, today), tline = ti >= 0 && ti < N ? '<div class="of-gtoday" style="left:' + ((ti + 0.5) * W).toFixed(3) + '%"></div>' : "";
  var rows = act.map(function (p) {
    var c = offCol(p), s = p.start ? pDiff(win, p.start) : 0, e = p.due ? pDiff(win, p.due) : s + 6, bar = "", mk = "";
    var left = Math.max(0, s), right = Math.min(N - 1, e);
    if (e >= 0 && s <= N - 1) {
      var pr = Math.max(0, Math.min(100, p.progress || 0));
      bar = '<button type="button" class="of-gbar" data-oa="proj" data-id="' + p.id + '" style="left:' + (left * W).toFixed(3) + "%;width:" + ((right + 1 - left) * W).toFixed(3) + "%;--pc:" + c + '"><i style="width:' + pr + '%"></i><span style="color:' + (pr > 22 ? offFg(p.color) : "#121212") + '">' + (s < 0 ? "◀ " : "") + pr + "%" + (e > N - 1 ? " ▶" : "") + "</span></button>";
      var ms = (p.ms || []).filter(function (m) { var k = pDiff(win, m.d); return k >= 0 && k < N; }).map(function (m) { return { k: pDiff(win, m.d), t: m.t }; });
      if (p.due && e >= 0 && e <= N - 1) ms.push({ k: e, t: t("ofDue") + " " + offDShort(p.due) });
      mk = ms.map(function (m) { return '<span class="of-ms" style="left:' + ((m.k + 0.5) * W).toFixed(3) + '%"><i></i></span><span class="of-msl" style="left:' + ((m.k + 0.5) * W).toFixed(3) + '%">' + escapeHtml(m.t) + "</span>"; }).join("");
    } else bar = '<span class="of-gout">' + t("ofOutWin") + " · " + (p.due ? offDShort(p.due) : "") + "</span>";
    var left2 = p.due ? pDiff(today, p.due) : null;
    var rem = left2 === null ? "" : left2 > 0 ? t("ofDaysLeft", { n: left2 }) : left2 === 0 ? t("ofDueToday") : t("ofLate", { n: -left2 });
    return '<div class="of-grow"><button type="button" class="of-gname" data-oa="proj" data-id="' + p.id + '"><i class="of-dot lg" style="background:' + c + '"></i><span><b>' + escapeHtml(p.name) + "</b><small>" + (p.progress || 0) + "% · " + rem + '</small></span></button><div class="of-gtrack"><div class="of-gin">' + bar + mk + "</div></div></div>";
  }).join("") || '<div class="of-empty pad">' + t("ofNoProj") + "</div>";
  var last = pAdd(win, N - 1), nav = '<button type="button" class="of-nb" data-oa="gw" data-d="-1" aria-label="prev">' + offIco("chev-l", 16) + '</button><button type="button" class="of-nb" data-oa="gw" data-d="1" aria-label="next">' + offIco("chev-r", 16) + "</button>";
  return '<section class="panel of-gantt"><div class="ph"><i class="tg" style="background:var(--c-blue)"></i><h2>' + t("ofTimeline") + '</h2><span class="of-m">' + offDShort(win) + " – " + offDShort(last) + '</span><span class="of-nav">' + nav + '</span><button type="button" class="of-more" data-oa="tab" data-tab="proj">' + t("ofAll") + offIco("chev-r", 18) + '</button></div>' +
    '<div class="of-gscroll"><div class="of-gwrap"><div class="of-ghead"><div class="of-gl0"></div><div class="of-gdays">' + head + '</div></div><div class="of-gbody"><div class="of-glay">' + grid + tline + "</div>" + rows + "</div></div></div></section>";
}

function offFeedHtml(compact) {
  var list = offUpds().slice(0, compact ? 4 : 30), act = offProjs().filter(function (p) { return p.status !== "done"; });
  var items = list.map(function (u) {
    var p = offProj(u.proj), c = p ? offCol(p) : "#cbc5b3";
    return '<div class="of-fi"><span class="of-fdot" style="background:' + c + '"></span><div class="of-fx"><small>' + offAgo(u.at) + " · " + escapeHtml(p ? p.name : "—") + "</small><b>" + escapeHtml(u.text || (state.lang === "th" ? "อัปเดตความคืบหน้า" : "Progress update")) + "</b></div>" +
      (u.to != null && u.from !== u.to ? '<span class="of-tag mono">' + u.from + " → " + u.to + "%</span>" : "") + '<button type="button" class="of-fdel" data-oa="updel" data-id="' + u.id + '" aria-label="delete">' + offIco("close", 14) + "</button></div>";
  }).join("") || '<div class="of-empty">' + t("ofNoUpd") + "</div>";
  var sel = act.length ? '<select id="offUpdProj" class="of-sel" aria-label="' + t("ofUpdProj") + '">' + act.map(function (p) { return '<option value="' + p.id + '"' + (p.id === off.updProj ? " selected" : "") + ">" + escapeHtml(p.name) + "</option>"; }).join("") + "</select>" : "";
  var inp = act.length ? '<form class="of-fform" id="offUpdForm" autocomplete="off">' + sel + '<div class="of-frow"><input type="text" id="offUpdText" maxlength="160" placeholder="' + escapeHtml(t("ofWrite")) + '"><button type="submit" class="of-add">' + t("ofAddUpd") + "</button></div></form>" : "";
  return '<section class="panel of-feed"><div class="ph"><i class="tg" style="background:var(--c-blue)"></i><h2>' + t("ofProgress") + "</h2></div>" + '<div class="pb of-fbody"><div class="of-flist">' + items + "</div>" + inp + "</div></section>";
}

function offOverviewHtml() { return '<div class="of-ov">' + offPunchHtml() + offSheetHtml() + offFocusHtml() + offGanttHtml() + offFeedHtml(true) + "</div>"; }

function offTimeHtml() {
  var mon = pAdd(offMonday(todayStr()), 7 * off.sw), rows = "", today = todayStr(), nm = offNowMin();
  for (var i = 6; i >= 0; i--) {
    var d = pAdd(mon, i), ss = offDay(d); if (!ss.length) continue;
    rows += '<div class="of-lday"><div class="of-lh"><b>' + offDLong(d) + '</b><span>' + offDur(offDayWork(d)) + '</span></div>' + ss.map(function (s) {
      var isB = s.type === "break";
      return '<button type="button" class="of-lrow" data-oa="sess" data-id="' + s.id + '"><i class="of-dot ' + (isB ? "gr" : "rd") + '"></i><span class="of-lt">' + s.start + " – " + (s.end || (d === today ? "…" : "?")) + '</span><span class="of-lx">' + (isB ? t("ofBreakT") : t("ofWork")) + (s.note ? " · " + escapeHtml(s.note) : "") + (!s.end && d !== today ? ' · <em class="red">' + t("ofForgot") + "</em>" : "") + '</span><span class="of-ld">' + (s.end || d === today ? offDur(offSessMin(s, today, nm)) : "—") + "</span></button>";
    }).join("") + "</div>";
  }
  if (!rows) rows = '<div class="of-empty pad">' + t("ofNoSess") + "</div>";
  return '<div class="of-time">' + offPunchHtml() + offSheetHtml() + '<section class="panel of-log"><div class="ph"><i class="tg" style="background:var(--c-red)"></i><h2>' + t("ofLog") + '</h2><span class="of-m">' + t("ofWeekOf", { a: offDShort(mon), b: offDShort(pAdd(mon, 6)) }) + '</span></div><div class="pb">' + rows + "</div></section></div>";
}

function offProjCard(p) {
  var c = offCol(p), today = todayStr(), tasks = offTasks().filter(function (x) { return x.proj === p.id && offTStatus(x) !== "cancel"; }), open = tasks.filter(offTOpen);
  var left = p.due ? pDiff(today, p.due) : null, pr = Math.max(0, Math.min(100, p.progress || 0));
  var rem = left === null ? "" : left > 0 ? t("ofDaysLeft", { n: left }) : left === 0 ? t("ofDueToday") : t("ofLate", { n: -left });
  var nx = (p.ms || []).filter(function (m) { return m.d >= today; }).sort(function (a, b) { return a.d < b.d ? -1 : 1; })[0];
  var st = p.status === "done" ? t("ofDone") : p.status === "hold" ? t("ofHold") : t("ofActive");
  return '<article class="of-pc' + (p.status === "done" ? " done" : "") + '" style="--pc:' + c + '"><header><i class="of-dot lg" style="background:' + c + '"></i><b>' + escapeHtml(p.name) + '</b><span class="of-tag' + (p.status === "active" ? " yel" : "") + '">' + st + "</span></header>" +
    '<div class="of-pcn"><strong>' + pr + '%</strong><span class="' + (left !== null && left < 0 && p.status !== "done" ? "red" : "") + '">' + (p.due ? t("ofDue") + " " + offDShort(p.due) + " · " + rem : "") + '</span></div><div class="pbar of-pcb"><i style="width:' + pr + '%;background:' + c + '"></i></div>' +
    '<div class="of-pcm"><span>' + t("ofTasksN", { a: tasks.length - open.length, b: tasks.length }) + "</span>" + (nx ? "<span>" + t("ofNextMs", { t: escapeHtml(nx.t) + " " + offDShort(nx.d) }) + "</span>" : "") + "</div>" +
    '<footer><button type="button" class="btn-secondary of-sm" data-oa="upd" data-id="' + p.id + '">' + t("ofUpdate") + '</button><button type="button" class="btn-secondary of-sm" data-oa="proj" data-id="' + p.id + '">' + t("ofEdit") + "</button></footer></article>";
}
function offProjHtml() {
  var all = offProjs(), by = function (s) { return all.filter(function (p) { return (p.status || "active") === s; }).sort(function (a, b) { return (a.due || "9") < (b.due || "9") ? -1 : 1; }); };
  var sec = function (key, list) { return list.length ? '<h3 class="of-h3">' + t(key) + " · " + list.length + '</h3><div class="of-pgrid">' + list.map(offProjCard).join("") + "</div>" : ""; };
  var body = sec("ofActive", by("active")) + sec("ofHold", by("hold")) + sec("ofDone", by("done"));
  return '<div class="of-projs">' + (all.length ? body : '<div class="panel"><div class="of-empty pad">' + t("ofNoProj") + "</div></div>") + "</div>";
}

function offTaskRow(x) {
  var p = offProj(x.proj), c = p ? offCol(p) : "#cbc5b3", st = offTStatus(x), dn = st === "done";
  return '<div class="of-trw' + (dn ? " done" : "") + (st === "cancel" ? " cx" : "") + '" data-oa="task" data-id="' + x.id + '"><button type="button" class="of-ck' + (dn ? " on" : "") + '" data-oa="' + (dn ? "tundo" : "tdone") + '" data-id="' + x.id + '" aria-label="done">' + (dn ? offIco("check", 16) : "") + '</button><span class="of-trt"><b>' + escapeHtml(x.title) + "</b><small>" + (p ? '<i class="of-dot" style="background:' + c + '"></i>' + escapeHtml(p.name) : escapeHtml(t("ofTNoProj"))) + (x.est ? " · ~ " + t("ofMin", { n: x.est }) : "") + (x.note ? " · " + escapeHtml(x.note) : "") + "</small></span>" + (st === "todo" || dn ? "" : offStPill(st)) + (dn ? offStPill("done") : st === "hold" || st === "cancel" ? "" : offDueTag(x)) + "</div>";
}
function offCardHtml(x) {
  var p = offProj(x.proj), c = p ? offCol(p) : "#cbc5b3", st = offTStatus(x), today = todayStr(), dn = st === "done";
  var due = dn ? (x.doneAt ? offDShort(dateOfStamp(x.doneAt)) : "") : !x.due ? "" : x.due < today ? t("ofOverdue") : x.due === today ? t("ofToday") : offDShort(x.due);
  var dcls = !dn && x.due && x.due < today ? " red" : !dn && x.due === today ? " yel" : "";
  var sel = '<select data-tst="' + x.id + '" aria-label="' + t("ofTStatus") + '">' + OFF_ST_ORDER.map(function (k) { return '<option value="' + k + '"' + (k === st ? " selected" : "") + ">" + t(OFF_ST[k].k) + "</option>"; }).join("") + "</select>";
  return '<div class="kb-card' + (dn ? " done" : "") + '" draggable="true" data-oa="task" data-id="' + x.id + '"><div class="kb-top"><label class="kb-pick">' + offStPill(st) + sel + '</label><span class="kb-due' + dcls + '">' + due + '</span></div><div class="kb-t">' + escapeHtml(x.title) + "</div>" +
    (x.note ? '<div class="kb-note">' + offIco("edit", 16) + "<span>" + escapeHtml(x.note) + "</span></div>" : "") +
    '<div class="kb-ft"><span class="p">' + (p ? '<i class="d" style="background:' + c + '"></i>' + escapeHtml(p.name) : escapeHtml(t("ofTNoProj"))) + "</span>" + (x.est ? "<em>~" + t("ofMin", { n: x.est }) + "</em>" : "") + "</div></div>";
}
function offBoardHtml(list, q) {
  var cut = Date.now() - 7 * 864e5, side = { hold: [], cancel: [], old: [] }, byCol = {};
  OFF_COLS.forEach(function (c) { byCol[c.key] = []; });
  list.forEach(function (x) {
    var st = offTStatus(x), col = offColOf(st);
    if (st === "hold") side.hold.push(x); else if (st === "cancel") side.cancel.push(x);
    else if (st === "done" && !q && (x.doneAt || 0) < cut && (x.doneAt || x.created || 0) < cut) side.old.push(x);
    else byCol[col].push(x);
  });
  var cols = OFF_COLS.map(function (c) {
    var items = c.key === "done" ? byCol.done.sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); }) : offTaskSorted(byCol[c.key]);
    return '<section class="kb-col" data-dropst="' + c.key + '"><div class="kb-h" style="--hc:' + c.bg + ";--ht:" + c.fg + '"><b>' + t(c.title) + '</b><span class="sub">' + t(c.sub) + '</span><span class="n">' + items.length + '</span><button type="button" class="add" data-oa="newtask" data-st="' + c.key + '" aria-label="' + t("ofColAdd") + '">' + offIco("plus", 18) + '</button></div><div class="kb-list">' + (items.map(offCardHtml).join("") || '<div class="kb-drop">' + t("ofDropHere") + "</div>") + "</div></section>";
  }).join("");
  var mini = function (x, cx) { return '<button type="button" class="kb-mini' + (cx ? " c" : "") + '" data-oa="task" data-id="' + x.id + '" draggable="true"><b>' + escapeHtml(x.title) + "</b><small>" + escapeHtml(x.note || "") + "</small></button>"; };
  var grp = function (key, tkey, arr, cx) { return '<div class="kb-grp" data-dropst="' + key + '"><div class="kb-sec">' + t(tkey) + " · " + arr.length + "</div>" + (arr.map(function (x) { return mini(x, cx); }).join("") || '<div class="kb-drop sm">' + t("ofDropHere") + "</div>") + "</div>"; };
  var sideN = side.hold.length + side.cancel.length + side.old.length;
  var aside = '<aside class="kb-side"><div class="kb-h"><b>' + t("ofColSide") + '</b><span class="sub">' + t("ofColSideS") + '</span><span class="n">' + sideN + '</span></div><div class="kb-list">' + grp("hold", "ofStHold", side.hold) + grp("cancel", "ofStCancel", side.cancel, true) +
    (side.old.length ? '<div class="kb-grp"><div class="kb-sec">' + t("ofOldDone") + " · " + side.old.length + "</div>" + side.old.sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); }).map(function (x) { return mini(x, true); }).join("") + "</div>" : "") + "</div></aside>";
  return '<div class="kb-board">' + cols + aside + "</div>";
}
function offTaskBodyHtml() {
  var all = offTasks(), today = todayStr(), q = off.q.trim();
  var base = all.filter(function (x) { return (!off.tp || x.proj === off.tp) && offQMatch(x, q); });
  if (off.tv === "board") return offBoardHtml(base, q);
  var op = base.filter(offTOpen), list;
  if (q) list = offTaskSorted(op).concat(base.filter(function (x) { return !offTOpen(x); }).sort(function (a, b) { return (b.doneAt || b.created || 0) - (a.doneAt || a.created || 0); }));
  else if (off.tf === "today") list = offTaskSorted(op.filter(function (x) { return x.due === today; }));
  else if (off.tf === "late") list = offTaskSorted(op.filter(function (x) { return x.due && x.due < today; }));
  else if (off.tf === "done") list = base.filter(function (x) { return offTStatus(x) === "done"; }).sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); });
  else if (off.tf === "arch") list = base.filter(function (x) { var s = offTStatus(x); return s === "hold" || s === "cancel"; });
  else list = offTaskSorted(op);
  var form = '<form class="of-qadd" id="offQAdd" autocomplete="off"><input type="text" id="offQT" maxlength="120" placeholder="' + escapeHtml(t("ofTAddPh")) + '"><input type="date" id="offQD" aria-label="' + t("ofTDue") + '"><button type="submit" class="btn-primary of-sm">' + offIco("plus", 18) + t("ofAddTask") + "</button></form>";
  return form + '<div class="of-tl">' + (list.map(offTaskRow).join("") || '<div class="of-empty pad">' + t("ofTNone") + "</div>") + "</div>";
}
function offTaskHtml() {
  var all = offTasks().filter(function (x) { return !off.tp || x.proj === off.tp; }), today = todayStr(), op = all.filter(offTOpen);
  var cnt = { all: op.length, today: op.filter(function (x) { return x.due === today; }).length, late: op.filter(function (x) { return x.due && x.due < today; }).length,
    done: all.filter(function (x) { return offTStatus(x) === "done"; }).length, arch: all.filter(function (x) { var s = offTStatus(x); return s === "hold" || s === "cancel"; }).length };
  var chips = off.tv === "list" ? [["all", "ofAll"], ["today", "ofToday"], ["late", "ofOverdue"], ["done", "ofDone"], ["arch", "ofArch"]].map(function (c) { return '<button type="button" class="tagb' + (off.tf === c[0] && !off.q ? " on" : "") + '" data-oa="tf" data-f="' + c[0] + '">' + t(c[1]) + " " + cnt[c[0]] + "</button>"; }).join("") : "";
  var psel = '<span class="sel-p' + (off.tp ? " on" : "") + '"><select class="field-select" id="offTP"><option value="">' + t("ofProjects") + "</option>" + offProjs().map(function (p) { return '<option value="' + p.id + '"' + (off.tp === p.id ? " selected" : "") + ">" + escapeHtml(p.name) + "</option>"; }).join("") + "</select></span>";
  var seg = '<span class="kb-seg"><button type="button" class="' + (off.tv === "list" ? "on" : "") + '" data-oa="tv" data-v="list">' + offIco("list", 18) + "<span>" + t("ofViewList") + '</span></button><button type="button" class="' + (off.tv === "board" ? "on" : "") + '" data-oa="tv" data-v="board">' + offIco("table", 18) + "<span>" + t("ofViewBoard") + "</span></button></span>";
  var search = '<input type="search" id="offQ" class="of-search" maxlength="60" placeholder="' + escapeHtml(t("ofSearch")) + '" value="' + escapeHtml(off.q) + '">';
  return '<section class="panel of-tasks' + (off.tv === "board" ? " is-board" : "") + '"><div class="ph"><i class="tg" style="background:var(--c-yellow)"></i><h2>' + t("ofTabTask") + '</h2><div class="tagrow">' + chips + '</div><div class="of-tools">' + search + psel + seg + '</div></div><div class="pb" id="offTaskBody">' + offTaskBodyHtml() + "</div></section>";
}
function offTaskRefresh() { var b = el("offTaskBody"); if (b) b.innerHTML = offTaskBodyHtml(); }

// ---- page ----
function renderOffice() {
  var body = el("officeBody"); if (!body) return;
  offLoadUiOnce();
  var tabs = [["ov", "ofTabOv"], ["time", "ofTabTime"], ["proj", "ofTabProj"], ["task", "ofTabTask"]];
  var nav = '<nav class="fin-subnav of-tabs">' + tabs.map(function (x) { return '<button type="button" class="chip' + (off.tab === x[0] ? " active" : "") + '" data-oa="tab" data-tab="' + x[0] + '"' + (off.tab === x[0] ? ' aria-current="page"' : "") + "><span>" + t(x[1]) + "</span></button>"; }).join("") + "</nav>";
  var main = off.tab === "time" ? offTimeHtml() : off.tab === "proj" ? offProjHtml() : off.tab === "task" ? offTaskHtml() : offOverviewHtml();
  var keep = body.querySelector("#offUpdText"), draft = keep ? keep.value : "", ae = document.activeElement && document.activeElement.id;
  body.innerHTML = nav + main;
  var tools = el("officeTools");
  if (tools) tools.innerHTML = off.tab === "task" ? '<button type="button" class="btn-primary" data-oa="newtask">' + offIco("plus", 22) + "<span>" + t("ofAddTask") + "</span></button>"
    : off.tab === "time" ? '<button type="button" class="btn-primary" data-oa="newsess">' + offIco("plus", 22) + "<span>" + t("ofAddSess") + "</span></button>"
    : '<button type="button" class="btn-primary" data-oa="newproj">' + offIco("plus", 22) + "<span>" + t("ofAddProj") + "</span></button>";
  var sub = el("officeSub"); if (sub) sub.textContent = t("ofSub");
  var nu = el("offUpdText"); if (nu && draft) { nu.value = draft; if (ae === "offUpdText") nu.focus(); }
}
var offUiLoaded = false;
function offLoadUiOnce() { if (!offUiLoaded) { offUiLoaded = true; offLoadUi(); } }

// ---- modals ----
function offOpenModal(html) {
  var ov = el("offOverlay"); if (!ov) return;
  el("offModal").innerHTML = html; ov.classList.add("open");
  var f = el("offModal").querySelector("input[type=text], textarea"); if (f) setTimeout(function () { f.focus(); }, 60);
}
function offCloseModal() { var ov = el("offOverlay"); if (ov) ov.classList.remove("open"); offDraft = null; }
function offModalOpen() { var ov = el("offOverlay"); return !!(ov && ov.classList.contains("open")); }
function offShell(title, inner, del, submit) {
  return '<div class="modal-header"><h2>' + escapeHtml(title) + '</h2><button class="icon-btn" type="button" data-oa="closemodal" aria-label="Close">' + offIco("close", 18) + '</button></div><form id="offForm" autocomplete="off">' + inner +
    '<div class="modal-footer">' + (del ? '<button type="button" class="btn-danger-text" data-oa="deletemodal">' + escapeHtml(del) + "</button>" : "<span></span>") +
    '<div class="footer-right"><button type="button" class="btn-secondary" data-oa="closemodal">' + t("cancelBtn") + '</button><button type="submit" class="btn-primary" style="margin-left:0;">' + escapeHtml(submit || t("saveBtn")) + "</button></div></div></form>";
}
function offColorRow(cur) {
  return '<div class="ev-colors vt-colors">' + OFF_COLORS.map(function (c, i) { return '<button type="button" class="ev-dot' + (i === cur ? " on" : "") + '" data-oa="pcol" data-i="' + i + '" style="background:' + c + '" aria-label="' + (i + 1) + '"></button>'; }).join("") + "</div>";
}
function offMsRow(m) {
  return '<div class="of-msrow"><input type="date" class="ms-d" value="' + (m.d || "") + '"><input type="text" class="ms-t" maxlength="40" placeholder="' + escapeHtml(t("ofPMsPh")) + '" value="' + escapeHtml(m.t || "") + '"><button type="button" class="icon-btn" data-oa="msdel" aria-label="delete">' + offIco("close", 16) + "</button></div>";
}
function offOpenProj(id) {
  var p = id ? offProj(id) : null, today = todayStr();
  offDraft = { type: "proj", id: id || null, color: p ? p.color || 0 : 0 };
  var inner = '<div class="form-row"><label>' + t("ofPName") + '</label><input type="text" id="opName" required maxlength="80" placeholder="' + escapeHtml(t("ofPNamePh")) + '" value="' + escapeHtml(p ? p.name : "") + '"></div>' +
    '<div class="form-row"><label>' + t("ofPColor") + "</label>" + offColorRow(offDraft.color) + "</div>" +
    '<div class="form-row-2"><div class="form-row"><label>' + t("ofPStart") + '</label><input type="date" id="opStart" value="' + (p ? p.start || "" : today) + '"></div><div class="form-row"><label>' + t("ofPDue") + '</label><input type="date" id="opDue" value="' + (p ? p.due || "" : pAdd(today, 14)) + '"></div></div>' +
    '<div class="form-row-2"><div class="form-row"><label>' + t("ofPProg") + ' <b id="opPv">' + (p ? p.progress || 0 : 0) + '%</b></label><input type="range" id="opProg" min="0" max="100" step="5" value="' + (p ? p.progress || 0 : 0) + '"></div>' +
    '<div class="form-row"><label>' + t("ofPStatus") + '</label><select id="opStatus">' + [["active", "ofActive"], ["hold", "ofHold"], ["done", "ofDone"]].map(function (s) { return '<option value="' + s[0] + '"' + ((p ? p.status || "active" : "active") === s[0] ? " selected" : "") + ">" + t(s[1]) + "</option>"; }).join("") + "</select></div></div>" +
    '<div class="form-row"><label>' + t("ofPMs") + '</label><div id="opMs">' + ((p && p.ms) || []).map(offMsRow).join("") + '</div><button type="button" class="btn-secondary of-sm" data-oa="msadd">' + offIco("plus", 16) + t("ofPMsAdd") + "</button></div>" +
    '<div class="form-row"><label>' + t("ofPNotes") + '</label><textarea id="opNotes" rows="2" maxlength="600">' + escapeHtml(p ? p.notes || "" : "") + "</textarea></div>";
  offOpenModal(offShell(t(p ? "ofPEdit" : "ofPNew"), inner, p ? t("ofPDel") : ""));
}
function offSubmitProj() {
  var name = el("opName").value.trim(); if (!name) { el("opName").focus(); return; }
  var ms = Array.prototype.map.call(el("opMs").querySelectorAll(".of-msrow"), function (r) { return { d: r.querySelector(".ms-d").value, t: r.querySelector(".ms-t").value.trim() }; }).filter(function (m) { return m.d && m.t; });
  var rec = { name: name, color: offDraft.color, start: el("opStart").value, due: el("opDue").value, progress: parseInt(el("opProg").value, 10) || 0, status: el("opStatus").value, notes: el("opNotes").value.trim(), ms: ms };
  if (rec.progress >= 100 && rec.status === "active" && confirm(t("ofPFinish"))) rec.status = "done";
  var p = offDraft.id ? offProj(offDraft.id) : null;
  if (p) {
    if (rec.progress !== (p.progress || 0)) fin.items.push({ id: uid(), kind: "oupd", proj: p.id, at: Date.now(), text: "", from: p.progress || 0, to: rec.progress });
    Object.keys(rec).forEach(function (k) { p[k] = rec[k]; });
  } else { rec.id = uid(); rec.kind = "oproj"; fin.items.push(rec); }
  finSave(); offCloseModal(); renderOffice(); showToast(t("toastUpdated"));
}
function offDeleteProj(id) {
  var p = offProj(id); if (!p) return;
  var n = fin.items.filter(function (x) { return (x.kind === "otask" || x.kind === "oupd") && x.proj === id; }).length;
  if (!confirm(t("ofPDelAsk", { n: p.name, t: n }))) return;
  fin.items = fin.items.filter(function (x) { return !(x.id === id || ((x.kind === "otask" || x.kind === "oupd") && x.proj === id)); });
  finSave(); offCloseModal(); renderOffice();
}
function offLogHtml(x) {
  var log = offEnsureLogCopy(x), now = Date.now(), rows = [], tot = {}, i;
  var segs = log.filter(function (l) { return l.type === "create" || l.type === "status"; });
  for (i = 0; i < segs.length; i++) {
    var st = segs[i].to, end = i + 1 < segs.length ? segs[i + 1].at : (st === "done" || st === "cancel" ? segs[i].at : now);
    tot[st] = (tot[st] || 0) + Math.max(0, end - segs[i].at);
  }
  var chips = OFF_ST_ORDER.filter(function (k) { return tot[k] > 60000; }).map(function (k) { return '<span class="of-lchip">' + offStPill(k, " · " + offSpan(tot[k])) + "</span>"; }).join("");
  var sorted = log.slice().sort(function (a, b) { return b.at - a.at; });
  var prevSeg = function (e) { var k = -1; segs.forEach(function (sg, j) { if (sg === e) k = j; }); return k > 0 ? segs[k - 1] : null; };
  sorted.forEach(function (e) {
    var dt = new Date(e.at), when = offDShort(dateOfStamp(e.at)) + " " + offPad(dt.getHours()) + ":" + offPad(dt.getMinutes()), title, dot = "#cbc5b3", sub = "";
    if (e.type === "create") { title = t("ofLogCreate"); dot = "#fbf8ee"; }
    else if (e.type === "status") {
      dot = OFF_ST[e.to] ? OFF_ST[e.to].bg : dot;
      title = offStPill(e.from) + '<span class="of-arr">→</span>' + offStPill(e.to);
      var pv = prevSeg(e); if (pv) sub = t("ofLogStay", { s: t(OFF_ST[e.from].k), d: offSpan(e.at - pv.at) });
    }
    else if (e.type === "due") { title = e.a && e.b ? t("ofLogDue", { a: offDShort(e.a), b: offDShort(e.b) }) : e.b ? t("ofLogDueSet", { b: offDShort(e.b) }) : t("ofLogDueClr", { a: offDShort(e.a) }); dot = "#f7c419"; }
    else if (e.type === "note") { title = t("ofLogNote"); dot = "#b8a0ea"; }
    else { title = t("ofLogCmtT"); dot = "#f48ba6"; }
    rows.push('<div class="of-le"><i class="of-ld2" style="background:' + dot + '"></i><div class="of-lx2"><div class="of-lh2">' + title + '<small>' + when + "</small></div>" + (sub ? '<div class="of-ls">' + sub + "</div>" : "") + (e.text ? '<div class="of-lt2">' + escapeHtml(e.text) + "</div>" : "") + "</div></div>");
  });
  var last = segs[segs.length - 1], cur = last && last.to !== "done" && last.to !== "cancel" ? '<div class="of-ls now">' + t("ofLogNow", { d: offSpan(now - last.at) }) + "</div>" : "";
  var age = '<div class="of-ls">' + t("ofLogAge", { d: offSpan(now - (x.created || log[0].at)) }) + "</div>";
  return '<div class="of-lsum">' + age + cur + (chips ? '<div class="of-lchips">' + chips + "</div>" : "") + '</div><div class="of-lent">' + (rows.join("") || '<div class="of-empty">' + t("ofLogNone") + "</div>") + "</div>";
}
// read-only view of the log (a legacy task without one gets a synthetic history for display only)
function offEnsureLogCopy(x) {
  if (x.log && x.log.length) return x.log;
  var tmp = { created: x.created, status: x.status, done: x.done, doneAt: x.doneAt };
  return offEnsureLog(tmp);
}
function offOpenTask(id, due, status) {
  var x = id ? fin.items.find(function (y) { return y.kind === "otask" && y.id === id; }) : null;
  offDraft = { type: "task", id: id || null };
  var cur = x ? offTStatus(x) : (status && OFF_ST[status] ? status : "todo");
  var opts = '<option value="">' + t("ofTNoProj") + "</option>" + offProjs().filter(function (p) { return p.status !== "done" || (x && x.proj === p.id); }).map(function (p) { return '<option value="' + p.id + '"' + ((x && x.proj === p.id) || (!x && off.tp === p.id) ? " selected" : "") + ">" + escapeHtml(p.name) + "</option>"; }).join("");
  var sopts = OFF_ST_ORDER.map(function (k) { return '<option value="' + k + '"' + (k === cur ? " selected" : "") + ">" + t(OFF_ST[k].k) + "</option>"; }).join("");
  var inner = '<div class="form-row"><label>' + t("ofTTitle") + '</label><input type="text" id="otTitle" required maxlength="120" placeholder="' + escapeHtml(t("ofTTitlePh")) + '" value="' + escapeHtml(x ? x.title : "") + '"></div>' +
    '<div class="form-row-2"><div class="form-row"><label>' + t("ofTStatus") + '</label><select id="otStatus">' + sopts + '</select></div><div class="form-row"><label>' + t("ofTProj") + '</label><select id="otProj">' + opts + "</select></div></div>" +
    '<div class="form-row"><label>' + t("ofTNote") + '</label><input type="text" id="otNote" maxlength="120" placeholder="' + escapeHtml(t("ofTNotePh")) + '" value="' + escapeHtml(x ? x.note || "" : "") + '"></div>' +
    '<div class="form-row-2"><div class="form-row"><label>' + t("ofTDue") + '</label><input type="date" id="otDue" value="' + (x ? x.due || "" : due || "") + '"></div><div class="form-row"><label>' + t("ofTEst") + '</label><input type="number" id="otEst" min="0" max="1440" step="5" value="' + (x && x.est ? x.est : "") + '"></div></div>' +
    (x ? '<div class="of-logbox"><h4>' + t("ofLogT") + '</h4><div class="of-cmt"><input type="text" id="otCmt" maxlength="200" placeholder="' + escapeHtml(t("ofLogCmtPh")) + '"><button type="button" class="of-add" data-oa="tcmt">' + t("ofLogAdd") + '</button></div><div id="otLog">' + offLogHtml(x) + "</div></div>" : "");
  offOpenModal(offShell(t(x ? "ofTEdit" : "ofTNew"), inner, x ? t("ofTDel") : ""));
}
function offSubmitTask() {
  var title = el("otTitle").value.trim(); if (!title) { el("otTitle").focus(); return; }
  var rec = { title: title, proj: el("otProj").value, due: el("otDue").value, est: parseInt(el("otEst").value, 10) || 0 }, st = el("otStatus").value, note = el("otNote").value.trim();
  var x = offDraft.id ? fin.items.find(function (y) { return y.kind === "otask" && y.id === offDraft.id; }) : null, now = Date.now();
  if (x) {
    offEnsureLog(x);
    if ((x.due || "") !== rec.due) x.log.push({ at: now, type: "due", a: x.due || "", b: rec.due });
    var statusChanged = offTStatus(x) !== st;
    if (statusChanged) offSetStatus(x, st, note);
    else if ((x.note || "") !== note) x.log.push({ at: now, type: "note", text: note });
    Object.keys(rec).forEach(function (k) { x[k] = rec[k]; }); x.note = note;
  } else {
    rec.id = uid(); rec.kind = "otask"; rec.status = st; rec.done = st === "done"; rec.doneAt = rec.done ? now : 0; rec.note = note; rec.created = now;
    rec.log = [{ at: now, type: "create", to: st, text: note }]; fin.items.push(rec);
  }
  finSave(); offCloseModal(); renderOffice();
}
function offOpenSess(id, date) {
  var s = id ? fin.items.find(function (y) { return y.kind === "osess" && y.id === id; }) : null;
  offDraft = { type: "sess", id: id || null };
  var inner = '<div class="form-row-2"><div class="form-row"><label>' + t("ofSDate") + '</label><input type="date" id="osDate" value="' + (s ? s.date : date || todayStr()) + '"></div><div class="form-row"><label>' + t("ofSType") + '</label><select id="osType"><option value="work"' + (!s || s.type === "work" ? " selected" : "") + ">" + t("ofWork") + '</option><option value="break"' + (s && s.type === "break" ? " selected" : "") + ">" + t("ofBreakT") + "</option></select></div></div>" +
    '<div class="form-row-2"><div class="form-row"><label>' + t("ofSStart") + '</label><input type="time" id="osStart" required value="' + (s ? s.start : "09:00") + '"></div><div class="form-row"><label>' + t("ofSEnd") + '</label><input type="time" id="osEnd" value="' + (s ? s.end : "") + '"></div></div>' +
    '<div class="form-row"><label>' + t("ofSNote") + '</label><input type="text" id="osNote" maxlength="60" placeholder="' + escapeHtml(t("ofSNotePh")) + '" value="' + escapeHtml(s ? s.note || "" : "") + '"></div>';
  offOpenModal(offShell(t(s ? "ofSEdit" : "ofSNew"), inner, s ? t("ofSDel") : ""));
}
function offSubmitSess() {
  var st = el("osStart").value, en = el("osEnd").value; if (!st) { el("osStart").focus(); return; }
  var cross = false;
  if (en && offHM(en) <= offHM(st)) {
    if (offHM(en) === offHM(st)) { alert(t("ofSBad")); return; }
    if (!confirm(t("ofSCross"))) return;
    cross = true;
  }
  var rec = { date: el("osDate").value || todayStr(), start: st, end: cross ? "24:00" : en, type: el("osType").value, note: el("osNote").value.trim() };
  var s = offDraft.id ? fin.items.find(function (y) { return y.kind === "osess" && y.id === offDraft.id; }) : null;
  if (s) Object.keys(rec).forEach(function (k) { s[k] = rec[k]; }); else { rec.id = uid(); rec.kind = "osess"; fin.items.push(rec); }
  if (cross) fin.items.push({ id: uid(), kind: "osess", date: pAdd(rec.date, 1), start: "00:00", end: en, type: rec.type, note: rec.note });
  finSave(); offCloseModal(); renderOffice();
}
function offOpenGoal() {
  var s = offSet(); offDraft = { type: "goal" };
  offOpenModal(offShell(t("ofGoalTitle"), '<div class="form-row-2"><div class="form-row"><label>' + t("ofGoalDay") + '</label><input type="number" id="ogDay" min="1" max="24" step="0.5" value="' + s.day + '"></div><div class="form-row"><label>' + t("ofGoalWeek") + '</label><input type="number" id="ogWeek" min="1" max="168" step="1" value="' + s.week + '"></div></div>'));
}
function offSubmitGoal() {
  var day = parseFloat(el("ogDay").value) || 8, week = parseFloat(el("ogWeek").value) || 40;
  var s = fin.items.find(function (x) { return x.kind === "oset"; });
  if (s) { s.day = day; s.week = week; } else fin.items.push({ id: "oset", kind: "oset", day: day, week: week });
  finSave(); offCloseModal(); renderOffice();
}
function offOpenUpd(pid) {
  var p = offProj(pid); if (!p) return;
  offDraft = { type: "upd", id: pid };
  var inner = '<div class="form-row"><label>' + t("ofUText") + '</label><input type="text" id="ouText" maxlength="160" placeholder="' + escapeHtml(t("ofUTextPh")) + '"></div><div class="form-row"><label>' + t("ofPProg") + ' <b id="opPv">' + (p.progress || 0) + '%</b></label><input type="range" id="ouProg" min="0" max="100" step="5" value="' + (p.progress || 0) + '"></div>';
  offOpenModal(offShell(t("ofUTitle") + " · " + p.name, inner));
}
function offSubmitUpd() {
  var p = offProj(offDraft.id); if (!p) return;
  var text = el("ouText").value.trim(), to = parseInt(el("ouProg").value, 10) || 0, from = p.progress || 0;
  if (!text && to === from) { el("ouText").focus(); return; }
  fin.items.push({ id: uid(), kind: "oupd", proj: p.id, at: Date.now(), text: text, from: from, to: to });
  p.progress = to;
  if (to >= 100 && p.status === "active" && confirm(t("ofPFinish"))) p.status = "done";
  finSave(); offCloseModal(); renderOffice();
}

// ---- events ----
function offAction(a, node, e) {
  var id = node ? node.getAttribute("data-id") : "";
  if (a === "tab") { off.tab = node.getAttribute("data-tab"); offSaveUi(); renderOffice(); }
  else if (a === "clock") offClock(node.getAttribute("data-act"));
  else if (a === "sw") { off.sw += parseInt(node.getAttribute("data-d"), 10); renderOffice(); }
  else if (a === "gw") { off.gw += parseInt(node.getAttribute("data-d"), 10); renderOffice(); }
  else if (a === "stalecut") {
    var ss = fin.items.find(function (y) { return y.id === id; }), ev = el("offStaleEnd") && el("offStaleEnd").value;
    if (!ss || !ev) return;
    if (offHM(ev) <= offHM(ss.start)) { alert(t("ofSBad")); return; }
    ss.end = ev; finSave(); renderOffice();
  }
  else if (a === "staleroll") { var sr = fin.items.find(function (y) { return y.id === id; }); if (sr) { offRoll(sr); renderOffice(); } }
  else if (a === "sess") offOpenSess(id);
  else if (a === "newsess") offOpenSess(null);
  else if (a === "goal") offOpenGoal();
  else if (a === "proj") offOpenProj(id);
  else if (a === "newproj") offOpenProj(null);
  else if (a === "upd") offOpenUpd(id);
  else if (a === "task") { if (e && e.target.closest("[data-oa=tdone],[data-oa=tundo]")) return; offOpenTask(id); }
  else if (a === "newtask") offOpenTask(null, "", node.getAttribute("data-st") || "");
  else if (a === "tdone" || a === "tundo") {
    var x = fin.items.find(function (y) { return y.kind === "otask" && y.id === id; });
    if (x) {
      var back = "todo";
      if (a === "tundo" && x.log) for (var li = x.log.length - 1; li >= 0; li--) if (x.log[li].type === "status" && x.log[li].to === "done") { back = x.log[li].from && x.log[li].from !== "done" ? x.log[li].from : "todo"; break; }
      offSetStatus(x, a === "tdone" ? "done" : back); finSave(); renderOffice();
    }
  }
  else if (a === "tv") { off.tv = node.getAttribute("data-v"); offSaveUi(); renderOffice(); }
  else if (a === "tcmt") {
    var cx = fin.items.find(function (y) { return y.kind === "otask" && y.id === (offDraft && offDraft.id); }), ci = el("otCmt");
    if (cx && ci && ci.value.trim()) { offEnsureLog(cx); cx.log.push({ at: Date.now(), type: "comment", text: ci.value.trim() }); finSave(); ci.value = ""; el("otLog").innerHTML = offLogHtml(cx); }
  }
  else if (a === "tf") { off.tf = node.getAttribute("data-f"); renderOffice(); }
  else if (a === "updel") { fin.items = fin.items.filter(function (y) { return y.id !== id; }); finSave(); renderOffice(); }
  else if (a === "closemodal") offCloseModal();
  else if (a === "deletemodal") {
    if (!offDraft || !offDraft.id) return;
    if (offDraft.type === "proj") offDeleteProj(offDraft.id);
    else if (confirm(t("ofDelAsk"))) { var did = offDraft.id; fin.items = fin.items.filter(function (y) { return y.id !== did; }); finSave(); offCloseModal(); renderOffice(); }
  }
  else if (a === "pcol") {
    offDraft.color = parseInt(node.getAttribute("data-i"), 10);
    Array.prototype.forEach.call(el("offModal").querySelectorAll("[data-oa=pcol]"), function (b, i) { b.classList.toggle("on", i === offDraft.color); });
  }
  else if (a === "msadd") { el("opMs").insertAdjacentHTML("beforeend", offMsRow({ d: el("opDue").value || todayStr(), t: "" })); var rows = el("opMs").querySelectorAll(".ms-t"); rows[rows.length - 1].focus(); }
  else if (a === "msdel") node.closest(".of-msrow").remove();
}
function initOffice() {
  var ov = document.createElement("div");
  ov.className = "modal-overlay"; ov.id = "offOverlay";
  ov.innerHTML = '<div class="modal vt-modal" id="offModal"></div>';
  document.body.appendChild(ov);
  var click = function (e) {
    if (e.target.closest("[data-tst]")) return;
    var n = e.target.closest("[data-oa]"); if (!n) { if (e.target === ov) offCloseModal(); return; }
    if (n.getAttribute("data-oa") === "task" && e.target.closest(".of-chk, .of-ck")) return;
    e.preventDefault(); offAction(n.getAttribute("data-oa"), n, e);
  };
  ov.addEventListener("click", click);
  ov.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!offDraft) return;
    ({ proj: offSubmitProj, task: offSubmitTask, sess: offSubmitSess, goal: offSubmitGoal, upd: offSubmitUpd }[offDraft.type] || function () {})();
  });
  ov.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.id === "otCmt") { e.preventDefault(); offAction("tcmt", e.target, e); } });
  ov.addEventListener("input", function (e) {
    if (e.target.id === "opProg" || e.target.id === "ouProg") { var v = el("opPv"); if (v) v.textContent = e.target.value + "%"; }
  });
  var page = el("page-office"); if (!page) return;
  page.addEventListener("click", click);
  page.addEventListener("change", function (e) {
    if (e.target.id === "offTP") { off.tp = e.target.value; renderOffice(); }
    if (e.target.hasAttribute && e.target.hasAttribute("data-tst")) {
      var tx2 = fin.items.find(function (y) { return y.kind === "otask" && y.id === e.target.getAttribute("data-tst"); });
      if (tx2) { offSetStatus(tx2, e.target.value); finSave(); renderOffice(); }
    }
    if (e.target.id === "offUpdProj") off.updProj = e.target.value;
  });
  page.addEventListener("input", function (e) { if (e.target.id === "offQ") { off.q = e.target.value; offTaskRefresh(); } });
  // drag a task card onto another column (or the archive groups) to change its status
  page.addEventListener("dragstart", function (e) {
    var c = e.target.closest ? e.target.closest("[data-oa=task][draggable]") : null; if (!c) return;
    e.dataTransfer.setData("text/plain", "task:" + c.getAttribute("data-id")); e.dataTransfer.effectAllowed = "move"; c.classList.add("drag");
  });
  page.addEventListener("dragend", function (e) { var c = e.target.closest ? e.target.closest(".drag") : null; if (c) c.classList.remove("drag"); Array.prototype.forEach.call(page.querySelectorAll(".dropping"), function (z) { z.classList.remove("dropping"); }); });
  page.addEventListener("dragover", function (e) { var z = e.target.closest("[data-dropst]"); if (!z) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; Array.prototype.forEach.call(page.querySelectorAll(".dropping"), function (o) { if (o !== z) o.classList.remove("dropping"); }); z.classList.add("dropping"); });
  page.addEventListener("drop", function (e) {
    var z = e.target.closest("[data-dropst]"); if (!z) return; e.preventDefault(); z.classList.remove("dropping");
    var v = e.dataTransfer.getData("text/plain") || ""; if (v.indexOf("task:") !== 0) return;
    var x = fin.items.find(function (y) { return y.kind === "otask" && y.id === v.slice(5); }), to = z.getAttribute("data-dropst");
    if (x && offColOf(offTStatus(x)) !== to) { offSetStatus(x, to); finSave(); renderOffice(); }
  });
  page.addEventListener("submit", function (e) {
    e.preventDefault();
    if (e.target.id === "offUpdForm") {
      var tx = el("offUpdText").value.trim(), sel = el("offUpdProj"); if (!tx || !sel) return;
      var p = offProj(sel.value); if (!p) return; off.updProj = p.id;
      fin.items.push({ id: uid(), kind: "oupd", proj: p.id, at: Date.now(), text: tx, from: p.progress || 0, to: p.progress || 0 });
      finSave(); renderOffice();
    } else if (e.target.id === "offQAdd") {
      var tt = el("offQT").value.trim(); if (!tt) { el("offQT").focus(); return; }
      var nowq = Date.now();
      fin.items.push({ id: uid(), kind: "otask", title: tt, proj: off.tp || "", due: el("offQD").value, est: 0, done: false, status: "todo", note: "", doneAt: 0, created: nowq, log: [{ at: nowq, type: "create", to: "todo", text: "" }] });
      finSave(); renderOffice(); var q = el("offQT"); if (q) q.focus();
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && offModalOpen()) offCloseModal(); });
  // keep the live clock fresh while the page is open; if the app stays open past midnight, carry the running session over
  setInterval(function () {
    var today = todayStr(), rolled = false;
    offSessAll().forEach(function (x) { if (!x.end && x.date < today && x.date >= offBootDay && pDiff(x.date, today) === 1) { offRoll(x); rolled = true; } });
    if (currentPageId !== "office" || offModalOpen() || (!rolled && !offOpen())) return;
    var a = document.activeElement; if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && el("officeBody").contains(a)) return;
    renderOffice();
  }, 20000);
}
