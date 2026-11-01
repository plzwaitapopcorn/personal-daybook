"use strict";
// ---------- Finance: accounts (bank / credit card / cash) and the recurring-items plan ----------
// Accounts hold balances; transfers (incl. paying a card) move money between them and are never counted as
// spending. The recurring plan is a planning table only: nothing in it is booked automatically.

var accDraft = { id: null, type: "bank" };
var accView = { sel: "" };
var recDraft = { id: null, type: "expense" };
var recView = { year: new Date().getFullYear(), month: monthKeyOf(new Date()), mode: "grid" };

var ACCT_ICON = { bank: "bank", card: "card", cash: "cash" };

// ================= accounts page =================
function acctCardHtml(a) {
  var bal = finAcctBalance(a), main = a.main;
  var head = '<span class="acc-name">' + svgIcon(ACCT_ICON[a.type] || "bank") + "<b>" + escapeHtml(a.name) + "</b></span>";
  var badge = "";
  var foot;
  if (a.type === "card") {
    var owed = finCardOwed(a), lim = Number(a.limit) || 0;
    if (a.due && owed > 0) {
      var dd = nextDayOfMonth(parseInt(a.due, 10)), left = daysUntil(dd);
      badge = '<span class="stamp' + (left > 7 ? " calm" : "") + '">' + escapeHtml(left === 0 ? t("acctDueToday") : t("acctDueOn", { date: shortDate(dd) })) + "</span>";
    }
    var used = lim > 0 ? Math.min(100, owed / lim * 100) : 0;
    foot = '<div class="acc-foot"><div class="acc-l"><small>' + escapeHtml(t("acctOwedLbl")) + '</small><span class="acc-num">' + yen(owed) + "</span></div>" +
      '<div class="acc-r">' + (lim > 0 ? escapeHtml(t("acctLimitLine", { n: money(lim) })) + "<br>" : "") + (a.cutoff ? escapeHtml(t("acctCutLine", { d: a.cutoff })) : "") + "</div></div>" +
      (lim > 0 ? '<div class="acc-bar"><i style="width:' + used + '%"></i></div>' : "");
  } else {
    foot = '<div class="acc-foot"><div class="acc-l"><small>' + escapeHtml(t("acctBalanceLbl")) + '</small><span class="acc-num' + (bal < 0 ? " neg" : "") + '">' + (bal < 0 ? "−" : "") + yen(Math.abs(bal)) + "</span></div></div>";
  }
  if (!badge && main && finAccts().length > 1) badge = '<span class="acc-main">' + escapeHtml(t("acctMainBadge")) + "</span>";
  return '<div class="acc-card t-' + a.type + (accView.sel === a.id ? " sel" : "") + '" data-accsel="' + a.id + '" role="button" tabindex="0">' +
    '<div class="acc-top">' + head + badge + '<button type="button" class="acc-edit" data-acctedit="' + a.id + '" title="' + escapeHtml(t("acctEdit")) + '" aria-label="' + escapeHtml(t("acctEdit")) + '">' + svgIcon("edit") + "</button></div>" + foot + "</div>";
}

function acctMovesHtml(a) {
  var rows = finSortRows(finAllRows().filter(function (r) { return finRowAcct(r) === a.id || r.to === a.id; })).slice(0, 40);
  var sub = "";
  if (a.type === "card") {
    var cyc = finCardCycle(a);
    if (cyc) sub = '<span class="acc-cycle">' + escapeHtml(t("acctCycle", { a: shortDate(cyc.from), b: shortDate(cyc.to) })) + "</span>";
  }
  return '<section class="acc-moves"><div class="acc-moves-h"><h4 class="fin-h">' + svgIcon(ACCT_ICON[a.type] || "bank") + escapeHtml(t("acctMoves", { name: a.name })) + "</h4>" + sub + "</div>" +
    (rows.length ? '<div class="box fin-box">' + rows.map(finRowHtml).join("") + "</div>" : '<div class="hempty wide">' + escapeHtml(t("acctNoMoves")) + "</div>") +
    '<p class="fin-hint">' + escapeHtml(t("acctTransferNote")) + "</p></section>";
}

