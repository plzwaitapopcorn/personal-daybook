"use strict";
// ---------- App shell: navigation registry, hash router, quick-add ----------
// To add a feature area later: push an entry into NAV_ITEMS (+ a page <section id="page-xxx"> in index.html),
// optionally a QUICK_ADDS entry, and register its widgets in home.js. Nothing else needs to change.

var NAV_ITEMS = [
  { page: "home",         icon: "home",   labelKey: "navHome",        sideKey: "navHome", tabKey: "navHome",      group: "" },
  // One side tab per area. Sub-pages (children) are reached with the chip row under the page title.
  { page: "fin",          icon: "wallet", labelKey: "navGroupFinance", sideKey: "navFinList", tabKey: "navFinTab",    group: "navGroupFinance", dot: "var(--c-money)",
    children: ["fin-acc", "fin-rec", "fin-debt", "fin-cats"], remember: true },
  { page: "fin-acc",      icon: "bank",   labelKey: "navFinAcc",      group: "navGroupFinance", parent: "fin" },
  { page: "fin-rec",      icon: "repeat", labelKey: "navFinRec",      group: "navGroupFinance", parent: "fin" },
  { page: "fin-debt",     icon: "users",  labelKey: "navFinDebt",     group: "navGroupFinance", parent: "fin" },
  { page: "fin-cats",     icon: "tag",    labelKey: "navFinCats",     group: "navGroupFinance", parent: "fin" },
  { page: "orders",       icon: "bag",    labelKey: "navOrders",      sideKey: "navOrdersTab", tabKey: "navOrdersTab", group: "navGroupOrders", tileKey: "navGroupOrders", dot: "var(--c-orders)",
    count: function () { return state.orders.length; },
    tileSub: function () { return t("tileOrdersSub", { n: state.orders.length }); } },
  { page: "schedule",     icon: "table",  labelKey: "navSchedule",    tabKey: "navSchedule",  group: "navGroupSchedule", dot: "var(--c-sched)" },
  { page: "office",       icon: "briefcase", labelKey: "navOffice",   sideKey: "navOffice", tabKey: "navOffice", group: "navGroupOffice", dot: "var(--c-red)" },
  { page: "vault",        icon: "lock",   labelKey: "navVault",       sideKey: "navVault", tabKey: "navVault", group: "navGroupVault", dot: "#121212" }
];

// Filled in by each feature module (finance-ui.js adds expense / income; the order add button lives here).
var QUICK_ADDS = [
  { id: "order", icon: "bag", labelKey: "addOrderBtn", run: function () { openOrderModal(); } }
];

var PAGE_IDS = ["home", "fin", "fin-acc", "fin-rec", "fin-debt", "fin-cats", "schedule", "orders", "office", "vault", "settings"];
var PAGE_ALIAS = { "fin-overview": "fin", "fin-list": "fin" };   // old bookmarks / links
var currentPageId = "";
var lastSubPage = {};     // area page -> sub-page last opened (so its tab returns there)
function navIsOn(it) { return currentPageId === it.page || (it.children && it.children.indexOf(currentPageId) !== -1); }
function navTarget(it) { return (it.remember && lastSubPage[it.page]) || it.page; }

function pageFromHash() {
  var m = /^#\/([a-z-]+)/.exec(location.hash || "");
  var id = m ? (PAGE_ALIAS[m[1]] || m[1]) : "";
  return PAGE_IDS.indexOf(id) !== -1 ? id : "home";
}

function navigate(page) {
  if (PAGE_IDS.indexOf(page) === -1) page = "home";
  if (pageFromHash() === page && location.hash) { showPage(page); return; }
  location.hash = "#/" + page;     // hashchange -> showPage
}

function showPage(page) {
  if (PAGE_IDS.indexOf(page) === -1) page = "home";
  var changed = page !== currentPageId;
  currentPageId = page;
  NAV_ITEMS.forEach(function (it) {
    if (it.parent && page === it.page) lastSubPage[it.parent] = page;
    else if (it.remember && page === it.page) delete lastSubPage[it.page];
  });
  Array.prototype.forEach.call(document.querySelectorAll(".page"), function (el) {
    el.hidden = el.getAttribute("data-page") !== page;
  });
  renderNav();
  if (changed) {
    window.scrollTo(0, 0);
  }
  if (page === "home" && typeof renderHome === "function") renderHome();
  if ((page === "fin" || page === "fin-acc" || page === "fin-rec" || page === "fin-debt" || page === "fin-cats") && typeof finRenderPage === "function") finRenderPage(page);
  if (page === "schedule" && typeof renderPlanner === "function") renderPlanner();
  if (page === "office" && typeof renderOffice === "function") renderOffice();
  if (page === "vault" && typeof renderVault === "function") renderVault();
  if (page === "orders" && typeof renderAll === "function" && state.loaded) renderGrid();
}

