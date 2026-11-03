"use strict";
// ---------- Finance: data layer ----------
// Manual records (income / expense) and categories live in their own IndexedDB store ("fin") and sync
// to their own small Drive file, so editing money never re-uploads order photos.
// Payments for orders are NOT stored here: they are derived from the orders (see orderPayments) so
// nothing is typed twice and nothing can drift out of step.

var FIN_LS_KEY = "preorderVault_fin";           // fallback when IndexedDB is unavailable
var FIN_TOMB_KEY = "preorderVault_fintomb";
var FIN_SEEDED_KEY = "preorderVault_finseeded";
var fin = { items: [], loaded: false };
var finPersisted = {};     // id -> signature of the record as last written
var finTs = {};            // id -> updatedAt as last stamped
var finSig = {};           // id -> signature without updatedAt (detects real edits)
var finTombs = {};         // id -> deletion time
var finWriteChain = Promise.resolve();

var CAT_COLORS = ["#1b3fd0", "#1e7a40", "#ee4a2a", "#f7c419", "#b8a0ea", "#f48ba6", "#121212", "#cbc5b3", "#8a8776"];
// Default categories (names come from i18n via `dk`; renaming one stores `name`). updatedAt stays 0 so a
// second device seeding the same defaults never overrides edits made elsewhere.
var FIN_DEFAULT_CATS = [
  { id: "cat-food",      dk: "food",      type: "expense", color: "#b8a0ea" },
  { id: "cat-transport", dk: "transport", type: "expense", color: "#cbc5b3" },
  { id: "cat-home",      dk: "home",      type: "expense", color: "#f7c419" },
  { id: "cat-orders",    dk: "orders",    type: "expense", color: "#ee4a2a" },
  { id: "cat-fun",       dk: "fun",       type: "expense", color: "#121212" },
  { id: "cat-health",    dk: "health",    type: "expense", color: "#f48ba6" },
  { id: "cat-bills",     dk: "bills",     type: "expense", color: "#1b3fd0" },
  { id: "cat-otherx",    dk: "otherx",    type: "expense", color: "#8a8776" },
  { id: "cat-salary",    dk: "salary",    type: "income",  color: "#1e7a40" },
  { id: "cat-side",      dk: "side",      type: "income",  color: "#7fc79a" },
  { id: "cat-refund",    dk: "refund",    type: "income",  color: "#b8a0ea" },
  { id: "cat-otheri",    dk: "otheri",    type: "income",  color: "#cbc5b3" }
];
// The first palette (neon) -> the poster palette. Only touches a default category still wearing its old default colour.
var FIN_OLD_CAT_COLORS = { "cat-food": "#ff953d", "cat-transport": "#3db4ff", "cat-home": "#69ff32", "cat-orders": "#ff4ace", "cat-fun": "#a348ff", "cat-health": "#33d6c0", "cat-bills": "#ffe11d", "cat-otherx": "#9aa0a6", "cat-salary": "#69ff32", "cat-side": "#33d6c0", "cat-refund": "#3db4ff", "cat-otheri": "#9aa0a6" };
function finMigrateCatColors() {
  var changed = false;
  FIN_DEFAULT_CATS.forEach(function (d) {
    var c = fin.items.find(function (x) { return x.kind === "cat" && x.id === d.id; });
    if (c && c.color && c.color.toLowerCase() === FIN_OLD_CAT_COLORS[d.id]) { c.color = d.color; changed = true; }
  });
  if (changed) finSave();
}

