"use strict";
// ---------- Finance: accounts (bank / credit card / cash) and the recurring-items plan ----------
// Accounts hold balances; transfers (incl. paying a card) move money between them and are never counted as
// spending. The recurring plan is a planning table only: nothing in it is booked automatically.

var accDraft = { id: null, type: "bank", color: "#1b3fd0" };
var accView = { sel: "" };
var recDraft = { id: null, type: "expense", cat: "" };
var recView = { year: new Date().getFullYear(), month: monthKeyOf(new Date()), mode: "grid" };

var ACCT_ICON = { bank: "bank", card: "card", cash: "cash" };

// ================= accounts page =================
function acctCardHtml(a) {
  var bal = finAcctBalance(a), card = a.type === "card", extra = "";
  var amt = card ? finCardOwed(a) : Math.abs(bal), neg = card ? amt > 0 : bal < 0;
  var amtTxt = (neg ? "−" : "") + yen(amt);
  if (card) {
    var owed = finCardOwed(a), lim = Number(a.limit) || 0, insLeft = finInstLeft(a.id);
    if (a.due && owed > 0) {
      var dd = nextDayOfMonth(parseInt(a.due, 10)), left = daysUntil(dd);
      extra += '<span class="stamp' + (left > 7 ? " calm" : "") + '">' + escapeHtml(left === 0 ? t("acctDueToday") : t("acctDueOn", { date: shortDate(dd) })) + "</span>";
    }
    if (lim > 0) extra += '<span class="acc-lim">' + escapeHtml(t("instLimitUsed", { u: money(owed + insLeft), l: money(lim) })) + "</span>";
    else if (a.cutoff) extra += '<span class="acc-lim">' + escapeHtml(t("acctCutLine", { d: a.cutoff })) + "</span>";
  } else if (a.main && finAccts().length > 1) extra += '<span class="acc-main">' + escapeHtml(t("acctMainBadge")) + "</span>";
  return '<div class="acc-card t-' + a.type + (accView.sel === a.id ? " sel" : "") + '" style="' + acctStyle(a) + '" data-accsel="' + a.id + '" role="button" tabindex="0">' +
    '<div class="acc-top"><span class="acc-type"><i class="dotc"></i>' + escapeHtml(t(a.type === "card" ? "acctCard" : a.type === "cash" ? "acctCash" : "acctBank")) + '</span>' +
    '<button type="button" class="acc-edit" data-acctedit="' + a.id + '" title="' + escapeHtml(t("acctEdit")) + '" aria-label="' + escapeHtml(t("acctEdit")) + '">' + svgIcon("edit") + "</button></div>" +
    '<div class="acc-name"><b>' + escapeHtml(a.name) + "</b></div>" +
    '<div class="acc-num ai' + (neg ? " neg" : "") + '">' + amtTxt + "</div>" + '<div class="acc-extra">' + extra + "</div>" + "</div>";
}

function acctMovesHtml(a) {
  var rows = finSortRows(finAllRows().filter(function (r) { return finRowAcct(r) === a.id || r.to === a.id; })).slice(0, 40);
  var sub = "";
  if (a.type === "card") {
    var cyc = finCardCycle(a);
    if (cyc) sub = escapeHtml(t("acctCycle", { a: shortDate(cyc.from), b: shortDate(cyc.to) }));
  }
  var body = rows.length ? '<div class="tbl nacct"><div class="th"><span>' + escapeHtml(t("finColDate")) + "</span><span>" + escapeHtml(t("finColItem")) + "</span><span>" + escapeHtml(t("finColCat")) + "</span><span class=\"r\">" + escapeHtml(t("finColAmt")) + "</span></div>" + rows.map(finTableRowHtml).join("") + "</div>"
    : '<div class="pb"><div class="hempty wide">' + escapeHtml(t("acctNoMoves")) + "</div></div>";
  return '<section class="panel p-moves" style="' + acctStyle(a) + '"><div class="ph"><i class="tg" style="background:var(--ac)"></i><h2>' + escapeHtml(t("acctMoves", { name: a.name })) + "</h2>" + (sub ? '<span class="m">' + sub + "</span>" : "") + "</div>" + body + "</section>";
}
function acctShareHtml(accts) {
  var list = accts.filter(function (a) { return a.type !== "card" && finAcctBalance(a) > 0; });
  var tot = list.reduce(function (s, a) { return s + finAcctBalance(a); }, 0) || 1;
  var bars = list.map(function (a) {
    var v = finAcctBalance(a);
    return '<div class="cat" style="' + acctStyle(a) + '"><div class="h"><span class="ai"><i class="dotc" style="background:var(--ac)"></i>' + escapeHtml(a.name) + '</span><b class="num ai">' + yen(v) + '</b></div><div class="pbar"><i style="width:' + Math.max(2, Math.round(v / tot * 100)) + '%;background:var(--ac)"></i></div></div>';
  }).join("") || '<div class="hempty">' + escapeHtml(t("acctEmpty")) + "</div>";
  return panelHtml("p-share", t("acctShare"), "", null, bars + '<p class="fin-hint">' + escapeHtml(t("acctTransferNote")) + "</p>");
}

