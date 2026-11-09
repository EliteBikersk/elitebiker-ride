// Posledné príspevky z Instagramu – len pre samotného používateľa (jeho vlastný účet).
import { admin, cors, currentUser, json } from "../_shared/util.ts";

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
