// Jeden súbor na nasadenie cez Supabase (pomocné funkcie sú vložené priamo)
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
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

export const APP = "https://elitebikersk.github.io/elitebiker-ride/";
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

export function initPush(S: Record<string, string>) {
  if (!S.vapid_public || !S.vapid_private) return false;
  webpush.setVapidDetails(APP, S.vapid_public, S.vapid_private);
  return true;
}

// pošle upozornenie na všetky zariadenia daných ľudí (len tie, ktoré majú zapnutý daný druh)
export async function sendTo(db: SupabaseClient, userIds: string[], payload: Record<string, unknown>, kind: "weather" | "social") {
  if (!userIds.length) return 0;
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth, user_id").in("user_id", userIds).eq(kind, true);
  let ok = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 12 * 3600, urgency: "high" });
      ok++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return ok;
}
// Upozornenia do mobilu na udalosti v partii – volá ich databáza (trigger cez pg_net) s kľúčom z Vaultu.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function clip(v: unknown, d: string, n = 60) { const s = String(v ?? "").trim(); return s ? (s.length > n ? s.slice(0, n - 1) + "…" : s) : d; }

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(req, { error: "method" }, 405);
  const db = admin();
  const S = await secrets(db);
  if (!S.cron_key || !sameSecret(req.headers.get("x-cron-key") ?? "", S.cron_key)) return json(req, { error: "forbidden" }, 403);
  if (!initPush(S)) return json(req, { error: "Upozornenia nie sú nastavené." }, 500);
  const b = await readJson(req);
  const user = String(b.user_id ?? "");
  if (!UUID.test(user)) return json(req, { error: "bad user" }, 400);
  const actor = clip(b.actor, "Biker", 40), first = actor.split(" ")[0];
  const ride = UUID.test(String(b.ride_id ?? "")) ? String(b.ride_id) : null;
  const title = clip(b.title, "jazda", 60), at = b.starts_at ? when(String(b.starts_at)) : "";
  let p: Record<string, unknown> | null = null;
  switch (b.kind) {
    case "friend_request":
      p = { title: "👋 Nová žiadosť o priateľstvo", body: `${actor} si ťa chce pridať do partie. Ťukni a potvrď.`, url: APP + "#partia", tag: "fr-" + user };
      break;
    case "friend_accepted":
      p = { title: `🤝 ${first} prijal tvoju žiadosť`, body: `S ${actor} ste odteraz v partii – môžete si posielať jazdy.`, url: APP + "#partia", tag: "fa-" + user };
      break;
    case "friend_joined":
      p = { title: `🎉 ${first} sa pridal cez tvoj odkaz`, body: `${actor} je v EliteBiker Ride a v tvojej partii.`, url: APP + "#partia", tag: "fj-" + user };
      break;
    case "ride_invite":
      if (ride) p = { title: `🚴 ${first} ťa volá na jazdu`, body: `${title}${at ? " – " + at : ""}. Ťukni a daj vedieť, či ideš.`, url: APP + "#jazda-" + ride, tag: "ri-" + ride };
      break;
    case "ride_join":
      if (ride) p = { title: `✅ ${first} ide s tebou`, body: `${title}${at ? " – " + at : ""}`, url: APP + "#jazda-" + ride, tag: "rj-" + ride + "-" + first };
      break;
  }
  if (!p) return json(req, { error: "bad kind" }, 400);
  const sent = await sendTo(db, [user], p, "social");
  return json(req, { sent });
});