function svgIcon(name) {
  return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
}

function renderNav() {
  var nav = document.getElementById("navMain");
  var tabs = document.getElementById("tabbar");
  if (!nav || !tabs) return;
  var html = "", lastGroup = null;
  NAV_ITEMS.filter(function (it) { return !it.parent; }).forEach(function (it) {
    if (it.group !== lastGroup) {
      lastGroup = it.group;
      if (it.group) html += '<div class="nav-group">' + escapeHtml(t(it.group)) + "</div>";
    }
    var n = it.count ? it.count() : null;
    html += '<a class="nav-item' + (navIsOn(it) ? " on" : "") + '" data-page="' + it.page + '" href="#/' + navTarget(it) + '" title="' + escapeHtml(t(it.labelKey)) + '" aria-label="' + escapeHtml(t(it.labelKey)) + '"' +
      (navIsOn(it) ? ' aria-current="page"' : "") + ">" + svgIcon(it.icon) +
      "<span>" + escapeHtml(t(it.sideKey || it.labelKey)) + "</span>" +
      (n != null ? '<span class="n">' + n + "</span>" : "") + (it.dot ? '<i class="nd" style="background:' + it.dot + '"></i>' : "") + "</a>";
  });
  nav.innerHTML = html;
  var st = document.querySelector("#sidebar .js-settings-btn");
  if (st) st.classList.toggle("on", currentPageId === "settings");

  // Bottom tab bar (phones): one tab per nav item, the quick-add "+" in the middle.
  var items = NAV_ITEMS.filter(function (it) { return it.tabKey; }).map(function (it) {
    return '<a class="tab' + (navIsOn(it) ? " on" : "") + '" href="#/' + navTarget(it) + '" title="' + escapeHtml(t(it.tabKey)) + '" aria-label="' + escapeHtml(t(it.tabKey)) + '"' +
      (navIsOn(it) ? ' aria-current="page"' : "") + ">" + svgIcon(it.icon) + "</a>";
  });
  var plus = '<button type="button" class="tab-plus" id="tabPlus" aria-label="' + escapeHtml(t("quickAddTitle")) + '">' + svgIcon("plus") + "</button>";
  items.splice(Math.ceil(items.length / 2), 0, plus);
  tabs.innerHTML = items.join("");
}

// Account chip at the bottom of the sidebar (mirrors the Settings page account block).
function renderNavAccount() {
  var box = document.getElementById("sideAcct");
  if (!box) return;
  box.hidden = !sync.enabled;
  if (!sync.enabled) return;
  var em = sync.email || t("syncAcctFallback");
  document.getElementById("sideEmail").textContent = em;
  document.getElementById("sideAvatar").textContent = (sync.email || "G").charAt(0);
  var note = document.getElementById("syncNote");
  document.getElementById("sideSync").textContent = note ? note.textContent : "";
}

// ---- Quick add (the "+" in the tab bar and the Home buttons) ----
function visibleQuickAdds() { return QUICK_ADDS.filter(function (q) { return !(q.hidden && q.hidden()); }); }
function runQuickAdd() {
  var QA = visibleQuickAdds();
  if (QA.length === 1) { QA[0].run(); return; }
  var list = document.getElementById("quickSheetList");
  list.innerHTML = QA.map(function (q, i) {
    return '<button type="button" class="quick-item" data-qa="' + i + '">' + svgIcon(q.icon) + "<span>" + escapeHtml(t(q.labelKey)) + "</span></button>";
  }).join("");
  document.getElementById("quickSheetOverlay").classList.add("open");
}
function closeQuickSheet() { document.getElementById("quickSheetOverlay").classList.remove("open"); }

function initRouter() {
  // The app always opens on Home, whatever hash the URL carries.
  if (location.hash) {
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
  }
  window.addEventListener("hashchange", function () { showPage(pageFromHash()); });
  document.getElementById("tabbar").addEventListener("click", function (e) {
    if (e.target.closest("#tabPlus")) runQuickAdd();
  });
  document.getElementById("quickSheetOverlay").addEventListener("click", function (e) {
    if (e.target === this) { closeQuickSheet(); return; }
    var b = e.target.closest("[data-qa]");
    if (b) { closeQuickSheet(); visibleQuickAdds()[parseInt(b.getAttribute("data-qa"), 10)].run(); }
  });
  document.getElementById("btnThemeQuick").addEventListener("click", function () {
    setMode(state.theme === "light" ? "dark" : "light");
  });
  document.getElementById("sideAcct").addEventListener("click", function () { /* plain link to #/settings */ });
  showPage("home");
}
