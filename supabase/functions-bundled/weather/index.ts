// Jeden súbor na nasadenie cez Supabase (pomocné funkcie sú vložené priamo)

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
// Predpoveď počasia pre stretká jázd (pre aplikáciu). Vstup: { points: [{ lat, lng }] }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const user = await currentUser(req);
  if (!user) return json(req, { error: "Nie si prihlásený." }, 401);
  const body = await readJson(req);
  const pts = (Array.isArray(body.points) ? body.points : []).slice(0, 30) as { lat: number; lng: number }[];
  const db = admin(), out: Record<string, unknown> = {}, seen = new Set<string>();
  for (const p of pts) {
    const lat = Number(p?.lat), lng = Number(p?.lng);
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const k = keyOf(lat, lng);
    if (seen.has(k)) continue;
    seen.add(k);
    try { out[k] = await forecast(db, lat, lng); } catch (_) { out[k] = null; }
  }
  return json(req, { data: out, credit: "MET Norway" });
});
