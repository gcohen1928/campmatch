/**
 * Pull real Reddit chatter about each camp via Reddit's public JSON API.
 *
 * For every camp in the dataset, searches Reddit for the camp's name and
 * saves matching posts/top comments to out/reddit/<slug>.json. Run an LLM
 * pass afterwards to distill each file into 1–3 short "community snapshot"
 * reviews (see camp-schema.json review shape) and merge into
 * src/data/reviews.json.
 *
 * Notes:
 * - Uses the public unauthenticated endpoints (www.reddit.com/search.json),
 *   which are rate-limited: ~1 request / 2s with a descriptive User-Agent.
 *   For large runs, register a script app and use OAuth (60 req/min).
 * - Only collects public posts. Store the permalink so every snapshot can
 *   cite its source.
 *
 * Usage: pnpm dlx tsx scripts/scraper/reddit-reviews.ts [--limit 100] [out-dir]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SEED_CAMPS } from "../../src/lib/camps-seed";
import extraCamps from "../../src/data/camps.extra.json";
import type { Camp } from "../../src/lib/types";

const USER_AGENT =
  "CampMatchBot/0.1 (camp matchmaking research; contact: hello@campmatch.example)";
const DELAY_MS = 2100;
const SUBREDDITS = [
  "summercamp", "campcounselors", "Parenting", "AskParents", "Mommit", "daddit",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RedditHit {
  title: string;
  selftext: string;
  subreddit: string;
  permalink: string;
  score: number;
  num_comments: number;
  created_utc: number;
}

async function searchReddit(query: string): Promise<RedditHit[]> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=all&limit=25`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 429) {
    console.warn("    rate limited — backing off 60s");
    await sleep(60000);
    return searchReddit(query);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: { children?: { data: RedditHit }[] };
  };
  return (json.data?.children ?? []).map((c) => ({
    title: c.data.title,
    selftext: (c.data.selftext ?? "").slice(0, 2000),
    subreddit: c.data.subreddit,
    permalink: `https://www.reddit.com${c.data.permalink}`,
    score: c.data.score,
    num_comments: c.data.num_comments,
    created_utc: c.data.created_utc,
  }));
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
  const outDir =
    args.filter((a, i) => a !== "--limit" && i !== limitIdx + 1)[0] ?? "out/reddit";
  await mkdir(outDir, { recursive: true });

  const camps: Camp[] = [...SEED_CAMPS, ...(extraCamps as Camp[])].slice(0, limit);
  console.log(`Searching Reddit for ${camps.length} camps → ${outDir}/`);

  let found = 0;
  for (const camp of camps) {
    // Quoted name + state keeps false positives down for generic names.
    const query = `"${camp.name}" ${camp.state === "DC" ? "" : camp.state}`;
    try {
      const hits = (await searchReddit(query)).filter(
        (h) =>
          h.title.toLowerCase().includes(camp.name.toLowerCase()) ||
          h.selftext.toLowerCase().includes(camp.name.toLowerCase()) ||
          SUBREDDITS.includes(h.subreddit),
      );
      if (hits.length > 0) {
        await writeFile(
          join(outDir, `${camp.slug}.json`),
          JSON.stringify({ slug: camp.slug, name: camp.name, query, hits }, null, 2),
        );
        found++;
        console.log(`  ✓ ${camp.name}: ${hits.length} threads`);
      }
    } catch (err) {
      console.warn(`  ✗ ${camp.name}: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`Done: Reddit chatter found for ${found}/${camps.length} camps.`);
}

main();
