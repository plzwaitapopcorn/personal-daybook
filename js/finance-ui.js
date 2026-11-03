"use strict";
// ---------- Finance: pages, forms, home widgets ----------
var finView = { month: monthKeyOf(new Date()), type: "all", cat: "", acct: "" };
var txDraft = { id: null, instId: "", type: "expense", cat: "", acct: "", to: "" };
var catDraft = { id: null, type: "expense", color: CAT_COLORS[0] };

function yen(n) { return "฿" + money(n); }
function signedYen(r) { return r.type === "transfer" ? yen(r.amount) : (r.type === "income" ? "+" : "−") + yen(r.amount); }
function acctName(id) { var a = finAcctById(id); return a ? a.name : ""; }
function el(id) { return document.getElementById(id); }
function orderRef(id) { return state.orders.find(function (o) { return o.id === id; }) || null; }

// ================= action toast + small dialog =================
var actToastTimer = null;
function showActionToast(msg, actions, ms) {
  el("toastActMsg").textContent = msg;
  var box = el("toastActBtns");
  box.innerHTML = "";
  (actions || []).forEach(function (a) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = a.label;
    b.addEventListener("click", function () { hideActionToast(); a.run(); });
    box.appendChild(b);
  });
  el("toastAct").classList.add("show");
  clearTimeout(actToastTimer);
  actToastTimer = setTimeout(hideActionToast, ms || 7000);
}
function hideActionToast() { clearTimeout(actToastTimer); el("toastAct").classList.remove("show"); }

var payDlgCb = null;
function openPayDialog(opts) {
  el("payDlgTitle").textContent = opts.title;
  var hasAmt = opts.amount != null;
  el("payDlgAmountRow").style.display = hasAmt ? "" : "none";
  el("payDlgAmount").value = hasAmt ? opts.amount : "";
  el("payDlgAmount").required = hasAmt;
  el("payDlgDate").value = opts.date || todayStr();
  payDlgCb = opts.onOk;
  el("payDlgOverlay").classList.add("open");
  (hasAmt ? el("payDlgAmount") : el("payDlgDate")).focus();
}
function closePayDialog() { el("payDlgOverlay").classList.remove("open"); payDlgCb = null; }

// The balance of an order was just marked paid: say so, and let the user fix the date or take it back.
function offerBalanceUndo(order, info, oldStatus, oldPaid) {
  var id = order.id;
  showActionToast(t("finBalanceRecorded", { amount: money(info.amount) }), [
    { label: t("finChangeDate"), run: function () {
        var o = orderRef(id); if (!o) return;
        openPayDialog({ title: t("finBalanceDateTitle"), amount: null, date: o.paidFullDate, onOk: function (v) {
          o.paidFullDate = v.date || todayStr(); saveData(); renderAll(); finRenderAll(); showToast(t("toastUpdated"));
        } });
      } },
    { label: t("finUndo"), run: function () {
        var o = orderRef(id); if (!o) return;
        o.status = oldStatus;
        if (oldPaid) o.paidFullDate = oldPaid; else delete o.paidFullDate;
        saveData(); renderAll(); finRenderAll(); showToast(t("finUndone"));
      } }
  ], 8000);
}

// ================= order detail: payments + refund =================
var PAY_KIND_KEY = { paid: "finKindPaid", deposit: "finKindDeposit", balance: "finKindBalance", full: "finKindFull", refund: "finKindRefund" };
function finBindDetail(o) {
  var body = el("detailBody");
  var pays = orderPayments(o);
  var canRefund = o.status === "cancelled" && orderPaidTotal(o) > 0 && !o.refund;
  if (!pays.length && !canRefund) return;
  var html = '<div class="detail-pays"><div class="k">' + escapeHtml(t("finPaymentsTitle")) + "</div>";
  pays.forEach(function (r) {
    html += '<div class="pay-line"><span>' + escapeHtml(t(PAY_KIND_KEY[r.kind] || "finKindPaid")) + '</span><span class="pay-d">' + escapeHtml(formatDateLong(r.date)) +
      '</span><b class="' + (r.type === "income" ? "up" : "") + '">' + signedYen(r) + "</b>" +
      (r.kind === "balance" ? '<button type="button" class="link-btn" data-paydate="1">' + escapeHtml(t("finChangeDate")) + "</button>" : "") +
      (r.kind === "refund" ? '<button type="button" class="link-btn" data-refunddel="1">' + escapeHtml(t("finRefundRemove")) + "</button>" : "") + "</div>";
  });
  if (canRefund) html += '<button type="button" class="btn-secondary pay-refund" data-refund="1">' + escapeHtml(t("finRefundBtn")) + "</button>";
  html += "</div>";
  body.insertAdjacentHTML("beforeend", html);
  var box = body.querySelector(".detail-pays");
  box.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var ord = orderRef(o.id); if (!ord) return;
    if (b.hasAttribute("data-paydate")) {
      openPayDialog({ title: t("finBalanceDateTitle"), amount: null, date: ord.paidFullDate || ord.purchaseDate, onOk: function (v) {
        ord.paidFullDate = v.date || todayStr(); saveData(); renderAll(); finRenderAll(); openDetailModal(ord.id);
      } });
    } else if (b.hasAttribute("data-refund")) {
      openPayDialog({ title: t("finRefundTitle"), amount: orderPaidTotal(ord), date: todayStr(), onOk: function (v) {
        var amt = Number(v.amount) || 0; if (amt <= 0) return;
        ord.refund = { amount: amt, date: v.date || todayStr() }; saveData(); renderAll(); finRenderAll(); openDetailModal(ord.id);
        showToast(t("finRefundSaved"));
      } });
    } else if (b.hasAttribute("data-refunddel")) {
      delete ord.refund; saveData(); renderAll(); finRenderAll(); openDetailModal(ord.id);
    }
  });
}

