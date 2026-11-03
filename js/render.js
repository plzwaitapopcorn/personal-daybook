"use strict";
// ---------- Rendering: stats ----------
function renderStats() {
  // Cancelled orders and wishlist items are left out of the summary figures (received,
  // spent, balance); they still appear in the status counts below.
  var orders = state.orders.filter(function (o) { return o.status !== "cancelled" && o.status !== "wishlist"; });
  var total = orders.length;
  var receivedCount = orders.filter(function (o) { return o.status === "received"; }).length;

  document.getElementById("statReceived").textContent = receivedCount;
  document.getElementById("statOfTotal").textContent = t("statOfTotal", { n: total });
  var pct = total > 0 ? Math.round((receivedCount / total) * 100) : 0;
  document.getElementById("statProgressFill").style.width = pct + "%";

  var totalSpent = orders.reduce(function (sum, o) { return sum + (Number(o.fullPrice) || 0); }, 0);
  document.getElementById("statSpent").textContent = "฿" + money(totalSpent);

  var totalRemain = orders.reduce(function (sum, o) { return sum + remainingOf(o); }, 0);
  var remainEl = document.getElementById("statRemain");
  remainEl.textContent = "฿" + money(totalRemain);
  remainEl.classList.toggle("has-due", totalRemain > 0);

  // Per-status counts for the rail rows and the mobile chips (all orders).
  var counts = { all: state.orders.length };
  state.orders.forEach(function (o) { counts[o.status] = (counts[o.status] || 0) + 1; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-count]"), function (el) {
    el.textContent = counts[el.getAttribute("data-count")] || 0;
  });
  syncStatusFilterUI();
}

function syncStatusFilterUI() {
  Array.prototype.forEach.call(document.querySelectorAll("#statusChips .chip, .rail-row"), function (el) {
    el.classList.toggle("active", el.getAttribute("data-status") === state.status);
  });
  var clear = document.getElementById("btnClearStatus");
  if (clear) clear.hidden = state.status === "all";
}

// ---------- Rendering: month filter options ----------
function refreshViewHints() {
  var g = document.getElementById("btnGroupToggle");
  var v = document.getElementById("btnViewToggle");
  if (!g || !v) return;
  var gTitle = t("groupToggleTitle") + ": " + t(viewPrefs.group ? "toggleOn" : "toggleOff");
  g.setAttribute("title", gTitle); g.setAttribute("aria-label", gTitle);
  g.classList.toggle("is-active", viewPrefs.group);
  var vTitle = t("viewToggleTitle") + ": " + t(viewPrefs.view === "list" ? "viewList" : "viewCards");
  v.setAttribute("title", vTitle); v.setAttribute("aria-label", vTitle);
  v.classList.toggle("is-active", viewPrefs.view === "list");
  document.getElementById("viewIconCards").style.display = viewPrefs.view === "list" ? "none" : "";
  document.getElementById("viewIconList").style.display = viewPrefs.view === "list" ? "" : "none";
}
function initViewToggles() {
  var g = document.getElementById("btnGroupToggle");
  var v = document.getElementById("btnViewToggle");
  g.addEventListener("click", function () {
    viewPrefs.group = !viewPrefs.group; saveViewPrefs(); refreshViewHints(); renderGrid();
  });
  v.addEventListener("click", function () {
    viewPrefs.view = viewPrefs.view === "list" ? "cards" : "list"; saveViewPrefs(); refreshViewHints(); renderGrid();
  });
  refreshViewHints();
}
function refreshToolbarHints() {
  [["sortSelect", "sortTitle", "status"], ["monthSelect", "monthTitle", "all"]].forEach(function (cfg) {
    var sel = document.getElementById(cfg[0]);
    var wrap = sel.parentNode;
    var label = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : "";
    wrap.setAttribute("title", t(cfg[1]) + ": " + label);
    sel.setAttribute("aria-label", t(cfg[1]) + ": " + label);
    wrap.classList.toggle("is-active", sel.value !== cfg[2]);
  });
}