// ---- dates ----
function todayStr() {
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function dateOfStamp(ms) {
  var d = new Date(ms || Date.now());
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// ---- local persistence ----
function finStripSig(o) { var c = {}; Object.keys(o).forEach(function (k) { if (k !== "updatedAt") c[k] = o[k]; }); return hashStr(JSON.stringify(c)); }
function finSaveTombs() { try { localStorage.setItem(FIN_TOMB_KEY, JSON.stringify(finTombs)); } catch (e) { /* ignore */ } }
function finInitMaps() {
  finTs = {}; finSig = {}; finPersisted = {};
  fin.items.forEach(function (o) { finTs[o.id] = o.updatedAt || 0; finSig[o.id] = finStripSig(o); finPersisted[o.id] = hashStr(JSON.stringify(o)); });
}
function readFinLS() {
  try { var a = JSON.parse(localStorage.getItem(FIN_LS_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function finValid(x) { return x && typeof x.id === "string" && (x.kind === "tx" || x.kind === "cat" || x.kind === "acct" || x.kind === "rec" || x.kind === "inst" || x.kind === "debt" || x.kind === "evt" || x.kind === "vfold" || x.kind === "vitem" || x.kind === "oproj" || x.kind === "otask" || x.kind === "osess" || x.kind === "oupd" || x.kind === "oset"); }

function finSeedDefaults() {
  var seeded = false;
  try { seeded = !!localStorage.getItem(FIN_SEEDED_KEY); } catch (e) { /* ignore */ }
  if (seeded || fin.items.some(function (x) { return x.kind === "cat"; })) return;
  FIN_DEFAULT_CATS.forEach(function (c, i) {
    fin.items.push({ id: c.id, kind: "cat", type: c.type, dk: c.dk, name: "", color: c.color, budget: 0, sort: i });
  });
  try { localStorage.setItem(FIN_SEEDED_KEY, "1"); } catch (e) { /* ignore */ }
  finInitMapsKeepPersisted();
  finPersist(true);
}
function finInitMapsKeepPersisted() {
  fin.items.forEach(function (o) { if (!(o.id in finSig)) { finTs[o.id] = o.updatedAt || 0; finSig[o.id] = finStripSig(o); } });
}

function loadFinance() {
  var source = (useLocalStorage || !dbHandle)
    ? Promise.resolve(readFinLS())
    : idbGetAll(dbHandle, FIN_STORE).catch(function (e) { console.error("finance read", e); return readFinLS(); });
  return source.then(function (rows) {
    fin.items = rows.filter(finValid);
    try { finTombs = JSON.parse(localStorage.getItem(FIN_TOMB_KEY) || "{}") || {}; } catch (e) { finTombs = {}; }
    finInitMaps();
    finSeedDefaults();
    fin.loaded = true;
    finMigrateCatColors();
  });
}

// Writes whatever changed since the last write (all of it when `force`).
function finPersist(force) {
  if (!fin.loaded && !force) return;
  if (useLocalStorage || !dbHandle) {
    try { localStorage.setItem(FIN_LS_KEY, JSON.stringify(fin.items)); } catch (e) { console.error(e); }
    return;
  }
  var sigs = {}, changed = [];
  fin.items.forEach(function (o) {
    var sig = hashStr(JSON.stringify(o));
    sigs[o.id] = sig;
    if (finPersisted[o.id] !== sig) changed.push(o);
  });
  var removed = Object.keys(finPersisted).filter(function (id) { return !(id in sigs); });
  if (!changed.length && !removed.length) return;
  var changedSigs = changed.map(function (o) { return [o.id, sigs[o.id]]; });
  pendingWrites++;
  finWriteChain = finWriteChain.then(function () {
    return idbWrite(dbHandle, changed, removed, FIN_STORE);
  }).then(function () {
    changedSigs.forEach(function (pair) { finPersisted[pair[0]] = pair[1]; });
    removed.forEach(function (id) { delete finPersisted[id]; });
  }).catch(function (e) {
    console.error("Failed to save finance data", e);
    alert(t("alertSaveFail"));
  }).then(function () { pendingWrites--; });
}

// Stamps updatedAt on changed records and records deletions. Returns true if anything changed.
function finStamp() {
  var now = Date.now(), changed = false, present = {};
  fin.items.forEach(function (o) {
    present[o.id] = true;
    var sig = finStripSig(o);
    if (o.id in finSig && finSig[o.id] === sig) {
      if (finTs[o.id]) o.updatedAt = finTs[o.id]; else delete o.updatedAt;
    } else {
      o.updatedAt = now; finTs[o.id] = now; finSig[o.id] = sig; changed = true;
      if (finTombs[o.id]) { delete finTombs[o.id]; finSaveTombs(); }
    }
  });
  var gone = Object.keys(finSig).filter(function (id) { return !present[id]; });
  if (gone.length) {
    gone.forEach(function (id) { finTombs[id] = now; delete finSig[id]; delete finTs[id]; });
    finSaveTombs(); changed = true;
  }
  return changed;
}

function finSave() {
  if (!fin.loaded) return false;
  var changed = finStamp();
  finPersist();
  if (changed) { finSync.rev++; scheduleFinSync(4000); }
  return true;
}

function finClearAll() {
  var ids = Object.keys(finPersisted);
  fin.items = []; finTombs = {}; finSaveTombs();
  finTs = {}; finSig = {}; finPersisted = {};
  if (!useLocalStorage && dbHandle && ids.length) {
    pendingWrites++;
    finWriteChain = finWriteChain.then(function () { return idbWrite(dbHandle, [], ids, FIN_STORE); })
      .catch(function (e) { console.error(e); }).then(function () { pendingWrites--; });
  }
  try { localStorage.removeItem(FIN_SEEDED_KEY); localStorage.removeItem(FIN_LS_KEY); } catch (e) { /* ignore */ }
  finSeedDefaults();
}

// ---- accessors ----
function finCats(type) {
  return fin.items.filter(function (x) { return x.kind === "cat" && (!type || x.type === type); })
    .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
}
// ---- accounts (bank / credit card / cash) ----
// acct: { kind:"acct", type:"bank"|"card"|"cash", name, color, opening, limit, cutoff, due, main, sort }
// `opening` is signed (a card owing 5,000 has opening -5,000). Balance = opening + everything booked to it.
var ACCT_TYPES = ["bank", "card", "cash"];
var ACCT_COLORS = ["#1b3fd0", "#1e7a40", "#ee4a2a", "#f7c419", "#b8a0ea", "#f48ba6", "#121212", "#cbc5b3"];
// poster fill -> readable text colour on paper (the fill itself reads fine on the dark theme)
var ACCT_INK = { "#f7c419": "#8a6a00", "#b8a0ea": "#6b4fc0", "#f48ba6": "#c43c68", "#cbc5b3": "#615f52" };
function acctFill(a) { return a && ACCT_COLORS.indexOf(a.color) !== -1 ? a.color : "#121212"; }
function acctStyle(a) { var f = acctFill(a); return "--ac:" + f + ";--at:" + (ACCT_INK[f] || f); }
function finAccts() {
  return fin.items.filter(function (x) { return x.kind === "acct"; }).sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
}
function finAcctById(id) {
  for (var i = 0; i < fin.items.length; i++) if (fin.items[i].kind === "acct" && fin.items[i].id === id) return fin.items[i];
  return null;
}
function finMainAcct() {
  var a = finAccts();
  for (var i = 0; i < a.length; i++) if (a[i].main) return a[i];
  return a[0] || null;
}
// The account a row belongs to (rows from before accounts existed fall back to the main one).
function finRowAcct(r) { return (r.acct && finAcctById(r.acct)) ? r.acct : (finMainAcct() ? finMainAcct().id : ""); }
// Net effect of all rows on one account.
function finAcctNet(id) {
  var net = 0;
  finAllRows().forEach(function (r) {
    if (r.type === "transfer") {
      if (finRowAcct(r) === id) net -= r.amount;
      if (r.to === id) net += r.amount;
    } else if (finRowAcct(r) === id) net += (r.type === "income" ? 1 : -1) * r.amount;
  });
  return net;
}
function finAcctBalance(a) { return (Number(a.opening) || 0) + finAcctNet(a.id); }
// Cards: money owed (positive). Others: 0.
function finCardOwed(a) { return Math.max(0, -finAcctBalance(a)); }
// Net worth = everything held minus everything owed on cards.
function finNetWorth() { return finAccts().reduce(function (s, a) { return s + finAcctBalance(a); }, 0) - finDebtTotal("owe") + finDebtTotal("owed"); }
function finDateStr(y, m, d) { return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(Math.min(d, new Date(y, m + 1, 0).getDate())).padStart(2, "0"); }
// Next occurrence (today or later) of day-of-month `day`, as YYYY-MM-DD.
function nextDayOfMonth(day, from) {
  var now = from ? new Date(from + "T00:00:00") : new Date(), y = now.getFullYear(), m = now.getMonth();
  var s = finDateStr(y, m, day);
  if (s < dateOfStamp(now.getTime())) s = finDateStr(m === 11 ? y + 1 : y, (m + 1) % 12, day);
  return s;
}
function daysUntil(dateStr) {
  var a = new Date(todayStr() + "T00:00:00"), b = new Date(dateStr + "T00:00:00");
  return Math.round((b - a) / 86400000);
}
// Spending on a card in its current statement cycle (after the last cut-off, up to today).
function finCardCycle(a) {
  var cut = parseInt(a.cutoff, 10) || 0;
  if (!cut) return null;
  var next = nextDayOfMonth(cut), p = next.split("-"), y = +p[0], m = +p[1] - 1;
  var prev = finDateStr(m === 0 ? y - 1 : y, (m + 11) % 12, cut);
  var spent = 0;
  finAllRows().forEach(function (r) {
    if (r.type === "expense" && finRowAcct(r) === a.id && r.date > prev && r.date <= next) spent += r.amount;
  });
  return { from: prev, to: next, spent: spent };
}

// ---- recurring plan ----
// rec: { kind:"rec", name, type:"income"|"expense", amount, every (months), start "YYYY-MM", count (0 = no end), invest, sort }
function finRecs() { return fin.items.filter(function (x) { return x.kind === "rec"; }).sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); }); }
function monthIndex(key) { var p = key.split("-"); return parseInt(p[0], 10) * 12 + parseInt(p[1], 10) - 1; }
function recEndKey(r) { return r.count > 0 ? shiftMonthKey(r.start, (r.count - 1) * (r.every || 1)) : ""; }
// "due" | "none" | "done" (an instalment plan that has finished)
function recStateIn(r, key) {
  var d = monthIndex(key) - monthIndex(r.start), ev = r.every || 1;
  if (d < 0) return "none";
  if (r.count > 0 && d > (r.count - 1) * ev) return "done";
  return d % ev === 0 ? "due" : "none";
}
function recAmountIn(r, key) { return recStateIn(r, key) === "due" ? (Number(r.amount) || 0) : 0; }
function recTotals(key) {
  var inc = 0, exp = 0, inv = 0;
  finRecs().forEach(function (r) {
    var a = recAmountIn(r, key);
    if (r.type === "income") inc += a; else if (r.invest) inv += a; else exp += a;
  });
  return { income: inc, expense: exp, invest: inv, left: inc - exp - inv };
}

// ---- card instalments ----
// inst: { kind:"inst", acct (card), name, total, months, rate (% per month, flat), start (purchase date), cat, note }
// Each instalment is a real expense on the card dated on the statement it lands in; future ones are not counted yet.
function finInsts(acctId) { return fin.items.filter(function (x) { return x.kind === "inst" && (!acctId || finRowAcct({ acct: x.acct }) === acctId); }); }
function instPerMonth(total, months, rate) {
  var n = Math.max(1, months | 0), r = Number(rate) || 0;
  return Math.round((total / n + total * r / 100) * 100) / 100;
}
function instRows(it) {
  var a = finAcctById(it.acct), cut = a && parseInt(a.cutoff, 10) ? parseInt(a.cutoff, 10) : parseInt((it.start || todayStr()).slice(8, 10), 10);
  var first = nextDayOfMonth(cut, it.start || todayStr()), p = first.split("-"), y = +p[0], m = +p[1] - 1;
  var per = instPerMonth(Number(it.total) || 0, it.months, it.rate), rows = [];
  for (var i = 0; i < (it.months | 0); i++) {
    var mm = m + i, yy = y + Math.floor(mm / 12);
    rows.push({ src: "inst", id: it.id + ":" + i, instId: it.id, type: "expense", amount: per, date: finDateStr(yy, ((mm % 12) + 12) % 12, cut),
      cat: it.cat, note: it.name, acct: it.acct || "", to: "", debt: "", n: i + 1, of: it.months | 0 });
  }
  return rows;
}
// { per, paid (count billed so far), left (amount still to be billed), rows }
function instStatus(it) {
  var today = todayStr(), rows = instRows(it), paid = 0, left = 0;
  rows.forEach(function (r) { if (r.date <= today) paid++; else left += r.amount; });
  return { per: instPerMonth(Number(it.total) || 0, it.months, it.rate), paid: paid, left: left, rows: rows, done: paid >= rows.length, end: rows.length ? rows[rows.length - 1].date : "" };
}
function finInstLeft(acctId) { return finInsts(acctId).reduce(function (s, it) { return s + instStatus(it).left; }, 0); }

// ---- debts (money owed to / by friends; nothing is expense or income until it is settled) ----
// debt: { kind:"debt", dir:"owe"|"owed", who, name, amount, date, cat, note }; settlements are tx records with tx.debt = debt.id
function finDebts(dir) { return fin.items.filter(function (x) { return x.kind === "debt" && (!dir || x.dir === dir); }); }
function finDebtPaid(d) { return finTxs().reduce(function (s, x) { return s + (x.debt === d.id ? Number(x.amount) || 0 : 0); }, 0); }
function finDebtLeft(d) { return Math.max(0, (Number(d.amount) || 0) - finDebtPaid(d)); }
function finDebtTotal(dir) { return finDebts(dir).reduce(function (s, d) { return s + finDebtLeft(d); }, 0); }

function finTxs() { return fin.items.filter(function (x) { return x.kind === "tx"; }); }
function finCatById(id) {
  for (var i = 0; i < fin.items.length; i++) if (fin.items[i].kind === "cat" && fin.items[i].id === id) return fin.items[i];
  return null;
}
function finCatName(c) { return c ? (c.name || (c.dk ? t("cat_" + c.dk) : "")) : t("cat_none"); }
function finCatColor(c) { return c ? (c.color || "#9aa0a6") : "#9aa0a6"; }

// ---- payments derived from orders ----
var PAID_STATUSES = { full: 1, shipping: 1, intransit: 1, received: 1 };
function orderPayments(o) {
  var rows = [];
  if (!o || o.status === "wishlist") return rows;
  var full = Number(o.fullPrice) || 0, dep = Number(o.depositPaid) || 0;
  var pd = o.purchaseDate || dateOfStamp(o.createdAt);
  var name = o.productName || t("noName");
  function add(type, amount, date, kind) {
    if (!(amount > 0)) return;
    rows.push({ src: "order", id: o.id + ":" + kind, orderId: o.id, type: type, amount: amount, date: date,
      cat: type === "income" ? "cat-refund" : "cat-orders", note: name, kind: kind, acct: o.acct || "" });
  }
  if (o.status === "cancelled") {
    var paid = o.paidFullDate ? full : dep;
    add("expense", paid, pd, "paid");
    if (o.refund && Number(o.refund.amount) > 0) add("income", Number(o.refund.amount), o.refund.date || pd, "refund");
  } else if (o.status === "deposit") {
    add("expense", dep, pd, "deposit");
  } else if (dep > 0 && dep < full) {
    add("expense", dep, pd, "deposit");
    add("expense", full - dep, o.paidFullDate || pd, "balance");
  } else {
    add("expense", full, o.paidFullDate || pd, "full");
  }
  return rows;
}
// Amount an order's seller has actually been paid (used by the refund prompt).
function orderPaidTotal(o) {
  return orderPayments(o).reduce(function (s, r) { return s + (r.type === "expense" ? r.amount : 0); }, 0);
}

function finAllRows() {
  var rows = [];
  finTxs().forEach(function (x) {
    rows.push({ src: "tx", id: x.id, type: x.type, amount: Number(x.amount) || 0, date: x.date || "", cat: x.cat, note: x.note || "", acct: x.acct || "", to: x.to || "", debt: x.debt || "" });
  });
  finInsts().forEach(function (it) {
    var today = todayStr();
    instRows(it).forEach(function (r) { if (r.date <= today) rows.push(r); });
  });
  state.orders.forEach(function (o) { orderPayments(o).forEach(function (r) { rows.push(r); }); });
  return rows;
}
function finRowsOfMonth(key) {
  return finAllRows().filter(function (r) { return r.date && r.date.slice(0, 7) === key; });
}
function finTotals(rows) {
  var inc = 0, exp = 0;
  rows.forEach(function (r) { if (r.type === "income") inc += r.amount; else if (r.type !== "transfer") exp += r.amount; });
  return { income: inc, expense: exp, balance: inc - exp };
}
function finSortRows(rows) {
  return rows.slice().sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (a.src === "tx" ? 0 : 1) - (b.src === "tx" ? 0 : 1);
  });
}
function monthKeyOf(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
function shiftMonthKey(key, delta) {
  var p = key.split("-"), d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1 + delta, 1);
  return monthKeyOf(d);
}
function monthLabelOf(key, short) {
  var p = key.split("-"), d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, 1);
  return d.toLocaleDateString(I18N[state.lang].locale, short ? { month: "short" } : { month: "long", year: "numeric" });
}

// ---- order status changes: record when the balance was paid ----
// Mutates `o` (already given its new status). Returns { amount, prevDate } when a balance payment was just
// recorded (so the caller can offer undo / change-date), otherwise null.
function financeOnStatusChange(o, oldStatus) {
  var prev = o.paidFullDate || "";
  if (o.status === "deposit" || o.status === "wishlist") { delete o.paidFullDate; return null; }
  if (PAID_STATUSES[o.status] && oldStatus === "deposit" && !o.paidFullDate) {
    var bal = (Number(o.fullPrice) || 0) - (Number(o.depositPaid) || 0);
    o.paidFullDate = todayStr();
    if (bal > 0) return { amount: bal, prevDate: prev };
  }
  return null;
}


// When the very first account is created, every existing record (manual and order-derived) is booked to it.
function finAssignAllToAcct(id) {
  finTxs().forEach(function (x) { if (!x.acct) x.acct = id; });
  var touched = false;
  state.orders.forEach(function (o) { if (!o.acct) { o.acct = id; touched = true; } });
  if (touched && typeof saveData === "function") saveData();
}
