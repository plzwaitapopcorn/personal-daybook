"use strict";
// ---------- Home: area tiles + a registry of widgets the user can show / hide / reorder ----------
// To add a widget for a new feature: push { id, titleKey, size, render(body) } into HOME_WIDGETS.
// New widgets appear at the end of the page automatically; the user can then move or hide them.
//   size: "s" = quarter row, "m" = half row, "l" = full row.

var HOME_KEY = "preorderVault_home";
var homePrefs = { order: [], hidden: [] };
var HOME_DEFAULT_HIDDEN = ["stat-received", "stat-spent", "fin-acc", "fin-debt"];   // first run only: keeps the top strip to four numbers
var homeEdit = false;

(function loadHomePrefs() {
  try {
    var raw = localStorage.getItem(HOME_KEY);
    if (!raw) homePrefs.hidden = HOME_DEFAULT_HIDDEN.slice();
    var p = JSON.parse(raw || "null");
    if (p && Array.isArray(p.order)) homePrefs.order = p.order.filter(function (x) { return typeof x === "string"; });
    if (p && Array.isArray(p.hidden)) homePrefs.hidden = p.hidden.filter(function (x) { return typeof x === "string"; });
  } catch (e) { /* ignore */ }
})();
function saveHomePrefs() {
  try { localStorage.setItem(HOME_KEY, JSON.stringify(homePrefs)); } catch (e) { /* ignore */ }
}

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
function homeThumb(o) {
  return o.mainImage
    ? '<img src="' + (o.mainThumb || o.mainImage).replace(/"/g, "&quot;") + '" alt="" loading="lazy">'
    : placeholderSvg();
}
// One line of the "today" page: [date in the margin] [status icon] name + shop ... [stamp] amount
function homeRow(o, sub, right, label, tag, stamp) {
  return '<button type="button" class="hrow lrow" data-open="' + o.id + '">' +
    '<span class="l-lab">' + (label || "") + "</span>" +
    statusIconHtml(o.status, "sm l-ico") +
    '<span class="l-t"><span class="hrow-t">' + nameHtml(o) + (tag || "") + '</span><span class="l-s hrow-s">' + sub + "</span></span>" +
    (stamp || "") + '<span class="l-r hrow-r">' + right + "</span></button>";
}
function homeEmpty(key) { return '<div class="hempty">' + escapeHtml(t(key)) + "</div>"; }
// ---- widgets ----
var HOME_WIDGETS = [
  { id: "stat-due", titleKey: "wStatDue", size: "s", icon: "clock", render: function (b) {
      var list = activeOrders().filter(function (o) { return remainingOf(o) > 0; });
      var sum = list.reduce(function (s, o) { return s + remainingOf(o); }, 0);
      var next = list.map(function (o) { return o.dueDate; }).filter(Boolean).sort()[0];
      b.innerHTML = '<div class="big' + (sum > 0 ? " dn" : "") + '">฿' + money(sum) + "</div>" +
        '<div class="sub">' + escapeHtml(t("statDueSub", { n: list.length }) + (next ? " · " + t("statDueNext", { date: shortDate(next) }) : "")) + "</div>";
    } },
  { id: "stat-wait", titleKey: "wStatWait", size: "s", icon: "truck", render: function (b) {
      var c = { full: 0, shipping: 0, intransit: 0 };
      state.orders.forEach(function (o) { if (c[o.status] != null) c[o.status]++; });
      b.innerHTML = '<div class="big">' + (c.full + c.shipping + c.intransit) + "</div>" +
        '<div class="sub">' + escapeHtml(t("statWaitSub", { a: c.intransit, b: c.shipping + c.full })) + "</div>";
    } },
  { id: "stat-received", titleKey: "wStatReceived", size: "s", icon: "check", render: function (b) {
      var list = activeOrders();
      var got = list.filter(function (o) { return o.status === "received"; }).length;
      var pct = list.length ? Math.round(got / list.length * 100) : 0;
      b.innerHTML = '<div class="big">' + got + ' <span class="of">' + escapeHtml(t("statOfTotal", { n: list.length })) + "</span></div>" +
        '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>';
    } },
  { id: "stat-spent", titleKey: "wStatSpent", size: "s", icon: "bag", render: function (b) {
      var list = activeOrders();
      var sum = list.reduce(function (s, o) { return s + (Number(o.fullPrice) || 0); }, 0);
      b.innerHTML = '<div class="big">฿' + money(sum) + "</div>" +
        '<div class="sub">' + escapeHtml(t("statSpentSub", { n: list.length })) + "</div>";
    } },
  { id: "due-soon", titleKey: "wDueSoon", size: "m", ledger: true, more: { page: "orders", status: "deposit" }, render: function (b) {
      var list = activeOrders().filter(function (o) { return remainingOf(o) > 0; });
      list.sort(function (a, c) {
        var da = a.dueDate || "9999", dc = c.dueDate || "9999";
        if (da !== dc) return da < dc ? -1 : 1;
        return (a.purchaseDate || "") < (c.purchaseDate || "") ? -1 : 1;
      });
      if (!list.length) { b.innerHTML = homeEmpty("emptyDue"); return; }
      b.innerHTML = list.slice(0, 5).map(function (o) {
        var sub = escapeHtml(o.shopName || t("noShop")) + (Number(o.depositPaid) ? " · " + escapeHtml(t("depositPaidShort", { n: money(o.depositPaid) })) : "");
        var late = o.dueDate && o.dueDate <= todayStr();
        return homeRow(o, sub, '<span class="dn">฿' + money(remainingOf(o)) + "</span>",
          o.dueDate ? escapeHtml(shortDate(o.dueDate)) : "\u2014", "", late ? '<span class="stamp">' + escapeHtml(t("stampDue")) + "</span>" : "");
      }).join("");
    } },
  { id: "incoming", titleKey: "wIncoming", size: "m", ledger: true, more: { page: "orders", status: "all" }, render: function (b) {
      var rank = { intransit: 0, shipping: 1, full: 2 };
      var list = state.orders.filter(function (o) { return rank[o.status] != null; });
      list.sort(function (a, c) { return rank[a.status] - rank[c.status]; });
      if (!list.length) { b.innerHTML = homeEmpty("emptyIncoming"); return; }
      b.innerHTML = list.slice(0, 5).map(function (o) {
        var sub = escapeHtml(o.shopName || t("noShop")) + (o.trackingNumber ? " · " + escapeHtml(o.trackingNumber) : "");
        return homeRow(o, sub, '<span class="hrow-st">' + escapeHtml(statusLabel(o.status)) + "</span>", "", "");
      }).join("");
    } },
  { id: "recent-orders", titleKey: "wRecent", size: "m", ledger: true, more: { page: "orders", status: "all" }, render: function (b) {
      var list = state.orders.filter(function (o) { return o.status !== "cancelled"; });
      list.sort(function (a, c) { return (c.createdAt || 0) - (a.createdAt || 0); });
      if (!list.length) { b.innerHTML = homeEmpty("emptyRecent"); return; }
      b.innerHTML = list.slice(0, 5).map(function (o) {
        return homeRow(o, escapeHtml(o.shopName || t("noShop")), priceHtml(o), escapeHtml(shortDate(o.purchaseDate)), "");
      }).join("");
    } }
];

function homeWidgetById(id) {
  for (var i = 0; i < HOME_WIDGETS.length; i++) if (HOME_WIDGETS[i].id === id) return HOME_WIDGETS[i];
  return null;
}
// order = every known widget id (hidden ones keep a slot); visible = order minus hidden
function homeSyncOrder() {
  var known = HOME_WIDGETS.map(function (w) { return w.id; });
  homePrefs.order = homePrefs.order.filter(function (id) { return known.indexOf(id) !== -1; });
  known.forEach(function (id) { if (homePrefs.order.indexOf(id) === -1) homePrefs.order.push(id); });
  homePrefs.hidden = homePrefs.hidden.filter(function (id) { return known.indexOf(id) !== -1; });
}
function homeVisibleIds() {
  homeSyncOrder();
  return homePrefs.order.filter(function (id) { return homePrefs.hidden.indexOf(id) === -1; });
}

function homeMove(id, dir) {
  var vis = homeVisibleIds();
  var i = vis.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= vis.length) return;
  var a = homePrefs.order.indexOf(vis[i]), b = homePrefs.order.indexOf(vis[j]);
  var tmp = homePrefs.order[a]; homePrefs.order[a] = homePrefs.order[b]; homePrefs.order[b] = tmp;
  saveHomePrefs(); renderHome();
}
function homeHide(id) {
  if (homePrefs.hidden.indexOf(id) === -1) homePrefs.hidden.push(id);
  saveHomePrefs(); renderHome();
}
function homeShow(id) {
  homePrefs.hidden = homePrefs.hidden.filter(function (x) { return x !== id; });
  homePrefs.order = homePrefs.order.filter(function (x) { return x !== id; });
  homePrefs.order.push(id);                      // a re-added widget lands at the end, where it is easy to see
  saveHomePrefs(); renderHome();
}
function homeEditOff() { if (homeEdit) { homeEdit = false; if (currentPageId === "home") renderHome(); } }

