"use strict";
// ---------- Schedule ("ตาราง"): week / month / list planner for appointments ----------
// Events are stored beside the finance records (kind "evt") so they persist and sync the same way.
// evt: { kind:"evt", title, date "YYYY-MM-DD", start "HH:MM" | "", end "HH:MM" | "", repeat "" | "daily" | "weekly" | "monthly", color 0-5, note }
// Payments that fall due (orders with a balance + credit-card due days) are shown too, read-only, as red flags.

var planView = { mode: "week", anchor: todayStr(), sel: todayStr() };
var evtDraft = { id: null, color: 0, allDay: false };
var PLAN_COLORS = 6;
var PLAN_HOUR_PX = 48;
var PLAN_LIST_DAYS = 60;

// ---- date helpers ----
function pDate(s) { return new Date(s + "T00:00:00"); }
function pFmt(d) { return dateOfStamp(d.getTime()); }
function pAdd(s, n) { var d = pDate(s); d.setDate(d.getDate() + n); return pFmt(d); }
function pDiff(a, b) { return Math.round((Date.UTC.apply(null, pParts(b)) - Date.UTC.apply(null, pParts(a))) / 86400000); }
function pParts(s) { var p = s.split("-"); return [+p[0], +p[1] - 1, +p[2]]; }
function pWeekStart(s) { var d = pDate(s), wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return pFmt(d); }   // Monday first
function pMin(hhmm) { if (!hhmm) return null; var p = hhmm.split(":"); return (+p[0]) * 60 + (+p[1] || 0); }
function pHM(min) { return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0"); }
function pWeekday(s, style) { return pDate(s).toLocaleDateString(I18N[state.lang].locale, { weekday: style || "short" }); }

// ---- data ----
function finEvts() { return fin.items.filter(function (x) { return x.kind === "evt"; }); }
function evtOccursOn(e, ds) {
  if (!e.date || ds < e.date) return false;
  if (e.date === ds) return true;
  if (e.repeat === "daily") return true;
  if (e.repeat === "weekly") return pDiff(e.date, ds) % 7 === 0;
  if (e.repeat === "monthly") return e.date.slice(8, 10) === ds.slice(8, 10);
  return false;
}
// payments falling due (read-only): { date, label, amount, orderId | acctId }
function planDues() {
  var out = [];
  activeOrders().forEach(function (o) {
    var rem = remainingOf(o);
    if (rem > 0 && o.dueDate) out.push({ date: o.dueDate, label: t("planDuePay", { name: o.productName || t("noName"), n: money(rem) }), orderId: o.id });
  });
  finAccts().forEach(function (a) {
    if (a.type !== "card" || !a.due) return;
    var owed = finCardOwed(a);
    if (owed > 0) out.push({ date: nextDayOfMonth(parseInt(a.due, 10)), label: t("planDueCard", { name: a.name, n: money(owed) }), acctId: a.id });
  });
  return out;
}
// everything on one day: { all: [...], timed: [...] } (timed sorted by start)
function planDay(ds, dues) {
  var all = [], timed = [];
  finEvts().forEach(function (e) {
    if (!evtOccursOn(e, ds)) return;
    var s = pMin(e.start), en = pMin(e.end);
    if (s == null) { all.push({ e: e, date: ds }); return; }
    if (en == null || en <= s) en = Math.min(24 * 60, s + 60);
    timed.push({ e: e, date: ds, s: s, en: en });
  });
  timed.sort(function (a, b) { return a.s - b.s || a.en - b.en; });
  var d = (dues || planDues()).filter(function (x) { return x.date === ds; });
  return { all: all, timed: timed, dues: d };
}

// ---- rendering ----
function planNavHtml(label) {
  var now = planView.mode === "list" ? "" : '<button type="button" class="chip" data-plan-today="1">' + escapeHtml(t("planToday")) + "</button>";
  var arrows = planView.mode === "list" ? "" : '<button type="button" class="icon-toggle" data-plan-nav="-1" aria-label="' + escapeHtml(t("finPrevMonth")) + '">' + svgIcon("chev-l") + "</button>" +
    '<button type="button" class="icon-toggle" data-plan-nav="1" aria-label="' + escapeHtml(t("finNextMonth")) + '">' + svgIcon("chev-r") + "</button>";
  var seg = ["week", "month", "list"].map(function (m) {
    return '<button type="button" class="chip' + (planView.mode === m ? " active" : "") + '" data-plan-mode="' + m + '">' + escapeHtml(t("plan" + m.charAt(0).toUpperCase() + m.slice(1))) + "</button>";
  }).join("");
  return '<div class="pl-bar"><div class="pl-seg">' + seg + '</div><div class="pl-nav">' + arrows + now + "</div><b class=\"pl-range\">" + escapeHtml(label) + "</b></div>";
}
function planDueChip(d) {
  return '<button type="button" class="pl-due" data-plan-due="' + (d.orderId ? "o:" + d.orderId : "a:" + d.acctId) + '">' + svgIcon("flag") + "<span>" + escapeHtml(d.label) + "</span></button>";
}
function planEvChip(it) {
  var e = it.e;
  return '<button type="button" class="pl-chip c' + (e.color | 0) + '" data-plan-evt="' + e.id + '" data-plan-date="' + it.date + '"><span>' + escapeHtml(e.title) + "</span></button>";
}

// lay overlapping timed events out side by side
function planLanes(items) {
  var cluster = [], clusterEnd = 0, out = [];
  function flush() {
    var lanes = [];
    cluster.forEach(function (it) {
      var lane = 0;
      while (lanes[lane] != null && lanes[lane] > it.s) lane++;
      lanes[lane] = it.en; it.lane = lane;
    });
    cluster.forEach(function (it) { it.lanes = lanes.length; out.push(it); });
    cluster = []; clusterEnd = 0;
  }
  items.forEach(function (it) {
    if (cluster.length && it.s >= clusterEnd) flush();
    cluster.push(it); clusterEnd = Math.max(clusterEnd, it.en);
  });
  if (cluster.length) flush();
  return out;
}

function planWeekHtml() {
  var start = pWeekStart(planView.anchor), today = todayStr(), dues = planDues();
  var days = []; for (var i = 0; i < 7; i++) days.push(pAdd(start, i));
  var data = days.map(function (d) { return planDay(d, dues); });
  var minH = 8, maxH = 18;
  data.forEach(function (x) { x.timed.forEach(function (it) { minH = Math.min(minH, Math.floor(it.s / 60)); maxH = Math.max(maxH, Math.ceil(it.en / 60)); }); });
  var hours = maxH - minH, hh = PLAN_HOUR_PX;
  var head = '<div class="pl-corner"></div>' + days.map(function (d, i) {
    return '<div class="pl-dh' + (d === today ? " today" : "") + '"><small>' + escapeHtml(pWeekday(d)) + "</small><b>" + pDate(d).getDate() + "</b></div>";
  }).join("");
  var allRow = '<div class="pl-corner"></div>' + days.map(function (d, i) {
    return '<div class="pl-allcell' + (d === today ? " today" : "") + '" data-plan-newday="' + d + '">' + data[i].dues.map(planDueChip).join("") + data[i].all.map(planEvChip).join("") + "</div>";
  }).join("");
  var labels = ""; for (var h = minH; h < maxH; h++) labels += '<span style="height:' + hh + 'px">' + pHM(h * 60) + "</span>";
  var cols = days.map(function (d, i) {
    var items = planLanes(data[i].timed).map(function (it) {
      var top = (it.s - minH * 60) / 60 * hh, ht = Math.max(22, (it.en - it.s) / 60 * hh - 2);
      var w = 100 / it.lanes;
      return '<button type="button" class="pl-ev c' + (it.e.color | 0) + '" data-plan-evt="' + it.e.id + '" data-plan-date="' + d + '" style="top:' + top + "px;height:" + ht + "px;left:calc(" + (it.lane * w) + "% + 2px);width:calc(" + w + '% - 4px)">' +
        "<b>" + escapeHtml(it.e.title) + "</b><small>" + pHM(it.s) + "</small></button>";
    }).join("");
    var nowLine = "";
    if (d === today) {
      var nm = new Date(); var mins = nm.getHours() * 60 + nm.getMinutes();
      if (mins >= minH * 60 && mins <= maxH * 60) nowLine = '<i class="pl-now" style="top:' + ((mins - minH * 60) / 60 * hh) + 'px"></i>';
    }
    return '<div class="pl-col' + (d === today ? " today" : "") + '" data-plan-col="' + d + '" data-minh="' + minH + '" style="height:' + hours * hh + 'px;--hh:' + hh + 'px">' + items + nowLine + "</div>";
  }).join("");
  var label = shortDate(days[0]) + " – " + shortDate(days[6]);
  return planNavHtml(label) + '<div class="pl-week"><div class="pl-grid pl-head">' + head + '</div><div class="pl-grid pl-allrow">' + allRow +
    '</div><div class="pl-grid pl-body"><div class="pl-hours">' + labels + "</div>" + cols + "</div></div>" + planDayViewHtml(days);
}

// phones: a strip of the week's days + the chosen day as an agenda
function planAgendaHtml(ds) {
  var x = planDay(ds), rows = "";
  x.dues.forEach(function (d) { rows += '<div class="pl-arow">' + '<span class="tm"></span>' + planDueChip(d) + "</div>"; });
  x.all.forEach(function (it) { rows += '<button type="button" class="pl-arow c' + (it.e.color | 0) + '" data-plan-evt="' + it.e.id + '" data-plan-date="' + ds + '"><span class="tm">' + escapeHtml(t("planAllDay")) + '</span><span class="tt"><b>' + escapeHtml(it.e.title) + "</b>" + (it.e.note ? "<small>" + escapeHtml(it.e.note) + "</small>" : "") + "</span></button>"; });
  x.timed.forEach(function (it) { rows += '<button type="button" class="pl-arow c' + (it.e.color | 0) + '" data-plan-evt="' + it.e.id + '" data-plan-date="' + ds + '"><span class="tm">' + pHM(it.s) + '</span><span class="tt"><b>' + escapeHtml(it.e.title) + "</b><small>" + pHM(it.s) + " – " + pHM(it.en) + (it.e.note ? " · " + escapeHtml(it.e.note) : "") + "</small></span></button>"; });
  if (!rows) rows = '<div class="hempty">' + escapeHtml(t("planNothing")) + "</div>";
  return '<div class="pl-agenda-h">' + escapeHtml(formatDateLong(ds)) + '<button type="button" class="btn-ghost-sm" data-plan-newday="' + ds + '">' + svgIcon("plus") + "<span>" + escapeHtml(t("planAdd")) + "</span></button></div>" + rows;
}
function planDayViewHtml(days) {
  var dues = planDues(), today = todayStr();
  if (days.indexOf(planView.sel) === -1) planView.sel = days.indexOf(today) !== -1 ? today : days[0];
  var strip = days.map(function (d) {
    var x = planDay(d, dues), has = x.all.length + x.timed.length + x.dues.length > 0;
    return '<button type="button" class="pl-dchip' + (d === planView.sel ? " on" : "") + (d === today ? " today" : "") + '" data-plan-sel="' + d + '"><small>' + escapeHtml(pWeekday(d)) + "</small><b>" + pDate(d).getDate() + "</b><i" + (has ? ' class="has"' : "") + "></i></button>";
  }).join("");
  return '<div class="pl-dayview"><div class="pl-strip">' + strip + '</div><div class="pl-agenda">' + planAgendaHtml(planView.sel) + "</div></div>";
}

function planMonthHtml() {
  var key = planView.anchor.slice(0, 7), first = key + "-01", start = pWeekStart(first), today = todayStr(), dues = planDues();
  var dim = new Date(+key.slice(0, 4), +key.slice(5, 7), 0).getDate();
  var weeks = Math.ceil((pDiff(start, first) + dim) / 7), cells = "";
  var head = ""; for (var w = 0; w < 7; w++) head += "<div>" + escapeHtml(pWeekday(pAdd(start, w))) + "</div>";
  for (var i = 0; i < weeks * 7; i++) {
    var d = pAdd(start, i), x = planDay(d, dues), out = d.slice(0, 7) !== key;
    var items = x.dues.map(function (u) { return planDueChip(u); }).concat(x.all.map(planEvChip), x.timed.map(function (it) {
      return '<button type="button" class="pl-chip c' + (it.e.color | 0) + '" data-plan-evt="' + it.e.id + '" data-plan-date="' + d + '"><em>' + pHM(it.s) + "</em><span>" + escapeHtml(it.e.title) + "</span></button>";
    }));
    var shown = items.slice(0, 3), more = items.length - shown.length;
    var dots = items.slice(0, 4).map(function () { return "<i></i>"; }).join("");
    cells += '<div class="pl-mc' + (out ? " out" : "") + (d === today ? " today" : "") + (d === planView.sel ? " sel" : "") + '" data-plan-sel="' + d + '" data-plan-newday="' + d + '"><b>' + pDate(d).getDate() + "</b>" + shown.join("") +
      (more > 0 ? '<span class="pl-more">' + escapeHtml(t("planMore", { n: more })) + "</span>" : "") + '<span class="pl-dots">' + dots + "</span></div>";
  }
  return planNavHtml(monthLabelOf(key)) + '<div class="pl-month"><div class="pl-mh">' + head + '</div><div class="pl-mg">' + cells + '</div></div><div class="pl-agenda pl-agenda-m">' + planAgendaHtml(planView.sel) + "</div>";
}

function planListHtml() {
  var today = todayStr(), dues = planDues(), html = "", n = 0;
  for (var i = 0; i < PLAN_LIST_DAYS; i++) {
    var d = pAdd(today, i), x = planDay(d, dues);
    if (!(x.all.length + x.timed.length + x.dues.length)) continue;
    n++;
    html += '<div class="fin-day"><span>' + escapeHtml(i === 0 ? t("planToday") + " · " + formatDateLong(d) : formatDateLong(d)) + "</span><span></span></div>" +
      '<div class="box fin-box pl-listbox">' + x.dues.map(function (u) { return '<div class="pl-lrow">' + '<span class="tm"></span>' + planDueChip(u) + "</div>"; }).join("") +
      x.all.map(function (it) { return planListRow(it, t("planAllDay"), d); }).join("") +
      x.timed.map(function (it) { return planListRow(it, pHM(it.s) + " – " + pHM(it.en), d); }).join("") + "</div>";
  }
  if (!n) html = '<div class="hempty wide">' + escapeHtml(t("planNothingList")) + "</div>";
  return planNavHtml(t("planListRange", { n: PLAN_LIST_DAYS })) + '<div class="pl-list">' + html + "</div>";
}
function planListRow(it, time, d) {
  return '<button type="button" class="pl-lrow c' + (it.e.color | 0) + '" data-plan-evt="' + it.e.id + '" data-plan-date="' + d + '"><span class="tm">' + escapeHtml(time) + '</span><i class="bar"></i><span class="tt"><b>' + escapeHtml(it.e.title) + "</b>" + (it.e.note ? "<small>" + escapeHtml(it.e.note) + "</small>" : "") + "</span></button>";
}

function renderPlanner() {
  var box = el("planBody"), tools = el("planTools");
  if (!fin.loaded) { box.innerHTML = ""; tools.innerHTML = ""; return; }
  tools.innerHTML = '<div class="fin-addbtns"><button type="button" class="btn-primary" data-plan-new="1">' + svgIcon("plus") + "<span>" + escapeHtml(t("planAdd")) + "</span></button></div>";
  box.innerHTML = planView.mode === "month" ? planMonthHtml() : planView.mode === "list" ? planListHtml() : planWeekHtml();
}

// ---- event modal ----
function renderEvtColors() {
  var h = ""; for (var i = 0; i < PLAN_COLORS; i++) h += '<button type="button" class="ev-dot c' + i + (i === evtDraft.color ? " on" : "") + '" data-evtcolor="' + i + '" aria-label="' + (i + 1) + '"></button>';
  el("evtColors").innerHTML = h;
}
function setEvtAllDay(on) {
  evtDraft.allDay = on;
  el("fEvtAllDay").checked = on;
  el("evtTimes").hidden = on;
}
function openEvtModal(id, date, hour) {
  var e = id ? finEvts().filter(function (x) { return x.id === id; })[0] : null;
  evtDraft.id = e ? e.id : null;
  evtDraft.color = e ? (e.color | 0) : 0;
  el("evtModalTitle").textContent = t(e ? "planEdit" : "planNew");
  el("fEvtTitle").value = e ? e.title : "";
  el("fEvtDate").value = e ? e.date : (date || todayStr());
  var s = e ? e.start : (hour != null ? pHM(hour * 60) : "09:00"), en = e ? e.end : (hour != null ? pHM(Math.min(23, hour + 1) * 60) : "10:00");
  el("fEvtStart").value = s || "09:00"; el("fEvtEnd").value = en || "";
  setEvtAllDay(e ? !e.start : false);
  el("fEvtRepeat").value = e ? (e.repeat || "") : "";
  el("fEvtNote").value = e ? (e.note || "") : "";
  el("btnEvtDelete").style.display = e ? "inline-block" : "none";
  renderEvtColors();
  el("evtModalOverlay").classList.add("open");
  el("fEvtTitle").focus();
}
function closeEvtModal() { el("evtModalOverlay").classList.remove("open"); }
function submitEvt(e) {
  e.preventDefault();
  var title = el("fEvtTitle").value.trim();
  if (!title) { el("fEvtTitle").focus(); return; }
  var date = el("fEvtDate").value || todayStr(), all = evtDraft.allDay;
  var start = all ? "" : (el("fEvtStart").value || "09:00"), end = all ? "" : el("fEvtEnd").value;
  if (end && pMin(end) <= pMin(start)) end = "";
  var rec = { id: evtDraft.id || uid(), kind: "evt", title: title, date: date, start: start, end: end, repeat: el("fEvtRepeat").value, color: evtDraft.color, note: el("fEvtNote").value.trim() };
  var i = fin.items.findIndex(function (x) { return x.id === rec.id; });
  if (i >= 0) fin.items[i] = rec; else fin.items.push(rec);
  planView.anchor = date; planView.sel = date;
  finSave(); closeEvtModal(); finRenderAll();
  showToast(t(i >= 0 ? "toastUpdated" : "finAdded"));
}
function deleteEvt() {
  if (!evtDraft.id || !confirm(t("planDeleteConfirm"))) return;
  fin.items = fin.items.filter(function (x) { return x.id !== evtDraft.id; });
  finSave(); closeEvtModal(); finRenderAll();
}

// ---- clicks ----
function planClick(e) {
  var b;
  if ((b = e.target.closest("[data-plan-new]"))) { openEvtModal(null, planView.sel); return; }
  if ((b = e.target.closest("[data-plan-mode]"))) { planView.mode = b.getAttribute("data-plan-mode"); renderPlanner(); return; }
  if ((b = e.target.closest("[data-plan-today]"))) { planView.anchor = planView.sel = todayStr(); renderPlanner(); return; }
  if ((b = e.target.closest("[data-plan-nav]"))) {
    var dir = parseInt(b.getAttribute("data-plan-nav"), 10);
    if (planView.mode === "month") { var m = shiftMonthKey(planView.anchor.slice(0, 7), dir); planView.anchor = m + "-01"; planView.sel = planView.anchor; }
    else { planView.anchor = pAdd(planView.anchor, 7 * dir); planView.sel = pAdd(planView.sel, 7 * dir); }
    renderPlanner(); return;
  }
  if ((b = e.target.closest("[data-plan-due]"))) {
    var v = b.getAttribute("data-plan-due");
    if (v.charAt(0) === "o") openDetailModal(v.slice(2)); else { accView.sel = v.slice(2); navigate("fin-acc"); }
    return;
  }
  if ((b = e.target.closest("[data-plan-evt]"))) { openEvtModal(b.getAttribute("data-plan-evt")); return; }
  if ((b = e.target.closest("[data-plan-col]")) && !e.target.closest("[data-plan-evt]")) {
    var r = b.getBoundingClientRect(), hour = Math.floor((e.clientY - r.top) / PLAN_HOUR_PX) + parseInt(b.getAttribute("data-minh"), 10);
    openEvtModal(null, b.getAttribute("data-plan-col"), Math.max(0, Math.min(22, hour))); return;
  }
  if ((b = e.target.closest(".pl-add, [data-plan-newday].btn-ghost-sm, .pl-allcell[data-plan-newday]"))) { openEvtModal(null, b.getAttribute("data-plan-newday")); return; }
  if ((b = e.target.closest("[data-plan-sel]"))) {
    var d = b.getAttribute("data-plan-sel"), wasSel = planView.sel === d;
    planView.sel = d;
    if (planView.mode === "month" && window.matchMedia("(min-width: 761px)").matches) { openEvtModal(null, d); return; }
    renderPlanner(); return;
  }
}

// ---- Home (left page of the notebook): week strip + today / tomorrow / this week ----
function planWeekStripHtml() {
  var today = todayStr(), ws = pWeekStart(today), h = "";
  for (var i = 0; i < 7; i++) {
    var d = pAdd(ws, i), x = planDay(d, []), n = x.all.length + x.timed.length;
    h += '<button type="button" class="bk-wd' + (d === today ? " t" : "") + '" data-plan-go="' + d + '"><span>' + escapeHtml(pWeekday(d)) + "</span><b>" + pDate(d).getDate() + "</b><i>" + new Array(Math.min(n, 3) + 1).join("<em></em>") + "</i></button>";
  }
  return '<div class="bk-wk">' + h + "</div>";
}
function planHomeItems() {
  var today = todayStr(), out = [];
  for (var i = 0; i < 14 && out.length < 12; i++) {
    var d = pAdd(today, i), x = planDay(d, []);
    x.all.forEach(function (it) { out.push({ date: d, s: null, title: it.e.title, color: it.e.color | 0 }); });
    x.timed.forEach(function (it) { out.push({ date: d, s: it.s, en: it.en, title: it.e.title, color: it.e.color | 0, rep: it.e.repeat }); });
  }
  return out.slice(0, 12);
}
(function registerPlannerWidget() {
  var w = { id: "schedule", titleKey: "wSchedule", size: "m", ledger: true, page: "l", more: { page: "schedule" }, render: function (b) {
    var list = planHomeItems();
    if (!list.length) { b.innerHTML = '<div class="hempty">' + escapeHtml(t("planHomeEmpty")) + "</div>"; return; }
    var today = todayStr(), tom = pAdd(today, 1), wk = pAdd(today, 6), group = "", h = "";
    list.forEach(function (it) {
      var g = it.date === today ? "t" : it.date === tom ? "m" : it.date <= wk ? "w" : "x";
      if (g !== group) {
        group = g;
        var lab = g === "t" ? t("planToday") : g === "m" ? t("homeTomorrow") : g === "w" ? t("homeThisWeek") : t("homeLater");
        h += '<div class="bk-gh' + (g === "t" ? " today" : "") + '"><span>' + escapeHtml(lab) + (g === "m" ? " <small>" + escapeHtml(shortDate(it.date)) + "</small>" : "") + "</span></div>";
      }
      var near = g === "t" || g === "m";
      var tm = near ? (it.s != null ? pHM(it.s) : t("homeAllDay")) : shortDate(it.date);
      var sub = it.s != null ? (near ? "\u2013 " + pHM(it.en) : pHM(it.s)) : (near ? "" : t("homeAllDay"));
      if (it.rep) sub = (sub ? sub + " \u00b7 " : "") + t("planRep" + ({ daily: 1, weekly: 2, monthly: 3 }[it.rep] || 0));
      h += '<button type="button" class="bk-ev c' + it.color + '" data-plan-go="' + it.date + '"><span class="tm">' + escapeHtml(tm) + '</span><span class="tt"><b>' + escapeHtml(it.title) + "</b>" + (sub ? "<em>" + escapeHtml(sub) + "</em>" : "") + "</span></button>";
    });
    b.innerHTML = h;
  } };
  var i = HOME_WIDGETS.findIndex(function (x) { return x.id === "due-soon"; });
  HOME_WIDGETS.splice(i < 0 ? 0 : i, 0, w);
})();

function initPlanner() {
  QUICK_ADDS.push({ id: "event", icon: "table", labelKey: "planAdd", run: function () { openEvtModal(null, todayStr()); } });
  el("closeEvtModal").addEventListener("click", closeEvtModal);
  el("cancelEvtForm").addEventListener("click", closeEvtModal);
  el("evtModalOverlay").addEventListener("click", function (e) { if (e.target === this) closeEvtModal(); });
  el("evtForm").addEventListener("submit", submitEvt);
  el("btnEvtDelete").addEventListener("click", deleteEvt);
  el("fEvtAllDay").addEventListener("change", function () { setEvtAllDay(this.checked); });
  el("evtColors").addEventListener("click", function (e) { var b = e.target.closest("[data-evtcolor]"); if (b) { evtDraft.color = parseInt(b.getAttribute("data-evtcolor"), 10); renderEvtColors(); } });
  ["planBody", "planTools"].forEach(function (id) { el(id).addEventListener("click", planClick); });
  el("homeGrid").addEventListener("click", function (e) {
    if (typeof homeEdit !== "undefined" && homeEdit) return;
    var g = e.target.closest("[data-plan-go]");
    if (g) { planView.anchor = planView.sel = g.getAttribute("data-plan-go"); planView.mode = "week"; navigate("schedule"); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeEvtModal(); });
}
