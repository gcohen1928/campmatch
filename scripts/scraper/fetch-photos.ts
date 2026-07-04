/**
 * Collect a representative photo URL for each camp from its own website's
 * social-preview metadata (og:image / twitter:image) — the image every camp
 * already publishes for link sharing.
 *
 * Output: out/photos.json — { [slug]: ["https://..."] }. Review the file,
 * then merge into src/data/camps.extra.json `photos` (and Supabase `photos`)
 * with your loader of choice. Hotlinked previews should be treated as
 * provisional: when a camp claims its listing it can upload real photos.
 *
 * Etiquette: 1 request/sec, honest User-Agent, homepage only, skip on error.
 *
 * Usage: pnpm dlx tsx scripts/scraper/fetch-photos.ts [--limit 100] [out-file]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SEED_CAMPS } from "../../src/lib/camps-seed";
import extraCamps from "../../src/data/camps.extra.json";
import type { Camp } from "../../src/lib/types";

const USER_AGENT =
  "CampMatchBot/0.1 (+https://campmatch.example; link-preview fetch; contact: hello@campmatch.example)";
const DELAY_MS = 1100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function extractOgImage(html: string, baseUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) {
      try {
        return new URL(m[1], baseUrl).toString();
      } catch {
        /* malformed URL — try next pattern */
      }
    }
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
  const outFile =
    args.filter((a, i) => a !== "--limit" && i !== limitIdx + 1)[0] ??
    "out/photos.json";

  const camps: Camp[] = [...SEED_CAMPS, ...(extraCamps as Camp[])]
    .filter((c) => c.website)
    .slice(0, limit);
  console.log(`Fetching og:image for ${camps.length} camp websites → ${outFile}`);

  const photos: Record<string, string[]> = {};
  let ok = 0;
  for (const camp of camps) {
    try {
      const res = await fetch(camp.website, {
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const img = extractOgImage(await res.text(), res.url);
      if (img && !img.endsWith(".svg")) {
        photos[camp.slug] = [img];
        ok++;
        console.log(`  ✓ ${camp.slug}`);
      }
    } catch (err) {
      console.warn(`  ✗ ${camp.slug}: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(DELAY_MS);
  }

  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(photos, null, 2));
  console.log(`Done: photos for ${ok}/${camps.length} camps → ${outFile}`);
}

main();
