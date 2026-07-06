/**
 * Discover US camps from structured public sources, as leads for the dataset
 * build (discover → compile → merge-batches.ts → enrich).
 *
 * Modes:
 *
 *   ACA        npx tsx scripts/scraper/discover-camps.ts aca out/discover/aca [--from=1] [--to=6500]
 *     find.acacamps.org profile pages are enumerable (camp_profile.php?camp_id=N,
 *     ids ~1-6000; invalid ids render an "Oops" page). Saves one JSON per camp:
 *     { id, name, website?, text } — resumable, ~1.4 req/sec against their
 *     single host, so keep to at most 2 concurrent shards.
 *
 *   PROPUBLICA npx tsx scripts/scraper/discover-camps.ts propublica out/discover/propublica.json
 *     Nonprofit Explorer API (990 filers). Sweeps camp-related queries and
 *     NTEE recreation categories, dedupes by EIN. Leads have name/city/state
 *     but no website — good for cross-referencing and gap-filling.
 *
 * Like the rest of the pipeline: facts only, polite rate limits, resumable.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const USER_AGENT =
  "CampMatchingBot/0.2 (+https://campmatching.example; data for camp matchmaking; contact: hello@campmatching.example)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;|&quot;|&#\d+;|&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string, timeoutMs = 20000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/* ── ACA Find-a-Camp ─────────────────────────────────────────────────── */

const ACA_JUNK_HOSTS =
  /acacamps|campparents|acabookstore|facebook|twitter|linkedin|youtube|instagram|pinterest|sharethis|google|gstatic|schema\.org|w3\.org/i;

async function runAca(args: string[]) {
  const outDir = args.find((a) => !a.startsWith("--")) ?? "out/discover/aca";
  const from = Number(args.find((a) => a.startsWith("--from"))?.split("=")[1] ?? 1);
  const to = Number(args.find((a) => a.startsWith("--to"))?.split("=")[1] ?? 6500);
  await mkdir(outDir, { recursive: true });
  const done = new Set(await readdir(outDir));

  console.log(`ACA discover: camp_id ${from}..${to} → ${outDir}/`);
  let ok = 0;
  for (let id = from; id <= to; id++) {
    const file = `${id}.json`;
    if (done.has(file) || done.has(`${id}.miss`)) continue;
    const html = await fetchText(`https://find.acacamps.org/camp_profile.php?camp_id=${id}`);
    await sleep(700);
    if (!html) {
      console.warn(`  ✗ ${id}: unreachable`);
      continue;
    }
    const title = /<title>([^<|]*)/i.exec(html)?.[1]?.trim() ?? "";
    if (!title || /^Oops\b|^Find a Camp\b/i.test(title)) {
      await writeFile(join(outDir, `${id}.miss`), "");
      continue;
    }
    const name = title.replace(/\s*\|.*$/, "").trim();
    const websites = [
      ...new Set(
        [...html.matchAll(/https?:\/\/[^\s"'<>]+/g)]
          .map((m) => m[0])
          .filter((u) => !ACA_JUNK_HOSTS.test(u)),
      ),
    ];
    await writeFile(
      join(outDir, file),
      JSON.stringify(
        {
          source: "aca",
          id,
          url: `https://find.acacamps.org/camp_profile.php?camp_id=${id}`,
          name,
          website: websites[0],
          fetchedAt: new Date().toISOString(),
          text: stripHtml(html).slice(0, 18000),
        },
        null,
        1,
      ),
    );
    ok++;
    if (ok % 25 === 0) console.log(`  … ${ok} camps found (at id ${id})`);
  }
  console.log(`Done: ${ok} new camp profiles saved.`);
}

/* ── ProPublica Nonprofit Explorer ───────────────────────────────────── */

const PP_QUERIES = [
  "summer camp", "camp for boys", "camp for girls", "day camp", "sleepaway",
  "camp association", "campfire", "wilderness camp", "bible camp", "camp",
];

async function runPropublica(args: string[]) {
  const outFile = args.find((a) => !a.startsWith("--")) ?? "out/discover/propublica.json";
  await mkdir(outFile.split("/").slice(0, -1).join("/"), { recursive: true });
  const byEin = new Map<number, Record<string, unknown>>();

  for (const q of PP_QUERIES) {
    for (let page = 0; page < 100; page++) {
      const url = `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(q)}&page=${page}`;
      const body = await fetchText(url);
      await sleep(400);
      if (!body) break;
      let json: { organizations?: { ein: number; name: string; city: string; state: string; ntee_code: string | null }[]; num_pages?: number };
      try {
        json = JSON.parse(body);
      } catch {
        break;
      }
      const orgs = json.organizations ?? [];
      for (const o of orgs) {
        if (!/\bcamp\b|\bcamps\b/i.test(o.name)) continue; // keep it on-topic
        if (!byEin.has(o.ein))
          byEin.set(o.ein, {
            source: "propublica",
            ein: o.ein,
            name: o.name,
            city: o.city,
            state: o.state,
            ntee: o.ntee_code,
          });
      }
      console.log(`  "${q}" page ${page}: +${orgs.length} (total unique ${byEin.size})`);
      if (orgs.length === 0 || (json.num_pages !== undefined && page >= json.num_pages - 1)) break;
    }
  }
  await writeFile(outFile, JSON.stringify([...byEin.values()], null, 1));
  console.log(`Done: ${byEin.size} unique nonprofit camp leads → ${outFile}`);
}

/* ── Entry ───────────────────────────────────────────────────────────── */

const [mode, ...rest] = process.argv.slice(2);
if (mode === "aca") runAca(rest);
else if (mode === "propublica") runPropublica(rest);
else {
  console.error(
    "Usage:\n  npx tsx scripts/scraper/discover-camps.ts aca out/discover/aca [--from=1] [--to=6500]\n  npx tsx scripts/scraper/discover-camps.ts propublica out/discover/propublica.json",
  );
  process.exit(1);
}
