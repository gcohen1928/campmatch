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
 *   COMPILE    npx tsx scripts/scraper/discover-camps.ts compile out/discover/aca out/discover/records [--limit=500] [--model=claude-sonnet-5]
 *     LLM-compiles each ACA lead's profile text into a camp-schema-shaped
 *     record (needs ANTHROPIC_API_KEY; resumable per lead). Same
 *     all-required sentinel schema style as enrich-camps.ts — the
 *     structured-outputs compiler rejects large optional-property schemas.
 *
 *   APPEND     npx tsx scripts/scraper/discover-camps.ts append out/discover/records
 *     Validates/normalizes compiled records with the same rules as
 *     merge-batches.ts, dedupes against the seeds AND the existing
 *     camps.extra.json (by slug and normalized name+state), and APPENDS the
 *     survivors. Unlike merge-batches.ts this never rebuilds the dataset and
 *     never touches reviews.json / seed-ratings.json.
 *
 * Like the rest of the pipeline: facts only, polite rate limits, resumable,
 * everything stays verified:false until a camp claims its listing.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SEED_CAMPS } from "../../src/lib/camps-seed";
import { STATE_CENTROIDS } from "../../src/lib/geo";
import type { Camp, Interest, SupportNeed } from "../../src/lib/types";

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
  /acacamps|campparents|acabookstore|facebook|twitter|linkedin|youtube|instagram|pinterest|sharethis|addthis|google|gstatic|schema\.org|w3\.org|maxcdn|cdnjs|jsdelivr|cloudflare|jquery|bootstrapcdn|fontawesome|fonts\.|polyfill|unpkg|gtag|doubleclick|mapbox|openstreetmap|apple\.com|adobe\.com/i;

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
    ].slice(0, 5);
    await writeFile(
      join(outDir, file),
      JSON.stringify(
        {
          source: "aca",
          id,
          url: `https://find.acacamps.org/camp_profile.php?camp_id=${id}`,
          name,
          website: websites[0],
          websiteCandidates: websites,
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

/* ── COMPILE: LLM leads → camp-schema records ────────────────────────── */

const TRI_BOOL = { enum: ["true", "false", "unknown"] };
const COMPILE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "name", "type", "city", "state", "ageMin", "ageMax", "gender",
    "sessionWeeks", "tuitionMin", "tuitionMax", "size", "founded",
    "interests", "religious", "supports", "firstTimeFriendly", "description",
    "website", "activities", "lakeOnSite", "confidence",
  ],
  properties: {
    name: { type: "string", description: "official camp name" },
    type: { enum: ["sleepaway", "day", "unknown"], description: "sleepaway if any overnight program is offered, even alongside day programs" },
    city: { type: "string", description: "\"\" if not stated" },
    state: { type: "string", description: "2-letter US state code; \"\" if not stated" },
    ageMin: { type: "integer", description: "-1 if not stated" },
    ageMax: { type: "integer", description: "-1 if not stated" },
    gender: { enum: ["coed", "boys", "girls", "brother-sister", "unknown"] },
    sessionWeeks: { type: "array", items: { type: "number" }, description: "session lengths offered, in weeks; [] if not stated" },
    tuitionMin: { type: "integer", description: "USD, cheapest published option; -1 if not stated" },
    tuitionMax: { type: "integer", description: "USD, priciest published option; -1 if not stated" },
    size: { type: "integer", description: "approx campers per session; -1 if not stated" },
    founded: { type: "integer", description: "-1 if not stated" },
    interests: {
      type: "array",
      items: { enum: ["team-sports", "individual-sports", "waterfront", "arts-theater", "music", "stem", "outdoor-adventure", "horseback", "gymnastics-dance", "nature-animals", "action-sports"] },
      description: "program strengths inferred from the activities/programs described, max 6; a general traditional camp is usually at least outdoor-adventure; [] only if the profile says nothing about programs",
    },
    religious: { enum: ["none", "jewish-cultural", "jewish-observant", "christian", "unknown"] },
    supports: {
      type: "array",
      items: { enum: ["food-allergies", "adhd-learning", "anxiety-support", "inclusion-program"] },
      description: "[] if not stated",
    },
    firstTimeFriendly: TRI_BOOL,
    description: { type: "string", description: "original neutral 1-2 sentence summary — never copy the profile prose" },
    website: { type: "string", description: "the camp's own website, chosen from the candidate URLs if one clearly belongs to this camp; \"\" otherwise" },
    activities: { type: "array", items: { type: "string" }, description: "specific lowercase offerings; [] if not stated" },
    lakeOnSite: TRI_BOOL,
    confidence: { type: "number", description: "0-1 extraction confidence" },
  },
} as const;

const COMPILE_SYSTEM = `You compile a summer camp directory record from an ACA "Find a Camp" profile page's text, for a camp-matching app.

Rules:
- Report ONLY what the profile states or unambiguously implies. Use each field's "not stated" sentinel ("unknown", -1, "", []) when the profile doesn't address it — never guess.
- "description" is the exception: always write an original, neutral 1-2 sentence summary in your own words (never copy profile prose).
- website: pick from the provided candidate URLs only if it clearly belongs to this camp (not ACA, not another org); otherwise "".
- type: "sleepaway" if any overnight/resident program exists; "day" only if day-only. ACA profiles almost always categorize the camp (look for "Day", "Overnight", "Resident", session descriptions) — "unknown" should be rare.
- interests: infer from the programs/activities described (these are good-faith categorizations, not guesses about facts). Most traditional camps map to at least one category.
- Facts only, no marketing language.`;

function compileDesentinel(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const tri = (v: unknown) => (v === "true" ? true : v === "false" ? false : undefined);
  for (const [k, v] of Object.entries(raw)) {
    if (v === "unknown" || v === "" || v === -1) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (k === "firstTimeFriendly" || k === "lakeOnSite") {
      const b = tri(v);
      if (b !== undefined) out[k] = b;
      continue;
    }
    out[k] = v;
  }
  return out;
}

async function runCompile(args: string[]) {
  const positional = args.filter((a) => !a.startsWith("--"));
  const inDir = positional[0] ?? "out/discover/aca";
  const outDir = positional[1] ?? "out/discover/records";
  const limit = Number(args.find((a) => a.startsWith("--limit"))?.split("=")[1] ?? Infinity);
  const model = args.find((a) => a.startsWith("--model"))?.split("=")[1] ?? "claude-sonnet-5";

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ timeout: 120_000, maxRetries: 3 });

  await mkdir(outDir, { recursive: true });
  const done = new Set(await readdir(outDir));
  const leads = (await readdir(inDir))
    .filter((f) => f.endsWith(".json") && !done.has(f))
    .sort()
    .slice(0, limit);

  console.log(`Compiling ${leads.length} leads (${done.size} already done) with ${model} → ${outDir}/`);
  let ok = 0;
  for (const file of leads) {
    try {
      const lead = JSON.parse(await readFile(join(inDir, file), "utf8")) as {
        id: number; url: string; name: string; websiteCandidates?: string[]; text: string;
      };
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        thinking: { type: "adaptive" },
        output_config: { format: { type: "json_schema", schema: COMPILE_SCHEMA } },
        messages: [
          {
            role: "user",
            content: `Camp: ${lead.name}\nCandidate website URLs: ${(lead.websiteCandidates ?? []).join(" , ") || "(none)"}\n\nCompile the directory record from this ACA profile text:\n\n${lead.text}`,
          },
        ],
      });
      if (response.stop_reason !== "end_turn") {
        console.warn(`  ✗ ${file}: stop_reason=${response.stop_reason} — skipped`);
        continue;
      }
      const text = response.content.find((b) => b.type === "text")?.text ?? "";
      const record = compileDesentinel(JSON.parse(text) as Record<string, unknown>);
      record.acaAccredited = true; // source: ACA Find-a-Camp
      record.sourceRef = lead.url;
      await writeFile(join(outDir, file), JSON.stringify(record, null, 1));
      ok++;
      if (ok % 25 === 0) console.log(`  … ${ok} compiled`);
    } catch (err) {
      console.warn(`  ✗ ${file}: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`Done: ${ok}/${leads.length} compiled. Next: discover-camps.ts append ${outDir}`);
}

/* ── APPEND: validated records → camps.extra.json (non-destructive) ──── */

const REGION_BY_STATE: Record<string, Camp["region"]> = {
  ME: "northeast", NH: "northeast", VT: "northeast", MA: "northeast",
  RI: "northeast", CT: "northeast", NY: "northeast", PA: "northeast",
  NJ: "mid-atlantic", DE: "mid-atlantic", MD: "mid-atlantic",
  DC: "mid-atlantic", VA: "mid-atlantic", WV: "mid-atlantic",
  NC: "south", SC: "south", GA: "south", FL: "south", AL: "south",
  MS: "south", TN: "south", KY: "south", AR: "south", LA: "south",
  TX: "south", OK: "south",
  OH: "midwest", IN: "midwest", IL: "midwest", MI: "midwest", WI: "midwest",
  MN: "midwest", IA: "midwest", MO: "midwest", ND: "midwest", SD: "midwest",
  NE: "midwest", KS: "midwest",
  MT: "west", WY: "west", CO: "west", NM: "west", AZ: "west", UT: "west",
  NV: "west", ID: "west", WA: "west", OR: "west", CA: "west", AK: "west",
  HI: "west",
};
const INTERESTS = new Set(["team-sports", "individual-sports", "waterfront", "arts-theater", "music", "stem", "outdoor-adventure", "horseback", "gymnastics-dance", "nature-animals", "action-sports"]);
const SUPPORTS = new Set(["food-allergies", "adhd-learning", "anxiety-support", "inclusion-program"]);
const GENDERS = new Set(["coed", "boys", "girls", "brother-sister"]);
const RELIGIOUS = new Set(["none", "jewish-cultural", "jewish-observant", "christian"]);

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
const slugify = (s: string) =>
  s.toLowerCase().replace(/[''"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const nameKey = (name: string, state: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, "") + "|" + state.toUpperCase();
const hashCode = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

async function runAppend(args: string[]) {
  const dir = args.find((a) => !a.startsWith("--")) ?? "out/discover/records";
  const extra = JSON.parse(await readFile("src/data/camps.extra.json", "utf8")) as Camp[];
  const seenSlug = new Set([...SEED_CAMPS, ...extra].map((c) => c.slug));
  const seenName = new Set([...SEED_CAMPS, ...extra].map((c) => nameKey(c.name, c.state)));

  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const added: Camp[] = [];
  const rejections: Record<string, number> = {};
  let dupes = 0;
  const reject = (reason: string) => { rejections[reason] = (rejections[reason] ?? 0) + 1; };

  for (const file of files) {
    const r = JSON.parse(await readFile(join(dir, file), "utf8")) as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    const state = typeof r.state === "string" ? r.state.trim().toUpperCase() : "";
    const region = REGION_BY_STATE[state];
    if (!name || name.length < 3) { reject("missing name"); continue; }
    if (!region) { reject(`bad state`); continue; }
    if (r.type !== "sleepaway" && r.type !== "day") { reject("bad type"); continue; }
    const city = typeof r.city === "string" ? r.city.trim() : "";
    if (!city) { reject("missing city"); continue; }
    const description = typeof r.description === "string" ? r.description.trim() : "";
    if (description.length < 40) { reject("short description"); continue; }
    const interests = Array.isArray(r.interests)
      ? ([...new Set(r.interests.filter((i) => INTERESTS.has(i as string)))] as Interest[])
      : [];
    if (interests.length === 0) { reject("no valid interests"); continue; }

    const nk = nameKey(name, state);
    if (seenName.has(nk)) { dupes++; continue; }
    let slug = slugify(name);
    if (!slug) { reject("unusable slug"); continue; }
    if (seenSlug.has(slug)) slug = `${slug}-${state.toLowerCase()}`;
    if (seenSlug.has(slug)) { dupes++; continue; }

    const centroid = STATE_CENTROIDS[state];
    const h = hashCode(slug);
    const lat = centroid.lat + ((h % 100) - 50) / 60;
    const lng = centroid.lng + (((h >> 7) % 100) - 50) / 50;

    const ageMin = clamp(Math.round(Number(r.ageMin) || 7), 3, 17);
    const ageMax = clamp(Math.round(Number(r.ageMax) || 15), ageMin + 1, 18);
    let sessionWeeks = Array.isArray(r.sessionWeeks)
      ? [...new Set(r.sessionWeeks.map(Number).filter((w) => Number.isFinite(w) && w >= 1 && w <= 10).map((w) => Math.round(w * 2) / 2))].sort((a, b) => a - b)
      : [];
    if (sessionWeeks.length === 0) sessionWeeks = r.type === "day" ? [1, 2, 4, 8] : [2, 4];
    let tuitionMin = Math.round(Number(r.tuitionMin) || 0);
    let tuitionMax = Math.round(Number(r.tuitionMax) || 0);
    if (tuitionMin < 100 || tuitionMin > 30000) tuitionMin = r.type === "day" ? 1500 : 2500;
    if (tuitionMax < tuitionMin) tuitionMax = Math.round(tuitionMin * 1.8);
    tuitionMax = Math.min(tuitionMax, 30000);
    const founded = Math.round(Number(r.founded));
    const website =
      typeof r.website === "string" && /^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(r.website.trim())
        ? r.website.trim()
        : "";
    const supports = Array.isArray(r.supports)
      ? ([...new Set(r.supports.filter((s) => SUPPORTS.has(s as string)))] as SupportNeed[])
      : [];
    const activities = Array.isArray(r.activities)
      ? [...new Set(r.activities.filter((a): a is string => typeof a === "string" && a.trim().length > 1).map((a) => a.trim().toLowerCase().slice(0, 60)))].slice(0, 40)
      : [];

    const camp: Camp = {
      slug,
      name: name.slice(0, 80),
      type: r.type,
      city,
      state,
      region,
      lat: round2(lat),
      lng: round2(lng),
      ageMin,
      ageMax,
      gender: GENDERS.has(r.gender as string) ? (r.gender as Camp["gender"]) : "coed",
      sessionWeeks,
      tuitionMin,
      tuitionMax,
      size: clamp(Math.round(Number(r.size) || 200), 20, 2000),
      ...(founded >= 1850 && founded <= 2024 ? { founded } : {}),
      interests,
      vibe: 3,
      competitiveness: 2,
      structure: 3,
      religious: RELIGIOUS.has(r.religious as string) ? (r.religious as Camp["religious"]) : "none",
      supports,
      firstTimeFriendly: r.firstTimeFriendly !== false,
      acaAccredited: r.acaAccredited === true,
      description: description.slice(0, 400),
      website,
      ...(activities.length > 0 ? { activities } : {}),
      ...(typeof r.lakeOnSite === "boolean" ? { lakeOnSite: r.lakeOnSite } : {}),
      claimed: false,
      verified: false,
    };
    seenSlug.add(slug);
    seenName.add(nk);
    added.push(camp);
  }

  extra.push(...added);
  extra.sort((a, b) => a.slug.localeCompare(b.slug));
  await writeFile("src/data/camps.extra.json", JSON.stringify(extra, null, 1));
  console.log(`Appended ${added.length} new camps (${dupes} duplicates of existing camps skipped).`);
  console.log("Rejections:", JSON.stringify(rejections));
  console.log(`camps.extra.json now has ${extra.length} camps.`);
}

/* ── Entry ───────────────────────────────────────────────────────────── */

const [mode, ...rest] = process.argv.slice(2);
if (mode === "aca") runAca(rest);
else if (mode === "propublica") runPropublica(rest);
else if (mode === "compile") runCompile(rest);
else if (mode === "append") runAppend(rest);
else {
  console.error(
    "Usage:\n  npx tsx scripts/scraper/discover-camps.ts aca out/discover/aca [--from=1] [--to=6500]\n  npx tsx scripts/scraper/discover-camps.ts propublica out/discover/propublica.json\n  npx tsx scripts/scraper/discover-camps.ts compile out/discover/aca out/discover/records [--limit=500] [--model=claude-sonnet-5]\n  npx tsx scripts/scraper/discover-camps.ts append out/discover/records",
  );
  process.exit(1);
}