function renderFinAcc() {
  var box = el("finAccBody"), tools = el("finAccTools");
  if (!fin.loaded) { box.innerHTML = ""; tools.innerHTML = ""; return; }
  var accts = finAccts();
  tools.innerHTML = '<div class="fin-addbtns"><button type="button" class="btn-primary" data-acctnew="1">' + svgIcon("plus") + "<span>" + escapeHtml(t("acctNew")) + "</span></button></div>";
  var html = finSubnavHtml("fin-acc");
  if (!accts.length) {
    box.innerHTML = html + '<div class="acc-empty box"><p>' + escapeHtml(t("acctEmpty")) + '</p><button type="button" class="btn-primary" data-acctnew="1">' + svgIcon("plus") + "<span>" + escapeHtml(t("acctNew")) + "</span></button></div>";
    return;
  }
  if (!finAcctById(accView.sel)) accView.sel = (finMainAcct() || accts[0]).id;
  html += '<div class="acc-grid">' + accts.map(acctCardHtml).join("") + "</div>";
  var acts = "";
  if (accts.length > 1) acts += '<button type="button" class="btn-primary dark" data-finadd="transfer">' + svgIcon("swap") + "<span>" + escapeHtml(t("finAddTransfer")) + "</span></button>";
  accts.forEach(function (a) {
    if (a.type === "card" && finCardOwed(a) > 0 && accts.length > 1)
      acts += '<button type="button" class="btn-ghost-sm card-pay" data-paycard="' + a.id + '">' + svgIcon("card") + "<span>" + escapeHtml(t("acctPayCard", { name: a.name })) + "</span></button>";
  });
  var nw = finNetWorth();
  html += '<div class="acc-actions">' + acts + '<span class="sp"></span><span class="acc-net">' + escapeHtml(t("acctNet")) + " <b>" + (nw < 0 ? "−" : "") + yen(Math.abs(nw)) + "</b></span></div>";
  html += acctMovesHtml(finAcctById(accView.sel));
  box.innerHTML = html;
}