function renderMonthOptions() {
  var sel = document.getElementById("monthSelect");
  var current = sel.value || "all";
  var keys = {};
  state.orders.forEach(function (o) {
    var k = monthYearKey(o.purchaseDate);
    if (k) keys[k] = true;
  });
  var sorted = Object.keys(keys).sort().reverse();
  sel.innerHTML = '<option value="all">' + t("monthAll") + "</option>" +
    sorted.map(function (k) {
      return '<option value="' + k + '">' + escapeHtml(monthYearLabel(k)) + "</option>";
    }).join("");
  if (sorted.indexOf(current) !== -1 || current === "all") {
    sel.value = current;
  } else {
    sel.value = "all";
    state.monthYear = "all";
  }
  refreshToolbarHints();
}

var COURIER_INFO = {
  thailandpost: {
    nameKey: "courierThailandPost",
    urlFn: function (code) { return "https://track.thailandpost.co.th/?trackNumber=" + encodeURIComponent(code); }
  },
  kerry: { nameKey: "courierKerry", copy: true, urlFn: function () { return "https://th.kex-express.com/th/track/"; } },
  dhl: {
    nameKey: "courierDHL",
    urlFn: function (code) { return "https://www.dhl.com/th-en/home/tracking.html?tracking-id=" + encodeURIComponent(code) + "&submit=1"; }
  },
  // These official pages have no prefill link, so the tracking number is copied to the clipboard on click
  // (copy: true) and the person pastes it into the page's search box.
  flash: { nameKey: "courierFlash", copy: true, urlFn: function () { return "https://www.flashexpress.co.th/fle/tracking"; } },
  jt: { nameKey: "courierJT", copy: true, urlFn: function () { return "https://www.jtexpress.co.th/service/track"; } },
  ninjavan: { nameKey: "courierNinjaVan", copy: true, urlFn: function () { return "https://www.ninjavan.co/en-th/tracking"; } },
  other: { nameKey: "courierOther", aggregator: true, urlFn: function (code) { return "https://t.17track.net/en#nums=" + encodeURIComponent(code); } }
};

var STATUS_ORDER = ["deposit", "full", "shipping", "intransit", "wishlist", "received", "cancelled"];

