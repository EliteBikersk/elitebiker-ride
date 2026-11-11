/* EliteBiker Ride – service worker: rýchle otvorenie a slabý signál (cache samotnej appky) a upozornenia (web push).
   Do cache ide len appka (stránka, skripty, štýly, písmo, ikonky). Údaje zo servera, mapy ani fotky sem nikdy nejdú. */
var V = "eb-ride-v1";
var SHELL = ["./", "index.html", "css/fonts.css", "css/app.css", "vendor/leaflet.css", "vendor/leaflet.js", "vendor/supabase.js",
  "js/config.js", "js/api.js", "js/mock.js", "js/map.js", "js/crop.js", "js/app.js", "manifest.webmanifest",
  "icon-192.png", "apple-touch-icon.png", "favicon-32.png", "badge-96.png",
  "vendor/images/marker-icon.png", "vendor/images/marker-icon-2x.png", "vendor/images/marker-shadow.png",
  "fonts/poppins-latin-400-normal.woff2", "fonts/poppins-latin-500-normal.woff2", "fonts/poppins-latin-600-normal.woff2", "fonts/poppins-latin-700-normal.woff2", "fonts/poppins-latin-800-normal.woff2",
  "fonts/poppins-latin-ext-400-normal.woff2", "fonts/poppins-latin-ext-500-normal.woff2", "fonts/poppins-latin-ext-600-normal.woff2", "fonts/poppins-latin-ext-700-normal.woff2", "fonts/poppins-latin-ext-800-normal.woff2"];

function scoped(path) { return new URL(path, self.registration.scope).href; }

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return c.add(new Request(scoped(u), { cache: "reload" })).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("eb-ride-") === 0 && k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// kľúč v cache: adresa bez parametrov (?pozvanka=… a pod.); úvodná stránka je vždy index.html
function keyOf(req, url) {
  var scope = new URL(self.registration.scope);
  if (req.mode === "navigate" && (url.pathname === scope.pathname || url.pathname === scope.pathname + "index.html")) return scoped("index.html");
  return url.origin + url.pathname;
}
// stránka a skripty: najprv sieť (vždy najnovšia verzia), pri slabom signáli po 3 s alebo bez siete z cache
function netFirst(req, key) {
  return caches.open(V).then(function (c) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var cached = function () { return c.match(key); };
      var t = setTimeout(function () { cached().then(function (m) { if (m && !done) { done = true; resolve(m); } }); }, 3000);
      fetch(req).then(function (r) {
        if (r && r.ok && r.type === "basic") c.put(key, r.clone()).catch(function () {});
        if (!done) { done = true; clearTimeout(t); resolve(r); }
      }, function (err) {
        clearTimeout(t);
        if (done) return;
        cached().then(function (m) { done = true; if (m) resolve(m); else reject(err); });
      });
    });
  });
}
// písmo, ikonky, obrázky appky: hneď z cache a na pozadí sa obnovia
function fromCacheThenNet(e, req, key) {
  return caches.open(V).then(function (c) {
    return c.match(key).then(function (m) {
      var net = fetch(req).then(function (r) { if (r && r.ok && r.type === "basic") c.put(key, r.clone()).catch(function () {}); return r; });
      if (m) { e.waitUntil(net.catch(function () {})); return m; }
      return net;
    });
  });
}
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  // server (prihlásenie, jazdy, chat), mapy a fotky idú vždy priamo, bez cache
  if (url.origin !== self.location.origin || url.pathname.indexOf(new URL(self.registration.scope).pathname) !== 0) return;
  var key = keyOf(req, url);
  if (req.mode === "navigate" || /\.(html|js|css|webmanifest)$/.test(url.pathname)) e.respondWith(netFirst(req, key));
  else e.respondWith(fromCacheThenNet(e, req, key));
});

self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "EliteBiker Ride", {
    body: d.body || "",
    icon: "icon-192.png",
    badge: "badge-96.png",
    tag: d.tag || undefined,
    data: { url: d.url || "./" }
  }));
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  // odkaz mimo appky (napríklad objednanie servisu v e-shope) otvoríme zvlášť
  if (url.indexOf(self.registration.scope) !== 0) { e.waitUntil(self.clients.openWindow(url)); return; }
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.indexOf(self.registration.scope) === 0 && "focus" in c) {
        if ("navigate" in c) c.navigate(url);
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
