// Upozornenia na zlé počasie a pripomienky jazdy (spúšťa pg_cron každú hodinu) + skúšobné upozornenie pre prihláseného.
import { admin, cors, currentUser, json, readJson } from "../_shared/util.ts";
import { evaluate, forecast, symLabel } from "../_shared/weather.ts";
import { APP, initPush, sameSecret, secrets, sendTo, when } from "../_shared/push.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const db = admin();
  const S = await secrets(db);
  if (!(await initPush(S))) return json(req, { error: "Upozornenia nie sú nastavené." }, 500);
  const body = await readJson(req);

  // skúšobné upozornenie pre prihláseného
  if (body.test) {
    const user = await currentUser(req);
    if (!user) return json(req, { error: "Nie si prihlásený." }, 401);
    const n = await sendTo(db, [user.id], { title: "EliteBiker Ride 🚴", body: "Upozornenia fungujú. Dáme ti vedieť o žiadostiach, pozvánkach na jazdy aj o zlom počasí.", url: APP, tag: "test" }, "social");
    return json(req, { sent: n });
  }

  // pg_cron
  if (!S.cron_key || !sameSecret(req.headers.get("x-cron-key") ?? "", S.cron_key)) return json(req, { error: "forbidden" }, 403);
  const now = Date.now();
  const { data: rides } = await db.from("rides").select("id, title, starts_at, ends_at, meet_lat, meet_lng, ride_participants(user_id)")
    .gt("starts_at", new Date(now + 30 * 60e3).toISOString()).lte("starts_at", new Date(now + 24 * 3600e3).toISOString());
  const { data: done } = await db.from("ride_weather_alerts").select("ride_id").in("ride_id", (rides ?? []).map((r) => r.id));
  const sent = new Set((done ?? []).map((d) => d.ride_id));
  const report: unknown[] = [];
  for (const r of rides ?? []) {
    if (sent.has(r.id)) continue;
    const series = await forecast(db, r.meet_lat, r.meet_lng);
    if (!series) continue;
    const w = evaluate(series, new Date(r.starts_at).getTime(), new Date(r.ends_at).getTime());
    if (!w || !w.bad.length) continue;
    const reasons = w.bad.join(", ");
    const summary = `${reasons} · ${w.tmin === w.tmax ? w.tmin : w.tmin + " až " + w.tmax} °C` + (w.pr ? ` · ${w.pr} mm` : "") + (w.gust >= 40 ? ` · nárazy ${w.gust} km/h` : "");
    const users = (r.ride_participants ?? []).map((p: { user_id: string }) => p.user_id);
    const n = await sendTo(db, users, {
      title: `⚠️ Zlé počasie: ${r.title}`,
      body: `${when(r.starts_at)} hlásia ${summary}. Dohodnite sa v chate, či idete.`,
      url: APP + "#jazda-" + r.id, tag: "pocasie-" + r.id,
    }, "weather");
    await db.from("ride_weather_alerts").upsert({ ride_id: r.id, summary });
    report.push({ ride: r.id, summary, sent: n });
  }
  const reminders = await remind(db, now);
  return json(req, { checked: (rides ?? []).length, alerts: report, reminders });
});

// pripomienky jazdy: večer pred (beh o 19. hodine) a približne 2 hodiny pred začiatkom, s počasím a počtom ľudí
const TZ = "Europe/Bratislava";
function localDay(t: number) { return new Date(t).toLocaleDateString("en-CA", { timeZone: TZ }); }
function hm(iso: string) { return new Date(iso).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit", timeZone: TZ }); }
async function remind(db: ReturnType<typeof admin>, now: number) {
  const hour = +new Date(now).toLocaleString("en-US", { timeZone: TZ, hour: "2-digit", hour12: false });
  const out: unknown[] = [];
  const from = new Date(now + 90 * 60e3).toISOString(), to = new Date(now + (hour === 19 ? 30 : 2.5) * 3600e3).toISOString();
  const { data: rides } = await db.from("rides").select("id, title, starts_at, meet_lat, meet_lng, meet_label, ride_participants(user_id), ride_maybe(user_id)")
    .gt("starts_at", from).lte("starts_at", to);
  if (!rides?.length) return out;
  const { data: done } = await db.from("ride_reminders").select("ride_id, phase").in("ride_id", rides.map((r) => r.id));
  const sent = new Set((done ?? []).map((d) => d.ride_id + "/" + d.phase));
  const tomorrow = localDay(now + 864e5);
  for (const r of rides) {
    const start = new Date(r.starts_at).getTime();
    const phase = start <= now + 2.5 * 3600e3 ? "2h" : hour === 19 && localDay(start) === tomorrow ? "eve" : null;
    if (!phase || sent.has(r.id + "/" + phase)) continue;
    const users = (r.ride_participants ?? []).map((p: { user_id: string }) => p.user_id);
    const allowed = await wanting(db, users, "reminder");
    let wx = "";
    const series = await forecast(db, r.meet_lat, r.meet_lng);
    if (series?.length) {
      const pt = series.reduce((a, b) => Math.abs(b.t - start) < Math.abs(a.t - start) ? b : a);
      if (pt && Math.abs(pt.t - start) < 4 * 3600e3 && pt.temp != null) wx = `${Math.round(pt.temp)} °C${pt.sym ? ", " + symLabel(pt.sym) : ""}`;
    }
    const n = users.length, maybe = (r.ride_maybe ?? []).map((p: { user_id: string }) => p.user_id);
    const who = [n === 1 ? "zatiaľ ideš sám" : `idú ${n}`, maybe.length ? `možno ${maybe.length}` : ""].filter(Boolean).join(", ");
    const body = [r.meet_label ? "Stretko: " + r.meet_label : "", wx, who].filter(Boolean).join(" · ");
    const payload = phase === "eve"
      ? { title: `🚴 Zajtra ${hm(r.starts_at)}: ${r.title}`, body, url: APP + "#jazda-" + r.id, tag: "rem-" + r.id }
      : { title: `⏰ Dnes ${hm(r.starts_at)}: ${r.title}`, body, url: APP + "#jazda-" + r.id, tag: "rem-" + r.id };
    let cnt = allowed.length ? await sendTo(db, allowed, payload, "social") : 0;
    // večer pred jazdou sa opýtame aj tých, čo dali „možno“
    if (phase === "eve" && maybe.length) {
      const ask = await wanting(db, maybe, "reminder");
      const mb = [r.meet_label ? "Stretko: " + r.meet_label : "", wx, `idú ${n}`].filter(Boolean).join(" · ");
      if (ask.length) cnt += await sendTo(db, ask, { title: `🤔 Zajtra ${hm(r.starts_at)}: ${r.title}. Ideš?`, body: mb + ". Ťukni a daj vedieť.", url: APP + "#jazda-" + r.id, tag: "rem-" + r.id }, "social");
    }
    await db.from("ride_reminders").upsert({ ride_id: r.id, phase });
    out.push({ ride: r.id, phase, sent: cnt });
  }
  return out;
}
// kto si v Profile nevypol daný druh upozornení (bez uloženého výberu = všetko zapnuté)
async function wanting(db: ReturnType<typeof admin>, users: string[], kind: string) {
  if (!users.length) return [];
  const { data } = await db.from("notify_prefs").select("user_id, push").in("user_id", users);
  const off = new Set((data ?? []).filter((x: { push: string[] }) => !x.push.includes(kind)).map((x: { user_id: string }) => x.user_id));
  return users.filter((u) => !off.has(u));
}
