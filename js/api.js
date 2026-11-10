/* EliteBiker Ride – komunikácia so serverom (Supabase).
   Rovnaké rozhranie má aj skúšobný režim v js/mock.js. */
(function () {
  "use strict";
  var C = window.EB_CONFIG || {};
  if (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY || !window.supabase) return;

  var sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, {
    auth: { flowType: "implicit", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
  });
  var me = null;
  // vek a mesto sa nečítajú z tabuľky – vracia ich server len sebe a priateľom (profile_private)
  var PROFILE_COLS = "id,ig_username,fb_name,display_name,avatar_url,bike_types,created_at";
  var BIKE_COLS = "id,user_id,name,catalog_id,url,image,created_at", catP = null;

  // naše hlásenia zo servera (limity, kontroly) ukážeme priamo, ostatné nahradíme zrozumiteľnou vetou
  function fail(error, msg) {
    if (!error) return;
    console.error(error);
    if (error.code === "P0001" || error.code === "22023" || error.hint === "rate_limit") throw new Error(error.message);
    throw new Error(msg || error.message || "Chyba servera");
  }
  function rnd() { var a = new Uint8Array(12); crypto.getRandomValues(a); return Array.from(a, function (b) { return b.toString(16).padStart(2, "0"); }).join(""); }
  function fn(name, body) {
    return sb.functions.invoke(name, { body: body || {} }).then(function (r) {
      if (r.error) {
        var ctx = r.error.context;
        if (ctx && typeof ctx.json === "function") return ctx.json().then(function (j) { throw new Error(j && j.error || r.error.message); }, function () { throw new Error(r.error.message); });
        throw new Error(r.error.message);
      }
      return r.data;
    });
  }
  function backUrl() { var c = null; try { c = localStorage.getItem("eb_pozvanka"); } catch (e) {} return C.APP_URL + (c ? "?pozvanka=" + encodeURIComponent(c) : ""); }
  function linkError() {
    var h = new URLSearchParams(location.hash.replace(/^#/, "")), e = h.get("error_description") || h.get("error");
    if (!e) return null;
    history.replaceState(null, "", location.pathname + location.search);
    return /expired|invalid|denied/i.test(e) ? "Odkaz na prihlásenie vypršal alebo už bol použitý. Pošli si nový." : "Prihlásenie sa nepodarilo, skús to znova.";
  }
  // doplní vek a mesto – server ich vráti len pre mňa a mojich priateľov
  function withPrivate(list) {
    if (!list.length) return Promise.resolve(list);
    return sb.rpc("profile_private", { p_ids: list.map(function (p) { return p.id; }) }).then(function (r) {
      fail(r.error, "Profily sa nepodarilo načítať.");
      var m = {}; (r.data || []).forEach(function (x) { m[x.id] = x; });
      list.forEach(function (p) { var x = m[p.id]; p.age = x ? x.age : null; p.city = x ? x.city : null; });
      return list;
    });
  }
  function normRide(r) {
    return {
      id: r.id, host: r.host, type: r.type, title: r.title, note: r.note || "",
      starts_at: r.starts_at, ends_at: r.ends_at,
      meet: { lat: r.meet_lat, lng: r.meet_lng, label: r.meet_label || "" },
      route: r.route || null, distance_km: r.distance_km != null ? +r.distance_km : null, elevation_m: r.elevation_m,
      pace: r.pace, trails: r.trails || null, visibility: r.visibility || (r.allow_invites ? "friends" : "private"), allow_invites: r.allow_invites, audience_kind: r.audience_kind, max_people: r.max_people || null, link_url: r.link_url || null,
      participants: (r.ride_participants || []).map(function (p) { return p.user_id; }),
      audience: (r.ride_audience || []).map(function (p) { return p.user_id; })
    };
  }
  function compress(file, max, q) {
    return new Promise(function (res) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { res(b || file); }, "image/jpeg", q || 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  }

  var api = {
    mode: "live",

    /* ---------- prihlásenie ---------- */
    init: function () {
      var msg = linkError();
      return sb.auth.getSession().then(function (r) { me = r.data.session ? r.data.session.user : null; return { user: me, message: msg }; });
    },
    onAuth: function (cb) { sb.auth.onAuthStateChange(function (_e, s) { me = s ? s.user : null; cb(me); }); },
    userId: function () { return me && me.id; },
    loginEmail: function (email) {
      return sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: backUrl() } }).then(function (r) {
        if (r.error && /rate|security purposes|seconds/i.test(r.error.message)) throw new Error("E-mail sme ti poslali len pred chvíľou. Skús to o minútu.");
        fail(r.error, "E-mail sa nepodarilo odoslať. Skús to o chvíľu.");
      });
    },
    signIn: function (email, password) {
      return sb.auth.signInWithPassword({ email: email, password: password }).then(function (r) {
        if (!r.error) return;
        var e;
        if (/not confirmed/i.test(r.error.message)) { e = new Error("E-mail ešte nie je potvrdený. Zadaj kód, ktorý sme ti poslali."); e.code = "unconfirmed"; throw e; }
        if (/invalid/i.test(r.error.message)) throw new Error("Nesprávny e-mail alebo heslo.");
        fail(r.error, "Prihlásenie sa nepodarilo.");
      });
    },
    signUp: function (email, password) {
      return sb.auth.signUp({ email: email, password: password, options: { emailRedirectTo: backUrl(), data: { has_password: true } } }).then(function (r) {
        if (r.error) {
          if (/registered|exists/i.test(r.error.message)) throw new Error("Tento e-mail už má účet, prihlás sa.");
          if (/rate|security purposes|seconds/i.test(r.error.message)) throw new Error("Príliš veľa pokusov. Skús to o minútu.");
          if (/password/i.test(r.error.message)) throw new Error("Heslo je príliš slabé. Použi aspoň 8 znakov, písmeno aj číslicu.");
          fail(r.error, "Účet sa nepodarilo vytvoriť.");
        }
        if (r.data.session) return { session: true };
        if (r.data.user && r.data.user.identities && !r.data.user.identities.length) throw new Error("Tento e-mail už má účet, prihlás sa.");
        return { confirm: true };
      });
    },
    resendSignup: function (email) {
      return sb.auth.resend({ type: "signup", email: email, options: { emailRedirectTo: backUrl() } }).then(function (r) {
        if (r.error && /rate|security purposes|seconds/i.test(r.error.message)) throw new Error("E-mail sme ti poslali len pred chvíľou. Skús to o minútu.");
        fail(r.error, "E-mail sa nepodarilo poslať znova.");
      });
    },
    setPassword: function (pw) {
      return sb.auth.updateUser({ password: pw, data: { has_password: true } }).then(function (r) {
        if (r.error && /different|same/i.test(r.error.message)) throw new Error("Nové heslo musí byť iné ako to staré.");
        if (r.error && /weak|characters|length/i.test(r.error.message)) throw new Error("Heslo je príliš slabé. Použi aspoň 8 znakov, písmeno aj číslicu.");
        if (r.error && /reauthenticat|recent/i.test(r.error.message)) throw new Error("Z bezpečnostných dôvodov sa odhlás a prihlás kódom z e-mailu, potom heslo nastav znova.");
        fail(r.error, "Heslo sa nepodarilo uložiť."); if (r.data && r.data.user) me = r.data.user;
      });
    },
    email: function () { return me && me.email; },
    hasPassword: function () { return !!(me && me.user_metadata && me.user_metadata.has_password); },
    verifyEmailCode: function (email, code) {
      return sb.auth.verifyOtp({ email: email, token: code, type: "email" }).then(function (r) { fail(r.error, "Kód nesedí alebo vypršal. Pošli si nový."); });
    },
    logout: function () { return sb.auth.signOut(); },
    isAdmin: function () { return sb.rpc("admin_status").then(function (r) { return !r.error && r.data && r.data.admin; }); },

    /* ---------- profily ---------- */
    me: function () { return api.profile(me.id); },
    profile: function (id) { return api.profiles([id]).then(function (l) { return l[0] || null; }); },
    profiles: function (ids) {
      if (!ids.length) return Promise.resolve([]);
      return sb.from("profiles").select(PROFILE_COLS).in("id", ids).then(function (r) {
        fail(r.error);
        var list = r.data || [];
        return withPrivate(list);
      });
    },
    updateProfile: function (patch) {
      return sb.from("profiles").update(patch).eq("id", me.id).select(PROFILE_COLS).single().then(function (r) {
        if (r.error && /duplicate|unique/i.test(r.error.message)) throw new Error("Toto Instagram meno už má niekto iný.");
        fail(r.error, "Profil sa nepodarilo uložiť.");
        return withPrivate([r.data]).then(function (l) { return l[0]; });
      });
    },
    uploadAvatar: function (file) {
      return compress(file, 512, .85).then(function (blob) {
        var name = "avatar-" + Date.now() + ".jpg", path = me.id + "/" + name;
        return sb.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: true }).then(function (r) {
          fail(r.error, "Fotku sa nepodarilo nahrať.");
          return api.updateProfile({ avatar_url: sb.storage.from("avatars").getPublicUrl(path).data.publicUrl }).then(function (p) {
            // staré profilovky zmažeme, nech na serveri neostávajú
            sb.storage.from("avatars").list(me.id, { limit: 100 }).then(function (l) {
              var old = (l.data || []).map(function (f) { return me.id + "/" + f.name; }).filter(function (x) { return x !== path; });
              if (old.length) sb.storage.from("avatars").remove(old);
            }).catch(function () {});
            return p;
          });
        });
      });
    },
    searchProfiles: function (q) {
      q = String(q || "").trim().replace(/^@/, "");
      if (q.length < 3) return Promise.resolve([]);
      return sb.rpc("search_profiles", { q: q }).then(function (r) { fail(r.error, "Hľadanie zlyhalo."); return r.data || []; });
    },

    /* ---------- bicykle: katalóg z elitebiker.sk + vlastné ---------- */
    catalog: function () {
      if (!catP) catP = sb.from("catalog_bikes").select("id,name,brand,url,image,ebike").order("name").limit(3000).then(function (r) { fail(r.error, "Ponuku bicyklov sa nepodarilo načítať."); return r.data || []; });
      return catP.catch(function (e) { catP = null; throw e; });
    },
    bikes: function (ids) {
      if (!ids.length) return Promise.resolve([]);
      return sb.from("user_bikes").select(BIKE_COLS).in("user_id", ids).order("created_at").then(function (r) { return r.error ? [] : r.data; });
    },
    addBike: function (b) {
      return sb.from("user_bikes").insert({ name: b.catalog_id ? "" : String(b.name || "").trim(), catalog_id: b.catalog_id || null }).select(BIKE_COLS).single()
        .then(function (r) { fail(r.error, "Bicykel sa nepodarilo pridať."); return r.data; });
    },
    deleteBike: function (id) { return sb.from("user_bikes").delete().eq("id", id).then(function (r) { fail(r.error); }); },

    /* ---------- poloha pre verejné jazdy (ukladá sa len približne, na ~1 km) ---------- */
    location: function () {
      return sb.from("user_locations").select("lat,lng,label").eq("user_id", me.id).maybeSingle().then(function (r) { return r.error ? null : r.data; });
    },
    setLocation: function (l) {
      var row = { user_id: me.id, lat: Math.round(l.lat * 100) / 100, lng: Math.round(l.lng * 100) / 100, label: String(l.label || "").slice(0, 80) || null };
      return sb.from("user_locations").upsert(row).select("lat,lng,label").single().then(function (r) { fail(r.error, "Polohu sa nepodarilo uložiť."); return r.data; });
    },
    clearLocation: function () { return sb.from("user_locations").delete().eq("user_id", me.id).then(function (r) { fail(r.error); }); },

    /* ---------- pozývacie odkazy ---------- */
    createInvite: function (rideId) {
      var q = sb.from("invites").select("code").eq("inviter", me.id).gt("expires_at", new Date(Date.now() + (rideId ? 0 : 7 * 864e5)).toISOString()).order("created_at", { ascending: false }).limit(1);
      q = rideId ? q.eq("ride_id", rideId) : q.is("ride_id", null);
      return q.then(function (r) {
        if (r.data && r.data.length) return r.data[0].code;
        return sb.from("invites").insert({ ride_id: rideId || null }).select("code").single().then(function (x) { fail(x.error, "Odkaz sa nepodarilo vytvoriť."); return x.data.code; });
      });
    },
    inviteInfo: function (code) { return sb.rpc("invite_info", { p_code: code }).then(function (r) { return r.error ? null : r.data; }); },
    redeemInvite: function (code) { return sb.rpc("redeem_invite", { p_code: code }).then(function (r) { fail(r.error, "Pozvánku sa nepodarilo uplatniť."); return r.data; }); },

    /* ---------- priatelia a skratky ---------- */
    friendships: function () {
      return sb.from("friendships").select("*").then(function (r) {
        fail(r.error);
        var out = { friends: [], incoming: [], outgoing: [] };
        r.data.forEach(function (f) {
          var other = f.requester === me.id ? f.addressee : f.requester;
          if (f.status === "accepted") out.friends.push(other);
          else if (f.addressee === me.id) out.incoming.push(other); else out.outgoing.push(other);
        });
        return out;
      });
    },
    requestFriend: function (id) {
      return sb.from("friendships").select("*").or("and(requester.eq." + id + ",addressee.eq." + me.id + ")").maybeSingle().then(function (r) {
        if (r.data && r.data.status === "pending") return api.acceptFriend(id); // obaja sa pridali navzájom
        return sb.from("friendships").insert({ requester: me.id, addressee: id }).then(function (x) {
          if (x.error && !/duplicate/i.test(x.error.message)) fail(x.error, "Žiadosť sa nepodarilo odoslať.");
        });
      });
    },
    acceptFriend: function (id) {
      return sb.from("friendships").update({ status: "accepted" }).eq("requester", id).eq("addressee", me.id).then(function (r) { fail(r.error); });
    },
    removeFriend: function (id) {
      return sb.from("friendships").delete().or("and(requester.eq." + id + ",addressee.eq." + me.id + "),and(requester.eq." + me.id + ",addressee.eq." + id + ")").then(function (r) { fail(r.error); });
    },
    shortcuts: function () { return sb.from("shortcuts").select("*").order("created_at").then(function (r) { fail(r.error); return r.data; }); },
    saveShortcut: function (s) { return sb.from("shortcuts").insert({ name: s.name, emoji: s.emoji || "⭐", members: s.members }).select().single().then(function (r) { fail(r.error); return r.data; }); },
    deleteShortcut: function (id) { return sb.from("shortcuts").delete().eq("id", id).then(function (r) { fail(r.error); }); },

    /* ---------- jazdy ---------- */
    rides: function () {
      var since = new Date(Date.now() - 7 * 864e5).toISOString();
      return sb.from("rides").select("*, ride_participants(user_id), ride_audience(user_id)").gte("ends_at", since).order("starts_at").then(function (r) {
        fail(r.error, "Jazdy sa nepodarilo načítať."); return r.data.map(normRide);
      });
    },
    myTemplates: function () {
      return sb.from("rides").select("*, ride_participants(user_id)").eq("host", me.id).order("starts_at", { ascending: false }).limit(40).then(function (r) {
        fail(r.error); return r.data.map(normRide);
      });
    },
    createRide: function (d, audience) {
      var row = {
        host: me.id, type: d.type, title: d.title, note: d.note || null, starts_at: d.starts_at, ends_at: d.ends_at,
        meet_lat: d.meet.lat, meet_lng: d.meet.lng, meet_label: d.meet.label, route: d.route || null,
        distance_km: d.distance_km || null, elevation_m: d.elevation_m || null, max_people: d.max_people || null, link_url: d.link_url || null,
        pace: d.pace || null, visibility: d.visibility || "friends", audience_kind: d.audience_kind || "pick"
      };
      if (d.trails && d.trails.length) row.trails = d.trails;
      return sb.from("rides").insert(row).select().single().then(function (r) {
        fail(r.error, "Jazdu sa nepodarilo uložiť.");
        var rows = audience.map(function (u) { return { ride_id: r.data.id, user_id: u, invited_by: me.id }; });
        return (rows.length ? sb.from("ride_audience").insert(rows) : Promise.resolve({})).then(function (x) { fail(x.error, "Jazda je uložená, ale pozvánky sa nepodarilo poslať."); return r.data.id; });
      });
    },
    setVisibility: function (id, v) { return sb.from("rides").update({ visibility: v }).eq("id", id).then(function (r) { fail(r.error, "Zmenu sa nepodarilo uložiť."); }); },
    cancelRide: function (id) { return sb.from("rides").delete().eq("id", id).then(function (r) { fail(r.error); }); },
    joinRide: function (id) { return sb.from("ride_participants").insert({ ride_id: id, user_id: me.id }).then(function (r) { fail(r.error, "Pridať sa nepodarilo."); }); },
    leaveRide: function (id) { return sb.from("ride_participants").delete().eq("ride_id", id).eq("user_id", me.id).then(function (r) { fail(r.error); }); },
    invite: function (id, ids) {
      return sb.from("ride_audience").upsert(ids.map(function (u) { return { ride_id: id, user_id: u, invited_by: me.id }; }), { onConflict: "ride_id,user_id", ignoreDuplicates: true })
        .then(function (r) { fail(r.error, "Pozvánky sa nepodarilo poslať."); });
    },

    /* ---------- chat ---------- */
    messages: function (rideId) { return sb.from("messages").select("*").eq("ride_id", rideId).order("created_at").limit(300).then(function (r) { fail(r.error); return r.data; }); },
    sendMessage: function (rideId, body) { return sb.from("messages").insert({ ride_id: rideId, user_id: me.id, body: body }).then(function (r) { fail(r.error, "Správu sa nepodarilo odoslať."); }); },
    subscribeMessages: function (rideId, cb) {
      var ch = sb.channel("chat-" + rideId).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "ride_id=eq." + rideId }, function (p) { cb(p.new); }).subscribe();
      return function () { sb.removeChannel(ch); };
    },
    subscribeChanges: function (cb) {
      var t, fire = function () { clearTimeout(t); t = setTimeout(cb, 400); };
      var ch = sb.channel("zmeny");
      ["rides", "ride_participants", "ride_audience", "friendships", "ride_photos"].forEach(function (tb) { ch.on("postgres_changes", { event: "*", schema: "public", table: tb }, fire); });
      ch.subscribe();
      return function () { sb.removeChannel(ch); };
    },

    /* ---------- fotky ---------- */
    photos: function (rideId) {
      return sb.from("ride_photos").select("*").eq("ride_id", rideId).order("created_at", { ascending: false }).then(function (r) {
        fail(r.error); if (!r.data.length) return [];
        return sb.storage.from("ride-photos").createSignedUrls(r.data.map(function (p) { return p.path; }), 3600).then(function (s) {
          var map = {}; (s.data || []).forEach(function (x) { map[x.path] = x.signedUrl; });
          return r.data.map(function (p) { return { id: p.id, user_id: p.user_id, path: p.path, url: map[p.path] }; });
        });
      });
    },
    uploadPhoto: function (rideId, file) {
      return compress(file, 1600, .82).then(function (blob) {
        var path = rideId + "/" + me.id + "/" + Date.now() + "-" + rnd().slice(0, 6) + ".jpg";
        return sb.storage.from("ride-photos").upload(path, blob, { contentType: "image/jpeg" }).then(function (r) {
          fail(r.error, "Fotku sa nepodarilo nahrať.");
          return sb.from("ride_photos").insert({ ride_id: rideId, user_id: me.id, path: path }).then(function (x) { fail(x.error); });
        });
      });
    },
    deletePhoto: function (p) {
      return sb.storage.from("ride-photos").remove([p.path]).then(function () { return sb.from("ride_photos").delete().eq("id", p.id); }).then(function (r) { fail(r.error); });
    },

    /* ---------- Klub: body počíta server (nedajú sa podvrhnúť) ---------- */
    points: function () { return sb.rpc("my_points").then(function (r) { fail(r.error, "Body sa nepodarilo načítať."); return r.data; }); },

    /* ---------- počasie a upozornenia ---------- */
    weather: function (points) { return fn("weather", { points: points }).then(function (d) { return d.data || {}; }); },
    pushSave: function (sub, device) {
      var j = sub.toJSON();
      return sb.rpc("save_push_subscription", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_device: device || null }).then(function (r) { fail(r.error, "Upozornenia sa nepodarilo zapnúť."); });
    },
    pushDevices: function () {
      return sb.from("push_subscriptions").select("endpoint,device,created_at,last_status,last_error,last_at").order("created_at", { ascending: false }).then(function (r) { return r.error ? [] : r.data; });
    },
    pushDelete: function (endpoint) { return sb.from("push_subscriptions").delete().eq("endpoint", endpoint).then(function (r) { fail(r.error); }); },
    pushTest: function () { return fn("weather-alerts", { test: true }); },

    /* ---------- účet ---------- */
    deleteAccount: function () { return fn("delete-account").then(function () { return sb.auth.signOut(); }); }
  };
  window.EBApi = api;
})();
