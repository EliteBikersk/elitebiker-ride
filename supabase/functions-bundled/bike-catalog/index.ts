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
// Katalóg bicyklov z e-shopu elitebiker.sk (kategórie Bicykel pre každého a Elektrobicykel) – spúšťa pg_cron raz denne.
// Ukladá len verejné údaje: ID produktu, názov, značku, odkaz a fotku.

const BASE = "https://www.elitebiker.sk";
const CATEGORIES: [string, boolean][] = [["/bicykel-pre-kazdeho/", false], ["/elektrobicykel/", true]];
const UA = "EliteBikerRide/1.0 (+https://elitebikersk.github.io/elitebiker-ride/)";
type Bike = { id: number; name: string; brand: string | null; url: string; image: string | null; ebike?: boolean };

function decode(s: string) {
  return s.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

export function parse(html: string): Bike[] {
  const out: Bike[] = [];
  const parts = html.split('data-micro="product"').slice(1);
  for (const part of parts) {
    const block = part.slice(0, 4000);
    const id = +(block.match(/data-micro-product-id="(\d+)"/)?.[1] ?? 0);
    const href = block.match(/<a href="(\/[^"]+)" class="image"/)?.[1];
    const img = block.match(/<img\b[^>]*>/)?.[0] ?? "";
    const alt = img.match(/\salt="([^"]*)"/)?.[1];
    let src = img.match(/\sdata-src="([^"]+)"/)?.[1] ?? img.match(/\ssrc="([^"]+)"/)?.[1] ?? "";
    src = decode(src);
    if (!id || !href || !alt) continue;
    // „Bicykel Transition - Smuggler NX“ → značka Transition, názov „Transition Smuggler NX“
    let name = decode(alt).replace(/^(\S+\s+)?bicykel\s+/i, ""), brand = name.split(" ")[0] || "";
    const m = name.match(/^(.*?)\s+-\s+(.+)$/);
    if (m) { const pre = m[1].trim().split(" "); brand = pre[pre.length - 1]; name = brand + " " + m[2].trim(); }
    name = name.slice(0, 160);
    out.push({
      id, name, brand: brand || null,
      url: BASE + href,
      image: /^https:\/\/cdn\.myshoptet\.com\//.test(src) ? src : null,
    });
  }
  return out;
}

Deno.serve(async (req) => {
  const db = admin();
  const S = await secrets(db);
  if (!S.cron_key || !sameSecret(req.headers.get("x-cron-key") ?? "", S.cron_key)) return json(req, { error: "forbidden" }, 403);
  const started = new Date().toISOString();
  const seen = new Map<number, Bike>();
  for (const [cat, ebike] of CATEGORIES) {
    for (let page = 1; page <= 60; page++) {
      const r = await fetch(BASE + cat + (page > 1 ? `strana-${page}/` : ""), { headers: { "User-Agent": UA, "Accept-Language": "sk" } });
      if (!r.ok) break;
      const html = await r.text();
      let added = 0;
      for (const b of parse(html)) {
        const old = seen.get(b.id);
        if (!old) { seen.set(b.id, { ...b, ebike }); added++; } else if (ebike) old.ebike = true;
      }
      if (!added || !html.includes(`strana-${page + 1}/`)) break;
    }
  }
  if (seen.size < 20) return json(req, { error: "Načítalo sa príliš málo bicyklov – katalóg nemením.", count: seen.size }, 502);
  const rows = [...seen.values()].map((b) => ({ ...b, ebike: !!b.ebike, updated_at: new Date().toISOString() }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from("catalog_bikes").upsert(rows.slice(i, i + 200));
    if (error) return json(req, { error: error.message }, 500);
  }
  // čo už v e-shope nie je, zmizne z katalógu (bicykle používateľov ostávajú)
  await db.from("catalog_bikes").delete().lt("updated_at", started);
  return json(req, { count: rows.length });
});
