"use strict";
// Offline support: keeps a copy of the app files so it opens without a connection.
// Strategy: network first (so a new version shows up as soon as you are online), cached copy as the fallback.
// Only this site's own files are handled; Google sign-in, Drive sync and fonts go straight to the network.
var CACHE = "shopping-tracker-20261103j";
var FILES = [
  "./",
  "index.html",
  "privacy.html",
  "manifest.webmanifest",
  "icons/favicon-64.png",
  "icons/apple-touch-icon.png",
  "css/app.css?v=20261103j",
  "css/theme-b.css?v=20261103j",
  "css/daybook.css?v=20261103j",
  "js/config.js?v=20261103j",
  "js/i18n-data.js?v=20261103j",
  "js/state.js?v=20261103j",
  "js/i18n.js?v=20261103j",
  "js/appearance.js?v=20261103j",
  "js/header.js?v=20261103j",
  "js/storage.js?v=20261103j",
  "js/utils.js?v=20261103j",
  "js/images.js?v=20261103j",
  "js/render.js?v=20261103j",
  "js/order-form.js?v=20261103j",
  "js/bulk.js?v=20261103j",
  "js/detail.js?v=20261103j",
  "js/data-io.js?v=20261103j",
  "js/optimize.js?v=20261103j",
  "js/sync.js?v=20261103j",
  "js/router.js?v=20261103j",
  "js/home.js?v=20261103j",
  "js/finance-data.js?v=20261103j",
  "js/finance-sync.js?v=20261103j",
  "js/finance-ui.js?v=20261103j",
  "js/finance-acc.js?v=20261103j",
  "js/planner.js?v=20261103j",
  "js/main.js?v=20261103j",
  "js/pwa.js?v=20261103j",
  "fonts/anuphan.woff",
  "fonts/k2d-400.woff",
  "fonts/k2d-500.woff",
  "fonts/k2d-600.woff",
  "fonts/k2d-700.woff",
  "fonts/Iannnnn-COW-Bold.ttf",
  "fonts/iannnnn-DUCK-Bold.ttf",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    new Promise(function (resolve) {
      var done = false;
      function fallback() {
        caches.match(req).then(function (hit) {
          if (hit) return hit;
          if (req.mode === "navigate") return caches.match("index.html");
          return undefined;
        }).then(function (r) { if (!done) { done = true; resolve(r || Response.error()); } });
      }
      // on a slow connection use the saved copy after a few seconds
      var timer = setTimeout(fallback, 4000);
      fetch(req).then(function (res) {
        clearTimeout(timer);
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        if (!done) { done = true; resolve(res); }
      }).catch(function () { clearTimeout(timer); fallback(); });
    })
  );
});
