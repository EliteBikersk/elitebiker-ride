// Spoločné pre upozornenia do mobilu (web push): tajné kľúče z Vaultu, odoslanie, čas jazdy po slovensky.
import webpush from "npm:web-push@3.6.7";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

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
