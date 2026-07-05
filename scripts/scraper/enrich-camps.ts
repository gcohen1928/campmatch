/**
 * Enrich the EXISTING camp dataset with life-at-camp details:
 * rookie days, AC in bunks, bunk sizes, laundry, uniforms, doctor on site,
 * visiting days, phone policy, session model (3+3 splits), trips,
 * traditions, ownership, renovations, buses & trunk pickup, and the camp's
 * specific activity list.
 *
 * Pipeline (same shape as the original dataset build):
 *
 *   1. FETCH   npx tsx scripts/scraper/enrich-camps.ts fetch out/enrich [--limit 50] [--only slug-a,slug-b]
 *      For every camp with a known website, politely downloads the homepage
 *      plus the subpages most likely to hold these facts (rookie day / visit
 *      pages, FAQs, dates & rates, transportation, facilities, parent
 *      handbook…) and writes one text bundle per camp:
 *      out/enrich/<slug>.json  →  { slug, name, website, pages: [{url, text}] }
 *
 *   2. EXTRACT (LLM, external — same as the original build)
 *      Feed each bundle to an LLM with scripts/scraper/camp-schema.json,
 *      temperature 0, instructed to OMIT any field the pages don't state —
 *      never guess. Output arrays of { slug, ...enrichmentFields } records
 *      into a directory, e.g. out/enriched/batch-01.json.
 *
 *   3. MERGE   npx tsx scripts/scraper/enrich-camps.ts merge out/enriched [--overwrite]
 *      Validates every record and fills the new optional fields onto
 *      src/data/camps.extra.json (existing values win unless --overwrite).
 *      Seed camps (src/lib/camps-seed.ts) are hand-maintained, so their
 *      accepted enrichment is written to out/seed-enrichment.json for a
 *      manual pass instead of being auto-applied.
 *
 * Like the rest of the pipeline this only collects facts, respects
 * rate limits, and everything stays verified:false until a camp claims
 * its listing.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SEED_CAMPS } from "../../src/lib/camps-seed";
import type { Camp, Ownership, RookieDay, SessionModel } from "../../src/lib/types";

const USER_AGENT =
  "CampMatchingBot/0.2 (+https://campmatching.example; data for camp matchmaking; contact: hello@campmatching.example)";
const DELAY_MS = 1200; // ~1 req/sec, be a good citizen
const MAX_SUBPAGES = 8;
const HOME_TEXT_CAP = 20_000;
const SUBPAGE_TEXT_CAP = 12_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── Shared: load the full dataset ───────────────────────────────────── */

async function loadDataset(): Promise<{ extra: Camp[]; all: Camp[] }> {
  const extra = JSON.parse(
    await readFile("src/data/camps.extra.json", "utf8"),
  ) as Camp[];
  return { extra, all: [...SEED_CAMPS, ...extra] };
}

/* ── FETCH mode ──────────────────────────────────────────────────────── */

/** keyword → priority; higher-priority links are fetched first */
const LINK_KEYWORDS: [RegExp, number][] = [
  [/rookie/i, 10],
  [/open[-_ ]?house|visit(ing)?[-_ ]?(day|us)|tour/i, 7],
  [/dates|rates|sessions|enroll|tuition/i, 6],
  [/faq|frequently/i, 6],
  [/transport|travel|bus|getting[-_ ]?(to|here)/i, 5],
  [/health|medical|nurse|doctor/i, 5],
  [/facilit|activit|program|athletics|waterfront/i, 4],
  [/parents?|handbook|packing|family/i, 4],
  [/daily[-_ ]?schedule|typical[-_ ]?day/i, 3],
  [/about|history|traditions|staff/i, 2],
];

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

