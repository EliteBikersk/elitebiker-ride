/* EliteBiker Ride – mapy (Leaflet + OpenStreetMap, adresy cez Nominatim) */
(function () {
  "use strict";
  var TILE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  var ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  var PIN_SVG = '<svg viewBox="0 0 44 56"><path d="M22 1C10.4 1 1 10.3 1 21.8 1 37 22 55 22 55s21-18 21-33.2C43 10.3 33.6 1 22 1z" fill="#1b46e5" stroke="#fff" stroke-width="2"/><circle cx="22" cy="21" r="8" fill="#fff"/></svg>';
  var FLAG_SVG = '<svg viewBox="0 0 44 56"><path d="M22 1C10.4 1 1 10.3 1 21.8 1 37 22 55 22 55s21-18 21-33.2C43 10.3 33.6 1 22 1z" fill="#11131a" stroke="#fff" stroke-width="2"/><path d="M16 12v18M16 13h12l-3 4 3 4H16" stroke="#fff" stroke-width="2.4" fill="none" stroke-linejoin="round"/></svg>';

  function ok() { return typeof window.L !== "undefined"; }
  function pinIcon(svg, size) {
    size = size || 34;
    return L.divIcon({ className: "", html: '<div style="width:' + size + 'px;height:' + Math.round(size * 1.27) + 'px">' + (svg || PIN_SVG) + "</div>",
      iconSize: [size, Math.round(size * 1.27)], iconAnchor: [size / 2, Math.round(size * 1.27)] });
  }
  function base(el, opts) {
    var m = L.map(el, Object.assign({ zoomControl: false, attributionControl: true }, opts || {}));
    L.tileLayer(TILE, { maxZoom: 19, attribution: ATTR }).addTo(m);
    m.attributionControl.setPrefix(false);
    return m;
  }
  function haversine(a, b) {
    var R = 6371, toR = Math.PI / 180;
    var dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  function routeKm(pts) { var s = 0; for (var i = 1; i < (pts || []).length; i++) s += haversine(pts[i - 1], pts[i]); return Math.round(s * 10) / 10; }

  /* --- adresy (Nominatim: max. 1 požiadavka za sekundu) --- */
  var lastGeo = 0, geoQueue = Promise.resolve();
  function throttled(url) {
    geoQueue = geoQueue.then(function () {
      var wait = Math.max(0, 1100 - (Date.now() - lastGeo));
      return new Promise(function (r) { setTimeout(r, wait); });
    }).then(function () {
      lastGeo = Date.now();
      return fetch(url, { headers: { "Accept-Language": "sk" } }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    });
    return geoQueue;
  }
  function shortAddr(a, display) {
    if (!a) return display || "";
    var place = a.amenity || a.shop || a.leisure || a.tourism || a.building || a.peak || a.natural || "";
    var street = [a.road || a.pedestrian || a.path || a.footway || a.track || "", a.house_number || ""].join(" ").trim();
    var town = a.village || a.town || a.city || a.municipality || a.suburb || "";
    var main = place || street || (display || "").split(",")[0];
    return [main, town && main !== town ? town : ""].filter(Boolean).join(", ");
  }
  function reverse(lat, lng) {
    return throttled("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=" + lat + "&lon=" + lng)
      .then(function (j) { return j ? shortAddr(j.address, j.display_name) : ""; });
  }
  function search(q, near) {
    var vb = near ? "&viewbox=" + (near.lng - 1) + "," + (near.lat + 0.7) + "," + (near.lng + 1) + "," + (near.lat - 0.7) : "";
    return throttled("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=sk,cz&q=" + encodeURIComponent(q) + vb)
      .then(function (j) { return (j || []).map(function (r) { return { lat: +r.lat, lng: +r.lon, label: shortAddr(r.address, r.display_name), full: r.display_name }; }); });
  }

  /* --- mapa v detaile jazdy --- */
  function showRide(el, ride) {
    if (!ok() || !el) return null;
    var m = base(el, { dragging: !L.Browser.mobile, scrollWheelZoom: false, tap: false });
    var ll = [ride.meet.lat, ride.meet.lng];
    L.marker(ll, { icon: pinIcon() }).addTo(m);
    if (ride.route && ride.route.length > 1) {
      var line = L.polyline(ride.route, { color: "#1b46e5", weight: 5, opacity: .9 }).addTo(m);
      m.fitBounds(line.getBounds().extend(ll), { padding: [24, 24] });
    } else m.setView(ll, 14);
    setTimeout(function () { m.invalidateSize(); }, 380);
    return m;
  }

  /* --- výber stretka: posúvaš mapu, špendlik ostáva v strede (ako Wolt) --- */
  function pickPoint(root, opts) {
    if (!ok()) { root.innerHTML = '<div class="empty-state"><b>Mapa sa nenačítala</b>Skontroluj pripojenie na internet.</div>'; return; }
    var start = opts.value || opts.home;
    root.innerHTML =
      '<div class="mp" id="mp"><div class="mp-map"><div id="mpMap" style="position:absolute;inset:0"></div><div class="mp-dot"></div><div class="mp-pin">' + PIN_SVG + '</div>' +
      '<div class="mp-top"><button class="icb" data-mp="close" aria-label="Zavrieť">' + opts.icons.back + '</button><div class="mp-search"><input id="mpQ" placeholder="Hľadať miesto, ulicu, obec…" autocomplete="off"><div class="mp-res" id="mpRes" hidden></div></div></div>' +
      '<div class="mp-loc"><button class="icb" data-mp="loc" aria-label="Moja poloha">' + opts.icons.loc + '</button></div></div>' +
      '<div class="mp-card"><div class="eyebrow">' + (opts.title || "Miesto stretka") + '</div><div class="addr" id="mpAddr">…</div>' +
      '<input class="inp" id="mpLabel" style="margin-top:10px" placeholder="Doplň, napr. pri bráne, pri lavičke (nepovinné)" value="' + (opts.note || "") + '">' +
      '<div class="row2"><button class="btn full" data-mp="ok">Potvrdiť miesto</button></div></div></div>';
    var mp = root.querySelector("#mp");
    var m = base(root.querySelector("#mpMap"), { zoomControl: false });
    m.setView([start.lat, start.lng], opts.value ? 16 : 14);
    var addr = opts.value && opts.value.label || "", tmr;
    function upd() {
      var c = m.getCenter(); root.querySelector("#mpAddr").innerHTML = "<small>Hľadám adresu…</small>";
      clearTimeout(tmr);
      tmr = setTimeout(function () {
        reverse(c.lat.toFixed(6), c.lng.toFixed(6)).then(function (a) {
          addr = a || (c.lat.toFixed(5) + ", " + c.lng.toFixed(5));
          var el = root.querySelector("#mpAddr"); if (el) el.textContent = addr;
        });
      }, 450);
    }
    m.on("movestart", function () { mp.classList.add("moving"); });
    m.on("moveend", function () { mp.classList.remove("moving"); upd(); });
    if (opts.value && opts.value.label) root.querySelector("#mpAddr").textContent = opts.value.label; else upd();
    setTimeout(function () { m.invalidateSize(); }, 380);

    var q = root.querySelector("#mpQ"), res = root.querySelector("#mpRes"), qt;
    q.addEventListener("input", function () {
      clearTimeout(qt);
      var v = q.value.trim();
      if (v.length < 3) { res.hidden = true; return; }
      qt = setTimeout(function () {
        var c = m.getCenter();
        search(v, { lat: c.lat, lng: c.lng }).then(function (list) {
          res.hidden = false;
          res.innerHTML = list.length ? list.map(function (r, i) { return '<button data-mp="res" data-i="' + i + '">' + esc(r.label) + "<small>" + esc(r.full) + "</small></button>"; }).join("")
            : '<button disabled>Nič sa nenašlo<small>Skús inak, alebo posuň mapu na miesto</small></button>';
          res._list = list;
        });
      }, 450);
    });
    root.onclick = function (e) {
      var b = e.target.closest("[data-mp]"); if (!b) return;
      var a = b.getAttribute("data-mp");
      if (a === "close") opts.onCancel && opts.onCancel();
      if (a === "res") { var r = res._list[+b.getAttribute("data-i")]; res.hidden = true; q.value = ""; q.blur(); m.setView([r.lat, r.lng], 17); }
      if (a === "loc") locate(m, opts.toast);
      if (a === "ok") {
        var c = m.getCenter(), note = root.querySelector("#mpLabel").value.trim();
        opts.onPick({ lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6), label: (addr || "Miesto na mape") + (note ? " – " + note : ""), addr: addr, note: note });
      }
    };
    return m;
  }

  function locate(m, toast) {
    if (!navigator.geolocation) { toast && toast("Tento prehliadač nevie zistiť polohu."); return; }
    navigator.geolocation.getCurrentPosition(function (p) { m.setView([p.coords.latitude, p.coords.longitude], 16); },
      function () { toast && toast("Polohu sa nepodarilo zistiť. Povoľ ju v prehliadači."); }, { enableHighAccuracy: true, timeout: 8000 });
  }

  /* --- kreslenie trasy: ťukaj na mapu, body sa spájajú --- */
  function drawRoute(root, opts) {
    if (!ok()) { root.innerHTML = '<div class="empty-state"><b>Mapa sa nenačítala</b></div>'; return; }
    var pts = (opts.value || []).slice();
    if (!pts.length && opts.start) pts.push([opts.start.lat, opts.start.lng]);
    root.innerHTML =
      '<div class="mp" id="mp"><div class="mp-map"><div id="mpMap" style="position:absolute;inset:0"></div>' +
      '<div class="mp-top"><button class="icb" data-mp="close" aria-label="Zavrieť">' + opts.icons.back + '</button><div class="mp-search"><input id="mpQ" placeholder="Posunúť mapu na miesto…" autocomplete="off"><div class="mp-res" id="mpRes" hidden></div></div></div>' +
      '<div class="mp-hint" id="mpHint">Ťukaj na mapu – body sa spoja do trasy</div>' +
      '<div class="mp-loc"><button class="icb" data-mp="loc" aria-label="Moja poloha">' + opts.icons.loc + '</button></div></div>' +
      '<div class="mp-card"><div class="eyebrow">Trasa jazdy</div><div class="addr" id="mpKm"></div>' +
      '<div class="row2"><button class="btn gh" data-mp="undo">Späť</button><button class="btn gh" data-mp="loop">Okruh</button><button class="btn gh" data-mp="clear">Vymazať</button><button class="btn" style="flex:1" data-mp="ok">Hotovo</button></div></div></div>';
    var m = base(root.querySelector("#mpMap"));
    var line = L.polyline(pts, { color: "#1b46e5", weight: 5 }).addTo(m), marks = L.layerGroup().addTo(m);
    if (opts.start) L.marker([opts.start.lat, opts.start.lng], { icon: pinIcon(), interactive: false }).addTo(m);
    function redraw() {
      line.setLatLngs(pts); marks.clearLayers();
      pts.forEach(function (p, i) { L.marker(p, { icon: L.divIcon({ className: "", html: '<div class="vtx' + (i ? "" : " first") + '"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }), interactive: false }).addTo(marks); });
      var km = routeKm(pts); root.querySelector("#mpKm").innerHTML = pts.length > 1 ? km + " km <small>" + pts.length + " bodov · ťukaním pridáš ďalšie</small>" : "<small>Ťukni na mapu na miesta, kadiaľ pôjdete.</small>";
    }
    if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [40, 40] }); else m.setView(pts[0] || [opts.home.lat, opts.home.lng], 13);
    m.on("click", function (e) { pts.push([+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5)]); redraw(); var h = root.querySelector("#mpHint"); if (h) h.remove(); });
    redraw();
    setTimeout(function () { m.invalidateSize(); }, 380);
    var q = root.querySelector("#mpQ"), res = root.querySelector("#mpRes"), qt;
    q.addEventListener("input", function () {
      clearTimeout(qt); var v = q.value.trim(); if (v.length < 3) { res.hidden = true; return; }
      qt = setTimeout(function () { var c = m.getCenter(); search(v, { lat: c.lat, lng: c.lng }).then(function (list) { res.hidden = false; res._list = list;
        res.innerHTML = list.map(function (r, i) { return '<button data-mp="res" data-i="' + i + '">' + esc(r.label) + "<small>" + esc(r.full) + "</small></button>"; }).join("") || '<button disabled>Nič sa nenašlo</button>'; }); }, 450);
    });
    root.onclick = function (e) {
      var b = e.target.closest("[data-mp]"); if (!b) return; var a = b.getAttribute("data-mp");
      if (a === "close") opts.onCancel && opts.onCancel();
      if (a === "res") { var r = res._list[+b.getAttribute("data-i")]; res.hidden = true; q.value = ""; m.setView([r.lat, r.lng], 15); }
      if (a === "loc") locate(m, opts.toast);
      if (a === "undo") { if (pts.length > (opts.start ? 1 : 0)) pts.pop(); redraw(); }
      if (a === "clear") { pts = opts.start ? [[opts.start.lat, opts.start.lng]] : []; redraw(); }
      if (a === "loop") { if (pts.length > 2) { pts.push(pts[0].slice()); redraw(); } }
      if (a === "ok") opts.onPick(pts.length > 1 ? pts : null, routeKm(pts));
    };
    return m;
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // názov mesta/obce pre približnú polohu (posiela sa len zaokrúhlená poloha)
  function place(lat, lng) {
    return throttled("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&lat=" + (+lat).toFixed(2) + "&lon=" + (+lng).toFixed(2))
      .then(function (j) { var a = (j && j.address) || {}; return a.city || a.town || a.village || a.municipality || a.county || ""; });
  }
  function towns(q) {
    return throttled("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=sk,cz,at,hu,pl&featureType=settlement&q=" + encodeURIComponent(q))
      .then(function (j) { return (j || []).map(function (r) { var a = r.address || {}; return { lat: +r.lat, lng: +r.lon, label: a.city || a.town || a.village || a.municipality || r.name || String(r.display_name || "").split(",")[0], full: r.display_name }; }); });
  }

  window.EBMap = { ok: ok, showRide: showRide, pickPoint: pickPoint, drawRoute: drawRoute, routeKm: routeKm, reverse: reverse, search: search, place: place, towns: towns, haversine: haversine, PIN_SVG: PIN_SVG, FLAG_SVG: FLAG_SVG };
})();
