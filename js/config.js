"use strict";
var STORAGE_KEY = "preorderVault_v1";
var LANG_KEY = "preorderVault_lang";
var THEME_KEY = "preorderVault_theme";
var HEADER_KEY = "preorderVault_header";
// List view + status groups (remembered between visits).
var VIEW_KEY = "preorderVault_view_v2";
var viewPrefs = { view: "list", group: false, collapsed: {} };
try {
  var savedView = JSON.parse(localStorage.getItem(VIEW_KEY) || "null");
  if (savedView) {
    if (savedView.view === "list" || savedView.view === "cards") viewPrefs.view = savedView.view;
    if (typeof savedView.group === "boolean" && savedView.g2) viewPrefs.group = savedView.group;
    if (savedView.collapsed && typeof savedView.collapsed === "object") viewPrefs.collapsed = savedView.collapsed;
  }
} catch (e) { /* ignore */ }
function saveViewPrefs() {
  try { localStorage.setItem(VIEW_KEY, JSON.stringify({ view: viewPrefs.view, group: viewPrefs.group, collapsed: viewPrefs.collapsed, g2: 1 })); } catch (e) { /* ignore */ }
}
var STATUS_GROUPS = [
  { key: "pay",       statuses: ["deposit"],                          labelKey: "groupPay",       icon: "deposit" },
  { key: "wait",      statuses: ["full", "shipping", "intransit"],    labelKey: "groupWait",      icon: "shipping" },
  { key: "wishlist",  statuses: ["wishlist"],                         labelKey: "groupWishlist",  icon: "wishlist" },
  { key: "done",      statuses: ["received"],                         labelKey: "groupDone",      icon: "received" },
  { key: "cancelled", statuses: ["cancelled"],                        labelKey: "groupCancelled", icon: "cancelled" }
];

var PRIMARY_KEY = "preorderVault_primary";
// Primary colors: the six status-palette colors plus the original teal.
// fill = button/fill color, ink = same hue readable as text on that mode's background, on = text drawn on the fill.
var PRIMARIES = [
  { id: "blue",   nameKey: "colorBlue",   dark: { c: "#6f8bff", ink: "#8ea4ff", on: "#101114" }, light: { c: "#1b3fd0", ink: "#1b3fd0", on: "#ffffff" } },
  { id: "green",  nameKey: "colorGreen",  dark: { c: "#5ccf86", ink: "#5ccf86", on: "#101114" }, light: { c: "#1e7a40", ink: "#1e7a40", on: "#ffffff" } },
  { id: "red",    nameKey: "colorRed",    dark: { c: "#ff6a4a", ink: "#ff8466", on: "#101114" }, light: { c: "#ee4a2a", ink: "#d63a1c", on: "#ffffff" } },
  { id: "yellow", nameKey: "colorYellow", dark: { c: "#f7c419", ink: "#f7c419", on: "#101114" }, light: { c: "#f7c419", ink: "#8a6a00", on: "#121212" } },
  { id: "purple", nameKey: "colorPurple", dark: { c: "#b8a0ea", ink: "#c9b6f2", on: "#101114" }, light: { c: "#b8a0ea", ink: "#6b4fc0", on: "#121212" } },
  { id: "pink",   nameKey: "colorPink",   dark: { c: "#f48ba6", ink: "#f7a3b9", on: "#101114" }, light: { c: "#f48ba6", ink: "#c43c68", on: "#121212" } },
  { id: "black",  nameKey: "colorBlack",  dark: { c: "#f3ecda", ink: "#f3ecda", on: "#121212" }, light: { c: "#121212", ink: "#121212", on: "#ffffff" } }
];

var STATUS_STYLE = {
  deposit:   { bg: "status-deposit-bg",   border: "b-deposit"   },
  full:      { bg: "status-full-bg",      border: "b-full"      },
  shipping:  { bg: "status-shipping-bg",  border: "b-shipping"  },
  intransit: { bg: "status-intransit-bg", border: "b-intransit" },
  received:  { bg: "status-received-bg",  border: "b-received"  },
  cancelled: { bg: "status-cancelled-bg", border: "b-cancelled" },
  wishlist:  { bg: "status-wishlist-bg",  border: "b-wishlist"  }
};

var STATUS_KEY_MAP = {
  deposit: "statusDeposit",
  full: "statusFull",
  shipping: "statusShipping",
  intransit: "statusInTransit",
  received: "statusReceived",
  cancelled: "statusCancelled",
  wishlist: "statusWishlist"
};

// Status = a small coloured icon (shape tells the status, colour only supports it).
function statusIconHtml(status, cls) {
  return '<span class="si' + (cls ? " " + cls : "") + '" style="--c:var(--status-' + status + ')"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-st-' + status + '"/></svg></span>';
}