function candidateLinks(html: string, base: URL): { url: string; score: number }[] {
  const seen = new Map<string, number>();
  for (const m of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    let url: URL;
    try {
      url = new URL(m[1], base);
    } catch {
      continue;
    }
    if (url.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
    if (/\.(pdf|jpe?g|png|gif|svg|mp4|zip|docx?)$/i.test(url.pathname)) continue;
    const key = url.origin + url.pathname;
    let score = 0;
    for (const [re, pts] of LINK_KEYWORDS) if (re.test(url.pathname)) score = Math.max(score, pts);
    if (score > 0) seen.set(key, Math.max(seen.get(key) ?? 0, score));
  }
  return [...seen.entries()]
    .map(([url, score]) => ({ url, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUBPAGES);
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function runFetch(args: string[]) {
  const outDir = args.find((a) => !a.startsWith("--")) ?? "out/enrich";
  const limit = Number(args.find((a) => a.startsWith("--limit"))?.split("=")[1] ?? Infinity);
  const only = args
    .find((a) => a.startsWith("--only"))
    ?.split("=")[1]
    ?.split(",");

  await mkdir(outDir, { recursive: true });
  const { all } = await loadDataset();
  let targets = all.filter((c) => c.website);
  if (only) targets = targets.filter((c) => only.includes(c.slug));
  targets = targets.slice(0, limit);

  console.log(`Enrich-fetching ${targets.length} camps → ${outDir}/`);
  let ok = 0;
  for (const camp of targets) {
    const homeHtml = await fetchPage(camp.website);
    await sleep(DELAY_MS);
    if (!homeHtml) {
      console.warn(`  ✗ ${camp.slug}: homepage unreachable`);
      continue;
    }
    const base = new URL(camp.website);
    const pages: { url: string; text: string }[] = [
      { url: camp.website, text: stripHtml(homeHtml).slice(0, HOME_TEXT_CAP) },
    ];
    for (const { url } of candidateLinks(homeHtml, base)) {
      const html = await fetchPage(url);
      await sleep(DELAY_MS);
      if (!html) continue;
      const text = stripHtml(html).slice(0, SUBPAGE_TEXT_CAP);
      if (text.length > 200) pages.push({ url, text });
    }
    await writeFile(
      join(outDir, `${camp.slug}.json`),
      JSON.stringify(
        {
          slug: camp.slug,
          name: camp.name,
          website: camp.website,
          fetchedAt: new Date().toISOString(),
          pages,
        },
        null,
        1,
      ),
    );
    ok++;
    console.log(`  ✓ ${camp.slug} (${pages.length} pages)`);
  }
  console.log(`Done: ${ok}/${targets.length} camps bundled.`);
}

/* ── MERGE mode ──────────────────────────────────────────────────────── */

const OWNERSHIPS = new Set<Ownership>(["family", "nonprofit", "agency"]);
const SESSION_MODELS = new Set<SessionModel>(["full-summer", "sessions", "flexible"]);

const asBool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
const asInt = (v: unknown, lo: number, hi: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined;
};
const asStrArr = (v: unknown, max: number) =>
  Array.isArray(v)
    ? [...new Set(
        v.filter((s): s is string => typeof s === "string" && s.trim().length > 1)
          .map((s) => s.trim().slice(0, 60)),
      )].slice(0, max)
    : undefined;

/** Validate one enrichment record into the Camp optional fields (only). */
function cleanEnrichment(raw: Record<string, unknown>): Partial<Camp> {
  const out: Partial<Camp> = {};
  const culture = asInt(raw.culture, 1, 5);
  if (culture !== undefined) out.culture = culture;
  const activities = asStrArr(raw.activities, 40);
  if (activities && activities.length > 0)
    out.activities = activities.map((a) => a.toLowerCase());
  for (const key of [
    "lakeOnSite", "acInBunks", "laundryService", "uniformRequired",
    "doctorOnSite", "busService", "trunkPickup",
  ] as const) {
    const v = asBool(raw[key]);
    if (v !== undefined) out[key] = v;
  }
  const bunkSize = asInt(raw.bunkSize, 2, 30);
  if (bunkSize !== undefined) out.bunkSize = bunkSize;
  const visiting = asInt(raw.visitingDaysPerSession, 0, 6);
  if (visiting !== undefined) out.visitingDaysPerSession = visiting;
  const calls = asInt(raw.phoneCallsPerSession, 0, 30);
  if (calls !== undefined) out.phoneCallsPerSession = calls;
  const trips = asInt(raw.tripsPerSession, 0, 15);
  if (trips !== undefined) out.tripsPerSession = trips;
  const lastRenovated = asInt(raw.lastRenovated, 1950, 2030);
  if (lastRenovated !== undefined) out.lastRenovated = lastRenovated;
  if (SESSION_MODELS.has(raw.sessionModel as SessionModel))
    out.sessionModel = raw.sessionModel as SessionModel;
  if (OWNERSHIPS.has(raw.ownership as Ownership))
    out.ownership = raw.ownership as Ownership;
  const traditions = asStrArr(raw.traditions, 10);
  if (traditions && traditions.length > 0) out.traditions = traditions;
  const busCities = asStrArr(raw.busCities, 15);
  if (busCities && busCities.length > 0) out.busCities = busCities;
  const trunkAreas = asStrArr(raw.trunkPickupAreas, 15);
  if (trunkAreas && trunkAreas.length > 0) out.trunkPickupAreas = trunkAreas;
  const rd = raw.rookieDay as Record<string, unknown> | undefined;
  if (rd && typeof rd === "object" && typeof rd.offered === "boolean") {
    const rookie: RookieDay = { offered: rd.offered };
    if (typeof rd.details === "string" && rd.details.trim())
      rookie.details = rd.details.trim().slice(0, 300);
    if (typeof rd.url === "string" && /^https?:\/\//.test(rd.url)) rookie.url = rd.url;
    out.rookieDay = rookie;
  }
  return out;
}

async function runMerge(args: string[]) {
  const dir = args.find((a) => !a.startsWith("--"));
  const overwrite = args.includes("--overwrite");
  if (!dir) {
    console.error("Usage: npx tsx scripts/scraper/enrich-camps.ts merge <records-dir> [--overwrite]");
    process.exit(1);
  }

  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const { extra } = await loadDataset();
  const extraBySlug = new Map(extra.map((c) => [c.slug, c]));
  const seedSlugs = new Set(SEED_CAMPS.map((c) => c.slug));

  let applied = 0;
  let fieldsApplied = 0;
  let unknownSlugs = 0;
  const seedEnrichment: Record<string, Partial<Camp>> = {};

  for (const file of files) {
    let records: unknown;
    try {
      records = JSON.parse(await readFile(join(dir, file), "utf8"));
    } catch (e) {
      console.error(`✗ ${file}: unparseable JSON — skipped (${e})`);
      continue;
    }
    for (const raw of Array.isArray(records) ? records : [records]) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      const slug = typeof r.slug === "string" ? r.slug : "";
      const patch = cleanEnrichment(r);
      if (Object.keys(patch).length === 0) continue;

      if (seedSlugs.has(slug)) {
        seedEnrichment[slug] = { ...seedEnrichment[slug], ...patch };
        continue;
      }
      const camp = extraBySlug.get(slug);
      if (!camp) {
        unknownSlugs++;
        continue;
      }
      let touched = false;
      for (const [k, v] of Object.entries(patch)) {
        const key = k as keyof Camp;
        if (!overwrite && camp[key] !== undefined) continue;
        (camp as unknown as Record<string, unknown>)[key] = v;
        fieldsApplied++;
        touched = true;
      }
      if (touched) applied++;
    }
  }

  await writeFile("src/data/camps.extra.json", JSON.stringify(extra, null, 1));
  if (Object.keys(seedEnrichment).length > 0) {
    await mkdir("out", { recursive: true });
    await writeFile("out/seed-enrichment.json", JSON.stringify(seedEnrichment, null, 1));
    console.log(
      `Seed camps are hand-maintained: wrote ${Object.keys(seedEnrichment).length} accepted patches to out/seed-enrichment.json — apply them to src/lib/camps-seed.ts manually.`,
    );
  }
  console.log(
    `Merged: ${applied} camps updated (${fieldsApplied} fields), ${unknownSlugs} records had unknown slugs.`,
  );
}

/* ── Entry ───────────────────────────────────────────────────────────── */

const [mode, ...rest] = process.argv.slice(2);
if (mode === "fetch") runFetch(rest);
else if (mode === "merge") runMerge(rest);
else {
  console.error(
    "Usage:\n  npx tsx scripts/scraper/enrich-camps.ts fetch out/enrich [--limit=50] [--only=slug-a,slug-b]\n  npx tsx scripts/scraper/enrich-camps.ts merge out/enriched [--overwrite]",
  );
  process.exit(1);
}
