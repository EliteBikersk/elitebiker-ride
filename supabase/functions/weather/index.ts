// Predpoveď počasia pre stretká jázd (pre aplikáciu). Vstup: { points: [{ lat, lng }] }
import { admin, cors, currentUser, json, readJson } from "../_shared/util.ts";
import { forecast, keyOf } from "../_shared/weather.ts";

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
