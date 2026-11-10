/* EliteBiker Ride – aplikácia */
(function () {
  "use strict";
  var C = window.EB_CONFIG || {};
  var api = window.EBApi;

  /* ---------------- ikony a konštanty ---------------- */
  var IC = {
    road: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21 9 3M20 21 15 3M12 6v2M12 11v2M12 16v3"/></svg>',
    gravel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5 9 9h6l3.5 7.5M9 9l3 7.5 3-7.5M8 6h3"/></svg>',
    mtb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 20 6-10 4 6 3-4 5 8z"/><circle cx="17" cy="5" r="2"/></svg>',
    ebike: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    bike: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M15 6h2l1.5 11M5.5 17 9 9h7M9 9l3.5 8H18.5"/></svg>',
    users: '<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.5 3.5 5.2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9M10 20a2 2 0 0 0 4 0"/></svg>',
    club: '<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17l-5.9 3 1.2-6.5L2.5 8.9 9.1 8z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 18 6-7 4 4 8-9"/><path d="M15 6h6v6"/></svg>',
    gauge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="m12 13 4-4"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8.2h2.8l.4-3.3h-3.2V8.4c0-.9.3-1.6 1.6-1.6H17V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.5v3.3h2.8V22z"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    loc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
    nav: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M3 11 21 3l-8 18-2-8z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'
  };
  function sz(svg, n) { return svg.replace("<svg", '<svg width="' + n + '" height="' + n + '"'); }
  var TYPES = { cesta: ["Cesta", "road"], gravel: ["Gravel", "gravel"], mtb: ["Horský", "mtb"], ebike: ["E-bike", "ebike"] };
  var PACE = { pohoda: "Pohodové", stredne: "Stredné", rychlo: "Rýchle" };
  var DN = ["Nedeľa", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota"], DS = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];
  var DISC = [["🍫", "Výživa", "gély, tyčinky, iontové nápoje", "vyziva/"], ["💨", "Pumpy", "minipumpy, dielenské, CO2", "pumpy-a-hustilky/"], ["🕶️", "Okuliare", "cyklistické okuliare", "vyhladavanie/?string=okuliare"], ["💡", "Svetlá", "na zimné a večerné jazdy", "svetla/"]];
  var REWARDS = [["☕", "Káva po jazde", "v predajni Dedovec", 50], ["🔍", "Kontrola bicykla zdarma", "brzdy, prehadzovačka, tlak, skrutky", 300], ["🏷️", "Zľava 10 € v e-shope", "kód na elitebiker.sk", 500], ["⚡", "Prednostný servis", "do 48 hodín aj v sezóne", 800], ["🔧", "Servis zdarma", "základný servis v EliteBikeri", 1500], ["🚵", "Celodenná požička e-biku", "Marin Alpine Trail E", 2000]];

  /* ---------------- stav ---------------- */
  var S = { uid: null, me: null, P: {}, rides: [], fr: { friends: [], incoming: [], outgoing: [] }, sc: [], tab: "feed", filter: "all", openId: null, chat: {}, photos: {}, unsubChat: null, q: "", qres: null, editing: false, stats: null, tpl: [], seenInv: {} };
  var D;

  /* ---------------- pomocníci ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var tt; function toast(m) { var t = $("toast"); t.querySelector("span").innerHTML = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("show"); }, 3200); }
  function err(e) { console.error(e); toast(esc(e && e.message || "Niečo sa pokazilo. Skús to znova.")); }
  function day0(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function dOff(iso) { return Math.round((day0(iso) - day0(new Date())) / 864e5); }
  function hm(iso) { return new Date(iso).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" }); }
  function dLabel(iso) { var o = dOff(iso), d = new Date(iso); if (o === 0) return "Dnes"; if (o === 1) return "Zajtra"; if (o === -1) return "Včera"; return DN[d.getDay()] + " " + d.getDate() + ". " + (d.getMonth() + 1) + "."; }
  function dShort(iso) { var o = dOff(iso); if (o === 0) return "Dnes"; if (o === 1) return "Zajtra"; if (o === -1) return "Včera"; return DN[new Date(iso).getDay()]; }
  function hue(s) { var h = 0; s = String(s || "x"); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function prof(id) { return S.P[id] || { id: id, ig_username: null, fb_name: null, display_name: "Biker" }; }
  function hname(id) { var p = prof(id); return p.display_name || (p.ig_username ? "@" + p.ig_username : "") || "biker"; }
  function pic(id, cls) {
    var p = prof(id);
    if (p.avatar_url) return '<span class="pic ' + (cls || "") + '"><img class="av-img" src="' + esc(p.avatar_url) + '" alt="" loading="lazy"></span>';
    var t = (p.display_name || p.ig_username || "?").charAt(0).toUpperCase();
    return '<span class="pic init ' + (cls || "") + '" style="background:hsl(' + hue(id) + ',55%,48%)">' + esc(t) + "</span>";
  }
  function age(id) { var a = prof(id).age; return a ? '<span class="age" title="vek">' + a + "</span>" : ""; }
  function hn(id, noAge) { return esc(hname(id)) + (noAge ? "" : age(id)); }
  function igUrl(id) { var u = prof(id).ig_username; return u ? "https://www.instagram.com/" + encodeURIComponent(u) + "/" : null; }
  function igBtn(id) { var u = igUrl(id); return u ? '<a class="btn sm gh" href="' + esc(u) + '" target="_blank" rel="noopener" aria-label="Instagram" title="Napísať na Instagrame">' + sz(IC.ig, 14) + "</a>" : ""; }
  var FB_LINK = /^(https?:\/\/)?([a-z0-9-]+\.)?(facebook\.com|fb\.com|m\.me)\//i;
  function fbUrl(id) { var f = prof(id).fb_name; if (!f) return null; if (FB_LINK.test(f)) return /^https?:/i.test(f) ? f : "https://" + f; return "https://www.facebook.com/search/people/?q=" + encodeURIComponent(f); }
  function fbLabel(id) { var f = prof(id).fb_name; return !f ? "" : FB_LINK.test(f) ? "Facebook profil" : f; }
  function fbBtn(id) { var u = fbUrl(id); return u ? '<a class="btn sm gh" href="' + esc(u) + '" target="_blank" rel="noopener" aria-label="Facebook" title="Napísať na Facebooku">' + sz(IC.fb, 14) + "</a>" : ""; }
  function contactBtns(id) { return igBtn(id) + fbBtn(id); }
  function contactLine(id) { var p = prof(id), a = []; if (p.ig_username) a.push("@" + p.ig_username); if (p.fb_name) a.push(FB_LINK.test(p.fb_name) ? "Facebook" : "FB: " + p.fb_name); return a.join(" · "); }
  function cleanIg(v) { return String(v || "").trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "").toLowerCase(); }
  function cleanFb(v) { return String(v || "").trim().replace(/\s+/g, " "); }
  function checkContacts(ig, fb) {
    if (!ig && !fb) return "Zadaj Instagram alebo Facebook, aby ti kamoši vedeli napísať.";
    if (ig && !/^[a-z0-9._]{1,30}$/.test(ig)) return "Instagram meno môže mať len písmená, čísla, bodku a podčiarkovník.";
    if (fb && (fb.length > 100 || (/^https?:|www\.|\.[a-z]{2,}\//i.test(fb) && !FB_LINK.test(fb)))) return "Pri Facebooku zadaj meno alebo odkaz na profil (facebook.com/…).";
    return null;
  }
  function find(id) { for (var i = 0; i < S.rides.length; i++) if (S.rides[i].id === id) return S.rides[i]; return null; }
  function going(r) { return r.participants.indexOf(S.uid) > -1; }
  function ended(r) { return new Date(r.ends_at) < new Date(); }
  function invitedMe(r) { return !going(r) && r.audience.indexOf(S.uid) > -1 && !ended(r); }
  function isFriend(id) { return S.fr.friends.indexOf(id) > -1; }
  function km(v) { return String(Math.round(v * 10) / 10).replace(".", ","); }
  function spr(n) { return n === 1 ? "správa" : n > 1 && n < 5 ? "správy" : "správ"; }
  function ludi(n) { return n === 1 ? "človek" : n > 1 && n < 5 ? "ľudia" : "ľudí"; }
  function brand(cls) { return '<div class="brand ' + (cls || "") + '"><img src="' + esc(C.LOGO_URL) + '" alt="EliteBiker" onerror="this.parentNode.classList.add(\'noimg\')"><span class="wm">ELITEBIKER</span><span class="ride">Ride</span></div>'; }
  function shareUrl(path) { return (C.APP_URL || location.href.split("#")[0].split("?")[0]) + path; }
  function share(text, url) {
    if (navigator.share) return navigator.share({ title: "EliteBiker Ride", text: text, url: url }).catch(function () {});
    var full = text + " " + url;
    try { navigator.clipboard.writeText(full).then(function () { toast("Odkaz skopírovaný – vlož ho kamošovi do správy."); }, function () { toast(esc(url)); }); } catch (e) { toast(esc(url)); }
  }

  /* ---------------- načítanie údajov ---------------- */
  function loadAll() {
    return Promise.all([api.me(), api.rides(), api.friendships(), api.shortcuts()]).then(function (r) {
      S.me = r[0]; S.rides = r[1]; S.fr = r[2]; S.sc = r[3];
      if (S.me) S.P[S.uid] = S.me;
      var ids = {};
      S.rides.forEach(function (x) { ids[x.host] = 1; x.participants.forEach(function (u) { ids[u] = 1; }); x.audience.forEach(function (u) { ids[u] = 1; }); });
      S.fr.friends.concat(S.fr.incoming, S.fr.outgoing).forEach(function (u) { ids[u] = 1; });
      delete ids[S.uid];
      return api.profiles(Object.keys(ids)).then(function (list) { list.forEach(function (p) { S.P[p.id] = p; }); });
    });
  }
  function refresh() { return loadAll().then(function () { render(true); if (S.openId && $("sheet").classList.contains("open") && $("sheet").dataset.kind === "ride") { if (find(S.openId)) updateDetail(); else closeSheet(); } }).catch(err); }

  /* ---------------- prihlásenie a registrácia ---------------- */
  var LG = { mode: "in", email: "", sent: false };
  function pending() { try { return localStorage.getItem("eb_pozvanka"); } catch (e) { return null; } }
  function pwField(id, auto, ph) {
    return '<div class="pwf"><input class="inp" id="' + id + '" type="password" required minlength="' + (auto === "new-password" ? 8 : 1) + '" autocomplete="' + auto + '" placeholder="' + ph + '">' +
      '<button type="button" class="eye" data-act="eye" data-for="' + id + '" aria-label="Zobraziť heslo">' + IC.eye + "</button></div>";
  }
  function spin(b) { b.disabled = true; b.dataset.t = b.innerHTML; b.innerHTML = '<span class="spin-sm"></span>'; }
  function unspin(b) { b.disabled = false; b.innerHTML = b.dataset.t || "OK"; }
  function loggedIn() { location.href = location.pathname + location.search; }
  function renderLogin() {
    var o = $("onb"); o.classList.remove("hide"); o.classList.add("login-mode");
    if (LG.first === undefined) { LG.first = true; if (pending()) LG.mode = "up"; }
    var m = LG.mode, body;
    if (m === "in" || m === "up") {
      body = '<div class="seg" role="tablist"><button type="button" data-act="lg" data-m="in" class="' + (m === "in" ? "on" : "") + '">Prihlásiť sa</button><button type="button" data-act="lg" data-m="up" class="' + (m === "up" ? "on" : "") + '">Nový účet</button></div>' +
        '<form id="authForm" novalidate><span class="fl">E-mail</span><input class="inp" id="a-email" type="email" required autocomplete="email" inputmode="email" placeholder="tvoj@email.sk" value="' + esc(LG.email) + '">' +
        '<span class="fl">Heslo</span>' + (m === "up" ? pwField("a-pw", "new-password", "aspoň 8 znakov") : pwField("a-pw", "current-password", "tvoje heslo")) +
        '<button class="btn full" type="submit" style="margin-top:16px">' + (m === "up" ? "Vytvoriť účet" : "Prihlásiť sa") + "</button></form>" +
        (m === "in" ? '<p class="alt"><button type="button" class="link-plain" data-act="lg" data-m="code">Zabudnuté heslo? Prihlás sa kódom z e-mailu</button></p>'
          : '<p class="legal" style="margin-top:12px">Na e-mail ti príde 6-miestny kód na potvrdenie. Vytvorením účtu súhlasíš so <a class="link-plain" href="privacy.html" target="_blank">zásadami ochrany súkromia</a>.</p>');
    } else if (m === "code") {
      body = '<h2 class="lg-h">Prihlásenie kódom</h2><p class="lg-p">Pošleme ti 6-miestny kód na e-mail. Po prihlásení si môžeš nastaviť nové heslo.</p>' +
        '<form id="codeReq" novalidate><span class="fl">E-mail</span><input class="inp" id="c-email" type="email" required autocomplete="email" inputmode="email" placeholder="tvoj@email.sk" value="' + esc(LG.email) + '">' +
        '<button class="btn full" type="submit" style="margin-top:12px">' + (LG.sent ? "Poslať kód znova" : "Poslať kód") + "</button></form>" +
        (LG.sent ? codeForm("Prihlásiť sa") : "") +
        '<p class="alt"><button type="button" class="link-plain" data-act="lg" data-m="in">← Späť na prihlásenie heslom</button></p>';
    } else {
      body = '<h2 class="lg-h">Potvrď svoj e-mail</h2><p class="lg-p">Na <b>' + esc(LG.email) + '</b> sme poslali 6-miestny kód. Opíš ho sem alebo ťukni na tlačidlo v e-maile. Pozri aj priečinok Spam.</p>' +
        codeForm("Potvrdiť a pokračovať") +
        '<p class="alt"><button type="button" class="link-plain" data-act="lg-resend">Poslať kód znova</button> · <button type="button" class="link-plain" data-act="lg" data-m="up">Zmeniť e-mail</button></p>';
    }
    o.innerHTML = '<div class="login"><div class="login-hero"><img class="login-logo" src="' + esc(C.LOGO_URL) + '" alt="EliteBiker" onerror="this.outerHTML=\'<div class=&quot;big&quot;>' + IC.bike.replace(/"/g, "&quot;") + '</div>\'">' +
      '<h1>Nejazdi sám.<br><span>Jazdi s partiou.</span></h1><p>Daj kamošom vedieť, kedy ideš na bike, a pridaj sa k nim, keď idú oni.</p></div>' +
      '<div class="login-box"><div id="invCard"></div>' + body +
      '<p class="legal">Prevádzkuje EliteBiker s.r.o. · <a class="link-plain" href="privacy.html" target="_blank">Ochrana súkromia</a></p></div></div>';
    var code = pending();
    if (code) api.inviteInfo(code).then(function (i) { var el = $("invCard"); if (el && i) el.innerHTML = invCard(i); }).catch(function () {});
    var af = $("authForm");
    if (af) af.onsubmit = function (e) {
      e.preventDefault();
      var em = $("a-email").value.trim(), pw = $("a-pw").value, b = af.querySelector("button[type=submit]");
      LG.email = em;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast("Zadaj platný e-mail."); return; }
      if (LG.mode === "up" && pw.length < 8) { toast("Heslo musí mať aspoň 8 znakov."); return; }
      if (!pw) { toast("Zadaj heslo."); return; }
      spin(b);
      if (LG.mode === "in") api.signIn(em, pw).then(loggedIn).catch(function (x) {
        unspin(b);
        if (x.code === "unconfirmed") { api.resendSignup(em).catch(function () {}); LG.mode = "confirm"; renderLogin(); }
        err(x);
      });
      else api.signUp(em, pw).then(function (r) {
        if (r.session) return loggedIn();
        LG.mode = "confirm"; renderLogin(); toast("Poslali sme ti kód na potvrdenie e-mailu.");
      }).catch(function (x) { unspin(b); err(x); if (/už má účet/.test(x.message)) { LG.mode = "in"; renderLogin(); } });
    };
    var cr = $("codeReq");
    if (cr) cr.onsubmit = function (e) {
      e.preventDefault();
      var em = $("c-email").value.trim(), b = cr.querySelector("button");
      LG.email = em;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast("Zadaj platný e-mail."); return; }
      spin(b);
      api.loginEmail(em).then(function () { LG.sent = true; renderLogin(); toast("Kód je na ceste – pozri e-mail."); var c = $("otp"); if (c) c.focus(); })
        .catch(function (x) { unspin(b); err(x); });
    };
    var cf = $("codeForm");
    if (cf) cf.onsubmit = function (e) {
      e.preventDefault();
      var v = $("otp").value.replace(/\D/g, ""), b = cf.querySelector("button");
      if (v.length < 6) { toast("Kód má 6 číslic."); return; }
      spin(b);
      api.verifyEmailCode(LG.email, v).then(function () {
        if (LG.mode === "code") try { sessionStorage.setItem("eb_setpw", "1"); } catch (x) {}
        loggedIn();
      }).catch(function (x) { unspin(b); err(x); });
    };
    if (window.innerWidth > 700) { var f1 = $("otp") || ($("a-email") ? ($("a-email").value ? $("a-pw") : $("a-email")) : $("c-email")); if (f1) f1.focus(); }
  }
  function codeForm(label) {
    return '<form id="codeForm" novalidate style="margin-top:14px"><span class="fl">Kód z e-mailu</span><input class="inp code" id="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456">' +
      '<button class="btn full" type="submit" style="margin-top:12px">' + label + "</button></form>";
  }
  function invCard(i) {
    var r = i.ride, ty = r && TYPES[r.type];
    return '<div class="invcard' + (i.valid ? "" : " off") + '">' + (i.inviter.avatar_url ? '<img src="' + esc(i.inviter.avatar_url) + '" alt="">' : '<span class="pic init" style="background:var(--b)">' + esc((i.inviter.name || "?").charAt(0)) + "</span>") +
      "<div><b>" + esc(i.inviter.name || "Kamoš") + "</b> " + (r ? "ťa volá na jazdu" : "ťa pozýva do svojej partie") +
      (r ? '<small>' + (ty ? IC[ty[1]] : "") + esc(r.title) + " · " + dLabel(r.starts_at).toLowerCase() + " o " + hm(r.starts_at) + "</small>" : "<small>Po registrácii budete hneď priatelia.</small>") +
      (i.valid ? "" : "<small>Pozvánka už vypršala – zaregistrovať sa môžeš aj tak.</small>") + "</div></div>";
  }
  function vPw() {
    var has = api.hasPassword();
    return '<div class="sh-top"><button class="icb" data-act="closem" aria-label="Zavrieť">' + IC.close + "</button><b>" + (has ? "Zmeniť heslo" : "Nastaviť heslo") + '</b></div><div class="pad">' +
      '<p class="sub" style="margin-bottom:4px">' + (has ? "Zadaj nové heslo." : "S heslom sa nabudúce prihlásiš hneď – bez kódu z e-mailu.") + "</p>" +
      '<form id="pwForm" novalidate><input type="email" autocomplete="username" value="' + esc(api.email ? api.email() : "") + '" hidden><span class="fl">Nové heslo</span>' + pwField("n-pw", "new-password", "aspoň 8 znakov") +
      '<button class="btn full" type="submit" style="margin-top:16px">Uložiť heslo</button></form></div>';
  }
  function openPw() {
    openModal(vPw());
    var f = $("pwForm");
    f.onsubmit = function (e) {
      e.preventDefault(); var pw = $("n-pw").value, b = f.querySelector("button[type=submit]");
      if (pw.length < 8) { toast("Heslo musí mať aspoň 8 znakov."); return; }
      spin(b);
      api.setPassword(pw).then(function () { closeModal(); toast("Heslo uložené. Nabudúce sa prihlásiš e-mailom a heslom."); if (S.tab === "profile") render(true); })
        .catch(function (x) { unspin(b); err(x); });
    };
  }
  function needsOnboarding() { return !S.me || !S.me.age || !S.me.display_name || (!S.me.ig_username && !S.me.fb_name); }
  function contactFields(pre, u) {
    return '<span class="fl">Kde ti kamoši napíšu? <small style="font-weight:500;color:var(--mu)">stačí jedno</small></span>' +
      '<div class="cfield">' + sz(IC.ig, 18) + '<input class="inp" id="' + pre + '-ig" maxlength="80" autocapitalize="off" autocomplete="off" placeholder="Instagram – napr. martin.rides" value="' + esc(u.ig_username || "") + '"></div>' +
      '<div class="cfield">' + sz(IC.fb, 18) + '<input class="inp" id="' + pre + '-fb" maxlength="100" autocomplete="off" placeholder="Facebook – meno alebo odkaz" value="' + esc(u.fb_name || "") + '"></div>';
  }
  function renderOnboarding() {
    var u = S.me || {}, o = $("onb"); o.classList.remove("hide", "login-mode");
    var types = u.bike_types && u.bike_types.length ? u.bike_types : [];
    o.innerHTML = '<h1 style="margin-top:-24px;font-size:26px">Ahoj' + (u.display_name ? ", <span>" + esc(u.display_name.split(" ")[0]) + "</span>" : "") + ' 👋</h1><p>Doplň pár údajov, aby ťa kamoši spoznali.</p>' +
      '<div class="igcard"><label style="cursor:pointer;display:inline-block" title="Zmeniť fotku">' + pic(S.uid, "lg") + '<input type="file" accept="image/*" data-up="avatar" hidden></label>' +
      '<div class="n">' + esc(u.display_name || "tvoje meno") + '</div><label class="upl">📷 Nahrať profilovú fotku<input type="file" accept="image/*" data-up="avatar" hidden></label></div>' +
      '<form id="onbForm">' +
      '<span class="fl">Meno a priezvisko</span><input class="inp" id="o-name" required maxlength="60" autocomplete="name" placeholder="napr. Martin Novák" value="' + esc(u.display_name || "") + '">' +
      '<div class="two" style="margin-top:4px"><div><span class="fl">Vek</span><input class="inp" id="o-age" type="number" min="14" max="99" required value="' + esc(u.age || "") + '"></div><div><span class="fl">Mesto</span><input class="inp" id="o-city" maxlength="60" value="' + esc(u.city || "") + '"></div></div>' +
      '<p class="small-note" style="margin-top:6px">Vek uvidia kamoši pri jazdách, aby vedeli, s kým idú.</p>' +
      contactFields("o", u) +
      '<p class="small-note" style="margin-top:6px">Uvidia to len prihlásení bikeri – aby ti vedeli napísať napr. pred jazdou.</p>' +
      '<span class="fl">Na čom jazdíš?</span><div class="opts" id="o-types">' + Object.keys(TYPES).map(function (k) { return '<button type="button" data-act="toggle-on" data-v="' + k + '" class="' + (types.indexOf(k) > -1 ? "on" : "") + '">' + IC[TYPES[k][1]] + TYPES[k][0] + "</button>"; }).join("") + "</div>" +
      '<div style="padding-top:22px"><button class="btn full" type="submit">Hotovo, ideme jazdiť →</button></div></form>';
    $("onbForm").onsubmit = function (e) {
      e.preventDefault();
      var patch = { display_name: $("o-name").value.trim(), age: +$("o-age").value, city: $("o-city").value.trim() || null,
        ig_username: cleanIg($("o-ig").value) || null, fb_name: cleanFb($("o-fb").value) || null,
        bike_types: [].slice.call(document.querySelectorAll("#o-types .on")).map(function (b) { return b.dataset.v; }) };
      if (!patch.display_name) { toast("Zadaj svoje meno."); return; }
      if (!(patch.age >= 14 && patch.age <= 99)) { toast("Zadaj vek (14 – 99)."); return; }
      var bad = checkContacts(patch.ig_username, patch.fb_name); if (bad) { toast(bad); return; }
      api.updateProfile(patch).then(function (p) { S.me = p; S.P[S.uid] = p; $("onb").classList.add("hide"); render(); afterStart(); toast("Vitaj v EliteBiker Ride, <b>" + esc(p.display_name.split(" ")[0]) + "</b>!"); }).catch(err);
    };
  }

  /* ---------------- karty jázd ---------------- */
  function rideCard(r) {
    var ty = TYPES[r.type], ppl = r.participants, n = ppl.length;
    var btn = r.host === S.uid ? '<span class="chip lb">Tvoja jazda</span>' : going(r) ? '<button class="btn sm in" data-act="join" data-id="' + r.id + '">' + IC.check + "Ideš</button>" : '<button class="btn sm" data-act="join" data-id="' + r.id + '">Pridám sa</button>';
    return '<div class="card ride" data-act="open" data-id="' + r.id + '">' +
      (invitedMe(r) ? '<div class="invited" style="margin-bottom:10px">✉️ ' + esc(hname(r.host)) + " ťa pozýva</div>" : "") +
      '<div class="rh">' + pic(r.host) + '<div class="nm">' + hn(r.host) + "<small>" + esc((r.meet.label || "").split(" – ")[0]) + '</small></div><div class="time">' + hm(r.starts_at) + "<small>" + dShort(r.starts_at) + "</small></div></div>" +
      '<div class="rt">' + esc(r.title) + "</div>" +
      '<div class="meta"><span class="chip b">' + IC[ty[1]] + ty[0] + "</span>" + (r.distance_km ? '<span class="chip">' + IC.route + km(r.distance_km) + " km</span>" : "") + (r.elevation_m ? '<span class="chip">' + IC.up + r.elevation_m + " m</span>" : "") + '<span class="chip">' + IC.gauge + PACE[r.pace] + "</span></div>" +
      '<div class="rf"><div class="stack">' + ppl.slice(0, 4).map(function (u) { return pic(u, "s"); }).join("") + "<em>" + (n === 1 ? "zatiaľ len " + (r.host === S.uid ? "ty" : esc(hname(r.host))) : n + " " + (n < 5 ? "idú" : "ide")) + "</em></div>" + btn + "</div></div>";
  }
  function pastCard(r) {
    return '<div class="card ride" data-act="open" data-id="' + r.id + '"><div class="rh">' + pic(r.host) + '<div class="nm">' + hn(r.host) + "<small>" + dLabel(r.starts_at) + " · " + r.participants.length + " " + ludi(r.participants.length) + '</small></div><span class="chip lb" style="margin-left:auto">Odjazdené</span></div>' +
      '<div class="rt">' + esc(r.title) + '</div><div class="rf"><div class="stack">' + r.participants.slice(0, 5).map(function (u) { return pic(u, "s"); }).join("") + "<em>" + (r.distance_km ? km(r.distance_km) + " km" : "") + '</em></div><button class="btn sm gh" data-act="open" data-id="' + r.id + '">' + sz(IC.camera, 15) + "Fotky</button></div></div>";
  }

  /* ---------------- obrazovky ---------------- */
  function notifCount() { return S.fr.incoming.length + S.rides.filter(invitedMe).length; }
  function topbar(title) {
    var n = notifCount();
    return '<div class="top">' + title + '<div style="display:flex;gap:8px;align-items:center"><button class="icb" data-act="notif" style="position:relative" aria-label="Upozornenia">' + sz(IC.bell, 19) + (n ? '<span class="dot" style="top:-4px;right:-4px">' + n + "</span>" : "") + "</button></div></div>";
  }
  function vFeed() {
    var up = S.rides.filter(function (r) { return !ended(r) && (S.filter === "all" || r.type === S.filter); });
    var past = S.rides.filter(function (r) { return ended(r) && going(r); }).reverse();
    var mine = S.rides.filter(function (r) { return !ended(r) && going(r); }).length;
    var html = topbar(brand()) + '<div class="pad"><h1 class="t">Ahoj ' + esc(S.me.display_name ? S.me.display_name.split(" ")[0] : S.me.ig_username) + ', <span>ideme?</span></h1><p class="sub">' + up.length + " " + (up.length === 1 ? "jazda" : up.length > 1 && up.length < 5 ? "jazdy" : "jázd") + " od partie · ty ideš na " + mine + "</p>" +
      '<div class="hero"><svg class="deco" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6"><circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M15 6h2l1.5 11M5.5 17 9 9h7M9 9l3.5 8H18.5"/></svg><b>Ideš jazdiť?</b><p>Daj vedieť partii. Kto má čas, pridá sa.</p><div style="display:flex;gap:8px;flex-wrap:wrap">' +
      (S.tpl.length ? '<button class="btn sm" data-act="repeat" data-i="0">' + sz(IC.repeat, 15) + "Zopakovať „" + esc(S.tpl[0].title.slice(0, 22)) + "“</button>" : "") + '<button class="btn sm" ' + (S.tpl.length ? 'style="background:rgba(255,255,255,.16);color:#fff"' : "") + ' data-act="create">Nová jazda</button></div></div>' +
      '<div class="filters">' + [["all", "Všetko"]].concat(Object.keys(TYPES).map(function (k) { return [k, TYPES[k][0]]; })).map(function (f) { return '<button data-act="filter" data-f="' + f[0] + '" class="' + (S.filter === f[0] ? "on" : "") + '">' + (f[0] !== "all" ? IC[TYPES[f[0]][1]] : "") + f[1] + "</button>"; }).join("") + "</div>";
    if (!up.length) html += '<div class="empty-state"><i>🚵</i><b>' + (S.fr.friends.length ? "Zatiaľ nikto nič neplánuje" : "Pridaj si partiu") + "</b>" + (S.fr.friends.length ? "Buď prvý a daj vedieť, kedy ideš." : "Nájdi kamošov podľa @mena alebo im pošli pozvánku.") + '<br><br><button class="btn sm" data-act="' + (S.fr.friends.length ? "create" : "tab") + '" data-t="friends">' + (S.fr.friends.length ? "Vytvoriť jazdu" : "Nájsť kamošov") + "</button></div>";
    var last = null;
    up.forEach(function (r) { var l = dLabel(r.starts_at); if (l !== last) { html += '<div class="dayh">' + l + "</div>"; last = l; } html += rideCard(r); });
    if (past.length) html += '<div class="dayh">Po jazde</div>' + past.map(pastCard).join("");
    return html + "</div>";
  }
  function vFriends() {
    var html = topbar('<h1 class="t">Moja <span>partia</span></h1>') + '<div class="pad">' +
      '<div class="search" style="margin-top:0">' + IC.search + '<input id="q" placeholder="Meno, Instagram alebo Facebook" value="' + esc(S.q) + '" autocomplete="off" autocapitalize="off"></div><div id="qres">' + qResults() + "</div>" +
      '<div class="invite"><div style="flex:1"><b>Pozvi kamoša</b><small>Pošli mu odkaz – po registrácii budete hneď priatelia.</small></div><button class="btn sm" data-act="invite-link">Pozvať</button></div>';
    if (S.fr.incoming.length) html += '<div class="sec-h"><b>Žiadosti</b><small>' + S.fr.incoming.length + '</small></div><div class="card" style="padding:4px 16px">' + S.fr.incoming.map(function (id) {
      return '<div class="row">' + pic(id) + '<div class="grow"><b>' + hn(id) + "</b><small>" + esc([contactLine(id), prof(id).city].filter(Boolean).join(" · ")) + '</small></div><button class="btn sm gh" data-act="decline" data-u="' + id + '">✕</button><button class="btn sm" data-act="accept" data-u="' + id + '">Prijať</button></div>'; }).join("") + "</div>";
    html += '<div class="sec-h"><b>Priatelia</b><small>' + S.fr.friends.length + "</small></div>";
    if (!S.fr.friends.length) html += '<div class="empty-state"><i>🤝</i><b>Zatiaľ nikoho nemáš</b>Vyhľadaj kamošov hore podľa mena, alebo im pošli pozvánku.</div>';
    else html += '<div class="card" style="padding:4px 16px">' + S.fr.friends.slice().sort(function (a, b) { return hname(a) < hname(b) ? -1 : 1; }).map(function (id) {
      var next = S.rides.filter(function (r) { return r.host === id && !ended(r); })[0], p = prof(id);
      return '<div class="row">' + pic(id) + '<div class="grow"><b>' + hn(id) + "</b><small>" + (next ? '<span class="live">jazdí ' + dShort(next.starts_at).toLowerCase() + " " + hm(next.starts_at) + "</span>" : esc([contactLine(id), p.city].filter(Boolean).join(" · "))) + "</small></div>" +
        (next ? '<button class="btn sm gh" data-act="open" data-id="' + next.id + '">Jazda</button>' : "") + contactBtns(id) + "</div>"; }).join("") + "</div>";
    if (S.fr.outgoing.length) html += '<div class="sec-h"><b>Čakajú na potvrdenie</b><small>' + S.fr.outgoing.length + '</small></div><div class="card" style="padding:4px 16px">' + S.fr.outgoing.map(function (id) {
      return '<div class="row" style="opacity:.7">' + pic(id) + '<div class="grow"><b>' + hn(id) + '</b><small>žiadosť odoslaná</small></div><button class="btn sm gh" data-act="unfriend" data-u="' + id + '">Zrušiť</button></div>'; }).join("") + "</div>";
    return html + "</div>";
  }
  function qResults() {
    if (!S.qres) return "";
    if (!S.qres.length) return '<p class="info" style="text-align:left">Nikoho takého sme nenašli. Pošli mu pozvánku nižšie.</p>';
    return '<div class="card" style="padding:4px 16px;margin-top:10px">' + S.qres.map(function (p) {
      S.P[p.id] = S.P[p.id] || p;
      var st = isFriend(p.id) ? '<span class="chip lb">Priateľ</span>' : S.fr.outgoing.indexOf(p.id) > -1 ? '<span class="chip">Odoslané</span>' : S.fr.incoming.indexOf(p.id) > -1 ? '<button class="btn sm" data-act="accept" data-u="' + p.id + '">Prijať</button>' : '<button class="btn sm" data-act="addfriend" data-u="' + p.id + '">Pridať</button>';
      return '<div class="row">' + pic(p.id) + '<div class="grow"><b>' + hn(p.id) + "</b><small>" + esc([contactLine(p.id), p.city].filter(Boolean).join(" · ")) + "</small></div>" + st + "</div>"; }).join("") + "</div>";
  }
  function vClub() {
    var st = S.stats, pts = st ? st.joined * 20 + st.hosted * 50 + st.photos * 10 : null;
    var lvl = pts >= 2000 ? "Zlatý" : "Strieborný", pct = pts == null ? 0 : Math.min(100, Math.round(pts / 2000 * 100));
    var u = C.ESHOP_URL || "https://www.elitebiker.sk/";
    return topbar('<h1 class="t">EliteBiker <span>Klub</span></h1>') + '<div class="pad">' +
      '<div class="kh"><span class="lv">★ ' + lvl + ' člen</span><div class="pts">' + (pts == null ? "…" : pts.toLocaleString("sk")) + "<small>EB bodov</small></div>" +
      '<div class="bar"><i style="width:' + pct + '%"></i></div><p>' + (pts >= 2000 ? "Máš Zlatý level – 5 % zľava na všetko v e-shope." : "Do Zlatého levelu (5 % zľava v e-shope) ti chýba " + (pts == null ? "…" : 2000 - pts) + " bodov.") + "</p>" +
      '<div class="earn"><div><b>+20</b>spoločná jazda</div><div><b>+50</b>založíš jazdu</div><div><b>+10</b>fotka z jazdy</div></div>' + (st ? '<p style="margin-top:8px">' + st.joined + " jázd s partiou · " + st.hosted + " založených · " + st.photos + " fotiek</p>" : "") + "</div>" +
      '<div class="shop"><span style="font-size:26px">🛒</span><div class="grow"><b>E-shop elitebiker.sk</b><small>Bicykle, diely a výbava. Členovia Klubu majú zľavy.</small></div><a class="btn sm" href="' + esc(u) + '" target="_blank" rel="noopener">Otvoriť →</a></div>' +
      '<div class="sec-h"><b>Odmeny za body</b><small>ukáž v predajni</small></div><div class="card" style="padding:4px 16px">' + REWARDS.map(function (x) {
        var ok = pts != null && pts >= x[3];
        return '<div class="rw"><i>' + x[0] + '</i><div class="grow"><b>' + x[1] + "</b><small>" + x[2] + '</small></div><button class="cost' + (ok ? "" : " no") + '" data-act="reward" data-i="' + REWARDS.indexOf(x) + '">' + x[3] + " b</button></div>"; }).join("") + "</div>" +
      '<div class="sec-h"><b>Zľavy pre členov</b><small>termíny čoskoro</small></div><div class="disc">' + DISC.map(function (d) {
        return '<a href="' + esc(u + d[3]) + '" target="_blank" rel="noopener"><i>' + d[0] + "</i><b>" + d[1] + "</b><small>" + d[2] + '</small><span class="soon">Zľava čoskoro</span><span class="go">Pozrieť v e-shope →</span></a>'; }).join("") + "</div>" +
      '<div class="sec-h"><b>Servis</b></div><div class="card"><div class="kc"><span class="ic">🔧</span><div class="grow"><b>Bicykel do formy</b><small>Kontrola alebo servis v EliteBikeri.</small><a class="btn sm" style="text-decoration:none" href="' + esc(u) + 'servis-bicyklov-2/" target="_blank" rel="noopener">Objednať servis →</a></div></div></div>' +
      '<div class="sos"><span style="font-size:24px">🛟</span><div><b>Defekt alebo porucha na trase?</b><small>Zavolaj nám: +421 919 125 174</small></div><a class="btn sm" href="tel:+421919125174">Volať</a></div></div>';
  }
  function vProfile() {
    var u = S.me;
    var html = topbar('<h1 class="t">Môj <span>profil</span></h1>') + '<div class="pad"><div class="prof"><label style="cursor:pointer;display:inline-block" title="Zmeniť fotku">' + pic(S.uid, "lg") + '<input type="file" accept="image/*" data-up="avatar" hidden></label>' +
      "<h2>" + esc(u.display_name || "") + '</h2><p class="sub">' + esc([u.age ? u.age + " r." : "", u.city].filter(Boolean).join(" · ")) + "</p>" +
      '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px"><button class="btn sm gh" data-act="edit">Upraviť profil</button>' +
      (igUrl(S.uid) ? '<a class="btn sm gh" href="' + esc(igUrl(S.uid)) + '" target="_blank" rel="noopener">' + sz(IC.ig, 14) + "@" + esc(u.ig_username) + "</a>" : "") +
      (fbUrl(S.uid) ? '<a class="btn sm gh" href="' + esc(fbUrl(S.uid)) + '" target="_blank" rel="noopener">' + sz(IC.fb, 14) + esc(fbLabel(S.uid)) + "</a>" : "") + "</div></div>";
    if (S.editing) html += '<form class="card" id="editForm" style="margin-top:14px"><span class="fl" style="margin-top:0">Meno a priezvisko</span><input class="inp" id="e-name" required maxlength="60" value="' + esc(u.display_name || "") + '">' +
      '<div class="two"><div><span class="fl">Vek</span><input class="inp" id="e-age" type="number" min="14" max="99" required value="' + esc(u.age || "") + '"></div><div><span class="fl">Mesto</span><input class="inp" id="e-city" maxlength="60" value="' + esc(u.city || "") + '"></div></div>' +
      contactFields("e", u) +
      '<span class="fl">Na čom jazdíš?</span><div class="opts" id="e-types">' + Object.keys(TYPES).map(function (k) { return '<button type="button" data-act="toggle-on" data-v="' + k + '" class="' + ((u.bike_types || []).indexOf(k) > -1 ? "on" : "") + '">' + IC[TYPES[k][1]] + TYPES[k][0] + "</button>"; }).join("") + "</div>" +
      '<div style="display:flex;gap:8px;margin-top:16px"><button class="btn gh" type="button" data-act="edit">Zrušiť</button><button class="btn" style="flex:1" type="submit">Uložiť</button></div></form>';
    html += '<div class="sec-h"><b>Moje skratky</b><small>komu posielam jazdy</small></div>' + (S.sc.length ? '<div class="card" style="padding:4px 16px">' + S.sc.map(function (s) {
      return '<div class="row"><span style="font-size:22px;width:38px;text-align:center">' + esc(s.emoji) + '</span><div class="grow"><b>' + esc(s.name) + "</b><small>" + s.members.map(function (m) { return esc(hname(m)); }).join(", ") + '</small></div><button class="btn sm gh" data-act="del-sc" data-id="' + s.id + '">Zmazať</button></div>'; }).join("") + "</div>" : '<p class="info" style="text-align:left">Skratku si vytvoríš pri posielaní jazdy – vyber kamošov a daj „Nová skratka“.</p>') +
      '<div class="shop"><span style="font-size:24px">🛒</span><div class="grow"><b>E-shop elitebiker.sk</b><small>Bicykle, diely, výbava a servis</small></div><a class="btn sm" href="' + esc(C.ESHOP_URL) + '" target="_blank" rel="noopener">Otvoriť →</a></div>' +
      '<div class="card" style="padding:4px 16px;margin-top:14px"><div class="kv"><span>Ochrana súkromia</span><b><a class="link-plain" href="privacy.html" target="_blank">Prečítať</a></b></div><div class="kv"><span>Heslo</span><b><button class="link-plain" data-act="pw">' + (api.hasPassword() ? "Zmeniť" : "Nastaviť") + '</button></b></div><div class="kv"><span>Účet' + (api.email && api.email() ? ' <small class="em">' + esc(api.email()) + "</small>" : "") + '</span><b><button class="link-plain" data-act="logout">Odhlásiť sa</button></b></div><div class="kv"><span>Zmazať účet a všetky údaje</span><b><button class="link-plain danger" data-act="delete-acc">Zmazať</button></b></div></div>' +
      (api.mode === "demo" ? '<p class="small-note">Skúšobný režim – údaje sú len v tomto prehliadači.</p>' : "") + "</div>";
    return html;
  }

  function renderNav() {
    var it = [["feed", "Jazdy", sz(IC.bike, 23)], ["friends", "Partia", IC.users], ["create", "", IC.plus], ["club", "Klub", IC.club], ["profile", "Profil", null]];
    $("nav").innerHTML = brand("nav-logo") + it.map(function (x) {
      if (x[0] === "create") return '<button class="plus" data-act="create" aria-label="Nová jazda">' + x[2] + "</button>";
      var ic = x[0] === "profile" ? '<span class="navav' + (S.tab === "profile" ? " on" : "") + '">' + pic(S.uid, "navpic") + "</span>" : x[2];
      var dot = x[0] === "friends" && S.fr.incoming.length ? '<span class="dot">' + S.fr.incoming.length + "</span>" : "";
      return '<button data-act="tab" data-t="' + x[0] + '" class="' + (S.tab === x[0] ? "on" : "") + '">' + ic + x[1] + dot + "</button>";
    }).join("") + '<div class="nav-foot"><a href="' + esc(C.ESHOP_URL) + '" target="_blank" rel="noopener">🛒 E-shop elitebiker.sk</a><br><a class="link-plain" style="font-weight:600;font-size:12px" href="privacy.html" target="_blank">Ochrana súkromia</a></div>';
  }
  function render(keep) {
    if (!S.me) return;
    var v = $("view"), y = v.scrollTop;
    v.innerHTML = { feed: vFeed, friends: vFriends, club: vClub, profile: vProfile }[S.tab]();
    if (keep) v.scrollTop = y;
    renderNav();
    var q = $("q");
    if (q) q.oninput = function () {
      S.q = q.value; clearTimeout(q._t);
      q._t = setTimeout(function () {
        if (S.q.replace(/^@/, "").length < 2) { S.qres = null; $("qres").innerHTML = ""; return; }
        api.searchProfiles(S.q).then(function (r) { S.qres = r; var el = $("qres"); if (el) el.innerHTML = qResults(); }).catch(err);
      }, 350);
    };
    var ef = $("editForm");
    if (ef) ef.onsubmit = function (e) {
      e.preventDefault();
      var patch = { display_name: $("e-name").value.trim(), age: +$("e-age").value, city: $("e-city").value.trim() || null,
        ig_username: cleanIg($("e-ig").value) || null, fb_name: cleanFb($("e-fb").value) || null,
        bike_types: [].slice.call(document.querySelectorAll("#e-types .on")).map(function (b) { return b.dataset.v; }) };
      if (!patch.display_name) { toast("Zadaj svoje meno."); return; }
      if (!(patch.age >= 14 && patch.age <= 99)) { toast("Vek musí byť 14 – 99."); return; }
      var bad = checkContacts(patch.ig_username, patch.fb_name); if (bad) { toast(bad); return; }
      api.updateProfile(patch).then(function (p) { S.me = p; S.P[S.uid] = p; S.editing = false; render(true); toast("Profil uložený."); }).catch(err);
    };
    if (S.tab === "club" && !S.stats) api.stats().then(function (s) { S.stats = s; if (S.tab === "club") render(true); }).catch(function () { S.stats = { joined: 0, hosted: 0, photos: 0 }; });
  }

  /* ---------------- detail jazdy ---------------- */
  var dmap = null;
  function openSheet(kind, html) { var sh = $("sheet"); sh.dataset.kind = kind; sh.innerHTML = html; sh.scrollTop = 0; sh.classList.add("open"); }
  function closeSheet() {
    if (S.unsubChat) { S.unsubChat(); S.unsubChat = null; }
    if (dmap) { dmap.remove(); dmap = null; }
    S.openId = null; $("sheet").classList.remove("open");
    if (location.hash.indexOf("#jazda-") === 0) history.replaceState(null, "", location.pathname + location.search);
    render(true);
  }
  function openModal(html) { var m = $("modal"); m.innerHTML = html; m.scrollTop = 0; m.classList.add("open"); }
  function closeModal() { $("modal").classList.remove("open"); }

  function openRide(id) {
    var r = find(id); if (!r) { toast("Túto jazdu nevidíš – asi ťa na ňu nikto nepozval."); return; }
    if (S.unsubChat) { S.unsubChat(); S.unsubChat = null; }
    if (dmap) { dmap.remove(); dmap = null; }
    S.openId = id; closeModal();
    var ty = TYPES[r.type];
    openSheet("ride", '<div class="sh-top"><button class="icb" data-act="close" aria-label="Späť">' + IC.back + '</button><b>Detail jazdy</b><button class="icb" data-act="share-ride" data-id="' + r.id + '" aria-label="Zdieľať">' + IC.share + "</button></div>" +
      '<div class="pad"><div class="lmap" id="dmap"></div>' +
      '<div class="navi"><a class="btn sm gh" href="https://www.google.com/maps/dir/?api=1&destination=' + r.meet.lat + "," + r.meet.lng + '" target="_blank" rel="noopener">' + sz(IC.nav, 14) + 'Google Mapy</a><a class="btn sm gh" href="https://waze.com/ul?ll=' + r.meet.lat + "," + r.meet.lng + '&navigate=yes" target="_blank" rel="noopener">' + sz(IC.nav, 14) + "Waze</a></div>" +
      '<div style="margin-top:14px" class="meta"><span class="chip b">' + IC[ty[1]] + ty[0] + "</span>" + (r.audience_kind === "friends" ? '<span class="chip">Celá partia</span>' : '<span class="chip">' + IC.lock + "Len pozvaní</span>") + (r.allow_invites ? '<span class="chip">Účastníci môžu pozývať</span>' : "") + "</div>" +
      '<h1 class="t" style="margin-top:10px;font-size:21px">' + esc(r.title) + '</h1><p class="sub">' + dLabel(r.starts_at) + ' o <b style="color:var(--ink)">' + hm(r.starts_at) + "</b> – približne do " + hm(r.ends_at) + "</p>" +
      '<div class="field set" style="margin-top:10px;cursor:default"><span class="ic">' + IC.pin + '</span><div class="grow"><b>Stretko</b><small>' + esc(r.meet.label) + "</small></div></div>" +
      '<div class="grid4"><div><b>' + (r.distance_km ? km(r.distance_km) : "–") + "</b><small>km</small></div><div><b>" + (r.elevation_m || "–") + "</b><small>m stúp.</small></div><div><b>" + PACE[r.pace] + '</b><small>tempo</small></div><div><b id="dCount">' + r.participants.length + "</b><small>" + ludi(r.participants.length) + "</small></div></div>" +
      (r.note ? '<div class="note">' + esc(r.note) + "</div>" : "") +
      '<div id="dPhotos"></div><div id="dPeople"></div><div id="dChat"></div></div><div class="sticky-act" id="dActs"></div>');
    updateDetail();
    setTimeout(function () { if (S.openId === id && window.EBMap) dmap = EBMap.showRide($("dmap"), r); }, 60);
    loadPhotos(id);
    if (going(r) && !ended(r)) {
      api.messages(id).then(function (m) { S.chat[id] = m; renderChat(); }).catch(err);
      S.unsubChat = api.subscribeMessages(id, function (m) { var arr = S.chat[id] = S.chat[id] || []; if (!arr.some(function (x) { return x.id && x.id === m.id; })) arr.push(m); renderChat(true); });
    }
  }
  function updateDetail() {
    var r = find(S.openId); if (!r) return;
    var pend = r.audience.filter(function (u) { return r.participants.indexOf(u) < 0; });
    var canInv = canInvite(r);
    $("dCount") && ($("dCount").textContent = r.participants.length);
    $("dPeople").innerHTML = (S.fresh === r.id && canInv ? '<div class="fresh">✅<div class="grow"><b>Jazda je uložená</b><small>Kamošom, čo ešte nemajú appku, pošli odkaz – po registrácii sú rovno na jazde.</small></div><button class="btn sm" data-act="ride-link" data-id="' + r.id + '">' + sz(IC.link, 14) + "Odkaz</button></div>" : "") +
      '<div class="sec-h"><b>Kto ide</b><small>' + r.participants.length + (pend.length && r.host === S.uid ? " · " + pend.length + " pozvaní" : "") + '</small></div><div class="card" style="padding:4px 16px">' +
      r.participants.map(function (id) { return '<div class="row">' + pic(id) + '<div class="grow"><b>' + (id === S.uid ? "ty" + age(id) : hn(id)) + (id === r.host ? ' <span class="chip lb" style="padding:1px 8px;font-size:10.5px">organizuje</span>' : "") + "</b><small>" + esc(contactLine(id)) + "</small></div>" + (id !== S.uid ? contactBtns(id) : "") + "</div>"; }).join("") +
      (r.host === S.uid ? pend.map(function (id) { return '<div class="row" style="opacity:.6">' + pic(id) + '<div class="grow"><b>' + hn(id) + "</b><small>pozvaný · zatiaľ sa nepridal</small></div></div>"; }).join("") : "") +
      (canInv ? '<div class="row" style="cursor:pointer" data-act="invmodal" data-id="' + r.id + '"><span class="icb" style="width:38px;height:38px;background:var(--lb);border-color:var(--lbl);color:var(--b)">' + sz(IC.plus, 18) + '</span><div class="grow"><b style="color:var(--b)">Pozvať kamošov</b><small>z tvojej partie</small></div></div>' +
        '<div class="row" style="cursor:pointer" data-act="ride-link" data-id="' + r.id + '"><span class="icb" style="width:38px;height:38px;background:var(--lb);border-color:var(--lbl);color:var(--b)">' + sz(IC.link, 18) + '</span><div class="grow"><b style="color:var(--b)">Pozvať odkazom</b><small>aj tých, čo ešte nemajú appku</small></div></div>' : "") + "</div>";
    renderChat();
    $("dActs").innerHTML = ended(r) ? "" : r.host === S.uid ? '<button class="btn gh" style="flex:0 0 auto" data-act="cancel" data-id="' + r.id + '">Zrušiť jazdu</button>' + (canInv ? '<button class="btn full" data-act="invmodal" data-id="' + r.id + '">' + sz(IC.send, 16) + "Pozvať kamošov</button>" : "")
      : going(r) ? '<button class="btn full in" data-act="join" data-id="' + r.id + '">' + IC.check + "Ideš · odhlásiť sa</button>" : '<button class="btn full" data-act="join" data-id="' + r.id + '">Pridám sa k jazde</button>';
    renderPhotos();
  }
  function renderChat(scroll) {
    var r = find(S.openId), el = $("dChat"); if (!r || !el) return;
    var h = '<div class="sec-h"><b>Chat jazdy</b><small>' + (ended(r) ? "zmazaný" : going(r) ? "vidia len účastníci" : "🔒 len pre účastníkov") + "</small></div>";
    if (ended(r)) { el.innerHTML = h + '<div class="lockbox">🧹<div><b>Chat sa zmazal po skončení jazdy</b><small>Fotky z jazdy ostávajú. Zážitky zdieľajte na Instagrame.</small></div></div>'; return; }
    if (!going(r)) { el.innerHTML = h + '<div class="lockbox">🔒<div><b>Chat je len pre tých, čo idú</b><small>Pridaj sa a dohodnite sa.</small></div></div>'; return; }
    var m = S.chat[r.id];
    var focused = document.activeElement && document.activeElement.id === "cin", val = focused ? $("cin").value : "";
    el.innerHTML = h + (m == null ? '<div class="loading">Načítavam…</div>' : m.length ? m.map(function (c) {
      return '<div class="cm' + (c.user_id === S.uid ? " me" : "") + '">' + pic(c.user_id, "s") + '<div class="bub"><b>' + (c.user_id === S.uid ? "ty" : esc(hname(c.user_id))) + "</b>" + esc(c.body) + "</div></div>"; }).join("") : '<p class="sub" style="margin-bottom:12px">Zatiaľ ticho. Napíš, kde presne sa stretnete.</p>') +
      '<form class="cin" id="cform"><input id="cin" placeholder="Napíš správu…" autocomplete="off" maxlength="1000"><button class="btn" type="submit">Poslať</button></form><p class="info" style="margin-top:8px">🕒 Chat sa zmaže po skončení jazdy (' + dShort(r.ends_at).toLowerCase() + " o " + hm(r.ends_at) + ").</p>";
    if (focused) { $("cin").value = val; $("cin").focus(); }
    $("cform").onsubmit = function (e) {
      e.preventDefault(); var i = $("cin"), v = i.value.trim(); if (!v) return; i.value = "";
      api.sendMessage(r.id, v).catch(function (x) { i.value = v; err(x); });
    };
    if (scroll) { var sh = $("sheet"); sh.scrollTop = sh.scrollHeight; }
  }
  function loadPhotos(id) { api.photos(id).then(function (p) { S.photos[id] = p; if (S.openId === id) renderPhotos(); }).catch(function () { S.photos[id] = []; }); }
  function renderPhotos() {
    var r = find(S.openId), el = $("dPhotos"); if (!r || !el) return;
    var ph = S.photos[r.id] || [], can = going(r);
    if (!can && !ph.length) { el.innerHTML = ""; return; }
    el.innerHTML = '<div class="sec-h"><b>Fotky z jazdy</b><small>' + (ph.length ? ph.length + " · vidia ich všetci pozvaní" : "zatiaľ žiadne") + '</small></div><div class="phg">' +
      (can ? '<label class="upt">' + sz(IC.plus, 22) + 'Pridať fotku<input type="file" accept="image/*" multiple data-up="photo" data-id="' + r.id + '"></label>' : "") +
      ph.map(function (p, i) { return '<div class="ph" data-act="viewph" data-i="' + i + '"><img class="real" src="' + esc(p.url) + '" alt="" loading="lazy"><span class="who">' + pic(p.user_id, "xs") + '<span style="overflow:hidden;text-overflow:ellipsis">' + (p.user_id === S.uid ? "ty" : esc(hname(p.user_id))) + "</span></span></div>"; }).join("") + "</div>" +
      (can && !ph.length ? '<p class="info" style="text-align:left;margin-top:8px">Pridaj fotku zo stretka, z výhľadu alebo z cieľa. Fotky ostávajú aj po jazde.</p>' : "");
  }
  function vPhoto(i) {
    var r = find(S.openId), p = (S.photos[r.id] || [])[i];
    return '<div class="sh-top"><button class="icb" data-act="closem">' + IC.close + '</button><b>Fotka z jazdy</b></div><div class="pad viewer"><img src="' + esc(p.url) + '" alt=""><div class="rh" style="margin-top:12px">' + pic(p.user_id) + '<div class="nm">' + (p.user_id === S.uid ? "ty" : hn(p.user_id)) + "<small>" + esc(r.title) + " · " + dLabel(r.starts_at) + "</small></div></div>" +
      '<div style="display:flex;gap:8px;margin-top:16px"><a class="btn igb" style="flex:1;text-decoration:none" href="' + esc(p.url) + '" download target="_blank" rel="noopener">' + sz(IC.ig, 16) + "Uložiť a dať na Instagram</a>" + (p.user_id === S.uid ? '<button class="btn gh" data-act="delph" data-i="' + i + '">Zmazať</button>' : "") + "</div>" +
      '<p class="info">Fotku si ulož a pridaj do Instagram Story – označ @elitebiker.sk a partiu.</p></div>';
  }

  /* ---------------- pozývací odkaz ---------------- */
  var LNK = null;
  function canInvite(r) { return r && !ended(r) && (r.host === S.uid || (r.allow_invites && going(r))); }
  function openLink(rideId) {
    var r = rideId ? find(rideId) : null, first = (S.me.display_name || "").split(" ")[0];
    LNK = null;
    openModal('<div class="sh-top"><button class="icb" data-act="closem" aria-label="Zavrieť">' + IC.close + "</button><b>" + (r ? "Pozvať na jazdu odkazom" : "Pozvať kamoša do appky") + '</b></div><div class="pad">' +
      (r ? '<div class="rpill"><span class="ic">' + IC[TYPES[r.type][1]] + "</span><div><b>" + esc(r.title) + "</b><small>" + dLabel(r.starts_at) + " o " + hm(r.starts_at) + "</small></div></div>" : "") +
      '<p class="sub" style="margin:4px 0 14px">' + (r ? "Pošli odkaz cez WhatsApp, Messenger alebo SMS. Kto ho otvorí a zaregistruje sa, je <b>rovno na tejto jazde</b> a v tvojej partii." : "Pošli odkaz cez WhatsApp, Messenger alebo SMS. Kto ho otvorí a zaregistruje sa, bude <b>hneď v tvojej partii</b> – bez potvrdzovania.") + "</p>" +
      '<div class="linkbox">' + sz(IC.link, 18) + '<input id="lnk" readonly value="Pripravujem odkaz…" aria-label="Pozývací odkaz"></div>' +
      '<div class="lacts">' + (navigator.share ? '<button class="btn" data-act="lnk-share" disabled>' + sz(IC.share, 16) + "Poslať</button>" : "") +
      '<a class="btn wa" id="lnkWa" target="_blank" rel="noopener" aria-disabled="true">' + sz(IC.wa, 16) + "WhatsApp</a>" +
      '<button class="btn gh" data-act="lnk-copy" disabled>Kopírovať</button></div>' +
      '<p class="info">' + (r ? "Odkaz platí do konca jazdy." : "Odkaz platí 30 dní a môžeš ho poslať viacerým.") + "</p></div>");
    api.createInvite(rideId || null).then(function (code) {
      var url = shareUrl("?pozvanka=" + encodeURIComponent(code));
      var text = r ? (first || "Kamoš") + " ťa volá na jazdu 🚴 " + r.title + " – " + dLabel(r.starts_at).toLowerCase() + " o " + hm(r.starts_at) + ". Zaregistruj sa a si rovno na jazde:"
        : "Poď so mnou jazdiť na bike 🚴 Pridaj sa do mojej partie v EliteBiker Ride:";
      LNK = { url: url, text: text };
      var i = $("lnk"); if (!i) return;
      i.value = url;
      [].forEach.call(document.querySelectorAll("#modal .lacts button"), function (b) { b.disabled = false; });
      var wa = $("lnkWa"); wa.href = "https://wa.me/?text=" + encodeURIComponent(text + " " + url); wa.removeAttribute("aria-disabled");
    }).catch(function (e) { closeModal(); err(e); });
  }
  function copyLink() {
    if (!LNK) return;
    var full = LNK.text + " " + LNK.url, ok = function () { toast("Odkaz skopírovaný – vlož ho kamošovi do správy."); };
    var fallback = function () { var i = $("lnk"); if (i) { i.value = LNK.url; i.select(); try { document.execCommand("copy"); ok(); } catch (e) { toast("Označ odkaz a skopíruj ho."); } } };
    try { navigator.clipboard.writeText(full).then(ok, fallback); } catch (e) { fallback(); }
  }

  /* ---------------- pozvanie k existujúcej jazde ---------------- */
  var INV = [];
  function vInv(r) {
    var excl = r.participants.concat(r.audience);
    var list = S.fr.friends.filter(function (u) { return excl.indexOf(u) < 0; });
    return '<div class="sh-top"><button class="icb" data-act="closem">' + IC.close + '</button><b>Pozvať na jazdu</b></div><div class="pad"><p class="sub" style="margin-bottom:12px">' + esc(r.title) + " · " + dShort(r.starts_at) + " " + hm(r.starts_at) + "</p>" +
      '<button class="linkrow" data-act="ride-link" data-id="' + r.id + '"><span class="ic">' + IC.link + '</span><span class="grow"><b>Poslať odkaz</b><small>aj tým, čo ešte nemajú appku – po registrácii sú rovno na jazde</small></span></button>' +
      (list.length ? '<span class="fl">Z tvojej partie</span>' : "") +
      (list.length ? '<div class="quick"><button data-act="inv-all">👥 Všetci</button>' + S.sc.map(function (c, i) { return '<button data-act="inv-sc" data-i="' + i + '">' + esc(c.emoji) + " " + esc(c.name) + "</button>"; }).join("") + "</div>" +
        '<div class="card" style="padding:4px 16px">' + list.map(function (id) { var on = INV.indexOf(id) > -1;
          return '<div class="inv-row' + (on ? " on" : "") + '" data-act="inv-tog" data-u="' + id + '">' + pic(id) + '<div class="grow"><b>' + hn(id) + "</b><small>" + esc(contactLine(id)) + '</small></div><span class="cb">' + IC.check + "</span></div>"; }).join("") + "</div>"
        : '<div class="empty-state"><b>' + (S.fr.friends.length ? "Všetkých kamošov už si pozval" : "V appke zatiaľ nemáš kamošov") + "</b>Pošli im odkaz vyššie.</div>") +
      (list.length ? '<div class="sendbar"><div><div class="who">' + (INV.length ? INV.map(function (u) { return esc(hname(u)); }).join(", ") : "Nikto nie je vybraný") + '</div><button class="btn sm" data-act="inv-send" data-id="' + r.id + '">Pozvať ' + sz(IC.send, 14) + "</button></div></div>" : "") + "</div>";
  }

  /* ---------------- vytvorenie jazdy ---------------- */
  function resetD() { D = { type: (S.me.bike_types && S.me.bike_types[0]) || "mtb", o: 1, time: "15:00", dur: 3, meet: null, route: null, km: "", title: "", pace: "stredne", note: "", inv: [], allowInv: false, tpl: -1 }; }
  function buildTemplates(list) {
    var map = {}, out = [];
    list.forEach(function (r) {
      var k = r.type + "|" + r.title.toLowerCase();
      if (!map[k]) { map[k] = { title: r.title, type: r.type, starts_at: r.starts_at, ends_at: r.ends_at, meet: r.meet, route: r.route, km: r.distance_km, pace: r.pace, note: r.note, who: r.participants.filter(function (u) { return u !== S.uid; }), n: 0 }; out.push(map[k]); }
      map[k].n++;
    });
    return out.slice(0, 4);
  }
  function applyTpl(i) {
    var t = S.tpl[i], s = new Date(t.starts_at);
    D.tpl = i; D.type = t.type; D.title = t.title; D.meet = t.meet; D.route = t.route; D.km = t.km ? String(t.km) : ""; D.pace = t.pace; D.note = t.note || "";
    D.time = String(s.getHours()).padStart(2, "0") + ":" + String(s.getMinutes()).padStart(2, "0");
    D.dur = Math.max(1, Math.round((new Date(t.ends_at) - s) / 36e5));
    D.inv = t.who.filter(isFriend);
    for (var k = 1; k <= 7; k++) { var x = new Date(); x.setDate(x.getDate() + k); if (x.getDay() === s.getDay()) { D.o = k > 6 ? 1 : k; break; } }
  }
  function vCreate() {
    var days = ""; for (var i = 0; i < 7; i++) { var d = new Date(); d.setDate(d.getDate() + i); days += '<button type="button" data-act="d" data-k="o" data-v="' + i + '" class="' + (D.o === i ? "on" : "") + '">' + (i === 0 ? "Dnes" : i === 1 ? "Zajtra" : DS[d.getDay()]) + "<b>" + d.getDate() + "</b></button>"; }
    function opt(k, arr) { return arr.map(function (a) { return '<button type="button" data-act="d" data-k="' + k + '" data-v="' + a[0] + '" class="' + (String(D[k]) === String(a[0]) ? "on" : "") + '">' + a[1] + "</button>"; }).join(""); }
    var tpl = S.tpl.map(function (h, i) { var ty = TYPES[h.type]; return '<button type="button" data-act="tpl" data-i="' + i + '" class="' + (D.tpl === i ? "on" : "") + '"><span class="ty">' + IC[ty[1]] + ty[0] + " · " + hm(h.starts_at) + "</span><b>" + esc(h.title) + "</b><small>" + (h.km ? km(h.km) + " km · " : "") + PACE[h.pace].toLowerCase() + "</small><small style=\"margin-top:3px\">" + esc((h.meet.label || "").split(",")[0]) + " · " + h.n + "×</small><div class=\"stack\">" + h.who.slice(0, 4).map(function (u) { return pic(u, "s"); }).join("") + "</div></button>"; }).join("");
    return '<div class="sh-top"><button class="icb" data-act="close">' + IC.close + "</button><b>Idem jazdiť</b></div><form class=\"pad\" id=\"nform\" novalidate>" +
      (tpl ? '<span class="fl" style="margin-top:4px">' + sz(IC.repeat, 13) + ' Zopakuj obvyklú jazdu</span><div class="tpl">' + tpl + "</div>" + (D.tpl > -1 ? '<div class="filled">' + IC.check + "Vyplnené podľa „" + esc(S.tpl[D.tpl].title) + "“. Skontroluj deň a čas.</div>" : "") : "") +
      '<span class="fl">Na čom ideš?</span><div class="types">' + Object.keys(TYPES).map(function (k) { return '<button type="button" data-act="d" data-k="type" data-v="' + k + '" class="' + (D.type === k ? "on" : "") + '">' + IC[TYPES[k][1]] + TYPES[k][0] + "</button>"; }).join("") + "</div>" +
      '<span class="fl">Kedy?</span><div class="days">' + days + '</div><div class="two" style="margin-top:8px"><div><span class="fl" style="margin-top:4px">Štart o</span><input class="inp" type="time" id="f-time" value="' + D.time + '"></div><div><span class="fl" style="margin-top:4px">Približne na</span><select class="inp" id="f-dur">' + [1, 2, 3, 4, 5, 6, 8].map(function (h) { return '<option value="' + h + '"' + (D.dur === h ? " selected" : "") + ">" + h + (h === 1 ? " hodinu" : h < 5 ? " hodiny" : " hodín") + "</option>"; }).join("") + "</select></div></div>" +
      '<span class="fl">Kde je stretko?</span><button type="button" class="field' + (D.meet ? " set" : "") + '" data-act="pick-meet"><span class="ic">' + IC.pin + '</span><div class="grow"><b>' + (D.meet ? "Stretko" : "Vybrať miesto na mape") + "</b><small>" + (D.meet ? esc(D.meet.label) : "Posuň mapu a polož špendlik – ako vo Wolte") + "</small></div>" + sz(IC.back, 16).replace("<svg", '<svg style="transform:rotate(180deg);color:var(--li)"') + "</button>" +
      (D.meet ? '<div class="lmap sm" id="fmap" style="margin-top:8px"></div>' : "") +
      '<span class="fl">Trasa (nepovinné)</span><button type="button" class="field' + (D.route ? " set" : "") + '" data-act="pick-route"' + (D.meet ? "" : " disabled style=\"opacity:.55\"") + '><span class="ic">' + IC.route + '</span><div class="grow"><b>' + (D.route ? "Trasa · " + esc(D.km) + " km" : "Nakresliť trasu na mape") + "</b><small>" + (D.route ? D.route.length + " bodov – ťukni a uprav" : D.meet ? "Ťukaj na mapu, kadiaľ pôjdete" : "Najprv vyber stretko") + "</small></div></button>" +
      '<span class="fl">Kam? (názov jazdy)</span><input class="inp" id="f-title" maxlength="80" value="' + esc(D.title) + '" placeholder="napr. Manín, Súľov, okruh okolo Váhu">' +
      '<div class="two" style="margin-top:4px"><div><span class="fl">Dĺžka (km)</span><input class="inp" id="f-km" inputmode="decimal" value="' + esc(D.km) + '" placeholder="napr. 35"></div><div><span class="fl">Tempo</span><select class="inp" id="f-pace">' + Object.keys(PACE).map(function (k) { return '<option value="' + k + '"' + (D.pace === k ? " selected" : "") + ">" + PACE[k] + "</option>"; }).join("") + "</select></div></div>" +
      '<span class="fl">Poznámka</span><textarea class="inp" id="f-note" rows="2" maxlength="500" placeholder="napr. beriem svetlá, po jazde káva">' + esc(D.note) + "</textarea>" +
      '<div style="height:16px"></div><button class="btn full" type="submit">Ďalej: komu pošleš jazdu →</button><p class="sub" style="text-align:center;margin-top:10px;font-size:12.5px">+50 EB bodov za založenú jazdu</p></form>';
  }
  var fmap = null;
  function saveD() {
    var g = function (id) { var e = $(id); return e ? e.value : null; };
    if ($("f-time")) { D.time = g("f-time") || D.time; D.dur = +g("f-dur") || D.dur; D.title = g("f-title"); D.km = g("f-km"); D.pace = g("f-pace"); D.note = g("f-note"); }
  }
  function drawCreate(keep) {
    if (fmap) { fmap.remove(); fmap = null; }
    var sh = $("sheet"), y = sh.scrollTop; sh.dataset.kind = "create"; sh.innerHTML = vCreate(); sh.scrollTop = keep ? y : 0;
    $("nform").onsubmit = function (e) { e.preventDefault(); saveD(); if (!D.meet) { toast("Vyber miesto stretka na mape."); return; } drawSend(); };
    if (D.meet && window.EBMap) setTimeout(function () { var el = $("fmap"); if (el) fmap = EBMap.showRide(el, { meet: D.meet, route: D.route }); }, 60);
  }
  function openCreate(tplI) {
    S.openId = null; closeModal();
    var go = function () { resetD(); if (tplI != null && S.tpl[tplI]) applyTpl(tplI); openSheet("create", ""); drawCreate(); };
    api.myTemplates().then(function (l) { S.tpl = buildTemplates(l); go(); }).catch(go);
  }
  function startsAt() { var d = new Date(); d.setDate(d.getDate() + D.o); var p = (D.time || "15:00").split(":"); d.setHours(+p[0], +p[1], 0, 0); return d; }
  function same(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (b.indexOf(a[i]) < 0) return false; return true; }
  function vSend() {
    var sel = D.inv, ty = TYPES[D.type], all = S.fr.friends.length && same(sel, S.fr.friends), st = startsAt();
    return '<div class="sh-top"><button class="icb" data-act="closem">' + IC.back + '</button><b>Komu pošleš jazdu?</b></div><div class="pad">' +
      '<div class="rpill"><span class="ic">' + IC[ty[1]] + "</span><div><b>" + esc(D.title || "Jazda – " + ty[0]) + "</b><small>" + dLabel(st.toISOString()) + " o " + esc(D.time) + (D.km ? " · " + esc(D.km) + " km" : "") + " · " + PACE[D.pace].toLowerCase() + "</small></div></div>" +
      (!S.fr.friends.length ? '<div class="nofr"><b>V appke ešte nemáš kamošov</b><small>Nevadí – ulož jazdu a pošli im odkaz. Kto sa cez neho zaregistruje, je rovno na jazde.</small></div>' : "") +
      (S.fr.friends.length ? '<span class="fl">Skratky</span><div class="scs"><button data-act="sc-all" class="' + (all ? "on" : "") + '"><i>👥</i>Všetci priatelia<small>' + S.fr.friends.length + " " + ludi(S.fr.friends.length) + "</small></button>" +
      S.sc.map(function (c, i) { var m = c.members.filter(isFriend), on = sel.length && same(sel, m); return '<button data-act="sc" data-i="' + i + '" class="' + (on ? "on" : "") + '"><i>' + esc(c.emoji) + "</i>" + esc(c.name) + "<small>" + m.map(function (u) { return esc(hname(u).split(/[._]/)[0]); }).join(", ") + "</small></button>"; }).join("") +
      '<button class="add" data-act="sc-new"><i>＋</i>Nová skratka<small>z vybraných</small></button></div>' +
      (S.scNew ? '<div class="scform"><input id="scname" placeholder="Názov, napr. Nedeľná partia" maxlength="30"><button class="btn sm" data-act="sc-save">Uložiť</button></div>' : "") +
      '<span class="fl">Priatelia</span><div class="card" style="padding:4px 16px">' + S.fr.friends.map(function (id) { var on = sel.indexOf(id) > -1; return '<div class="inv-row' + (on ? " on" : "") + '" data-act="s-tog" data-u="' + id + '">' + pic(id) + '<div class="grow"><b>' + hn(id) + "</b><small>" + esc([contactLine(id), prof(id).city].filter(Boolean).join(" · ")) + '</small></div><span class="cb">' + IC.check + "</span></div>"; }).join("") + "</div>" +
      '<p class="info" style="text-align:left">' + sz(IC.link, 13) + " Kamošom bez appky pošleš po uložení odkaz.</p>" : "") +
      '<div class="tog" data-act="allowinv"><div><b>Účastníci môžu pozvať ďalších</b><small>' + (D.allowInv ? "Aj tí, čo idú, môžu pridať svojich kamošov. Uvidíš ich vek." : "Ďalších ľudí môžeš pridať len ty.") + '</small></div><span class="sw' + (D.allowInv ? " on" : "") + '"></span></div>' +
      '<p class="info">🔒 Jazdu uvidia len vybraní. Ostatní o nej nebudú vedieť.</p>' +
      '<div class="sendbar"><div><div class="who">' + (sel.length ? (all ? "Všetci priatelia" : sel.map(function (u) { return esc(hname(u)); }).join(", ")) : S.fr.friends.length ? "Nikto nie je vybraný" : "Pozveš odkazom") + "<small>" + (sel.length ? sel.length + " " + ludi(sel.length) + " dostane pozvánku" : S.fr.friends.length ? "vyber kamošov alebo pošli odkaz" : "odkaz pošleš hneď po uložení") + '</small></div><button class="btn sm" data-act="dosend" id="dosend">' + (sel.length ? "Odoslať " + sz(IC.send, 14) : "Uložiť jazdu") + "</button></div></div></div>";
  }
  function drawSend(keep) { var m = $("modal"), y = m.scrollTop; m.innerHTML = vSend(); m.scrollTop = keep ? y : 0; m.classList.add("open"); var n = $("scname"); if (n) n.focus(); }
  function createRide() {
    var st = startsAt();
    if (st < new Date(Date.now() - 10 * 60e3)) { toast("Tento čas už bol. Vyber neskorší."); return; }
    var title = (D.title || "").trim() || (TYPES[D.type][0] + " – " + (D.meet.addr || D.meet.label || "").split(",")[0]);
    var km = parseFloat(String(D.km || "").replace(",", "."));
    var b = $("dosend"); if (b) { b.disabled = true; b.innerHTML = '<span class="spin-sm" style="border-top-color:var(--b);border-color:rgba(27,70,229,.25)"></span>'; }
    api.createRide({ type: D.type, title: title.slice(0, 80), note: (D.note || "").trim(), starts_at: st.toISOString(), ends_at: new Date(st.getTime() + D.dur * 36e5).toISOString(),
      meet: { lat: D.meet.lat, lng: D.meet.lng, label: D.meet.label }, route: D.route, distance_km: isFinite(km) ? km : null, pace: D.pace, allow_invites: D.allowInv,
      audience_kind: same(D.inv, S.fr.friends) ? "friends" : "pick" }, D.inv.slice()).then(function (id) {
      closeModal(); $("sheet").classList.remove("open"); if (fmap) { fmap.remove(); fmap = null; }
      S.tab = "feed"; S.filter = "all"; S.stats = null;
      S.fresh = id;
      toast(D.inv.length ? "Jazdu dostal" + (D.inv.length === 1 ? "" : "i") + " <b>" + D.inv.length + "</b> " + (D.inv.length === 1 ? "kamoš" : "kamoši") + ". Ostatní ju nevidia. <b>+50 b</b>" : "Jazda uložená <b>+50 b</b>. Teraz pošli kamošom odkaz.");
      return loadAll().then(function () { render(); openRide(id); });
    }).catch(function (e) { if (b) { b.disabled = false; b.innerHTML = D.inv.length ? "Odoslať " + sz(IC.send, 14) : "Uložiť jazdu"; } err(e); });
  }

  /* ---------------- mapa: výber stretka a trasy ---------------- */
  var pmap = null;
  function openPicker(kind) {
    saveD();
    var m = $("modal"); m.innerHTML = '<div id="pickRoot" style="position:absolute;inset:0"></div>'; m.classList.add("open"); m.scrollTop = 0;
    var root = $("pickRoot"), home = C.HOME || { lat: 49.1209, lng: 18.4215 };
    var done = function () { if (pmap) { pmap.remove(); pmap = null; } closeModal(); };
    if (kind === "meet") pmap = EBMap.pickPoint(root, { value: D.meet, home: home, icons: IC, toast: toast, title: "Miesto stretka",
      onCancel: done, onPick: function (p) { var moved = D.meet && (Math.abs(D.meet.lat - p.lat) > 1e-5 || Math.abs(D.meet.lng - p.lng) > 1e-5); D.meet = p; if (D.route && moved) D.route[0] = [p.lat, p.lng]; done(); drawCreate(true); } });
    else pmap = EBMap.drawRoute(root, { value: D.route, start: D.meet, home: home, icons: IC, toast: toast,
      onCancel: done, onPick: function (pts, km) { D.route = pts; if (pts) D.km = String(km).replace(".", ","); done(); drawCreate(true); } });
  }

  /* ---------------- upozornenia ---------------- */
  function vNotif() {
    var inv = S.rides.filter(invitedMe), html = '<div class="sh-top"><button class="icb" data-act="closem">' + IC.close + '</button><b>Upozornenia</b></div><div class="pad">';
    if (!inv.length && !S.fr.incoming.length) html += '<div class="empty-state"><i>🔔</i><b>Nič nové</b>Tu uvidíš pozvánky na jazdy a žiadosti o priateľstvo.</div>';
    html += S.fr.incoming.map(function (id) { return '<div class="card nt new">' + pic(id) + '<div style="flex:1"><p><b>' + hn(id) + '</b> ti poslal žiadosť o priateľstvo</p><div class="acts"><button class="btn sm" data-act="accept" data-u="' + id + '">Prijať</button><button class="btn sm gh" data-act="decline" data-u="' + id + '">Odmietnuť</button></div></div></div>'; }).join("");
    html += inv.map(function (r) { return '<div class="card nt new">' + pic(r.host) + '<div style="flex:1"><p><b>' + hn(r.host) + "</b> ťa pozýva: <b>" + esc(r.title) + "</b> – " + dShort(r.starts_at).toLowerCase() + " o " + hm(r.starts_at) + '</p><div class="acts"><button class="btn sm" data-act="join" data-id="' + r.id + '">Pridám sa</button><button class="btn sm gh" data-act="open" data-id="' + r.id + '">Detail</button></div></div></div>'; }).join("");
    return html + "</div>";
  }

  /* ---------------- udalosti ---------------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el) return; var a = el.dataset.act; if (!a) return;
    if (a !== "open") e.stopPropagation();
    var id = el.dataset.id, u = el.dataset.u;
    switch (a) {
      case "toggle-on": el.classList.toggle("on"); break;
      case "tab": S.tab = el.dataset.t; S.editing = false; closeModal(); if ($("sheet").classList.contains("open")) closeSheet(); render(); $("view").scrollTop = 0; break;
      case "notif": openModal(vNotif()); break;
      case "filter": S.filter = el.dataset.f; render(true); break;
      case "open": openRide(id); break;
      case "close": closeSheet(); break;
      case "closem": if (pmap) { pmap.remove(); pmap = null; } closeModal(); break;
      case "scrim": if ($("modal").classList.contains("open")) closeModal(); else closeSheet(); break;
      case "join": (function () {
        var r = find(id); if (!r) return;
        var p = going(r) ? api.leaveRide(id) : api.joinRide(id);
        p.then(function () { toast(going(r) ? "Odhlásil si sa z jazdy." : "Ideš! Odomkol sa ti chat jazdy. <b>+20 b</b>"); S.stats = null; return loadAll(); })
          .then(function () { render(true); if ($("modal").classList.contains("open") && !$("pickRoot")) openModal(vNotif()); if (S.openId === id) openRide(id); }).catch(err);
      })(); break;
      case "cancel": if (el.dataset.sure) { api.cancelRide(id).then(function () { toast("Jazda zrušená."); closeSheet(); return refresh(); }).catch(err); } else { el.dataset.sure = 1; el.textContent = "Naozaj zrušiť?"; el.classList.add("danger"); } break;
      case "share-ride": if (canInvite(find(id))) { openLink(id); break; } (function () { var r = find(id); share((hname(r.host)) + " ide " + TYPES[r.type][0].toLowerCase() + " – " + dLabel(r.starts_at).toLowerCase() + " o " + hm(r.starts_at) + ": " + r.title + ".", shareUrl("#jazda-" + r.id)); })(); break;
      case "invite-link": openLink(null); break;
      case "ride-link": openLink(id); break;
      case "lnk-share": if (LNK) navigator.share({ title: "EliteBiker Ride", text: LNK.text, url: LNK.url }).catch(function () {}); break;
      case "lnk-copy": copyLink(); break;
      case "lg": LG.mode = el.dataset.m; LG.sent = false; var ae = $("a-email") || $("c-email"); if (ae) LG.email = ae.value.trim(); renderLogin(); break;
      case "lg-resend": api.resendSignup(LG.email).then(function () { toast("Poslali sme nový kód."); }).catch(err); break;
      case "eye": (function () { var i = $(el.dataset.for); if (i) { i.type = i.type === "password" ? "text" : "password"; el.classList.toggle("on", i.type === "text"); } })(); break;
      case "pw": openPw(); break;
      case "create": openCreate(); break;
      case "repeat": openCreate(+el.dataset.i); break;
      case "tpl": saveD(); var ti = +el.dataset.i; if (D.tpl === ti) resetD(); else applyTpl(ti); drawCreate(true); break;
      case "d": saveD(); D[el.dataset.k] = el.dataset.k === "o" ? +el.dataset.v : el.dataset.v; drawCreate(true); break;
      case "pick-meet": openPicker("meet"); break;
      case "pick-route": if (D.meet) openPicker("route"); break;
      case "sc-all": D.inv = same(D.inv, S.fr.friends) ? [] : S.fr.friends.slice(); drawSend(true); break;
      case "sc": var mm = S.sc[+el.dataset.i].members.filter(isFriend); D.inv = same(D.inv, mm) ? [] : mm; drawSend(true); break;
      case "s-tog": var ix = D.inv.indexOf(u); if (ix > -1) D.inv.splice(ix, 1); else D.inv.push(u); drawSend(true); break;
      case "sc-new": if (!D.inv.length) { toast("Najprv vyber kamošov, z ktorých bude skratka."); return; } S.scNew = !S.scNew; drawSend(true); break;
      case "sc-save": var nm = ($("scname").value || "").trim(); if (!nm) { toast("Napíš názov skratky."); return; }
        api.saveShortcut({ name: nm, emoji: "⭐", members: D.inv.slice() }).then(function (s) { S.sc.push(s); S.scNew = false; drawSend(true); toast("Skratka <b>" + esc(nm) + "</b> uložená."); }).catch(err); break;
      case "allowinv": D.allowInv = !D.allowInv; drawSend(true); break;
      case "dosend": createRide(); break;
      case "invmodal": INV = []; openModal(vInv(find(id))); break;
      case "inv-tog": var j = INV.indexOf(u); if (j > -1) INV.splice(j, 1); else INV.push(u); (function () { var m = $("modal"), y = m.scrollTop; m.innerHTML = vInv(find(S.openId)); m.scrollTop = y; })(); break;
      case "inv-all": case "inv-sc": (function () { var r = find(S.openId), ex = r.participants.concat(r.audience); INV = (a === "inv-all" ? S.fr.friends : S.sc[+el.dataset.i].members).filter(function (x) { return isFriend(x) && ex.indexOf(x) < 0; }); $("modal").innerHTML = vInv(r); })(); break;
      case "inv-send": if (!INV.length) { toast("Vyber aspoň jedného kamoša."); return; } (function () { var n = INV.length; api.invite(id, INV.slice()).then(function () { INV = []; closeModal(); toast("Pozvánka odoslaná " + n + (n === 1 ? " kamošovi." : " kamošom.")); return refresh(); }).catch(err); })(); break;
      case "viewph": openModal(vPhoto(+el.dataset.i)); break;
      case "delph": (function () { var r = find(S.openId), p = S.photos[r.id][+el.dataset.i]; api.deletePhoto(p).then(function () { closeModal(); toast("Fotka zmazaná."); loadPhotos(r.id); }).catch(err); })(); break;
      case "addfriend": api.requestFriend(u).then(function () { toast("Žiadosť odoslaná <b>" + esc(hname(u)) + "</b>."); return loadAll(); }).then(function () { render(true); }).catch(err); break;
      case "accept": api.acceptFriend(u).then(function () { toast("<b>" + esc(hname(u)) + "</b> je v tvojej partii."); return loadAll(); }).then(function () { render(true); if ($("modal").classList.contains("open")) openModal(vNotif()); }).catch(err); break;
      case "decline": case "unfriend": api.removeFriend(u).then(loadAll).then(function () { render(true); if ($("modal").classList.contains("open")) openModal(vNotif()); }).catch(err); break;
      case "edit": S.editing = !S.editing; render(true); break;
      case "del-sc": api.deleteShortcut(id).then(function () { S.sc = S.sc.filter(function (s) { return s.id !== id; }); render(true); }).catch(err); break;
      case "reward": (function () { var x = REWARDS[+el.dataset.i], st = S.stats, pts = st ? st.joined * 20 + st.hosted * 50 + st.photos * 10 : 0;
        toast(pts >= x[3] ? "Ukáž túto obrazovku v predajni EliteBiker – <b>" + x[1] + "</b> ti radi dáme." : "Na „" + x[1] + "“ ti chýba ešte " + (x[3] - pts) + " bodov."); })(); break;
      case "logout": api.logout().then(function () { location.href = location.pathname; }); break;
      case "delete-acc": if (el.dataset.sure) { api.deleteAccount().then(function () { location.href = location.pathname; }).catch(err); } else { el.dataset.sure = 1; el.textContent = "Naozaj? Ťukni znova"; } break;
    }
  });
  document.addEventListener("change", function (e) {
    var t = e.target; if (!t || !t.files || !t.files.length || !t.dataset.up) return;
    if (t.dataset.up === "avatar") {
      toast("Nahrávam fotku…");
      api.uploadAvatar(t.files[0]).then(function (p) { S.me = p; S.P[S.uid] = p; if (!$("onb").classList.contains("hide")) renderOnboarding(); else render(true); toast("Profilová fotka uložená."); }).catch(err);
    }
    if (t.dataset.up === "photo") {
      var id = t.dataset.id, files = [].slice.call(t.files);
      toast("Nahrávam " + (files.length === 1 ? "fotku" : files.length + " fotky") + "…");
      files.reduce(function (p, f) { return p.then(function () { return api.uploadPhoto(id, f); }); }, Promise.resolve())
        .then(function () { toast((files.length === 1 ? "Fotka pridaná" : "Fotky pridané") + " k jazde. <b>+" + files.length * 10 + " b</b>"); S.stats = null; loadPhotos(id); }).catch(err);
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if ($("modal").classList.contains("open")) { if (pmap) { pmap.remove(); pmap = null; } closeModal(); } else if ($("sheet").classList.contains("open")) closeSheet(); } });
  window.addEventListener("hashchange", function () { var h = location.hash; if (h.indexOf("#jazda-") === 0 && S.me) openRide(h.slice(7)); });

  /* ---------------- štart ---------------- */
  function afterStart() {
    var add = sessionStorage.getItem("eb_pridaj");
    if (add) {
      sessionStorage.removeItem("eb_pridaj");
      api.byInvite(add).then(function (p) {
        if (!p || p.id === S.uid || isFriend(p.id)) return;
        S.P[p.id] = p;
        return api.requestFriend(p.id).then(function () { toast("Poslali sme žiadosť o priateľstvo <b>" + esc(p.display_name || p.ig_username || "") + "</b>."); return loadAll(); }).then(function () { render(true); });
      }).catch(function () {});
    }
    var h = location.hash, code = pending();
    if (code) {
      try { localStorage.removeItem("eb_pozvanka"); } catch (e) {}
      api.redeemInvite(code).then(function (res) {
        if (!res || (!res.ok && res.reason === "self")) { if (res && res.ride_id) openRide(res.ride_id); return; }
        if (!res.ok) { toast("Pozvánka už vypršala. Kamoša nájdeš v záložke Partia."); return; }
        return loadAll().then(function () {
          var who = "<b>" + esc(hname(res.inviter)) + "</b>";
          render(true);
          if (res.ride_id) { openRide(res.ride_id); toast("Si na jazde! S " + who + " ste v partii 🤝"); }
          else toast(res.reason === "ride_ended" ? "Jazda už skončila, ale s " + who + " ste v partii 🤝" : "S " + who + " ste teraz v partii 🤝");
        });
      }).catch(err);
    } else if (h.indexOf("#jazda-") === 0) setTimeout(function () { openRide(h.slice(7)); }, 200);
    try { if (sessionStorage.getItem("eb_setpw")) { sessionStorage.removeItem("eb_setpw"); setTimeout(function () { openPw(); toast("Prihlásený ✓ Nastav si heslo, nabudúce bez kódu."); }, 400); } } catch (e) {}
    api.subscribeChanges(function () { refresh(); });
    api.myTemplates().then(function (l) { S.tpl = buildTemplates(l); if (S.tab === "feed" && !$("sheet").classList.contains("open")) render(true); }).catch(function () {});
  }
  function boot() {
    if (!api) { document.body.innerHTML = '<p style="padding:40px;font-family:sans-serif">Aplikáciu sa nepodarilo načítať. Obnov stránku.</p>'; return; }
    if (api.mode === "demo") { document.querySelector(".app").classList.add("has-banner"); var b = document.createElement("div"); b.className = "demo-banner"; b.textContent = "Skúšobný režim – údaje sú len v tomto prehliadači"; document.querySelector(".app").appendChild(b); }
    var p = new URLSearchParams(location.search), add = p.get("pridaj"), poz = p.get("pozvanka");
    if (poz && /^[A-Za-z0-9_-]{6,40}$/.test(poz)) { try { localStorage.setItem("eb_pozvanka", poz); } catch (e) {} }
    if (poz) { p.delete("pozvanka"); history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "") + location.hash); }
    if (add) { sessionStorage.setItem("eb_pridaj", add.toLowerCase().replace(/^@/, "")); p.delete("pridaj"); history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "") + location.hash); }
    ["app", "stage"].forEach(function (k) { var el = $(k) || document.querySelector("." + k); if (el) el.addEventListener("scroll", function () { if (el.scrollLeft || el.scrollTop) { el.scrollLeft = 0; el.scrollTop = 0; } }); });
    var sm = new MutationObserver(function () { var o = $("sheet").classList.contains("open") || $("modal").classList.contains("open"); $("scrim").classList.toggle("on", o); });
    sm.observe($("sheet"), { attributes: true, attributeFilter: ["class"] }); sm.observe($("modal"), { attributes: true, attributeFilter: ["class"] });
    api.init().then(function (r) {
      var msg = r.message;
      if (msg) toast(esc(msg));
      if (!r.user) { renderLogin(); return; }
      S.uid = r.user.id;
      $("onb").innerHTML = '<div class="load"><div class="spin"></div>Načítavam…</div>';
      return loadAll().then(function () {
        if (needsOnboarding()) { renderOnboarding(); return; }
        $("onb").classList.add("hide"); render(); afterStart();
      });
    }).catch(function (e) { err(e); renderLogin(); });
    api.onAuth(function (user) { if (!user && S.uid) location.href = location.pathname; });
  }
  boot();
})();
