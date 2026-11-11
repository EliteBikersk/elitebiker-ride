// Jeden súbor na nasadenie cez Supabase (pomocné funkcie sú vložené priamo)
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
// Spoločné pomocné funkcie pre serverové funkcie EliteBiker Ride

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

const BASE = "https://www.elitebiker.sk";
type Kind = "cesta" | "gravel" | "mtb" | "ebike" | "dirt";
// poradie je dôležité: špecifickejšia kategória vyhrá (gravel pred cestou, dirt pred horským), e-bike vždy
const CATEGORIES: [string, Kind | null][] = [
  ["/bicykel-pre-kazdeho/", null],
  ["/gravel-bicykel/", "gravel"], ["/cestny-bicykel/", "cesta"],
  ["/bmx-a-dirt-bicykel/", "dirt"],
  ["/horsky-bicykel/", "mtb"], ["/hardtail-bicykel/", "mtb"], ["/horsky-celoodpruzeny-bicykel/", "mtb"],
  ["/elektrobicykel/", "ebike"],
];
const UA = "EliteBikerRide/1.0 (+https://elitebikersk.github.io/elitebiker-ride/)";
type Bike = { id: number; name: string; brand: string | null; url: string; image: string | null; ebike?: boolean; kind?: Kind | null };

function decode(s: string) {
  return s.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

export function guess(b: Bike): Kind | null {
  const t = (b.url.replace(BASE, "") + " " + b.name).toLowerCase(); // bez domény: „elitebiker“ obsahuje „ebike“
  if (/gravel|cyklokros/.test(t)) return "gravel";
  if (/elektro|e-bike|ebike/.test(t)) return "ebike";
  if (/cestn/.test(t)) return "cesta";
  if (/\bdirt\b|\bbmx\b|pumptrack/.test(t)) return "dirt";
  return null;
}

export function parse(html: string): Bike[] {
  const out: Bike[] = [];
  const parts = html.split('data-micro="product"').slice(1);
  for (const part of parts) {
    const block = part.slice(0, 4000);
    const id = +(block.match(/data-micro-product-id="(\d+)"/)?.[1] ?? 0);
    const href = block.match(/<a href="(\/[^"]+)" class="image"/)?.[1];
    const img = block.match(/<img\b[^>]*>/)?.[0] ?? "";
    const alt = img.match(/\salt="([^"]*)"/)?.[1];
    let src = img.match(/\sdata-src="([^"]+)"/)?.[1] ?? img.match(/\ssrc="([^"]+)"/)?.[1] ?? "";
    src = decode(src);
    if (!id || !href || !alt) continue;
    // „Bicykel Transition - Smuggler NX“ → značka Transition, názov „Transition Smuggler NX“
    let name = decode(alt).replace(/^(\S+\s+)?bicykel\s+/i, ""), brand = name.split(" ")[0] || "";
    const m = name.match(/^(.*?)\s+-\s+(.+)$/);
    if (m) { const pre = m[1].trim().split(" "); brand = pre[pre.length - 1]; name = brand + " " + m[2].trim(); }
    name = name.slice(0, 160);
    out.push({
      id, name, brand: brand || null,
      url: BASE + href,
      image: /^https:\/\/cdn\.myshoptet\.com\//.test(src) ? src : null,
    });
  }
  return out;
}

Deno.serve(async (req) => {
  const db = admin();
  const S = await secrets(db);
  if (!S.cron_key || !sameSecret(req.headers.get("x-cron-key") ?? "", S.cron_key)) return json(req, { error: "forbidden" }, 403);
  const started = new Date().toISOString();
  const seen = new Map<number, Bike>();
  for (const [cat, kind] of CATEGORIES) {
    for (let page = 1; page <= 60; page++) {
      const r = await fetch(BASE + cat + (page > 1 ? `strana-${page}/` : ""), { headers: { "User-Agent": UA, "Accept-Language": "sk" } });
      if (!r.ok) break;
      const html = await r.text();
      let added = 0;
      for (const b of parse(html)) {
        const old = seen.get(b.id);
        if (!old) { seen.set(b.id, { ...b, kind, ebike: kind === "ebike" }); added++; }
        else if (kind === "ebike") { old.ebike = true; old.kind = "ebike"; added++; }
        else if (kind && !old.kind) { old.kind = kind; added++; }
      }
      if (!added || !html.includes(`strana-${page + 1}/`)) break;
    }
  }
  // rámy, mestské a detské bicykle nemajú typ v kategórii; doplníme ho len pri jasnom slove v názve alebo adrese
  for (const b of seen.values()) if (!b.kind) b.kind = guess(b);
  if (seen.size < 20) return json(req, { error: "Načítalo sa príliš málo bicyklov, katalóg nemením.", count: seen.size }, 502);
  const rows = [...seen.values()].map((b) => ({ ...b, ebike: !!b.ebike, kind: b.kind ?? null, updated_at: new Date().toISOString() }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from("catalog_bikes").upsert(rows.slice(i, i + 200));
    if (error) return json(req, { error: error.message }, 500);
  }
  // čo už v e-shope nie je, zmizne z katalógu (bicykle používateľov ostávajú)
  await db.from("catalog_bikes").delete().lt("updated_at", started);
  const kinds: Record<string, number> = {};
  for (const r of rows) kinds[r.kind ?? "bez typu"] = (kinds[r.kind ?? "bez typu"] ?? 0) + 1;
  return json(req, { count: rows.length, kinds });
});
