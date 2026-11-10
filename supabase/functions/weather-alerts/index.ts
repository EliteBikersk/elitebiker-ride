// Upozornenia na zlé počasie (spúšťa pg_cron každú hodinu) + skúšobné upozornenie pre prihláseného.
import { admin, cors, currentUser, json, readJson } from "../_shared/util.ts";
import { evaluate, forecast } from "../_shared/weather.ts";
import { APP, initPush, sameSecret, secrets, sendTo, when } from "../_shared/push.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const db = admin();
  const S = await secrets(db);
  if (!(await initPush(S))) return json(req, { error: "Upozornenia nie sú nastavené." }, 500);
  const body = await readJson(req);

  // skúšobné upozornenie pre prihláseného
  if (body.test) {
    const user = await currentUser(req);
    if (!user) return json(req, { error: "Nie si prihlásený." }, 401);
    const n = await sendTo(db, [user.id], { title: "EliteBiker Ride 🚴", body: "Upozornenia fungujú. Dáme ti vedieť o žiadostiach, pozvánkach na jazdy aj o zlom počasí.", url: APP, tag: "test" }, "social");
    return json(req, { sent: n });
  }

  // pg_cron
  if (!S.cron_key || !sameSecret(req.headers.get("x-cron-key") ?? "", S.cron_key)) return json(req, { error: "forbidden" }, 403);
  const now = Date.now();
  const { data: rides } = await db.from("rides").select("id, title, starts_at, ends_at, meet_lat, meet_lng, ride_participants(user_id)")
    .gt("starts_at", new Date(now + 30 * 60e3).toISOString()).lte("starts_at", new Date(now + 24 * 3600e3).toISOString());
  const { data: done } = await db.from("ride_weather_alerts").select("ride_id").in("ride_id", (rides ?? []).map((r) => r.id));
  const sent = new Set((done ?? []).map((d) => d.ride_id));
  const report: unknown[] = [];
  for (const r of rides ?? []) {
    if (sent.has(r.id)) continue;
    const series = await forecast(db, r.meet_lat, r.meet_lng);
    if (!series) continue;
    const w = evaluate(series, new Date(r.starts_at).getTime(), new Date(r.ends_at).getTime());
    if (!w || !w.bad.length) continue;
    const reasons = w.bad.join(", ");
    const summary = `${reasons} · ${w.tmin === w.tmax ? w.tmin : w.tmin + "–" + w.tmax} °C` + (w.pr ? ` · ${w.pr} mm` : "") + (w.gust >= 40 ? ` · nárazy ${w.gust} km/h` : "");
    const users = (r.ride_participants ?? []).map((p: { user_id: string }) => p.user_id);
    const n = await sendTo(db, users, {
      title: `⚠️ Zlé počasie: ${r.title}`,
      body: `${when(r.starts_at)} hlásia ${summary}. Dohodnite sa v chate, či idete.`,
      url: APP + "#jazda-" + r.id, tag: "pocasie-" + r.id,
    }, "weather");
    await db.from("ride_weather_alerts").upsert({ ride_id: r.id, summary });
    report.push({ ride: r.id, summary, sent: n });
  }
  return json(req, { checked: (rides ?? []).length, alerts: report });
});