// ================= transaction modal =================
function txCatsFor(type) { return finCats(type); }
function renderTxCats() {
  var cats = txCatsFor(txDraft.type);
  if (!cats.some(function (c) { return c.id === txDraft.cat; })) txDraft.cat = cats.length ? cats[0].id : "";
  el("txCatChips").innerHTML = cats.map(function (c) {
    return '<button type="button" class="cat-chip' + (c.id === txDraft.cat ? " on" : "") + '" data-catpick="' + c.id + '"><i style="background:' + finCatColor(c) + '"></i>' + escapeHtml(finCatName(c)) + "</button>";
  }).join("");
}
function fillAcctSelect(sel, value, exceptId) {
  sel.innerHTML = finAccts().map(function (a) {
    return '<option value="' + a.id + '"' + (a.id === value ? " selected" : "") + ">" + escapeHtml(a.name) + "</option>";
  }).join("");
  if (value) sel.value = value;
}
// ---- instalment block (credit-card expenses) ----
var INST_CHOICES = [3, 4, 6, 10, 12];
function txInstAvailable() {
  var a = finAcctById(el("fTxAcct").value);
  return txDraft.type === "expense" && !!a && a.type === "card" && (txDraft.instId || !txDraft.id);
}
function txInstOn() { return el("fTxInst").checked && txInstAvailable(); }
function updateTxInst() {
  var show = txInstAvailable();
  el("txInstRow").hidden = !show;
  el("fTxInst").disabled = !!txDraft.instId;
  el("txInstBody").hidden = !(show && el("fTxInst").checked);
  if (!show || !el("fTxInst").checked) return;
  var n = Math.max(2, parseInt(el("fTxInstN").value, 10) || 2), rate = parseFloat(el("fTxInstRate").value) || 0;
  var total = parseFloat(el("fTxAmount").value) || 0;
  el("txInstChips").innerHTML = INST_CHOICES.map(function (c) {
    return '<button type="button" class="chip' + (c === n ? " active" : "") + '" data-instn="' + c + '">' + c + "</button>";
  }).join("");
  var per = instPerMonth(total, n, rate);
  var sum = "<b>" + escapeHtml(t("instSummary", { per: money(per), n: n, r: rate })) + "</b>";
  var probe = { id: "probe", acct: el("fTxAcct").value, total: total, months: n, rate: rate, start: el("fTxDate").value || todayStr(), name: "", cat: "" };
  var rows = instRows(probe);
  if (total > 0 && rows.length) sum += "<br>" + escapeHtml(t("instFirst", { a: shortDate(rows[0].date), b: shortDate(rows[rows.length - 1].date) }));
  el("txInstSum").innerHTML = sum;
}
function setTxType(type) {
  txDraft.type = type;
  Array.prototype.forEach.call(document.querySelectorAll("[data-txtype]"), function (b) {
    var on = b.getAttribute("data-txtype") === type;
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  var tr = type === "transfer";
  el("txModalTitle").textContent = t(type === "income" ? "finAddIncome" : tr ? "finAddTransfer" : "finAddExpense");
  el("txCatRow").hidden = tr;
  el("txToRow").hidden = !tr;
  el("txAcctLabel").textContent = t(tr ? "finTransferFrom" : "finAccount");
  if (!tr) renderTxCats();
  updateTxInst();
}
// opts: { acct, to, amount, note } presets (used by "pay card"). `id` may be a tx or an instalment plan.
function openTxModal(id, type, opts) {
  opts = opts || {};
  var x = id ? fin.items.find(function (i) { return i.id === id && (i.kind === "tx" || i.kind === "inst"); }) : null;
  var isInst = !!(x && x.kind === "inst");
  var hasAcct = finAccts().length > 0, main = finMainAcct();
  txDraft.id = x ? x.id : null;
  txDraft.instId = isInst ? x.id : "";
  txDraft.cat = x ? x.cat : "";
  el("txSegTransfer").style.display = finAccts().length > 1 && !isInst ? "" : "none";
  el("txAcctRow").hidden = !hasAcct;
  if (hasAcct) {
    fillAcctSelect(el("fTxAcct"), x ? (x.acct || (main && main.id)) : (opts.acct || (main && main.id)));
    fillAcctSelect(el("fTxTo"), x && !isInst ? x.to : (opts.to || ""));
    if (!x && !opts.to) { // default destination = first account that is not the source
      var other = finAccts().filter(function (a) { return a.id !== el("fTxAcct").value; })[0];
      if (other) el("fTxTo").value = other.id;
    }
  }
  el("fTxAmount").value = x ? (isInst ? x.total : x.amount) : (opts.amount != null ? opts.amount : "");
  el("fTxDate").value = x ? (isInst ? x.start : x.date) : todayStr();
  el("fTxNote").value = x ? (isInst ? x.name : (x.note || "")) : (opts.note || "");
  el("fTxInst").checked = isInst;
  el("fTxInstN").value = isInst ? x.months : 10;
  el("fTxInstRate").value = isInst && x.rate ? x.rate : "";
  el("btnTxDelete").style.display = x ? "inline-block" : "none";
  setTxType(x ? "expense" : (type || "expense"));
  if (x) el("txModalTitle").textContent = t(isInst ? "instEdit" : "finEditRecord");
  el("txModalOverlay").classList.add("open");
  el("fTxAmount").focus();
}
function closeTxModal() { el("txModalOverlay").classList.remove("open"); }
function submitTx(e) {
  e.preventDefault();
  var amount = parseFloat(el("fTxAmount").value);
  if (!(amount > 0)) { el("fTxAmount").focus(); return; }
  var tr = txDraft.type === "transfer", hasAcct = finAccts().length > 0;
  var date = el("fTxDate").value || todayStr();
  if (txInstOn()) {
    var months = Math.min(60, Math.max(2, parseInt(el("fTxInstN").value, 10) || 2));
    var plan = { id: txDraft.instId || uid(), kind: "inst", acct: el("fTxAcct").value, name: el("fTxNote").value.trim() || finCatName(finCatById(txDraft.cat)),
      total: amount, months: months, rate: parseFloat(el("fTxInstRate").value) || 0, start: date, cat: txDraft.cat };
    var pi = fin.items.findIndex(function (x) { return x.id === plan.id; });
    if (pi >= 0) fin.items[pi] = plan; else fin.items.push(plan);
    if (typeof accView !== "undefined") accView.sel = plan.acct;
    finView.month = date.slice(0, 7);
    finSave(); closeTxModal(); finRenderAll(); renderHome();
    showToast(t(pi >= 0 ? "toastUpdated" : "finAdded"));
    return;
  }
  var rec = { id: txDraft.id || uid(), kind: "tx", type: txDraft.type, amount: amount, date: date,
    cat: tr ? "" : txDraft.cat, note: el("fTxNote").value.trim() };
  if (hasAcct) rec.acct = el("fTxAcct").value;
  if (tr) {
    rec.to = el("fTxTo").value;
    if (!rec.to || rec.to === rec.acct) { alert(t("finTransferSame")); return; }
  }
  var old = txDraft.id ? fin.items.find(function (x) { return x.id === txDraft.id; }) : null;
  if (old && old.debt) rec.debt = old.debt;      // a debt settlement keeps its link when edited
  var i = fin.items.findIndex(function (x) { return x.id === rec.id; });
  if (i >= 0) fin.items[i] = rec; else fin.items.push(rec);
  finView.month = rec.date.slice(0, 7);
  finSave(); closeTxModal(); finRenderAll(); renderHome();
  showToast(t(i >= 0 ? "toastUpdated" : "finAdded"));
}

// ================= category modal =================
function renderCatColors() {
  el("catColors").innerHTML = CAT_COLORS.map(function (c) {
    return '<button type="button" class="color-dot' + (c === catDraft.color ? " active" : "") + '" data-catcolor="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>';
  }).join("");
}
function setCatType(type) {
  catDraft.type = type;
  Array.prototype.forEach.call(document.querySelectorAll("[data-cattype]"), function (b) {
    var on = b.getAttribute("data-cattype") === type;
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  el("catBudgetRow").style.display = type === "expense" ? "" : "none";
}
function openCatModal(id, type) {
  var c = id ? finCatById(id) : null;
  catDraft.id = c ? c.id : null;
  catDraft.color = c ? finCatColor(c) : CAT_COLORS[(finCats().length) % CAT_COLORS.length];
  el("catModalTitle").textContent = t(c ? "finCatEdit" : "finCatNew");
  el("fCatName").value = c ? finCatName(c) : "";
  el("fCatName").placeholder = t("finCatNamePh");
  el("fCatBudget").value = c && c.budget ? c.budget : "";
  el("catTypeRow").style.display = c ? "none" : "";
  el("btnCatDelete").style.display = c ? "inline-block" : "none";
  setCatType(c ? c.type : (type || "expense"));
  renderCatColors();
  el("catModalOverlay").classList.add("open");
  el("fCatName").focus();
}
function closeCatModal() { el("catModalOverlay").classList.remove("open"); }
function submitCat(e) {
  e.preventDefault();
  var name = el("fCatName").value.trim();
  var cur = catDraft.id ? finCatById(catDraft.id) : null;
  if (!name) { el("fCatName").focus(); return; }
  var budget = catDraft.type === "expense" ? (parseFloat(el("fCatBudget").value) || 0) : 0;
  if (cur) {
    // a default category keeps using its translated name until the user really renames it
    if (!(cur.dk && name === finCatName(cur))) cur.name = name;
    cur.color = catDraft.color; cur.budget = budget;
  } else {
    var maxSort = finCats().reduce(function (m, c) { return Math.max(m, c.sort || 0); }, 0);
    fin.items.push({ id: uid(), kind: "cat", type: catDraft.type, name: name, color: catDraft.color, budget: budget, sort: maxSort + 1 });
  }
  finSave(); closeCatModal(); finRenderAll();
  showToast(t("toastUpdated"));
}
function deleteCat() {
  var c = catDraft.id ? finCatById(catDraft.id) : null;
  if (!c || !confirm(t("finCatDeleteConfirm"))) return;
  fin.items = fin.items.filter(function (x) { return x.id !== c.id; });
  finSave(); closeCatModal(); finRenderAll();
}

// ================= pages =================
function monthNavHtml() {
  var isNow = finView.month === monthKeyOf(new Date());
  return '<div class="fin-monthnav"><button type="button" class="icon-toggle" data-fm="-1" title="' + escapeHtml(t("finPrevMonth")) + '" aria-label="' + escapeHtml(t("finPrevMonth")) + '">' + svgIcon("chev-l") + "</button>" +
    "<b>" + escapeHtml(monthLabelOf(finView.month)) + '</b><button type="button" class="icon-toggle" data-fm="1" title="' + escapeHtml(t("finNextMonth")) + '" aria-label="' + escapeHtml(t("finNextMonth")) + '">' + svgIcon("chev-r") + "</button>" +
    (isNow ? "" : '<button type="button" class="icon-toggle" data-fm="now" title="' + escapeHtml(t("finThisMonth")) + '" aria-label="' + escapeHtml(t("finThisMonth")) + '">' + svgIcon("calendar") + "</button>") + "</div>";
}
function addButtonsHtml() {
  return '<div class="fin-addbtns"><button type="button" class="btn-ghost-sm" data-finadd="income">' + svgIcon("arrow-in") + "<span>" + escapeHtml(t("finIncome")) + "</span></button>" +
    '<button type="button" class="btn-primary" data-finadd="expense">' + svgIcon("plus") + "<span>" + escapeHtml(t("finExpense")) + "</span></button></div>";
}
function rowKindLabel(r) { return r.src === "order" ? t(PAY_KIND_KEY[r.kind] || "finKindPaid") : ""; }
// title / subtitle / dot colour of a ledger row (shared by the list and the Home ledger)
function finRowInfo(r) {
  var c = finCatById(r.cat), multi = finAccts().length > 1;
  var info = { title: r.note || finCatName(c), color: finCatColor(c), icon: "" };
  var sub = escapeHtml(finCatName(c));
  if (r.src === "inst") {
    info.title = r.note;
    sub = escapeHtml(finCatName(c)) + " · " + escapeHtml(t("instProg", { k: r.n, n: r.of }));
    if (multi) sub += " · " + escapeHtml(acctName(finRowAcct(r)));
  } else if (r.type === "transfer") {
    info.title = r.note || t("finTransferRow"); info.color = "var(--text-faint)";
    sub = escapeHtml(acctName(finRowAcct(r)) + " → " + acctName(r.to));
  } else if (r.src === "order") {
    sub = '<span class="frow-src" title="' + escapeHtml(t("finFromOrder")) + '">' + svgIcon("bag") + "</span>" + escapeHtml(rowKindLabel(r));
    if (multi) sub += " · " + escapeHtml(acctName(finRowAcct(r)));
  } else if (multi) sub += " · " + escapeHtml(acctName(finRowAcct(r)));
  info.sub = sub;
  return info;
}
function finRowHtml(r) {
  var i = finRowInfo(r);
  return '<button type="button" class="frow" data-src="' + r.src + '" data-id="' + escapeHtml(r.id) + '"' + (r.orderId ? ' data-order="' + r.orderId + '"' : "") + ">" +
    '<span class="frow-dot" style="background:' + i.color + '"></span>' +
    '<span class="frow-main"><span class="frow-t">' + escapeHtml(i.title) + '</span><span class="frow-s">' + i.sub + "</span></span>" +
    '<span class="frow-r' + (r.type === "income" ? " inc" : r.type === "transfer" ? " xfer" : "") + '">' + signedYen(r) + "</span></button>";
}
// The same row as a line of the Home "today" page
function finLedgerRowHtml(r) {
  var i = finRowInfo(r);
  return '<button type="button" class="frow lrow" data-src="' + r.src + '" data-id="' + escapeHtml(r.id) + '"' + (r.orderId ? ' data-order="' + r.orderId + '"' : "") + ">" +
    '<span class="l-lab">' + escapeHtml(shortDate(r.date)) + "</span>" +
    '<span class="frow-dot l-ico" style="background:' + i.color + '"></span>' +
    '<span class="l-t"><span class="frow-t">' + escapeHtml(i.title) + '</span><span class="l-s frow-s">' + i.sub + "</span></span>" +
    '<span class="l-r frow-r' + (r.type === "income" ? " inc" : r.type === "transfer" ? " xfer" : "") + '">' + signedYen(r) + "</span></button>";
}

function expenseByCat(rows) {
  var spent = {};
  rows.forEach(function (r) { if (r.type === "expense") spent[r.cat] = (spent[r.cat] || 0) + r.amount; });
  return spent;
}
function catBarsHtml(rows, limit) {
  var spent = expenseByCat(rows);
  var items = [];
  finCats("expense").forEach(function (c) { if (spent[c.id] || c.budget > 0) items.push({ c: c, amt: spent[c.id] || 0 }); delete spent[c.id]; });
  var stray = 0; Object.keys(spent).forEach(function (k) { stray += spent[k]; });
  if (stray > 0) items.push({ c: null, amt: stray });
  items.sort(function (a, b) { return b.amt - a.amt; });
  if (limit) items = items.slice(0, limit);
  if (!items.length) return '<div class="hempty">' + escapeHtml(t("finNoSpend")) + "</div>";
  var max = items.reduce(function (m, i) { return Math.max(m, i.amt); }, 0) || 1;
  return '<div class="fbars">' + items.map(function (i) {
    var bud = i.c && i.c.budget > 0 ? i.c.budget : 0;
    var pct = Math.min(100, (bud ? i.amt / bud : i.amt / max) * 100);
    var over = bud && i.amt > bud;
    return '<button type="button" class="fbar' + (over ? " over" : "") + '" data-fcat="' + (i.c ? i.c.id : "") + '">' +
      '<span class="fbar-name"><i style="background:' + finCatColor(i.c) + '"></i>' + escapeHtml(finCatName(i.c)) + "</span>" +
      '<span class="fbar-track"><i style="width:' + pct + "%;background:" + finCatColor(i.c) + '"></i></span>' +
      '<span class="fbar-v">' + yen(i.amt) + (bud ? "<small>/ " + yen(bud) + "</small>" : "") + "</span></button>";
  }).join("") + "</div>";
}
function vsPrevHtml(cur, prev) {
  if (!(prev > 0)) return "";
  var pct = Math.round((cur - prev) / prev * 100);
  if (pct === 0) return escapeHtml(t("finSameAsPrev"));
  return '<span class="' + (pct > 0 ? "dn" : "inc") + '">' + (pct > 0 ? "▲ " : "▼ ") + Math.abs(pct) + "%</span> " + escapeHtml(t("finVsPrev"));
}
function finBalanceHtml(bal) { return '<span class="' + (bal < 0 ? "dn" : bal > 0 ? "pos" : "") + '">' + (bal < 0 ? "−" : "") + yen(Math.abs(bal)) + "</span>"; }

function renderFin() {
  var box = el("finBody"), tools = el("finTools");
  if (!fin.loaded) { box.innerHTML = ""; tools.innerHTML = ""; return; }
  tools.innerHTML = addButtonsHtml();
  var key = finView.month, all = finAllRows();
  var byMonth = {};
  all.forEach(function (r) { var k = r.date ? r.date.slice(0, 7) : ""; if (k) (byMonth[k] = byMonth[k] || []).push(r); });
  var rows = byMonth[key] || [], tot = finTotals(rows), prev = finTotals(byMonth[shiftMonthKey(key, -1)] || []);
  var shown = rows.filter(function (r) {
    return (finView.type === "all" || r.type === finView.type) && (!finView.acct || finRowAcct(r) === finView.acct || r.to === finView.acct) && (!finView.cat || (finView.cat === "__none" ? !finCatById(r.cat) : r.cat === finView.cat));
  });

  // ---- filter row: month · type · category (icons, same pattern as the orders toolbar) ----
  var catOpts = '<option value="">' + escapeHtml(t("finAllCats")) + "</option>" + finCats().map(function (c) {
    return '<option value="' + c.id + '"' + (finView.cat === c.id ? " selected" : "") + ">" + escapeHtml(finCatName(c)) + "</option>";
  }).join("");
  var typeBtns = [["all", "all", "chipAll"], ["expense", "arrow-out", "finExpense"], ["income", "arrow-in", "finIncome"]].map(function (k) {
    return '<button type="button" class="icon-toggle' + (finView.type === k[0] ? " is-active" : "") + '" data-ftype="' + k[0] + '" title="' + escapeHtml(t(k[2])) + '" aria-label="' + escapeHtml(t(k[2])) + '">' + svgIcon(k[1]) + "</button>";
  }).join("");
  var acctOpts = "";
  if (finAccts().length > 1) {
    acctOpts = '<div class="select-wrap' + (finView.acct ? " is-active" : "") + '" title="' + escapeHtml(t("finFilterAcctTitle")) + '">' + svgIcon("bank") +
      '<select class="field-select" id="finAcctSel" aria-label="' + escapeHtml(t("finFilterAcctTitle")) + '"><option value="">' + escapeHtml(t("finAllAccts")) + "</option>" +
      finAccts().map(function (a) { return '<option value="' + a.id + '"' + (finView.acct === a.id ? " selected" : "") + ">" + escapeHtml(a.name) + "</option>"; }).join("") + "</select></div>";
  }
  var html = finSubnavHtml("fin") + '<div class="fin-filters">' + monthNavHtml() + '<span class="sp"></span><div class="fin-types">' + typeBtns + "</div>" + acctOpts +
    '<div class="select-wrap' + (finView.cat ? " is-active" : "") + '" title="' + escapeHtml(t("finFilterCatTitle")) + '">' + svgIcon("tag") +
    '<select class="field-select" id="finCatSel" aria-label="' + escapeHtml(t("finFilterCatTitle")) + '">' + catOpts + "</select></div></div>";
  if (finView.cat) {
    var fc = finCatById(finView.cat);
    html += '<button type="button" class="fchip" data-fcat-clear title="' + escapeHtml(t("finClearFilter")) + '"><i style="background:' + finCatColor(fc) + '"></i>' +
      escapeHtml(finCatName(fc)) + svgIcon("close") + "</button>";
  }

  // ---- list (left) ----
  var list = '<section class="fin-list">';
  if (!shown.length) list += '<div class="hempty wide">' + escapeHtml(t("finNoRows")) + "</div>";
  else {
    var groups = [], cur = null;
    finSortRows(shown).forEach(function (r) {
      if (!cur || cur.date !== r.date) { cur = { date: r.date, rows: [], net: 0 }; groups.push(cur); }
      cur.rows.push(r); if (r.type !== "transfer") cur.net += (r.type === "income" ? 1 : -1) * r.amount;
    });
    groups.forEach(function (g) {
      list += '<div class="fin-day"><span>' + escapeHtml(formatDateLong(g.date)) + '</span><span class="' + (g.net < 0 ? "dn" : g.net > 0 ? "pos" : "") + '">' + (g.net < 0 ? "−" : "+") + yen(Math.abs(g.net)) + "</span></div>" +
        '<div class="box fin-box">' + g.rows.map(finRowHtml).join("") + "</div>";
    });
  }
  list += "</section>";

  // ---- summary + side cards (right on wide screens) ----
  var sum = '<section class="box fin-sumcard">' +
    '<div class="kv"><span class="kv-l">' + svgIcon("arrow-in") + escapeHtml(t("finIncome")) + '</span><b class="inc">' + yen(tot.income) + "</b></div>" +
    '<div class="kv"><span class="kv-l">' + svgIcon("arrow-out") + escapeHtml(t("finExpense")) + '</span><b class="exp">' + yen(tot.expense) + "</b></div>" +
    (prev.expense > 0 ? '<div class="kv-sub">' + vsPrevHtml(tot.expense, prev.expense) + "</div>" : "") +
    '<div class="kv kv-left"><span class="kv-l">' + svgIcon("wallet") + escapeHtml(t("finLeft")) + "</span><b>" + finBalanceHtml(tot.balance) + "</b></div></section>";
  var months = [], max = 1;
  for (var i = 5; i >= 0; i--) {
    var mk = shiftMonthKey(key, -i), tt = finTotals(byMonth[mk] || []);
    months.push({ key: mk, inc: tt.income, exp: tt.expense });
    max = Math.max(max, tt.income, tt.expense);
  }
  var chart = '<div class="fchart">' + months.map(function (m) {
    return '<button type="button" class="fcol' + (m.key === key ? " on" : "") + '" data-fmset="' + m.key + '"><span class="fcol-bars">' +
      '<i class="inc" style="height:' + Math.round(m.inc / max * 100) + '%"></i><i class="exp" style="height:' + Math.round(m.exp / max * 100) + '%"></i></span>' +
      '<span class="fcol-l">' + escapeHtml(monthLabelOf(m.key, true)) + "</span></button>";
  }).join("") + "</div>";
  var more = '<section class="box fin-more"><h4 class="fin-h">' + svgIcon("tag") + escapeHtml(t("finByCategory")) + "</h4>" + catBarsHtml(rows) +
    '<h4 class="fin-h">' + svgIcon("chart") + escapeHtml(t("finTrend")) + "</h4>" + chart + "</section>";

  box.innerHTML = html + '<div class="fin-layout">' + list + sum + more + "</div>";
}

function renderFinCats() {
  var box = el("finCatsBody");
  if (!fin.loaded) { box.innerHTML = ""; return; }
  function sec(type) {
    var cats = finCats(type);
    return '<section class="fin-catsec"><div class="fin-cathead"><h3>' + svgIcon(type === "expense" ? "arrow-out" : "arrow-in") + escapeHtml(t(type === "expense" ? "finExpense" : "finIncome")) +
      '</h3><button type="button" class="icon-toggle" data-catnew="' + type + '" title="' + escapeHtml(t("finCatNew")) + '" aria-label="' + escapeHtml(t("finCatNew")) + '">' + svgIcon("plus") + "</button></div>" +
      '<div class="box fin-box">' + cats.map(function (c) {
        return '<button type="button" class="frow" data-catedit="' + c.id + '"><span class="frow-dot" style="background:' + finCatColor(c) + '"></span>' +
          '<span class="frow-main"><span class="frow-t">' + escapeHtml(finCatName(c)) + "</span>" +
          (type === "expense" ? '<span class="frow-s">' + escapeHtml(c.budget > 0 ? t("finBudgetLine", { n: money(c.budget) }) : t("finNoBudget")) + "</span>" : "") +
          '</span><span class="frow-r">' + svgIcon("chev-r") + "</span></button>";
      }).join("") + "</div></section>";
  }
  box.innerHTML = finSubnavHtml("fin-cats") + '<p class="fin-hint">' + escapeHtml(t("finCatsHint")) + '</p><div class="fin-catcols">' + sec("expense") + sec("income") + "</div>";
}

var FIN_PAGES = ["fin", "fin-acc", "fin-rec", "fin-debt", "fin-cats"];
function finSubnavHtml(page) {
  var items = [["fin", "wallet", "navFinList"], ["fin-acc", "bank", "navFinAcc"], ["fin-rec", "repeat", "navFinRec"], ["fin-debt", "users", "navFinDebt"], ["fin-cats", "tag", "navFinCats"]];
  return '<nav class="fin-subnav" aria-label="' + escapeHtml(t("navGroupFinance")) + '">' + items.map(function (i) {
    return '<a class="chip' + (i[0] === page ? " active" : "") + '" href="#/' + i[0] + '"' + (i[0] === page ? ' aria-current="page"' : "") + ">" + svgIcon(i[1]) + "<span>" + escapeHtml(t(i[2])) + "</span></a>";
  }).join("") + "</nav>";
}
function finRenderPage(page) {
  if (page === "fin") renderFin();
  else if (page === "fin-cats") renderFinCats();
  else if (page === "fin-acc") renderFinAcc();
  else if (page === "fin-rec") renderFinRec();
  else if (page === "fin-debt") renderFinDebt();
}
function finRenderAll() {
  if (FIN_PAGES.indexOf(currentPageId) !== -1) finRenderPage(currentPageId);
  if (currentPageId === "schedule" && typeof renderPlanner === "function") renderPlanner();
  if (typeof renderHome === "function" && currentPageId === "home") renderHome();
  if (typeof renderNav === "function") renderNav();
}
function finShowCategory(catId) {
  finView.cat = catId || "__none"; finView.type = "expense"; finView.month = monthKeyOf(new Date());
  if (currentPageId === "fin") finRenderAll(); else navigate("fin");
}

// ================= home widgets =================
function finMonthRows() { return finRowsOfMonth(monthKeyOf(new Date())); }
(function registerFinanceWidgets() {
  var spend = { id: "fin-spend", titleKey: "wFinSpend", size: "s", icon: "wallet", render: function (b) {
    var key = monthKeyOf(new Date()), cur = finTotals(finMonthRows()), prev = finTotals(finRowsOfMonth(shiftMonthKey(key, -1)));
    b.innerHTML = '<div class="big">' + yen(cur.expense) + '</div><div class="sub">' + (vsPrevHtml(cur.expense, prev.expense) || escapeHtml(monthLabelOf(key))) + "</div>";
  } };
  var left = { id: "fin-left", titleKey: "wFinLeft", size: "s", icon: "chart", render: function (b) {
    var cur = finTotals(finMonthRows());
    b.innerHTML = '<div class="big">' + finBalanceHtml(cur.balance) + '</div><div class="sub">' +
      escapeHtml(t("finIncomeSub", { n: money(cur.income) })) + "</div>";
  } };
  var cats = { id: "fin-cats", titleKey: "wFinCats", size: "m", more: { page: "fin" }, render: function (b) {
    b.innerHTML = catBarsHtml(finMonthRows(), 5);
  } };
  var recent = { id: "fin-recent", titleKey: "wFinRecent", size: "m", ledger: true, more: { page: "fin" }, render: function (b) {
    var rows = finSortRows(finMonthRows()).slice(0, 5);
    b.innerHTML = rows.length ? rows.map(finLedgerRowHtml).join("") : '<div class="hempty">' + escapeHtml(t("finNoRows")) + "</div>";
  } };
  HOME_WIDGETS.unshift(left); HOME_WIDGETS.unshift(spend);
  var idx = HOME_WIDGETS.findIndex(function (w) { return w.id === "incoming"; });
  HOME_WIDGETS.splice(idx + 1, 0, cats);   // the category pad sits under the incoming board
  var ri = HOME_WIDGETS.findIndex(function (w) { return w.id === "recent-orders"; });
  HOME_WIDGETS.splice(ri, 0, recent);
})();

// ================= wiring =================
function initFinance() {
  QUICK_ADDS.unshift(
    { id: "expense", primary: true, icon: "wallet", labelKey: "finAddExpense", run: function () { openTxModal(null, "expense"); } },
    { id: "income", icon: "arrow-in", labelKey: "finAddIncome", run: function () { openTxModal(null, "income"); } },
    { id: "transfer", icon: "swap", labelKey: "finAddTransfer", hidden: function () { return finAccts().length < 2; }, run: function () { openTxModal(null, "transfer"); } }
  );
  if (typeof initFinAcc === "function") initFinAcc();
  if (typeof initPlanner === "function") initPlanner();
  // modals
  el("closeTxModal").addEventListener("click", closeTxModal);
  el("cancelTxForm").addEventListener("click", closeTxModal);
  el("txModalOverlay").addEventListener("click", function (e) { if (e.target === this) closeTxModal(); });
  el("txForm").addEventListener("submit", submitTx);
  el("txTypeSeg").addEventListener("click", function (e) { var b = e.target.closest("[data-txtype]"); if (b) setTxType(b.getAttribute("data-txtype")); });
  el("fTxInst").addEventListener("change", updateTxInst);
  ["fTxAcct", "fTxAmount", "fTxDate", "fTxInstN", "fTxInstRate"].forEach(function (id) { el(id).addEventListener("input", updateTxInst); el(id).addEventListener("change", updateTxInst); });
  el("txInstChips").addEventListener("click", function (e) { var b = e.target.closest("[data-instn]"); if (b) { el("fTxInstN").value = b.getAttribute("data-instn"); updateTxInst(); } });
  el("txCatChips").addEventListener("click", function (e) { var b = e.target.closest("[data-catpick]"); if (b) { txDraft.cat = b.getAttribute("data-catpick"); renderTxCats(); } });
  el("btnTxDelete").addEventListener("click", function () {
    if (!txDraft.id || !confirm(t(txDraft.instId ? "instDeleteConfirm" : "finDeleteConfirm"))) return;
    fin.items = fin.items.filter(function (x) { return x.id !== txDraft.id; });
    finSave(); closeTxModal(); finRenderAll();
  });
  el("closeCatModal").addEventListener("click", closeCatModal);
  el("cancelCatForm").addEventListener("click", closeCatModal);
  el("catModalOverlay").addEventListener("click", function (e) { if (e.target === this) closeCatModal(); });
  el("catForm").addEventListener("submit", submitCat);
  el("btnCatDelete").addEventListener("click", deleteCat);
  el("catTypeSeg").addEventListener("click", function (e) { var b = e.target.closest("[data-cattype]"); if (b) setCatType(b.getAttribute("data-cattype")); });
  el("catColors").addEventListener("click", function (e) { var b = e.target.closest("[data-catcolor]"); if (b) { catDraft.color = b.getAttribute("data-catcolor"); renderCatColors(); } });
  el("closePayDlg").addEventListener("click", closePayDialog);
  el("cancelPayDlg").addEventListener("click", closePayDialog);
  el("payDlgOverlay").addEventListener("click", function (e) { if (e.target === this) closePayDialog(); });
  el("payDlgForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var cb = payDlgCb, v = { amount: el("payDlgAmount").value, date: el("payDlgDate").value };
    closePayDialog();
    if (cb) cb(v);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeTxModal(); closeCatModal(); closePayDialog(); if (typeof closeAcctModal === "function") { closeAcctModal(); closeRecModal(); closeDebtModal(); closeDebtPay(); } }
  });

  // pages (event delegation on the three containers)
  ["finBody", "finTools", "finCatsBody", "finAccBody", "finAccTools", "finRecBody", "finRecTools", "finDebtBody", "finDebtTools"].forEach(function (id) {
    el(id).addEventListener("click", function (e) {
      var b;
      if ((b = e.target.closest("[data-fm]"))) {
        var d = b.getAttribute("data-fm");
        finView.month = d === "now" ? monthKeyOf(new Date()) : shiftMonthKey(finView.month, parseInt(d, 10));
        finRenderAll(); return;
      }
      if ((b = e.target.closest("[data-fmset]"))) { finView.month = b.getAttribute("data-fmset"); finRenderAll(); return; }
      if ((b = e.target.closest("[data-finadd]"))) { openTxModal(null, b.getAttribute("data-finadd")); return; }
      if ((b = e.target.closest("[data-ftype]"))) { finView.type = b.getAttribute("data-ftype"); finRenderAll(); return; }
      if ((b = e.target.closest("[data-fcat-clear]"))) { finView.cat = ""; finRenderAll(); return; }
      if ((b = e.target.closest("[data-fcat]"))) { var keep = finView.month; finShowCategory(b.getAttribute("data-fcat")); finView.month = keep; finRenderAll(); return; }
      if ((b = e.target.closest("[data-catnew]"))) { openCatModal(null, b.getAttribute("data-catnew")); return; }
      if ((b = e.target.closest("[data-catedit]"))) { openCatModal(b.getAttribute("data-catedit")); return; }
      if ((b = e.target.closest(".frow[data-src]"))) { openFinRow(b); return; }
      if (typeof finAccClick === "function") finAccClick(e);
    });
  });
  el("finBody").addEventListener("change", function (e) {
    if (e.target.id === "finCatSel") { finView.cat = e.target.value; finRenderAll(); }
    if (e.target.id === "finAcctSel") { finView.acct = e.target.value; finRenderAll(); }
  });
  // rows inside home widgets
  el("homeGrid").addEventListener("click", function (e) {
    if (homeEdit) return;
    var b = e.target.closest(".frow[data-src]");
    if (b) openFinRow(b);
    var f = e.target.closest("[data-fcat]");
    if (f) finShowCategory(f.getAttribute("data-fcat"));
  });
}
function openFinRow(b) {
  if (b.getAttribute("data-src") === "order") openDetailModal(b.getAttribute("data-order"));
  else if (b.getAttribute("data-src") === "inst") openTxModal(b.getAttribute("data-id").split(":")[0], "expense");
  else openTxModal(b.getAttribute("data-id"));
}