function renderHomeHeader() {
  var eb = document.getElementById("headerEyebrow");
  if (eb) {
    var d = new Date(), loc = I18N[state.lang].locale;
    eb.innerHTML = '<span class="dnum">' + d.getDate() + '</span><span class="dtxt"><b>' + escapeHtml(d.toLocaleDateString(loc, { weekday: "long" })) + "</b>" +
      escapeHtml(d.toLocaleDateString(loc, { month: "long", year: "numeric" })) + "</span>";
  }
  var act = document.getElementById("homeActions");
  var one = QUICK_ADDS.length === 1;
  act.innerHTML =
    '<button type="button" class="icon-toggle' + (homeEdit ? " is-active" : "") + '" id="btnHomeEdit" title="' + escapeHtml(t(homeEdit ? "homeEditDone" : "homeEdit")) + '" aria-label="' + escapeHtml(t(homeEdit ? "homeEditDone" : "homeEdit")) + '">' +
      svgIcon(homeEdit ? "check" : "edit") + "</button>" +
    '<button type="button" class="home-add" id="btnHomeAdd" title="' + escapeHtml(t("quickAddTitle")) + '" aria-label="' + escapeHtml(t("quickAddTitle")) + '">' + svgIcon("plus") + "</button>";
}

function renderHome() {
  if (!document.getElementById("homeGrid")) return;
  renderHomeHeader();
  var grid = document.getElementById("homeGrid");
  if (!state.loaded) { grid.innerHTML = ""; return; }
  var vis = homeVisibleIds();
  grid.className = "home-grid" + (homeEdit ? " editing" : "");
  grid.innerHTML = "";
  // Layout: lists become lines of the ledger page (left), numbers + summary cards sit on the side panel (right).
  var strip = document.createElement("div"); strip.className = "home-strip";
  var ledger = document.createElement("div"); ledger.className = "home-ledger";
  var cards = document.createElement("div"); cards.className = "home-cards";
  var nL = 0, nC = 0;
  vis.forEach(function (id, idx) {
    var w = homeWidgetById(id);
    var card = document.createElement("section");
    card.className = "hw hw-" + w.size;
    card.setAttribute("data-wid", id);
    var head = '<h4>' + (w.icon ? svgIcon(w.icon) : "") + "<span>" + escapeHtml(t(w.titleKey)) + "</span>" +
      (w.more && !homeEdit ? '<a class="hw-more" href="#/' + w.more.page + '"' + (w.more.status !== undefined ? ' data-more="' + w.more.status + '"' : "") + ' title="' + escapeHtml(t("seeAll")) + '" aria-label="' + escapeHtml(t("seeAll")) + '">' + svgIcon("chev-r") + "</a>" : "") + "</h4>";
    card.innerHTML = head + '<div class="hw-body"></div>';
    if (homeEdit) {
      var tools = document.createElement("div");
      tools.className = "hw-tools";
      tools.innerHTML =
        '<button type="button" data-wmove="-1" aria-label="' + escapeHtml(t("homeMoveEarlier")) + '"' + (idx === 0 ? " disabled" : "") + '>&#9664;</button>' +
        '<button type="button" data-wmove="1" aria-label="' + escapeHtml(t("homeMoveLater")) + '"' + (idx === vis.length - 1 ? " disabled" : "") + '>&#9654;</button>' +
        '<button type="button" data-whide="1" aria-label="' + escapeHtml(t("homeHide")) + '">&#10005;</button>';
      card.appendChild(tools);
    }
    w.render(card.querySelector(".hw-body"));
    if (w.size === "s") strip.appendChild(card);
    else if (w.ledger) { card.style.order = nL++; ledger.appendChild(card); }
    else { card.style.order = 10 + nC++; cards.appendChild(card); }
  });
  if (strip.children.length) { strip.style.setProperty("--n", Math.min(strip.children.length, 4)); strip.style.order = 1; cards.insertBefore(strip, cards.firstChild); }
  if (nL) grid.appendChild(ledger);
  if (cards.children.length) grid.appendChild(cards);
  if (!vis.length) grid.innerHTML = '<div class="hempty wide">' + escapeHtml(t("homeNone")) + "</div>";

  var panel = document.getElementById("homeAddPanel");
  panel.hidden = !homeEdit;
  if (homeEdit) {
    var hidden = homePrefs.order.filter(function (id) { return homePrefs.hidden.indexOf(id) !== -1; });
    document.getElementById("homeAddList").innerHTML = hidden.length
      ? hidden.map(function (id) {
          return '<button type="button" class="chp-add" data-wshow="' + id + '">' + svgIcon("plus") + "<span>" + escapeHtml(t(homeWidgetById(id).titleKey)) + "</span></button>";
        }).join("")
      : '<span class="hempty">' + escapeHtml(t("homeNoHidden")) + "</span>";
  }
}

function initHome() {
  var page = document.getElementById("page-home");
  page.addEventListener("click", function (e) {
    var el;
    if ((el = e.target.closest("#btnHomeEdit"))) { homeEdit = !homeEdit; renderHome(); return; }
    if ((el = e.target.closest("#btnHomeAdd"))) { runQuickAdd(); return; }
    if ((el = e.target.closest("[data-wmove]"))) { homeMove(el.closest("[data-wid]").getAttribute("data-wid"), parseInt(el.getAttribute("data-wmove"), 10)); return; }
    if ((el = e.target.closest("[data-whide]"))) { homeHide(el.closest("[data-wid]").getAttribute("data-wid")); return; }
    if ((el = e.target.closest("[data-wshow]"))) { homeShow(el.getAttribute("data-wshow")); return; }
    if ((el = e.target.closest("[data-open]"))) { if (!homeEdit) openDetailModal(el.getAttribute("data-open")); return; }
    if ((el = e.target.closest("[data-more]"))) {
      state.status = el.getAttribute("data-more") || "all";
      syncStatusFilterUI();
      renderGrid();
    }
  });
}
