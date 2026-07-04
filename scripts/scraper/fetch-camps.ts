/**
 * Polite fetcher: downloads a list of camp URLs to disk for extraction.
 *
 * Usage: npx tsx scripts/scraper/fetch-camps.ts urls.txt out/
 * urls.txt: one URL per line, # for comments.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const USER_AGENT =
  "CampMatchBot/0.1 (+https://campmatch.example; data for camp matchmaking; contact: hello@campmatch.example)";
const DELAY_MS = 1200; // ~1 req/sec, be a good citizen

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugFromUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .toLowerCase();
}

async function main() {
  const [listPath, outDir = "out"] = process.argv.slice(2);
  if (!listPath) {
    console.error("Usage: npx tsx scripts/scraper/fetch-camps.ts urls.txt out/");
    process.exit(1);
  }
  await mkdir(outDir, { recursive: true });

  const urls = (await readFile(listPath, "utf8"))
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  console.log(`Fetching ${urls.length} pages → ${outDir}/`);
  let ok = 0;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      await writeFile(join(outDir, `${slugFromUrl(url)}.html`), html);
      ok++;
      console.log(`  ✓ ${url}`);
    } catch (err) {
      console.warn(`  ✗ ${url}: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`Done: ${ok}/${urls.length} fetched.`);
}

main();
