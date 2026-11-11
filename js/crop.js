/* EliteBiker Ride, orezanie fotky pred nahraním.
   EBCrop.open(file, voľby) → Promise: { blob, aspect } | { skip: true } | null (zrušené) */
(function () {
  "use strict";
  var ASP = [["orig", "Pôvodný"], ["4:5", "4:5"], ["1:1", "1:1"], ["9:16", "9:16"]];
  var X = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var ROT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>';
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ratio(a, w, h) { if (a === "orig") return w / h; var p = a.split(":"); return +p[0] / +p[1]; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function loadFile(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { res({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("Túto fotku sa nepodarilo otvoriť.")); };
      img.src = url;
    });
  }

  // veľké fotky z mobilu (12 až 48 Mpx) zmenšíme, aby sa orezanie otvorilo hneď a nesekalo
  function shrink(img, max) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, k = max / Math.max(w, h);
    if (k >= 1) return img;
    var c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
    var x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  function open(file, o) {
    o = o || {};
    // okno orezania sa ukáže hneď po výbere fotky, fotka sa do neho načíta
    var root = document.createElement("div"), cancelled = false;
    root.className = "crop-ov crop-loading"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", o.title || "Orezať fotku");
    root.innerHTML = '<div class="sh-top"><button class="icb" data-c="cancel" aria-label="Zrušiť">' + X + "</button><b>" + esc(o.title || "Orezať fotku") + "</b>" + (o.count ? '<small class="crop-n">' + esc(o.count) + "</small>" : "") + "</div>" +
      '<div class="crop-stage"><div class="crop-wait"><span class="crop-spin"></span>Načítavam fotku…</div><div class="crop-box' + (o.round ? " round" : "") + '"><canvas></canvas><i class="crop-grid"></i></div></div>' +
      '<div class="crop-ctl">' + (o.lock ? "" : '<div class="crop-asp">' + ASP.map(function (x) { return '<button type="button" data-c="asp" data-v="' + x[0] + '" class="' + ((o.aspect || "orig") === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div>") +
      '<div class="crop-row"><button type="button" class="crop-rot" data-c="rot" aria-label="Otočiť o 90°">' + ROT + '</button><input type="range" min="1" max="4" step="0.01" value="1" aria-label="Priblíženie"></div>' +
      '<div class="lacts"><button type="button" class="btn gh" data-c="skip">Bez orezania</button><button type="button" class="btn" data-c="ok">Použiť</button></div>' +
      '<p class="info">Posuň fotku prstom, priblíž dvoma prstami alebo posuvníkom.</p></div>';
    (o.parent || document.body).appendChild(root);
    function early(e) { var b = e.target.closest('[data-c="cancel"]'); if (b && root.classList.contains("crop-loading")) { cancelled = true; root.remove(); } }
    root.addEventListener("click", early);
    return loadFile(file).then(function (L) {
      root.removeEventListener("click", early);
      if (cancelled) { URL.revokeObjectURL(L.url); return null; }
      root.classList.remove("crop-loading");
      return new Promise(function (resolve) {
        var img = shrink(L.img, 2600), st = { a: o.aspect || "orig", rot: 0, z: 1, cx: 0, cy: 0 }, box = { w: 1, h: 1 }, ptrs = {}, pinch = null, done = false;
        var stage = root.querySelector(".crop-stage"), bx = root.querySelector(".crop-box"), cv = root.querySelector("canvas"), ctx = cv.getContext("2d"), zr = root.querySelector("input[type=range]");

        function dims() { return st.rot % 180 ? [img.height, img.width] : [img.width, img.height]; }
        function scale() { var d = dims(); return Math.max(box.w / d[0], box.h / d[1]) * st.z; }
        function fix() {
          var d = dims(), s = scale(), mx = Math.max(0, (d[0] * s - box.w) / 2), my = Math.max(0, (d[1] * s - box.h) / 2);
          st.cx = clamp(st.cx, -mx, mx); st.cy = clamp(st.cy, -my, my);
        }
        function paint(c, W, H, k) {
          var s = scale() * k;
          c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
          c.translate(W / 2 + st.cx * k, H / 2 + st.cy * k); c.rotate(st.rot * Math.PI / 180);
          c.imageSmoothingQuality = "high";
          c.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s);
          c.setTransform(1, 0, 0, 1, 0, 0);
        }
        function draw() { fix(); var dpr = Math.min(3, window.devicePixelRatio || 1); paint(ctx, cv.width, cv.height, dpr); }
        function layout() {
          var d = dims(), r = ratio(st.a, d[0], d[1]);
          var aw = Math.max(120, stage.clientWidth - 32), ah = Math.max(120, stage.clientHeight - 24);
          var w = Math.min(aw, ah * r); box = { w: Math.round(w), h: Math.round(w / r) };
          bx.style.width = box.w + "px"; bx.style.height = box.h + "px";
          var dpr = Math.min(3, window.devicePixelRatio || 1);
          cv.width = Math.round(box.w * dpr); cv.height = Math.round(box.h * dpr);
          draw();
        }
        function zoomTo(z) { z = clamp(z, 1, 4); var f = z / st.z; st.cx *= f; st.cy *= f; st.z = z; zr.value = z; draw(); }
        function finish(v) {
          if (done) return; done = true;
          document.removeEventListener("keydown", onKey, true); window.removeEventListener("resize", layout);
          root.remove(); URL.revokeObjectURL(L.url); resolve(v);
        }
        function output() {
          var max = o.max || 1600, k = Math.min(max / Math.max(box.w, box.h), 1 / scale());
          var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(box.w * k)); c.height = Math.max(1, Math.round(box.h * k));
          paint(c.getContext("2d"), c.width, c.height, k);
          c.toBlob(function (b) { finish(b ? { blob: b, aspect: st.a } : { skip: true }); }, "image/jpeg", .92);
        }
        function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); finish(null); } }

        root.addEventListener("click", function (e) {
          var b = e.target.closest("[data-c]"); if (!b) return;
          var c = b.dataset.c;
          if (c === "cancel") finish(null);
          else if (c === "skip") finish({ skip: true });
          else if (c === "ok") output();
          else if (c === "rot") { st.rot = (st.rot + 90) % 360; st.z = 1; st.cx = st.cy = 0; zr.value = 1; layout(); }
          else if (c === "asp") { st.a = b.dataset.v; st.z = 1; st.cx = st.cy = 0; zr.value = 1; [].forEach.call(root.querySelectorAll(".crop-asp button"), function (x) { x.classList.toggle("on", x === b); }); layout(); }
        });
        zr.addEventListener("input", function () { zoomTo(+zr.value); });
        bx.addEventListener("pointerdown", function (e) {
          ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
          try { bx.setPointerCapture(e.pointerId); } catch (x) { /* staršie prehliadače */ }
          var k = Object.keys(ptrs);
          if (k.length === 2) { var a = ptrs[k[0]], b = ptrs[k[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: st.z }; }
        });
        bx.addEventListener("pointermove", function (e) {
          var p = ptrs[e.pointerId]; if (!p) return;
          var k = Object.keys(ptrs);
          if (k.length >= 2 && pinch) {
            ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
            var a = ptrs[k[0]], b = ptrs[k[1]];
            zoomTo(pinch.z * (Math.hypot(a.x - b.x, a.y - b.y) || 1) / pinch.d);
          } else {
            st.cx += e.clientX - p.x; st.cy += e.clientY - p.y; ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; draw();
          }
        });
        function up(e) { delete ptrs[e.pointerId]; if (Object.keys(ptrs).length < 2) pinch = null; }
        bx.addEventListener("pointerup", up); bx.addEventListener("pointercancel", up);
        bx.addEventListener("wheel", function (e) { e.preventDefault(); zoomTo(st.z * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
        document.addEventListener("keydown", onKey, true);
        window.addEventListener("resize", layout);
        requestAnimationFrame(layout);
        var ok = root.querySelector('[data-c="ok"]'); if (ok && window.innerWidth > 700) ok.focus();
      });
    }, function (e) { root.remove(); throw e; });
  }
  window.EBCrop = { open: open };
})();
