/**
 * Apply LLM research records (one JSON per camp, every value with a source
 * URL + quote) to the dataset.
 *
 *   npx tsx scripts/scraper/apply-research.ts <records-dir> [--dry-run]
 *
 * Record shape (what the research agents write, see RESEARCH.md):
 *   { slug, checkedAt, fields: { <field>: { value, url, quote, confidence, note } }, issues }
 *
 * - high/medium-confidence values OVERWRITE the compiled estimate, because a
 *   sourced value beats a placeholder. Low-confidence values (forums, parent
 *   comments) are recorded in camp-sources.json but not applied.
 * - value "n/a" (field doesn't apply to this camp type) and null are skipped.
 * - Provenance goes to src/data/camp-sources.json, keyed by slug.
 * - Seed camps (src/lib/camps-seed.ts) are hand-maintained; their accepted
 *   patches are written to out/seed-research.json for a manual pass.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SEED_CAMPS } from "../../src/lib/camps-seed";
import { fieldApplies } from "../../src/lib/field-rules";
import type { Camp, CampSources, FieldSource, SourceConfidence } from "../../src/lib/types";

const EXTRA = "src/data/camps.extra.json";
const SOURCES = "src/data/camp-sources.json";

const STATES = new Set(
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" "),
);
const INTERESTS_SUPPORTS = new Set(["food-allergies", "adhd-learning", "anxiety-support", "inclusion-program"]);

const int = (lo: number, hi: number) => (v: unknown) => {
  const n = Math.round(Number(v));
  return typeof v !== "boolean" && Number.isFinite(n) && n >= lo && n <= hi ? n : undefined;
};
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
const oneOf = (...opts: string[]) => (v: unknown) => (typeof v === "string" && opts.includes(v) ? v : undefined);
const str = (max: number) => (v: unknown) =>
  typeof v === "string" && v.trim().length > 1 ? v.trim().slice(0, max) : undefined;
const strArr = (max: number, filter?: Set<string>) => (v: unknown) => {
  if (!Array.isArray(v)) return undefined;
  const out = [...new Set(
    v.filter((s): s is string => typeof s === "string" && s.trim().length > 1)
      .map((s) => s.trim().slice(0, 60))
      .filter((s) => !filter || filter.has(s)),
  )].slice(0, max);
  return out.length > 0 ? out : undefined;
};

/** Validator per researchable field; returns undefined for invalid values. */
const VALIDATORS: Partial<Record<keyof Camp, (v: unknown) => unknown>> = {
  website: (v) => (typeof v === "string" && /^https?:\/\/[^\s]+\.[^\s]+/.test(v) ? v : undefined),
  address: str(200),
  city: str(60),
  state: (v) => (typeof v === "string" && STATES.has(v) ? v : undefined),
  type: oneOf("sleepaway", "day"),
  ageMin: int(2, 21),
  ageMax: int(3, 25),
  gender: oneOf("coed", "boys", "girls", "brother-sister"),
  sessionWeeks: (v) => {
    if (!Array.isArray(v)) return undefined;
    const w = [...new Set(v.map(Number).filter((n) => Number.isFinite(n) && n > 0 && n <= 12))].sort((a, b) => a - b);
    return w.length > 0 ? w : undefined;
  },
  sessionModel: oneOf("full-summer", "sessions", "flexible"),
  tuitionMin: int(0, 30000),
  tuitionMax: int(0, 30000),
  size: int(5, 3000),
  founded: int(1850, 2027),
  religious: oneOf("none", "jewish-cultural", "jewish-observant", "christian"),
  ownership: oneOf("family", "nonprofit", "agency"),
  acaAccredited: bool,
  activities: (v) => (strArr(25)(v) as string[] | undefined)?.map((a) => a.toLowerCase()),
  supports: strArr(4, INTERESTS_SUPPORTS),
  firstTimeFriendly: bool,
  lakeOnSite: bool,
  acInBunks: bool,
  bunkSize: int(2, 40),
  laundryService: bool,
  uniformRequired: bool,
  doctorOnSite: bool,
  visitingDaysPerSession: int(0, 6),
  phoneCallsPerSession: int(0, 30),
  tripsPerSession: int(0, 15),
  traditions: strArr(10),
  lastRenovated: int(1950, 2027),
  busService: bool,
  busCities: strArr(15),
  trunkPickup: bool,
  trunkPickupAreas: strArr(15),
  rookieDay: (v) => {
    if (!v || typeof v !== "object") return undefined;
    const r = v as Record<string, unknown>;
    if (typeof r.offered !== "boolean") return undefined;
    const details = str(300)(r.details);
    return details ? { offered: r.offered, details } : { offered: r.offered };
  },
  extendedCare: bool,
  lunchIncluded: bool,
};

const CONFIDENCES = new Set<SourceConfidence>(["high", "medium", "low"]);

interface RawField {
  value?: unknown;
  url?: unknown;
  quote?: unknown;
  confidence?: unknown;
  note?: unknown;
}

