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
// Spoločné pre upozornenia do mobilu (web push): tajné kľúče z Vaultu, odoslanie, čas jazdy po slovensky.
// Šifrovanie podľa RFC 8291 (aes128gcm) a podpis VAPID (RFC 8292) – len cez WebCrypto, bez knižníc pre Node.

export const APP = "https://elitebikersk.github.io/elitebiker-ride/";
const SUBJECT = "mailto:info@elitebiker.sk";
const DN = ["nedeľa", "pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota"];

export function when(iso: string) {
  const d = new Date(iso), tz = "Europe/Bratislava";
  const day = new Date(d.toLocaleString("en-US", { timeZone: tz }));
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const diff = Math.round((new Date(day.toDateString()).getTime() - new Date(now.toDateString()).getTime()) / 864e5);
  const hm = d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const dm = d.toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", timeZone: tz });
  return (diff === 0 ? "dnes" : diff === 1 ? "zajtra" : diff > 1 && diff < 7 ? DN[day.getDay()] : DN[day.getDay()] + " " + dm) + " o " + hm;
}

// tajné kľúče sú zašifrované v Supabase Vault (čítať ich môže len server)
export async function secrets(db: SupabaseClient): Promise<Record<string, string>> {
  const { data, error } = await db.rpc("server_secrets");
  if (!error && data && typeof data === "object") return data as Record<string, string>;
  return {};
}

// porovnanie bez úniku informácie cez čas odpovede
export function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/* ---------- base64url a pomocné funkcie ---------- */
export function b64uDecode(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}
export function b64uEncode(a: Uint8Array): string {
  let s = "";
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const te = new TextEncoder();
async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data as BufferSource));
}

/* ---------- VAPID (podpis servera) ---------- */
let VAPID: { pub: string; key: CryptoKey } | null = null;
export async function initPush(S: Record<string, string>): Promise<boolean> {
  if (!S.vapid_public || !S.vapid_private) return false;
  const pub = b64uDecode(S.vapid_public);
  if (pub.length !== 65 || pub[0] !== 4) return false;
  const key = await crypto.subtle.importKey("jwk", {
    kty: "EC", crv: "P-256", d: S.vapid_private, x: b64uEncode(pub.slice(1, 33)), y: b64uEncode(pub.slice(33, 65)), ext: true,
  }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  VAPID = { pub: S.vapid_public, key };
  return true;
}
const jwtCache = new Map<string, { t: string; exp: number }>();
async function vapidAuth(endpoint: string): Promise<string> {
  if (!VAPID) throw new Error("VAPID nie je nastavené");
  const aud = new URL(endpoint).origin, now = Math.floor(Date.now() / 1000);
  const c = jwtCache.get(aud);
  if (c && c.exp - now > 3600) return `vapid t=${c.t}, k=${VAPID.pub}`;
  const exp = now + 12 * 3600;
  const head = b64uEncode(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64uEncode(te.encode(JSON.stringify({ aud, exp, sub: SUBJECT })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, VAPID.key, te.encode(head + "." + body) as BufferSource));
  const t = head + "." + body + "." + b64uEncode(sig);
  jwtCache.set(aud, { t, exp });
  return `vapid t=${t}, k=${VAPID.pub}`;
}

/* ---------- šifrovanie obsahu pre zariadenie (RFC 8291, aes128gcm) ---------- */
export async function encrypt(p256dh: string, authSecret: string, plaintext: Uint8Array): Promise<Uint8Array> {
  const ua = b64uDecode(p256dh), auth = b64uDecode(authSecret);
  const uaKey = await crypto.subtle.importKey("raw", ua as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const prkKey = await hmac(auth, shared);
  const ikm = await hmac(prkKey, concat(te.encode("WebPush: info\0"), ua, asPub, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(te.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(te.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey("raw", cek as BufferSource, { name: "AES-GCM" }, false, ["encrypt"]);
  const record = concat(plaintext, new Uint8Array([2])); // 0x02 = posledný záznam
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource, tagLength: 128 }, key, record as BufferSource));
  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}

export type Sub = { endpoint: string; p256dh: string; auth: string };
// pošle jedno upozornenie; vráti HTTP kód služby (201 = prijaté)
export async function pushOne(sub: Sub, payload: Record<string, unknown>, ttl = 12 * 3600): Promise<{ status: number; error?: string }> {
  try {
    const body = await encrypt(sub.p256dh, sub.auth, te.encode(JSON.stringify(payload)));
    const r = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Authorization": await vapidAuth(sub.endpoint),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "TTL": String(ttl),
        "Urgency": "high",
      },
      body: body as BodyInit,
    });
    const txt = r.ok ? "" : (await r.text()).slice(0, 300);
    return { status: r.status, error: r.ok ? undefined : txt || r.statusText };
  } catch (e) {
    return { status: 0, error: String((e as Error)?.message ?? e).slice(0, 300) };
  }
}

// pošle upozornenie na všetky zariadenia daných ľudí (len tie, ktoré majú zapnutý daný druh)
export async function sendTo(db: SupabaseClient, userIds: string[], payload: Record<string, unknown>, kind: "weather" | "social") {
  if (!userIds.length) return 0;
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth, user_id").in("user_id", userIds).eq(kind, true);
  let ok = 0;
  for (const s of subs ?? []) {
    const r = await pushOne(s, payload);
    if (r.status >= 200 && r.status < 300) ok++;
    if (r.status === 404 || r.status === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    else await db.from("push_subscriptions").update({ last_status: r.status, last_error: r.error ?? null, last_at: new Date().toISOString() }).eq("endpoint", s.endpoint);
  }
  return ok;
}
// Upozornenia na zlé počasie (spúšťa pg_cron každú hodinu) + skúšobné upozornenie pre prihláseného.

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
    const summary = `${reasons} · ${w.tmin === w.tmax ? w.tmin : w.tmin + " až " + w.tmax} °C` + (w.pr ? ` · ${w.pr} mm` : "") + (w.gust >= 40 ? ` · nárazy ${w.gust} km/h` : "");
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
