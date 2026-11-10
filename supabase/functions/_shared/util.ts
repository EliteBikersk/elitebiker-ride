// Spoločné pomocné funkcie pre serverové funkcie EliteBiker Ride
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
