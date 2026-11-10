// Katalóg bicyklov z e-shopu elitebiker.sk (kategórie Bicykel pre každého a Elektrobicykel) – spúšťa pg_cron raz denne.
// Ukladá len verejné údaje: ID produktu, názov, značku, odkaz a fotku.
import { admin, json } from "../_shared/util.ts";
import { sameSecret, secrets } from "../_shared/push.ts";

const BASE = "https://www.elitebiker.sk";
const CATEGORIES: [string, boolean][] = [["/bicykel-pre-kazdeho/", false], ["/elektrobicykel/", true]];
const UA = "EliteBikerRide/1.0 (+https://elitebikersk.github.io/elitebiker-ride/)";
type Bike = { id: number; name: string; brand: string | null; url: string; image: string | null; ebike?: boolean };

function decode(s: string) {
  return s.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
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
  for (const [cat, ebike] of CATEGORIES) {
    for (let page = 1; page <= 60; page++) {
      const r = await fetch(BASE + cat + (page > 1 ? `strana-${page}/` : ""), { headers: { "User-Agent": UA, "Accept-Language": "sk" } });
      if (!r.ok) break;
      const html = await r.text();
      let added = 0;
      for (const b of parse(html)) {
        const old = seen.get(b.id);
        if (!old) { seen.set(b.id, { ...b, ebike }); added++; } else if (ebike) old.ebike = true;
      }
      if (!added || !html.includes(`strana-${page + 1}/`)) break;
    }
  }
  if (seen.size < 20) return json(req, { error: "Načítalo sa príliš málo bicyklov – katalóg nemením.", count: seen.size }, 502);
  const rows = [...seen.values()].map((b) => ({ ...b, ebike: !!b.ebike, updated_at: new Date().toISOString() }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from("catalog_bikes").upsert(rows.slice(i, i + 200));
    if (error) return json(req, { error: error.message }, 500);
  }
  // čo už v e-shope nie je, zmizne z katalógu (bicykle používateľov ostávajú)
  await db.from("catalog_bikes").delete().lt("updated_at", started);
  return json(req, { count: rows.length });
});
