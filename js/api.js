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
  var PROFILE_COLS = "id,ig_username,ig_verified,display_name,avatar_url,age,city,bike_types,strava_connected";

  function fail(error, msg) { if (error) { console.error(error); throw new Error(msg || error.message || "Chyba servera"); } }
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
  function normRide(r) {
    return {
      id: r.id, host: r.host, type: r.type, title: r.title, note: r.note || "",
      starts_at: r.starts_at, ends_at: r.ends_at,
      meet: { lat: r.meet_lat, lng: r.meet_lng, label: r.meet_label || "" },
      route: r.route || null, distance_km: r.distance_km != null ? +r.distance_km : null, elevation_m: r.elevation_m,
      pace: r.pace, allow_invites: r.allow_invites, audience_kind: r.audience_kind,
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
    features: { instagram: !!C.IG_APP_ID, strava: !!C.STRAVA_CLIENT_ID },

    /* ---------- prihlásenie ---------- */
    init: function () {
      return api.handleRedirect().then(function (msg) {
        return sb.auth.getSession().then(function (r) { me = r.data.session ? r.data.session.user : null; return { user: me, message: msg }; });
      });
    },
    onAuth: function (cb) { sb.auth.onAuthStateChange(function (_e, s) { me = s ? s.user : null; cb(me); }); },
    userId: function () { return me && me.id; },
    loginInstagram: function (link) {
      var st = (link ? "igl-" : "ig-") + rnd(); sessionStorage.setItem("eb_oauth", st);
      location.href = "https://www.instagram.com/oauth/authorize?client_id=" + encodeURIComponent(C.IG_APP_ID) +
        "&redirect_uri=" + encodeURIComponent(C.APP_URL) + "&response_type=code&scope=instagram_business_basic&state=" + st;
    },
    loginEmail: function (email) {
      return sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: C.APP_URL + location.search } }).then(function (r) { fail(r.error, "E-mail sa nepodarilo odoslať. Skús to o chvíľu."); });
    },
    logout: function () { return sb.auth.signOut(); },
    handleRedirect: function () {
      var p = new URLSearchParams(location.search), code = p.get("code"), state = p.get("state") || "", err = p.get("error_description") || p.get("error");
      if (!code && !err) return Promise.resolve(null);
      var expected = sessionStorage.getItem("eb_oauth"); sessionStorage.removeItem("eb_oauth");
      var keep = new URLSearchParams(location.search); ["code", "state", "scope", "error", "error_reason", "error_description"].forEach(function (k) { keep.delete(k); });
      history.replaceState(null, "", location.pathname + (keep.toString() ? "?" + keep : "") + location.hash.replace(/^#_$/, ""));
      if (err) return Promise.resolve("Prihlásenie bolo zrušené.");
      if (!expected || expected !== state) return Promise.resolve("Odkaz na prihlásenie vypršal, skús to znova.");
      if (state.indexOf("ig-") === 0) {
        return fn("instagram-auth", { code: code, redirect_uri: C.APP_URL }).then(function (d) {
          return sb.auth.verifyOtp({ token_hash: d.token_hash, type: "magiclink" }).then(function (r) { fail(r.error, "Prihlásenie zlyhalo."); return "ig-ok"; });
        }).catch(function (e) { return "Instagram: " + e.message; });
      }
      if (state.indexOf("igl-") === 0) {
        return fn("instagram-auth", { code: code, redirect_uri: C.APP_URL, link: true }).then(function () { return "ig-linked"; }).catch(function (e) { return "Instagram: " + e.message; });
      }
      if (state.indexOf("st-") === 0) {
        return fn("strava-auth", { code: code, scope: p.get("scope") }).then(function () { return "strava-ok"; }).catch(function (e) { return "Strava: " + e.message; });
      }
      return Promise.resolve(null);
    },

    /* ---------- profily ---------- */
    me: function () { return api.profile(me.id); },
    profile: function (id) { return sb.from("profiles").select(PROFILE_COLS).eq("id", id).maybeSingle().then(function (r) { fail(r.error); return r.data; }); },
    profiles: function (ids) {
      if (!ids.length) return Promise.resolve([]);
      return sb.from("profiles").select(PROFILE_COLS).in("id", ids).then(function (r) { fail(r.error); return r.data; });
    },
    updateProfile: function (patch) {
      return sb.from("profiles").update(patch).eq("id", me.id).select(PROFILE_COLS).single().then(function (r) {
        if (r.error && /duplicate|unique/i.test(r.error.message)) throw new Error("Toto Instagram meno už má niekto iný.");
        fail(r.error, "Profil sa nepodarilo uložiť."); return r.data;
      });
    },
    uploadAvatar: function (file) {
      return compress(file, 512, .85).then(function (blob) {
        var path = me.id + "/avatar-" + Date.now() + ".jpg";
        return sb.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: true }).then(function (r) {
          fail(r.error, "Fotku sa nepodarilo nahrať.");
          return api.updateProfile({ avatar_url: sb.storage.from("avatars").getPublicUrl(path).data.publicUrl });
        });
      });
    },
    searchProfiles: function (q) {
      q = q.replace(/^@/, "").toLowerCase().replace(/[^a-z0-9._]/g, "");
      if (q.length < 2) return Promise.resolve([]);
      return sb.from("profiles").select(PROFILE_COLS).ilike("ig_username", "%" + q + "%").neq("id", me.id).limit(15).then(function (r) { fail(r.error); return r.data; });
    },
    byHandle: function (h) {
      return sb.from("profiles").select(PROFILE_COLS).eq("ig_username", String(h).toLowerCase().replace(/^@/, "")).maybeSingle().then(function (r) { return r.data; });
    },

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
        distance_km: d.distance_km || null, pace: d.pace, allow_invites: !!d.allow_invites, audience_kind: d.audience_kind || "pick"
      };
      return sb.from("rides").insert(row).select().single().then(function (r) {
        fail(r.error, "Jazdu sa nepodarilo uložiť.");
        var rows = audience.map(function (u) { return { ride_id: r.data.id, user_id: u, invited_by: me.id }; });
        return (rows.length ? sb.from("ride_audience").insert(rows) : Promise.resolve({})).then(function (x) { fail(x.error, "Jazda je uložená, ale pozvánky sa nepodarilo poslať."); return r.data.id; });
      });
    },
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

    /* ---------- Klub ---------- */
    stats: function () {
      var now = new Date().toISOString();
      return Promise.all([
        sb.from("ride_participants").select("ride_id, rides!inner(host, ends_at)").eq("user_id", me.id).lt("rides.ends_at", now),
        sb.from("ride_photos").select("id", { count: "exact", head: true }).eq("user_id", me.id)
      ]).then(function (r) {
        var rows = (r[0].data || []), hosted = rows.filter(function (x) { return x.rides && x.rides.host === me.id; }).length;
        return { joined: rows.length - hosted, hosted: hosted, photos: r[1].count || 0 };
      });
    },

    /* ---------- Instagram a Strava ---------- */
    igMedia: function () { return fn("ig-media"); },
    stravaConnect: function () {
      var st = "st-" + rnd(); sessionStorage.setItem("eb_oauth", st);
      location.href = "https://www.strava.com/oauth/authorize?client_id=" + encodeURIComponent(C.STRAVA_CLIENT_ID) + "&redirect_uri=" + encodeURIComponent(C.APP_URL) +
        "&response_type=code&approval_prompt=auto&scope=read,activity:read_all,profile:read_all&state=" + st;
    },
    stravaData: function () { return fn("strava-data"); },
    stravaDisconnect: function () { return fn("strava-data", { action: "disconnect" }); },
    deleteAccount: function () { return fn("delete-account").then(function () { return sb.auth.signOut(); }); }
  };
  window.EBApi = api;
})();
