// Zmazanie účtu a všetkých údajov (GDPR).
import { admin, cors, currentUser, json } from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const user = await currentUser(req);
  if (!user) return json(req, { error: "Nie si prihlásený." }, 401);
  const db = admin();
  const { data: avatars } = await db.storage.from("avatars").list(user.id, { limit: 100 });
  if (avatars?.length) await db.storage.from("avatars").remove(avatars.map((f) => `${user.id}/${f.name}`));
  const { data: photos } = await db.from("ride_photos").select("path").eq("user_id", user.id);
  if (photos?.length) await db.storage.from("ride-photos").remove(photos.map((p) => p.path as string));
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return json(req, { error: error.message }, 500);
  return json(req, { deleted: true });
});
