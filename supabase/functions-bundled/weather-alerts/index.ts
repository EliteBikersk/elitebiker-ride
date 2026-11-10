// Jeden súbor na nasadenie cez Supabase (pomocné funkcie sú vložené priamo)
import webpush from "npm:web-push@3.6.7";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
// Spoločné pomocné funkcie pre serverové funkcie EliteBiker Ride


const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://elitebikersk.github.io,http://localhost:8080").split(",").map((s) => s.trim());

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}

export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Chýba nastavenie ${name}`);
  return v;
}

function secretKey(): string {
  try {
    const k = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default;
    if (k) return k;
  } catch (_) { /* staršie projekty */ }
  return env("SUPABASE_SERVICE_ROLE_KEY");
}

export function admin(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Prihlásený používateľ z hlavičky Authorization (alebo null). */
export async function currentUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token || token.startsWith("sb_")) return null;
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try { return await req.json(); } catch { return {}; }
}

// ---- počasie ----
// Predpoveď počasia z MET Norway (yr.no) – zadarmo aj na komerčné použitie, CC BY 4.0.
// https://api.met.no/weatherapi/locationforecast/2.0/documentation

export type Pt = { t: number; dur: number; temp: number | null; wind: number | null; gust: number | null; sym: string; pr: number; pop: number | null; thu: number | null };

const UA = "EliteBikerRide/1.0 (+https://elitebikersk.github.io/elitebiker-ride/)";

export function keyOf(lat: number, lng: number) {
  return lat.toFixed(2) + "," + lng.toFixed(2);
}

// stiahne a zjednoduší predpoveď; cache v tabuľke weather_cache na 1 hodinu
export async function forecast(db: SupabaseClient, lat: number, lng: number): Promise<Pt[] | null> {
  const key = keyOf(lat, lng);
  const { data: c } = await db.from("weather_cache").select("data, fetched_at").eq("key", key).maybeSingle();
  if (c && Date.now() - new Date(c.fetched_at).getTime() < 60 * 60e3) return c.data as Pt[];
  const [la, lo] = key.split(",");
  const r = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${la}&lon=${lo}`, { headers: { "User-Agent": UA } });
  if (!r.ok) return c ? (c.data as Pt[]) : null;
  const j = await r.json();
  const out: Pt[] = [];
  for (const s of j?.properties?.timeseries ?? []) {
    const d = s.data ?? {}, inst = d.instant?.details ?? {};
    const nx = d.next_1_hours ?? d.next_6_hours;
    if (!nx) continue;
    out.push({
      t: new Date(s.time).getTime(),
      dur: d.next_1_hours ? 1 : 6,
      temp: inst.air_temperature ?? null,
      wind: inst.wind_speed ?? null,
      gust: inst.wind_speed_of_gust ?? null,
      sym: nx.summary?.symbol_code ?? "",
      pr: nx.details?.precipitation_amount ?? 0,
      pop: nx.details?.probability_of_precipitation ?? null,
      thu: nx.details?.probability_of_thunder ?? null,
    });
  }
  await db.from("weather_cache").upsert({ key, data: out, fetched_at: new Date().toISOString() });
  return out;
}

const LABEL: Record<string, string> = {
  clearsky: "jasno", fair: "takmer jasno", partlycloudy: "polojasno", cloudy: "zamračené", fog: "hmla",
  lightrain: "slabý dážď", rain: "dážď", heavyrain: "silný dážď",
  lightrainshowers: "slabé prehánky", rainshowers: "prehánky", heavyrainshowers: "silné prehánky",
  lightsleet: "slabý dážď so snehom", sleet: "dážď so snehom", heavysleet: "silný dážď so snehom",
  lightsleetshowers: "prehánky so snehom", sleetshowers: "prehánky so snehom", heavysleetshowers: "silné prehánky so snehom",
  lightsnow: "slabé sneženie", snow: "sneženie", heavysnow: "silné sneženie",
  lightsnowshowers: "snehové prehánky", snowshowers: "snehové prehánky", heavysnowshowers: "silné snehové prehánky",
};
export function symLabel(sym: string) {
  const s = sym.replace(/_(day|night|polartwilight)$/, "");
  if (s.includes("thunder")) return "búrka";
  return LABEL[s] ?? s;
}
function rank(sym: string) {
  if (sym.includes("thunder")) return 9;
  if (sym.includes("heavy")) return 8;
  if (sym.includes("snow") || sym.includes("sleet")) return 7;
  if (sym.startsWith("rain") || sym.includes("_rain") || sym.startsWith("rainshowers")) return 6;
  if (sym.startsWith("light")) return 5;
  if (sym.startsWith("fog")) return 3;
  if (sym.startsWith("cloudy")) return 2;
  if (sym.startsWith("partlycloudy")) return 1;
  return 0;
}

// zhrnutie počasia počas jazdy + dôvody, prečo je zlé (rovnaké pravidlá ako v aplikácii)
export function evaluate(series: Pt[], start: number, end: number) {
  const pts = series.filter((p) => p.t + p.dur * 3600e3 > start && p.t < end);
  if (!pts.length) return null;
  let tmin = Infinity, tmax = -Infinity, pr = 0, pop = 0, wind = 0, gust = 0, thu = 0, sym = "";
  for (const p of pts) {
    if (p.temp != null) { tmin = Math.min(tmin, p.temp); tmax = Math.max(tmax, p.temp); }
    const ov = Math.max(0, Math.min(end, p.t + p.dur * 3600e3) - Math.max(start, p.t)) / 3600e3;
    pr += p.dur === 1 ? p.pr : p.pr * Math.min(1, ov / p.dur);
    pop = Math.max(pop, p.pop ?? 0); thu = Math.max(thu, p.thu ?? 0);
    wind = Math.max(wind, p.wind ?? 0); gust = Math.max(gust, p.gust ?? 0);
    if (rank(p.sym) >= rank(sym)) sym = p.sym;
  }
  const bad: string[] = [];
  if (sym.includes("thunder") || thu >= 30) bad.push("búrka");
  if (sym.includes("snow")) bad.push("sneženie");
  else if (sym.includes("sleet")) bad.push("dážď so snehom");
  if (pr >= 5 || (sym.includes("heavyrain"))) bad.push("silný dážď");
  else if (pr >= 1 && (pop >= 50 || pops(pts))) bad.push("dážď");
  if (gust >= 15 || wind >= 10) bad.push("silný vietor");
  if (tmax >= 33) bad.push("horúčava");
  return { tmin: Math.round(tmin), tmax: Math.round(tmax), pr: Math.round(pr * 10) / 10, pop, wind: Math.round(wind * 3.6), gust: Math.round(gust * 3.6), sym, label: symLabel(sym), bad };
}
function pops(pts: Pt[]) { return pts.every((p) => p.pop == null); }

// ---- funkcia ----
// Upozornenia na zlé počasie (spúšťa pg_cron každú hodinu) + skúšobné upozornenie pre prihláseného.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const db = admin();
  const { data: sec } = await db.from("app_secrets").select("name, value");
  const S = Object.fromEntries((sec ?? []).map((x) => [x.name, x.value]));
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
  if (!S.cron_key || req.headers.get("x-cron-key") !== S.cron_key) return json(req, { error: "forbidden" }, 403);
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
