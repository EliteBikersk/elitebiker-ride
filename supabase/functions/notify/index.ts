// Upozornenia do mobilu na udalosti v partii – volá ich databáza (trigger cez pg_net) s kľúčom z Vaultu.
import { admin, json, readJson } from "../_shared/util.ts";
import { APP, initPush, sameSecret, secrets, sendTo, when } from "../_shared/push.ts";

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