function renderFinAcc() {
  var box = el("finAccBody"), tools = el("finAccTools");
  if (!fin.loaded) { box.innerHTML = ""; tools.innerHTML = ""; return; }
  var accts = finAccts();
  var tl = "";
  if (accts.length > 1) tl += '<button type="button" class="btn-ghost-sm" data-finadd="transfer">' + svgIcon("swap") + "<span>" + escapeHtml(t("finAddTransfer")) + "</span></button>";
  accts.forEach(function (a) {
    if (a.type === "card" && finCardOwed(a) > 0 && accts.length > 1)
      tl += '<button type="button" class="btn-ghost-sm card-pay" data-paycard="' + a.id + '">' + svgIcon("card") + "<span>" + escapeHtml(t("acctPayCard", { name: a.name })) + "</span></button>";
  });
  tl += '<button type="button" class="btn-primary" data-acctnew="1">' + svgIcon("plus") + "<span>" + escapeHtml(t("acctNew")) + "</span></button>";
  tools.innerHTML = tl;
  var html = finSubnavHtml("fin-acc");
  if (!accts.length) {
    box.innerHTML = html + '<div class="acc-empty box"><p>' + escapeHtml(t("acctEmpty")) + '</p><button type="button" class="btn-primary" data-acctnew="1">' + svgIcon("plus") + "<span>" + escapeHtml(t("acctNew")) + "</span></button></div>";
    return;
  }
  if (!finAcctById(accView.sel)) accView.sel = (finMainAcct() || accts[0]).id;
  var dOwe = finDebtTotal("owe"), dOwed = finDebtTotal("owed"), nw = finNetWorth();
  var assets = dOwed, liab = dOwe, nCards = 0;
  accts.forEach(function (a) { var b = finAcctBalance(a); if (b > 0) assets += b; else liab += -b; if (a.type === "card") nCards++; });
  var kpi = '<div class="kpi" style="grid-template-columns:repeat(3,minmax(0,1fr))">' +
    kpiHtml("k-blue", "wallet", t("acctNet"), (nw < 0 ? "−" : "") + yen(Math.abs(nw)), escapeHtml(t("acctNetSub"))) +
    kpiHtml("k-yellow", "bank", t("acctAssetsTotal"), yen(assets), escapeHtml(t("acctCount", { n: accts.length }))) +
    kpiHtml("k-red", "arrow-out", t("acctLiabilities"), yen(liab), escapeHtml(nCards || dOwe ? t("acctLiabSub", { c: nCards }) : "—")) + "</div>";
  html += kpi + '<div class="acc-grid">' + accts.map(acctCardHtml).join("") + "</div>";
  html += '<div class="acc-cols">' + acctMovesHtml(finAcctById(accView.sel)) + '<div class="acc-side">' + acctShareHtml(accts) + instSideHtml(finAcctById(accView.sel)) + "</div></div>";
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
  accDraft.color = a && ACCT_COLORS.indexOf(a.color) !== -1 ? a.color : acctDefaultColor();
  renderAcctColors();
  el("fAcctMain").checked = first || !!(a && a.main);
  el("fAcctMain").disabled = first || !!(a && a.main);
  el("fAcctFirstHint").hidden = !first;
  el("fAcctFirstHint").textContent = t("acctFirstHint");
  el("btnAcctDelete").style.display = a ? "inline-block" : "none";
  el("acctModalOverlay").classList.add("open");
  el("fAcctName").focus();
}
// colours not yet worn by another account come first
function acctDefaultColor() {
  var used = finAccts().map(function (x) { return x.color; }), pref = ["#1b3fd0", "#b8a0ea", "#f48ba6", "#ee4a2a", "#f7c419", "#1e7a40", "#121212", "#cbc5b3"];
  for (var i = 0; i < pref.length; i++) if (used.indexOf(pref[i]) === -1) return pref[i];
  return pref[0];
}
function renderAcctColors() {
  el("acctColors").innerHTML = ACCT_COLORS.map(function (c) {
    return '<button type="button" class="acct-dot' + (c === accDraft.color ? " on" : "") + '" data-acctcolor="' + c + '" style="background:' + c + '" aria-pressed="' + (c === accDraft.color) + '" aria-label="' + c + '"></button>';
  }).join("");
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
  a.color = accDraft.color;
  if (card) {
    a.limit = parseFloat(el("fAcctLimit").value) || 0;
    a.cutoff = Math.min(31, Math.max(0, parseInt(el("fAcctCutoff").value, 10) || 0));
    a.due = Math.min(31, Math.max(0, parseInt(el("fAcctDue").value, 10) || 0));
  }
  if (first) {
    a.main = true; finAssignAllToAcct(a.id);
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

// ---- instalment plans of a card ----
function instSideHtml(a) {
  if (!a || a.type !== "card") return "";
  var list = finInsts(a.id);
  if (!list.length) return "";
  list.sort(function (x, y) { return instStatus(x).done - instStatus(y).done; });
  var rows = list.map(function (it) {
    var st = instStatus(it), n = it.months | 0, pct = Math.round(st.paid / n * 100);
    return '<button type="button" class="inst-row' + (st.done ? " done" : "") + '" data-instedit="' + it.id + '"><div class="inst-main"><b>' + escapeHtml(it.name) + "</b><small>" +
      escapeHtml(t("instRowSub", { total: money(it.total), r: Number(it.rate) || 0, n: n })) + '</small></div><div class="inst-mid"><div class="inst-prog"><span>' + escapeHtml(t("instProg", { k: st.paid, n: n })) +
      "</span><span>" + escapeHtml(st.done ? t("instDone") : t("instEnds", { m: monthLabelOf(st.end.slice(0, 7), true) + " " + yearLabel(parseInt(st.end.slice(0, 4), 10)) })) + '</span></div><div class="inst-bar"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="inst-amt">' + yen(st.per) + "<small> " + escapeHtml(t("instPerMonth")) + "</small>" + (st.done ? "" : "<small>" + escapeHtml(t("instLeft", { n: money(st.left) })) + "</small>") + "</div></button>";
  }).join("");
  return panelHtml("p-inst", t("instSection", { name: a.name }), "", null, rows + '<p class="fin-hint">' + escapeHtml(t("instNote")) + "</p>");
}

var debtDraft = { id: null, dir: "owe", cat: "" };
var debtView = { dir: "owe" };
var debtPay = { ids: [], dir: "owe", who: "" };
var DEBT_LONG_DAYS = 30;
var AVATAR_COLORS = ["#e08a6a", "#6a9ae0", "#7bb98a", "#b58ad6", "#d6a64a", "#5fb5b0", "#d67a9a"];
function avatarColor(name) { var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return AVATAR_COLORS[h % AVATAR_COLORS.length]; }
function debtAge(d) { return Math.max(0, -daysUntil(d.date)); }
function debtGroups(dir) {
  var map = {}, order = [];
  finDebts(dir).forEach(function (d) {
    if (finDebtLeft(d) <= 0) return;
    var k = d.who.trim().toLowerCase();
    if (!map[k]) { map[k] = { who: d.who.trim(), items: [], total: 0 }; order.push(k); }
    map[k].items.push(d); map[k].total += finDebtLeft(d);
  });
  return order.map(function (k) { map[k].items.sort(function (a, b) { return a.date < b.date ? -1 : 1; }); return map[k]; })
    .sort(function (a, b) { return b.total - a.total; });
}
function debtRowHtml(d, dir) {
  var left = finDebtLeft(d), age = debtAge(d), part = left < (Number(d.amount) || 0);
  return '<div class="iou-r" data-debtedit="' + d.id + '" tabindex="0"><span class="d">' + escapeHtml(shortDate(d.date)) + '</span><div class="t"><b>' + escapeHtml(d.name) + "</b><small>" +
    escapeHtml(part ? t("debtLeftOf", { a: money(left), b: money(d.amount) }) : (age > 0 ? t("debtAge", { n: age }) : t("debtToday"))) + "</small></div>" +
    (age > DEBT_LONG_DAYS ? '<span class="stamp">' + escapeHtml(t("debtLong")) + "</span>" : "") +
    '<span class="a ' + (dir === "owe" ? "neg" : "pos") + '">' + yen(left) + '</span><button type="button" class="iou-pay" data-debtpay="' + d.id + '">' + escapeHtml(t(dir === "owe" ? "debtPayBtn" : "debtRecvBtn")) + "</button></div>";
}
function renderFinDebt() {
  var box = el("finDebtBody"), tools = el("finDebtTools");
  if (!fin.loaded) { box.innerHTML = ""; tools.innerHTML = ""; return; }
  tools.innerHTML = '<div class="fin-addbtns"><button type="button" class="btn-primary" data-debtnew="1">' + svgIcon("plus") + "<span>" + escapeHtml(t("debtNew")) + "</span></button></div>";
  var dir = debtView.dir, groups = debtGroups(dir), total = groups.reduce(function (s, g) { return s + g.total; }, 0);
  var items = groups.reduce(function (s, g) { return s + g.items.length; }, 0);
  function cnt(d) { return debtGroups(d).reduce(function (s, g) { return s + g.items.length; }, 0); }
  var html = finSubnavHtml("fin-debt") + '<div class="debt-seg"><button type="button" class="chip' + (dir === "owe" ? " active" : "") + '" data-debtdir-view="owe">' + escapeHtml(t("debtOwe")) + " <span class=\"chip-count\">" + cnt("owe") + '</span></button>' +
    '<button type="button" class="chip' + (dir === "owed" ? " active" : "") + '" data-debtdir-view="owed">' + escapeHtml(t("debtOwed")) + " <span class=\"chip-count\">" + cnt("owed") + "</span></button></div>";
  var oweDir = dir === "owe";
  html += '<div class="kpi" style="grid-template-columns:repeat(3,minmax(0,1fr))">' +
    kpiHtml(oweDir ? "k-red" : "k-green", oweDir ? "arrow-out" : "arrow-in", t(oweDir ? "debtTotalOwe" : "debtTotalOwed"), yen(total), "") +
    kpiHtml("k-yellow", "list", t("debtItems"), String(items), "") +
    kpiHtml("k-lilac", "users", t("debtPeople"), String(groups.length), "") + "</div>";
  if (!groups.length) html += '<div class="acc-empty box"><p>' + escapeHtml(t(dir === "owe" ? "debtEmptyOwe" : "debtEmptyOwed")) + '</p><button type="button" class="btn-primary" data-debtnew="1">' + svgIcon("plus") + "<span>" + escapeHtml(t("debtNew")) + "</span></button></div>";
  if (groups.length) html += '<div class="iou-grid">';
  groups.forEach(function (g) {
    var oldest = g.items.reduce(function (m, d) { return Math.max(m, debtAge(d)); }, 0);
    html += '<section class="iou-who"><div class="iou-h"><span class="av" style="background:' + avatarColor(g.who) + '">' + escapeHtml(g.who.charAt(0).toUpperCase()) + "</span><div><b>" + escapeHtml(g.who) + "</b><small>" +
      escapeHtml(t("debtOldest", { n: oldest })) + '</small></div><span class="tot ' + (dir === "owe" ? "neg" : "pos") + '">' + yen(g.total) + "</span></div>" + g.items.map(function (d) { return debtRowHtml(d, dir); }).join("") +
      (g.items.length > 1 ? '<div class="iou-all"><button type="button" class="iou-pay dark" data-debtpayall="' + escapeHtml(g.who) + '">' + escapeHtml(t(dir === "owe" ? "debtPayAll" : "debtRecvAll", { who: g.who, n: money(g.total) })) + "</button></div>" : "") + "</section>";
  });
  if (groups.length) html += "</div>";
  html += '<p class="fin-hint">' + escapeHtml(t(dir === "owe" ? "debtNoteOwe" : "debtNoteOwed")) + "</p>";
  var settled = finDebts(dir).filter(function (d) { return finDebtLeft(d) <= 0; });
  if (settled.length) html += '<details class="iou-done"><summary>' + escapeHtml(t("debtSettled", { n: settled.length })) + '</summary><div class="box fin-box">' + settled.sort(function (a, b) { return a.date < b.date ? 1 : -1; }).map(function (d) {
    return '<div class="iou-r" data-debtedit="' + d.id + '" tabindex="0"><span class="d">' + escapeHtml(shortDate(d.date)) + '</span><div class="t"><b>' + escapeHtml(d.name) + "</b><small>" + escapeHtml(d.who) + '</small></div><span class="a">' + yen(d.amount) + "</span></div>";
  }).join("") + "</div></details>";
  box.innerHTML = html;
}

function setDebtDir(dir) {
  debtDraft.dir = dir;
  Array.prototype.forEach.call(document.querySelectorAll("[data-debtdir]"), function (b) {
    var on = b.getAttribute("data-debtdir") === dir;
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  el("debtRecordRow").hidden = !(dir === "owed" && !debtDraft.id);
}
function renderDebtCats() {
  var cats = finCats("expense");
  if (!cats.some(function (c) { return c.id === debtDraft.cat; })) debtDraft.cat = cats.length ? cats[0].id : "";
  el("debtCatChips").innerHTML = cats.map(function (c) {
    return '<button type="button" class="cat-chip' + (c.id === debtDraft.cat ? " on" : "") + '" data-debtcat="' + c.id + '"><i style="background:' + finCatColor(c) + '"></i>' + escapeHtml(finCatName(c)) + "</button>";
  }).join("");
}
function openDebtModal(id, dir) {
  var d = id ? fin.items.filter(function (x) { return x.id === id && x.kind === "debt"; })[0] : null;
  debtDraft.id = d ? d.id : null;
  debtDraft.cat = d ? d.cat : "";
  el("debtModalTitle").textContent = t(d ? "debtEdit" : "debtNew");
  el("fDebtWho").value = d ? d.who : "";
  el("fDebtName").value = d ? d.name : "";
  el("fDebtAmount").value = d ? d.amount : "";
  el("fDebtDate").value = d ? d.date : todayStr();
  var names = {}; finDebts().forEach(function (x) { names[x.who.trim()] = 1; });
  el("debtWhoList").innerHTML = Object.keys(names).map(function (n) { return '<option value="' + escapeHtml(n) + '">'; }).join("");
  el("btnDebtDelete").style.display = d ? "inline-block" : "none";
  el("fDebtRecord").checked = true;
  var hasAcct = finAccts().length > 0;
  el("fDebtAcct").style.display = hasAcct ? "" : "none";
  if (hasAcct) fillAcctSelect(el("fDebtAcct"), finMainAcct() && finMainAcct().id);
  setDebtDir(d ? d.dir : (dir || debtView.dir));
  renderDebtCats();
  el("debtModalOverlay").classList.add("open");
  el("fDebtWho").focus();
}
function closeDebtModal() { el("debtModalOverlay").classList.remove("open"); }
function submitDebt(e) {
  e.preventDefault();
  var who = el("fDebtWho").value.trim(), name = el("fDebtName").value.trim(), amount = parseFloat(el("fDebtAmount").value);
  if (!who) { el("fDebtWho").focus(); return; }
  if (!(amount > 0)) { el("fDebtAmount").focus(); return; }
  var rec = { id: debtDraft.id || uid(), kind: "debt", dir: debtDraft.dir, who: who, name: name || who, amount: amount, date: el("fDebtDate").value || todayStr(), cat: debtDraft.cat };
  var i = fin.items.findIndex(function (x) { return x.id === rec.id; });
  if (i >= 0) fin.items[i] = rec; else fin.items.push(rec);
  // "they owe me": the money I already paid out is booked as an expense now (unless I untick it)
  if (i < 0 && rec.dir === "owed" && el("fDebtRecord").checked) {
    var tx = { id: uid(), kind: "tx", type: "expense", amount: amount, date: rec.date, cat: rec.cat, note: t("debtRecordNote", { who: who, name: rec.name }) };
    if (finAccts().length) tx.acct = el("fDebtAcct").value;
    fin.items.push(tx);
  }
  debtView.dir = rec.dir;
  if (typeof homeShow === "function" && homePrefs.hidden.indexOf("fin-debt") !== -1) { finSave(); homeShow("fin-debt"); } 
  finSave(); closeDebtModal(); finRenderAll();
  showToast(t("debtSaved"));
}
function deleteDebt() {
  if (!debtDraft.id || !confirm(t("debtDeleteConfirm"))) return;
  fin.items = fin.items.filter(function (x) { return x.id !== debtDraft.id; });
  finSave(); closeDebtModal(); finRenderAll();
}
// ---- settle (all items of one person, oldest first, or a single item) ----
function openDebtPay(ids, dir, who) {
  var list = ids.map(function (id) { return fin.items.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
  if (!list.length) return;
  debtPay = { ids: ids, dir: dir, who: who };
  var left = list.reduce(function (s, d) { return s + finDebtLeft(d); }, 0);
  el("debtPayTitle").textContent = t(dir === "owe" ? "debtPayTitle" : "debtRecvTitle", { who: who });
  el("debtPaySum").textContent = list.map(function (d) { return d.name; }).join(" · ") + "  (" + t("debtPayHint", { n: money(left) }) + ")";
  el("fDebtPayAmount").value = left; el("fDebtPayAmount").max = left;
  el("fDebtPayDate").value = todayStr();
  var hasAcct = finAccts().length > 0;
  el("debtPayAcctRow").hidden = !hasAcct;
  el("debtPayAcctLabel").textContent = t(dir === "owe" ? "debtPayFrom" : "debtRecvTo");
  if (hasAcct) fillAcctSelect(el("fDebtPayAcct"), finMainAcct() && finMainAcct().id);
  el("debtPayOverlay").classList.add("open");
  el("fDebtPayAmount").focus();
}
function closeDebtPay() { el("debtPayOverlay").classList.remove("open"); }
function submitDebtPay(e) {
  e.preventDefault();
  var amt = parseFloat(el("fDebtPayAmount").value) || 0;
  var list = debtPay.ids.map(function (id) { return fin.items.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean)
    .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  var cap = list.reduce(function (s, d) { return s + finDebtLeft(d); }, 0);
  amt = Math.min(amt, cap);
  if (!(amt > 0)) { el("fDebtPayAmount").focus(); return; }
  var date = el("fDebtPayDate").value || todayStr(), owe = debtPay.dir === "owe", rest = amt;
  list.forEach(function (d) {
    if (rest <= 0) return;
    var part = Math.min(rest, finDebtLeft(d)); if (part <= 0) return;
    rest -= part;
    var tx = { id: uid(), kind: "tx", type: owe ? "expense" : "income", amount: Math.round(part * 100) / 100, date: date, cat: owe ? d.cat : "cat-refund",
      note: t(owe ? "debtPayNote" : "debtRecvNote", { who: d.who, name: d.name }), debt: d.id };
    if (finAccts().length) tx.acct = el("fDebtPayAcct").value;
    fin.items.push(tx);
  });
  finSave(); closeDebtPay(); finRenderAll();
  showToast(t("debtSaved"));
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
      return '<td class="' + (k === nowKey ? "cur" : "") + (r.type === "income" && st === "due" ? " inc-cell" : "") + '">' + c + "</td>";
    }).join("");
    var note = r.count > 0 ? ' <small>' + escapeHtml(t("recInst", { n: r.count })) + "</small>" : "";
    return '<tr class="rg-row' + (r.invest ? " inv" : "") + (r.cat ? " has-cat" : "") + '" ' + recCatStyle(r) + ' data-recedit="' + r.id + '" tabindex="0"><td class="rg-item">' + (r.invest ? svgIcon("chart") : "") + escapeHtml(r.name) + note + "</td>" + cells + '<td class="rg-y">' + recMoney(sum) + "</td></tr>";
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
    if (r.cat && finCatById(r.cat)) sub = (sub ? sub + " · " : "") + finCatName(finCatById(r.cat));
    var rc = r.cat ? finCatById(r.cat) : null;
    return '<button type="button" class="frow rec-item' + (r.invest ? " inv" : "") + (rc ? " has-cat" : "") + '" ' + recCatStyle(r) + ' data-recedit="' + r.id + '"><span class="frow-dot" style="background:' + (rc ? finCatColor(rc) : r.type === "income" ? "var(--ok-ink)" : r.invest ? "#d9b53a" : "var(--text-faint)") + '"></span>' +
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

// the row's text takes its category colour (CSS softens it so every colour stays readable)
function recCatStyle(r) {
  var c = r.cat ? finCatById(r.cat) : null;
  return c ? 'style="--rc:' + finCatColor(c) + '"' : "";
}
function renderRecCats() {
  var cats = finCats(recDraft.type === "income" ? "income" : "expense");
  if (!cats.some(function (c) { return c.id === recDraft.cat; })) recDraft.cat = "";
  el("recCatChips").innerHTML = cats.map(function (c) {
    return '<button type="button" class="cat-chip' + (c.id === recDraft.cat ? " on" : "") + '" data-recpick="' + c.id + '"><i style="background:' + finCatColor(c) + '"></i>' + escapeHtml(finCatName(c)) + "</button>";
  }).join("");
}
// ---- recurring modal ----
function setRecType(type) {
  recDraft.type = type;
  Array.prototype.forEach.call(document.querySelectorAll("[data-rectype]"), function (b) {
    var on = b.getAttribute("data-rectype") === type;
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  el("recInvestRow").hidden = type === "income";
  renderRecCats();
}
function openRecModal(id, type) {
  var r = id ? finRecs().filter(function (x) { return x.id === id; })[0] : null;
  recDraft.id = r ? r.id : null;
  recDraft.cat = r && r.cat ? r.cat : "";
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
    invest: recDraft.type !== "income" && el("fRecInvest").checked, cat: recDraft.cat || "" };
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
  if ((b = e.target.closest("[data-instedit]"))) { openTxModal(b.getAttribute("data-instedit"), "expense"); return true; }
  if ((b = e.target.closest("[data-debtnew]"))) { openDebtModal(null); return true; }
  if ((b = e.target.closest("[data-debtpay]"))) { e.stopPropagation(); var dd = fin.items.filter(function (x) { return x.id === b.getAttribute("data-debtpay"); })[0]; if (dd) openDebtPay([dd.id], dd.dir, dd.who); return true; }
  if ((b = e.target.closest("[data-debtpayall]"))) {
    var who = b.getAttribute("data-debtpayall"), g = debtGroups(debtView.dir).filter(function (x) { return x.who === who; })[0];
    if (g) openDebtPay(g.items.map(function (d) { return d.id; }), debtView.dir, g.who);
    return true;
  }
  if ((b = e.target.closest("[data-debtedit]"))) { openDebtModal(b.getAttribute("data-debtedit")); return true; }
  if ((b = e.target.closest("[data-debtdir-view]"))) { debtView.dir = b.getAttribute("data-debtdir-view"); renderFinDebt(); return true; }
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

function initFinAcc() {
  el("acctColors").addEventListener("click", function (e) { var b = e.target.closest("[data-acctcolor]"); if (b) { accDraft.color = b.getAttribute("data-acctcolor"); renderAcctColors(); } });
  el("closeDebtModal").addEventListener("click", closeDebtModal);
  el("cancelDebtForm").addEventListener("click", closeDebtModal);
  el("debtModalOverlay").addEventListener("click", function (e) { if (e.target === this) closeDebtModal(); });
  el("debtForm").addEventListener("submit", submitDebt);
  el("btnDebtDelete").addEventListener("click", deleteDebt);
  el("debtDirSeg").addEventListener("click", function (e) { var b = e.target.closest("[data-debtdir]"); if (b) setDebtDir(b.getAttribute("data-debtdir")); });
  el("debtCatChips").addEventListener("click", function (e) { var b = e.target.closest("[data-debtcat]"); if (b) { debtDraft.cat = b.getAttribute("data-debtcat"); renderDebtCats(); } });
  el("closeDebtPay").addEventListener("click", closeDebtPay);
  el("cancelDebtPay").addEventListener("click", closeDebtPay);
  el("debtPayOverlay").addEventListener("click", function (e) { if (e.target === this) closeDebtPay(); });
  el("debtPayForm").addEventListener("submit", submitDebtPay);
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
  el("recCatChips").addEventListener("click", function (e) {
    var b = e.target.closest("[data-recpick]"); if (!b) return;
    var id = b.getAttribute("data-recpick");
    recDraft.cat = recDraft.cat === id ? "" : id;        // tap again to clear
    renderRecCats();
  });
  el("recTypeSeg").addEventListener("click", function (e) { var b = e.target.closest("[data-rectype]"); if (b) setRecType(b.getAttribute("data-rectype")); });
  // keyboard: Enter / Space on a card or a grid row
  ["finAccBody", "finRecBody", "finDebtBody"].forEach(function (id) {
    el(id).addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var t0 = e.target;
      if (t0.matches && (t0.matches("[data-accsel]") || t0.matches("tr[data-recedit]") || t0.matches(".iou-r[data-debtedit]"))) { e.preventDefault(); t0.click(); }
    });
  });
  el("txTypeSeg").addEventListener("click", function () { /* account labels follow setTxType */ });
}
