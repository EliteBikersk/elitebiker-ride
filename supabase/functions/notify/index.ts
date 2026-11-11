// Upozornenia do mobilu na udalosti v partii a na jazdách, volá ich databáza (trigger cez pg_net) s kľúčom z Vaultu.
import { admin, json, readJson } from "../_shared/util.ts";
import { APP, b64uEncode, encrypt, initPush, sameSecret, secrets, sendTo, when } from "../_shared/push.ts";

const SERVIS = "https://www.elitebiker.sk/servis-bicyklov-2/";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function clip(v: unknown, d: string, n = 60) { const s = String(v ?? "").trim(); return s ? (s.length > n ? s.slice(0, n - 1) + "…" : s) : d; }

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(req, { error: "method" }, 405);
  const db = admin();
  const S = await secrets(db);
  if (!S.cron_key || !sameSecret(req.headers.get("x-cron-key") ?? "", S.cron_key)) return json(req, { error: "forbidden" }, 403);
  if (!(await initPush(S))) return json(req, { error: "Upozornenia nie sú nastavené." }, 500);
  const b = await readJson(req);
  // kontrola šifrovania priamo na serveri (len s kľúčom z Vaultu)
  if (b.selftest && typeof b.p256dh === "string" && typeof b.auth === "string") {
    return json(req, { body: b64uEncode(await encrypt(b.p256dh, b.auth, new TextEncoder().encode("selftest-ok"))) });
  }
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
      p = { title: `🤝 ${first} prijal tvoju žiadosť`, body: `S ${actor} ste odteraz v partii. Môžete si posielať jazdy.`, url: APP + "#partia", tag: "fa-" + user };
      break;
    case "friend_joined":
      p = { title: `🎉 ${first} sa pridal cez tvoj odkaz`, body: `${actor} je v EliteBiker Ride a v tvojej partii.`, url: APP + "#partia", tag: "fj-" + user };
      break;
    case "ride_invite":
      if (ride) p = { title: `🚴 ${first} ťa volá na jazdu`, body: `${title}${at ? ", " + at : ""}. Ťukni a daj vedieť, či ideš.`, url: APP + "#jazda-" + ride, tag: "ri-" + ride };
      break;
    case "ride_join":
      if (ride) p = { title: `✅ ${first} ide s tebou`, body: `${title}${at ? ", " + at : ""}`, url: APP + "#jazda-" + ride, tag: "rj-" + ride + "-" + first };
      break;
    case "ride_change": {
      const meet = clip(b.meet, "", 60), ch = String(b.changed ?? "");
      const parts = [ch !== "place" && at ? "Nový čas: " + at + "." : "", ch !== "time" && meet ? "Nové stretko: " + meet + "." : ""].filter(Boolean);
      if (ride) p = { title: `✏️ Zmena jazdy: ${title}`, body: `${first} upravil jazdu. ${parts.join(" ")}`.trim(), url: APP + "#jazda-" + ride, tag: "rc-" + ride };
      break;
    }
    case "ride_cancel":
      p = { title: `❌ Jazda zrušená: ${title}`, body: `${first} zrušil jazdu${at ? " " + at : ""}.`, url: APP, tag: "rx-" + title };
      break;
    case "chat":
      if (ride) p = { title: `💬 ${first} v jazde ${title}`, body: clip(b.text, "Nová správa", 140), url: APP + "#jazda-" + ride, tag: "chat-" + ride };
      break;
    case "status": {
      const st = String(b.status ?? "");
      const head = st === "here" ? `📍 ${first} je na mieste` : st === "late" ? `⏱️ ${first} mešká asi 10 minút` : st === "cant" ? `❌ ${first} to nestihne` : "";
      if (ride && head) p = { title: head, body: `${title}${at ? ", " + at : ""}`, url: APP + "#jazda-" + ride, tag: "st-" + ride + "-" + first };
      break;
    }
    case "free": {
      // kamoš má čas jazdiť (dnes alebo zajtra, prípadne od istej hodiny)
      const day = b.day === "tomorrow" ? "zajtra" : "dnes", from = /^\d{1,2}:\d{2}$/.test(String(b.from ?? "")) ? String(b.from) : "";
      const note = clip(b.note, "", 80);
      p = { title: `🙋 ${first} má ${day} čas jazdiť${from ? " od " + from : ""}`, body: note ? `„${note}“ Ťukni a založte spolu jazdu.` : "Ťukni a založte spolu jazdu.", url: APP + "#cas", tag: "free-" + user + "-" + day };
      break;
    }
    case "official": {
      const meet = clip(b.meet, "", 60);
      if (ride) p = { title: `🏁 EliteBiker organizuje: ${title}`, body: `${at ? at.charAt(0).toUpperCase() + at.slice(1) : "Čoskoro"}${meet ? ", stretko " + meet : ""}. Ťukni a pridaj sa.`, url: APP + "#jazda-" + ride, tag: "off-" + ride };
      break;
    }
    case "service": {
      const bike = clip(b.bike, "tvoj bicykel", 50);
      p = b.phase === "season"
        ? { title: "🔧 Sezóna je za rohom", body: `Priprav ${bike} na jazdy. Servis v EliteBiker v Považskej Bystrici vybaví všetko pred sezónou.`, url: SERVIS, tag: "servis" }
        : { title: "🔧 Rok s tvojím bicyklom", body: `${bike} má za sebou rok jázd. Doprej mu servis v EliteBiker v Považskej Bystrici.`, url: SERVIS, tag: "servis" };
      break;
    }
  }
  if (!p) return json(req, { error: "bad kind" }, 400);
  const sent = await sendTo(db, [user], p, "social");
  return json(req, { sent });
});
