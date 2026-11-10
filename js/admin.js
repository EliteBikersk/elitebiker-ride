/* EliteBiker Ride – administrácia.
   Prístup má len účet zapísaný ako admin v databáze a po prihlásení kódom z overovacej aplikácie (2FA).
   Všetky kontroly robí server – táto stránka len zobrazuje, čo server dovolí. */
(function () {
  "use strict";
  // stránka sa nesmie dať vložiť do cudzej stránky
  if (window.top !== window.self) { try { window.top.location.replace(window.location.href); } catch (e) { document.documentElement.innerHTML = ""; return; } }

  var C = window.EB_CONFIG || {}, REWARDS = C.REWARDS || [];
  var live = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  // samostatné prihlásenie len pre túto kartu (po zatvorení karty sa zabudne)
  var sb = live ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, {
    auth: { storage: window.sessionStorage, storageKey: "eb-admin-auth", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  }) : null;
  var IDLE_MIN = 20;
  var TYPES = { cesta: "Cesta", gravel: "Gravel", mtb: "Horský", ebike: "E-bike", dirt: "Dirt / BMX" };
  var A = { tab: "users", q: "", sort: "new", users: [], total: 0, ov: null, sel: null, user: null, rides: null, log: null, mode: "pw", email: "", sent: false, give: { sign: 1, amount: "", reason: "" }, sure: null, del: null };

  /* ---------- pomocníci ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var tt; function toast(m, bad) { var t = $("toast"); t.querySelector("span").innerHTML = m; t.classList.toggle("bad", !!bad); t.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("show"); }, 3600); }
  function err(e) { console.error(e); toast(esc(e && e.message || "Niečo sa pokazilo."), true); }
  function d(iso) { return iso ? new Date(iso).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" }) : "nie"; }
  function dt(iso) { return iso ? new Date(iso).toLocaleString("sk-SK", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "nie"; }
  function ago(iso) {
    if (!iso) return "nikdy";
    var m = Math.round((Date.now() - new Date(iso)) / 6e4);
    if (m < 60) return m <= 1 ? "práve teraz" : "pred " + m + " min";
    var h = Math.round(m / 60); if (h < 24) return "pred " + h + " h";
    var dd = Math.round(h / 24); return dd === 1 ? "včera" : dd < 31 ? "pred " + dd + " dňami" : d(iso);
  }
  function n(x) { return Number(x || 0).toLocaleString("sk-SK"); }
  function memberNo(id) { return String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase(); }
  function avatar(u, cls) {
    if (u.avatar_url) return '<span class="aav ' + (cls || "") + '"><img src="' + esc(u.avatar_url) + '" alt=""></span>';
    var t = (u.display_name || u.email || "?").charAt(0).toUpperCase();
    return '<span class="aav init ' + (cls || "") + '">' + esc(t) + "</span>";
  }
  function brand() { return '<div class="brand"><img src="' + esc(C.LOGO_URL) + '" alt="EliteBiker"><span class="wm">ELITEBIKER</span><span class="ride">Ride</span></div>'; }
  document.addEventListener("error", function (e) { var t = e.target; if (t && t.tagName === "IMG" && t.parentNode && t.parentNode.classList && t.parentNode.classList.contains("brand")) t.parentNode.classList.add("noimg"); }, true);
  function spin(b) { if (!b) return; b.disabled = true; b.dataset.t = b.innerHTML; b.innerHTML = '<span class="spin-sm"></span>'; }
  function unspin(b) { if (!b) return; b.disabled = false; b.innerHTML = b.dataset.t || "OK"; }
  function level(earned) { return earned >= 2000 ? "Zlatý" : "Strieborný"; }

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
    var done = function () { A = { tab: "users", q: "", sort: "new", users: [], mode: "pw", email: A.email, give: { sign: 1, amount: "", reason: "" } }; renderLogin(msg); };
    if (!live) return done();
    sb.auth.signOut().then(done, done);
  }
  // po 20 minútach nečinnosti odhlásime
  var lastAct = Date.now();
  ["click", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, function () { lastAct = Date.now(); }, true); });
  setInterval(function () { if (live && A.dash && Date.now() - lastAct > IDLE_MIN * 6e4) { A.dash = false; logout("Odhlásili sme ťa po " + IDLE_MIN + " minútach nečinnosti."); } }, 30000);

  /* ---------- prehľad ---------- */
  function dashboard() {
    A.dash = true;
    $("root").innerHTML = '<header class="adm-top">' + brand() + '<span class="adm-title">Administrácia</span><span class="grow"></span><span class="adm-who">' + esc(A.email || A.who || "") + '</span><button class="btn sm gh" data-a="logout">Odhlásiť</button></header>' +
      '<main class="adm-main"><section class="adm-stats" id="ov"></section>' +
      '<nav class="adm-tabs" id="tabs"></nav><section id="pane"></section></main><aside class="adm-drawer" id="drawer" aria-hidden="true"></aside><div class="adm-scrim" id="scrim" data-a="close"></div>';
    loadOverview(); drawTabs(); openTab(A.tab);
  }
  function loadOverview() {
    rpc("admin_overview").then(function (o) {
      A.ov = o;
      var cards = [["Používatelia", o.users, "+" + n(o.users_7d) + " za 7 dní"], ["Aktívni", o.active_30d, "prihlásení za 30 dní"], ["Nadchádzajúce jazdy", o.rides_upcoming, n(o.public_upcoming) + " verejných"],
        ["Odjazdené", o.rides_30d, "jázd za 30 dní"], ["Body v obehu", o.points_balance, "zostatky všetkých"], ["Vydané odmeny", o.rewards_30d, "za 30 dní"]];
      $("ov").innerHTML = cards.map(function (c) { return '<div class="adm-stat"><small>' + c[0] + "</small><b>" + n(c[1]) + "</b><em>" + esc(c[2]) + "</em></div>"; }).join("");
    }).catch(err);
  }
  function drawTabs() {
    $("tabs").innerHTML = [["users", "Používatelia a body"], ["rides", "Verejné jazdy"], ["log", "Záznam zmien"]].map(function (t) {
      return '<button data-a="tab" data-t="' + t[0] + '" class="' + (A.tab === t[0] ? "on" : "") + '">' + t[1] + "</button>"; }).join("");
  }
  function openTab(t) {
    A.tab = t; drawTabs();
    if (t === "users") { drawUsersShell(); loadUsers(); }
    if (t === "rides") { $("pane").innerHTML = '<div class="adm-load sm"><div class="spin"></div></div>'; rpc("admin_rides").then(function (r) { A.rides = r; drawRides(); }).catch(err); }
    if (t === "log") { $("pane").innerHTML = '<div class="adm-load sm"><div class="spin"></div></div>'; rpc("admin_log_list", { p_limit: 200 }).then(function (l) { A.log = l; drawLog(); }).catch(err); }
  }

  /* ---------- používatelia ---------- */
  function drawUsersShell() {
    $("pane").innerHTML = '<div class="adm-bar"><div class="search">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input id="uq" placeholder="Meno, e-mail, mesto, Instagram alebo číslo člena" value="' + esc(A.q) + '" autocomplete="off"></div>' +
      '<select class="inp" id="us"><option value="new">Najnovší</option><option value="points">Najviac bodov</option><option value="name">Podľa mena</option></select></div><div id="ulist"></div>';
    $("us").value = A.sort;
    var q = $("uq"), t;
    q.oninput = function () { clearTimeout(t); t = setTimeout(function () { A.q = q.value; loadUsers(); }, 300); };
    $("us").onchange = function () { A.sort = this.value; loadUsers(); };
  }
  function loadUsers() {
    var el = $("ulist"); if (!el) return;
    rpc("admin_users", { p_q: A.q, p_sort: A.sort, p_limit: 100, p_offset: 0 }).then(function (rows) {
      A.users = rows || []; A.total = A.users.length ? A.users[0].total : 0; drawUsers();
    }).catch(err);
  }
  function drawUsers() {
    var el = $("ulist"); if (!el) return;
    if (!A.users.length) { el.innerHTML = '<div class="adm-empty">Nikoho sme nenašli.</div>'; return; }
    el.innerHTML = '<div class="adm-count">' + n(A.total) + " " + (A.total === 1 ? "používateľ" : A.total < 5 ? "používatelia" : "používateľov") + (A.total > A.users.length ? " · zobrazených " + A.users.length + ", spresni hľadanie" : "") + "</div>" +
      '<div class="utable"><div class="uhead"><span>Používateľ</span><span>Mesto · vek</span><span>Registrácia</span><span>Naposledy</span><span>Jazdy</span><span class="r">Body</span></div>' +
      A.users.map(function (u) {
        return '<button class="urow' + (A.sel === u.id ? " on" : "") + '" data-a="user" data-id="' + u.id + '">' +
          '<span class="ucell who">' + avatar(u) + '<span class="grow"><b>' + esc(u.display_name || "bez mena") + "</b><small>" + esc(u.email || "") + "</small></span></span>" +
          '<span class="ucell"><small class="lbl">Mesto</small>' + esc([u.city, u.age ? u.age + " r." : ""].filter(Boolean).join(" · ") || "nevyplnené") + "</span>" +
          '<span class="ucell"><small class="lbl">Registrácia</small>' + d(u.created_at) + "</span>" +
          '<span class="ucell"><small class="lbl">Naposledy</small>' + ago(u.last_sign_in_at) + "</span>" +
          '<span class="ucell"><small class="lbl">Jazdy</small>' + n(u.joined + u.hosted) + (u.hosted ? ' <small class="mu">(' + u.hosted + " org.)</small>" : "") + "</span>" +
          '<span class="ucell pts"><b>' + n(u.balance) + '</b><small>' + level(u.earned) + "</small></span></button>";
      }).join("") + "</div>";
  }

  /* ---------- detail používateľa ---------- */
  function openUser(id) {
    A.sel = id; A.give = { sign: 1, amount: "", reason: "" }; A.sure = null;
    var dr = $("drawer"); dr.innerHTML = '<div class="adm-load sm"><div class="spin"></div></div>'; dr.classList.add("open"); dr.setAttribute("aria-hidden", "false"); $("scrim").classList.add("on");
    drawUsers();
    rpc("admin_user", { p_user: id }).then(function (u) { A.user = u; drawUser(); }).catch(function (e) { closeDrawer(); err(e); });
  }
  function closeDrawer() { A.sel = null; A.user = null; var dr = $("drawer"); if (dr) { dr.classList.remove("open"); dr.setAttribute("aria-hidden", "true"); } var s = $("scrim"); if (s) s.classList.remove("on"); drawUsers(); }
  function drawUser() {
    var u = A.user, p = u.points, g = A.give, amt = parseInt(g.amount, 10) || 0;
    var reasons = g.sign > 0 ? ["Nákup v predajni", "Nákup v e-shope", "Pomoc na akcii", "Súťaž", "Oprava bodov"] : ["Oprava bodov", "Zneužitie", "Zrušená jazda"];
    $("drawer").innerHTML = '<div class="dr-top"><button class="icb" data-a="close" aria-label="Zavrieť"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button><b>Detail používateľa</b></div>' +
      '<div class="dr-body"><div class="dr-head">' + avatar(u, "lg") + '<div class="grow"><h2>' + esc(u.display_name || "bez mena") + "</h2><p>" + esc(u.email || "") + (u.confirmed ? "" : ' · <span class="warn">e-mail nepotvrdený</span>') + '</p><p class="mu">člen č. <b>' + memberNo(u.id) + "</b></p></div></div>" +
      '<div class="dr-kv">' + [["Mesto", u.city], ["Vek", u.age], ["Instagram", u.ig_username ? "@" + u.ig_username : ""], ["Facebook", u.fb_name], ["Na čom jazdí", (u.bike_types || []).map(function (t) { return TYPES[t] || t; }).join(", ")],
        ["Registrácia", dt(u.created_at)], ["Naposledy prihlásený", u.last_sign_in_at ? dt(u.last_sign_in_at) : "nikdy"], ["Priatelia", u.friends], ["Nadchádzajúce jazdy", u.upcoming]]
        .filter(function (x) { return x[1] !== null && x[1] !== undefined && x[1] !== ""; }).map(function (x) { return "<div><span>" + x[0] + "</span><b>" + esc(x[1]) + "</b></div>"; }).join("") + "</div>" +
      '<div class="dr-pts"><div class="big"><small>Zostatok</small><b>' + n(p.balance) + ' <em>bodov</em></b><span class="lv">★ ' + level(p.earned) + " člen · celkovo získal " + n(p.earned) + "</span></div>" +
      '<div class="brk"><div><span>Spoločné jazdy</span><b>' + p.joined + " × 20 = " + n(p.joined * 20) + "</b></div><div><span>Zorganizované jazdy</span><b>" + p.hosted + " × 50 = " + n(p.hosted * 50) + "</b></div><div><span>Fotky z jázd</span><b>" + p.photos + " × 10 = " + n(p.photos * 10) + "</b></div><div><span>Bonusy od EliteBikeru</span><b>" + (p.bonus >= 0 ? "+" : "") + n(p.bonus) + "</b></div><div><span>Vydané odmeny</span><b>−" + n(p.spent) + "</b></div></div></div>" +
      '<h3>Pridať alebo odobrať body</h3><form id="gf" class="dr-give" novalidate><div class="seg"><button type="button" data-a="sign" data-s="1" class="' + (g.sign > 0 ? "on" : "") + '">＋ Pridať</button><button type="button" data-a="sign" data-s="-1" class="' + (g.sign < 0 ? "on" : "") + '">− Odobrať</button></div>' +
      '<div class="quick">' + [50, 100, 200, 500].map(function (x) { return '<button type="button" data-a="amt" data-v="' + x + '" class="' + (amt === x ? "on" : "") + '">' + x + "</button>"; }).join("") + "</div>" +
      '<input class="inp" id="g-amt" inputmode="numeric" placeholder="Počet bodov" value="' + esc(g.amount) + '">' +
      '<input class="inp" id="g-why" maxlength="200" placeholder="Dôvod (uvidí ho aj používateľ)" value="' + esc(g.reason) + '" style="margin-top:8px">' +
      '<div class="quick">' + reasons.map(function (r) { return '<button type="button" data-a="why" data-v="' + esc(r) + '">' + esc(r) + "</button>"; }).join("") + "</div>" +
      '<button class="btn full' + (g.sign < 0 ? " neg" : "") + '" type="submit">' + (g.sign > 0 ? "Pridať" : "Odobrať") + (amt ? " " + n(amt) + " bodov" : " body") + "</button></form>" +
      '<h3>Vydať odmenu</h3><p class="mu sm">Body sa odpočítajú zo zostatku. Ťukni dvakrát na potvrdenie.</p><div class="dr-rw">' + REWARDS.map(function (r, i) {
        var ok = p.balance >= r[3], sure = A.sure === i;
        return '<div class="rw"><i>' + r[0] + '</i><div class="grow"><b>' + esc(r[1]) + "</b><small>" + esc(r[2]) + '</small></div><button class="btn sm ' + (sure ? "neg" : ok ? "" : "gh") + '" data-a="reward" data-i="' + i + '"' + (ok ? "" : " disabled") + ">" + (sure ? "Potvrdiť −" + r[3] : r[3] + " b") + "</button></div>"; }).join("") + "</div>" +
      '<h3>História bodov</h3>' + (u.history.length ? '<div class="dr-hist">' + u.history.map(function (h) {
        return '<div><span class="grow"><b>' + esc(h.reason) + "</b><small>" + dt(h.at) + (h.admin ? " · " + esc(h.admin) : "") + (h.kind === "reward" ? " · odmena" : "") + '</small></span><em class="' + (h.delta < 0 ? "neg" : "pos") + '">' + (h.delta > 0 ? "+" : "−") + n(Math.abs(h.delta)) + "</em></div>"; }).join("") + "</div>" : '<p class="mu sm">Zatiaľ žiadne ručné zmeny.</p>') + "</div>";
    var f = $("gf");
    $("g-amt").oninput = function () { A.give.amount = this.value.replace(/[^\d]/g, ""); };
    $("g-why").oninput = function () { A.give.reason = this.value; };
    f.onsubmit = function (e) {
      e.preventDefault();
      var v = parseInt(String($("g-amt").value).replace(/[^\d]/g, ""), 10), why = $("g-why").value.trim(), b = f.querySelector("button[type=submit]");
      if (!(v >= 1 && v <= 100000)) { toast("Zadaj počet bodov (1 až 100 000).", true); return; }
      if (!why) { toast("Napíš dôvod. Uvidí ho aj používateľ.", true); $("g-why").focus(); return; }
      spin(b);
      rpc("admin_adjust_points", { p_user: u.id, p_delta: v * A.give.sign, p_reason: why, p_kind: "bonus" }).then(function () {
        toast((A.give.sign > 0 ? "Pridané" : "Odobraté") + " <b>" + n(v) + "</b> bodov: " + esc(u.display_name || u.email) + ".");
        A.give = { sign: 1, amount: "", reason: "" }; afterChange(u.id);
      }).catch(function (e2) { unspin(b); err(e2); });
    };
  }
  function afterChange(id) {
    loadOverview(); loadUsers();
    rpc("admin_user", { p_user: id }).then(function (u) { if (A.sel === id) { A.user = u; drawUser(); } }).catch(err);
  }
  function giveReward(i, btn) {
    var u = A.user, r = REWARDS[i];
    if (A.sure !== i) { A.sure = i; drawUser(); return; }
    spin(btn);
    rpc("admin_adjust_points", { p_user: u.id, p_delta: r[3], p_reason: r[1], p_kind: "reward" }).then(function () {
      A.sure = null; toast("Odmena vydaná: <b>" + esc(r[1]) + "</b> (−" + r[3] + " b)."); afterChange(u.id);
    }).catch(function (e) { A.sure = null; drawUser(); err(e); });
  }

  /* ---------- verejné jazdy ---------- */
  function drawRides() {
    var r = A.rides, c = r.counts;
    $("pane").innerHTML = '<div class="adm-rc"><div><b>' + n(c.public) + '</b><small>🌍 verejných</small></div><div><b>' + n(c.friends) + '</b><small>👥 pre partiu</small></div><div><b>' + n(c.private) + '</b><small>🔒 len pre vybraných</small></div></div>' +
      '<p class="mu sm" style="margin:8px 2px 14px">Jazdy pre partiu a pre vybraných sú súkromné, administrácia vidí len ich počet. Verejnú jazdu s nevhodným obsahom môžeš zrušiť.</p>' +
      (r.public.length ? r.public.map(function (x) {
        var del = A.del === x.id;
        return '<div class="adm-ride"><div class="grow"><b>' + esc(x.title) + '</b><small>' + esc(TYPES[x.type] || x.type) + " · " + dt(x.starts_at) + " · " + esc(x.meet_label || "") + "</small><small>organizuje <b>" + esc(x.host_name || "?") + "</b> · " + x.people + (x.max_people ? "/" + x.max_people : "") + " ľudí</small>" +
          (x.note ? '<p class="nt">' + esc(x.note.slice(0, 220)) + (x.note.length > 220 ? "…" : "") + "</p>" : "") +
          (del ? '<form class="delf" data-id="' + x.id + '"><input class="inp" placeholder="Dôvod zrušenia (zapíše sa do záznamu)" maxlength="200" required><div class="row2"><button type="button" class="btn sm gh" data-a="del-cancel">Späť</button><button class="btn sm neg" type="submit">Zrušiť jazdu</button></div></form>' : "") + "</div>" +
          (del ? "" : '<button class="btn sm gh" data-a="del" data-id="' + x.id + '">Zrušiť</button>') + "</div>"; }).join("")
        : '<div class="adm-empty">Žiadne nadchádzajúce verejné jazdy.</div>');
    var f = document.querySelector(".delf");
    if (f) { var i = f.querySelector("input"); i.focus(); f.onsubmit = function (e) {
      e.preventDefault(); var why = i.value.trim(), b = f.querySelector("button[type=submit]");
      if (!why) { toast("Napíš dôvod.", true); return; }
      spin(b);
      rpc("admin_delete_ride", { p_ride: f.dataset.id, p_reason: why }).then(function () { A.del = null; toast("Jazda zrušená."); loadOverview(); openTab("rides"); }).catch(function (e2) { unspin(b); err(e2); });
    }; }
  }

  /* ---------- záznam zmien ---------- */
  function drawLog() {
    var L = A.log || [];
    $("pane").innerHTML = L.length ? '<div class="adm-log">' + L.map(function (l) {
      var x = l.detail || {}, who = esc(l.target_name || "zmazaný účet"), t;
      if (l.action === "points") t = (x.delta > 0 ? "+" : "−") + n(Math.abs(x.delta)) + " b pre <b>" + who + "</b>: " + esc(x.reason);
      else if (l.action === "reward") t = "Odmena <b>" + esc(x.reason) + "</b> (−" + n(Math.abs(x.delta)) + " b) pre <b>" + who + "</b>";
      else if (l.action === "ride_delete") t = "Zrušená verejná jazda „" + esc(x.title) + "“ od <b>" + who + "</b>: " + esc(x.reason);
      else t = esc(l.action);
      return '<div><small>' + dt(l.at) + " · " + esc(l.admin || "admin") + "</small><p>" + t + "</p></div>"; }).join("") + "</div>"
      : '<div class="adm-empty">Zatiaľ žiadne zmeny.</div>';
  }

  /* ---------- udalosti ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-a]"); if (!el) return;
    var a = el.dataset.a;
    switch (a) {
      case "mode": A.mode = el.dataset.m; A.sent = false; renderLogin(); break;
      case "logout": logout(); break;
      case "tab": closeDrawer(); openTab(el.dataset.t); break;
      case "user": openUser(el.dataset.id); break;
      case "close": closeDrawer(); break;
      case "sign": A.give.sign = +el.dataset.s; A.give.amount = $("g-amt").value; A.give.reason = $("g-why").value; drawUser(); break;
      case "amt": A.give.amount = el.dataset.v; A.give.reason = $("g-why").value; drawUser(); break;
      case "why": A.give.amount = $("g-amt").value; A.give.reason = el.dataset.v; drawUser(); break;
      case "reward": giveReward(+el.dataset.i, el); break;
      case "del": A.del = el.dataset.id; drawRides(); break;
      case "del-cancel": A.del = null; drawRides(); break;
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && A.sel) closeDrawer(); });

  /* ---------- skúšobný režim (bez servera) ---------- */
  var Demo = {
    users: [["Martin Markovič", "martin@test.sk", "Považská Bystrica", 34, "martin.rides", 14, 4, 6, 100, 50], ["Adam Kováč", "adam@test.sk", "Púchov", 31, "adam.rides", 9, 1, 3, 0, 0], ["Lucia Malá", "lucia@test.sk", "Žilina", 26, null, 22, 6, 5, 200, 300], ["Tomáš Baran", "tomas@test.sk", "Ilava", 41, null, 2, 0, 0, 0, 0]].map(function (x, i) {
      var earned = x[5] * 20 + x[6] * 50 + x[7] * 10 + x[8];
      return { id: "0000000" + i + "-aaaa-bbbb-cccc-00000000000" + i, display_name: x[0], email: x[1], city: x[2], age: x[3], ig_username: x[4], fb_name: null, avatar_url: null, created_at: new Date(Date.now() - (i + 2) * 864e5 * 9).toISOString(), last_sign_in_at: new Date(Date.now() - i * 36e5 * 7).toISOString(), joined: x[5], hosted: x[6], photos: x[7], bonus: x[8], spent: x[9], earned: earned, balance: earned - x[9], hist: [] };
    }),
    log: [], rides: [{ id: "r1", title: "Večerný okruh Strážov pre všetkých", type: "mtb", starts_at: new Date(Date.now() + 2 * 864e5).toISOString(), meet_label: "Parkovisko pod Strážovom", host_name: "Lucia Malá", people: 3, max_people: 10, note: "Pridať sa môže hocikto." }],
    rpc: function (name, a) {
      var D = Demo, wait = function (v) { return new Promise(function (r) { setTimeout(function () { r(v); }, 150); }); }, U = function (id) { return D.users.filter(function (u) { return u.id === id; })[0]; };
      if (name === "admin_overview") return wait({ users: D.users.length, users_7d: 1, active_30d: 3, rides_upcoming: 5, public_upcoming: D.rides.length, rides_30d: 11, points_balance: D.users.reduce(function (s, u) { return s + u.balance; }, 0), rewards_30d: D.log.filter(function (l) { return l.action === "reward"; }).length });
      if (name === "admin_users") {
        var q = (a.p_q || "").toLowerCase(), l = D.users.filter(function (u) { return !q || (u.display_name + " " + u.email + " " + u.city + " " + u.id.replace(/-/g, "")).toLowerCase().indexOf(q.replace(/-/g, "")) > -1; });
        if (a.p_sort === "points") l.sort(function (x, y) { return y.balance - x.balance; }); else if (a.p_sort === "name") l.sort(function (x, y) { return x.display_name < y.display_name ? -1 : 1; });
        return wait(l.map(function (u) { var c = JSON.parse(JSON.stringify(u)); c.total = l.length; return c; }));
      }
      if (name === "admin_user") { var u = U(a.p_user); return wait({ id: u.id, display_name: u.display_name, email: u.email, city: u.city, age: u.age, ig_username: u.ig_username, bike_types: ["mtb"], created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, confirmed: true, friends: 4, upcoming: 1,
        points: { joined: u.joined, hosted: u.hosted, photos: u.photos, bonus: u.bonus, spent: u.spent, earned: u.earned, balance: u.balance }, history: u.hist.slice().reverse() }); }
      if (name === "admin_adjust_points") {
        var x = U(a.p_user), dl = a.p_kind === "reward" ? -Math.abs(a.p_delta) : a.p_delta;
        if (a.p_kind === "reward" && x.balance + dl < 0) return Promise.reject(new Error("Na túto odmenu nemá dosť bodov (má " + x.balance + ")."));
        if (a.p_kind === "reward") x.spent -= dl; else { x.bonus += dl; x.earned += dl; }
        x.balance += dl; x.hist.push({ kind: a.p_kind, delta: dl, reason: a.p_reason, at: new Date().toISOString(), admin: "Demo admin" });
        D.log.unshift({ action: a.p_kind === "reward" ? "reward" : "points", detail: { delta: dl, reason: a.p_reason }, at: new Date().toISOString(), admin: "Demo admin", target_name: x.display_name });
        return wait({ earned: x.earned, balance: x.balance });
      }
      if (name === "admin_rides") return wait({ counts: { public: D.rides.length, friends: 3, private: 1 }, public: D.rides });
      if (name === "admin_delete_ride") { var rr = D.rides.filter(function (r) { return r.id === a.p_ride; })[0]; D.rides = D.rides.filter(function (r) { return r !== rr; }); D.log.unshift({ action: "ride_delete", detail: { title: rr.title, reason: a.p_reason }, at: new Date().toISOString(), admin: "Demo admin", target_name: rr.host_name }); return wait(null); }
      if (name === "admin_log_list") return wait(D.log);
      return Promise.reject(new Error("neznáme volanie " + name));
    }
  };

  check();
})();
