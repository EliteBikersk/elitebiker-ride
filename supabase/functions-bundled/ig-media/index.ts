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
// Posledné príspevky z Instagramu – len pre samotného používateľa (jeho vlastný účet).

const GRAPH = "https://graph.instagram.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const user = await currentUser(req);
  if (!user) return json(req, { error: "Nie si prihlásený." }, 401);
  const db = admin();
  const { data: tok } = await db.from("ig_tokens").select("*").eq("user_id", user.id).maybeSingle();
  if (!tok) return json(req, { connected: false, media: [] });

  let token = tok.access_token as string;
  // obnov token, ak o menej ako 10 dní vyprší
  if (tok.expires_at && new Date(tok.expires_at).getTime() - Date.now() < 10 * 864e5) {
    const r = await fetch(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
    const j = await r.json();
    if (r.ok && j.access_token) {
      token = j.access_token;
      await db.from("ig_tokens").update({
        access_token: token,
        expires_at: new Date(Date.now() + (j.expires_in ?? 5184000) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    }
  }
  const r = await fetch(`${GRAPH}/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp&limit=9&access_token=${
    encodeURIComponent(token)}`);
  const j = await r.json();
  if (!r.ok) return json(req, { connected: true, media: [], error: j?.error?.message });
  const media = (j.data ?? []).map((m: Record<string, string>) => ({
    id: m.id, type: m.media_type, image: m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url,
    link: m.permalink, caption: (m.caption ?? "").slice(0, 140), at: m.timestamp,
  }));
  return json(req, { connected: true, media });
});
