// Upozornenia na zlé počasie (spúšťa pg_cron každú hodinu) + skúšobné upozornenie pre prihláseného.
import webpush from "npm:web-push@3.6.7";
import { admin, cors, currentUser, json, readJson } from "../_shared/util.ts";
import { evaluate, forecast } from "../_shared/weather.ts";

const APP = "https://elitebikersk.github.io/elitebiker-ride/";
const DN = ["nedeľa", "pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota"];

function when(iso: string) {
  const d = new Date(iso), tz = "Europe/Bratislava";
  const day = new Date(d.toLocaleString("en-US", { timeZone: tz }));
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const diff = Math.round((new Date(day.toDateString()).getTime() - new Date(now.toDateString()).getTime()) / 864e5);
  const hm = d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  return (diff === 0 ? "dnes" : diff === 1 ? "zajtra" : DN[day.getDay()]) + " o " + hm;
}

async function sendTo(db: ReturnType<typeof admin>, userIds: string[], payload: Record<string, unknown>) {
  if (!userIds.length) return 0;
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth, user_id").in("user_id", userIds).eq("weather", true);
  let ok = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 6 * 3600, urgency: "high" });
      ok++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return ok;
}

// tajné kľúče sú zašifrované v Supabase Vault (čítať ich môže len server)
async function secrets(db: ReturnType<typeof admin>): Promise<Record<string, string>> {
  const { data, error } = await db.rpc("server_secrets");
  if (!error && data && typeof data === "object" && Object.keys(data).length) return data as Record<string, string>;
  const { data: old } = await db.from("app_secrets").select("name, value");   // pred presunom do Vaultu
  return Object.fromEntries((old ?? []).map((x: { name: string; value: string }) => [x.name, x.value]));
}

// porovnanie bez úniku informácie cez čas odpovede
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const db = admin();
  const S = await secrets(db);
  if (!S.vapid_public || !S.vapid_private) return json(req, { error: "Upozornenia nie sú nastavené." }, 500);
  webpush.setVapidDetails(APP, S.vapid_public, S.vapid_private);
  const body = await readJson(req);

  // skúšobné upozornenie pre prihláseného
  if (body.test) {
    const user = await currentUser(req);
    if (!user) return json(req, { error: "Nie si prihlásený." }, 401);
    const n = await sendTo(db, [user.id], { title: "EliteBiker Ride 🚴", body: "Upozornenia fungujú. Ak bude na tvoju jazdu zlé počasie, dáme ti vedieť.", url: APP, tag: "test" });
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
    });
    await db.from("ride_weather_alerts").upsert({ ride_id: r.id, summary });
    report.push({ ride: r.id, summary, sent: n });
  }
  return json(req, { checked: (rides ?? []).length, alerts: report });
});
