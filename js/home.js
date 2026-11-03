"use strict";
// ---------- Home: one dashboard (greeting, four numbers, three panels: today / orders / money) ----------
// ---- data helpers shared by widgets ----
function activeOrders() {
  return state.orders.filter(function (o) { return o.status !== "cancelled" && o.status !== "wishlist"; });
}
function shortDate(dateStr) {
  if (!dateStr) return "";
  var d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(I18N[state.lang].locale, { day: "numeric", month: "short" });
}
// no picture -> a little printed stamp design (colour + doodle picked from the order id so it stays the same)
function homeThumb(o) {
  if (o.mainImage) return '<img src="' + (o.mainThumb || o.mainImage).replace(/"/g, "&quot;") + '" alt="" loading="lazy">';
  var h = 0, k = String(o.id || o.productName || "");
  for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 5;
  return '<span class="ph v' + h + '"></span>';
}

function homeEmpty(key) { return '<div class="hempty">' + escapeHtml(t(key)) + "</div>"; }
function homeIcon(n) { return svgIcon(n); }
function kpiHtml(cls, icon, label, value, sub) {
  return '<div class="k ' + cls + '"><div class="bd">' + svgIcon(icon) + '</div><div class="kt"><div class="l">' + escapeHtml(label) + '</div><div class="v">' + value + '</div><div class="s">' + sub + "</div></div></div>";
}
function panelHtml(cls, title, meta, more, body) {
  return '<section class="panel ' + cls + '"><div class="ph"><i class="tg" style="background:var(--tg)"></i><h2>' + escapeHtml(title) + "</h2>" + (meta ? '<span class="m">' + meta + "</span>" : "") +
    (more ? '<a class="more" href="#/' + more.page + '"' + (more.status !== undefined ? ' data-more="' + more.status + '"' : "") + ">" + escapeHtml(t("seeAll")) + svgIcon("chev-r") + "</a>" : "") + '</div><div class="pb">' + body + "</div></section>";
}
function homeGreeting() {
  var h = new Date().getHours();
  return t(h >= 5 && h < 12 ? "dashGreetMorning" : h >= 12 && h < 17 ? "dashGreetAfternoon" : h >= 17 && h < 21 ? "dashGreetEvening" : "dashGreetNight");
}
function homeDayText() {
  var d = new Date(), loc = I18N[state.lang].locale;
  return d.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
// upcoming payments (orders with a balance, card due days): next 14 days + anything late
function homeDues() {
  var today = todayStr(), lim = pAdd(today, 14);
  return planDues().filter(function (x) { return x.date <= lim; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
}
function homeDueAmount(x) {
  if (x.orderId) { var o = state.orders.find(function (q) { return q.id === x.orderId; }); return o ? remainingOf(o) : 0; }
  if (x.acctId) { var a = finAcctById(x.acctId); return a ? finCardOwed(a) : 0; }
  return 0;
}
function homeDueName(x) {
  if (x.orderId) { var o = state.orders.find(function (q) { return q.id === x.orderId; }); return o ? (o.productName || t("noName")) : ""; }
  if (x.acctId) { var a = finAcctById(x.acctId); return a ? a.name : ""; }
  return x.label;
}

function homeKpis() {
  var key = monthKeyOf(new Date()), cur = finTotals(finRowsOfMonth(key));
  var today = todayStr(), lim7 = pAdd(today, 7);
  var d7 = homeDues().filter(function (x) { return x.date <= lim7; });
  var sum7 = d7.reduce(function (s, x) { return s + homeDueAmount(x); }, 0);
  var waiting = { deposit: 0, full: 0, shipping: 0, intransit: 0 };
  state.orders.forEach(function (o) { if (waiting[o.status] != null) waiting[o.status]++; });
  var nWait = waiting.deposit + waiting.full + waiting.shipping + waiting.intransit;
  var evs = planDay(today, []), nEv = evs.all.length + evs.timed.length;
  var first = evs.timed.length ? evs.timed[0] : null;
  var bal = cur.balance;
  return '<div class="kpi dash-kpi">' +
    kpiHtml("k-blue", "wallet", t("dashKpiLeft"), (bal < 0 ? "−" : "") + yen(Math.abs(bal)), escapeHtml(t("dashKpiLeftSub", { a: yen(cur.income), b: yen(cur.expense) }))) +
    kpiHtml("k-red", "clock", t("dashKpiDue7"), yen(sum7), escapeHtml(d7.length ? t("dashKpiDueSub", { n: d7.length, date: shortDate(d7[0].date) }) : t("dashKpiDueNone"))) +
    kpiHtml("k-yellow", "bag", t("dashKpiOrders"), String(nWait), escapeHtml(t("dashKpiOrdersSub", { a: waiting.deposit, b: waiting.full + waiting.shipping + waiting.intransit }))) +
    kpiHtml("k-lilac", "calendar", t("dashKpiToday"), String(nEv), escapeHtml(first ? t("dashKpiTodaySub", { t: pHM(first.s) + " " + first.e.title }) : (nEv ? t("homeAllDay") : t("dashKpiTodayNone")))) +
    "</div>";
}

function homeWeekStrip() {
  var today = todayStr(), ws = pWeekStart(today), h = "", dues = planDues();
  for (var i = 0; i < 7; i++) {
    var d = pAdd(ws, i), x = planDay(d, dues), dot = x.dues.length ? " due" : (x.all.length + x.timed.length ? " ev" : "");
    h += '<button type="button" class="wd' + (d === today ? " t" : "") + dot + '" data-plan-go="' + d + '"><span>' + escapeHtml(pWeekday(d)) + "</span><b>" + pDate(d).getDate() + "</b></button>";
  }
  return '<div class="wk7">' + h + "</div>";
}
function homeTodayPanel() {
  var today = todayStr(), x = planDay(today, []), h = homeWeekStrip(), rows = "";
  x.all.forEach(function (it) { rows += '<button type="button" class="drow c' + (it.e.color | 0) + '" data-plan-go="' + today + '"><span class="tm">' + escapeHtml(t("homeAllDay")) + '</span><i class="bar"></i><span class="tt"><b>' + escapeHtml(it.e.title) + "</b></span></button>"; });
  x.timed.forEach(function (it) {
    rows += '<button type="button" class="drow c' + (it.e.color | 0) + '" data-plan-go="' + today + '"><span class="tm">' + pHM(it.s) + '</span><i class="bar"></i><span class="tt"><b>' + escapeHtml(it.e.title) + "</b><small>" + pHM(it.s) + " – " + pHM(it.en) + "</small></span></button>";
  });
  h += rows || homeEmpty("planHomeEmpty");
  var dues = homeDues().slice(0, 4);
  h += '<div class="sec-l">' + escapeHtml(t("dashDueSoon")) + "</div>";
  h += dues.length ? dues.map(function (d) {
    var late = d.date < today;
    return '<button type="button" class="drow due" data-plan-go="' + d.date + '"><span class="tm">' + escapeHtml(shortDate(d.date)) + '</span><i class="bar"></i><span class="tt"><b>' + escapeHtml(homeDueName(d)) + "</b>" + (late ? "<small class=\"late\">" + escapeHtml(t("homeDueLate", { n: today > d.date ? pDiff(d.date, today) : 0 })) + "</small>" : "") + '</span><b class="amt">' + yen(homeDueAmount(d)) + "</b></button>";
  }).join("") : homeEmpty("emptyDue");
  return panelHtml("p-sched", t("dashToday"), escapeHtml(shortDate(today)), { page: "schedule" }, h);
}
function homeOrdersPanel() {
  var c = { deposit: 0, full: 0, shipping: 0, intransit: 0, received: 0 };
  state.orders.forEach(function (o) { if (c[o.status] != null) c[o.status]++; });
  var pipe = '<div class="pipe">' + ["deposit", "full", "shipping", "intransit", "received"].map(function (k) {
    return '<button type="button" class="ps s-' + k + '" data-more="' + k + '"><b>' + c[k] + "</b><span>" + escapeHtml(statusLabel(k)) + "</span></button>";
  }).join("") + "</div>";
  var today = todayStr();
  var need = activeOrders().filter(function (o) { return o.status !== "received" && (remainingOf(o) > 0 || o.status === "shipping" || o.status === "intransit"); });
  need.sort(function (a, b) {
    var da = remainingOf(a) > 0 ? (a.dueDate || "9998") : "9999", db = remainingOf(b) > 0 ? (b.dueDate || "9998") : "9999";
    return da < db ? -1 : da > db ? 1 : 0;
  });
  var list = need.slice(0, 4).map(function (o) {
    var rem = remainingOf(o), sub = escapeHtml(o.shopName || t("noShop"));
    var right = rem > 0 ? '<b class="amt dn">' + yen(rem) + "</b><small>" + escapeHtml(o.dueDate ? shortDate(o.dueDate) : t("homeNoDue")) + "</small>" : '<b class="amt">' + yen(Number(o.fullPrice) || 0) + "</b><small>" + escapeHtml(statusLabel(o.status)) + "</small>";
    return '<button type="button" class="orow" data-open="' + o.id + '"><span class="th">' + homeThumb(o) + '</span><span class="tt"><b>' + nameHtml(o) + "</b><small>" + sub + '</small></span><span class="rt">' + right + "</span></button>";
  }).join("");
  var act = activeOrders().filter(function (o) { return o.status !== "received"; });
  var tot = act.reduce(function (s, o) { return s + (Number(o.fullPrice) || 0); }, 0), paid = act.reduce(function (s, o) { return s + (Number(o.fullPrice) || 0) - remainingOf(o); }, 0);
  var pct = tot ? Math.round(paid / tot * 100) : 0;
  var prog = tot ? '<div class="paid"><div class="pl"><span>' + escapeHtml(t("dashPaid")) + "</span><b>" + yen(paid) + " / " + yen(tot) + '</b></div><div class="pbar"><i style="width:' + pct + '%"></i></div></div>' : "";
  return panelHtml("p-orders", t("dashOrders"), "", { page: "orders", status: "all" }, pipe + '<div class="sec-l">' + escapeHtml(t("dashNeeds")) + "</div>" + (list || homeEmpty("emptyDue")) + prog);
}
function homeMoneyPanel() {
  var key = monthKeyOf(new Date()), rows = finRowsOfMonth(key), cur = finTotals(rows), bal = cur.balance;
  var head = '<div class="mh"><div><div class="sub">' + escapeHtml(t("dashBalance")) + '</div><div class="num big' + (bal < 0 ? " neg" : "") + '">' + (bal < 0 ? "−" : "") + yen(Math.abs(bal)) + "</div></div>" +
    '<div><div class="sub">' + escapeHtml(t("finIncome")) + '</div><div class="num mid pos">' + yen(cur.income) + "</div></div>" +
    '<div><div class="sub">' + escapeHtml(t("finExpense")) + '</div><div class="num mid neg">' + yen(cur.expense) + "</div></div></div>";
  var months = [], max = 1, i;
  for (i = 5; i >= 0; i--) { var mk = shiftMonthKey(key, -i), tt = finTotals(finRowsOfMonth(mk)); months.push({ key: mk, exp: tt.expense }); max = Math.max(max, tt.expense); }
  var bars = '<div class="bars">' + months.map(function (m) {
    return '<span class="bc' + (m.key === key ? " on" : "") + '"><i style="height:' + Math.max(3, Math.round(m.exp / max * 100)) + '%"></i><em>' + escapeHtml(monthLabelOf(m.key, true)) + "</em></span>";
  }).join("") + "</div>";
  return panelHtml("p-money", t("dashFinance"), escapeHtml(monthLabelOf(key)), { page: "fin" }, head + bars + '<div class="sec-l">' + escapeHtml(t("dashTopCats")) + "</div>" + catBarsHtml(rows, 3));
}

function renderHome() {
  var grid = document.getElementById("homeGrid");
  if (!grid) return;
  var oa = document.getElementById("homeActions"); if (oa) oa.innerHTML = "";
  var oe = document.getElementById("headerEyebrow"); if (oe) oe.innerHTML = "";
  if (!state.loaded) { grid.innerHTML = ""; return; }
  grid.className = "home-grid dash";
  grid.innerHTML = '<div class="page-title pg-head"><h2>' + escapeHtml(homeGreeting()) + '</h2><span class="dsub">' + escapeHtml(homeDayText()) + '</span><div class="pg-tools">' +
    '<button type="button" class="btn-primary" id="btnHomeAdd">' + svgIcon("plus") + "<span>" + escapeHtml(t("dashAdd")) + "</span></button></div></div>" +
    homeKpis() + '<div class="dash-cols">' + homeTodayPanel() + homeOrdersPanel() + homeMoneyPanel() + "</div>";
}
function initHome() {
  var page = document.getElementById("page-home");
  page.addEventListener("click", function (e) {
    var el;
    if ((el = e.target.closest("#btnHomeAdd"))) { runQuickAdd(); return; }
    if ((el = e.target.closest("[data-open]"))) { openDetailModal(el.getAttribute("data-open")); return; }
    if ((el = e.target.closest("[data-plan-go]"))) { planView.anchor = planView.sel = el.getAttribute("data-plan-go"); planView.mode = "week"; navigate("schedule"); return; }
    if ((el = e.target.closest("[data-more]"))) {
      state.status = el.getAttribute("data-more") || "all";
      if (typeof syncStatusFilterUI === "function") syncStatusFilterUI();
      navigate("orders");
      return;
    }
    if ((el = e.target.closest("[data-fcat]"))) { finShowCategory(el.getAttribute("data-fcat")); return; }
  });
  var rz = null, lastW = window.innerWidth;
  window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (currentPageId === "home" && window.innerWidth !== lastW) { lastW = window.innerWidth; renderHome(); } }, 150); });
}
