/* EliteBiker Ride, administrácia.
   Ukazuje len poradie a mená používateľov a súhrnné čísla o používaní, žiadne osobné údaje.
   Prístup má len účet zapísaný ako admin v databáze a po prihlásení kódom z overovacej aplikácie (2FA).
   Všetky kontroly robí server – táto stránka len zobrazuje, čo server dovolí. */
(function () {
  "use strict";
  // stránka sa nesmie dať vložiť do cudzej stránky
  if (window.top !== window.self) { try { window.top.location.replace(window.location.href); } catch (e) { document.documentElement.innerHTML = ""; return; } }

  var C = window.EB_CONFIG || {};
  var live = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  // samostatné prihlásenie len pre túto kartu (po zatvorení karty sa zabudne)
  var sb = live ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, {
    auth: { storage: window.sessionStorage, storageKey: "eb-admin-auth", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  }) : null;
  var IDLE_MIN = 20;
  var TYPES = { cesta: "Cesta", gravel: "Gravel", mtb: "Horský", ebike: "E-bike", dirt: "Dirt / BMX" };
  function fresh(email) { return { mode: "pw", email: email || "", sent: false, days: 30, metric: "active", table: false, q: "", m: null, names: null }; }
  var A = fresh("");

  /* ---------- pomocníci ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var tt; function toast(m, bad) { var t = $("toast"); t.querySelector("span").innerHTML = m; t.classList.toggle("bad", !!bad); t.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("show"); }, 3600); }
  function err(e) { console.error(e); toast(esc(e && e.message || "Niečo sa pokazilo."), true); }
  function d(iso) { return iso ? new Date(iso).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" }) : "nie"; }
  function n(x) { return Number(x || 0).toLocaleString("sk-SK"); }
  function brand() { return '<div class="brand"><img src="' + esc(C.LOGO_URL) + '" alt="EliteBiker"><span class="wm">ELITEBIKER</span><span class="ride">Ride</span></div>'; }
  document.addEventListener("error", function (e) { var t = e.target; if (t && t.tagName === "IMG" && t.parentNode && t.parentNode.classList && t.parentNode.classList.contains("brand")) t.parentNode.classList.add("noimg"); }, true);
  function spin(b) { if (!b) return; b.disabled = true; b.dataset.t = b.innerHTML; b.innerHTML = '<span class="spin-sm"></span>'; }
  function unspin(b) { if (!b) return; b.disabled = false; b.innerHTML = b.dataset.t || "OK"; }

  function rpc(name, args) {
    if (!live) return Demo.rpc(name, args || {});
    return sb.rpc(name, args || {}).then(function (r) {
      if (r.error) {
        var e = new Error(r.error.message || "Chyba servera"); e.hint = r.error.hint;
        if (r.error.hint === "mfa") { A.need = "mfa"; check(); }
        throw e;
      }
      return r.data;
    });
  }

  /* ---------- prihlásenie ---------- */
  function shell(inner) {
    $("root").innerHTML = '<div class="adm-auth"><div class="adm-auth-box">' + brand() + '<p class="adm-tag">Administrácia</p>' + inner +
      '<p class="adm-foot"><a class="link-plain" href="./">← Späť do appky</a></p></div></div>';
  }
  function renderLogin(msg) {
    var m = A.mode;
    shell((msg ? '<div class="adm-msg">' + esc(msg) + "</div>" : "") +
      (m === "pw" ?
        '<form id="lf" novalidate><span class="fl">E-mail</span><input class="inp" id="l-email" type="email" autocomplete="username" required value="' + esc(A.email) + '">' +
        '<span class="fl">Heslo</span><input class="inp" id="l-pw" type="password" autocomplete="current-password" required>' +
        '<button class="btn full" type="submit" style="margin-top:16px">Prihlásiť sa</button></form>' +
        '<p class="alt"><button class="link-plain" data-a="mode" data-m="code">Nemáš heslo? Prihlás sa kódom z e-mailu</button></p>'
      :
        '<form id="cf" novalidate><span class="fl">E-mail</span><input class="inp" id="c-email" type="email" autocomplete="username" required value="' + esc(A.email) + '">' +
        '<button class="btn full" type="submit" style="margin-top:12px">' + (A.sent ? "Poslať kód znova" : "Poslať kód") + "</button></form>" +
        (A.sent ? '<form id="vf" novalidate style="margin-top:14px"><span class="fl">Kód z e-mailu</span><input class="inp code" id="c-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456"><button class="btn full" type="submit" style="margin-top:12px">Pokračovať</button></form>' : "") +
        '<p class="alt"><button class="link-plain" data-a="mode" data-m="pw">← Prihlásenie heslom</button></p>') +
      '<p class="adm-note">🔒 Prihlasuješ sa svojím účtom z EliteBiker Ride. Do administrácie sa dostane len účet s oprávnením a po zadaní kódu z overovacej aplikácie v mobile.</p>');
    var lf = $("lf"), cf = $("cf"), vf = $("vf");
    if (lf) { (A.email ? $("l-pw") : $("l-email")).focus(); lf.onsubmit = function (e) {
      e.preventDefault(); var b = lf.querySelector("button"); A.email = $("l-email").value.trim(); spin(b);
      sb.auth.signInWithPassword({ email: A.email, password: $("l-pw").value }).then(function (r) {
        if (r.error) { unspin(b); toast(/invalid/i.test(r.error.message) ? "Nesprávny e-mail alebo heslo." : esc(r.error.message), true); return; }
        check();
      });
    }; }
    if (cf) cf.onsubmit = function (e) {
      e.preventDefault(); var b = cf.querySelector("button"); A.email = $("c-email").value.trim(); spin(b);
      sb.auth.signInWithOtp({ email: A.email, options: { shouldCreateUser: false } }).then(function (r) {
        unspin(b);
        if (r.error) { toast(/seconds|rate/i.test(r.error.message) ? "Kód sme poslali len pred chvíľou. Skús o minútu." : "Kód sa nepodarilo poslať.", true); return; }
        A.sent = true; renderLogin(); toast("Kód je na ceste, pozri si e-mail."); $("c-code").focus();
      });
    };
    if (vf) vf.onsubmit = function (e) {
      e.preventDefault(); var b = vf.querySelector("button"); spin(b);
      sb.auth.verifyOtp({ email: A.email, token: $("c-code").value.replace(/\D/g, ""), type: "email" }).then(function (r) {
        if (r.error) { unspin(b); toast("Kód nesedí alebo vypršal.", true); return; }
        check();
      });
    };
  }
  function renderDenied() {
    shell('<div class="adm-msg bad">Tento účet nemá prístup do administrácie.</div><button class="btn full gh" data-a="logout" style="margin-top:12px">Odhlásiť sa</button>');
  }
  function renderEnroll() {
    shell('<div class="adm-load"><div class="spin"></div>Pripravujem overovaciu aplikáciu…</div>');
    sb.auth.mfa.listFactors().then(function (r) {
      var all = (r.data && r.data.all) || [];
      // nedokončené pokusy o pridanie zmažeme, aby išlo začať odznova
      return Promise.all(all.filter(function (f) { return f.factor_type === "totp" && f.status !== "verified"; }).map(function (f) { return sb.auth.mfa.unenroll({ factorId: f.id }); }));
    }).then(function () {
      return sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "EliteBiker admin " + new Date().toISOString().slice(0, 10) });
    }).then(function (r) {
      if (r.error) throw r.error;
      var f = r.data, secret = String(f.totp.secret || "").replace(/(.{4})/g, "$1 ").trim();
      shell('<h2 class="adm-h">Zapni dvojstupňové overenie</h2>' +
        '<ol class="adm-steps"><li>Do mobilu si nainštaluj <b>Google Authenticator</b> alebo <b>Microsoft Authenticator</b>.</li><li>V aplikácii ťukni na <b>+</b> a naskenuj tento kód.</li><li>Opíš 6-miestny kód, ktorý ti aplikácia ukáže.</li></ol>' +
        '<div class="adm-qr"><img src="' + esc(f.totp.qr_code) + '" alt="QR kód pre overovaciu aplikáciu"></div>' +
        '<p class="adm-secret">Nejde naskenovať? Zadaj kľúč ručne:<br><code>' + esc(secret) + "</code></p>" +
        '<form id="ef" novalidate><input class="inp code" id="e-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456"><button class="btn full" type="submit" style="margin-top:12px">Overiť a pokračovať</button></form>' +
        '<p class="adm-note">Od teraz bude administrácia pri každom prihlásení pýtať kód z tejto aplikácie. Kľúč nikomu neposielaj.</p>');
      $("e-code").focus();
      $("ef").onsubmit = function (e) {
        e.preventDefault(); var b = $("ef").querySelector("button"); spin(b);
        sb.auth.mfa.challengeAndVerify({ factorId: f.id, code: $("e-code").value.replace(/\D/g, "") }).then(function (x) {
          if (x.error) { unspin(b); toast("Kód nesedí. Skontroluj čas v mobile a skús ďalší kód.", true); return; }
          toast("Overenie zapnuté ✓"); check();
        });
      };
    }).catch(function (e) {
      shell('<div class="adm-msg bad">Overovaciu aplikáciu sa nepodarilo pripraviť: ' + esc(e.message || e) + '</div><button class="btn full gh" data-a="logout" style="margin-top:12px">Odhlásiť sa</button>');
    });
  }
  function renderVerify(factorId) {
    shell('<h2 class="adm-h">Kód z overovacej aplikácie</h2><p class="adm-note" style="margin-top:0">Otvor Google / Microsoft Authenticator a opíš kód pre EliteBiker.</p>' +
      '<form id="mf" novalidate><input class="inp code" id="m-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456"><button class="btn full" type="submit" style="margin-top:12px">Pokračovať</button></form>' +
      '<p class="alt"><button class="link-plain" data-a="logout">Odhlásiť sa</button></p>');
    $("m-code").focus();
    $("mf").onsubmit = function (e) {
      e.preventDefault(); var b = $("mf").querySelector("button"); spin(b);
      sb.auth.mfa.challengeAndVerify({ factorId: factorId, code: $("m-code").value.replace(/\D/g, "") }).then(function (x) {
        if (x.error) { unspin(b); toast("Kód nesedí alebo už vypršal. Zadaj aktuálny.", true); return; }
        check();
      });
    };
  }
  function check() {
    if (!live) { A.who = "Demo admin"; return dashboard(); }
    sb.auth.getSession().then(function (r) {
      if (!r.data.session) { renderLogin(); return; }
      A.email = r.data.session.user.email || A.email;
      return rpc("admin_status").then(function (st) {
        if (!st || !st.admin) { renderDenied(); return; }
        return Promise.all([sb.auth.mfa.getAuthenticatorAssuranceLevel(), sb.auth.mfa.listFactors()]).then(function (x) {
          var aal = x[0].data || {}, totp = ((x[1].data && x[1].data.totp) || []).filter(function (f) { return f.status === "verified"; });
          if (aal.currentLevel === "aal2") return dashboard();
          if (totp.length) return renderVerify(totp[0].id);
          return renderEnroll();
        });
      });
    }).catch(function (e) { renderLogin(e.message); });
  }
  function logout(msg) {
    var done = function () { A = fresh(A.email); renderLogin(msg); };
    if (!live) return done();
    sb.auth.signOut().then(done, done);
  }
  // po 20 minútach nečinnosti odhlásime
  var lastAct = Date.now();
  ["click", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, function () { lastAct = Date.now(); }, true); });
  setInterval(function () { if (live && A.dash && Date.now() - lastAct > IDLE_MIN * 6e4) { A.dash = false; logout("Odhlásili sme ťa po " + IDLE_MIN + " minútach nečinnosti."); } }, 30000);

  /* ---------- prehľad ---------- */
  var METRICS = [["active", "Aktívni používatelia", "aktívnych"], ["opens", "Otvorenia appky", "otvorení"], ["new", "Noví používatelia", "nových"], ["rides", "Vytvorené jazdy", "jázd"]];
  var RANGES = [[7, "7 dní"], [30, "30 dní"], [90, "90 dní"]];
  function pct(a, b) { return b ? Math.round(a / b * 100) + " %" : "0 %"; }
  function dm(iso) { var x = new Date(iso + "T12:00:00"); return x.getDate() + ". " + (x.getMonth() + 1) + "."; }
  function dlong(iso) { var x = new Date(iso + "T12:00:00"); return x.toLocaleDateString("sk-SK", { weekday: "short", day: "numeric", month: "numeric" }); }
  function tile(label, val, sub) { return '<div class="adm-stat"><small>' + label + "</small><b>" + val + "</b>" + (sub ? "<em>" + sub + "</em>" : "") + "</div>"; }
  function dashboard() {
    A.dash = true;
    $("root").innerHTML = '<header class="adm-top">' + brand() + '<span class="adm-title">Administrácia</span><span class="grow"></span><span class="adm-who">' + esc(A.email || A.who || "") + '</span><button class="btn sm gh" data-a="reload" aria-label="Obnoviť">Obnoviť</button><button class="btn sm gh" data-a="logout">Odhlásiť</button></header>' +
      '<main class="adm-main" id="dash"><div class="adm-load"><div class="spin"></div>Načítavam…</div></main><div class="adm-tip" id="tip" role="status" hidden></div>';
    load();
  }
  function load() {
    Promise.all([rpc("admin_metrics", { p_days: A.days }), A.names ? Promise.resolve(A.names) : rpc("admin_names")]).then(function (x) {
      A.m = x[0]; A.names = x[1] || []; draw();
    }).catch(err);
  }
  function draw() {
    var m = A.m, u = m.users, ac = m.active, v = m.visits, r = m.rides, so = m.social;
    var since = m.since ? "Údaje o aktivite zbierame od " + d(m.since + "T12:00:00") + "." : "Údaje o aktivite sa začnú zbierať s prvým otvorením appky.";
    var html = '<p class="adm-lead">Súhrnné čísla o používaní appky. Osobné údaje používateľov tu nie sú, len poradie a mená. ' + since + "</p>" +
      '<h2 class="adm-h2">Dnes</h2><section class="adm-stats s4">' +
        tile("Aktívni dnes", n(ac.today), "prihlásení, čo appku otvorili") + tile("Otvorenia appky", n(v.today), "aj neprihlásení") +
        tile("Noví používatelia", n(u.today), "zaregistrovaní dnes") + tile("Používatelia spolu", n(u.total), "+" + n(u.d7) + " za 7 dní") + "</section>" +
      '<h2 class="adm-h2">Posledné dni</h2><section class="adm-stats s4">' +
        tile("Aktívni za 7 dní", n(ac.d7), pct(ac.d7, u.total) + " zo všetkých") + tile("Aktívni za 30 dní", n(ac.d30), pct(ac.d30, u.total) + " zo všetkých") +
        tile("Vracajú sa", n(ac.returning_d7), "aktívni teraz aj predtým") + tile("Appka na ploche", n(ac.app_d30), pct(ac.app_d30, ac.d30) + " aktívnych za 30 dní") +
        tile("Otvorenia za 7 dní", n(v.d7), "") + tile("Otvorenia za 30 dní", n(v.d30), "") +
        tile("Cez pozvánku", n(v.invite_d30), "otvorenia za 30 dní") + tile("Cez odkaz na jazdu", n(v.ride_d30), "otvorenia za 30 dní") + "</section>" +
      '<section class="adm-card chart"><div class="adm-ch-head"><div class="adm-seg" role="tablist" aria-label="Čo zobraziť">' +
        METRICS.map(function (x) { return '<button role="tab" aria-selected="' + (A.metric === x[0]) + '" data-a="metric" data-v="' + x[0] + '" class="' + (A.metric === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div>" +
        '<div class="adm-seg sm" aria-label="Obdobie">' + RANGES.map(function (x) { return '<button data-a="days" data-v="' + x[0] + '" class="' + (A.days === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div></div>" +
        '<div class="adm-ch-title"><b id="chTitle"></b><button class="link-plain sm" data-a="table">' + (A.table ? "Zobraziť graf" : "Zobraziť ako tabuľku") + "</button></div>" +
        '<div id="chart" class="adm-chart"></div></section>' +
      '<div class="adm-grid2"><section class="adm-card"><h3>Jazdy</h3>' +
        kv("Naplánované jazdy", n(r.upcoming)) + kv("z toho verejné", n(r.public_upcoming)) + kv("Vytvorené za 7 dní", n(r.created_d7)) + kv("Vytvorené za 30 dní", n(r.created_d30)) +
        kv("Pridania k cudzím jazdám za 30 dní", n(r.joins_d30)) + kv("Priemerne ľudí na jazde", r.avg_people_d30 == null ? "zatiaľ nič" : String(r.avg_people_d30).replace(".", ",")) +
        '<h4>Typy jázd za 30 dní</h4>' + hbars(Object.keys(TYPES).map(function (k) { return [TYPES[k], (r.by_type_d30 || {})[k] || 0]; })) + "</section>" +
      '<section class="adm-card"><h3>Zariadenia aktívnych za 30 dní</h3>' +
        hbars([["iPhone", ac.ios_d30], ["Android", ac.android_d30], ["Počítač a iné", ac.desktop_d30]]) +
        '<h3 style="margin-top:22px">Partia a upozornenia</h3>' +
        kv("Priateľstvá", n(so.friendships)) + kv("Čakajúce žiadosti", n(so.pending)) + kv("Ľudia so zapnutými upozorneniami", n(so.push_users) + " (" + pct(so.push_users, u.total) + ")") +
        kv("Vytvorené pozvánky za 30 dní", n(so.invites_d30)) + "</section></div>" +
      '<section class="adm-card"><div class="adm-names-head"><h3>Používatelia podľa poradia <small>' + n(A.names.length) + "</small></h3>" +
        '<input class="inp" id="nq" type="search" placeholder="Hľadať meno" autocomplete="off" value="' + esc(A.q) + '"></div><ol class="adm-names" id="names"></ol></section>';
    $("dash").innerHTML = html;
    drawNames(); drawChart();
    var q = $("nq"); q.oninput = function () { A.q = q.value; drawNames(); };
  }
  function kv(k, v) { return '<div class="adm-kv"><span>' + k + "</span><b>" + v + "</b></div>"; }
  function hbars(rows) {
    var mx = Math.max.apply(null, rows.map(function (x) { return x[1]; }).concat([1]));
    return '<div class="adm-hbars">' + rows.map(function (x) { return '<div class="adm-hbar"><span>' + esc(x[0]) + '</span><i><s style="width:' + (x[1] ? Math.max(2, x[1] / mx * 100) : 0) + '%"></s></i><b>' + n(x[1]) + "</b></div>"; }).join("") + "</div>";
  }
  function drawNames() {
    var el = $("names"); if (!el) return;
    var q = (A.q || "").trim().toLowerCase(), norm = function (t) { return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); };
    var l = A.names.filter(function (x) { return !q || norm(x.meno).indexOf(norm(q)) > -1; });
    el.innerHTML = l.length ? l.map(function (x) { return '<li><span class="no">' + x.poradie + '.</span><span class="nm">' + esc(x.meno) + "</span></li>"; }).join("") : '<li class="adm-empty">' + (A.names.length ? "Nikto také meno nemá." : "Zatiaľ žiadni používatelia.") + "</li>";
  }
  // stĺpcový graf jednej veličiny po dňoch; popis pri prechode myšou alebo ťuknutí
  function drawChart() {
    var el = $("chart"), mt = METRICS.filter(function (x) { return x[0] === A.metric; })[0], S = A.m.series || [];
    $("chTitle").textContent = mt[1] + " po dňoch, posledných " + A.days + " dní";
    var vals = S.map(function (x) { return +x[A.metric] || 0; });
    if (A.table) {
      el.innerHTML = '<table class="adm-tbl"><thead><tr><th>Deň</th><th>' + mt[1] + "</th></tr></thead><tbody>" + S.slice().reverse().map(function (x) { return "<tr><td>" + dlong(x.day) + "</td><td>" + n(x[A.metric]) + "</td></tr>"; }).join("") + "</tbody></table>";
      return;
    }
    var W = Math.max(280, el.clientWidth || 600), H = 220, L = 34, R = 6, T = 10, B = 26, pw = W - L - R, ph = H - T - B;
    var mx = Math.max.apply(null, vals.concat([0])), step = niceStep(mx), top = Math.max(step * Math.ceil(mx / step), step * 2);
    var y = function (v) { return T + ph - v / top * ph; }, bw = pw / S.length, gap = S.length > 60 ? 1 : 2, w = Math.max(1, bw - gap);
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(mt[1]) + ' po dňoch">';
    for (var g = 0; g <= top; g += step) svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g) + '" y2="' + y(g) + '" class="' + (g ? "gl" : "base") + '"/><text x="' + (L - 6) + '" y="' + (y(g) + 4) + '" class="yl">' + n(g) + "</text>";
    var every = Math.ceil(S.length / Math.max(2, Math.floor(pw / 64)));
    S.forEach(function (x, i) {
      var v = vals[i], X = L + i * bw + gap / 2, Y = y(v), h = T + ph - Y, rr = Math.min(4, w / 2, h);
      if (v > 0) svg += '<path class="bar" data-i="' + i + '" d="M' + X + "," + (T + ph) + "V" + (Y + rr) + "Q" + X + "," + Y + " " + (X + rr) + "," + Y + "H" + (X + w - rr) + "Q" + (X + w) + "," + Y + " " + (X + w) + "," + (Y + rr) + "V" + (T + ph) + 'Z"/>';
      if ((S.length - 1 - i) % every === 0) svg += '<text x="' + (L + i * bw + bw / 2) + '" y="' + (H - 8) + '" class="xl">' + dm(x.day) + "</text>";
    });
    S.forEach(function (x, i) { svg += '<rect class="hit" data-i="' + i + '" x="' + (L + i * bw) + '" y="' + T + '" width="' + bw + '" height="' + ph + '"/>'; });
    svg += "</svg>";
    el.innerHTML = (mx ? "" : '<p class="adm-nodata">Zatiaľ žiadne údaje za toto obdobie.</p>') + svg;
    var tip = $("tip"), show = function (t) {
      var i = +t.dataset.i, x = S[i]; [].forEach.call(el.querySelectorAll(".bar.on"), function (b) { b.classList.remove("on"); });
      var b = el.querySelector('.bar[data-i="' + i + '"]'); if (b) b.classList.add("on");
      tip.innerHTML = "<small>" + dlong(x.day) + "</small><b>" + n(vals[i]) + "</b> " + mt[2];
      var rc = t.getBoundingClientRect(); tip.hidden = false;
      var tw = tip.offsetWidth, lx = Math.min(window.innerWidth - tw - 8, Math.max(8, rc.left + rc.width / 2 - tw / 2));
      var topY = (b ? b.getBoundingClientRect().top : rc.bottom) - tip.offsetHeight - 8;
      tip.style.left = lx + "px"; tip.style.top = Math.max(8, topY) + "px";
    }, hide = function () { tip.hidden = true; [].forEach.call(el.querySelectorAll(".bar.on"), function (b) { b.classList.remove("on"); }); };
    [].forEach.call(el.querySelectorAll(".hit"), function (h) { h.onmouseenter = function () { show(h); }; h.onclick = function () { show(h); }; });
    el.onmouseleave = hide;
  }
  function niceStep(mx) { if (mx <= 4) return 1; var raw = mx / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (A.m && $("chart")) drawChart(); }, 150); });
  document.addEventListener("scroll", function () { var t = $("tip"); if (t) t.hidden = true; }, true);

  /* ---------- udalosti ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-a]"); if (!el) { if (!e.target.closest(".hit")) { var t = $("tip"); if (t) t.hidden = true; } return; }
    var a = el.dataset.a;
    switch (a) {
      case "mode": A.mode = el.dataset.m; A.sent = false; renderLogin(); break;
      case "logout": logout(); break;
      case "reload": A.names = null; $("dash").innerHTML = '<div class="adm-load"><div class="spin"></div>Načítavam…</div>'; load(); break;
      case "metric": A.metric = el.dataset.v; draw(); break;
      case "table": A.table = !A.table; draw(); break;
      case "days": A.days = +el.dataset.v; rpc("admin_metrics", { p_days: A.days }).then(function (m) { A.m = m; draw(); }).catch(err); break;
    }
  });

  /* ---------- skúšobný režim (bez servera) ---------- */
  var Demo = {
    names: ["Martin Markovič", "Adam Kováč", "Lucia Malá", "Peter Horváth", "Jana Nováková", "Tomáš Baláž", "Marek Varga", "Zuzana Tóthová", "Michal Kollár", "Eva Šimková", "Juraj Lukáč", "Simona Králiková"],
    rpc: function (name, a) {
      var wait = function (v) { return new Promise(function (r) { setTimeout(function () { r(v); }, 150); }); };
      if (name === "admin_names") return wait(Demo.names.map(function (x, i) { return { poradie: i + 1, meno: x }; }));
      if (name === "admin_metrics") {
        var nd = a.p_days || 30, t = new Date(), series = [];
        for (var i = nd - 1; i >= 0; i--) {
          var dd = new Date(t); dd.setDate(t.getDate() - i); var k = nd - i, wk = dd.getDay() === 0 || dd.getDay() === 6;
          var iso = dd.getFullYear() + "-" + String(dd.getMonth() + 1).padStart(2, "0") + "-" + String(dd.getDate()).padStart(2, "0");
          series.push({ day: iso, active: Math.round(2 + k / 6 + (wk ? 4 : 0) + (k % 3)), opens: Math.round(5 + k / 3 + (wk ? 9 : 0) + (k % 4) * 2), new: k % 5 === 0 ? 2 : k % 3 === 0 ? 1 : 0, rides: wk ? 3 : k % 4 === 0 ? 1 : 0 });
        }
        return wait({ today: series[series.length - 1].day, since: series[0].day, users: { total: Demo.names.length, today: 1, d7: 3, d30: 8 },
          active: { today: 6, d7: 9, d30: 11, app_d30: 5, ios_d30: 6, android_d30: 4, desktop_d30: 1, returning_d7: 7 },
          visits: { today: 18, d7: 112, d30: 390, invite_d30: 14, ride_d30: 22, login_d30: 9 },
          rides: { upcoming: 5, public_upcoming: 2, created_d7: 4, created_d30: 15, joins_d30: 23, avg_people_d30: 3.4, by_type_d30: { mtb: 7, cesta: 4, gravel: 2, ebike: 2 } },
          social: { friendships: 19, pending: 3, push_users: 7, invites_d30: 11 }, series: series });
      }
      return Promise.reject(new Error("neznáme volanie " + name));
    }
  };

  check();
})();
