/* EliteBiker Ride – aplikácia */
(function () {
  "use strict";
  var C = window.EB_CONFIG || {};
  var api = window.EBApi;
  // appka sa nesmie dať vložiť do cudzej stránky (ochrana pred podvrhnutým klikaním)
  if (window.top !== window.self) { try { window.top.location.replace(window.location.href); } catch (e) { document.documentElement.innerHTML = ""; return; } }
  document.addEventListener("error", function (e) { var t = e.target; if (t && t.tagName === "IMG" && t.parentNode && t.parentNode.classList && t.parentNode.classList.contains("brand")) t.parentNode.classList.add("noimg"); }, true);

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
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
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
    bmx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="17" r="3.5"/><circle cx="19" cy="17" r="3.5"/><path d="M5 17l4.5-7h6.5l3 7M9.5 10l2.5 7 4-7M9.5 10 8.5 7H6.5M16 10l.8-4.5h2.2"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M12 13.5v4M10 15.5h4"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'
  };
  function sz(svg, n) { return svg.replace("<svg", '<svg width="' + n + '" height="' + n + '"'); }
  var TYPES = { cesta: ["Cesta", "road"], gravel: ["Gravel", "gravel"], mtb: ["Horský", "mtb"], ebike: ["E-bike", "ebike"], dirt: ["Dirt / BMX", "bmx"] };
  var PACE = { pohoda: "Pohodové", stredne: "Stredné", rychlo: "Rýchle" };
  // farby trailov (horský bicykel) – ako značenie v bike parkoch a trail centrách
  var TRAILS = { green: ["Zelená", "ľahké", "#16a34a"], blue: ["Modrá", "stredné", "#2563eb"], red: ["Červená", "náročné", "#dc2626"], black: ["Čierna", "expert", "#11131a"] };
  function hasPace(t) { return t === "cesta" || t === "gravel"; } // tempo a trasa len pri ceste a gravel
  function paceOf(r) { return hasPace(r.type) && r.pace && PACE[r.pace] ? PACE[r.pace] : ""; }
  function hasTrails(t) { return t === "mtb" || t === "ebike"; } // farby trailov pri horskom aj e-bike
  function trailsOf(r) { return hasTrails(r.type) && r.trails && r.trails.length ? r.trails.filter(function (t) { return TRAILS[t]; }) : []; }
  function tdots(list) { return '<span class="tdots">' + list.map(function (t) { return '<i style="background:' + TRAILS[t][2] + '" title="' + TRAILS[t][0] + '"></i>'; }).join("") + "</span>"; }
  function trailText(list) { return list.map(function (t) { return TRAILS[t][0].toLowerCase(); }).join(", "); }
  function rideStyle(r) { var p = paceOf(r), t = trailsOf(r); return p ? "tempo " + p.toLowerCase() : t.length ? "traily: " + trailText(t) : ""; }
  var RADIUS = 30;
  var VIS = {
    public: ["🌍", "Verejná", "Uvidí ju každý biker do " + RADIUS + " km od stretka a môže sa pridať."],
    friends: ["👥", "Pre partiu", "Vidia ju pozvaní kamoši a môžu pozvať aj svojich kamošov."],
    private: ["🔒", "Len pre vybraných", "Vidia ju len tí, ktorých vyberieš. Ďalej sa nedá poslať."]
  };
  var DN = ["Nedeľa", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota"], DS = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];
  var DISC = [["🍫", "Výživa", "gély, tyčinky, iontové nápoje", "vyziva/"], ["💨", "Pumpy", "minipumpy, dielenské, CO2", "pumpy-a-hustilky/"], ["🕶️", "Okuliare", "cyklistické okuliare", "vyhladavanie/?string=okuliare"], ["💡", "Svetlá", "na zimné a večerné jazdy", "svetla/"]];
  var REWARDS = C.REWARDS || [];

  /* ---------------- stav ---------------- */
  var S = { uid: null, me: null, P: {}, B: {}, rides: [], loc: null, pts: null, admin: false, fr: { friends: [], incoming: [], outgoing: [] }, sc: [], tab: "feed", filter: "all", openId: null, chat: {}, photos: {}, unsubChat: null, q: "", qres: null, editing: false, stats: null, tpl: [], seenInv: {} };
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
  function dShort(iso) { var o = dOff(iso), d = new Date(iso); if (o === 0) return "Dnes"; if (o === 1) return "Zajtra"; if (o === -1) return "Včera"; if (o > 6 || o < -6) return DS[d.getDay()] + " " + d.getDate() + ". " + (d.getMonth() + 1) + "."; return DN[d.getDay()]; }
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
  function bikesOf(id) { return S.B[id] || []; }
  function bikeLine(id) { var b = bikesOf(id)[0]; return b ? '<span class="bkl">' + sz(IC.bike, 13) + "<span>" + esc(b.name) + (bikesOf(id).length > 1 ? " +" + (bikesOf(id).length - 1) : "") + "</span></span>" : ""; }
  function bikeThumb(b) { return b.image ? '<img src="' + esc(b.image) + '" alt="" loading="lazy">' : sz(IC.bike, 24); }
  function nrm(v) { return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function find(id) { for (var i = 0; i < S.rides.length; i++) if (S.rides[i].id === id) return S.rides[i]; return null; }
  function going(r) { return r.participants.indexOf(S.uid) > -1; }
  function ended(r) { return new Date(r.ends_at) < new Date(); }
  function isFull(r) { return !!r.max_people && r.participants.length >= r.max_people; }
  function invitedMe(r) { return !going(r) && r.audience.indexOf(S.uid) > -1 && !ended(r); }
  function isFriend(id) { return S.fr.friends.indexOf(id) > -1; }
  function vis(r) { return VIS[r.visibility] ? r.visibility : "friends"; }
  function kmFrom(r) { return S.loc && window.EBMap ? EBMap.haversine([S.loc.lat, S.loc.lng], [r.meet.lat, r.meet.lng]) : null; }
  function stranger(r) { return vis(r) === "public" && r.host !== S.uid && !isFriend(r.host) && r.audience.indexOf(S.uid) < 0; }
  function pwBad(pw) { return pw.length < 8 || !/[a-zA-ZÀ-ž]/.test(pw) || !/\d/.test(pw) ? "Heslo musí mať aspoň 8 znakov, písmeno aj číslicu." : null; }
  function km(v) { return String(Math.round(v * 10) / 10).replace(".", ","); }
  function spr(n) { return n === 1 ? "správa" : n > 1 && n < 5 ? "správy" : "správ"; }
  function ludi(n) { return n === 1 ? "človek" : n > 1 && n < 5 ? "ľudia" : "ľudí"; }
  function brand(cls) { return '<div class="brand ' + (cls || "") + '"><img src="' + esc(C.LOGO_URL) + '" alt="EliteBiker"><span class="wm">ELITEBIKER</span><span class="ride">Ride</span></div>'; }
  function shareUrl(path) { return (C.APP_URL || location.href.split("#")[0].split("?")[0]) + path; }
  function share(text, url) {
    if (navigator.share) return navigator.share({ title: "EliteBiker Ride", text: text, url: url }).catch(function () {});
    var full = text + " " + url;
    try { navigator.clipboard.writeText(full).then(function () { toast("Odkaz je skopírovaný. Vlož ho kamošovi do správy."); }, function () { toast(esc(url)); }); } catch (e) { toast(esc(url)); }
  }

  /* ---------------- načítanie údajov ---------------- */
  function loadAll() {
    return Promise.all([api.me(), api.rides(), api.friendships(), api.shortcuts(), api.location()]).then(function (r) {
      S.me = r[0]; S.rides = r[1]; S.fr = r[2]; S.sc = r[3]; S.loc = r[4];
      if (S.me) S.P[S.uid] = S.me;
      var ids = {};
      S.rides.forEach(function (x) { ids[x.host] = 1; x.participants.forEach(function (u) { ids[u] = 1; }); x.audience.forEach(function (u) { ids[u] = 1; }); });
      S.fr.friends.concat(S.fr.incoming, S.fr.outgoing).forEach(function (u) { ids[u] = 1; });
      delete ids[S.uid];
      var list = Object.keys(ids);
      return Promise.all([api.profiles(list), api.bikes ? api.bikes(list.concat([S.uid])).catch(function () { return []; }) : []]).then(function (x) {
        x[0].forEach(function (p) { S.P[p.id] = p; });
        var B = {}; (x[1] || []).forEach(function (b) { (B[b.user_id] = B[b.user_id] || []).push(b); }); S.B = B;
      });
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
        '<span class="fl">Heslo</span>' + (m === "up" ? pwField("a-pw", "new-password", "aspoň 8 znakov, písmeno a číslica") : pwField("a-pw", "current-password", "tvoje heslo")) +
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
    o.innerHTML = '<div class="login"><div class="login-hero">' + brand("lg") +
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
      if (LG.mode === "up" && pwBad(pw)) { toast(pwBad(pw)); return; }
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
      api.loginEmail(em).then(function () { LG.sent = true; renderLogin(); toast("Kód je na ceste, pozri si e-mail."); var c = $("otp"); if (c) c.focus(); })
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
      (i.valid ? "" : "<small>Pozvánka už vypršala, zaregistrovať sa však môžeš aj tak.</small>") + "</div></div>";
  }
  function vPw() {
    var has = api.hasPassword();
    return '<div class="sh-top"><button class="icb" data-act="closem" aria-label="Zavrieť">' + IC.close + "</button><b>" + (has ? "Zmeniť heslo" : "Nastaviť heslo") + '</b></div><div class="pad">' +
      '<p class="sub" style="margin-bottom:4px">' + (has ? "Zadaj nové heslo." : "S heslom sa nabudúce prihlásiš hneď, bez kódu z e-mailu.") + "</p>" +
      '<form id="pwForm" novalidate><input type="email" autocomplete="username" value="' + esc(api.email ? api.email() : "") + '" hidden><span class="fl">Nové heslo</span>' + pwField("n-pw", "new-password", "aspoň 8 znakov, písmeno a číslica") +
      '<button class="btn full" type="submit" style="margin-top:16px">Uložiť heslo</button></form></div>';
  }
  function openPw() {
    openModal(vPw());
    var f = $("pwForm");
    f.onsubmit = function (e) {
      e.preventDefault(); var pw = $("n-pw").value, b = f.querySelector("button[type=submit]");
      if (pwBad(pw)) { toast(pwBad(pw)); return; }
      spin(b);
      api.setPassword(pw).then(function () { closeModal(); toast("Heslo uložené. Nabudúce sa prihlásiš e-mailom a heslom."); if (S.tab === "profile") render(true); })
        .catch(function (x) { unspin(b); err(x); });
    };
  }
  function needsOnboarding() { return !S.me || !S.me.age || !S.me.display_name || !S.me.city || (!S.me.ig_username && !S.me.fb_name); }
  // telefón ukladáme v medzinárodnom tvare; slovenské 09xx doplníme na +4219xx
  function normPhone(v) {
    var x = String(v || "").replace(/[\s().\/-]/g, ""); if (!x) return "";
    if (x.indexOf("00") === 0) x = "+" + x.slice(2); else if (x.charAt(0) === "0") x = "+421" + x.slice(1); else if (/^9\d{8}$/.test(x)) x = "+421" + x;
    return /^\+[1-9]\d{7,14}$/.test(x) ? x : null;
  }
  function fmtPhone(p) { if (!p) return ""; var m = /^\+(42[01])(\d{3})(\d{3})(\d{3})$/.exec(p); return m ? "+" + m[1] + " " + m[2] + " " + m[3] + " " + m[4] : p; }
  function phoneField(pre) {
    return '<span class="fl">Telefón <small>nepovinné</small></span><div class="cfield">' + sz(IC.phone, 17) + '<input class="inp" id="' + pre + '-tel" type="tel" inputmode="tel" autocomplete="tel" maxlength="22" placeholder="napr. 0905 123 456" data-orig="' + esc(S.phone || "") + '" value="' + esc(fmtPhone(S.phone)) + '"></div>' +
      '<p class="small-note" style="margin:6px 0 0">📞 Uvidia ho len tí, ktorí idú s tebou na jazdu, a to len kým jazda neskončí. Aby sa ti dovolali, keď ťa čakajú na stretku.</p>';
  }
  // uloží telefón, ak sa zmenil; vráti false, keď je číslo zlé
  function savePhone(pre) {
    var el = $(pre + "-tel"); if (!el) return Promise.resolve(true);
    var v = normPhone(el.value);
    if (v === null) { toast("Telefónne číslo nevyzerá správne. Napíš ho napríklad 0905 123 456."); el.focus(); return Promise.resolve(false); }
    if ((v || "") === (el.dataset.orig || "")) return Promise.resolve(true);
    return api.setPhone(v || null).then(function () { S.phone = v || null; S.phonesKey = {}; return true; });
  }
  function contactFields(pre, u) {
    return '<span class="fl">Kde ti kamoši napíšu? <small style="font-weight:500;color:var(--mu)">stačí jedno</small></span>' +
      '<div class="cfield">' + sz(IC.ig, 18) + '<input class="inp" id="' + pre + '-ig" maxlength="80" autocapitalize="off" autocomplete="off" placeholder="Instagram, napr. martin.rides" value="' + esc(u.ig_username || "") + '"></div>' +
      '<div class="cfield">' + sz(IC.fb, 18) + '<input class="inp" id="' + pre + '-fb" maxlength="100" autocomplete="off" placeholder="Facebook: meno alebo odkaz" value="' + esc(u.fb_name || "") + '"></div>';
  }
  function renderOnboarding() {
    var u = S.me || {}, o = $("onb"); o.classList.remove("hide", "login-mode");
    var types = u.bike_types && u.bike_types.length ? u.bike_types : [];
    o.innerHTML = '<h1 style="margin-top:-24px;font-size:26px">Ahoj' + (u.display_name ? ", <span>" + esc(u.display_name.split(" ")[0]) + "</span>" : "") + ' 👋</h1><p>Doplň pár údajov, aby ťa kamoši spoznali.</p>' +
      '<div class="igcard"><label style="cursor:pointer;display:inline-block" title="Zmeniť fotku">' + pic(S.uid, "lg") + '<input type="file" accept="image/*" data-up="avatar" hidden></label>' +
      '<div class="n">' + esc(u.display_name || "tvoje meno") + '</div><label class="upl">📷 Nahrať profilovú fotku<input type="file" accept="image/*" data-up="avatar" hidden></label></div>' +
      '<form id="onbForm">' +
      '<span class="fl">Meno a priezvisko</span><input class="inp" id="o-name" required maxlength="60" autocomplete="name" placeholder="napr. Martin Novák" value="' + esc(u.display_name || "") + '">' +
      '<div class="two" style="margin-top:4px"><div><span class="fl">Vek</span><input class="inp" id="o-age" type="number" min="14" max="99" required value="' + esc(u.age || "") + '"></div><div><span class="fl">Odkiaľ si</span><input class="inp" id="o-city" maxlength="60" placeholder="mesto alebo obec" required value="' + esc(u.city || "") + '"></div></div>' +
      '<p class="small-note" style="margin:6px 0 0">🔒 Vek a mesto uvidia len tvoji priatelia.</p>' +
      '<p class="small-note" style="margin-top:6px">Vek uvidia kamoši pri jazdách, aby vedeli, s kým idú.</p>' +
      contactFields("o", u) +
      '<p class="small-note" style="margin-top:6px">Uvidia to len prihlásení bikeri, aby ti vedeli napísať napríklad pred jazdou.</p>' +
      phoneField("o") +
      '<span class="fl">Na čom jazdíš?</span><div class="opts" id="o-types">' + Object.keys(TYPES).map(function (k) { return '<button type="button" data-act="toggle-on" data-v="' + k + '" class="' + (types.indexOf(k) > -1 ? "on" : "") + '">' + IC[TYPES[k][1]] + TYPES[k][0] + "</button>"; }).join("") + "</div>" +
      '<div style="padding-top:22px"><button class="btn full" type="submit">Hotovo, ideme jazdiť →</button></div></form>';
    $("onbForm").onsubmit = function (e) {
      e.preventDefault();
      var patch = { display_name: $("o-name").value.trim(), age: +$("o-age").value, city: $("o-city").value.trim() || null,
        ig_username: cleanIg($("o-ig").value) || null, fb_name: cleanFb($("o-fb").value) || null,
        bike_types: [].slice.call(document.querySelectorAll("#o-types .on")).map(function (b) { return b.dataset.v; }) };
      if (!patch.display_name) { toast("Zadaj svoje meno."); return; }
      if (!(patch.age >= 14 && patch.age <= 99)) { toast("Zadaj vek od 14 do 99 rokov."); return; }
      if (!patch.city) { toast("Napíš, odkiaľ si. Podľa toho uvidíš jazdy v okolí."); $("o-city").focus(); return; }
      var bad = checkContacts(patch.ig_username, patch.fb_name); if (bad) { toast(bad); return; }
      if (normPhone($("o-tel").value) === null) { toast("Telefónne číslo nevyzerá správne. Napíš ho napríklad 0905 123 456, alebo nechaj prázdne."); $("o-tel").focus(); return; }
      api.updateProfile(patch).then(function (p) { return savePhone("o").catch(function (x) { err(x); }).then(function () { return p; }); }).then(function (p) { S.me = p; S.P[S.uid] = p; $("onb").classList.add("hide"); render(); afterStart(); autoLocation(p.city); toast("Vitaj v EliteBiker Ride, <b>" + esc(p.display_name.split(" ")[0]) + "</b>!"); }).catch(err);
    };
  }

  /* ---------------- karty jázd ---------------- */
  function rideCard(r) {
    var ty = TYPES[r.type], ppl = r.participants, n = ppl.length, d = vis(r) === "public" ? kmFrom(r) : null;
    var btn = r.host === S.uid ? '<span class="chip lb">Tvoja jazda</span>' : going(r) ? '<button class="btn sm in" data-act="join" data-id="' + r.id + '">' + IC.check + "Ideš</button>" : isFull(r) ? '<span class="chip">Plné</span>' : '<button class="btn sm" data-act="join" data-id="' + r.id + '">Pridám sa</button>';
    return '<div class="card ride" data-act="open" data-id="' + r.id + '">' +
      (invitedMe(r) ? '<div class="invited" style="margin-bottom:10px">✉️ ' + esc(hname(r.host)) + " ťa pozýva</div>" : "") +
      '<div class="rh">' + pic(r.host) + '<div class="nm">' + hn(r.host) + "<small>" + esc((r.meet.label || "").split(/ [–·] /)[0]) + '</small></div><div class="time">' + hm(r.starts_at) + "<small>" + dShort(r.starts_at) + "</small></div></div>" +
      '<div class="rt">' + esc(r.title) + "</div>" +
      '<div class="meta"><span class="chip b">' + IC[ty[1]] + ty[0] + "</span>" + (vis(r) === "public" ? '<span class="chip pub">🌍 Verejná' + (d != null && r.host !== S.uid ? " · " + (d < 1 ? "pri tebe" : Math.round(d) + " km") : "") + "</span>" : vis(r) === "private" && r.host === S.uid ? '<span class="chip">' + IC.lock + "Len vybraní</span>" : "") + (r.distance_km ? '<span class="chip">' + IC.route + km(r.distance_km) + " km</span>" : "") + (r.elevation_m ? '<span class="chip">' + IC.up + r.elevation_m + " m</span>" : "") + (paceOf(r) ? '<span class="chip">' + IC.gauge + paceOf(r) + "</span>" : trailsOf(r).length ? '<span class="chip">' + tdots(trailsOf(r)) + (trailsOf(r).length === 1 ? TRAILS[trailsOf(r)[0]][0] : "traily") + "</span>" : "") + wxChip(r) + "</div>" +
      '<div class="rf"><div class="stack">' + ppl.slice(0, 4).map(function (u) { return pic(u, "s"); }).join("") + "<em>" + (n === 1 ? "zatiaľ len " + (r.host === S.uid ? "ty" : esc(hname(r.host))) : n + " " + (n < 5 ? "idú" : "ide")) + (r.max_people ? " · " + n + "/" + r.max_people : "") + "</em></div>" + btn + "</div></div>";
  }
  function pastCard(r) {
    return '<div class="card ride" data-act="open" data-id="' + r.id + '"><div class="rh">' + pic(r.host) + '<div class="nm">' + hn(r.host) + "<small>" + dLabel(r.starts_at) + " · " + r.participants.length + " " + ludi(r.participants.length) + '</small></div><span class="chip lb" style="margin-left:auto">Odjazdené</span></div>' +
      '<div class="rt">' + esc(r.title) + '</div><div class="rf"><div class="stack">' + r.participants.slice(0, 5).map(function (u) { return pic(u, "s"); }).join("") + "<em>" + (r.distance_km ? km(r.distance_km) + " km" : "") + '</em></div><button class="btn sm gh" data-act="story" data-id="' + r.id + '">' + sz(IC.share, 15) + "Zdieľať</button></div></div>";
  }

  /* ---------------- obrazovky ---------------- */
  function notifCount() { return S.fr.incoming.length + S.rides.filter(invitedMe).length + wxBadRides().length; }
  function topbar(title) {
    var n = notifCount();
    return '<div class="top">' + title + '<div style="display:flex;gap:8px;align-items:center"><button class="icb" data-act="notif" style="position:relative" aria-label="Upozornenia">' + sz(IC.bell, 19) + (n ? '<span class="dot" style="top:-4px;right:-4px">' + n + "</span>" : "") + "</button></div></div>";
  }
  function vFeed() {
    var up = S.rides.filter(function (r) { return !ended(r) && (S.filter === "all" || r.type === S.filter); });
    var past = S.rides.filter(function (r) { return ended(r) && going(r); }).reverse();
    var mine = S.rides.filter(function (r) { return !ended(r) && going(r); }).length;
    var html = topbar(brand()) + '<div class="pad"><h1 class="t">Ahoj ' + esc(S.me.display_name ? S.me.display_name.split(" ")[0] : S.me.ig_username) + ', <span>ideme?</span></h1><p class="sub">' + up.length + " " + (up.length === 1 ? "jazda" : up.length > 1 && up.length < 5 ? "jazdy" : "jázd") + (S.loc ? " v okolí" : " od partie") + " · ty ideš na " + mine + "</p>" +
      '<div class="hero"><svg class="deco" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6"><circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M15 6h2l1.5 11M5.5 17 9 9h7M9 9l3.5 8H18.5"/></svg><b>Ideš jazdiť?</b><p>Daj vedieť partii. Kto má čas, pridá sa.</p><div style="display:flex;gap:8px;flex-wrap:wrap">' +
      (S.tpl.length ? '<button class="btn sm" data-act="repeat" data-i="0">' + sz(IC.repeat, 15) + "Zopakovať „" + esc(S.tpl[0].title.slice(0, 22)) + "“</button>" : "") + '<button class="btn sm" ' + (S.tpl.length ? 'style="background:rgba(255,255,255,.16);color:#fff"' : "") + ' data-act="create">Nová jazda</button></div></div>' +
      (pushPrompt() ? '<div class="pushcard"><span class="pi">🔔</span><div class="grow"><b>Zapni si upozornenia</b><small>' + (iosTab() ? "Pridaj si EB Ride na plochu a dáme ti vedieť, keď ti niekto pošle žiadosť alebo ťa zavolá na jazdu." : "Keď ti niekto pošle žiadosť o priateľstvo, prijme ju alebo ťa zavolá na jazdu, príde ti správa rovno do mobilu.") + '</small><div class="fresh-acts">' + (iosTab() ? '<button class="btn sm" data-act="install">Pridať na plochu</button>' : '<button class="btn sm" data-act="push-on">Zapnúť</button>') + '<button class="btn sm gh" data-act="push-hide">Teraz nie</button></div></div></div>' : "") +
      '<div class="filters">' + [["all", "Všetko"]].concat(Object.keys(TYPES).map(function (k) { return [k, TYPES[k][0]]; })).map(function (f) { return '<button data-act="filter" data-f="' + f[0] + '" class="' + (S.filter === f[0] ? "on" : "") + '">' + (f[0] !== "all" ? IC[TYPES[f[0]][1]] : "") + f[1] + "</button>"; }).join("") + "</div>";
    if (!up.length) html += '<div class="empty-state"><i>🚵</i><b>' + (S.fr.friends.length || S.loc ? "Zatiaľ nikto nič neplánuje" : "Pridaj si partiu") + "</b>" +
      (S.loc ? "V okolí " + esc(S.loc.label || "") + " zatiaľ nie je žiadna jazda. Založ prvú verejnú, uvidia ju bikeri do " + RADIUS + " km." : S.fr.friends.length ? "Buď prvý a daj vedieť, kedy ideš." : "Nájdi kamošov podľa mena alebo im pošli pozvánku.") +
      '<br><br><button class="btn sm" data-act="' + (S.fr.friends.length || S.loc ? "create" : "tab") + '" data-t="friends">' + (S.fr.friends.length || S.loc ? "Vytvoriť jazdu" : "Nájsť kamošov") + "</button></div>";
    var last = null;
    up.forEach(function (r) { var l = dLabel(r.starts_at); if (l !== last) { html += '<div class="dayh">' + l + "</div>"; last = l; } html += rideCard(r); });
    if (past.length) html += '<div class="dayh">Po jazde</div>' + past.map(pastCard).join("");
    return html + "</div>";
  }
  function vFriends() {
    var html = topbar('<h1 class="t">Moja <span>partia</span></h1>') + '<div class="pad">' +
      '<div class="search" style="margin-top:0">' + IC.search + '<input id="q" placeholder="Meno, Instagram alebo Facebook (aspoň 3 písmená)" value="' + esc(S.q) + '" autocomplete="off" autocapitalize="off"></div><div id="qres">' + qResults() + "</div>" +
      '<div class="invite"><div style="flex:1"><b>Pozvi kamoša</b><small>Pošli mu odkaz. Po registrácii budete hneď priatelia.</small></div><button class="btn sm" data-act="invite-link">Pozvať</button></div>';
    if (S.fr.incoming.length) html += '<div class="sec-h"><b>Žiadosti</b><small>' + S.fr.incoming.length + '</small></div><div class="card" style="padding:4px 16px">' + S.fr.incoming.map(function (id) {
      return '<div class="row prow" data-act="person" data-u="' + id + '">' + pic(id) + '<div class="grow"><b>' + hn(id) + "</b><small>" + esc([contactLine(id), prof(id).city].filter(Boolean).join(" · ")) + "</small>" + bikeLine(id) + '</div><button class="btn sm gh" data-act="decline" data-u="' + id + '">✕</button><button class="btn sm" data-act="accept" data-u="' + id + '">Prijať</button></div>'; }).join("") + "</div>";
    html += '<div class="sec-h"><b>Priatelia</b><small>' + S.fr.friends.length + "</small></div>";
    if (!S.fr.friends.length) html += '<div class="empty-state"><i>🤝</i><b>Zatiaľ nikoho nemáš</b>Vyhľadaj kamošov hore podľa mena, alebo im pošli pozvánku.</div>';
    else html += '<div class="card" style="padding:4px 16px">' + S.fr.friends.slice().sort(function (a, b) { return hname(a) < hname(b) ? -1 : 1; }).map(function (id) {
      var next = S.rides.filter(function (r) { return r.host === id && !ended(r); })[0], p = prof(id);
      return '<div class="row prow" data-act="person" data-u="' + id + '">' + pic(id) + '<div class="grow"><b>' + hn(id) + "</b><small>" + (next ? '<span class="live">jazdí ' + dShort(next.starts_at).toLowerCase() + " " + hm(next.starts_at) + "</span>" : esc([contactLine(id), p.city].filter(Boolean).join(" · "))) + "</small>" + bikeLine(id) + "</div>" +
        (next ? '<button class="btn sm gh" data-act="open" data-id="' + next.id + '">Jazda</button>' : "") + contactBtns(id) + "</div>"; }).join("") + "</div>";
    if (S.fr.outgoing.length) html += '<div class="sec-h"><b>Čakajú na potvrdenie</b><small>' + S.fr.outgoing.length + '</small></div><div class="card" style="padding:4px 16px">' + S.fr.outgoing.map(function (id) {
      return '<div class="row prow" style="opacity:.7" data-act="person" data-u="' + id + '">' + pic(id) + '<div class="grow"><b>' + hn(id) + '</b><small>žiadosť odoslaná</small></div><button class="btn sm gh" data-act="unfriend" data-u="' + id + '">Zrušiť</button></div>'; }).join("") + "</div>";
    return html + "</div>";
  }
  function qResults() {
    if (!S.qres) return "";
    if (!S.qres.length) return '<p class="info" style="text-align:left">Nikoho takého sme nenašli. Pošli mu pozvánku nižšie.</p>';
    return '<div class="card" style="padding:4px 16px;margin-top:10px">' + S.qres.map(function (p) {
      S.P[p.id] = S.P[p.id] || p;
      var st = isFriend(p.id) ? '<span class="chip lb">Priateľ</span>' : S.fr.outgoing.indexOf(p.id) > -1 ? '<span class="chip">Odoslané</span>' : S.fr.incoming.indexOf(p.id) > -1 ? '<button class="btn sm" data-act="accept" data-u="' + p.id + '">Prijať</button>' : '<button class="btn sm" data-act="addfriend" data-u="' + p.id + '">Pridať</button>';
      return '<div class="row prow" data-act="person" data-u="' + p.id + '">' + pic(p.id) + '<div class="grow"><b>' + hn(p.id) + "</b><small>" + esc([contactLine(p.id), p.city].filter(Boolean).join(" · ")) + "</small></div>" + st + "</div>"; }).join("") + "</div>";
  }
  function memberNo() { return String(S.uid || "").replace(/-/g, "").slice(0, 8).toUpperCase(); }
  // EliteBiker Klub ešte nie je spustený – zatiaľ len ukážka, čo príde
  function vClub() {
    var u = C.ESHOP_URL || "https://www.elitebiker.sk/";
    return topbar('<h1 class="t">EliteBiker <span>Klub</span></h1>') + '<div class="pad">' +
      '<div class="soonbox"><span class="soonchip">Pripravujeme</span><div class="soonic">🏆</div><h2>EliteBiker Klub spúšťame čoskoro</h2>' +
      "<p>Za spoločné jazdy a fotky budeš zbierať body a meniť ich za odmeny v EliteBikeri: kontrolu bicykla, servis a zľavy v e-shope.</p>" +
      '<div class="soonlist"><span>🚴 body za jazdy</span><span>🔧 servis a kontrola</span><span>🏷️ zľavy pre členov</span></div>' +
      '<p class="small-note" style="margin:12px 0 0">Keď Klub spustíme, dáme ti vedieť.</p></div>' +
      '<div class="shop"><span style="font-size:26px">🛒</span><div class="grow"><b>E-shop elitebiker.sk</b><small>Bicykle, diely a výbava.</small></div><a class="btn sm" href="' + esc(u) + '" target="_blank" rel="noopener">Otvoriť →</a></div>' +
      '<div class="sec-h"><b>Servis</b></div><div class="card"><div class="kc"><span class="ic">🔧</span><div class="grow"><b>Bicykel do formy</b><small>Kontrola alebo servis v EliteBikeri.</small><a class="btn sm" style="text-decoration:none" href="' + esc(u) + 'servis-bicyklov-2/" target="_blank" rel="noopener">Objednať servis →</a></div></div></div>' +
      '<div class="sos"><span style="font-size:24px">🛟</span><div><b>Defekt alebo porucha na trase?</b><small>Zavolaj nám: +421 919 125 174</small></div><a class="btn sm" href="tel:+421919125174">Volať</a></div></div>';
  }
  function vProfile() {
    var u = S.me;
    var html = topbar('<h1 class="t">Môj <span>profil</span></h1>') + '<div class="pad"><div class="prof"><label style="cursor:pointer;display:inline-block" title="Zmeniť fotku">' + pic(S.uid, "lg") + '<input type="file" accept="image/*" data-up="avatar" hidden></label>' +
      "<h2>" + esc(u.display_name || "") + '</h2><p class="sub">' + esc([u.age ? u.age + " r." : "", u.city].filter(Boolean).join(" · ")) + "</p>" +
      '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px"><button class="btn sm gh" data-act="edit">Upraviť profil</button>' +
      (igUrl(S.uid) ? '<a class="btn sm gh" href="' + esc(igUrl(S.uid)) + '" target="_blank" rel="noopener">' + sz(IC.ig, 14) + "@" + esc(u.ig_username) + "</a>" : "") +
      (fbUrl(S.uid) ? '<a class="btn sm gh" href="' + esc(fbUrl(S.uid)) + '" target="_blank" rel="noopener">' + sz(IC.fb, 14) + esc(fbLabel(S.uid)) + "</a>" : "") +
      (S.phone ? '<span class="btn sm gh nolink" title="Vidia ho len spolujazdci">' + sz(IC.phone, 14) + esc(fmtPhone(S.phone)) + "</span>" : "") + "</div></div>";
    if (S.editing) html += '<form class="card" id="editForm" style="margin-top:14px"><span class="fl" style="margin-top:0">Meno a priezvisko</span><input class="inp" id="e-name" required maxlength="60" value="' + esc(u.display_name || "") + '">' +
      '<div class="two"><div><span class="fl">Vek</span><input class="inp" id="e-age" type="number" min="14" max="99" required value="' + esc(u.age || "") + '"></div><div><span class="fl">Odkiaľ si</span><input class="inp" id="e-city" maxlength="60" placeholder="mesto alebo obec" value="' + esc(u.city || "") + '"></div></div>' +
      '<p class="small-note" style="margin:6px 0 0">🔒 Vek a mesto vidia len tvoji priatelia.</p>' +
      contactFields("e", u) + phoneField("e") +
      '<span class="fl">Na čom jazdíš?</span><div class="opts" id="e-types">' + Object.keys(TYPES).map(function (k) { return '<button type="button" data-act="toggle-on" data-v="' + k + '" class="' + ((u.bike_types || []).indexOf(k) > -1 ? "on" : "") + '">' + IC[TYPES[k][1]] + TYPES[k][0] + "</button>"; }).join("") + "</div>" +
      '<div style="display:flex;gap:8px;margin-top:16px"><button class="btn gh" type="button" data-act="edit">Zrušiť</button><button class="btn" style="flex:1" type="submit">Uložiť</button></div></form>';
    html += vMyBikes();
    html += vNotifCard();
    html += '<div class="sec-h"><b>Moje skratky</b><small>komu posielam jazdy</small></div>' + (S.sc.length ? '<div class="card" style="padding:4px 16px">' + S.sc.map(function (s) {
      return '<div class="row"><span style="font-size:22px;width:38px;text-align:center">' + esc(s.emoji) + '</span><div class="grow"><b>' + esc(s.name) + "</b><small>" + s.members.map(function (m) { return esc(hname(m)); }).join(", ") + '</small></div><button class="btn sm gh" data-act="del-sc" data-id="' + s.id + '">Zmazať</button></div>'; }).join("") + "</div>" : '<p class="info" style="text-align:left">Skratku si vytvoríš pri posielaní jazdy. Vyber kamošov a daj „Nová skratka“.</p>') +
      '<div class="shop"><span style="font-size:24px">🛒</span><div class="grow"><b>E-shop elitebiker.sk</b><small>Bicykle, diely, výbava a servis</small></div><a class="btn sm" href="' + esc(C.ESHOP_URL) + '" target="_blank" rel="noopener">Otvoriť →</a></div>' +
      '<div class="card" style="padding:4px 16px;margin-top:14px"><div class="kv"><span>Ochrana súkromia</span><b><a class="link-plain" href="privacy.html" target="_blank">Prečítať</a></b></div><div class="kv"><span>Heslo</span><b><button class="link-plain" data-act="pw">' + (api.hasPassword() ? "Zmeniť" : "Nastaviť") + '</button></b></div><div class="kv"><span>Účet' + (api.email && api.email() ? ' <small class="em">' + esc(api.email()) + "</small>" : "") + '</span><b><button class="link-plain" data-act="logout">Odhlásiť sa</button></b></div><div class="kv"><span>Zmazať účet a všetky údaje</span><b><button class="link-plain danger" data-act="delete-acc">Zmazať</button></b></div></div>' +
      (S.admin ? '<a class="admlink" href="admin.html">' + sz(IC.lock, 18) + '<span class="grow"><b>Administrácia</b><small>používatelia a návštevnosť</small></span>→</a>' : "") +
      '<p class="small-note">🔒 Spojenie je šifrované (HTTPS), heslo je uložené len ako bezpečný odtlačok a tvoje údaje vidia len ľudia, s ktorými jazdíš.</p>' +
      (api.mode === "demo" ? '<p class="small-note">Skúšobný režim, údaje sú len v tomto prehliadači.</p>' : "") + "</div>";
    return html;
  }

  // profil iného jazdca – priateľ vidí všetko, čo vyplnil; ostatní len meno, fotku, kontakt a bicykle
  function vPerson(id) {
    var p = prof(id), fr = isFriend(id), bikes = bikesOf(id), types = (p.bike_types || []).filter(function (k) { return TYPES[k]; });
    var info = [p.age ? p.age + " r." : "", p.city].filter(Boolean).join(" · ");
    var since = p.created_at ? new Date(p.created_at).toLocaleDateString("sk-SK", { month: "long", year: "numeric" }) : "";
    var next = S.rides.filter(function (r) { return r.host === id && !ended(r); })[0];
    var rel = fr ? '<span class="chip lb">🤝 V tvojej partii</span>' : S.fr.incoming.indexOf(id) > -1 ? '<button class="btn sm" data-act="accept" data-u="' + id + '">Prijať žiadosť</button>' :
      S.fr.outgoing.indexOf(id) > -1 ? '<span class="chip">Žiadosť odoslaná</span>' : '<button class="btn sm" data-act="addfriend" data-u="' + id + '">' + sz(IC.plus, 14) + "Pridať do partie</button>";
    return '<div class="sh-top"><button class="icb" data-act="closem" aria-label="Zavrieť">' + IC.close + "</button><b>Profil jazdca</b></div><div class=\"pad\">" +
      '<div class="prof">' + pic(id, "lg") + "<h2>" + esc(hname(id)) + "</h2>" + (info ? '<p class="sub">' + esc(info) + "</p>" : "") +
      '<div class="pacts">' + rel +
      (igUrl(id) ? '<a class="btn sm gh" href="' + esc(igUrl(id)) + '" target="_blank" rel="noopener">' + sz(IC.ig, 14) + "@" + esc(p.ig_username) + "</a>" : "") +
      (fbUrl(id) ? '<a class="btn sm gh" href="' + esc(fbUrl(id)) + '" target="_blank" rel="noopener">' + sz(IC.fb, 14) + esc(fbLabel(id)) + "</a>" : "") + "</div></div>" +
      (!fr ? '<p class="info">🔒 Vek a mesto uvidíš, keď budete v partii.</p>' : "") +
      (types.length ? '<div class="sec-h"><b>Na čom jazdí</b></div><div class="ptypes">' + types.map(function (k) { return "<span>" + IC[TYPES[k][1]] + TYPES[k][0] + "</span>"; }).join("") + "</div>" : "") +
      (bikes.length ? '<div class="sec-h"><b>Bicykle</b><small>' + bikes.length + '</small></div><div class="card" style="padding:4px 16px">' + bikes.map(function (b) {
        return '<div class="row"><span class="bkimg">' + bikeThumb(b) + '</span><div class="grow"><b class="wrap2">' + esc(b.name) + "</b><small>" + (b.url ? '<a class="link-plain" href="' + esc(b.url) + '" target="_blank" rel="noopener">pozrieť na elitebiker.sk ↗</a>' : "vlastný bicykel") + "</small></div></div>"; }).join("") + "</div>" : "") +
      (next ? '<div class="sec-h"><b>Najbližšia jazda</b></div><button type="button" class="field set" data-act="person-ride" data-id="' + next.id + '"><span class="ic">' + IC[(TYPES[next.type] || TYPES.mtb)[1]] + '</span><div class="grow"><b>' + esc(next.title) + "</b><small>" + esc(whenText(next)) + "</small></div></button>" : "") +
      (since ? '<p class="small-note" style="text-align:center;margin-top:18px">V EliteBiker Ride od: ' + esc(since) + "</p>" : "") + "</div>";
  }

  function modalAfterFriend() { var m = $("modal"); if (!m.classList.contains("open")) return; if (S.person && m.querySelector(".pacts")) openModal(vPerson(S.person)); else openModal(vNotif()); }
  function vMyBikes() {
    var my = bikesOf(S.uid), add = '<span class="icb" style="width:38px;height:38px;background:var(--lb);border-color:var(--lbl);color:var(--b)">' + sz(IC.plus, 18) + "</span>";
    return '<div class="sec-h"><b>Moje bicykle</b><small>' + (my.length ? my.length + " z 5" : "uvidia ich kamoši") + '</small></div><div class="card" style="padding:4px 16px">' +
      my.map(function (b) { return '<div class="row"><span class="bkimg">' + bikeThumb(b) + '</span><div class="grow"><b class="wrap2">' + esc(b.name) + "</b><small>" + (b.url ? '<a class="link-plain" href="' + esc(b.url) + '" target="_blank" rel="noopener">z ponuky elitebiker.sk ↗</a>' : "vlastný bicykel") + '</small></div><button class="btn sm gh" data-act="bike-del" data-id="' + b.id + '" aria-label="Odstrániť bicykel">✕</button></div>'; }).join("") +
      (my.length < 5 ? '<button type="button" class="row rowbtn" data-act="bike-new">' + add + '<span class="grow"><b style="color:var(--b)">Pridať bicykel</b><small>z ponuky elitebiker.sk alebo vlastný</small></span></button>' : "") + "</div>";
  }
  var BK = { q: "", cat: null, eb: false };
  function vBike() {
    return '<div class="sh-top"><button class="icb" data-act="closem" aria-label="Zavrieť">' + IC.close + '</button><b>Pridať bicykel</b></div><div class="pad">' +
      '<div class="search" style="margin-top:0">' + IC.search + '<input id="bq" placeholder="Hľadaj v ponuke, napr. Marin Rift Zone" autocomplete="off" autocapitalize="off" value="' + esc(BK.q) + '"></div>' +
      '<div id="bres">' + bikeResults() + "</div>" +
      '<div class="sec-h"><b>Nie je v ponuke?</b><small>napíš ho sám</small></div>' +
      '<form id="bikeOwn" class="bkown" novalidate><input class="inp" id="bname" maxlength="80" autocomplete="off" placeholder="napr. Specialized Stumpjumper 2022"><button class="btn" type="submit">Pridať</button></form>' +
      '<p class="info">Bicykel uvidia tvoji kamoši a tí, s ktorými ideš na jazdu.</p></div>';
  }
  function bikeResults() {
    if (!BK.cat) return '<div class="loading">Načítavam ponuku elitebiker.sk…</div>';
    if (!BK.cat.length) return '<p class="info" style="text-align:left">Ponuku sa teraz nepodarilo načítať. Napíš názov bicykla nižšie.</p>';
    var words = nrm(BK.q).split(/\s+/).filter(Boolean), nEb = BK.cat.filter(function (b) { return b.ebike; }).length;
    var ebChip = nEb ? '<button type="button" data-act="bike-eb" class="ebchip' + (BK.eb ? " on" : "") + '">⚡ Elektrobicykle <small class="cnt">' + nEb + "</small>" + (BK.eb ? " ✕" : "") + "</button>" : "";
    if (!words.length && !BK.eb) {
      var cnt = {}; BK.cat.forEach(function (b) { if (b.brand) cnt[b.brand] = (cnt[b.brand] || 0) + 1; });
      var brands = Object.keys(cnt).filter(function (b) { return cnt[b] >= 3; }).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 8);
      return '<p class="small-note" style="margin:12px 0 8px">' + BK.cat.length + " bicyklov v ponuke elitebiker.sk. Vyber značku alebo napíš model.</p>" +
        '<div class="opts">' + ebChip + brands.map(function (b) { return '<button type="button" data-act="bike-brand" data-v="' + esc(b) + '">' + esc(b) + ' <small class="cnt">' + cnt[b] + "</small></button>"; }).join("") + "</div>";
    }
    var hits = BK.cat.filter(function (b) { var n = b._n || (b._n = nrm(b.name)); return (!BK.eb || b.ebike) && words.every(function (w) { return n.indexOf(w) > -1; }); });
    var head = BK.eb ? '<div class="opts" style="margin-top:10px">' + ebChip + "</div>" : "";
    if (!hits.length) return head + '<p class="info" style="text-align:left">V ponuke sme „' + esc(BK.q) + "“ nenašli. Pridaj ho nižšie vlastným názvom.</p>";
    return head + '<div class="card" style="padding:2px 12px;margin-top:10px">' + hits.slice(0, 40).map(function (b) {
      return '<button type="button" class="row rowbtn" data-act="bike-add" data-c="' + b.id + '"><span class="bkimg">' + bikeThumb(b) + '</span><span class="grow"><b class="wrap2">' + esc(b.name) + "</b><small>" + esc(b.brand || "") + (b.ebike ? " · ⚡ elektrobicykel" : "") + '</small></span><span class="chip lb">Pridať</span></button>'; }).join("") + "</div>" +
      (hits.length > 40 ? '<p class="small-note">Zobrazujem 40 z ' + hits.length + ", spresni hľadanie.</p>" : "");
  }
  function openBike() {
    BK.q = ""; BK.eb = false; openModal(vBike());
    var q = $("bq"), f = $("bikeOwn");
    q.oninput = function () { BK.q = q.value; var el = $("bres"); if (el) el.innerHTML = bikeResults(); };
    f.onsubmit = function (e) {
      e.preventDefault();
      var n = ($("bname").value || "").trim() || BK.q.trim(), b = f.querySelector("button");
      if (n.length < 2) { toast("Napíš názov bicykla."); $("bname").focus(); return; }
      spin(b); addBike({ name: n }).catch(function () { unspin(b); });
    };
    if (window.innerWidth > 700) q.focus();
    if (!BK.cat) api.catalog().then(function (c) { BK.cat = c || []; }, function () { BK.cat = []; }).then(function () { var el = $("bres"); if (el) el.innerHTML = bikeResults(); });
  }
  function addBike(b) {
    return api.addBike(b).then(function (x) { (S.B[S.uid] = S.B[S.uid] || []).push(x); closeModal(); render(true); toast("🚲 <b>" + esc(x.name) + "</b> je v tvojom profile."); }).catch(function (e) { err(e); throw e; });
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
    setTimeout(loadWeather, 0);
    if (keep) v.scrollTop = y;
    renderNav();
    var q = $("q");
    if (q) q.oninput = function () {
      S.q = q.value; clearTimeout(q._t);
      q._t = setTimeout(function () {
        if (S.q.replace(/^@/, "").trim().length < 3) { S.qres = null; $("qres").innerHTML = ""; return; }
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
      if (!(patch.age >= 14 && patch.age <= 99)) { toast("Vek musí byť od 14 do 99 rokov."); return; }
      var bad = checkContacts(patch.ig_username, patch.fb_name); if (bad) { toast(bad); return; }
      if (normPhone($("e-tel").value) === null) { toast("Telefónne číslo nevyzerá správne. Napíš ho napríklad 0905 123 456."); $("e-tel").focus(); return; }
      api.updateProfile(patch).then(function (p) { S.me = p; S.P[S.uid] = p; return savePhone("e"); }).then(function (ok) { if (!ok) return; S.editing = false; render(true); toast("Profil uložený."); autoLocation(S.me.city); }).catch(err);
    };
    if (S.tab === "club" && !S.pts && !S.ptsLoading) { S.ptsLoading = true; api.points().then(function (s) { S.pts = s || { joined: 0, hosted: 0, photos: 0, bonus: 0, spent: 0, earned: 0, balance: 0, history: [] }; S.ptsLoading = false; if (S.tab === "club") render(true); }).catch(function (e) { S.ptsLoading = false; err(e); }); }
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
    var r = find(id); if (!r) { toast("Túto jazdu nevidíš, asi ťa na ňu nikto nepozval."); return; }
    if (S.unsubChat) { S.unsubChat(); S.unsubChat = null; }
    if (dmap) { dmap.remove(); dmap = null; }
    S.openId = id; closeModal();
    var ty = TYPES[r.type];
    openSheet("ride", '<div class="sh-top"><button class="icb" data-act="close" aria-label="Späť">' + IC.back + '</button><b>Detail jazdy</b>' + (canInvite(r) ? '<button class="icb" data-act="share-ride" data-id="' + r.id + '" aria-label="Zdieľať">' + IC.share + "</button>" : '<span style="width:40px"></span>') + "</div>" +
      '<div class="pad"><div class="lmap" id="dmap"></div>' +
      '<div class="navi"><a class="btn sm gh" href="https://www.google.com/maps/dir/?api=1&destination=' + r.meet.lat + "," + r.meet.lng + '" target="_blank" rel="noopener">' + sz(IC.nav, 14) + 'Google Mapy</a><a class="btn sm gh" href="https://waze.com/ul?ll=' + r.meet.lat + "," + r.meet.lng + '&navigate=yes" target="_blank" rel="noopener">' + sz(IC.nav, 14) + "Waze</a></div>" +
      '<div style="margin-top:14px" class="meta"><span class="chip b">' + IC[ty[1]] + ty[0] + "</span>" + visChip(r) + "</div>" +
      '<h1 class="t" style="margin-top:10px;font-size:21px">' + esc(r.title) + '</h1><p class="sub when">' + esc(whenText(r)) + "</p>" +
      (ended(r) ? "" : '<div class="dbtns"><button class="calbtn" data-act="cal" data-id="' + r.id + '">' + sz(IC.cal, 16) + "Pridať do kalendára</button>" +
        (r.host === S.uid ? '<button class="calbtn" data-act="edit-ride" data-id="' + r.id + '">' + sz(IC.pen, 15) + "Upraviť jazdu</button>" : "") + "</div>") +
      '<div class="field set" style="margin-top:10px;cursor:default"><span class="ic">' + IC.pin + '</span><div class="grow"><b>Stretko</b><small>' + esc(r.meet.label) + "</small></div></div>" +
      statGrid(r) +
      (r.note ? '<div class="note">' + esc(r.note) + "</div>" : "") +
      (r.link_url ? '<a class="linkout" href="' + esc(r.link_url) + '" target="_blank" rel="noopener nofollow">' + sz(IC.link, 16) + '<span class="grow"><b>Trasa / info o akcii</b><small>' + esc(r.link_url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]) + "</small></span>" + sz(IC.back, 14).replace("<svg", '<svg style="transform:rotate(180deg)"') + "</a>" : "") +
      '<div id="dWx"></div><div id="dPhotos"></div><div id="dPeople"></div><div id="dChat"></div></div><div class="sticky-act" id="dActs"></div>');
    updateDetail();
    setTimeout(function () { if (S.openId === id && window.EBMap) dmap = EBMap.showRide($("dmap"), r); }, 60);
    loadPhotos(id);
    if (going(r) && !ended(r)) {
      api.messages(id).then(function (m) { S.chat[id] = m; renderChat(); }).catch(err);
      S.unsubChat = api.subscribeMessages(id, function (m) { var arr = S.chat[id] = S.chat[id] || []; if (!arr.some(function (x) { return x.id && x.id === m.id; })) arr.push(m); renderChat(true); });
    }
  }
  function visChip(r) {
    var v = VIS[vis(r)], d = vis(r) === "public" && r.host !== S.uid ? kmFrom(r) : null;
    var t = '<span class="chip' + (vis(r) === "public" ? " pub" : "") + '">' + v[0] + " " + v[1] + (d != null ? " · " + (d < 1 ? "pri tebe" : Math.round(d) + " km od teba") : "") + "</span>";
    return r.host === S.uid && !ended(r) ? '<button class="chip vbtn" data-act="vis" data-id="' + r.id + '">' + v[0] + " " + v[1] + " <u>zmeniť</u></button>" : t;
  }
  function vVis(r) {
    return '<div class="sh-top"><button class="icb" data-act="closem" aria-label="Zavrieť">' + IC.close + '</button><b>Kto jazdu uvidí?</b></div><div class="pad">' +
      '<div class="vis">' + Object.keys(VIS).map(function (k) { return '<button data-act="vis-set" data-id="' + r.id + '" data-v="' + k + '" class="' + (vis(r) === k ? "on" : "") + '"><i>' + VIS[k][0] + "</i><span><b>" + VIS[k][1] + "</b><small>" + VIS[k][2] + "</small></span></button>"; }).join("") + "</div>" +
      '<p class="info">Kto už ide alebo je pozvaný, jazdu uvidí aj po zmene.</p></div>';
  }
  function updateDetail() {
    var r = find(S.openId); if (!r || !$("dPeople")) return;
    var pend = r.audience.filter(function (u) { return r.participants.indexOf(u) < 0; });
    var canInv = canInvite(r);
    $("dCount") && ($("dCount").textContent = r.participants.length + (r.max_people ? "/" + r.max_people : ""));
    $("dPeople").innerHTML = (S.fresh === r.id && canInv ? '<div class="fresh"><span class="fi">✅</span><div class="grow"><b>Jazda je uložená</b><small>Pošli odkaz aj kamošom bez appky a pridaj si ju do kalendára.</small><div class="fresh-acts"><button class="btn sm" data-act="ride-link" data-id="' + r.id + '">' + sz(IC.link, 14) + 'Poslať odkaz</button><button class="btn sm gh" data-act="cal" data-id="' + r.id + '">' + sz(IC.cal, 14) + "Do kalendára</button></div></div></div>" : "") +
      '<div class="sec-h"><b>Kto ide</b><small>' + r.participants.length + (pend.length && r.host === S.uid ? " · " + pend.length + " pozvaní" : "") + '</small></div><div class="card" style="padding:4px 16px">' +
      r.participants.map(function (id) { return '<div class="row prow" data-act="person" data-u="' + id + '">' + pic(id) + '<div class="grow"><b>' + (id === S.uid ? "ty" + age(id) : hn(id)) + (id === r.host ? ' <span class="chip lb" style="padding:1px 8px;font-size:10.5px">organizuje</span>' : "") + "</b><small>" + esc(contactLine(id)) + "</small>" + bikeLine(id) + "</div>" + (id !== S.uid ? callBtn(r.id, id) + contactBtns(id) : "") + "</div>"; }).join("") +
      (r.host === S.uid ? pend.map(function (id) { return '<div class="row" style="opacity:.6">' + pic(id) + '<div class="grow"><b>' + hn(id) + "</b><small>pozvaný · zatiaľ sa nepridal</small></div></div>"; }).join("") : "") +
      (canInv ? '<div class="row" style="cursor:pointer" data-act="invmodal" data-id="' + r.id + '"><span class="icb" style="width:38px;height:38px;background:var(--lb);border-color:var(--lbl);color:var(--b)">' + sz(IC.plus, 18) + '</span><div class="grow"><b style="color:var(--b)">Pozvať kamošov</b><small>z tvojej partie</small></div></div>' +
        '<div class="row" style="cursor:pointer" data-act="ride-link" data-id="' + r.id + '"><span class="icb" style="width:38px;height:38px;background:var(--lb);border-color:var(--lbl);color:var(--b)">' + sz(IC.link, 18) + '</span><div class="grow"><b style="color:var(--b)">Pozvať odkazom</b><small>aj tých, čo ešte nemajú appku</small></div></div>' : "") + "</div>";
    renderChat();
    $("dActs").innerHTML = ended(r) ? (going(r) ? '<button class="btn full igb" data-act="story" data-id="' + r.id + '">' + sz(IC.share, 18) + "Zdieľať jazdu s EliteBiker dizajnom</button>" : "") : r.host === S.uid ? '<button class="btn gh" style="flex:0 0 auto" data-act="cancel" data-id="' + r.id + '">Zrušiť jazdu</button>' + (canInv ? '<button class="btn full" data-act="invmodal" data-id="' + r.id + '">' + sz(IC.send, 16) + "Pozvať kamošov</button>" : "")
      : going(r) ? '<button class="btn full in" data-act="join" data-id="' + r.id + '">' + IC.check + "Ideš · odhlásiť sa</button>" : isFull(r) ? '<button class="btn full" disabled>Jazda je plná (' + r.participants.length + "/" + r.max_people + ")</button>" : '<button class="btn full" data-act="join" data-id="' + r.id + '">Pridám sa k jazde</button>';
    if (!ended(r) && !going(r) && stranger(r) && !isFull(r)) $("dPeople").insertAdjacentHTML("beforeend", '<p class="pubnote">🌍 Verejná jazda. Keď sa pridáš, uvidíte navzájom svoje meno, vek, kontakt a telefón a odomkne sa ti chat.</p>');
    if (!ended(r) && going(r) && !S.phone && r.participants.length > 1) $("dPeople").insertAdjacentHTML("beforeend", '<button class="phnudge" data-act="add-phone">' + sz(IC.phone, 18) + '<span class="grow"><b>Pridaj si telefón</b><small>Spolujazdci ti zavolajú, keď ťa budú čakať na stretku. Uvidia ho len oni.</small></span></button>');
    loadPhones(r);
    renderPhotos();
    renderWx();
  }
  // telefóny spolujazdcov: server ich dá len účastníkovi jazdy, kým jazda neskončí
  function loadPhones(r) {
    S.phones = S.phones || {}; S.phonesKey = S.phonesKey || {};
    if (!going(r) || ended(r)) { S.phones[r.id] = {}; return; }
    var key = r.participants.slice().sort().join(",");
    if (S.phonesKey[r.id] === key) return;
    S.phonesKey[r.id] = key;
    api.ridePhones(r.id).then(function (m) { S.phones[r.id] = m || {}; if (S.openId === r.id) updateDetail(); }).catch(function () { S.phonesKey[r.id] = null; });
  }
  function callBtn(rid, uid) {
    var p = S.phones && S.phones[rid] && S.phones[rid][uid];
    return p ? '<a class="btn sm gh call" href="tel:' + esc(p) + '" aria-label="Zavolať ' + esc(hname(uid)) + '" title="Zavolať ' + esc(fmtPhone(p)) + '">' + sz(IC.phone, 14) + "</a>" : "";
  }
  function renderChat(scroll) {
    var r = find(S.openId), el = $("dChat"); if (!r || !el) return;
    var h = '<div class="sec-h"><b>Chat jazdy</b><small>' + (ended(r) ? "zmazaný" : going(r) ? "vidia len účastníci" : "🔒 len pre účastníkov") + "</small></div>";
    if (ended(r)) { el.innerHTML = h + '<div class="lockbox">🧹<div><b>Chat sa zmazal po skončení jazdy</b><small>Jazdu môžeš zdieľať s EliteBiker dizajnom.</small></div></div>'; return; }
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
  // údaje jazdy: ukážeme len to, čo organizátor vyplnil
  function statGrid(r) {
    var c = [];
    if (r.distance_km) c.push("<b>" + km(r.distance_km) + "</b><small>km</small>");
    if (r.elevation_m) c.push("<b>" + r.elevation_m + "</b><small>m stúpania</small>");
    if (paceOf(r)) c.push("<b>" + paceOf(r) + "</b><small>tempo</small>");
    else if (trailsOf(r).length) c.push("<b>" + tdots(trailsOf(r)) + "</b><small>" + (trailsOf(r).length === 1 ? TRAILS[trailsOf(r)[0]][0].toLowerCase() + " · " + TRAILS[trailsOf(r)[0]][1] : trailText(trailsOf(r))) + "</small>");
    c.push('<b id="dCount">' + r.participants.length + (r.max_people ? "/" + r.max_people : "") + "</b><small>" + (r.max_people ? "miest" : ludi(r.participants.length)) + "</small>");
    return '<div class="grid4" style="grid-template-columns:repeat(' + c.length + ',minmax(0,1fr))">' + c.map(function (x) { return "<div>" + x + "</div>"; }).join("") + "</div>";
  }
  function renderPhotos() {
    var r = find(S.openId), el = $("dPhotos"); if (!r || !el) return;
    el.innerHTML = ""; return;
    var ph = S.photos[r.id] || [], can = going(r);
    el.innerHTML = (canStory(r) && !ended(r) ? '<button class="storyrow" data-act="story" data-id="' + r.id + '">' + sz(IC.share, 20) + '<span class="grow"><b>Zdieľať jazdu</b><small>fotka s číslami, trasou a logom EliteBiker</small></span></button>' : "") + '<div class="sec-h"><b>Fotky z jazdy</b><small>' + (ph.length ? ph.length + " · vidia ich všetci pozvaní" : "zatiaľ žiadne") + '</small></div><div class="phg">' +
      (can ? '<label class="upt">' + sz(IC.plus, 22) + 'Pridať fotku<input type="file" accept="image/*" multiple data-up="photo" data-id="' + r.id + '"></label>' : "") +
      ph.map(function (p, i) { return '<div class="ph" data-act="viewph" data-i="' + i + '"><img class="real" src="' + esc(p.url) + '" alt="" loading="lazy"><span class="who">' + pic(p.user_id, "xs") + '<span style="overflow:hidden;text-overflow:ellipsis">' + (p.user_id === S.uid ? "ty" : esc(hname(p.user_id))) + "</span></span></div>"; }).join("") + "</div>" +
      (can && !ph.length ? '<p class="info" style="text-align:left;margin-top:8px">Pridaj fotku zo stretka, z výhľadu alebo z cieľa. Fotky ostávajú aj po jazde.</p>' : "");
  }
  function vPhoto(i) {
    var r = find(S.openId), p = (S.photos[r.id] || [])[i];
    return '<div class="sh-top"><button class="icb" data-act="closem">' + IC.close + '</button><b>Fotka z jazdy</b></div><div class="pad viewer"><img src="' + esc(p.url) + '" alt=""><div class="rh" style="margin-top:12px">' + pic(p.user_id) + '<div class="nm">' + (p.user_id === S.uid ? "ty" : hn(p.user_id)) + "<small>" + esc(r.title) + " · " + dLabel(r.starts_at) + "</small></div></div>" +
      '<button class="btn full igb" style="margin-top:16px" data-act="dsg-photo" data-i="' + i + '">' + sz(IC.share, 16) + "Zdieľať s EliteBiker dizajnom</button>" +
      '<div style="display:flex;gap:8px;margin-top:8px"><a class="btn gh" style="flex:1;text-decoration:none" href="' + esc(p.url) + '" download target="_blank" rel="noopener">Uložiť originál</a>' + (p.user_id === S.uid ? '<button class="btn gh" data-act="delph" data-i="' + i + '">Zmazať</button>' : "") + "</div>" +
      '<p class="info">Na fotku dáme čísla z jazdy, trasu a logo EliteBiker. Ako Príbeh, príspevok alebo nálepku.</p></div>';
  }

  /* ---------------- kalendár ---------------- */
  function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
  function utcStamp(d) { return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
  function calText(r) {
    var ty = TYPES[r.type] || TYPES.mtb, bits = [ty[0]]; if (rideStyle(r)) bits.push(rideStyle(r));
    if (r.distance_km) bits.push(km(r.distance_km) + " km");
    if (r.elevation_m) bits.push(r.elevation_m + " m stúpania");
    return bits.join(" · ") + (r.note ? "\n\n" + r.note : "") + (r.link_url ? "\n\n" + r.link_url : "") + "\n\nDetail jazdy a chat: " + shareUrl("#jazda-" + r.id);
  }
  function icsEsc(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  function icsFold(line) { var out = [], s = line; while (s.length > 70) { out.push(s.slice(0, 70)); s = " " + s.slice(70); } out.push(s); return out.join("\r\n"); }
  function buildIcs(r) {
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EliteBiker//EliteBiker Ride//SK", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
      "UID:jazda-" + r.id + "@elitebiker-ride", "DTSTAMP:" + utcStamp(new Date()), "DTSTART:" + utcStamp(r.starts_at), "DTEND:" + utcStamp(r.ends_at),
      "SUMMARY:" + icsEsc("🚴 " + r.title), "LOCATION:" + icsEsc(r.meet.label || ""), "GEO:" + r.meet.lat + ";" + r.meet.lng,
      "DESCRIPTION:" + icsEsc(calText(r)), "URL:" + shareUrl("#jazda-" + r.id),
      "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc("O hodinu jazda: " + r.title), "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"];
    return L.map(icsFold).join("\r\n") + "\r\n";
  }
  function gcalUrl(r) {
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("🚴 " + r.title) + "&dates=" + utcStamp(r.starts_at) + "/" + utcStamp(r.ends_at) +
      "&details=" + encodeURIComponent(calText(r)) + "&location=" + encodeURIComponent(r.meet.label || r.meet.lat + "," + r.meet.lng);
  }
  function outlookUrl(r) {
    return "https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=" + encodeURIComponent("🚴 " + r.title) +
      "&startdt=" + encodeURIComponent(new Date(r.starts_at).toISOString()) + "&enddt=" + encodeURIComponent(new Date(r.ends_at).toISOString()) +
      "&body=" + encodeURIComponent(calText(r)) + "&location=" + encodeURIComponent(r.meet.label || "");
  }
  function downloadIcs(r) {
    var ics = buildIcs(r);
    if (isIOS()) { location.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics); return; }
    var url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" })), a = document.createElement("a");
    a.href = url; a.download = "jazda-" + (r.title || "elitebiker").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + ".ics";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    toast("Súbor s jazdou sa stiahol. Otvor ho a pridá sa do kalendára.");
  }
  function openCal(id) {
    var r = find(id); if (!r) return;
    var ios = isIOS(), apple = '<button class="calopt" data-act="ics" data-id="' + r.id + '"><span class="ci apple">' + IC.cal + '</span><span class="grow"><b>' + (ios ? "Kalendár v iPhone" : "Apple, Outlook a iné") + "</b><small>" + (ios ? "pridá sa jedným ťuknutím" : "stiahne sa súbor .ics, otvor ho") + "</small></span></button>";
    var google = '<a class="calopt" href="' + esc(gcalUrl(r)) + '" target="_blank" rel="noopener"><span class="ci g">' + IC.cal + '</span><span class="grow"><b>Google Kalendár</b><small>' + (ios ? "ak používaš Google účet" : "Android aj počítač") + "</small></span></a>";
    var outlook = '<a class="calopt" href="' + esc(outlookUrl(r)) + '" target="_blank" rel="noopener"><span class="ci o">' + IC.cal + '</span><span class="grow"><b>Outlook.com</b><small>Hotmail, Outlook, Microsoft účet</small></span></a>';
    openModal('<div class="sh-top"><button class="icb" data-act="closem" aria-label="Zavrieť">' + IC.close + '</button><b>Pridať do kalendára</b></div><div class="pad">' +
      '<div class="rpill"><span class="ic">' + IC[(TYPES[r.type] || TYPES.mtb)[1]] + "</span><div><b>" + esc(r.title) + "</b><small>" + whenText(r) + "</small></div></div>" +
      '<div class="calopts">' + (ios ? apple + google : google + apple) + outlook + "</div>" +
      '<p class="info">V kalendári bude miesto stretka, odkaz na jazdu a pripomienka hodinu pred štartom.</p></div>');
  }
  function whenText(r) {
    var s = new Date(r.starts_at), e = new Date(r.ends_at), multi = day0(e) - day0(s) >= 864e5;
    return dLabel(r.starts_at) + " o " + hm(r.starts_at) + (multi ? " až " + dLabel(r.ends_at).toLowerCase() : ", približne do " + hm(r.ends_at));
  }

  /* ---------------- počasie (MET Norway cez server) ---------------- */
  var WX = {}, wxBusy = false, wxAsked = {};
  var WXL = { clearsky: "jasno", fair: "takmer jasno", partlycloudy: "polojasno", cloudy: "zamračené", fog: "hmla", lightrain: "slabý dážď", rain: "dážď", heavyrain: "silný dážď",
    lightrainshowers: "slabé prehánky", rainshowers: "prehánky", heavyrainshowers: "silné prehánky", lightsleet: "slabý dážď so snehom", sleet: "dážď so snehom", heavysleet: "silný dážď so snehom",
    lightsleetshowers: "prehánky so snehom", sleetshowers: "prehánky so snehom", heavysleetshowers: "silné prehánky so snehom", lightsnow: "slabé sneženie", snow: "sneženie", heavysnow: "silné sneženie",
    lightsnowshowers: "snehové prehánky", snowshowers: "snehové prehánky", heavysnowshowers: "silné snehové prehánky" };
  function wxKey(m) { return (+m.lat).toFixed(2) + "," + (+m.lng).toFixed(2); }
  function wxLabel(sym) { var s = String(sym || "").replace(/_(day|night|polartwilight)$/, ""); return s.indexOf("thunder") > -1 ? "búrka" : WXL[s] || s; }
  function wxEmoji(sym) {
    var s = String(sym || ""), night = /_night$/.test(s);
    if (s.indexOf("thunder") > -1) return "⛈️";
    if (s.indexOf("snow") > -1 || s.indexOf("sleet") > -1) return "🌨️";
    if (s.indexOf("rainshowers") > -1) return "🌦️";
    if (s.indexOf("rain") > -1) return "🌧️";
    if (s.indexOf("fog") === 0) return "🌫️";
    if (s.indexOf("cloudy") === 0) return "☁️";
    if (s.indexOf("partlycloudy") === 0) return night ? "☁️" : "⛅";
    if (s.indexOf("fair") === 0) return night ? "🌙" : "🌤️";
    if (s.indexOf("clearsky") === 0) return night ? "🌙" : "☀️";
    return "🌡️";
  }
  function wxRank(s) {
    s = String(s || "");
    if (s.indexOf("thunder") > -1) return 9; if (s.indexOf("heavy") > -1) return 8; if (s.indexOf("snow") > -1 || s.indexOf("sleet") > -1) return 7;
    if (s.indexOf("rain") === 0 || s.indexOf("_rain") > -1) return 6; if (s.indexOf("light") === 0) return 5; if (s.indexOf("fog") === 0) return 3;
    if (s.indexOf("cloudy") === 0) return 2; if (s.indexOf("partlycloudy") === 0) return 1; return 0;
  }
  // rovnaké pravidlá ako server (supabase/functions/_shared/weather.ts)
  function wxEval(r) {
    var ser = WX[wxKey(r.meet)]; if (!ser || !ser.length) return null;
    var st = new Date(r.starts_at).getTime(), en = new Date(r.ends_at).getTime();
    var pts = ser.filter(function (p) { return p.t + p.dur * 36e5 > st && p.t < en; });
    if (!pts.length) return { none: true, last: ser[ser.length - 1].t };
    var tmin = Infinity, tmax = -Infinity, pr = 0, pop = 0, wind = 0, gust = 0, thu = 0, sym = "", noPop = true;
    pts.forEach(function (p) {
      if (p.temp != null) { tmin = Math.min(tmin, p.temp); tmax = Math.max(tmax, p.temp); }
      var ov = Math.max(0, Math.min(en, p.t + p.dur * 36e5) - Math.max(st, p.t)) / 36e5;
      pr += p.dur === 1 ? p.pr : p.pr * Math.min(1, ov / p.dur);
      if (p.pop != null) { noPop = false; pop = Math.max(pop, p.pop); }
      thu = Math.max(thu, p.thu || 0); wind = Math.max(wind, p.wind || 0); gust = Math.max(gust, p.gust || 0);
      if (wxRank(p.sym) >= wxRank(sym)) sym = p.sym;
    });
    var bad = [];
    if (sym.indexOf("thunder") > -1 || thu >= 30) bad.push("búrka");
    if (sym.indexOf("snow") > -1) bad.push("sneženie"); else if (sym.indexOf("sleet") > -1) bad.push("dážď so snehom");
    if (pr >= 5 || sym.indexOf("heavyrain") > -1) bad.push("silný dážď"); else if (pr >= 1 && (pop >= 50 || noPop)) bad.push("dážď");
    if (gust >= 15 || wind >= 10) bad.push("silný vietor");
    if (tmax >= 33) bad.push("horúčava");
    return { tmin: Math.round(tmin), tmax: Math.round(tmax), pr: Math.round(pr * 10) / 10, wind: Math.round(wind * 3.6), gust: Math.round(gust * 3.6), sym: sym, label: wxLabel(sym), bad: bad, pts: pts };
  }
  function wxSoon(r) { var t = new Date(r.starts_at).getTime(); return !ended(r) && t < Date.now() + 10 * 864e5; }
  function loadWeather() {
    if (wxBusy || !S.me) return;
    var pts = [], seen = {};
    S.rides.forEach(function (r) { if (!wxSoon(r)) return; var k = wxKey(r.meet); if (WX[k] || wxAsked[k] || seen[k]) return; seen[k] = 1; pts.push({ lat: r.meet.lat, lng: r.meet.lng }); });
    if (!pts.length) return;
    wxBusy = true;
    api.weather(pts.slice(0, 30)).then(function (d) { Object.keys(d || {}).forEach(function (k) { WX[k] = d[k] || []; }); })
      .catch(function () {}).then(function () {
        wxBusy = false; pts.forEach(function (p) { wxAsked[wxKey(p)] = 1; });
        if (!$("modal").classList.contains("open") || !$("pickRoot")) render(true);
        if (S.openId && $("sheet").classList.contains("open")) renderWx();
      });
  }
  function wxChip(r) {
    if (!wxSoon(r)) return ""; var w = wxEval(r); if (!w || w.none) return "";
    return '<span class="chip wx' + (w.bad.length ? " bad" : "") + '" title="' + esc(w.label) + '">' + wxEmoji(w.sym) + " " + (w.tmax > -100 ? w.tmax + "°" : "") + (w.bad.length ? " · " + esc(w.bad[0]) : "") + "</span>";
  }
  function wxBadRides() { return S.rides.filter(function (r) { if (!going(r) || ended(r)) return false; if (new Date(r.starts_at) > new Date(Date.now() + 48 * 36e5)) return false; var w = wxEval(r); return w && !w.none && w.bad.length; }); }
  function renderWx() {
    var r = find(S.openId), el = $("dWx"); if (!r || !el) return;
    if (ended(r)) { el.innerHTML = ""; return; }
    var head = '<div class="sec-h"><b>Počasie na jazde</b><small>predpoveď MET Norway</small></div>';
    var days = Math.ceil((new Date(r.starts_at) - Date.now()) / 864e5);
    if (days > 10) { el.innerHTML = head + '<div class="wxcard muted"><span class="wxe">🌤️</span><div class="grow"><b>Predpoveď bude o ' + (days - 9) + " " + (days - 9 === 1 ? "deň" : days - 9 < 5 ? "dni" : "dní") + "</b><small>Počasie ukážeme 9 dní pred jazdou" + (pushBtnNeeded() ? " a ak bude zlé, upozorníme ťa." : ".") + "</small></div></div>" + pushCta(); return; }
    var w = wxEval(r);
    if (!w) { el.innerHTML = head + '<div class="wxcard muted"><span class="wxe">⏳</span><div class="grow"><b>Načítavam predpoveď…</b></div></div>'; loadWeather(); return; }
    if (w.none) { el.innerHTML = head + '<div class="wxcard muted"><span class="wxe">🌤️</span><div class="grow"><b>Predpoveď ešte nie je</b><small>Ukážeme ju pár dní pred jazdou.</small></div></div>' + pushCta(); return; }
    var hours = w.pts.filter(function (p) { return p.dur === 1; }).filter(function (p, i, a) { return a.length <= 8 || i % Math.ceil(a.length / 8) === 0; }).slice(0, 8);
    el.innerHTML = head + '<div class="wxcard' + (w.bad.length ? " bad" : "") + '"><span class="wxe">' + wxEmoji(w.sym) + '</span><div class="grow"><b>' + esc(w.label.charAt(0).toUpperCase() + w.label.slice(1)) + " · " + (w.tmin === w.tmax ? w.tmax : w.tmin + " až " + w.tmax) + " °C</b><small>" +
      [w.pr ? "zrážky " + String(w.pr).replace(".", ",") + " mm" : "bez zrážok", "vietor " + w.wind + " km/h" + (w.gust > w.wind ? " (nárazy " + w.gust + ")" : "")].join(" · ") + "</small></div></div>" +
      (hours.length > 1 ? '<div class="wxhours">' + hours.map(function (p) { return "<div><small>" + hm(p.t) + "</small><i>" + wxEmoji(p.sym) + "</i><b>" + Math.round(p.temp) + "°</b>" + (p.pr ? '<em>' + String(Math.round(p.pr * 10) / 10).replace(".", ",") + "</em>" : "") + "</div>"; }).join("") + "</div>" : "") +
      (w.bad.length ? '<div class="wxwarn">⚠️<div><b>Hlásia ' + esc(w.bad.join(", ")) + "</b><small>" + (going(r) ? "Dohodnite sa v chate, či idete alebo jazdu posuniete." : "Skontroluj predpoveď pred odchodom.") + "</small></div></div>" : "") + pushCta();
  }
  function pushBtnNeeded() { return PUSH.state !== "on"; }
  function pushPrompt() {
    if (!PUSH.ready || PUSH.state === "on" || PUSH.state === "denied" || (!PUSH.ok && !isIOS())) return false;
    try { var t = +localStorage.getItem("eb_push_hide"); if (t && Date.now() - t < 14 * 864e5) return false; } catch (e) {}
    return true;
  }
  function pushCta() { return pushBtnNeeded() ? '<button class="pushcta" data-act="push-on">🔔 <span><b>Upozorni ma na zlé počasie</b><small>deň pred jazdou ti príde správa do mobilu</small></span></button>' : '<p class="small-note" style="margin-top:8px">🔔 Upozornenia sú zapnuté. Ak sa počasie pokazí, dáme ti vedieť.</p>'; }

  /* ---------------- upozornenia do mobilu (web push) ---------------- */
  var PUSH = { ok: "serviceWorker" in navigator && "PushManager" in window && "Notification" in window, state: "off", sub: null };
  function standalone() { return !!(navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches)); }
  function b64u(s) { var p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function deviceName() {
    var ua = navigator.userAgent, os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Počítač";
    var br = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /Chrome|CriOS/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "";
    return os + (standalone() ? " · appka na ploche" : br ? " · " + br : "");
  }
  function store(k, v) { try { if (v !== undefined) localStorage.setItem(k, String(v)); return localStorage.getItem(k); } catch (e) { return null; } }
  function wantPush(v) { return store("eb_push_want", v === undefined ? undefined : v ? "1" : "0") === "1"; }
  function iosTab() { return isIOS() && !standalone(); } // iPhone v Safari: upozornenia až z ikonky na ploche
  function isAndroid() { return /Android/i.test(navigator.userAgent); }
  function opts() { return { userVisibleOnly: true, applicationServerKey: b64u(C.VAPID_PUBLIC) }; }
  function pushInit() {
    if (api.mode === "demo") { PUSH.ok = true; PUSH.ready = true; setTimeout(askPushOnce, 900); return; }
    if (!PUSH.ok) { PUSH.ready = true; return; }
    navigator.serviceWorker.register("sw.js").then(function () { return navigator.serviceWorker.ready; }).then(function (reg) {
      PUSH.reg = reg;
      // povolenie je dané, ale prihlásenie na upozornenia sa stratilo (nová ikonka na ploche, iný účet) – obnovíme ho bez pýtania
      return reg.pushManager.getSubscription().then(function (sub) { return sub || (Notification.permission === "granted" && wantPush() ? reg.pushManager.subscribe(opts()).catch(function () { return null; }) : null); });
    }).then(function (sub) {
      PUSH.sub = sub; PUSH.ready = true; PUSH.state = sub ? "on" : (Notification.permission === "denied" ? "denied" : "off");
      if (sub) api.pushSave(sub, deviceName()).catch(function () {});
      render(true); renderWx(); askPushOnce();
    }).catch(function () { PUSH.ready = true; });
  }
  // appka otvorená z plochy a upozornenia ešte nie sú zapnuté: raz sa slušne opýtame (ťuk = systémové okno)
  function askPushOnce() {
    if (PUSH.state !== "off" || !standalone() || !PUSH.ok || !$("onb").classList.contains("hide")) return;
    var t = +store("eb_push_asked"); if (t && Date.now() - t < 7 * 864e5) return;
    if ($("modal").classList.contains("open") || $("sheet").classList.contains("open")) return;
    store("eb_push_asked", Date.now()); openModal(vAskPush());
  }
  function vAskPush() {
    return '<div class="sh-top"><button class="icb" data-act="closem" aria-label="Zavrieť">' + IC.close + '</button><b>Upozornenia</b></div><div class="pad askp">' +
      '<div class="askic">🔔</div><h2>Nech ti nič neujde</h2><p>Keď ti niekto pošle žiadosť o priateľstvo, prijme ju alebo ťa zavolá na jazdu, príde ti správa rovno do mobilu.</p>' +
      '<button class="btn full" data-act="push-on">Zapnúť upozornenia</button><button class="btn full gh" data-act="closem" style="margin-top:8px">Teraz nie</button></div>';
  }
  function pushTest(quiet) {
    return api.pushTest().then(function (d) {
      if (d && d.sent) { if (!quiet) toast("Skúšobné upozornenie je na ceste 🔔"); }
      else toast("Server nenašiel tvoje zariadenie. Vypni a znova zapni upozornenia.");
    }).catch(err);
  }
  function pushDone(sub) {
    return api.pushSave(sub, deviceName()).then(function () {
      PUSH.sub = sub; PUSH.state = "on"; wantPush(true); closeModal();
      toast("Upozornenia zapnuté 🔔 Posielam skúšobné…");
      setTimeout(function () { pushTest(true); }, 700);
    });
  }
  function pushOn() {
    if (api.mode === "demo") { api.pushSave(null, deviceName()).then(function () { PUSH.state = "on"; closeModal(); toast("Upozornenia zapnuté 🔔"); render(true); renderWx(); }); return; }
    if (iosTab()) { openModal(vInstall()); return; }
    if (!PUSH.ok) { toast("Tento prehliadač upozornenia nepodporuje. Otvor EB Ride v Chrome alebo Safari."); return; }
    if (Notification.permission === "denied") { PUSH.state = "denied"; openModal(vBlocked()); return; }
    PUSH.busy = true; render(true);
    // subscribe() voláme priamo v ťuknutí: samo ukáže okno „Povoliť upozornenia“ (iPhone to inak nedovolí)
    var go = PUSH.reg ? PUSH.reg.pushManager.subscribe(opts()).catch(function (e) {
      if (e && e.name === "InvalidStateError") return PUSH.reg.pushManager.getSubscription().then(function (s) { return s && s.unsubscribe(); }).then(function () { return PUSH.reg.pushManager.subscribe(opts()); });
      throw e;
    }) : Promise.resolve(Notification.requestPermission()).then(function (perm) {
      if (perm !== "granted") throw new Error("perm");
      return navigator.serviceWorker.register("sw.js").then(function () { return navigator.serviceWorker.ready; }).then(function (reg) { PUSH.reg = reg; return reg.pushManager.subscribe(opts()); });
    });
    go.then(pushDone).catch(function (e) {
      var perm = window.Notification ? Notification.permission : "default";
      if (perm === "denied") { PUSH.state = "denied"; openModal(vBlocked()); }
      else if (perm === "default") toast("Upozornenia si nepovolil. Ťukni znova a daj <b>Povoliť</b>.");
      else err(e);
    }).then(function () { PUSH.busy = false; render(true); renderWx(); });
  }
  function pushOff() {
    var sub = PUSH.sub, done = function () { PUSH.sub = null; PUSH.state = "off"; wantPush(false); toast("Upozornenia vypnuté."); render(true); renderWx(); };
    if (api.mode === "demo" || !sub) return api.pushDelete(sub && sub.endpoint).then(done, done);
    api.pushDelete(sub.endpoint).catch(function () {}).then(function () { return sub.unsubscribe(); }).catch(function () {}).then(done);
  }
  // pridanie na plochu: Android/Chrome vie jedným ťuknutím, iPhone cez Zdieľať
  var INSTALL = { evt: null };
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); INSTALL.evt = e; if (S.me) render(true); });
  window.addEventListener("appinstalled", function () { INSTALL.evt = null; closeModal(); toast("EB Ride je na ploche 📱"); });
  function canInstall() { return !standalone() && (!!INSTALL.evt || isIOS() || isAndroid()); }
  function installNow() {
    var e = INSTALL.evt;
    if (!e) { openModal(vInstall()); return; }
    e.prompt(); (e.userChoice || Promise.resolve()).then(function () { INSTALL.evt = null; render(true); });
  }
  var SHAREI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2"/></svg>';
  var ADDI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  var DOTSI = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
  function vInstall() {
    var ios = isIOS(), phone = /iPhone|Android/i.test(navigator.userAgent);
    var step = function (n, ico, b, sm) { return '<div class="ist"><span class="n">' + n + '</span><span class="ico">' + ico + "</span><div><b>" + b + "</b><small>" + sm + "</small></div></div>"; };
    var steps = ios ? step(1, SHAREI, "Ťukni na Zdieľať", "dole v lište Safari, v novom iOS cez ⋯") + step(2, ADDI, "Pridať na plochu", "a potvrď Pridať") + step(3, '<img src="apple-touch-icon.png" alt="">', "Otvor EB Ride z plochy", "prihlás sa a zapni upozornenia")
      : step(1, DOTSI, "Ťukni na ⋮", "vpravo hore v Chrome") + step(2, ADDI, "Pridať na plochu", "alebo Inštalovať aplikáciu") + step(3, '<img src="apple-touch-icon.png" alt="">', "Otvor EB Ride z plochy", "a zapni upozornenia");
    return '<div class="sh-top"><button class="icb" data-act="closem" aria-label="Zavrieť">' + IC.close + '</button><b>EB Ride na plochu</b></div><div class="pad inst">' +
      '<div class="ihero"><img src="apple-touch-icon.png" alt="" class="iapp"><div><b>Pridaj si EB Ride na plochu</b><small>' + (ios ? "Na iPhone chodia upozornenia len z ikonky na ploche. Appka sa potom otvára na celú obrazovku." : "Appka sa bude otvárať na celú obrazovku ako každá iná.") + "</small></div></div>" +
      (INSTALL.evt ? '<button class="btn full" data-act="install">' + ADDI + "Pridať na plochu</button>" : '<div class="isteps">' + steps + "</div>") +
      "</div>" + (phone && !INSTALL.evt ? '<div class="iarrow ' + (ios ? "down" : "up") + '" aria-hidden="true">' + sz(IC.back, 26) + "</div>" : "");
  }
  function vBlocked() {
    var how = isIOS() ? "Otvor <b>Nastavenia</b> v iPhone → <b>Upozornenia</b> → <b>EB Ride</b> a zapni <b>Povoliť upozornenia</b>."
      : isAndroid() ? "Podrž prst na ikonke <b>EB Ride</b> → <b>Informácie o aplikácii</b> → <b>Upozornenia</b> a zapni ich. V Chrome ťukni na ikonku vľavo od adresy → <b>Povolenia</b> → <b>Upozornenia</b>."
      : "Klikni na ikonku vľavo od adresy stránky → <b>Upozornenia</b> → <b>Povoliť</b>.";
    return '<div class="sh-top"><button class="icb" data-act="closem" aria-label="Zavrieť">' + IC.close + '</button><b>Upozornenia sú vypnuté</b></div><div class="pad askp">' +
      '<div class="askic">🔕</div><p>Upozornenia si v telefóne zakázal, takže sa ťa appka už nemôže znova opýtať. Zapneš ich takto:</p><p class="howone">' + how + "</p>" +
      '<button class="btn full" data-act="push-on">Hotovo, skúsiť znova</button></div>';
  }
  function vNotifCard() {
    if (!PREF.list && !PREF.err) loadPrefs();
    var st = PUSH.state, busy = PUSH.busy;
    var status = st === "on" ? '<span class="nst on">● Zapnuté v tomto zariadení</span>' : st === "denied" ? '<span class="nst bad">● Vypnuté v nastaveniach telefónu</span>' : '<span class="nst">● Vypnuté</span>';
    var main = st === "on" ? '<div class="nacts"><button class="btn sm" data-act="push-test">' + sz(IC.bell, 14) + 'Poslať skúšobné</button><button class="btn sm gh" data-act="push-off">Vypnúť</button></div>'
      : st === "denied" ? '<div class="nacts"><button class="btn sm" data-act="push-blocked">Ako ich zapnúť</button></div>'
      : iosTab() ? '<button class="btn full" data-act="install" style="margin-top:12px">' + ADDI + "Pridať na plochu a zapnúť</button>"
      : '<button class="btn full" data-act="push-on" style="margin-top:12px"' + (busy ? " disabled" : "") + ">" + sz(IC.bell, 16) + (busy ? "Zapínam…" : "Zapnúť upozornenia") + "</button>";
    var inst = !iosTab() && canInstall() && (INSTALL.evt || isAndroid()) ? '<div class="nrow"><img src="apple-touch-icon.png" alt=""><div class="grow"><b>EB Ride na plochu</b><small>otvára sa ako appka</small></div><button class="btn sm gh" data-act="install">Pridať</button></div>' : "";
    return '<div class="sec-h" id="notif"><b>Upozornenia do mobilu</b></div><div class="card ncard">' +
      '<div class="nhead"><span class="nico">🔔</span><div class="grow"><b>Žiadosti, pozvánky na jazdy, zlé počasie</b>' + status + "</div></div>" + main + vPrefs(st === "on") + inst + "</div>";
  }
  // na čo všetko chce človek upozornenie (platí pre všetky jeho zariadenia)
  var NKINDS = [["friend_request", "👋", "mi niekto pošle žiadosť o priateľstvo"], ["friend_accepted", "🤝", "niekto prijme moju žiadosť alebo sa pridá cez môj odkaz"],
    ["ride_invite", "🚴", "ma niekto zavolá na jazdu"], ["ride_join", "✅", "sa niekto pridá k mojej jazde"], ["weather", "⚠️", "hrozí zlé počasie na jazde, na ktorú idem"]];
  var PREF = { list: null, loading: false, err: false, t: null };
  function loadPrefs() {
    if (PREF.list || PREF.loading) return;
    PREF.loading = true;
    api.prefs().then(function (l) { PREF.list = l ? l.slice() : NKINDS.map(function (k) { return k[0]; }); PREF.err = false; })
      .catch(function () { PREF.err = true; })
      .then(function () { PREF.loading = false; drawPrefs(); });
  }
  // zbalené: len jeden riadok so súhrnom, po ťuknutí sa rozbalí zoznam
  function vPrefs(on) {
    var open = PREF.open, n = PREF.list ? NKINDS.filter(function (k) { return PREF.list.indexOf(k[0]) > -1; }).length : null;
    var sum = n == null ? (PREF.err ? "Nepodarilo sa načítať" : "Načítavam…") : n === NKINDS.length ? "Všetko zapnuté" : n === 0 ? "Všetko vypnuté" : "Zapnuté " + n + " z " + NKINDS.length;
    var head = '<button type="button" class="nptog' + (open ? " open" : "") + '" data-act="pref-open" aria-expanded="' + !!open + '" aria-controls="nplist"><span class="grow"><b>Na čo ťa upozorníme</b><small>' + sum + "</small></span>" + sz(IC.back, 16).replace("<svg", '<svg class="chev"') + "</button>";
    if (!PREF.list && !PREF.err && open) loadPrefs();
    var body = !open ? "" : !PREF.list ? '<p class="nphint">' + (PREF.err ? 'Nastavenia upozornení sa nepodarilo načítať. <button class="lnk" data-act="pref-retry">Skúsiť znova</button>' : "Načítavam…") + "</p>" :
      (on ? "" : '<p class="nphint">Vyber si už teraz. Upozornenia prídu, keď ich v tomto zariadení zapneš.</p>') +
      NKINDS.map(function (k) { var y = PREF.list.indexOf(k[0]) > -1; return '<div class="npref' + (y ? " on" : "") + '" data-act="pref" data-k="' + k[0] + '" role="switch" aria-checked="' + y + '" tabindex="0"><i>' + k[1] + '</i><span class="grow">' + k[2] + '</span><span class="sw' + (y ? " on" : "") + '"></span></div>'; }).join("") +
      (PREF.list.length ? "" : '<p class="nphint">Všetko je vypnuté, takže ti nepríde žiadne upozornenie.</p>');
    return '<div class="nprefs" id="nprefs">' + head + (open ? '<div id="nplist">' + body + "</div>" : "") + "</div>";
  }
  function drawPrefs() { var el = $("nprefs"); if (el) el.outerHTML = vPrefs(PUSH.state === "on"); }
  function togglePref(k) {
    if (!PREF.list) return;
    var i = PREF.list.indexOf(k); if (i > -1) PREF.list.splice(i, 1); else PREF.list.push(k);
    drawPrefs();
    clearTimeout(PREF.t);
    var want = NKINDS.map(function (x) { return x[0]; }).filter(function (x) { return PREF.list.indexOf(x) > -1; });
    PREF.t = setTimeout(function () {
      api.savePrefs(want).then(function () { toast("Uložené."); })
        .catch(function (e) { PREF.list = null; err(e); loadPrefs(); });
    }, 500);
  }

  /* ---------------- EliteBiker dizajn na zdieľanie (fotka + štatistiky, trasa, partia, nálepka) ---------------- */
  var DSG = { id: null, style: "stats", fmt: "story", bg: 0, locals: [], blob: null, url: null, n: 0 };
  var DSTY = [["stats", "Štatistiky"], ["route", "Trasa"], ["crew", "Partia"], ["sticker", "Nálepka"]];
  var DFMT = [["story", "Príbeh 9:16"], ["post", "Príspevok 4:5"]];
  function loadImg(src) { return new Promise(function (res) { if (!src) return res(null); var i = new Image(); if (!/^(blob|data):/.test(src)) i.crossOrigin = "anonymous"; i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
  function rr(x, c, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); if (c) { x.fillStyle = c; x.fill(); } }
  function wrap(x, text, maxW, maxL) {
    var words = String(text).split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    if (lines.length > maxL) { lines = lines.slice(0, maxL); var l = lines[maxL - 1]; while (x.measureText(l + "…").width > maxW && l.length) l = l.slice(0, -1); lines[maxL - 1] = l + "…"; }
    return lines;
  }
  function F(w, px) { return w + " " + Math.round(px) + "px Poppins, sans-serif"; }
  function fontsReady() { return document.fonts && document.fonts.load ? Promise.all(["800 76px Poppins", "700 40px Poppins", "600 28px Poppins", "500 34px Poppins"].map(function (f) { return document.fonts.load(f).catch(function () {}); })) : Promise.resolve(); }
  function cover(x, im, X, Y, W, H) { var s = Math.max(W / im.width, H / im.height), w = im.width * s, h = im.height * s; x.drawImage(im, X + (W - w) / 2, Y + (H - h) / 2, w, h); }
  function blueBg(x, W, H) {
    var g = x.createLinearGradient(0, 0, W * .4, H); g.addColorStop(0, "#2a56ff"); g.addColorStop(.55, "#1b3fc4"); g.addColorStop(1, "#0b1233");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.save(); x.globalAlpha = .08; x.strokeStyle = "#fff"; x.lineWidth = 3;
    for (var k = 0; k < 9; k++) { x.beginPath(); x.ellipse(W * .82, H * .2, 140 + k * 95, 90 + k * 70, -.5, 0, Math.PI * 2); x.stroke(); }
    x.restore();
  }
  function shade(x, W, H, stops) { var g = x.createLinearGradient(0, 0, 0, H); stops.forEach(function (s) { g.addColorStop(s[0], "rgba(10,14,30," + s[1] + ")"); }); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  // odznak EliteBiker RIDE – biela kapsula s logom a čiernym štítkom RIDE
  function ebBadge(x, logo, X, Y, hb, anchor) {
    var k = hb / 128, lh = 74 * k, lw = logo ? logo.width * lh / logo.height : 0, pad = 26 * k, gap = 22 * k, sp = 9 * k;
    x.save(); x.shadowColor = "transparent"; x.textBaseline = "middle"; x.textAlign = "left";
    x.font = F(800, 30 * k);
    var rw = 30 * k - sp; "RIDE".split("").forEach(function (c) { rw += x.measureText(c).width + sp; });
    var wm = 0; if (!logo) { x.font = F(800, 40 * k); wm = x.measureText("ELITEBIKER").width; }
    var cw = pad + (logo ? lw : wm) + gap + rw + pad;
    if (anchor === "center") X -= cw / 2; else if (anchor === "right") X -= cw;
    rr(x, "#fff", X, Y, cw, hb, 30 * k);
    if (logo) x.drawImage(logo, X + pad, Y + (hb - lh) / 2, lw, lh); else { x.fillStyle = "#11131a"; x.fillText("ELITEBIKER", X + pad, Y + hb / 2 + 2 * k); }
    var px = X + pad + (logo ? lw : wm) + gap, th = 52 * k;
    rr(x, "#11131a", px, Y + (hb - th) / 2, rw, th, 12 * k);
    x.fillStyle = "#fff"; x.font = F(800, 30 * k);
    var tx = px + 15 * k; "RIDE".split("").forEach(function (c) { x.fillText(c, tx, Y + hb / 2 + k); tx += x.measureText(c).width + sp; });
    x.restore(); return cw;
  }
  function routeOf(r) { return r.route && r.route.length > 1 ? r.route : null; }
  function routePts(route, box) {
    var lat0 = route.reduce(function (s, p) { return s + p[0]; }, 0) / route.length, kx = Math.cos(lat0 * Math.PI / 180);
    var xs = route.map(function (p) { return p[1] * kx; }), ys = route.map(function (p) { return -p[0]; });
    var mnx = Math.min.apply(0, xs), mxx = Math.max.apply(0, xs), mny = Math.min.apply(0, ys), mxy = Math.max.apply(0, ys);
    var sc = Math.min(box.w / Math.max(mxx - mnx, 1e-6), box.h / Math.max(mxy - mny, 1e-6));
    var ox = box.x + (box.w - (mxx - mnx) * sc) / 2, oy = box.y + (box.h - (mxy - mny) * sc) / 2;
    return route.map(function (p, i) { return [ox + (xs[i] - mnx) * sc, oy + (ys[i] - mny) * sc]; });
  }
  function strokeRoute(x, P, lw) {
    var path = function () { x.beginPath(); P.forEach(function (p, i) { if (i) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]); }); };
    x.save(); x.lineJoin = "round"; x.lineCap = "round";
    x.shadowColor = "rgba(0,0,0,.45)"; x.shadowBlur = lw * 2.6; x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = lw * 2.4; path(); x.stroke();
    x.shadowBlur = 0; x.strokeStyle = "#fff"; x.lineWidth = lw; path(); x.stroke();
    var a = P[0], b = P[P.length - 1], rd = lw * 1.6;
    x.lineWidth = lw * .55; x.strokeStyle = "#fff";
    x.fillStyle = "#16a34a"; x.beginPath(); x.arc(a[0], a[1], rd, 0, 7); x.fill(); x.stroke();
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) > rd * 2) { x.fillStyle = "#11131a"; x.beginPath(); x.arc(b[0], b[1], rd, 0, 7); x.fill(); x.stroke(); }
    x.restore();
  }
  function routeKm(pts) { var d = 0; for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i], R = 6371, dl = (b[0] - a[0]) * Math.PI / 180, dn = (b[1] - a[1]) * Math.PI / 180, h = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dn / 2) * Math.sin(dn / 2); d += 2 * R * Math.asin(Math.sqrt(h)); } return Math.round(d * 10) / 10; }
  function durText(m) { if (m >= 20 * 60) { var d = Math.round(m / 1440) || 1; return d + (d === 1 ? " deň" : d < 5 ? " dni" : " dní"); } var h = Math.floor(m / 60), mm = m % 60; return h ? h + " h" + (mm ? " " + mm + " min" : "") : mm + " min"; }
  function jazdci(n) { return n === 1 ? "jazdec" : n > 1 && n < 5 ? "jazdci" : "jazdcov"; }
  function dsgStats(r) {
    var route = routeOf(r), dist = r.distance_km || (route ? routeKm(route) : null), out = [];
    if (dist) out.push(["Vzdialenosť", km(dist) + " km"]);
    if (r.elevation_m) out.push(["Stúpanie", r.elevation_m + " m"]);
    out.push(["Čas", durText(Math.max(0, Math.round((new Date(r.ends_at) - new Date(r.starts_at)) / 6e4)))]);
    if (out.length < 3) out.push(["Partia", r.participants.length + " " + jazdci(r.participants.length)]);
    return out;
  }
  function dsgDate(r) { var d = new Date(r.starts_at); return DN[d.getDay()] + " " + d.getDate() + ". " + (d.getMonth() + 1) + ". " + d.getFullYear(); }
  function dsgMeta(r) { var ty = TYPES[r.type] || TYPES.mtb, place = (r.meet.label || "").split(",")[0].split(/ [–·] /)[0]; return ty[0] + " · " + dsgDate(r) + (place ? " · " + place : ""); }
  // riadok štatistík ako na Strave: malý popis nad veľkým číslom
  function statRow(x, stats, X, Y, W, align, vs) {
    vs = vs || 64; var cw = W / stats.length;
    // jedna veľkosť pre všetky čísla, aby sa zmestilo aj najdlhšie
    stats.forEach(function (s) { x.font = F(800, vs); while (x.measureText(s[1]).width > cw - 44 && vs > 30) { vs -= 2; x.font = F(800, vs); } });
    stats.forEach(function (s, i) {
      var cx = align === "center" ? X + cw * i + cw / 2 : X + cw * i;
      x.textAlign = align === "center" ? "center" : "left";
      x.font = F(600, vs * .4); x.fillStyle = "rgba(255,255,255,.78)"; x.fillText(s[0].toUpperCase(), cx, Y);
      x.font = F(800, vs); x.fillStyle = "#fff";
      x.fillText(s[1], cx, Y + vs * 1.12);
    });
    x.textAlign = "left";
  }
  function dsgCanvas(W, H) { var c = document.createElement("canvas"); c.width = W; c.height = H; return c; }
  function toBlob(c, png) { return new Promise(function (res) { c.toBlob(function (b) { res(b); }, png ? "image/png" : "image/jpeg", .92); }); }

  function renderDesign(r, o) {
    if (o.style === "crew") return makeStory(r, o.bg);
    var route = routeOf(r), stats = dsgStats(r), stk = o.style === "sticker";
    var W = 1080, H = stk ? (route ? 1080 : 600) : o.fmt === "post" ? 1350 : 1920, post = H === 1350;
    var cv = dsgCanvas(W, H), x = cv.getContext("2d");
    return Promise.all([fontsReady(), stk ? null : loadImg(o.bg), loadImg(C.LOGO_URL)]).then(function (res) {
      var photo = res[1], logo = res[2];
      x.textBaseline = "alphabetic";
      if (stk) {
        // priehľadná nálepka: trasa, čísla a odznak – vloží sa na vlastnú fotku v Instagrame
        x.shadowColor = "rgba(0,0,0,.5)"; x.shadowBlur = 16;
        var y0 = 40;
        if (route) { strokeRoute(x, routePts(route, { x: 150, y: 50, w: W - 300, h: 480 }), 14); y0 = 640; }
        statRow(x, stats, 60, y0, W - 120, "center", 74);
        x.shadowBlur = 0;
        ebBadge(x, logo, W / 2, y0 + 170, 104, "center");
        return toBlob(cv, true);
      }
      if (photo) cover(x, photo, 0, 0, W, H); else blueBg(x, W, H);
      if (o.style === "route") {
        if (photo) shade(x, W, H, [[0, .62], [.5, .5], [1, .82]]);
        ebBadge(x, logo, W / 2, post ? 60 : 96, post ? 96 : 112, "center");
        var box = post ? { x: 150, y: 200, w: W - 300, h: 520 } : { x: 110, y: 290, w: W - 220, h: 820 };
        if (route) strokeRoute(x, routePts(route, box), post ? 12 : 15);
        else { x.fillStyle = "rgba(255,255,255,.14)"; x.beginPath(); x.arc(W / 2, box.y + box.h / 2, post ? 150 : 210, 0, 7); x.fill(); x.font = (post ? 150 : 210) + "px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#fff"; x.fillText("🚴", W / 2, box.y + box.h / 2 + 8); x.textBaseline = "alphabetic"; }
        x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = 16; x.fillStyle = "#fff"; x.textAlign = "center";
        var y = box.y + box.h + (post ? 92 : 120);
        x.font = F(800, post ? 60 : 70); wrap(x, r.title, W - 160, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += post ? 70 : 82; });
        x.font = F(500, post ? 30 : 34); x.fillStyle = "rgba(255,255,255,.88)"; wrap(x, dsgMeta(r), W - 160, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += post ? 40 : 46; });
        statRow(x, stats, 70, y + (post ? 48 : 70), W - 140, "center", post ? 60 : 70);
      } else {
        // Štatistiky: fotka cez celú plochu, dole prechod do tmava, čísla a názov jazdy
        if (photo) shade(x, W, H, [[0, .5], [.16, 0], [post ? .42 : .52, 0], [1, .9]]); else shade(x, W, H, [[0, 0], [.6, 0], [1, .45]]);
        ebBadge(x, logo, 64, post ? 56 : 84, post ? 92 : 108);
        if (route) { var rb = post ? { x: W - 64 - 210, y: 40, w: 210, h: 200 } : { x: W - 64 - 250, y: 70, w: 250, h: 250 }; x.shadowColor = "rgba(0,0,0,.4)"; strokeRoute(x, routePts(route, rb), 8); }
        var fy = H - (post ? 54 : 78);
        x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = 14;
        x.font = F(600, 28); x.fillStyle = "rgba(255,255,255,.8)"; x.textAlign = "left"; x.fillText("Jazdi s partiou · EliteBiker Ride", 64, fy);
        x.textAlign = "right"; x.fillText("@elitebiker.sk", W - 64, fy); x.textAlign = "left";
        var sy = fy - (post ? 150 : 176);
        statRow(x, stats, 64, sy, W - 128, "left", post ? 60 : 68);
        x.fillStyle = "rgba(255,255,255,.28)"; x.shadowBlur = 0; x.fillRect(64, sy - 62, W - 128, 3); x.shadowBlur = 14;
        var my = sy - 98;
        x.font = F(500, post ? 30 : 34); x.fillStyle = "rgba(255,255,255,.88)";
        var ml = wrap(x, dsgMeta(r), W - 128, 1); x.fillText(ml[0], 64, my);
        x.font = F(800, post ? 62 : 72); x.fillStyle = "#fff";
        var tl = wrap(x, r.title, W - 128, 2), lh = post ? 72 : 84, ty = my - (post ? 60 : 68) - (tl.length - 1) * lh;
        tl.forEach(function (l, i) { x.fillText(l, 64, ty + i * lh); });
      }
      return toBlob(cv, false);
    });
  }

  // Partia: pôvodná Story s trasou, číslami a fotkami partie (9:16)
  function makeStory(r, photoUrl) {
    var W = 1080, H = 1920, cv = dsgCanvas(W, H);
    var x = cv.getContext("2d"), ty = TYPES[r.type] || TYPES.mtb;
    var people = r.participants.slice(0, 6);
    return Promise.all([fontsReady(), loadImg(photoUrl), loadImg(C.LOGO_URL)].concat(people.map(function (u) { return loadImg(prof(u).avatar_url); }))).then(function (res) {
      var photo = res[1], logo = res[2], avs = res.slice(3);
      if (photo) { cover(x, photo, 0, 0, W, H); shade(x, W, H, [[0, .55], [.3, .08], [.55, .35], [1, .92]]); } else blueBg(x, W, H);
      ebBadge(x, logo, 72, 96, 128);
      var box = { x: 110, y: 300, w: 860, h: 700 }, route = routeOf(r);
      if (route) strokeRoute(x, routePts(route, box), 14);
      else {
        x.fillStyle = "rgba(255,255,255,.14)"; x.beginPath(); x.arc(W / 2, 650, 190, 0, 7); x.fill();
        x.font = "200px sans-serif"; x.textAlign = "center"; x.fillStyle = "#fff"; x.fillText("🚴", W / 2, 660); x.textAlign = "left";
      }
      x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = 18; x.fillStyle = "#fff"; x.textBaseline = "alphabetic";
      x.font = F(800, 76);
      var tl = wrap(x, r.title, W - 144, 2), y = 1130;
      tl.forEach(function (l) { x.fillText(l, 72, y); y += 88; });
      x.font = F(500, 36); x.fillStyle = "rgba(255,255,255,.88)";
      var place = (r.meet.label || "").split(",")[0];
      wrap(x, ty[0] + " · " + dLabel(r.starts_at) + (place ? " · " + place : ""), W - 144, 2).forEach(function (l) { x.fillText(l, 72, y); y += 48; });
      x.shadowBlur = 0;
      var hrs = Math.round((new Date(r.ends_at) - new Date(r.starts_at)) / 36e5), multi = hrs > 20;
      var dist = r.distance_km || (route ? routeKm(route) : null), stats = [];
      if (dist) stats.push([km(dist), "km"]);
      if (r.elevation_m) stats.push([String(r.elevation_m), "m stúpania"]);
      stats.push([multi ? String(Math.round(hrs / 24) || 1) : String(hrs), multi ? "dni" : "hodiny"]);
      stats.push([String(r.participants.length), jazdci(r.participants.length)]);
      var sy = Math.max(y + 30, 1330), sw = (W - 144 - (stats.length - 1) * 20) / stats.length;
      stats.forEach(function (st, i) {
        var sx = 72 + i * (sw + 20);
        rr(x, "rgba(255,255,255,.14)", sx, sy, sw, 170, 28);
        x.fillStyle = "#fff"; x.font = F(800, 62); x.textAlign = "center"; x.fillText(st[0], sx + sw / 2, sy + 86);
        x.font = F(500, 28); x.fillStyle = "rgba(255,255,255,.8)"; x.fillText(st[1], sx + sw / 2, sy + 134);
      });
      x.textAlign = "left";
      var ay = sy + 250;
      people.forEach(function (u, i) {
        var cx = 72 + 58 + i * 82, cy = ay + 58, im = avs[i];
        x.save(); x.beginPath(); x.arc(cx, cy, 58, 0, 7); x.closePath(); x.fillStyle = "#fff"; x.fill();
        x.beginPath(); x.arc(cx, cy, 52, 0, 7); x.clip();
        if (im) cover(x, im, cx - 52, cy - 52, 104, 104);
        else { x.fillStyle = "hsl(" + hue(u) + ",55%,48%)"; x.fillRect(cx - 52, cy - 52, 104, 104); x.fillStyle = "#fff"; x.font = F(700, 46); x.textAlign = "center"; x.textBaseline = "middle"; x.fillText((prof(u).display_name || "?").charAt(0).toUpperCase(), cx, cy + 2); x.textAlign = "left"; x.textBaseline = "alphabetic"; }
        x.restore();
      });
      var names = r.participants.map(function (u) { return u === S.uid ? "ja" : (prof(u).display_name || "biker").split(" ")[0]; });
      var nm = names.length > 4 ? names.slice(0, 3).join(", ") + " a ďalší " + (names.length - 3) : names.length > 1 ? names.slice(0, -1).join(", ") + " a " + names[names.length - 1] : names[0];
      x.font = F(700, 36); x.fillStyle = "#fff";
      wrap(x, nm, W - 144, 2).forEach(function (l, i) { x.fillText(l, 72, ay + 170 + i * 46); });
      x.font = F(600, 30); x.fillStyle = "rgba(255,255,255,.78)";
      x.fillText("Jazdi s partiou · EliteBiker Ride", 72, H - 90);
      x.textAlign = "right"; x.fillText("@elitebiker.sk", W - 72, H - 90); x.textAlign = "left";
      return toBlob(cv, false);
    });
  }

  // pozadie: fotky vybrané priamo z mobilu (nikam sa nenahrávajú)
  function dsgBgs() { return (DSG.locals || []).map(function (u, i) { return { id: "l" + i, url: u }; }); }
  function openDesign(id, o) {
    var r = find(id); if (!r) return; o = o || {};
    if (DSG.id !== id) { (DSG.locals || []).forEach(function (u) { URL.revokeObjectURL(u); }); DSG.locals = []; }
    DSG.id = id; DSG.blob = null;
    DSG.bg = DSG.locals.length ? 1 : 0;
    DSG.style = o.style || (DSG.bg ? "stats" : routeOf(r) ? "route" : "crew");
    drawDesign(); buildDesign();
  }
  function clipOk() { return !!(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write); }
  function dsgFmt() { return DSG.style === "crew" ? "story" : DSG.fmt; }
  function drawDesign(keep) {
    var r = find(DSG.id); if (!r) return;
    var bgs = dsgBgs(), st = DSG.style, fmt = dsgFmt(), stk = st === "sticker", canShare = !!(navigator.canShare && window.File), m = $("modal"), y = m.scrollTop;
    var opt = function (k, v, label, on) { return '<button type="button" data-act="dsg" data-k="' + k + '" data-v="' + v + '" class="' + (on ? "on" : "") + '">' + label + "</button>"; };
    openModal('<div class="sh-top"><button class="icb" data-act="closem" aria-label="Zavrieť">' + IC.close + '</button><b>Zdieľať jazdu</b></div><div class="pad dsg">' +
      '<div class="dprev f-' + (stk ? "stk" : fmt) + '" id="dPrev"><div class="loading">Kreslím obrázok…</div></div>' +
      '<div class="dseg">' + DSTY.map(function (s) { return opt("style", s[0], s[1], st === s[0]); }).join("") + "</div>" +
      (stk ? '<p class="small-note" style="text-align:center">Priehľadná nálepka s trasou a číslami. Vložíš ju v Instagrame na svoju fotku alebo video.</p>'
        : '<div class="dfmt">' + DFMT.map(function (f) { return opt("fmt", f[0], f[1], fmt === f[0]) .replace("<button", st === "crew" && f[0] === "post" ? "<button disabled" : "<button"); }).join("") + "</div>" +
          '<span class="fl">Pozadie</span><div class="bgs f-' + fmt + '">' + opt("bg", 0, '<span class="blue"></span>', DSG.bg === 0) +
          bgs.map(function (b, i) { return opt("bg", i + 1, '<img src="' + esc(b.url) + '" alt="">', DSG.bg === i + 1); }).join("") +
          '<label class="bgadd" title="Vybrať fotku z mobilu">' + sz(IC.plus, 20) + '<span>Fotka</span><input type="file" accept="image/*" data-up="dsgbg" hidden></label>' + "</div>") +
      '<div class="lacts" style="margin-top:16px">' + (canShare ? '<button class="btn igb" data-act="dsg-share" disabled>' + sz(IC.share, 16) + "Zdieľať</button>" : "") +
      (stk && clipOk() ? '<button class="btn" data-act="dsg-copy" disabled>Kopírovať nálepku</button>' : "") +
      '<button class="btn gh" data-act="dsg-save" disabled>Uložiť obrázok</button></div>' +
      '<p class="info">' + (stk ? "Skopíruj nálepku, otvor Instagram Story so svojou fotkou a vlož ju (podrž prst → Vložiť). Alebo ju ulož a pridaj ako obrázok." : "V Instagrame vyber <b>Príbeh</b> alebo <b>Príspevok</b> a označ <b>@elitebiker.sk</b> a partiu.") + "</p></div>");
    if (keep) m.scrollTop = y;
  }
  function buildDesign() {
    var r = find(DSG.id); if (!r) return;
    var bgs = dsgBgs(), n = ++DSG.n, bg = DSG.bg ? (bgs[DSG.bg - 1] || {}).url : null;
    DSG.blob = null;
    renderDesign(r, { style: DSG.style, fmt: dsgFmt(), bg: bg }).then(function (b) {
      if (n !== DSG.n) return;
      if (!b) throw new Error("Obrázok sa nepodarilo vytvoriť.");
      if (DSG.url) URL.revokeObjectURL(DSG.url);
      DSG.blob = b; DSG.url = URL.createObjectURL(b);
      var p = $("dPrev"); if (p) p.innerHTML = '<img src="' + DSG.url + '" alt="Náhľad obrázka na zdieľanie">';
      [].forEach.call(document.querySelectorAll("#modal .dsg .lacts .btn"), function (x) { x.disabled = false; });
    }).catch(function (e) { var p = $("dPrev"); if (p) p.innerHTML = '<p class="err">' + esc(e.message || "Obrázok sa nepodarilo vytvoriť.") + "</p>"; });
  }
  function dsgFile() { var png = DSG.style === "sticker"; return new File([DSG.blob], "elitebiker-ride-" + (png ? "nalepka.png" : dsgFmt() + ".jpg"), { type: png ? "image/png" : "image/jpeg" }); }
  function dsgShare() {
    if (!DSG.blob) return;
    var f = dsgFile();
    if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: "EliteBiker Ride" }).catch(function () {});
    else dsgSave();
  }
  function dsgSave() {
    if (!DSG.url) return;
    var a = document.createElement("a"); a.href = DSG.url; a.download = dsgFile().name; document.body.appendChild(a); a.click(); a.remove();
    toast(isIOS() ? "Podrž obrázok a vyber „Pridať do Fotiek“." : "Obrázok sa uložil. Pridaj ho na Instagram alebo Facebook.");
  }
  function dsgCopy() {
    if (!DSG.blob) return;
    navigator.clipboard.write([new window.ClipboardItem({ "image/png": DSG.blob })]).then(function () { toast("Nálepka skopírovaná ✓ Otvor Instagram Story so svojou fotkou a vlož ju."); }, function () { toast("Kopírovanie tu nefunguje, nálepku si ulož."); });
  }
  function canStory(r) { return going(r) && new Date(r.starts_at) <= new Date(Date.now() + 30 * 60e3); }

  /* ---------------- pozývací odkaz ---------------- */
  var LNK = null;
  // pozývať: organizátor vždy; pri jazde pre partiu aj tí, čo idú; verejnú môže poslať ďalej hocikto
  function canInvite(r) { return !!r && !ended(r) && (r.host === S.uid || (vis(r) === "friends" && going(r)) || vis(r) === "public"); }
  function openLink(rideId) {
    var r = rideId ? find(rideId) : null, first = (S.me.display_name || "").split(" ")[0];
    LNK = null;
    openModal('<div class="sh-top"><button class="icb" data-act="closem" aria-label="Zavrieť">' + IC.close + "</button><b>" + (r ? "Pozvať na jazdu odkazom" : "Pozvať kamoša do appky") + '</b></div><div class="pad">' +
      (r ? '<div class="rpill"><span class="ic">' + IC[TYPES[r.type][1]] + "</span><div><b>" + esc(r.title) + "</b><small>" + dLabel(r.starts_at) + " o " + hm(r.starts_at) + "</small></div></div>" : "") +
      '<p class="sub" style="margin:4px 0 14px">' + (r ? "Kto odkaz otvorí a zaregistruje sa, je <b>rovno na tejto jazde</b> a v tvojej partii." : "Kto odkaz otvorí a zaregistruje sa, bude <b>hneď v tvojej partii</b>, bez potvrdzovania.") + "</p>" +
      '<div class="shgrid">' + SHARE.filter(function (x) { return !x[3] || x[3](); }).map(function (x) {
        return '<button data-act="lnk-to" data-ch="' + x[0] + '" disabled><span class="shi" style="background:' + x[2] + '">' + (SHI[x[0]] || IC.share) + "</span>" + x[1] + "</button>"; }).join("") + "</div>" +
      '<div class="linkbox" style="margin-top:14px">' + sz(IC.link, 18) + '<input id="lnk" readonly value="Pripravujem odkaz…" aria-label="Pozývací odkaz"></div>' +
      '<p class="info">' + (r ? "Odkaz platí do konca jazdy." : "Odkaz platí 30 dní a môžeš ho poslať viacerým.") + "</p></div>");
    api.createInvite(rideId || null).then(function (code) {
      var url = shareUrl("?pozvanka=" + encodeURIComponent(code));
      var text = r ? (first || "Kamoš") + " ťa volá na jazdu 🚴 " + r.title + ", " + dLabel(r.starts_at).toLowerCase() + " o " + hm(r.starts_at) + ". Zaregistruj sa a si rovno na jazde:"
        : "Poď so mnou jazdiť na bike 🚴 Pridaj sa do mojej partie v EliteBiker Ride:";
      LNK = { url: url, text: text };
      var i = $("lnk"); if (!i) return;
      i.value = url;
      [].forEach.call(document.querySelectorAll("#modal .shgrid button"), function (b) { b.disabled = false; });
    }).catch(function (e) { closeModal(); err(e); });
  }
  // kam sa dá odkaz poslať: [kľúč, názov, farba, kedy zobraziť]
  // poradie podľa Martina; všade sa otvorí appka s výberom, komu poslať – stačí napísať meno
  var SHARE = [
    ["ig", "Instagram", "linear-gradient(45deg,#f9a825,#e91e63 50%,#7b1fa2)"],
    ["ms", "Messenger", "linear-gradient(135deg,#0099ff,#a033ff 60%,#ff5c87)"],
    ["wa", "WhatsApp", "#25D366"],
    ["more", "Ďalšie…", "#1b46e5", function () { return !!navigator.share; }],
    ["sms", "SMS", "#34C759", function () { return isMobile(); }],
    ["mail", "E-mail", "#64748b"],
    ["copy", "Kopírovať", "#11131a"]
  ];
  var BUBBLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.1A8.5 8.5 0 1 1 21 12z"/></svg>';
  var SHI = { wa: IC.wa, ms: BUBBLE, fb: IC.fb, ig: IC.ig, sms: BUBBLE, vb: BUBBLE, tg: IC.send, mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>', copy: IC.link, more: IC.share };
  function isMobile() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent)); }
  function shareTo(ch) {
    if (!LNK) return;
    var u = encodeURIComponent(LNK.url), t = encodeURIComponent(LNK.text), all = encodeURIComponent(LNK.text + " " + LNK.url);
    var open = function (href) { var w = window.open(href, "_blank", "noopener"); if (!w) location.href = href; };
    var go = function (href) { location.href = href; };
    var copyThen = function (msg, href) {
      var done = function () { toast(msg); if (href) setTimeout(function () { open(href); }, 700); };
      try { navigator.clipboard.writeText(LNK.text + " " + LNK.url).then(done, done); } catch (e) { done(); }
    };
    switch (ch) {
      case "wa": open("https://wa.me/?text=" + all); break;
      case "ms": if (isMobile()) go("fb-messenger://share/?link=" + u); else copyThen("Odkaz je skopírovaný. Napíš meno kamoša a vlož ho do správy.", "https://www.messenger.com/new"); break;
      case "fb": open("https://www.facebook.com/sharer/sharer.php?u=" + u); break;
      case "ig":
        // v mobile: systémové zdieľanie → Instagram → napíšeš meno a odošleš (odkaz je už v správe)
        if (isMobile() && navigator.share) { toast("Vyber <b>Instagram</b>, napíš meno kamoša a odošli."); navigator.share({ title: "EliteBiker Ride", text: LNK.text, url: LNK.url }).catch(function () {}); }
        else copyThen("Odkaz je skopírovaný. V Instagrame napíš meno kamoša a vlož ho do správy.", "https://www.instagram.com/direct/new/");
        break;
      case "sms": go("sms:" + (isIOS() ? "&" : "?") + "body=" + all); break;
      case "vb": go("viber://forward?text=" + all); break;
      case "tg": open("https://t.me/share/url?url=" + u + "&text=" + t); break;
      case "mail": go("mailto:?subject=" + encodeURIComponent("Poď jazdiť s EliteBiker Ride") + "&body=" + all); break;
      case "copy": copyLink(); break;
      case "more": navigator.share({ title: "EliteBiker Ride", text: LNK.text, url: LNK.url }).catch(function () {}); break;
    }
  }
  function copyLink() {
    if (!LNK) return;
    var full = LNK.text + " " + LNK.url, ok = function () { toast("Odkaz je skopírovaný. Vlož ho kamošovi do správy."); };
    var fallback = function () { var i = $("lnk"); if (i) { i.value = LNK.url; i.select(); try { document.execCommand("copy"); ok(); } catch (e) { toast("Označ odkaz a skopíruj ho."); } } };
    try { navigator.clipboard.writeText(full).then(ok, fallback); } catch (e) { fallback(); }
  }

  /* ---------------- pozvanie k existujúcej jazde ---------------- */
  var INV = [];
  function vInv(r) {
    var excl = r.participants.concat(r.audience);
    var list = S.fr.friends.filter(function (u) { return excl.indexOf(u) < 0; });
    return '<div class="sh-top"><button class="icb" data-act="closem">' + IC.close + '</button><b>Pozvať na jazdu</b></div><div class="pad"><p class="sub" style="margin-bottom:12px">' + esc(r.title) + " · " + dShort(r.starts_at) + " " + hm(r.starts_at) + "</p>" +
      '<button class="linkrow" data-act="ride-link" data-id="' + r.id + '"><span class="ic">' + IC.link + '</span><span class="grow"><b>Poslať odkaz</b><small>aj tým, čo ešte nemajú appku. Po registrácii sú rovno na jazde.</small></span></button>' +
      (list.length ? '<span class="fl">Z tvojej partie</span>' : "") +
      (list.length ? '<div class="quick"><button data-act="inv-all">👥 Všetci</button>' + S.sc.map(function (c, i) { return '<button data-act="inv-sc" data-i="' + i + '">' + esc(c.emoji) + " " + esc(c.name) + "</button>"; }).join("") + "</div>" +
        '<div class="card" style="padding:4px 16px">' + list.map(function (id) { var on = INV.indexOf(id) > -1;
          return '<div class="inv-row' + (on ? " on" : "") + '" data-act="inv-tog" data-u="' + id + '">' + pic(id) + '<div class="grow"><b>' + hn(id) + "</b><small>" + esc(contactLine(id)) + '</small></div><span class="cb">' + IC.check + "</span></div>"; }).join("") + "</div>"
        : '<div class="empty-state"><b>' + (S.fr.friends.length ? "Všetkých kamošov už si pozval" : "V appke zatiaľ nemáš kamošov") + "</b>Pošli im odkaz vyššie.</div>") +
      (list.length ? '<div class="sendbar"><div><div class="who">' + (INV.length ? INV.map(function (u) { return esc(hname(u)); }).join(", ") : "Nikto nie je vybraný") + '</div><button class="btn sm" data-act="inv-send" data-id="' + r.id + '">Pozvať ' + sz(IC.send, 14) + "</button></div></div>" : "") + "</div>";
  }

  /* ---------------- vytvorenie jazdy ---------------- */
  function resetD() { D = { type: (S.me.bike_types && S.me.bike_types[0]) || "mtb", o: 1, time: "15:00", dur: 3, endO: null, meet: null, route: null, km: "", elev: "", max: "", link: "", title: "", pace: "stredne", trails: [], note: "", inv: [], pub: !S.fr.friends.length, allowInv: true, tpl: -1, more: false }; }
  function buildTemplates(list) {
    var map = {}, out = [];
    list.forEach(function (r) {
      var k = r.type + "|" + r.title.toLowerCase();
      if (!map[k]) { map[k] = { title: r.title, type: r.type, starts_at: r.starts_at, ends_at: r.ends_at, meet: r.meet, route: r.route, km: r.distance_km, elev: r.elevation_m, max: r.max_people, link: r.link_url, pace: r.pace, trails: r.trails, note: r.note, vis: r.visibility, who: r.participants.filter(function (u) { return u !== S.uid; }), n: 0 }; out.push(map[k]); }
      map[k].n++;
    });
    return out.slice(0, 4);
  }
  function applyTpl(i) {
    var t = S.tpl[i], s = new Date(t.starts_at);
    D.tpl = i; D.type = TYPES[t.type] ? t.type : "mtb"; D.title = t.title; D.meet = t.meet; D.route = t.route; D.km = t.km ? String(t.km) : ""; D.pace = t.pace || "stredne"; D.trails = (t.trails || []).slice(); D.note = t.note || "";
    D.elev = t.elev ? String(t.elev) : ""; D.max = t.max ? String(t.max) : ""; D.link = t.link || "";
    D.time = String(s.getHours()).padStart(2, "0") + ":" + String(s.getMinutes()).padStart(2, "0");
    var h = Math.max(1, Math.round((new Date(t.ends_at) - s) / 36e5));
    D.dur = h > 10 ? 3 : DURS.some(function (x) { return x[0] === h; }) ? h : 3; D.endO = null;
    D.more = !!(D.elev || D.max || D.link || (D.note && D.note.length > 60));
    D.inv = t.who.filter(isFriend); if (VIS[t.vis]) { D.pub = t.vis === "public"; D.allowInv = t.vis !== "private"; }
    for (var k = 1; k <= 7; k++) { var x = new Date(); x.setDate(x.getDate() + k); if (x.getDay() === s.getDay()) { D.o = k > 6 ? 1 : k; break; } }
  }
  var DURS = [[1, "1 hodinu"], [2, "2 hodiny"], [3, "3 hodiny"], [4, "4 hodiny"], [5, "5 hodín"], [6, "6 hodín"], [8, "8 hodín"], [10, "Celý deň"], ["multi", "Viac dní…"]];
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function dayAt(o) { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + o); return d; }
  function offOf(v) { var p = String(v || "").split("-"); if (p.length !== 3) return null; var d = new Date(+p[0], +p[1] - 1, +p[2], 12); return Math.round((d - dayAt(0)) / 864e5); }
  function fmtDay(d) { return DS[d.getDay()] + " " + d.getDate() + ". " + (d.getMonth() + 1) + "."; }
  function vCreate() {
    var far = D.o > 6 || D.o < 0, days = "", ed = !!D.edit;
    for (var i = 0; i < 7; i++) { var d = dayAt(i); days += '<button type="button" data-act="d" data-k="o" data-v="' + i + '" class="' + (D.o === i ? "on" : "") + '">' + (i === 0 ? "Dnes" : i === 1 ? "Zajtra" : DS[d.getDay()]) + "<b>" + d.getDate() + "</b></button>"; }
    var datebtn = '<label class="datebtn' + (far ? " on" : "") + '">' + sz(IC.cal, 18) + "<span>" + (far ? "<b>" + DN[dayAt(D.o).getDay()] + " " + dayAt(D.o).getDate() + ". " + (dayAt(D.o).getMonth() + 1) + ". " + dayAt(D.o).getFullYear() + "</b><small>zmeniť dátum</small>" : "<b>Iný dátum</b><small>napr. o týždeň alebo o mesiac</small>") + "</span>" +
      '<input type="date" id="f-date" aria-label="Vybrať dátum" min="' + ymd(dayAt(Math.min(0, D.o))) + '" max="' + ymd(dayAt(400)) + '" value="' + ymd(dayAt(D.o)) + '"></label>';
    var tpl = ed ? "" : S.tpl.map(function (h, i) { var ty = TYPES[h.type] || TYPES.mtb; return '<button type="button" data-act="tpl" data-i="' + i + '" class="' + (D.tpl === i ? "on" : "") + '"><span class="ty">' + IC[ty[1]] + ty[0] + " · " + hm(h.starts_at) + "</span><b>" + esc(h.title) + "</b><small>" + [h.km ? km(h.km) + " km" : "", rideStyle(h)].filter(Boolean).join(" · ") + "</small><small style=\"margin-top:3px\">" + esc((h.meet.label || "").split(",")[0]) + " · " + h.n + "×</small><div class=\"stack\">" + h.who.slice(0, 4).map(function (u) { return pic(u, "s"); }).join("") + "</div></button>"; }).join("");
    var multi = D.dur === "multi", moreOpen = D.more === true || ((far || multi) && D.more !== "closed");
    var filled = [D.km, D.elev, D.max, D.link, D.note].filter(function (x) { return x && String(x).trim(); }).length;
    var durs = DURS.slice();
    if (D.dur !== "multi" && !DURS.some(function (x) { return String(x[0]) === String(D.dur); })) { durs.push([D.dur, durText(D.dur)]); durs.sort(function (a, b) { return (a[0] === "multi" ? 99 : a[0]) - (b[0] === "multi" ? 99 : b[0]); }); }
    return '<div class="sh-top"><button class="icb" data-act="' + (ed ? "edit-back" : "close") + '"' + (ed ? ' data-id="' + D.edit + '"' : "") + ' aria-label="Zavrieť">' + IC.close + "</button><b>" + (ed ? "Upraviť jazdu" : "Nová jazda") + "</b></div><form class=\"pad\" id=\"nform\" novalidate>" +
      (tpl ? '<span class="fl" style="margin-top:4px">' + sz(IC.repeat, 13) + ' Zopakuj obvyklú jazdu</span><div class="tpl">' + tpl + "</div>" + (D.tpl > -1 ? '<div class="filled">' + IC.check + "Vyplnené podľa „" + esc(S.tpl[D.tpl].title) + "“. Skontroluj deň a čas.</div>" : "") : "") +
      '<span class="fl">Na čom ideš?</span><div class="types t' + Object.keys(TYPES).length + '">' + Object.keys(TYPES).map(function (k) { return '<button type="button" data-act="d" data-k="type" data-v="' + k + '" class="' + (D.type === k ? "on" : "") + '">' + IC[TYPES[k][1]] + "<span>" + TYPES[k][0] + "</span></button>"; }).join("") + "</div>" +
      '<span class="fl">Kedy?</span><div class="days">' + days + "</div>" + datebtn +
      '<div class="two" style="margin-top:10px"><div><span class="fl" style="margin-top:0">Štart o</span><input class="inp" type="time" id="f-time" value="' + D.time + '"></div><div><span class="fl" style="margin-top:0">Ako dlho</span><select class="inp" id="f-dur">' + durs.map(function (x) { return '<option value="' + x[0] + '"' + (String(D.dur) === String(x[0]) ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></div></div>" +
      (multi ? '<span class="fl">Posledný deň</span><input class="inp" type="date" id="f-end" min="' + ymd(dayAt(D.o + 1)) + '" max="' + ymd(dayAt(D.o + 30)) + '" value="' + ymd(dayAt(D.endO != null && D.endO > D.o ? D.endO : D.o + 1)) + '">' : "") +
      (D.o > 6 ? '<p class="hint">' + sz(IC.cal, 14) + " Jazda je o " + D.o + " dní. Pridaj partii viac podrobností nižšie.</p>" : "") +
      '<span class="fl">Kde je stretko?</span><button type="button" class="field' + (D.meet ? " set" : "") + '" data-act="pick-meet"><span class="ic">' + IC.pin + '</span><div class="grow"><b>' + (D.meet ? "Stretko" : "Vybrať miesto na mape") + "</b><small>" + (D.meet ? esc(D.meet.label) : "Posuň mapu a polož špendlík ako vo Wolte") + "</small></div>" + sz(IC.back, 16).replace("<svg", '<svg style="transform:rotate(180deg);color:var(--li)"') + "</button>" +
      (D.meet ? '<div class="lmap sm" id="fmap" style="margin-top:8px"></div>' : "") +
      (hasPace(D.type) ? '<span class="fl">Trasa <small>nepovinné</small></span><button type="button" class="field' + (D.route ? " set" : "") + '" data-act="pick-route"' + (D.meet ? "" : " disabled") + '><span class="ic">' + IC.route + '</span><div class="grow"><b>' + (D.route ? "Trasa · " + esc(D.km) + " km" : "Nakresliť trasu na mape") + "</b><small>" + (D.route ? D.route.length + " bodov, ťukni a uprav" : D.meet ? "Ťukaj na mapu, kadiaľ pôjdete" : "Najprv vyber stretko") + "</small></div></button>" : "") +
      '<span class="fl">Kam? <small>názov jazdy</small></span><input class="inp" id="f-title" maxlength="80" value="' + esc(D.title) + '" placeholder="napr. Manín, Súľov, pumptrack" enterkeyhint="done">' +
      (hasPace(D.type) ? '<span class="fl">Tempo</span><div class="seg3">' + Object.keys(PACE).map(function (k) { return '<button type="button" data-act="d" data-k="pace" data-v="' + k + '" class="' + (D.pace === k ? "on" : "") + '">' + PACE[k] + "</button>"; }).join("") + "</div>" : "") +
      (hasTrails(D.type) ? '<span class="fl">Aké traily? <small>môžeš vybrať viac</small></span><div class="trails">' + Object.keys(TRAILS).map(function (k) { var on = D.trails.indexOf(k) > -1; return '<button type="button" data-act="trail" data-v="' + k + '" class="' + (on ? "on" : "") + '" aria-pressed="' + on + '"><i style="background:' + TRAILS[k][2] + '"></i><b>' + TRAILS[k][0] + "</b><small>" + TRAILS[k][1] + "</small></button>"; }).join("") + "</div>" : "") +
      '<button type="button" class="more' + (moreOpen ? " open" : "") + '" data-act="more" aria-expanded="' + moreOpen + '"><span>' + (moreOpen ? "Podrobnosti" : "＋ Pridať podrobnosti") + (filled ? ' <i class="cnt">' + filled + "</i>" : "") + "</span><small>dĺžka, prevýšenie, limit ľudí, odkaz, popis</small>" + sz(IC.back, 16).replace("<svg", '<svg class="chev"') + "</button>" +
      '<div class="morebox"' + (moreOpen ? "" : " hidden") + ">" +
      '<div class="two"><div><span class="fl">Dĺžka (km)</span><input class="inp" id="f-km" inputmode="decimal" value="' + esc(D.km) + '" placeholder="napr. 35"></div><div><span class="fl">Prevýšenie (m)</span><input class="inp" id="f-elev" inputmode="numeric" value="' + esc(D.elev) + '" placeholder="napr. 800"></div></div>' +
      '<div class="two"><div><span class="fl">Max. ľudí</span><input class="inp" id="f-max" inputmode="numeric" value="' + esc(D.max) + '" placeholder="bez limitu"></div><div><span class="fl">Odkaz</span><input class="inp" id="f-link" type="url" inputmode="url" autocapitalize="off" value="' + esc(D.link) + '" placeholder="Strava, Komoot…"></div></div>' +
      '<span class="fl">Popis a plán</span><textarea class="inp" id="f-note" rows="' + (moreOpen && (far || multi) ? 4 : 2) + '" maxlength="2000" placeholder="' + (far || multi ? "napr. program, kde spíme, čo zobrať, štartovné…" : "napr. beriem svetlá, po jazde káva") + '">' + esc(D.note) + "</textarea></div>" +
      '<div style="height:18px"></div><button class="btn full" type="submit" id="nsubmit">' + (ed ? IC.check + "Uložiť zmeny" : "Ďalej: komu pošleš jazdu →") + "</button>" +
      (ed ? '<p class="info">Kto ide alebo je pozvaný, uvidí jazdu už so zmenami.</p>' : "") + "</form>";
  }
  var fmap = null, fmapTok = 0;
  function saveD() {
    var g = function (id) { var e = $(id); return e ? e.value : null; };
    if ($("f-time")) {
      D.time = g("f-time") || D.time; var dv = g("f-dur"); D.dur = dv === "multi" ? "multi" : (+dv || D.dur); D.title = g("f-title");
      if ($("f-end")) { var eo = offOf(g("f-end")); if (eo != null) D.endO = eo; }
      if ($("f-km")) { D.km = g("f-km"); D.elev = g("f-elev"); D.max = g("f-max"); D.link = g("f-link"); D.note = g("f-note"); }
    }
  }
  function drawCreate(keep) {
    if (fmap) { fmap.remove(); fmap = null; }
    var sh = $("sheet"), y = sh.scrollTop; sh.dataset.kind = "create"; sh.innerHTML = vCreate(); sh.scrollTop = keep ? y : 0;
    $("nform").onsubmit = function (e) { e.preventDefault(); saveD(); if (!D.meet) { toast("Vyber miesto stretka na mape."); return; } if (D.edit) saveEdit(); else drawSend(); };
    // pri rýchlom ťukaní sa formulár prekreslí viackrát, mapu vytvoríme len pre posledné prekreslenie
    var tok = ++fmapTok;
    if (D.meet && window.EBMap) setTimeout(function () { var el = $("fmap"); if (el && tok === fmapTok && !fmap) fmap = EBMap.showRide(el, { meet: D.meet, route: D.route }); }, 60);
    $("f-date").onclick = function () { try { if (this.showPicker) this.showPicker(); } catch (e) {} };
    $("f-date").onchange = function () { var o = offOf(this.value); if (o == null || o < 0) return; saveD(); D.o = o; if (D.endO != null && D.endO <= o) D.endO = null; drawCreate(true); };
    $("f-dur").onchange = function () { var was = D.dur; saveD(); if ((was === "multi") !== (D.dur === "multi")) drawCreate(true); };
  }
  function durText(h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); return [hh ? hh + " h" : "", mm ? mm + " min" : ""].filter(Boolean).join(" ") || "30 min"; }
  function dayOff(t) { var x = new Date(t); x.setHours(12, 0, 0, 0); return Math.round((x - dayAt(0)) / 864e5); }
  // formulár predvyplnený z jazdy, ktorú organizátor upravuje
  function rideToD(r) {
    resetD();
    var s = new Date(r.starts_at), e = new Date(r.ends_at), h = Math.round((e - s) / 36e5 * 100) / 100;
    D.edit = r.id; D.type = TYPES[r.type] ? r.type : "mtb"; D.o = dayOff(s);
    D.time = String(s.getHours()).padStart(2, "0") + ":" + String(s.getMinutes()).padStart(2, "0");
    if (h > 10 && dayOff(e) > D.o) { D.dur = "multi"; D.endO = dayOff(e); } else D.dur = h;
    D.meet = { lat: r.meet.lat, lng: r.meet.lng, label: r.meet.label };
    D.route = r.route && r.route.length ? r.route.map(function (p) { return p.slice(); }) : null;
    D.km = r.distance_km ? String(r.distance_km).replace(".", ",") : ""; D.elev = r.elevation_m ? String(r.elevation_m) : "";
    D.max = r.max_people ? String(r.max_people) : ""; D.link = r.link_url || ""; D.title = r.title || ""; D.note = r.note || "";
    D.pace = r.pace || "stredne"; D.trails = (r.trails || []).slice();
    D.more = !!(D.elev || D.max || D.link || D.note || (D.km && !hasPace(D.type)));
    D.orig = { o: D.o, time: D.time, dur: String(D.dur), endO: D.endO };
  }
  function openEdit(id) {
    var r = find(id); if (!r || r.host !== S.uid) return;
    if (ended(r)) { toast("Skončenú jazdu už nemôžeš upraviť."); return; }
    if (dmap) { dmap.remove(); dmap = null; }
    if (S.unsubChat) { S.unsubChat(); S.unsubChat = null; }
    closeModal(); rideToD(r); openSheet("create", ""); drawCreate();
  }
  function timeChanged() { var o = D.orig; return !o || D.o !== o.o || D.time !== o.time || String(D.dur) !== o.dur || (D.dur === "multi" && D.endO !== o.endO); }
  // spoločné overenie formulára pre novú aj upravovanú jazdu; null = niečo nesedí (už sme to povedali)
  function rideRow(withTime) {
    var row = {};
    if (withTime) {
      var st = startsAt(), en;
      if (st < new Date(Date.now() - 10 * 60e3)) { toast("Tento čas už bol. Vyber neskorší."); return null; }
      if (D.dur === "multi") { en = dayAt(D.endO != null && D.endO > D.o ? D.endO : D.o + 1); en.setHours(20, 0, 0, 0); } else en = new Date(st.getTime() + D.dur * 36e5);
      row.starts_at = st.toISOString(); row.ends_at = en.toISOString();
    }
    var mx = String(D.max || "").trim() ? parseInt(D.max, 10) : null, el = String(D.elev || "").trim() ? parseInt(D.elev, 10) : null, ln = String(D.link || "").trim();
    if (mx != null && !(mx >= 2 && mx <= 500)) { toast("Max. počet ľudí: 2 až 500 (alebo nechaj prázdne)."); return null; }
    if (ln && !/^https?:\/\//i.test(ln)) ln = "https://" + ln;
    if (ln && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(ln)) { toast("Odkaz nevyzerá správne, skopíruj celú adresu."); return null; }
    var title = (D.title || "").trim() || (TYPES[D.type][0] + " · " + (D.meet.addr || D.meet.label || "").split(",")[0]);
    var km = parseFloat(String(D.km || "").replace(",", "."));
    row.type = D.type; row.title = title.slice(0, 80); row.note = (D.note || "").trim().slice(0, 2000);
    row.elevation_m = isFinite(el) ? el : null; row.max_people = mx; row.link_url = ln ? ln.slice(0, 300) : null;
    row.meet = { lat: D.meet.lat, lng: D.meet.lng, label: D.meet.label }; row.route = hasPace(D.type) ? D.route : null; row.distance_km = isFinite(km) ? km : null;
    row.pace = hasPace(D.type) ? D.pace : null; row.trails = hasTrails(D.type) && D.trails.length ? D.trails.slice() : null;
    return row;
  }
  function saveEdit() {
    var id = D.edit, row = rideRow(timeChanged()); if (!row) return;
    if (!row.note) row.note = null;
    var b = $("nsubmit"); if (b) { b.disabled = true; b.innerHTML = '<span class="spin-sm"></span>Ukladám…'; }
    api.updateRide(id, row).then(function () {
      if (fmap) { fmap.remove(); fmap = null; }
      toast("Zmeny sú uložené.");
      return loadAll().then(function () { render(true); openRide(id); });
    }).catch(function (e) { if (b) { b.disabled = false; b.innerHTML = IC.check + "Uložiť zmeny"; } err(e); });
  }
  function openCreate(tplI) {
    S.openId = null; closeModal();
    var go = function () { resetD(); if (tplI != null && S.tpl[tplI]) applyTpl(tplI); openSheet("create", ""); drawCreate(); };
    api.myTemplates().then(function (l) { S.tpl = buildTemplates(l); go(); }).catch(go);
  }
  function startsAt() { var d = new Date(); d.setDate(d.getDate() + D.o); var p = (D.time || "15:00").split(":"); d.setHours(+p[0], +p[1], 0, 0); return d; }
  function same(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (b.indexOf(a[i]) < 0) return false; return true; }
  function dVis() { return D.pub ? "public" : D.allowInv ? "friends" : "private"; }
  function vSend() {
    var sel = D.inv, ty = TYPES[D.type], all = S.fr.friends.length && same(sel, S.fr.friends), st = startsAt();
    var who = [];
    if (D.pub) who.push("🌍 Verejnosť");
    if (sel.length) who.push(all ? "Všetci priatelia" : sel.map(function (u) { return esc(hname(u)); }).join(", "));
    return '<div class="sh-top"><button class="icb" data-act="closem">' + IC.back + '</button><b>Komu pošleš jazdu?</b></div><div class="pad">' +
      '<div class="rpill"><span class="ic">' + IC[ty[1]] + "</span><div><b>" + esc(D.title || ty[0] + " · " + ((D.meet && (D.meet.addr || D.meet.label) || "").split(",")[0] || "jazda")) + "</b><small>" + dLabel(st.toISOString()) + " o " + esc(D.time) + (D.km ? " · " + esc(D.km) + " km" : "") + (rideStyle({ type: D.type, pace: D.pace, trails: D.trails }) ? " · " + rideStyle({ type: D.type, pace: D.pace, trails: D.trails }) : "") + "</small></div></div>" +
      '<span class="fl">Skratky</span><div class="scs"><button data-act="pub" class="pubsc' + (D.pub ? " on" : "") + '"><i>🌍</i>Verejnosť<small>bikeri do ' + RADIUS + " km</small></button>" +
      (S.fr.friends.length ? '<button data-act="sc-all" class="' + (all ? "on" : "") + '"><i>👥</i>Priatelia<small>' + S.fr.friends.length + " " + ludi(S.fr.friends.length) + "</small></button>" +
        S.sc.map(function (c, i) { var m = c.members.filter(isFriend), on = sel.length && same(sel, m); return '<button data-act="sc" data-i="' + i + '" class="' + (on ? "on" : "") + '"><i>' + esc(c.emoji) + "</i>" + esc(c.name) + "<small>" + m.map(function (u) { return esc(hname(u).split(/[._]/)[0]); }).join(", ") + "</small></button>"; }).join("") +
        '<button class="add" data-act="sc-new"><i>＋</i>Nová skratka<small>z vybraných</small></button>' : "") + "</div>" +
      (S.scNew ? '<div class="scform"><input id="scname" placeholder="Názov, napr. Nedeľná partia" maxlength="30"><button class="btn sm" data-act="sc-save">Uložiť</button></div>' : "") +
      (D.pub ? '<p class="info" style="text-align:left">🌍 Jazdu uvidia a pridať sa môžu všetci bikeri do ' + RADIUS + " km. Kto sa pridá, uvidí meno a kontakt ostatných jazdcov.</p>" : "") +
      (!S.fr.friends.length ? '<div class="nofr"><b>V appke ešte nemáš kamošov</b><small>Nevadí. Jazdu uvidia bikeri z okolia, alebo po uložení pošli kamošom odkaz. Kto sa cez neho zaregistruje, je rovno na jazde.</small></div>' :
        '<span class="fl">Priatelia</span><div class="card" style="padding:4px 16px">' + S.fr.friends.map(function (id) { var on = sel.indexOf(id) > -1; return '<div class="inv-row' + (on ? " on" : "") + '" data-act="s-tog" data-u="' + id + '">' + pic(id) + '<div class="grow"><b>' + hn(id) + "</b><small>" + esc([contactLine(id), prof(id).city].filter(Boolean).join(" · ")) + '</small></div><span class="cb">' + IC.check + "</span></div>"; }).join("") + "</div>" +
        '<p class="info" style="text-align:left">' + sz(IC.link, 13) + " Kamošom bez appky pošleš po uložení odkaz.</p>") +
      (D.pub ? "" : '<div class="chkrow' + (D.allowInv ? "" : " on") + '" data-act="allowinv" role="checkbox" aria-checked="' + !D.allowInv + '" tabindex="0"><span class="box">' + IC.check + '</span><div><b>Na jazdu môžu ísť len tí, ktorých pozvem</b><small>' + (D.allowInv ? "Teraz môžu účastníci pozvať aj svojich kamošov. Zaškrtni, ak to nechceš." : "🔒 Jazdu uvidia len tebou vybraní. Ďalej ju nikto nepošle.") + "</small></div></div>") +
      '<div class="sendbar"><div><div class="who">' + (who.length ? who.join(" + ") : S.fr.friends.length ? "Nikto nie je vybraný" : "Pozveš odkazom") + "<small>" + (sel.length ? sel.length + " " + ludi(sel.length) + " dostane pozvánku" + (D.pub ? " + bikeri v okolí" : "") : D.pub ? "uvidia ju bikeri do " + RADIUS + " km" : S.fr.friends.length ? "vyber kamošov alebo pošli odkaz" : "odkaz pošleš hneď po uložení") + '</small></div><button class="btn sm" data-act="dosend" id="dosend">' + sendLabel() + "</button></div></div></div>";
  }
  function sendLabel() { return D.inv.length ? "Odoslať " + sz(IC.send, 14) : D.pub ? "Zverejniť" : "Uložiť jazdu"; }
  function drawSend(keep) { var m = $("modal"), y = m.scrollTop; m.innerHTML = vSend(); m.scrollTop = keep ? y : 0; m.classList.add("open"); var n = $("scname"); if (n) n.focus(); }
  function createRide() {
    var row = rideRow(true); if (!row) return;
    var b = $("dosend"); if (b) { b.disabled = true; b.innerHTML = '<span class="spin-sm" style="border-top-color:var(--b);border-color:rgba(27,70,229,.25)"></span>'; }
    row.visibility = dVis(); row.audience_kind = same(D.inv, S.fr.friends) ? "friends" : "pick";
    api.createRide(row, D.inv.slice()).then(function (id) {
      closeModal(); $("sheet").classList.remove("open"); if (fmap) { fmap.remove(); fmap = null; }
      S.tab = "feed"; S.filter = "all"; S.pts = null;
      S.fresh = id;
      toast(D.pub ? "Jazda je verejná 🌍 Uvidia ju bikeri do " + RADIUS + " km." : D.inv.length ? "Jazdu dostal" + (D.inv.length === 1 ? "" : "i") + " <b>" + D.inv.length + "</b> " + (D.inv.length === 1 ? "kamoš" : "kamoši") + ". Ostatní ju nevidia." : "Jazda uložená. Teraz pošli kamošom odkaz.");
      return loadAll().then(function () { render(); openRide(id); });
    }).catch(function (e) { if (b) { b.disabled = false; b.innerHTML = sendLabel(); } err(e); });
  }

  /* ---------------- poloha pre verejné jazdy = mesto z profilu ---------------- */
  // verejné jazdy do 30 km sa rátajú od mesta v profile (stred mesta, nie presná poloha)
  function autoLocation(city) {
    city = String(city || "").trim();
    if (!window.EBMap) return;
    if (!city) { if (S.loc) api.clearLocation().then(function () { S.loc = null; return loadAll(); }).then(function () { render(true); }).catch(function () {}); return; }
    if (S.loc && S.loc.label === city) return;
    EBMap.towns(city).then(function (l) {
      if (!l || !l[0]) return;
      return api.setLocation({ lat: l[0].lat, lng: l[0].lng, label: city }).then(function (x) { S.loc = x; return loadAll(); }).then(function () { render(true); });
    }).catch(function () {});
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
    var inv = S.rides.filter(invitedMe), bad = wxBadRides(), html = '<div class="sh-top"><button class="icb" data-act="closem">' + IC.close + '</button><b>Upozornenia</b></div><div class="pad">';
    html += bad.map(function (r) { var w = wxEval(r); return '<div class="card nt new wxn" data-act="open" data-id="' + r.id + '"><span class="wxe">' + wxEmoji(w.sym) + '</span><div style="flex:1"><p><b>Zlé počasie:</b> ' + esc(r.title) + ", " + dShort(r.starts_at).toLowerCase() + " o " + hm(r.starts_at) + "</p><small>Hlásia " + esc(w.bad.join(", ")) + " · " + (w.tmin === w.tmax ? w.tmax : w.tmin + " až " + w.tmax) + " °C" + (w.pr ? " · " + String(w.pr).replace(".", ",") + " mm" : "") + "</small></div></div>"; }).join("");
    if (!inv.length && !S.fr.incoming.length && !bad.length) html += '<div class="empty-state"><i>🔔</i><b>Nič nové</b>Tu uvidíš pozvánky na jazdy a žiadosti o priateľstvo.</div>';
    html += S.fr.incoming.map(function (id) { return '<div class="card nt new">' + pic(id) + '<div style="flex:1"><p><b>' + hn(id) + '</b> ti poslal žiadosť o priateľstvo</p><div class="acts"><button class="btn sm" data-act="accept" data-u="' + id + '">Prijať</button><button class="btn sm gh" data-act="decline" data-u="' + id + '">Odmietnuť</button></div></div></div>'; }).join("");
    html += inv.map(function (r) { return '<div class="card nt new">' + pic(r.host) + '<div style="flex:1"><p><b>' + hn(r.host) + "</b> ťa pozýva: <b>" + esc(r.title) + "</b>, " + dShort(r.starts_at).toLowerCase() + " o " + hm(r.starts_at) + '</p><div class="acts"><button class="btn sm" data-act="join" data-id="' + r.id + '">Pridám sa</button><button class="btn sm gh" data-act="open" data-id="' + r.id + '">Detail</button></div></div></div>'; }).join("");
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
      case "person": S.person = u; if (u === S.uid) { closeModal(); if ($("sheet").classList.contains("open")) closeSheet(); S.tab = "profile"; render(); } else openModal(vPerson(u)); break;
      case "person-ride": closeModal(); openRide(id); break;
      case "close": closeSheet(); break;
      case "closem": if (pmap) { pmap.remove(); pmap = null; } closeModal(); break;
      case "scrim": if ($("modal").classList.contains("open")) closeModal(); else closeSheet(); break;
      case "join": (function () {
        var r = find(id); if (!r) return;
        if (!going(r) && isFull(r)) { toast("Jazda je už plná."); return; }
        var p = going(r) ? api.leaveRide(id) : api.joinRide(id);
        p.then(function () { toast(going(r) ? "Odhlásil si sa z jazdy." : "Ideš! Odomkol sa ti chat jazdy."); S.pts = null; return loadAll(); })
          .then(function () { render(true); if ($("modal").classList.contains("open") && !$("pickRoot")) openModal(vNotif()); if (S.openId === id) openRide(id); }).catch(err);
      })(); break;
      case "cancel": if (el.dataset.sure) { api.cancelRide(id).then(function () { toast("Jazda zrušená."); closeSheet(); return refresh(); }).catch(err); } else { el.dataset.sure = 1; el.textContent = "Naozaj zrušiť?"; el.classList.add("danger"); } break;
      case "share-ride": if (canInvite(find(id))) { openLink(id); break; } (function () { var r = find(id); share((hname(r.host)) + " ide " + TYPES[r.type][0].toLowerCase() + ", " + dLabel(r.starts_at).toLowerCase() + " o " + hm(r.starts_at) + ": " + r.title + ".", shareUrl("#jazda-" + r.id)); })(); break;
      case "invite-link": openLink(null); break;
      case "ride-link": openLink(id); break;
      case "lnk-to": shareTo(el.dataset.ch); break;
      case "lg": LG.mode = el.dataset.m; LG.sent = false; var ae = $("a-email") || $("c-email"); if (ae) LG.email = ae.value.trim(); renderLogin(); break;
      case "lg-resend": api.resendSignup(LG.email).then(function () { toast("Poslali sme nový kód."); }).catch(err); break;
      case "eye": (function () { var i = $(el.dataset.for); if (i) { i.type = i.type === "password" ? "text" : "password"; el.classList.toggle("on", i.type === "text"); } })(); break;
      case "pw": openPw(); break;
      case "cal": openCal(id); break;
      case "push-on": pushOn(); break;
      case "push-off": pushOff(); break;
      case "push-test": pushTest(); break;
      case "install": installNow(); break;
      case "push-blocked": openModal(vBlocked()); break;
      case "story": openDesign(id); break;
      case "dsg": (function () { var k = el.dataset.k, v = el.dataset.v; if (k === "bg") DSG.bg = +v; else DSG[k] = v; drawDesign(true); buildDesign(); })(); break;
      case "dsg-photo": (function () { var r = find(S.openId), p = r && (S.photos[r.id] || [])[+el.dataset.i]; if (p) openDesign(r.id, { photo: p.id }); })(); break;
      case "dsg-share": dsgShare(); break;
      case "dsg-save": dsgSave(); break;
      case "dsg-copy": dsgCopy(); break;
      case "ics": (function () { var r = find(id); if (r) { downloadIcs(r); closeModal(); } })(); break;
      case "more": saveD(); D.more = el.classList.contains("open") ? "closed" : true; drawCreate(true); break;
      case "create": openCreate(); break;
      case "edit-ride": openEdit(id); break;
      case "add-phone": closeModal(); if ($("sheet").classList.contains("open")) closeSheet(); S.tab = "profile"; S.editing = true; render(); setTimeout(function () { var t = $("e-tel"); if (t) { t.scrollIntoView({ block: "center" }); t.focus(); } }, 120); break;
      case "edit-back": if (fmap) { fmap.remove(); fmap = null; } openRide(id); break;
      case "pref": togglePref(el.dataset.k); break;
      case "pref-retry": PREF.err = false; loadPrefs(); drawPrefs(); break;
      case "pref-open": PREF.open = !PREF.open; drawPrefs(); break;
      case "repeat": openCreate(+el.dataset.i); break;
      case "tpl": saveD(); var ti = +el.dataset.i; if (D.tpl === ti) resetD(); else applyTpl(ti); drawCreate(true); break;
      case "d": saveD(); D[el.dataset.k] = el.dataset.k === "o" ? +el.dataset.v : el.dataset.v; drawCreate(true); break;
      case "trail": saveD(); (function (k) { var i = D.trails.indexOf(k); if (i > -1) D.trails.splice(i, 1); else D.trails.push(k); })(el.dataset.v); drawCreate(true); break;
      case "pick-meet": openPicker("meet"); break;
      case "pick-route": if (D.meet) openPicker("route"); break;
      case "sc-all": D.inv = same(D.inv, S.fr.friends) ? [] : S.fr.friends.slice(); drawSend(true); break;
      case "sc": var mm = S.sc[+el.dataset.i].members.filter(isFriend); D.inv = same(D.inv, mm) ? [] : mm; drawSend(true); break;
      case "s-tog": var ix = D.inv.indexOf(u); if (ix > -1) D.inv.splice(ix, 1); else D.inv.push(u); drawSend(true); break;
      case "sc-new": if (!D.inv.length) { toast("Najprv vyber kamošov, z ktorých bude skratka."); return; } S.scNew = !S.scNew; drawSend(true); break;
      case "sc-save": var nm = ($("scname").value || "").trim(); if (!nm) { toast("Napíš názov skratky."); return; }
        api.saveShortcut({ name: nm, emoji: "⭐", members: D.inv.slice() }).then(function (s) { S.sc.push(s); S.scNew = false; drawSend(true); toast("Skratka <b>" + esc(nm) + "</b> uložená."); }).catch(err); break;
      case "pub": D.pub = !D.pub; drawSend(true); break;
      case "allowinv": D.allowInv = !D.allowInv; drawSend(true); break;
      case "vis": openModal(vVis(find(id))); break;
      case "vis-set": (function () { var v = el.dataset.v, r = find(id); if (!r || vis(r) === v) { closeModal(); return; }
        api.setVisibility(id, v).then(function () { closeModal(); toast(VIS[v][0] + " Jazda je teraz: <b>" + VIS[v][1].toLowerCase() + "</b>."); return loadAll(); }).then(function () { render(true); if (S.openId === id) openRide(id); }).catch(err); })(); break;
      case "dosend": createRide(); break;
      case "invmodal": INV = []; openModal(vInv(find(id))); break;
      case "inv-tog": var j = INV.indexOf(u); if (j > -1) INV.splice(j, 1); else INV.push(u); (function () { var m = $("modal"), y = m.scrollTop; m.innerHTML = vInv(find(S.openId)); m.scrollTop = y; })(); break;
      case "inv-all": case "inv-sc": (function () { var r = find(S.openId), ex = r.participants.concat(r.audience); INV = (a === "inv-all" ? S.fr.friends : S.sc[+el.dataset.i].members).filter(function (x) { return isFriend(x) && ex.indexOf(x) < 0; }); $("modal").innerHTML = vInv(r); })(); break;
      case "inv-send": if (!INV.length) { toast("Vyber aspoň jedného kamoša."); return; } (function () { var n = INV.length; api.invite(id, INV.slice()).then(function () { INV = []; closeModal(); toast("Pozvánka odoslaná " + n + (n === 1 ? " kamošovi." : " kamošom.")); return refresh(); }).catch(err); })(); break;
      case "viewph": openModal(vPhoto(+el.dataset.i)); break;
      case "delph": (function () { var r = find(S.openId), p = S.photos[r.id][+el.dataset.i]; api.deletePhoto(p).then(function () { closeModal(); toast("Fotka zmazaná."); loadPhotos(r.id); }).catch(err); })(); break;
      case "addfriend": api.requestFriend(u).then(function () { toast("Žiadosť odoslaná <b>" + esc(hname(u)) + "</b>."); return loadAll(); }).then(function () { render(true); modalAfterFriend(); }).catch(err); break;
      case "accept": api.acceptFriend(u).then(function () { toast("<b>" + esc(hname(u)) + "</b> je v tvojej partii."); return loadAll(); }).then(function () { render(true); modalAfterFriend(); }).catch(err); break;
      case "decline": case "unfriend": api.removeFriend(u).then(loadAll).then(function () { render(true); modalAfterFriend(); }).catch(err); break;
      case "edit": S.editing = !S.editing; render(true); break;
      case "bike-new": openBike(); break;
      case "bike-brand": BK.q = el.dataset.v; $("bq").value = BK.q; $("bres").innerHTML = bikeResults(); break;
      case "bike-eb": BK.eb = !BK.eb; $("bres").innerHTML = bikeResults(); break;
      case "bike-add": addBike({ catalog_id: +el.dataset.c }).catch(function () {}); break;
      case "bike-del": if (el.dataset.sure) { api.deleteBike(id).then(function () { S.B[S.uid] = bikesOf(S.uid).filter(function (b) { return b.id !== id; }); render(true); toast("Bicykel odstránený."); }).catch(err); } else { el.dataset.sure = 1; el.textContent = "Odstrániť?"; el.classList.add("danger"); } break;
      case "push-hide": try { localStorage.setItem("eb_push_hide", String(Date.now())); } catch (x) {} render(true); break;
      case "del-sc": api.deleteShortcut(id).then(function () { S.sc = S.sc.filter(function (s) { return s.id !== id; }); render(true); }).catch(err); break;
      case "reward": (function () { var x = REWARDS[+el.dataset.i], pts = S.pts ? S.pts.balance : 0;
        toast(pts >= x[3] ? "Ukáž túto obrazovku v predajni EliteBiker (člen č. <b>" + memberNo() + "</b>). Body ti odpočítame a <b>" + x[1] + "</b> je tvoja." : "Na „" + x[1] + "“ ti chýba ešte " + (x[3] - pts) + " bodov."); })(); break;
      case "logout": (PUSH.sub ? api.pushDelete(PUSH.sub.endpoint).catch(function () {}) : Promise.resolve()).then(function () { return api.logout(); }).then(function () { location.href = location.pathname; }); break;
      case "delete-acc": if (el.dataset.sure) { api.deleteAccount().then(function () { location.href = location.pathname; }).catch(err); } else { el.dataset.sure = 1; el.textContent = "Naozaj? Ťukni znova"; } break;
    }
  });
  var CROPA = "orig";
  // pred nahraním sa každá fotka dá orezať; zrušenie zastaví zvyšné, už potvrdené sa nahrajú
  function cropAll(files) {
    var out = [], i = 0;
    function next() {
      if (i >= files.length) return Promise.resolve(out);
      var f = files[i];
      if (!window.EBCrop) { out.push(f); i++; return next(); }
      return EBCrop.open(f, { aspect: CROPA, count: files.length > 1 ? (i + 1) + " z " + files.length : "", parent: $("app") }).then(function (r) {
        if (!r) return out;
        if (r.aspect) CROPA = r.aspect;
        out.push(r.blob || f); i++; return next();
      }, function () { out.push(f); i++; return next(); });
    }
    return next();
  }
  function cropAvatar(f) {
    if (!window.EBCrop) return Promise.resolve(f);
    return EBCrop.open(f, { aspect: "1:1", lock: true, round: true, max: 1024, title: "Profilová fotka", parent: $("app") }).then(function (r) { return r ? r.blob || f : null; }, function () { return f; });
  }
  document.addEventListener("change", function (e) {
    var t = e.target; if (!t || !t.files || !t.files.length || !t.dataset.up) return;
    var kind = t.dataset.up, id = t.dataset.id, files = [].slice.call(t.files);
    t.value = "";
    if (kind === "dsgbg") {
      var asp = DSG.style === "sticker" ? "1:1" : dsgFmt() === "post" ? "4:5" : "9:16";
      (window.EBCrop ? EBCrop.open(files[0], { aspect: asp, lock: true, title: "Fotka na pozadie", parent: $("app") }).catch(function () { return { skip: true }; }) : Promise.resolve({ skip: true })).then(function (r) {
        if (!r) return;
        DSG.locals.unshift(URL.createObjectURL(r.blob || files[0])); DSG.locals = DSG.locals.slice(0, 6);
        DSG.bg = 1; if (DSG.style === "route" || DSG.style === "sticker") DSG.style = "stats";
        drawDesign(true); buildDesign();
      });
      return;
    }
    if (kind === "avatar") cropAvatar(files[0]).then(function (f) {
      if (!f) return;
      toast("Nahrávam fotku…");
      return api.uploadAvatar(f).then(function (p) { S.me = p; S.P[S.uid] = p; if (!$("onb").classList.contains("hide")) renderOnboarding(); else render(true); toast("Profilová fotka uložená."); });
    }).catch(err);
    if (kind === "photo") cropAll(files).then(function (list) {
      if (!list.length) return;
      toast("Nahrávam " + (list.length === 1 ? "fotku" : list.length + " fotky") + "…");
      return list.reduce(function (p, f) { return p.then(function () { return api.uploadPhoto(id, f); }); }, Promise.resolve()).then(function () {
        toast((list.length === 1 ? "Fotka pridaná" : "Fotky pridané") + " k jazde."); S.pts = null;
        return api.photos(id).then(function (p) {
          S.photos[id] = p; if (S.openId === id) renderPhotos();
          // hneď ponúkneme EliteBiker dizajn s poslednou fotkou (z telefónu, bez čakania na server)
          if (p[0]) openDesign(id, { photo: p[0].id, local: URL.createObjectURL(list[list.length - 1]) });
        });
      });
    }).catch(err);
  });
  document.addEventListener("keydown", function (e) { var t = e.target; if ((e.key === "Enter" || e.key === " ") && t && t.getAttribute && /^(checkbox|switch)$/.test(t.getAttribute("role")) && t.dataset.act) { e.preventDefault(); t.click(); return; } if (e.key === "Escape") { if ($("modal").classList.contains("open")) { if (pmap) { pmap.remove(); pmap = null; } closeModal(); } else if ($("sheet").classList.contains("open")) { if ($("sheet").dataset.kind === "create" && D && D.edit) openRide(D.edit); else closeSheet(); } } });
  function route(h) {
    if (h.indexOf("#jazda-") === 0) { openRide(h.slice(7)); return; }
    if (h === "#partia") {
      history.replaceState(null, "", location.pathname + location.search);
      closeModal(); if ($("sheet").classList.contains("open")) closeSheet();
      S.tab = "friends"; S.editing = false; render(); $("view").scrollTop = 0;
    }
  }
  window.addEventListener("hashchange", function () { if (S.me && $("onb").classList.contains("hide")) route(location.hash); });

  /* ---------------- štart ---------------- */
  function afterStart() {
    api.myPhone().then(function (ph) { S.phone = ph; if (S.tab === "profile") render(true); if (S.openId) updateDetail(); }).catch(function () {});
    api.isAdmin().then(function (a) { S.admin = !!a; if (a && S.tab === "profile") render(true); }).catch(function () {});
    autoLocation(S.me && S.me.city);
    var h = location.hash, code = pending();
    if (code) {
      try { localStorage.removeItem("eb_pozvanka"); } catch (e) {}
      api.redeemInvite(code).then(function (res) {
        if (!res || (!res.ok && res.reason === "self")) { if (res && res.ride_id) openRide(res.ride_id); return; }
        if (!res.ok) { toast("Pozvánka už vypršala. Kamoša nájdeš v záložke Partia."); return; }
        return loadAll().then(function () {
          var who = "<b>" + esc(hname(res.inviter)) + "</b>";
          render(true);
          if (res.ride_id) { openRide(res.ride_id); toast(res.reason === "full" ? "Jazda je už plná, ale vidíš ju a s " + who + " ste v partii 🤝" : "Si na jazde! S " + who + " ste v partii 🤝"); }
          else toast(res.reason === "ride_ended" ? "Jazda už skončila, ale s " + who + " ste v partii 🤝" : res.reason === "private" ? "Jazda je len pre vybraných, ale s " + who + " ste v partii 🤝" : "S " + who + " ste teraz v partii 🤝");
        });
      }).catch(err);
    } else if (h) setTimeout(function () { route(h); }, 200);
    try { if (sessionStorage.getItem("eb_setpw")) { sessionStorage.removeItem("eb_setpw"); setTimeout(function () { openPw(); toast("Prihlásený ✓ Nastav si heslo, nabudúce bez kódu."); }, 400); } } catch (e) {}
    api.subscribeChanges(function () { refresh(); });
    pushInit();
    api.myTemplates().then(function (l) { S.tpl = buildTemplates(l); if (S.tab === "feed" && !$("sheet").classList.contains("open")) render(true); }).catch(function () {});
  }
  // súhrnná návštevnosť: jedno počítadlo za otvorenie appky, do zariadenia nič neukladáme
  var TRK = { day: null };
  function todayKey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function track(kind) {
    TRK.day = todayKey();
    try { api.track(kind, isIOS() ? "ios" : isAndroid() ? "android" : "desktop", standalone()); } catch (e) {}
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && TRK.day && TRK.day !== todayKey()) track("open"); });
  function boot() {
    if (!api) { document.body.innerHTML = '<p style="padding:40px;font-family:sans-serif">Aplikáciu sa nepodarilo načítať. Obnov stránku.</p>'; return; }
    if (api.mode === "demo") { document.querySelector(".app").classList.add("has-banner"); var b = document.createElement("div"); b.className = "demo-banner"; b.textContent = "Skúšobný režim, údaje sú len v tomto prehliadači"; document.querySelector(".app").appendChild(b); }
    var p = new URLSearchParams(location.search), poz = p.get("pozvanka");
    var kind = poz ? "invite" : location.hash.indexOf("#jazda-") === 0 ? "ride" : "open";
    if (poz && /^[A-Za-z0-9_-]{6,40}$/.test(poz)) { try { localStorage.setItem("eb_pozvanka", poz); } catch (e) {} }
    if (poz) { p.delete("pozvanka"); history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "") + location.hash); }
    if (p.get("pridaj")) { p.delete("pridaj"); history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "") + location.hash); }
    ["app", "stage"].forEach(function (k) { var el = $(k) || document.querySelector("." + k); if (el) el.addEventListener("scroll", function () { if (el.scrollLeft || el.scrollTop) { el.scrollLeft = 0; el.scrollTop = 0; } }); });
    var sm = new MutationObserver(function () { var o = $("sheet").classList.contains("open") || $("modal").classList.contains("open"); $("scrim").classList.toggle("on", o); });
    sm.observe($("sheet"), { attributes: true, attributeFilter: ["class"] }); sm.observe($("modal"), { attributes: true, attributeFilter: ["class"] });
    api.init().then(function (r) {
      track(kind);
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