async function main() {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  if (!dir) {
    console.error("Usage: npx tsx scripts/scraper/apply-research.ts <records-dir> [--dry-run]");
    process.exit(1);
  }

  const extra = JSON.parse(await readFile(EXTRA, "utf8")) as Camp[];
  const sources = JSON.parse(await readFile(SOURCES, "utf8")) as Record<string, CampSources>;
  const bySlug = new Map(extra.map((c) => [c.slug, c]));
  const seedBySlug = new Map(SEED_CAMPS.map((c) => [c.slug, c]));
  const seedPatches: Record<string, Partial<Camp>> = {};

  let camps = 0;
  let applied = 0;
  let changed = 0;
  let lowOnly = 0;
  let rejected = 0;

  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".json"))) {
    const rec = JSON.parse(await readFile(join(dir, file), "utf8")) as {
      slug?: string;
      checkedAt?: string;
      fields?: Record<string, RawField>;
      issues?: unknown;
    };
    const slug = rec.slug ?? "";
    const seed = seedBySlug.get(slug);
    const camp = seed ? { ...seed } : bySlug.get(slug);
    if (!camp || !rec.fields) {
      console.error(`✗ ${file}: unknown slug "${slug}" or no fields — skipped`);
      continue;
    }
    camps++;
    const checkedAt = /^\d{4}-\d{2}-\d{2}$/.test(rec.checkedAt ?? "") ? rec.checkedAt! : new Date().toISOString().slice(0, 10);
    const entry: CampSources = { checkedAt, fields: {} };
    const patch: Partial<Camp> = {};

    // Type first, so applicability is judged against the corrected type.
    const typeField = rec.fields.type;
    const type = (VALIDATORS.type!(typeField?.value) as Camp["type"] | undefined) ?? camp.type;

    for (const [key, raw] of Object.entries(rec.fields)) {
      const field = key as keyof Camp;
      const validate = VALIDATORS[field];
      if (!validate || !raw || raw.value === null || raw.value === undefined || raw.value === "n/a") continue;
      if (!fieldApplies(type, field)) continue;
      const value = validate(raw.value);
      const url = typeof raw.url === "string" && /^https?:\/\//.test(raw.url) ? raw.url : undefined;
      const confidence = CONFIDENCES.has(raw.confidence as SourceConfidence) ? (raw.confidence as SourceConfidence) : undefined;
      if (value === undefined || !url || !confidence) {
        rejected++;
        continue;
      }
      const src: FieldSource = { url, confidence, checkedAt };
      if (typeof raw.quote === "string" && raw.quote.trim()) src.quote = raw.quote.trim().slice(0, 300);
      if (typeof raw.note === "string" && raw.note.trim()) src.note = raw.note.trim().slice(0, 200);
      entry.fields[field] = src;
      if (confidence === "low") {
        lowOnly++;
        continue;
      }
      (patch as Record<string, unknown>)[field] = value;
    }

    // Keep ranges coherent when only one end was sourced.
    const merged = { ...camp, ...patch };
    if (merged.ageMin > merged.ageMax) {
      delete patch.ageMin;
      delete patch.ageMax;
    }
    if (merged.tuitionMin > merged.tuitionMax) {
      if (patch.tuitionMin !== undefined && patch.tuitionMax === undefined) patch.tuitionMax = patch.tuitionMin;
      else if (patch.tuitionMax !== undefined && patch.tuitionMin === undefined) patch.tuitionMin = patch.tuitionMax;
      else {
        delete patch.tuitionMin;
        delete patch.tuitionMax;
      }
    }
    // Drop provenance for anything the coherence checks removed.
    for (const f of Object.keys(entry.fields) as (keyof Camp)[]) {
      if (entry.fields[f]!.confidence !== "low" && !(f in patch)) delete entry.fields[f];
    }

    const issues = Array.isArray(rec.issues) ? rec.issues.filter((i): i is string => typeof i === "string" && i.trim().length > 0) : [];
    if (issues.length > 0) entry.issues = issues.map((i) => i.trim().slice(0, 400));
    sources[slug] = entry;

    for (const [k, v] of Object.entries(patch)) {
      applied++;
      if (JSON.stringify((camp as unknown as Record<string, unknown>)[k]) !== JSON.stringify(v)) changed++;
    }
    if (seed) seedPatches[slug] = patch;
    else Object.assign(camp, patch);
  }

  console.log(
    `${camps} camps: ${applied} sourced values applied (${changed} differed from the old estimate), ` +
      `${lowOnly} low-confidence values recorded only, ${rejected} values rejected by validation.`,
  );
  if (dryRun) return;
  await writeFile(EXTRA, JSON.stringify(extra, null, 1));
  await writeFile(SOURCES, JSON.stringify(sources, null, 1));
  if (Object.keys(seedPatches).length > 0) {
    await mkdir("out", { recursive: true });
    await writeFile("out/seed-research.json", JSON.stringify(seedPatches, null, 1));
    console.log(`Seed camps: wrote ${Object.keys(seedPatches).length} patches to out/seed-research.json for a manual pass.`);
  }
}

main();
