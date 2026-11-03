"use strict";
// Offline support: keeps a copy of the app files so it opens without a connection.
// Strategy: network first (so a new version shows up as soon as you are online), cached copy as the fallback.
// Only this site's own files are handled; Google sign-in, Drive sync and fonts go straight to the network.
var CACHE = "shopping-tracker-__VER__";
var FILES = __FILES__;

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
