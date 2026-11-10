// Prihlásenie cez Instagram (Instagram API with Instagram Login)
// POST { code, redirect_uri }  →  { token_hash, email }  (klient potom zavolá auth.verifyOtp)
// Ak príde s hlavičkou Authorization prihláseného používateľa a { link: true },
// Instagram sa len pripojí k existujúcemu účtu.
import { admin, cors, currentUser, env, json, readJson } from "../_shared/util.ts";

const GRAPH = "https://graph.instagram.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    const body = await readJson(req);
    const code = String(body.code ?? "").replace(/#_$/, "");
    const redirectUri = (Deno.env.get("APP_URL") || "https://elitebikersk.github.io/elitebiker-ride/");
    if (!code) return json(req, { error: "Chýba kód z Instagramu." }, 400);

    // 1) kód → krátkodobý token
    const form = new URLSearchParams({
      client_id: env("IG_APP_ID"),
      client_secret: env("IG_APP_SECRET"),
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    const tRes = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
    const t = await tRes.json();
    if (!tRes.ok || !t.access_token) {
      return json(req, { error: "Instagram prihlásenie zlyhalo.", detail: t?.error_message ?? t }, 400);
    }

    // 2) dlhodobý token (60 dní)
    const lRes = await fetch(`${GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${
      encodeURIComponent(env("IG_APP_SECRET"))}&access_token=${encodeURIComponent(t.access_token)}`);
    const l = await lRes.json();
    const token: string = l.access_token ?? t.access_token;
    const expiresAt = l.expires_in ? new Date(Date.now() + l.expires_in * 1000).toISOString() : null;

    // 3) profil
    const pRes = await fetch(`${GRAPH}/me?fields=user_id,username,name,profile_picture_url,account_type&access_token=${
      encodeURIComponent(token)}`);
    const p = await pRes.json();
    if (!pRes.ok || !p.username) return json(req, { error: "Nepodarilo sa načítať profil z Instagramu.", detail: p }, 400);
    const igId = String(p.user_id ?? p.id);
    const username = String(p.username).toLowerCase();

    const db = admin();
    let userId: string | null = null;
    let email: string | null = null;

    const linkTo = body.link ? await currentUser(req) : null;
    if (body.link && !linkTo) return json(req, { error: "Nie si prihlásený." }, 401);
    const { data: existing } = await db.from("profiles").select("id").eq("ig_user_id", igId).maybeSingle();

    if (linkTo) {
      if (existing && existing.id !== linkTo.id) {
        return json(req, { error: "Tento Instagram už používa iný účet v EliteBiker Ride." }, 409);
      }
      userId = linkTo.id;
    } else if (existing) {
      userId = existing.id;
      const { data: u } = await db.auth.admin.getUserById(existing.id);
      email = u?.user?.email ?? null;
    } else {
      email = `ig-${igId}@users.ride.elitebiker.sk`;
      const { data: created, error } = await db.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { ig_username: username, ig_user_id: igId, name: p.name ?? username, ig_verified: true },
      });
      if (error || !created.user) return json(req, { error: "Nepodarilo sa vytvoriť účet.", detail: error?.message }, 500);
      userId = created.user.id;
    }

    // 4) profilovku skopírujeme k sebe (odkaz z Instagramu po pár dňoch prestane fungovať)
    let avatarUrl: string | null = null;
    if (p.profile_picture_url) {
      try {
        const img = await fetch(p.profile_picture_url);
        if (img.ok) {
          const bytes = new Uint8Array(await img.arrayBuffer());
          const path = `${userId}/instagram.jpg`;
          await db.storage.from("avatars").upload(path, bytes, { contentType: "image/jpeg", upsert: true });
          avatarUrl = db.storage.from("avatars").getPublicUrl(path).data.publicUrl + `?v=${Date.now()}`;
        }
      } catch (_) { /* profilovka nie je povinná */ }
    }

    // ak je meno obsadené ručne zadaným (neovereným) profilom, uvoľníme ho
    await db.from("profiles").update({ ig_username: null })
      .eq("ig_username", username).eq("ig_verified", false).neq("id", userId);

    const update: Record<string, unknown> = { ig_username: username, ig_user_id: igId, ig_verified: true };
    if (avatarUrl) update.avatar_url = avatarUrl;
    const { data: prof } = await db.from("profiles").select("display_name").eq("id", userId).single();
    if (!prof?.display_name && p.name) update.display_name = p.name;
    await db.from("profiles").update(update).eq("id", userId);

    await db.from("ig_tokens").upsert({
      user_id: userId, ig_user_id: igId, access_token: token, expires_at: expiresAt, updated_at: new Date().toISOString(),
    });

    if (linkTo) return json(req, { linked: true, username });

    // 5) jednorazový prihlasovací kód pre klienta
    const { data: link, error: lErr } = await db.auth.admin.generateLink({ type: "magiclink", email: email! });
    if (lErr || !link?.properties?.hashed_token) return json(req, { error: "Nepodarilo sa prihlásiť.", detail: lErr?.message }, 500);
    return json(req, { token_hash: link.properties.hashed_token, email, username });
  } catch (e) {
    return json(req, { error: "Chyba servera.", detail: String(e) }, 500);
  }
});
