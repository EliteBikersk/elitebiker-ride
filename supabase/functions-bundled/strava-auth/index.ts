// Jeden súbor na nasadenie cez Supabase (pomocné funkcie sú vložené priamo)
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

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

// ---- funkcia ----
// Pripojenie Stravy k prihlásenému účtu.  POST { code, scope }

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
