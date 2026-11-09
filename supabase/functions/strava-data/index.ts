// Údaje zo Stravy – VŽDY len pre samotného používateľa (podmienka Strava API).
// POST {}                    → štatistiky, posledné aktivity, bicykle
// POST { action: "disconnect" } → odpojenie Stravy
import { admin, cors, currentUser, env, json, readJson } from "../_shared/util.ts";

const API = "https://www.strava.com/api/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const user = await currentUser(req);
  if (!user) return json(req, { error: "Nie si prihlásený." }, 401);
  const body = await readJson(req);
  const db = admin();
  const { data: tok } = await db.from("strava_tokens").select("*").eq("user_id", user.id).maybeSingle();
  if (!tok) return json(req, { connected: false });

  let access = tok.access_token as string;
  if (new Date(tok.expires_at).getTime() - Date.now() < 120_000) {
    const r = await fetch("https://www.strava.com/oauth/token", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env("STRAVA_CLIENT_ID"), client_secret: env("STRAVA_CLIENT_SECRET"),
        grant_type: "refresh_token", refresh_token: tok.refresh_token,
      }),
    });
    const t = await r.json();
    if (!r.ok || !t.access_token) return json(req, { connected: true, error: "Stravu treba pripojiť znova." }, 400);
    access = t.access_token;
    await db.from("strava_tokens").update({
      access_token: t.access_token, refresh_token: t.refresh_token,
      expires_at: new Date(t.expires_at * 1000).toISOString(), updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
  }
  const H = { Authorization: `Bearer ${access}` };

  if (body.action === "disconnect") {
    await fetch("https://www.strava.com/oauth/deauthorize", { method: "POST", headers: H });
    await db.from("strava_tokens").delete().eq("user_id", user.id);
    await db.from("profiles").update({ strava_connected: false }).eq("id", user.id);
    return json(req, { connected: false });
  }

  const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
  const [aR, sR, actR] = await Promise.all([
    fetch(`${API}/athlete`, { headers: H }),
    fetch(`${API}/athletes/${tok.athlete_id}/stats`, { headers: H }),
    fetch(`${API}/athlete/activities?per_page=15`, { headers: H }),
  ]);
  const athlete = aR.ok ? await aR.json() : {};
  const stats = sR.ok ? await sR.json() : {};
  const acts = actR.ok ? await actR.json() : [];
  const rideTypes = ["Ride", "MountainBikeRide", "GravelRide", "EBikeRide", "EMountainBikeRide", "VirtualRide"];
  const activities = (Array.isArray(acts) ? acts : [])
    .filter((a: Record<string, unknown>) => rideTypes.includes(String(a.sport_type ?? a.type)))
    .map((a: Record<string, unknown>) => ({
      id: a.id, name: a.name, type: a.sport_type ?? a.type, start: a.start_date_local,
      km: Math.round(Number(a.distance) / 100) / 10, moving_s: a.moving_time,
      elev: Math.round(Number(a.total_elevation_gain)), gear_id: a.gear_id,
    }));
  const week = activities.filter((a) => new Date(String(a.start)).getTime() / 1000 >= weekAgo);
  const tot = (o: Record<string, number> | undefined) =>
    o ? { count: o.count, km: Math.round(o.distance / 1000), elev: Math.round(o.elevation_gain), hours: Math.round(o.moving_time / 3600) } : null;

  return json(req, {
    connected: true,
    week: { count: week.length, km: Math.round(week.reduce((s, a) => s + a.km, 0)), elev: week.reduce((s, a) => s + a.elev, 0) },
    recent: tot(stats.recent_ride_totals), ytd: tot(stats.ytd_ride_totals), all: tot(stats.all_ride_totals),
    activities: activities.slice(0, 8),
    bikes: (athlete.bikes ?? []).map((b: Record<string, unknown>) => ({
      id: b.id, name: b.name, km: Math.round(Number(b.distance) / 1000), primary: b.primary,
    })),
  });
});
