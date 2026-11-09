// Pripojenie Stravy k prihlásenému účtu.  POST { code, scope }
import { admin, cors, currentUser, env, json, readJson } from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const user = await currentUser(req);
  if (!user) return json(req, { error: "Nie si prihlásený." }, 401);
  const body = await readJson(req);
  const code = String(body.code ?? "");
  if (!code) return json(req, { error: "Chýba kód zo Stravy." }, 400);

  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env("STRAVA_CLIENT_ID"), client_secret: env("STRAVA_CLIENT_SECRET"),
      code, grant_type: "authorization_code",
    }),
  });
  const t = await r.json();
  if (!r.ok || !t.access_token) return json(req, { error: "Strava pripojenie zlyhalo.", detail: t?.message ?? t }, 400);

  const db = admin();
  const { data: other } = await db.from("strava_tokens").select("user_id").eq("athlete_id", t.athlete.id).maybeSingle();
  if (other && other.user_id !== user.id) return json(req, { error: "Tento Strava účet je pripojený k inému profilu." }, 409);

  await db.from("strava_tokens").upsert({
    user_id: user.id, athlete_id: t.athlete.id, access_token: t.access_token, refresh_token: t.refresh_token,
    expires_at: new Date(t.expires_at * 1000).toISOString(), scope: String(body.scope ?? ""), updated_at: new Date().toISOString(),
  });
  await db.from("profiles").update({ strava_connected: true }).eq("id", user.id);
  return json(req, { connected: true, athlete: { firstname: t.athlete.firstname, city: t.athlete.city } });
});
