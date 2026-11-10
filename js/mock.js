/* EliteBiker Ride – skúšobný režim (bez servera).
   Použije sa, kým v js/config.js nie je vyplnené SUPABASE_URL.
   Údaje sú vymyslené a ukladajú sa len v tomto prehliadači. */
(function () {
  "use strict";
  if (window.EBApi) return;
  var KEY = "ebride-demo-v5";
  var SKIN = ["#f2c9a8", "#e3ad86", "#b97c58"];
  function face(o) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="' + o.bg + '"/>' +
      (o.fem ? '<path d="M11 22c-1 6 1 10 3 12h12c2-2 4-6 3-12z" fill="' + o.hair + '"/>' : "") +
      '<path d="M5 42c1.5-8 7.5-12 15-12s13.5 4 15 12z" fill="' + o.jc + '"/><rect x="17" y="24" width="6" height="7" rx="2" fill="' + SKIN[o.sk] + '"/>' +
      '<circle cx="20" cy="20" r="7.2" fill="' + SKIN[o.sk] + '"/><path d="M11.6 18.4c0-6.2 3.8-9.6 8.4-9.6s8.4 3.4 8.4 9.6c-2.4-1.2-5.2-1.7-8.4-1.7s-6 .5-8.4 1.7z" fill="' + o.hc + '"/>' +
      '<rect x="14.2" y="18.6" width="11.6" height="3.2" rx="1.6" fill="#11131a" opacity=".85"/><path d="M17.5 24.5q2.5 1.6 5 0" stroke="#7a4a32" stroke-width=".9" fill="none" stroke-linecap="round"/></svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function P(id, ig, fb, name, age, city, bikes, look) {
    return { id: id, ig_username: ig, fb_name: fb, display_name: name, age: age, city: city, bike_types: bikes, avatar_url: face(look) };
  }
  function seed() {
    var H = 36e5, D = 864e5, now = Date.now();
    function at(days, h, m) { var d = new Date(); d.setHours(h, m || 0, 0, 0); return new Date(d.getTime() + days * D).toISOString(); }
    var profiles = [
      P("u-adam", "adam.rides", null, "Adam K.", 31, "Považská Bystrica", ["mtb"], { bg: "#ffe1c7", jc: "#11131a", hc: "#1b46e5", sk: 1 }),
      P("u-peto", "peto_mtb", "Peter Hruška", "Peter H.", 28, "Púchov", ["mtb"], { bg: "#d8efe0", jc: "#2f7d4f", hc: "#e8a400", sk: 0 }),
      P("u-lucia", "lucia.gravel", null, "Lucia M.", 26, "Považská Bystrica", ["gravel"], { bg: "#fde2ec", jc: "#c2185b", hc: "#fff", sk: 0, fem: 1, hair: "#6b3e26" }),
      P("u-tomas", null, "Tomáš Baran", "Tomáš B.", 41, "Ilava", ["cesta"], { bg: "#e3e6ee", jc: "#e23b2e", hc: "#11131a", sk: 2 }),
      P("u-jana", "jana_ebike", null, "Jana V.", 45, "Považská Teplá", ["ebike"], { bg: "#efe4fb", jc: "#7c3aed", hc: "#7c3aed", sk: 1, fem: 1, hair: "#d9a441" }),
      P("u-marek", "marek.enduro", null, "Marek S.", 23, "Považská Bystrica", ["mtb"], { bg: "#fff1bf", jc: "#ea7a17", hc: "#11131a", sk: 0 }),
      P("u-rasto", null, "facebook.com/rasto.bikes", "Rasťo D.", 37, "Dubnica nad Váhom", ["gravel"], { bg: "#d5eef5", jc: "#0e7490", hc: "#fff", sk: 2 }),
      P("u-zuza", "zuzka.trail", null, "Zuzana P.", 30, "Považská Bystrica", ["mtb"], { bg: "#e6f4d8", jc: "#4d7c0f", hc: "#fff", sk: 0, fem: 1, hair: "#3b2a20" })
    ];
    var F = ["u-adam", "u-peto", "u-lucia", "u-tomas", "u-jana", "u-marek"];
    function R(id, host, type, title, start, hours, meet, route, km, pace, parts, aud, note, msgs, vis) {
      vis = vis || "friends";
      return { id: id, host: host, type: type, title: title, note: note || "", starts_at: start, ends_at: new Date(new Date(start).getTime() + hours * H).toISOString(),
        meet: meet, route: route, distance_km: km, pace: pace, visibility: vis, allow_invites: vis !== "private", audience_kind: "pick", participants: parts, audience: aud, messages: msgs || [], photos: [] };
    }
    var SULOV = { lat: 49.1676, lng: 18.5809, label: "Parkovisko Súľov, Súľov-Hradná" };
    var DEDOVEC = { lat: 49.1355, lng: 18.4302, label: "EliteBiker, Dedovec 4574, Považská Bystrica" };
    var MOST = { lat: 49.1146, lng: 18.4479, label: "Most cez Váh, Považská Bystrica" };
    var rides = [
      R("r1", "u-adam", "mtb", "Súľovské skaly okruh", at(1, 14, 30), 2.5, SULOV, [[49.1676, 18.5809], [49.1745, 18.5711], [49.1831, 18.5795], [49.1786, 18.5952], [49.1676, 18.5809]], 28, "stredne", ["u-adam", "u-peto"], ["me", "u-peto", "u-marek"], "Krátko, kým je svetlo. Svetlá zoberte pre istotu.", [{ user_id: "u-peto", body: "Som tam o 14:20, beriem aj pumpu.", created_at: new Date(now - 2 * H).toISOString() }]),
      R("r2", "u-lucia", "gravel", "Vážska cyklomagistrála → Púchov a späť", at(2, 13), 3.5, MOST, [[49.1146, 18.4479], [49.1239, 18.3962], [49.1236, 18.3266]], 54, "pohoda", ["u-lucia", "u-jana", "u-tomas"], ["me", "u-jana", "u-tomas"], "Pohodovo, v Púchove zastávka na kávu."),
      R("r3", "u-adam", "mtb", "Komunitná jazda EliteBiker na Manín", at(5, 9, 30), 4, DEDOVEC, [[49.1355, 18.4302], [49.1316, 18.4706], [49.1372, 18.5013], [49.1355, 18.4302]], 35, "stredne", ["u-adam", "u-peto", "u-marek", "u-lucia"], ["me", "u-peto", "u-marek", "u-lucia", "u-jana"], "Po jazde káva a kontrola bicykla zadarmo v predajni EliteBiker."),
      R("r4", "u-tomas", "cesta", "Javorníky, Kasárne", at(5, 8), 4, { lat: 49.1503, lng: 18.4013, label: "Orlové, Považská Bystrica" }, null, 88, "rychlo", ["u-tomas"], ["me"], "Tempo okolo 30 km/h na rovine."),
      R("r0", "me", "mtb", "Manín nedeľný okruh", at(-2, 9, 30), 3, DEDOVEC, [[49.1355, 18.4302], [49.1316, 18.4706], [49.1355, 18.4302]], 31, "stredne", ["me", "u-adam", "u-peto", "u-lucia"], ["u-adam", "u-peto", "u-lucia"], "")
    ];
    var dirt = R("r5", "u-marek", "dirt", "Pumptrack a dirty celý deň", at(26, 10), 7, { lat: 49.1232, lng: 18.3301, label: "Pumptrack Púchov" }, null, null, "pohoda", ["u-marek", "u-peto"], ["me", "u-peto", "u-adam"], "Celý deň na pumptracku a dirtoch. Prilby povinné, chrániče odporúčam. Na obed grilujeme, zober niečo na gril.");
    dirt.max_people = 8; dirt.link_url = "https://www.instagram.com/elitebiker.sk/"; rides.push(dirt);
    rides[3].visibility = "private"; rides[3].allow_invites = false;
    // verejné jazdy cudzích bikerov – vidno ich len do 30 km od nastavenej polohy
    rides.push(R("r6", "u-zuza", "mtb", "Večerný okruh Strážov pre všetkých", at(3, 17, 30), 2, { lat: 49.1063, lng: 18.4428, label: "Parkovisko pod Strážovom, Považská Bystrica" }, null, 22, "pohoda", ["u-zuza", "u-rasto"], [], "Pridať sa môže hocikto, ideme pomaly. Svetlá povinné.", [], "public"));
    rides.push(R("r7", "u-rasto", "gravel", "Gravel okolo Bratislavy", at(4, 10), 4, { lat: 48.1486, lng: 17.1077, label: "Eurovea, Bratislava" }, null, 60, "stredne", ["u-rasto"], [], "", [], "public"));
    return { profiles: profiles, friends: F, incoming: ["u-rasto"], outgoing: [], shortcuts: [
      { id: "s1", name: "MTB partia", emoji: "🏔️", members: ["u-adam", "u-peto", "u-marek"] },
      { id: "s2", name: "Gravel pohodári", emoji: "☕", members: ["u-lucia", "u-jana"] }], rides: rides, me: null };
  }
  // ukážka ponuky bicyklov (naostro sa načíta z elitebiker.sk)
  var CAT = [[1, "Marin Rift Zone 2 29\"", "Marin"], [2, "Marin Alpine Trail E2", "Marin"], [3, "Marin San Quentin 3", "Marin"], [4, "Marin Gestalt X10", "Marin"], [5, "Marin Wildcat Trail 3", "Marin"],
    [6, "Marin Bobcat Trail 4 29\"", "Marin"], [7, "Marin Nicasio 2", "Marin"], [8, "Haro Shift R7", "Haro"], [9, "Haro Downtown 20\"", "Haro"], [10, "Transition Smuggler Carbon GX", "Transition"],
    [11, "Transition Spire Alloy", "Transition"], [12, "TIME ADHX 45", "TIME"], [13, "GT Aggressor 27,5\" Expert", "GT"], [14, "Chromag Darco", "Chromag"], [15, "STORM Barcelona 28\"", "STORM"], [16, "CANULL Air 16\"", "CANULL"]]
    .concat([[17, "Marin Rift Zone E", "Marin", 1], [18, "Marin Alpine Trail E1 Bosch CX", "Marin", 1], [19, "Haro Skwad LT", "Haro", 1], [20, "Bulls Sonic EVO AM1", "Bulls", 1], [21, "STORM E-Diamond 5 Low Step", "STORM", 1]])
    .map(function (x) { return { id: x[0], name: x[1], brand: x[2], url: "https://www.elitebiker.sk/", image: null, ebike: !!x[3] }; });
  function seedBikes() {
    return [["u-adam", 1], ["u-peto", 10], ["u-lucia", 4], ["u-tomas", 12], ["u-jana", 2], ["u-marek", 8], ["u-zuza", 5]].map(function (x, i) {
      var c = CAT.filter(function (b) { return b.id === x[1]; })[0];
      return { id: "b" + i, user_id: x[0], name: c.name, catalog_id: c.id, url: c.url, image: null, created_at: new Date(Date.now() - (30 - i) * 864e5).toISOString() };
    });
  }
  var D = null;
  function load() { try { D = JSON.parse(localStorage.getItem(KEY)); } catch (e) { D = null; } if (!D) D = seed(); if (!D.bikes) D.bikes = seedBikes(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* bez úložiska */ } }
  function wait(v) { return new Promise(function (r) { setTimeout(function () { r(v); }, 120); }); }
  function prof(id) { if (id === "me") return D.me; for (var i = 0; i < D.profiles.length; i++) if (D.profiles[i].id === id) return D.profiles[i]; return null; }
  function ride(id) { for (var i = 0; i < D.rides.length; i++) if (D.rides[i].id === id) return D.rides[i]; }
  function km(a, b) { var R = 6371, dl = (b.lat - a.lat) * Math.PI / 180, dn = (b.lng - a.lng) * Math.PI / 180, x = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dn / 2) * Math.sin(dn / 2); return 2 * R * Math.asin(Math.min(1, Math.sqrt(x))); }
  function visible(r) {
    if (r.host === "me" || r.participants.indexOf("me") > -1 || r.audience.indexOf("me") > -1) return true;
    var L = D.loc || (D.me && D.me.city ? { lat: 49.12, lng: 18.42 } : null);
    return r.visibility === "public" && new Date(r.ends_at) > new Date() && !!L && km(L, r.meet) <= 30;
  }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function blankMe(email) { return { id: "me", ig_username: null, fb_name: null, display_name: "", age: null, city: "", bike_types: [], avatar_url: null, email: email }; }
  var listeners = [], chatL = {};
  function changed() { save(); listeners.forEach(function (f) { setTimeout(f, 50); }); }
  load();

  var api = {
    mode: "demo",
    init: function () { return wait({ user: D.me ? { id: "me" } : null, message: null }); },
    onAuth: function () {},
    userId: function () { return D.me ? "me" : null; },
    loginEmail: function (email) {
      D.me = D.me || blankMe(email);
      save(); return wait().then(function () { setTimeout(function () { location.reload(); }, 900); });
    },
    signIn: function (email) { D.me = D.me || blankMe(email); D.me.has_password = true; save(); return wait(); },
    signUp: function (email) { D.me = blankMe(email); D.me.has_password = true; save(); return wait({ session: true }); },
    resendSignup: function () { return wait(); },
    setPassword: function () { D.me.has_password = true; save(); return wait(); },
    email: function () { return D.me && D.me.email; },
    hasPassword: function () { return !!(D.me && D.me.has_password); },
    createInvite: function (rideId) { return wait("demo-" + (rideId || "partia")); },
    inviteInfo: function (code) {
      var r = code.indexOf("demo-r") === 0 ? ride(code.slice(5)) : null, a = prof("u-adam");
      return wait({ inviter: { name: a.display_name, avatar_url: a.avatar_url }, ride: r ? { title: r.title, type: r.type, starts_at: r.starts_at } : null, valid: true });
    },
    redeemInvite: function (code) {
      if (D.friends.indexOf("u-adam") < 0) D.friends.push("u-adam");
      var r = code.indexOf("demo-r") === 0 ? ride(code.slice(5)) : null;
      if (r) { if (r.audience.indexOf("me") < 0) r.audience.push("me"); if (r.participants.indexOf("me") < 0) r.participants.push("me"); }
      changed(); return wait({ ok: true, inviter: "u-adam", ride_id: r ? r.id : null });
    },
    verifyEmailCode: function () { return wait(); },
    logout: function () { localStorage.removeItem(KEY); load(); return wait(); },
    isAdmin: function () { return wait(false); },
    me: function () { return wait(copy(D.me)); },
    profile: function (id) { return wait(copy(prof(id))); },
    // vek a mesto len pre priateľov (ako na serveri)
    profiles: function (ids) { return wait(ids.map(prof).filter(Boolean).map(copy).map(function (p) { if (p.id !== "me" && D.friends.indexOf(p.id) < 0) { p.age = null; p.city = null; } return p; })); },
    updateProfile: function (p) {
      if (p.ig_username) { for (var i = 0; i < D.profiles.length; i++) if (D.profiles[i].ig_username === p.ig_username) return Promise.reject(new Error("Toto Instagram meno už má niekto iný.")); }
      Object.assign(D.me, p); save(); return wait(copy(D.me));
    },
    uploadAvatar: function (file) {
      return new Promise(function (res) { var f = new FileReader(); f.onload = function () { res(f.result); }; f.readAsDataURL(file); })
        .then(function (url) { D.me.avatar_url = url; save(); return copy(D.me); });
    },
    searchProfiles: function (q) {
      function n(x) { return String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
      q = n(q.trim().replace(/^@/, ""));
      return wait(D.profiles.filter(function (p) { return q.length > 2 && (n(p.display_name).indexOf(q) > -1 || n(p.ig_username).indexOf(q) > -1 || n(p.fb_name).indexOf(q) > -1); })
        .slice(0, 10).map(function (p) { return { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url, city: D.friends.indexOf(p.id) > -1 ? p.city : null, ig_username: p.ig_username }; }));
    },
    catalog: function () { return wait(copy(CAT)); },
    bikes: function (ids) { var m = {}; ids.forEach(function (i) { m[i] = 1; }); return wait(copy(D.bikes.filter(function (b) { return m[b.user_id]; }))); },
    addBike: function (b) {
      var mine = D.bikes.filter(function (x) { return x.user_id === "me"; }), c = b.catalog_id ? CAT.filter(function (x) { return x.id === b.catalog_id; })[0] : null;
      if (mine.length >= 5) return Promise.reject(new Error("Môžeš mať najviac 5 bicyklov."));
      var name = c ? c.name : String(b.name || "").trim().replace(/\s+/g, " ").slice(0, 160);
      if (name.length < 2) return Promise.reject(new Error("Napíš názov bicykla."));
      var n = { id: "b" + Date.now(), user_id: "me", name: name, catalog_id: c ? c.id : null, url: c ? c.url : null, image: c ? c.image : null, created_at: new Date().toISOString() };
      D.bikes.push(n); save(); return wait(copy(n));
    },
    deleteBike: function (id) { D.bikes = D.bikes.filter(function (b) { return !(b.id === id && b.user_id === "me"); }); save(); return wait(); },
    // v skúšobnom režime bez internetu: poloha = Považská Bystrica, ak je v profile mesto
    location: function () { return wait(D.loc ? copy(D.loc) : D.me && D.me.city ? { lat: 49.12, lng: 18.42, label: D.me.city } : null); },
    setLocation: function (l) { D.loc = { lat: Math.round(l.lat * 100) / 100, lng: Math.round(l.lng * 100) / 100, label: l.label || null }; changed(); return wait(copy(D.loc)); },
    clearLocation: function () { D.loc = null; changed(); return wait(); },
    friendships: function () { return wait({ friends: D.friends.slice(), incoming: D.incoming.slice(), outgoing: D.outgoing.slice() }); },
    requestFriend: function (id) {
      if (D.incoming.indexOf(id) > -1) return api.acceptFriend(id);
      if (D.outgoing.indexOf(id) < 0 && D.friends.indexOf(id) < 0) D.outgoing.push(id);
      changed();
      setTimeout(function () { var i = D.outgoing.indexOf(id); if (i > -1) { D.outgoing.splice(i, 1); D.friends.push(id); changed(); } }, 4000);
      return wait();
    },
    acceptFriend: function (id) { D.incoming = D.incoming.filter(function (x) { return x !== id; }); if (D.friends.indexOf(id) < 0) D.friends.push(id); changed(); return wait(); },
    removeFriend: function (id) { ["friends", "incoming", "outgoing"].forEach(function (k) { D[k] = D[k].filter(function (x) { return x !== id; }); }); changed(); return wait(); },
    shortcuts: function () { return wait(copy(D.shortcuts)); },
    saveShortcut: function (s) { var n = { id: "s" + Date.now(), name: s.name, emoji: s.emoji || "⭐", members: s.members }; D.shortcuts.push(n); save(); return wait(copy(n)); },
    deleteShortcut: function (id) { D.shortcuts = D.shortcuts.filter(function (s) { return s.id !== id; }); save(); return wait(); },
    rides: function () {
      var since = Date.now() - 7 * 864e5;
      return wait(D.rides.filter(function (r) { return visible(r) && new Date(r.ends_at).getTime() > since; })
        .map(function (r) { var c = copy(r); delete c.messages; delete c.photos; return c; })
        .sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1; }));
    },
    myTemplates: function () { return wait(D.rides.filter(function (r) { return r.host === "me"; }).map(copy).sort(function (a, b) { return a.starts_at < b.starts_at ? 1 : -1; })); },
    createRide: function (d, audience) {
      var r = Object.assign({ id: "r" + Date.now(), host: "me", participants: ["me"], audience: audience.slice(), messages: [], photos: [] }, copy(d));
      D.rides.push(r); changed();
      var who = audience[0];
      if (who) setTimeout(function () {
        if (!ride(r.id)) return;
        r.participants.push(who);
        r.messages.push({ user_id: who, body: "Idem s tebou! Budem na stretku o " + new Date(r.starts_at).toLocaleTimeString("sk", { hour: "2-digit", minute: "2-digit" }) + ".", created_at: new Date().toISOString() });
        changed(); (chatL[r.id] || []).forEach(function (f) { f(r.messages[r.messages.length - 1]); });
      }, 5000);
      return wait(r.id);
    },
    updateRide: function (id, d) {
      var r = ride(id);
      if (!r || r.host !== "me") return Promise.reject(new Error("Túto jazdu môže upraviť len ten, kto ju vytvoril."));
      if (new Date(r.ends_at) < new Date()) return Promise.reject(new Error("Skončenú jazdu už nemôžeš upraviť."));
      if (d.max_people && d.max_people < r.participants.length) return Promise.reject(new Error("Na jazdu sa už prihlásilo viac ľudí, ako je nový limit."));
      Object.keys(d).forEach(function (k) { r[k] = d[k] && typeof d[k] === "object" ? JSON.parse(JSON.stringify(d[k])) : d[k]; });
      changed(); return wait();
    },
    setVisibility: function (id, v) { var r = ride(id); r.visibility = v; r.allow_invites = v !== "private"; changed(); return wait(); },
    cancelRide: function (id) { D.rides = D.rides.filter(function (r) { return r.id !== id; }); changed(); return wait(); },
    joinRide: function (id) { var r = ride(id); if (!visible(r)) return Promise.reject(new Error("Pridať sa nepodarilo.")); if (r.participants.indexOf("me") < 0) r.participants.push("me"); changed(); return wait(); },
    leaveRide: function (id) { var r = ride(id); r.participants = r.participants.filter(function (x) { return x !== "me"; }); changed(); return wait(); },
    invite: function (id, ids) { var r = ride(id); ids.forEach(function (u) { if (r.audience.indexOf(u) < 0) r.audience.push(u); }); changed();
      setTimeout(function () { if (r.participants.indexOf(ids[0]) < 0) { r.participants.push(ids[0]); changed(); } }, 3500); return wait(); },
    messages: function (id) { var r = ride(id); return wait(new Date(r.ends_at) > new Date() && r.participants.indexOf("me") > -1 ? copy(r.messages) : []); },
    sendMessage: function (id, body) {
      var r = ride(id), m = { user_id: "me", body: body, created_at: new Date().toISOString() }; r.messages.push(m); save();
      (chatL[id] || []).forEach(function (f) { f(m); });
      if (r.host !== "me" && !r._rep) { r._rep = 1; setTimeout(function () { var x = { user_id: r.host, body: "Super, vidíme sa! 👍", created_at: new Date().toISOString() }; r.messages.push(x); save(); (chatL[id] || []).forEach(function (f) { f(x); }); }, 1800); }
      return wait();
    },
    subscribeMessages: function (id, cb) { (chatL[id] = chatL[id] || []).push(cb); return function () { chatL[id] = (chatL[id] || []).filter(function (f) { return f !== cb; }); }; },
    subscribeChanges: function (cb) { listeners.push(cb); return function () { listeners = listeners.filter(function (f) { return f !== cb; }); }; },
    photos: function (id) { return wait(copy(ride(id).photos || [])); },
    uploadPhoto: function (id, file) {
      return new Promise(function (res) {
        var img = new Image(), u = URL.createObjectURL(file);
        img.onload = function () { var s = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", .75)); };
        img.onerror = function () { res(null); }; img.src = u;
      }).then(function (url) { if (!url) throw new Error("Tento súbor nie je fotka."); var r = ride(id); r.photos.unshift({ id: "p" + Date.now(), user_id: "me", path: "", url: url }); changed(); });
    },
    deletePhoto: function (p) { D.rides.forEach(function (r) { r.photos = (r.photos || []).filter(function (x) { return x.id !== p.id; }); }); changed(); return wait(); },
    points: function () {
      var now = new Date(), j = 12, h = 3, ph = 4;
      D.rides.forEach(function (r) {
        if (new Date(r.ends_at) >= now || r.participants.length < 2 || r.participants.indexOf("me") < 0) return;
        if (r.host === "me") h++; else j++;
        ph += Math.min(5, (r.photos || []).filter(function (p) { return p.user_id === "me"; }).length);
      });
      var adj = D.adj || [{ kind: "bonus", delta: 100, reason: "Bonus za nákup v predajni", at: new Date(Date.now() - 6 * 864e5).toISOString() }, { kind: "reward", delta: -50, reason: "Káva po jazde", at: new Date(Date.now() - 3 * 864e5).toISOString() }];
      var bonus = 0, spent = 0; adj.forEach(function (a) { if (a.kind === "reward") spent -= a.delta; else bonus += a.delta; });
      var earned = j * 20 + h * 50 + ph * 10 + bonus;
      return wait({ joined: j, hosted: h, photos: ph, bonus: bonus, spent: spent, earned: earned, balance: earned - spent, history: adj.slice().reverse() });
    },
    weather: function (points) {
      var out = {}, now = new Date(); now.setMinutes(0, 0, 0);
      points.forEach(function (p, idx) {
        var k = p.lat.toFixed(2) + "," + p.lng.toFixed(2), arr = [];
        for (var h = 0; h < 216; h++) {
          var t = now.getTime() + h * 36e5, hr = new Date(t).getHours(), day = Math.floor(h / 24);
          var rainy = (day + idx) % 3 === 1 && hr >= 11 && hr <= 19, windy = day === 4;
          arr.push({ t: t, dur: 1, temp: Math.round((6 + 5 * Math.sin((hr - 8) / 24 * 2 * Math.PI)) * 10) / 10, wind: windy ? 11 : 3, gust: null,
            sym: rainy ? (hr % 4 === 0 ? "heavyrain" : "rain") : hr > 7 && hr < 17 ? (day % 2 ? "partlycloudy_day" : "clearsky_day") : "cloudy", pr: rainy ? 1.2 : 0, pop: null, thu: null });
        }
        out[k] = arr;
      });
      return wait(out);
    },
    pushSave: function (_s, device) { D.push = true; D.pushDev = device || "Toto zariadenie"; save(); return wait(); },
    pushDelete: function () { D.push = false; save(); return wait(); },
    prefs: function () { return wait(D.prefs ? D.prefs.slice() : null); },
    savePrefs: function (push) { D.prefs = push.slice(); save(); return wait(); },
    pushDevices: function () { return wait(D.push ? [{ endpoint: "demo", device: D.pushDev || "Toto zariadenie", created_at: new Date().toISOString(), last_status: 201, last_at: new Date().toISOString() }] : []); },
    pushTest: function () { return wait({ sent: 1 }); },
    deleteAccount: function () { localStorage.removeItem(KEY); load(); return wait(); }
  };
  window.EBApi = api;
})();
