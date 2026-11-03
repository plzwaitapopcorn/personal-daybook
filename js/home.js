"use strict";
// ---------- Home: area tiles + a registry of widgets the user can show / hide / reorder ----------
// To add a widget for a new feature: push { id, titleKey, size, render(body) } into HOME_WIDGETS.
// New widgets appear at the end of the page automatically; the user can then move or hide them.
//   size: "s" = quarter row, "m" = half row, "l" = full row.

var HOME_KEY = "preorderVault_home";
var homePrefs = { order: [], hidden: [] };
var HOME_DEFAULT_HIDDEN = ["stat-received", "stat-spent", "fin-acc", "fin-debt", "fin-recent"];   // first run only: keeps the top strip to four numbers
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
// no picture -> a little printed stamp design (colour + doodle picked from the order id so it stays the same)
function homeThumb(o) {
  if (o.mainImage) return '<img src="' + (o.mainThumb || o.mainImage).replace(/"/g, "&quot;") + '" alt="" loading="lazy">';
  var h = 0, k = String(o.id || o.productName || "");
  for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 5;
  return '<span class="ph v' + h + '"></span>';
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
// Orders live on the right-hand page as paper-clipped tickets.
function homeDueTxt(o) {
  if (!o.dueDate) return t("homeNoDue");
  var n = daysUntil(o.dueDate);
  if (n < 0) return t("homeDueLate", { n: -n });
  if (n === 0) return t("homeDueToday");
  return t("homeDueIn", { date: shortDate(o.dueDate), n: n });
}
// desktop to-do pad: just the date ("6 พ.ย."), the notebook has no room for the long sentence
function homeDueShort(o) {
  if (!o.dueDate) return t("homeNoDue");
  var n = daysUntil(o.dueDate);
  return n <= 0 ? homeDueTxt(o) : shortDate(o.dueDate);
}
function homeTrackHtml(o) {
  if (homePaged()) {   // desktop notebook: a capsule bar with four stages
    var st = { full: 1, shipping: 2, intransit: 3, received: 4 }[o.status] || 1, keys = ["trkOrdered", "trkShipped", "trkArrived", "trkReceived"];
    return '<span class="cap"><span class="cap-bar"><i style="width:' + (st * 25) + '%"></i><s></s><s></s><s></s></span><span class="cap-lb">' +
      keys.map(function (k, i) { return '<em class="' + (st > i ? "on" : "") + (st === i + 1 ? " cur" : "") + '">' + escapeHtml(t(k)) + "</em>"; }).join("") + "</span></span>";
  }
  var step = { full: 1, shipping: 2, intransit: 3 }[o.status] || 1, h = "";
  for (var i = 1; i <= 3; i++) h += (i > 1 ? '<s class="' + (step >= i ? "on" : "") + '"></s>' : "") + '<i class="' + (step >= i ? "on" : "") + '"></i>';
  return '<span class="trk">' + h + "<em>" + escapeHtml(statusLabel(o.status)) + "</em></span>";
}
function homeTicketHtml(o, sub, right, track) {
  return '<div class="tw"><i class="clip"></i><button type="button" class="ti" data-open="' + o.id + '"><span class="thw"><span class="th">' + homeThumb(o) + "</span></span>" +
    '<span class="tx"><b>' + nameHtml(o) + "</b><small>" + sub + "</small>" + (track || "") + "</span>" + (right || "") + "</button></div>";
}
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
      b.innerHTML = list.slice(0, 4).map(function (o) {
        var sub = escapeHtml(o.shopName || t("noShop")) + (Number(o.depositPaid) ? " \u00b7 " + escapeHtml(t("depositPaidShort", { n: money(o.depositPaid) })) : "");
        var late = o.dueDate && o.dueDate <= todayStr();
        return homeTicketHtml(o, sub, '<span class="pr"><span class="dn">\u0e3f' + money(remainingOf(o)) + "</span><small" + (late ? ' class="late"' : "") + ">" + escapeHtml(homePaged() ? homeDueShort(o) : homeDueTxt(o)) + "</small></span>");
      }).join("");
    } },
  { id: "incoming", titleKey: "wIncoming", size: "m", ledger: true, more: { page: "orders", status: "all" }, render: function (b) {
      var rank = { intransit: 0, shipping: 1, full: 2 };
      var list = state.orders.filter(function (o) { return rank[o.status] != null; });
      list.sort(function (a, c) { return rank[a.status] - rank[c.status]; });
      if (!list.length) { b.innerHTML = homeEmpty("emptyIncoming"); return; }
      b.innerHTML = list.slice(0, 4).map(function (o) {
        var sub = escapeHtml(o.shopName || t("noShop")) + (o.trackingNumber ? " \u00b7 " + escapeHtml(o.trackingNumber) : "");
        return homeTicketHtml(o, sub, "", homeTrackHtml(o));
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

function homePageOf(w) { return w && w.page === "l" ? "l" : "r"; }
var homePg = "l";   // phone: which page of the notebook is open
// A widget can only trade places with a neighbour on the same page of the notebook.
function homeSamePage(id) {
  var pg = homePageOf(homeWidgetById(id));
  return homeVisibleIds().filter(function (x) { return homePageOf(homeWidgetById(x)) === pg; });
}
function homeMove(id, dir) {
  var vis = homeSamePage(id);
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

function homeBtnsHtml() {
  return '<div class="bk-btns"><button type="button" class="icon-toggle' + (homeEdit ? " is-active" : "") + '" id="btnHomeEdit" title="' + escapeHtml(t(homeEdit ? "homeEditDone" : "homeEdit")) + '" aria-label="' + escapeHtml(t(homeEdit ? "homeEditDone" : "homeEdit")) + '">' +
      svgIcon(homeEdit ? "check" : "edit") + "</button>" +
    '<button type="button" class="home-add" id="btnHomeAdd" title="' + escapeHtml(t("quickAddTitle")) + '" aria-label="' + escapeHtml(t("quickAddTitle")) + '">' + svgIcon("plus") + "</button></div>";
}
function homeDayHeadHtml() {
  var d = new Date(), loc = I18N[state.lang].locale;
  var eb = '<span class="dnum">' + d.getDate() + '</span><span class="dtxt"><b>' + escapeHtml(d.toLocaleDateString(loc, { weekday: "long" })) + "</b>" +
    escapeHtml(d.toLocaleDateString(loc, { month: "long", year: "numeric" })) + "</span>";
  return '<div class="bk-day">' + eb + "</div>" + homeBtnsHtml();
}
function homeOrdersSummary() {
  var due = activeOrders().filter(function (o) { return remainingOf(o) > 0; });
  var sum = due.reduce(function (s, o) { return s + remainingOf(o); }, 0);
  var transit = state.orders.filter(function (o) { return o.status === "intransit" || o.status === "shipping" || o.status === "full"; }).length;
  return { sum: sum, nDue: due.length, nTransit: transit };
}

// Desktop: the notebook is a fixed-height spread; whatever does not fit flows onto the next spread (turn the page).
// Phone: one long page per side, switched with the tabs.
var homeSpread = 0;
function homePaged() { return window.matchMedia("(min-width: 900px)").matches; }
function homeOverflows(host) { return host.scrollHeight > host.clientHeight + 1; }

function homeCardEl(id, pages) {
  var w = homeWidgetById(id), pg = homePageOf(w), pos = pages[pg].indexOf(id);
  var card = document.createElement("section");
  card.className = "hw hw-" + w.size + (w.ledger ? " hw-led" : "");
  card.setAttribute("data-wid", id);
  var head = '<h4>' + (w.icon ? svgIcon(w.icon) : "") + "<span>" + escapeHtml(t(w.titleKey)) + "</span>" +
    (w.more && !homeEdit ? '<a class="hw-more" href="#/' + w.more.page + '"' + (w.more.status !== undefined ? ' data-more="' + w.more.status + '"' : "") + ' title="' + escapeHtml(t("seeAll")) + '" aria-label="' + escapeHtml(t("seeAll")) + '">' + svgIcon("chev-r") + "</a>" : "") + "</h4>";
  card.innerHTML = head + '<div class="hw-body"></div>';
  if (homeEdit) {
    var tools = document.createElement("div");
    tools.className = "hw-tools";
    tools.innerHTML =
      '<button type="button" data-wmove="-1" aria-label="' + escapeHtml(t("homeMoveEarlier")) + '"' + (pos === 0 ? " disabled" : "") + '>&#9664;</button>' +
      '<button type="button" data-wmove="1" aria-label="' + escapeHtml(t("homeMoveLater")) + '"' + (pos === pages[pg].length - 1 ? " disabled" : "") + '>&#9654;</button>' +
      '<button type="button" data-whide="1" aria-label="' + escapeHtml(t("homeHide")) + '">&#10005;</button>';
    card.appendChild(tools);
  }
  w.render(card.querySelector(".hw-body"));
  return card;
}

// One sheet of the notebook. Page 0 (left) = time, page 1 (right) = things & money; later pages are claimed by whichever group overflows.
function homePageHtml(idx, paged, ctx) {
  var left = idx % 2 === 0, first = idx < 2;
  var h = '<section class="bk-p ' + (left ? "bk-l" : "bk-r") + (first ? "" : " cont") + '" data-idx="' + idx + '"><div class="bk-in"><div class="bk-paper"></div>' + (left ? '<i class="bk-mg"></i><i class="bk-mg b"></i>' : "");
  if (idx === 0) h += '<div class="bk-top">' + (paged && typeof planWeekHeadHtml === "function" ? planWeekHeadHtml() : homeDayHeadHtml() + ctx.week) + "</div>";
  if (idx === 1) h += '<div class="bk-rh"><div class="t">' + escapeHtml(t("homeOrdersTitle")) + "<small>" + escapeHtml(t("homeOrdSub", { a: ctx.sum.nTransit, b: ctx.sum.nDue })) + "</small></div>" +
      (ctx.sum.sum > 0 ? '<div class="bk-stamp">' + escapeHtml(t("homeStampDue")) + "<b>฿" + money(ctx.sum.sum) + "</b></div>" : "") + "</div>";
  h += '<div class="bk-body"></div><div class="bk-folio">– ' + (idx === 0 ? escapeHtml(t("homeTabSched")) + " · " : idx === 1 ? escapeHtml(t("homeTabOrders")) + " · " : "") + (idx + 1) + " –</div></div>";
  if (paged) h += left ? '<button type="button" class="bk-curl bk-prev" data-bkgo="-1" aria-label="' + escapeHtml(t("homePrevSpread")) + '" hidden></button>'
                        : '<button type="button" class="bk-curl bk-next" data-bkgo="1" aria-label="' + escapeHtml(t("homeNextSpread")) + '" hidden></button>';
  else h += left ? '<button type="button" class="bk-curl" data-bkpg="r" aria-label="' + escapeHtml(t("homeFlipOrders")) + '"></button><span class="bk-flip">' + escapeHtml(t("homeFlipOrders")) + "</span>"
                 : '<button type="button" class="bk-curl lf" data-bkpg="l" aria-label="' + escapeHtml(t("homeFlipSched")) + '"></button><span class="bk-flip lf">' + escapeHtml(t("homeFlipSched")) + "</span>";
  return h + "</section>";
}
function homeClaim(pg, group) {
  if (pg.getAttribute("data-grp")) return;
  pg.setAttribute("data-grp", group); pg.classList.add("grp-" + group);
  var tab = group === "l" ? '<a class="bk-tab tl" href="#/schedule">' + svgIcon("table") + "<span>" + escapeHtml(t("homeTabSched")) + "</span></a>"
                          : '<a class="bk-tab tr" href="#/orders">' + svgIcon("bag") + "<span>" + escapeHtml(t("homeTabOrders")) + "</span></a>";
  pg.insertAdjacentHTML("afterbegin", tab);
  pg.querySelector(".bk-body").className = "bk-body " + (group === "l" ? "bk-lines g-l" : "bk-rbody g-r");
}

function renderHome() {
  var grid = document.getElementById("homeGrid");
  if (!grid) return;
  // the old header strip only shows when a banner picture is set
  var oa = document.getElementById("homeActions"); if (oa) oa.innerHTML = "";
  var oe = document.getElementById("headerEyebrow"); if (oe) oe.innerHTML = "";
  if (!state.loaded) { grid.innerHTML = ""; return; }
  var vis = homeVisibleIds();
  grid.className = "home-grid" + (homeEdit ? " editing" : "");
  var pages = { l: [], r: [] };
  vis.forEach(function (id) { pages[homePageOf(homeWidgetById(id))].push(id); });
  var paged = homePaged();
  var ctx = { sum: homeOrdersSummary(), week: typeof planWeekStripHtml === "function" ? planWeekStripHtml() : "" };

  grid.innerHTML =
    '<div class="bk-mtabs"><button type="button" class="s' + (homePg === "l" ? " on" : "") + '" data-bkpg="l">' + svgIcon("table") + escapeHtml(t("homeTabSched")) + "</button>" +
      '<button type="button" class="o' + (homePg === "r" ? " on" : "") + '" data-bkpg="r">' + svgIcon("bag") + escapeHtml(t("homeTabOrders")) + "</button></div>" +
    '<div class="bk' + (paged ? " paged" : "") + '" data-pg="' + homePg + '"><i class="bk-gut"></i><i class="bk-st a"></i><i class="bk-st b"></i><div class="bk-rib"><i></i></div></div>';
  var book = grid.querySelector(".bk");
  var spreads = [], pageEls = [];
  function spreadAt(k) {
    while (spreads.length <= k) {
      var n = spreads.length, sp = document.createElement("div");
      sp.className = "bk-sp on";   // every spread counts as visible while measuring
      sp.innerHTML = homePageHtml(2 * n, paged, ctx) + homePageHtml(2 * n + 1, paged, ctx);
      book.insertBefore(sp, book.querySelector(".bk-gut"));
      spreads.push(sp); pageEls.push(sp.children[0], sp.children[1]);
    }
    return spreads[k];
  }
  spreadAt(0); homeClaim(pageEls[0], "l"); homeClaim(pageEls[1], "r");
  var body = function (idx) { spreadAt(idx >> 1); return pageEls[idx].querySelector(".bk-body"); };
  var ptr = { l: 0, r: 1 }, nPages = 2;
  var slip = document.createElement("div"); slip.className = "bk-slip";
  slip.innerHTML = '<h5><i></i>' + escapeHtml(t("homeSlipTitle")) + '</h5><div class="bk-sg"></div>';
  var nSlip = 0;
  vis.forEach(function (id) { var w = homeWidgetById(id); if (homePageOf(w) === "r" && w.size === "s") nSlip++; });
  // the memo pad (money summary) is the first thing on the first right page
  if (nSlip) body(1).appendChild(slip);

  vis.forEach(function (id) {
    var w = homeWidgetById(id), pg = homePageOf(w), card = homeCardEl(id, pages);
    if (pg === "r" && w.size === "s") { slip.querySelector(".bk-sg").appendChild(card); return; }
    var place = function (idx) { var hh = body(idx); hh.appendChild(card); return hh; };
    var h = place(ptr[pg]);
    if (paged && homeOverflows(h) && h.querySelectorAll(":scope > .hw").length > 1) {
      h.removeChild(card);
      var idx = nPages++; body(idx); homeClaim(pageEls[idx], pg); ptr[pg] = idx;
      place(idx);
    }
  });
  if (nSlip && !paged) body(1).appendChild(slip);   // phone: the money slip stays tucked at the end of the page
  if (!vis.length) body(1).innerHTML = '<div class="hempty wide">' + escapeHtml(t("homeNone")) + "</div>";

  if (paged) {
    if (homeSpread > spreads.length - 1) homeSpread = spreads.length - 1;
    if (homeSpread < 0) homeSpread = 0;
    spreads.forEach(function (sp, k) {
      sp.classList.toggle("on", k === homeSpread);
      var pv = sp.querySelector(".bk-prev"), nx = sp.querySelector(".bk-next");
      if (pv) pv.hidden = k === 0;
      if (nx) nx.hidden = k === spreads.length - 1;
    });
    book.setAttribute("data-spreads", spreads.length);
  }

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
function homeGo(d) {
  var n = document.querySelectorAll("#homeGrid .bk-sp").length;
  var k = Math.max(0, Math.min(n - 1, homeSpread + d));
  if (k === homeSpread) return;
  homeSpread = k;
  var sps = document.querySelectorAll("#homeGrid .bk-sp");
  Array.prototype.forEach.call(sps, function (sp, i) { sp.classList.toggle("on", i === k); });
}

// The desk behind the notebook on a wide screen is a green cutting mat: grid lines come from CSS, the ruler numbers are drawn here.
function homeBuildMat() {
  var m = document.getElementById("deskMat");
  if (!m) { m = document.createElement("div"); m.id = "deskMat"; m.className = "desk-mat"; m.setAttribute("aria-hidden", "true"); document.body.insertBefore(m, document.body.firstChild); }
  var U = 38, GL = 46, GT = 34, vw = window.innerWidth, vh = window.innerHeight;
  var nx = Math.max(4, Math.floor((vw - GL - 34) / U)), ny = Math.max(4, Math.floor((vh - GT - 24) / U)), h = '<i class="mg" style="width:' + nx * U + "px;height:" + ny * U + 'px"></i>', i;
  for (i = 0; i <= nx; i++) h += '<i class="nx" style="left:' + (GL + i * U) + "px;top:" + (GT + ny * U + 7) + 'px">' + i + "</i>";
  for (i = 0; i <= ny; i++) h += '<i class="ny" style="top:' + (GT + i * U) + "px;left:" + (GL - 30) + 'px">' + i + "</i>";
  m.innerHTML = h;
}
function initHome() {
  var page = document.getElementById("page-home");
  homeBuildMat();
  window.addEventListener("resize", function () { clearTimeout(homeBuildMat.t); homeBuildMat.t = setTimeout(homeBuildMat, 200); });
  document.addEventListener("keydown", function (e) {
    if (currentPageId !== "home" || e.altKey || e.ctrlKey || e.metaKey) return;
    var tg = e.target, tag = tg && tg.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (tg && tg.isContentEditable) || document.querySelector(".modal-overlay.open, .overlay.open")) return;
    if (!homePaged()) return;
    if (e.key === "ArrowRight") homeGo(1); else if (e.key === "ArrowLeft") homeGo(-1);
  });
  var rz = null, lastW = window.innerWidth, lastH = window.innerHeight;
  window.addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(function () { if (currentPageId === "home" && (window.innerWidth !== lastW || window.innerHeight !== lastH)) { lastW = window.innerWidth; lastH = window.innerHeight; renderHome(); } }, 180);
  });
  page.addEventListener("click", function (e) {
    var el;
    if ((el = e.target.closest("[data-bkpg]"))) { homePg = el.getAttribute("data-bkpg"); renderHome(); return; }
    if ((el = e.target.closest("[data-bkgo]"))) { homeGo(parseInt(el.getAttribute("data-bkgo"), 10)); return; }
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