// ---- account modal ----
function setAcctType(type) {
  accDraft.type = type;
  Array.prototype.forEach.call(document.querySelectorAll("[data-accttype]"), function (b) {
    var on = b.getAttribute("data-accttype") === type;
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  var card = type === "card";
  el("acctCardFields").hidden = !card;
  el("fAcctBalLabel").textContent = t(card ? "acctOwed" : "acctBalance");
  el("fAcctBalHint").textContent = t(card ? "acctOwedHint" : "acctBalHint");
}
function openAcctModal(id) {
  var a = id ? finAcctById(id) : null, first = !finAccts().length;
  accDraft.id = a ? a.id : null;
  el("acctModalTitle").textContent = t(a ? "acctEdit" : "acctNew");
  el("fAcctName").value = a ? a.name : "";
  setAcctType(a ? a.type : "bank");
  el("acctTypeSeg").style.display = a ? "none" : "";
  if (a) el("fAcctBal").value = a.type === "card" ? -finAcctBalance(a) : finAcctBalance(a);
  else el("fAcctBal").value = "";
  el("fAcctLimit").value = a && a.limit ? a.limit : "";
  el("fAcctCutoff").value = a && a.cutoff ? a.cutoff : "";
  el("fAcctDue").value = a && a.due ? a.due : "";
  el("fAcctMain").checked = first || !!(a && a.main);
  el("fAcctMain").disabled = first || !!(a && a.main);
  el("fAcctFirstHint").hidden = !first;
  el("fAcctFirstHint").textContent = t("acctFirstHint");
  el("btnAcctDelete").style.display = a ? "inline-block" : "none";
  el("acctModalOverlay").classList.add("open");
  el("fAcctName").focus();
}
function closeAcctModal() { el("acctModalOverlay").classList.remove("open"); }
function submitAcct(e) {
  e.preventDefault();
  var name = el("fAcctName").value.trim();
  if (!name) { el("fAcctName").focus(); return; }
  var card = accDraft.type === "card", cur = accDraft.id ? finAcctById(accDraft.id) : null;
  var first = !finAccts().length;
  var balStr = el("fAcctBal").value, hasBal = balStr !== "";
  var target = parseFloat(balStr) || 0;
  var a = cur;
  if (!a) {
    var maxSort = finAccts().reduce(function (m, x) { return Math.max(m, x.sort || 0); }, 0);
    a = { id: uid(), kind: "acct", type: accDraft.type, name: name, opening: 0, sort: maxSort + 1 };
    fin.items.push(a);
  }
  a.name = name;
  if (card) {
    a.limit = parseFloat(el("fAcctLimit").value) || 0;
    a.cutoff = Math.min(31, Math.max(0, parseInt(el("fAcctCutoff").value, 10) || 0));
    a.due = Math.min(31, Math.max(0, parseInt(el("fAcctDue").value, 10) || 0));
  }
  if (first) {
    a.main = true; finAssignAllToAcct(a.id);
    if (typeof homeShow === "function" && homePrefs.hidden.indexOf("fin-acc") !== -1) homeShow("fin-acc");
  }
  else if (el("fAcctMain").checked && !a.main) {
    finAccts().forEach(function (x) { x.main = x.id === a.id; });
  }
  if (hasBal) a.opening = (card ? -target : target) - finAcctNet(a.id);
  accView.sel = a.id;
  finSave(); closeAcctModal(); finRenderAll();
  showToast(t("toastUpdated"));
}
function deleteAcct() {
  var a = accDraft.id ? finAcctById(accDraft.id) : null;
  if (!a || !confirm(t("acctDeleteConfirm"))) return;
  fin.items = fin.items.filter(function (x) { return x.id !== a.id; });
  var left = finAccts();
  if (left.length && !left.some(function (x) { return x.main; })) left[0].main = true;
  finSave(); closeAcctModal(); finRenderAll();
}
function payCard(id) {
  var a = finAcctById(id); if (!a) return;
  var src = finAccts().filter(function (x) { return x.type !== "card"; });
  var from = (finMainAcct() && finMainAcct().type !== "card") ? finMainAcct() : src[0];
  openTxModal(null, "transfer", { acct: from ? from.id : "", to: a.id, amount: finCardOwed(a), note: t("acctPayCard", { name: a.name }) });
}

// ================= recurring plan =================
function recMoney(n) { return n ? money(n) : "–"; }
function recGridHtml() {
  var y = recView.year, recs = finRecs(), nowKey = monthKeyOf(new Date());
  var keys = []; for (var m = 1; m <= 12; m++) keys.push(y + "-" + String(m).padStart(2, "0"));
  var head = '<tr><th class="rg-item">' + escapeHtml(t("recItem")) + "</th>" + keys.map(function (k) {
    return '<th class="rg-m' + (k === nowKey ? " cur" : "") + '">' + escapeHtml(monthLabelOf(k, true)) + "</th>";
  }).join("") + '<th class="rg-y">' + escapeHtml(t("recYearCol")) + "</th></tr>";
  function sec(title) { return '<tr class="sec"><td colspan="14">' + escapeHtml(title) + "</td></tr>"; }
  function row(r) {
    var sum = 0, cells = keys.map(function (k) {
      var st = recStateIn(r, k), a = recAmountIn(r, k); sum += a;
      var c = st === "due" ? money(a) : (st === "done" ? '<span class="end">' + escapeHtml(t("recDone")) + "</span>" : '<span class="dash">–</span>');
      return '<td class="' + (k === nowKey ? "cur" : "") + '">' + c + "</td>";
    }).join("");
    var note = r.count > 0 ? ' <small>' + escapeHtml(t("recInst", { n: r.count })) + "</small>" : "";
    return '<tr class="rg-row' + (r.invest ? " inv" : "") + '" data-recedit="' + r.id + '" tabindex="0"><td class="rg-item">' + (r.invest ? svgIcon("chart") : "") + escapeHtml(r.name) + note + "</td>" + cells + '<td class="rg-y">' + recMoney(sum) + "</td></tr>";
  }
  var inc = recs.filter(function (r) { return r.type === "income"; });
  var exp = recs.filter(function (r) { return r.type !== "income" && !r.invest; });
  var inv = recs.filter(function (r) { return r.type !== "income" && r.invest; });
  var body = "";
  if (inc.length) body += sec(t("recIncomeSec")) + inc.map(row).join("");
  if (exp.length || inv.length) body += sec(t("recFixedSec")) + exp.map(row).join("") + inv.map(row).join("");
  var tIn = 0, tEx = 0, tNet = 0;
  var totRow = '<tr class="tot"><td class="rg-item">' + escapeHtml(t("recTotalExp")) + "</td>", netRow = '<tr class="net"><td class="rg-item">' + escapeHtml(t("recLeft")) + "</td>";
  keys.forEach(function (k) {
    var tt = recTotals(k), ex = tt.expense + tt.invest; tEx += ex; tNet += tt.left; tIn += tt.income;
    totRow += '<td class="' + (k === nowKey ? "cur" : "") + '">' + recMoney(ex) + "</td>";
    netRow += '<td class="' + (k === nowKey ? "cur" : "") + (tt.left < 0 ? " neg" : "") + '">' + (tt.left < 0 ? "−" : "") + money(Math.abs(tt.left)) + "</td>";
  });
  totRow += '<td class="rg-y">' + recMoney(tEx) + "</td></tr>";
  netRow += '<td class="rg-y' + (tNet < 0 ? " neg" : "") + '">' + (tNet < 0 ? "−" : "") + money(Math.abs(tNet)) + "</td></tr>";
  return '<div class="rec-gridwrap"><table class="rg"><thead>' + head + "</thead><tbody>" + body + totRow + netRow + "</tbody></table></div>";
}
function recMonthHtml() {
  var key = recView.month, recs = finRecs(), tt = recTotals(key);
  function item(r) {
    var d = monthIndex(key) - monthIndex(r.start), idx = Math.floor(d / (r.every || 1)) + 1;
    var sub = r.count > 0 ? t("recInst", { n: r.count }) + " · " + idx + "/" + r.count : (r.every > 1 ? t("recEvery" + r.every) : "");
    return '<button type="button" class="frow rec-item' + (r.invest ? " inv" : "") + '" data-recedit="' + r.id + '"><span class="frow-dot" style="background:' + (r.type === "income" ? "var(--ok-ink)" : r.invest ? "#d9b53a" : "var(--text-faint)") + '"></span>' +
      '<span class="frow-main"><span class="frow-t">' + escapeHtml(r.name) + "</span>" + (sub ? '<span class="frow-s">' + escapeHtml(sub) + "</span>" : "") + "</span>" +
      '<span class="frow-r' + (r.type === "income" ? " inc" : "") + '">' + (r.type === "income" ? "+" : "−") + yen(recAmountIn(r, key)) + "</span></button>";
  }
  var due = recs.filter(function (r) { return recStateIn(r, key) === "due"; });
  var inc = due.filter(function (r) { return r.type === "income"; }), out = due.filter(function (r) { return r.type !== "income"; });
  var isNow = key === monthKeyOf(new Date());
  var nav = '<div class="fin-monthnav"><button type="button" class="icon-toggle" data-recm="-1" aria-label="' + escapeHtml(t("finPrevMonth")) + '">' + svgIcon("chev-l") + "</button><b>" + escapeHtml(monthLabelOf(key)) + '</b><button type="button" class="icon-toggle" data-recm="1" aria-label="' + escapeHtml(t("finNextMonth")) + '">' + svgIcon("chev-r") + "</button>" +
    (isNow ? "" : '<button type="button" class="icon-toggle" data-recm="now" aria-label="' + escapeHtml(t("finThisMonth")) + '">' + svgIcon("calendar") + "</button>") + "</div>";
  var tiles = '<div class="rec-tiles"><div><small>' + escapeHtml(t("finIncome")) + "</small><b>" + yen(tt.income) + "</b></div><div><small>" + escapeHtml(t("recTotalExp")) + "</small><b>" + yen(tt.expense + tt.invest) + "</b></div>" +
    '<div class="net"><small>' + escapeHtml(t("recLeft")) + "</small><b" + (tt.left < 0 ? ' class="neg"' : "") + ">" + (tt.left < 0 ? "−" : "") + yen(Math.abs(tt.left)) + "</b></div></div>";
  var list = (inc.length ? '<h4 class="fin-h">' + escapeHtml(t("recIncomeSec")) + '</h4><div class="box fin-box">' + inc.map(item).join("") + "</div>" : "") +
    (out.length ? '<h4 class="fin-h">' + escapeHtml(t("recFixedSec")) + '</h4><div class="box fin-box">' + out.map(item).join("") + "</div>" : "");
  return '<div class="rec-month">' + nav + tiles + list + "</div>";
}
function renderFinRec() {
  var box = el("finRecBody"), tools = el("finRecTools");
  if (!fin.loaded) { box.innerHTML = ""; tools.innerHTML = ""; return; }
  el("finRecTitle").textContent = recView.mode === "grid" ? t("recYear", { y: yearLabel(recView.year) }) : t("navFinRec");
  tools.innerHTML = '<div class="fin-addbtns"><button type="button" class="btn-primary" data-recnew="1">' + svgIcon("plus") + "<span>" + escapeHtml(t("recNew")) + "</span></button></div>";
  var html = finSubnavHtml("fin-rec");
  if (!finRecs().length) {
    box.innerHTML = html + '<div class="acc-empty box"><p>' + escapeHtml(t("recEmpty")) + '</p><button type="button" class="btn-primary" data-recnew="1">' + svgIcon("plus") + "<span>" + escapeHtml(t("recNew")) + "</span></button></div>";
    return;
  }
  var bar = '<div class="rec-bar"><div class="rec-seg"><button type="button" class="chip' + (recView.mode === "grid" ? " active" : "") + '" data-recmode="grid">' + svgIcon("chart") + "<span>" + escapeHtml(t("recGrid")) + '</span></button><button type="button" class="chip' + (recView.mode === "month" ? " active" : "") + '" data-recmode="month"><span>' + escapeHtml(t("recMonthView")) + "</span></button></div>" +
    '<div class="rec-yearnav"><button type="button" class="icon-toggle" data-recy="-1" aria-label="' + escapeHtml(t("recPrevYear")) + '">' + svgIcon("chev-l") + "</button><b>" + yearLabel(recView.year) + '</b><button type="button" class="icon-toggle" data-recy="1" aria-label="' + escapeHtml(t("recNextYear")) + '">' + svgIcon("chev-r") + "</button></div>" +
    '<span class="rec-note">' + svgIcon("clock") + escapeHtml(t("recPlanNote")) + "</span></div>";
  box.innerHTML = html + '<div class="rec-wrap mode-' + recView.mode + '">' + bar + recGridHtml() + recMonthHtml() + "</div>";
}
function yearLabel(y) { return state.lang === "th" ? y + 543 : y; }

// ---- recurring modal ----
function setRecType(type) {
  recDraft.type = type;
  Array.prototype.forEach.call(document.querySelectorAll("[data-rectype]"), function (b) {
    var on = b.getAttribute("data-rectype") === type;
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  el("recInvestRow").hidden = type === "income";
}
function openRecModal(id, type) {
  var r = id ? finRecs().filter(function (x) { return x.id === id; })[0] : null;
  recDraft.id = r ? r.id : null;
  el("recModalTitle").textContent = t(r ? "recEdit" : "recNew");
  el("fRecName").value = r ? r.name : "";
  el("fRecAmount").value = r ? r.amount : "";
  el("fRecEvery").value = String(r ? r.every || 1 : 1);
  el("fRecStart").value = r ? r.start : monthKeyOf(new Date());
  el("fRecCount").value = r && r.count > 0 ? r.count : "";
  el("fRecInvest").checked = !!(r && r.invest);
  el("btnRecDelete").style.display = r ? "inline-block" : "none";
  setRecType(r ? r.type : (type || "expense"));
  el("recModalOverlay").classList.add("open");
  el("fRecName").focus();
}
function closeRecModal() { el("recModalOverlay").classList.remove("open"); }
function submitRec(e) {
  e.preventDefault();
  var name = el("fRecName").value.trim(), amount = parseFloat(el("fRecAmount").value);
  if (!name) { el("fRecName").focus(); return; }
  if (!(amount > 0)) { el("fRecAmount").focus(); return; }
  var start = el("fRecStart").value || monthKeyOf(new Date());
  var rec = { id: recDraft.id || uid(), kind: "rec", type: recDraft.type, name: name, amount: amount,
    every: parseInt(el("fRecEvery").value, 10) || 1, start: start, count: Math.max(0, parseInt(el("fRecCount").value, 10) || 0),
    invest: recDraft.type !== "income" && el("fRecInvest").checked };
  var i = fin.items.findIndex(function (x) { return x.id === rec.id; });
  if (i >= 0) { rec.sort = fin.items[i].sort || 0; fin.items[i] = rec; }
  else { rec.sort = finRecs().reduce(function (m, x) { return Math.max(m, x.sort || 0); }, 0) + 1; fin.items.push(rec); }
  finSave(); closeRecModal(); finRenderAll();
  showToast(t(i >= 0 ? "toastUpdated" : "finAdded"));
}
function deleteRec() {
  if (!recDraft.id || !confirm(t("finDeleteConfirm"))) return;
  fin.items = fin.items.filter(function (x) { return x.id !== recDraft.id; });
  finSave(); closeRecModal(); finRenderAll();
}

// ================= order form: which account paid =================
function orderFormAcctSetup(o) {
  var has = finAccts().length > 0, row = el("fAcctRow");
  row.hidden = !has;
  if (!has) return;
  var main = finMainAcct();
  fillAcctSelect(el("fAcct"), o && o.acct ? o.acct : (main && main.id));
}

// ================= click handling shared by the new pages =================
function finAccClick(e) {
  var b;
  if ((b = e.target.closest("[data-acctnew]"))) { openAcctModal(null); return true; }
  if ((b = e.target.closest("[data-acctedit]"))) { e.stopPropagation(); openAcctModal(b.getAttribute("data-acctedit")); return true; }
  if ((b = e.target.closest("[data-accsel]"))) { accView.sel = b.getAttribute("data-accsel"); renderFinAcc(); return true; }
  if ((b = e.target.closest("[data-paycard]"))) { payCard(b.getAttribute("data-paycard")); return true; }
  if ((b = e.target.closest("[data-recnew]"))) { openRecModal(null); return true; }
  if ((b = e.target.closest("[data-recedit]"))) { openRecModal(b.getAttribute("data-recedit")); return true; }
  if ((b = e.target.closest("[data-recmode]"))) { recView.mode = b.getAttribute("data-recmode"); renderFinRec(); return true; }
  if ((b = e.target.closest("[data-recy]"))) { recView.year += parseInt(b.getAttribute("data-recy"), 10); renderFinRec(); return true; }
  if ((b = e.target.closest("[data-recm]"))) {
    var d = b.getAttribute("data-recm");
    recView.month = d === "now" ? monthKeyOf(new Date()) : shiftMonthKey(recView.month, parseInt(d, 10));
    recView.year = parseInt(recView.month.slice(0, 4), 10);
    renderFinRec(); return true;
  }
  return false;
}

// ================= home widget =================
(function registerAccWidget() {
  var w = { id: "fin-acc", titleKey: "wFinAcc", size: "m", icon: "bank", more: { page: "fin-acc" }, render: function (b) {
    var accts = finAccts();
    if (!accts.length) { b.innerHTML = '<div class="hempty">' + escapeHtml(t("acctEmpty")) + "</div>"; return; }
    var nw = finNetWorth();
    b.innerHTML = '<div class="acc-mini">' + accts.map(function (a) {
      var bal = finAcctBalance(a), card = a.type === "card";
      return '<button type="button" class="acc-mini-row" data-accgo="' + a.id + '">' + svgIcon(ACCT_ICON[a.type] || "bank") + "<span>" + escapeHtml(a.name) + "</span><b" + (!card && bal < 0 ? ' class="neg"' : "") + ">" +
        (card ? (finCardOwed(a) > 0 ? "−" : "") + yen(finCardOwed(a)) : (bal < 0 ? "−" : "") + yen(Math.abs(bal))) + "</b></button>";
    }).join("") + '</div><div class="acc-mini-net">' + escapeHtml(t("acctNet")) + " <b>" + (nw < 0 ? "−" : "") + yen(Math.abs(nw)) + "</b></div>";
  } };
  var ri = HOME_WIDGETS.findIndex(function (x) { return x.id === "fin-cats"; });
  HOME_WIDGETS.splice(ri < 0 ? HOME_WIDGETS.length : ri, 0, w);
})();

function initFinAcc() {
  el("closeAcctModal").addEventListener("click", closeAcctModal);
  el("cancelAcctForm").addEventListener("click", closeAcctModal);
  el("acctModalOverlay").addEventListener("click", function (e) { if (e.target === this) closeAcctModal(); });
  el("acctForm").addEventListener("submit", submitAcct);
  el("btnAcctDelete").addEventListener("click", deleteAcct);
  el("acctTypeSeg").addEventListener("click", function (e) { var b = e.target.closest("[data-accttype]"); if (b) setAcctType(b.getAttribute("data-accttype")); });
  el("closeRecModal").addEventListener("click", closeRecModal);
  el("cancelRecForm").addEventListener("click", closeRecModal);
  el("recModalOverlay").addEventListener("click", function (e) { if (e.target === this) closeRecModal(); });
  el("recForm").addEventListener("submit", submitRec);
  el("btnRecDelete").addEventListener("click", deleteRec);
  el("recTypeSeg").addEventListener("click", function (e) { var b = e.target.closest("[data-rectype]"); if (b) setRecType(b.getAttribute("data-rectype")); });
  // keyboard: Enter / Space on a card or a grid row
  ["finAccBody", "finRecBody"].forEach(function (id) {
    el(id).addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var t0 = e.target;
      if (t0.matches && (t0.matches("[data-accsel]") || t0.matches("tr[data-recedit]"))) { e.preventDefault(); t0.click(); }
    });
  });
  el("txTypeSeg").addEventListener("click", function () { /* account labels follow setTxType */ });
  el("homeGrid").addEventListener("click", function (e) {
    if (typeof homeEdit !== "undefined" && homeEdit) return;
    var b = e.target.closest("[data-accgo]");
    if (b) { accView.sel = b.getAttribute("data-accgo"); navigate("fin-acc"); }
  });
}