// ---------- Filtering / sorting ----------
function getVisibleOrders() {
  var list = state.orders.slice();

  if (state.status !== "all") {
    list = list.filter(function (o) { return o.status === state.status; });
  }
  if (state.monthYear !== "all") {
    list = list.filter(function (o) { return monthYearKey(o.purchaseDate) === state.monthYear; });
  }
  if (state.search.trim()) {
    var q = state.search.trim().toLowerCase();
    list = list.filter(function (o) {
      return (o.productName || "").toLowerCase().indexOf(q) !== -1 ||
             (o.shopName || "").toLowerCase().indexOf(q) !== -1 ||
             (o.notes || "").toLowerCase().indexOf(q) !== -1;
    });
  }

  list.sort(function (a, b) {
    if (state.sort === "status") {
      var ia = STATUS_ORDER.indexOf(a.status);
      var ib = STATUS_ORDER.indexOf(b.status);
      if (ia === -1) ia = STATUS_ORDER.length;
      if (ib === -1) ib = STATUS_ORDER.length;
      if (ia !== ib) return ia - ib;
      // Within the same status, show the newest purchase first.
      var sa = a.purchaseDate || a.createdAt || "";
      var sb = b.purchaseDate || b.createdAt || "";
      if (sa < sb) return 1;
      if (sa > sb) return -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
    var da = a.purchaseDate || a.createdAt || "";
    var db = b.purchaseDate || b.createdAt || "";
    if (da < db) return state.sort === "newest" ? 1 : -1;
    if (da > db) return state.sort === "newest" ? -1 : 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return list;
}

// ---------- Rendering: grid ----------
function renderGrid() {
  var grid = document.getElementById("grid");
  var list = getVisibleOrders();
  document.body.classList.toggle("selecting", selectMode);
  refreshBulkBar(list);

  if (list.length === 0) {
    var msg = state.orders.length === 0
      ? { title: t("emptyNoOrdersTitle"), body: t("emptyNoOrdersBody") }
      : { title: t("emptyNoMatchTitle"), body: t("emptyNoMatchBody") };
    grid.innerHTML =
      '<div class="empty-state"><h3>' + msg.title + "</h3><div>" + msg.body + "</div>" +
      (state.orders.length === 0 ? '<button class="btn-primary" style="margin:16px auto 0;" id="emptyAddBtn">' + t("emptyAddFirstBtn") + "</button>" : "") +
      "</div>";
    if (state.orders.length === 0) {
      document.getElementById("emptyAddBtn").addEventListener("click", function () { openOrderModal(); });
    }
    ordSel = null;
    renderOrderSide();
    return;
  }

  var cardHtml = function (o) {
    var style = STATUS_STYLE[o.status] || STATUS_STYLE.deposit;
    var remain = remainingOf(o);
    var thumb = o.mainImage
      ? '<img class="thumb" src="' + (o.mainThumb || o.mainImage).replace(/"/g, "&quot;") + '" alt="' + escapeHtml(o.productName) + '" loading="lazy">'
      : '<div class="thumb-placeholder">' + placeholderSvg() + "</div>";

    var priceSubline = "";
    if (remain > 0) {
      priceSubline = o.depositPaid
        ? '<div class="remain">' + t("depositRemainLine", { deposit: money(o.depositPaid), remain: money(remain) }) + "</div>"
        : '<div class="remain">' + t("dueLine", { remain: money(remain) }) + "</div>";
    }

    return (
      '<article class="card' + (o.status === "cancelled" ? " is-cancelled" : "") + (selected[o.id] ? " is-selected" : "") + '" data-id="' + o.id + '">' + '<span class="sel-box" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg></span>' +
        '<div style="position:relative;">' + thumb + statusSelectHtml(o) +
        "</div>" +
        '<div class="card-body">' +
          "<h3>" + nameHtml(o) + "</h3>" +
          '<div class="shop">🏬 ' + escapeHtml(o.shopName || t("noShop")) + "</div>" +
          '<div class="price-row">' +
            '<div class="full">' + priceHtml(o) + "</div>" +
            priceSubline +
          "</div>" +
          '<div class="date">' + formatDateLong(o.purchaseDate) + "</div>" +
        "</div>" +
      "</article>"
    );
  };

  var rowHtml = function (o) {
    var remain = remainingOf(o);
    var thumb = o.mainImage
      ? '<img src="' + (o.mainThumb || o.mainImage).replace(/"/g, "&quot;") + '" alt="" loading="lazy">'
      : placeholderSvg();
    var pct = ordPaidPct(o);
    return (
      '<article class="row' + (o.status === "cancelled" ? " is-cancelled" : "") + (selected[o.id] ? " is-selected" : "") + (o.id === ordSel ? " is-active" : "") + '" data-id="' + o.id + '">' + '<span class="sel-box" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg></span>' +
        '<div class="row-thumb">' + thumb + "</div>" +
        '<div class="row-main"><div class="row-title">' + nameHtml(o) + '</div>' +
          '<div class="row-shop">' + escapeHtml(o.shopName || t("noShop")) + "</div></div>" +
        '<div class="row-date">' + formatDateShort(o.purchaseDate) + "</div>" +
        '<div class="row-price">' + priceHtml(o) + "</div>" +
        '<div class="row-due' + (remain > 0 ? " neg" : "") + '">' + (remain > 0 ? "฿" + money(remain) : "\u2014") + "</div>" +
        '<div class="row-prog">' + (pct === null ? '<span class="na">\u2014</span>' : '<div class="pbar"><i style="width:' + pct + '%"></i></div>') + "</div>" +
        '<div class="row-status">' + statusSelectHtml(o) + "</div>" +
      "</article>"
    );
  };

  var useList = viewPrefs.view === "list";
  var useGroups = viewPrefs.group;
  var itemHtml = useList ? rowHtml : cardHtml;
  var wrap = function (items) {
    return '<div class="' + (useList ? "list" : "grid") + '">' + items.map(itemHtml).join("") + "</div>";
  };
  var thHtml = useList
    ? '<div class="ord-th"><span></span><span>' + t("ordColOrder") + "</span><span>" + t("ordColDate") + '</span><span class="r">' + t("ordColTotal") +
      '</span><span class="r">' + t("ordColDue") + "</span><span>" + t("ordColPaid") + "</span><span>" + t("ordColStatus") + "</span></div>"
    : "";
  if (useList && !list.some(function (o) { return o.id === ordSel; })) ordSel = list[0].id;
  var lay = document.getElementById("ordLayout");
  if (lay) lay.classList.toggle("is-cards", !useList);
  var meta = document.getElementById("ordMeta");
  if (meta) meta.textContent = t(state.sort === "newest" ? "ordMetaNewest" : state.sort === "oldest" ? "ordMetaOldest" : "ordMetaStatus");

  if (!useList && !useGroups) {
    grid.className = "grid";
    grid.innerHTML = list.map(cardHtml).join("");
  } else {
    grid.className = "grid-flow";
    if (!useGroups) {
      grid.innerHTML = thHtml + wrap(list);
    } else {
      grid.innerHTML = thHtml + STATUS_GROUPS.map(function (g) {
        var items = list.filter(function (o) { return g.statuses.indexOf(o.status) !== -1; });
        if (!items.length) return "";
        var collapsed = !!viewPrefs.collapsed[g.key];
        var due = g.key === "pay"
          ? items.reduce(function (sum, o) { return sum + remainingOf(o); }, 0)
          : 0;
        return '<section class="group' + (collapsed ? " collapsed" : "") + '">' +
          '<button type="button" class="group-head" data-group="' + g.key + '" aria-expanded="' + (!collapsed) + '">' +
            '<svg class="chev-g" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l4 4 4-4"/></svg>' +
            statusIconHtml(g.icon, "sm") +
            "<span>" + t(g.labelKey) + '</span><span class="g-count">' + items.length + "</span>" +
            (due > 0 ? '<span class="g-extra">' + t("dueLine", { remain: money(due) }) + "</span>" : "") +
          "</button>" +
          (collapsed ? "" : wrap(items)) +
        "</section>";
      }).join("");
      Array.prototype.forEach.call(grid.querySelectorAll(".group-head"), function (h) {
        h.addEventListener("click", function () {
          var key = h.getAttribute("data-group");
          viewPrefs.collapsed[key] = !viewPrefs.collapsed[key];
          saveViewPrefs();
          renderGrid();
        });
      });
    }
  }

  Array.prototype.forEach.call(grid.querySelectorAll(".card, .row"), function (card) {
    card.addEventListener("click", function (e) {
      if (selectMode) { toggleSelected(card.getAttribute("data-id")); return; }
      if (e.target.closest(".status-select")) return;
      var cid = card.getAttribute("data-id");
      if (ordSideOn()) { ordSel = cid; ordSyncActive(); renderOrderSide(); return; }
      openDetailModal(cid);
    });
    if (card.classList.contains("row")) card.addEventListener("dblclick", function (e) {
      if (!selectMode && !e.target.closest(".status-select") && ordSideOn()) openDetailModal(card.getAttribute("data-id"));
    });
  });
  renderOrderSide();

  Array.prototype.forEach.call(grid.querySelectorAll(".status-select"), function (sel) {
    sel.addEventListener("click", function (e) { e.stopPropagation(); });
    sel.addEventListener("mousedown", function (e) { e.stopPropagation(); });
    sel.addEventListener("change", function (e) {
      e.stopPropagation();
      updateOrderStatus(sel.getAttribute("data-id"), sel.value);
    });
  });
}

function statusSelectHtml(o) {
  var st = STATUS_STYLE[o.status] ? o.status : "deposit";
  var options = ["wishlist", "deposit", "full", "shipping", "intransit", "received", "cancelled"].map(function (key) {
    return '<option value="' + key + '"' + (o.status === key ? " selected" : "") + ">" + statusLabel(key) + "</option>";
  }).join("");
  return '<span class="status-pick" data-st="' + st + '" style="--c:var(--status-' + st + ')" title="' + escapeHtml(statusLabel(st)) + '">' +
    '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-st-' + st + '"/></svg><span class="sp-label">' + escapeHtml(statusLabel(st)) + "</span>" +
    '<select class="status-select" data-id="' + o.id + '" aria-label="' + t("changeStatusAria") + ": " + escapeHtml(statusLabel(st)) + '">' + options + "</select></span>";
}

function updateOrderStatus(id, newStatus) {
  var order = state.orders.find(function (o) { return o.id === id; });
  if (!order || order.status === newStatus) return;
  var oldStatus = order.status, oldPaid = order.paidFullDate;
  order.status = newStatus;
  var paid = financeOnStatusChange(order, oldStatus);
  if (saveData()) {
    renderStats();
    renderGrid();
    if (typeof finRenderAll === "function") finRenderAll();
    if (paid) offerBalanceUndo(order, paid, oldStatus, oldPaid);
    else showToast(t("toastStatusUpdated", { status: statusLabel(newStatus) }));
  }
}

function placeholderSvg() {
  return '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="m3 15 4.5-4.5a2 2 0 0 1 2.8 0L15 15"/>' +
    '<circle cx="9" cy="9" r="1.5"/></svg>';
}

function renderAll() {
  renderStats();
  renderMonthOptions();
  renderGrid();
  if (typeof renderNav === "function") renderNav();
  if (typeof renderHome === "function" && currentPageId === "home") renderHome();
}


// ---------- Orders: selected order + detail side panel ----------
var ordSel = null;
function ordSideOn() { return viewPrefs.view === "list" && window.matchMedia("(min-width:900px)").matches; }
function ordPaidPct(o) {
  if (o.status === "wishlist") return null;
  var full = Number(o.fullPrice) || 0;
  if (o.status === "deposit") return full > 0 ? Math.max(0, Math.min(100, Math.round((Number(o.depositPaid) || 0) / full * 100))) : 0;
  if (o.status === "cancelled") return null;
  return 100;
}
function formatDateShort(dateStr) { return formatDateLong(dateStr); }
function ordSyncActive() {
  Array.prototype.forEach.call(document.querySelectorAll("#grid .row"), function (r) {
    r.classList.toggle("is-active", r.getAttribute("data-id") === ordSel);
  });
}
var ORD_STEP_OF = { wishlist: 0, deposit: 1, full: 2, shipping: 3, intransit: 3, received: 4 };
function renderOrderSide() {
  var box = document.getElementById("orderSide");
  if (!box) return;
  var o = state.orders.find(function (x) { return x.id === ordSel; });
  if (!o) { box.innerHTML = ""; return; }
  var remain = remainingOf(o);
  var full = Number(o.fullPrice) || 0;
  var pays = orderPayments(o).filter(function (r) { return r.type === "expense"; });
  var paid = o.status === "wishlist" ? 0 : (o.status === "deposit" ? (Number(o.depositPaid) || 0) : (o.status === "cancelled" ? orderPaidTotal(o) : full));
  var pct = full > 0 ? Math.max(0, Math.min(100, Math.round(paid / full * 100))) : 0;
  var cancelled = o.status === "cancelled";
  var cur = ORD_STEP_OF[o.status];
  var thumb = o.mainImage
    ? '<img src="' + (o.mainThumb || o.mainImage).replace(/"/g, "&quot;") + '" alt="">'
    : placeholderSvg();
  var steps = "";
  if (!cancelled) {
    for (var i = 0; i < 5; i++) {
      var cls = i < cur ? "done" : (i === cur ? "now" : "");
      steps += '<div class="stp ' + cls + '"><i>' + (i < cur ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>' : (i + 1)) + "</i><span>" + t("ordStep" + (i + 1)) + "</span></div>" +
        (i < 4 ? '<em class="' + (i < cur ? "done" : "") + '"></em>' : "");
    }
  }
  var payRows = pays.map(function (r) {
    return '<div class="op-row"><span class="d">' + escapeHtml(formatDateShort(r.date)) + "</span><b>" + escapeHtml(t(PAY_KIND_KEY[r.kind] || "finKindPaid")) + "</b>" +
      (r.acct ? "<small>" + escapeHtml(acctName(r.acct)) + "</small>" : "") + '<b class="a">฿' + money(r.amount) + "</b></div>";
  }).join("") || '<div class="op-none">' + t("ordSideNoPay") + "</div>";
  box.innerHTML =
    '<section class="panel p-orders"><div class="ph"><div class="tg"></div><h2>' + t("ordSideTitle") + '</h2><button type="button" class="more" data-ord-open="1">' + t("ordSideOpen") + "</button></div>" +
    '<div class="pb op-body">' +
      '<div class="op-head"><div class="op-thumb">' + thumb + '</div><div class="op-tt"><div class="op-name">' + nameHtml(o) + '</div><div class="op-sub">' +
        escapeHtml(o.shopName || t("noShop")) + " · " + t("ordSideOrderedOn") + " " + escapeHtml(formatDateShort(o.purchaseDate)) + "</div>" + statusSelectHtml(o) + "</div></div>" +
      (cancelled ? "" : '<div class="op-k">' + t("ordSideProgress") + '</div><div class="op-steps">' + steps + "</div>") +
      '<div class="op-nums"><div><div class="op-k">' + t("ordSideTotal") + '</div><div class="op-v">' + priceHtml(o) + '</div></div><div><div class="op-k">' + t("ordSidePaid") +
        '</div><div class="op-v pos">฿' + money(paid) + '</div></div><div><div class="op-k">' + t("ordSideDue") + (o.dueDate && remain > 0 ? " " + escapeHtml(formatDateShort(o.dueDate)) : "") +
        '</div><div class="op-v' + (remain > 0 ? " neg" : "") + '">' + (remain > 0 ? "฿" + money(remain) : "\u2014") + "</div></div></div>" +
      '<div class="pbar op-bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="op-k">' + t("ordSidePayments") + "</div>" + payRows +
      '<div class="op-actions">' +
        ((o.status === "deposit" || o.status === "wishlist") ? '<button type="button" class="btn-primary" data-ord-pay="1">' + t("ordSideMarkPaid") + "</button>" : "") +
        '<button type="button" class="btn-secondary" data-ord-edit="1">' + t("editBtn") + "</button></div>" +
    "</div></section>";
  var sel = box.querySelector(".status-select");
  if (sel) {
    sel.addEventListener("change", function () { updateOrderStatus(o.id, sel.value); });
  }
  box.querySelector("[data-ord-open]").addEventListener("click", function () { openDetailModal(o.id); });
  box.querySelector("[data-ord-edit]").addEventListener("click", function () { openOrderModal(o.id); });
  var pb = box.querySelector("[data-ord-pay]");
  if (pb) pb.addEventListener("click", function () { updateOrderStatus(o.id, "full"); });
}
window.addEventListener("resize", function () { if (typeof renderGrid === "function" && currentPageId === "orders") { clearTimeout(window.__ordRz); window.__ordRz = setTimeout(renderGrid, 150); } });
