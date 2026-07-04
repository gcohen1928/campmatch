/**
 * Merge compiled camp batches into the app dataset.
 *
 * Input:  a directory of batch-*.json files (arrays of camp records with
 *         inline `reviews`), plus optional seed-reviews.json
 *         (ratings/reviews for camps already in src/lib/camps-seed.ts).
 * Output: src/data/camps.extra.json   — normalized camps (no review text)
 *         src/data/reviews.json       — slug → reviews, for detail pages
 *         src/data/seed-ratings.json  — slug → {rating, reviewCount} for seeds
 *
 * Every record is validated, clamped into the app's enums/ranges, deduped
 * (against the seed dataset and across batches) and flagged
 * claimed:false / verified:false.
 *
 * Usage: pnpm dlx tsx scripts/scraper/merge-batches.ts <batches-dir>
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SEED_CAMPS } from "../../src/lib/camps-seed";
import { STATE_CENTROIDS } from "../../src/lib/geo";
import type { Camp, CampReview, Interest, SupportNeed } from "../../src/lib/types";

const INTERESTS = new Set([
  "team-sports", "individual-sports", "waterfront", "arts-theater", "music",
  "stem", "outdoor-adventure", "horseback", "gymnastics-dance",
  "nature-animals", "action-sports",
]);
const SUPPORTS = new Set([
  "food-allergies", "adhd-learning", "anxiety-support", "inclusion-program",
]);
const GENDERS = new Set(["coed", "boys", "girls", "brother-sister"]);
const RELIGIOUS = new Set(["none", "jewish-cultural", "jewish-observant", "christian"]);
const ROLES = new Set(["parent", "camper", "alum", "counselor"]);

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

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** dedupe key: normalized name + state */
function nameKey(name: string, state: string): string {
  return (
    name.toLowerCase().replace(/[^a-z0-9]/g, "") + "|" + state.toUpperCase()
  );
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function cleanReviews(raw: unknown, campRating: number): CampReview[] {
  if (!Array.isArray(raw)) return [];
  const out: CampReview[] = [];
  for (const r of raw.slice(0, 3)) {
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    const text = typeof rec.text === "string" ? rec.text.trim().slice(0, 300) : "";
    if (text.length < 20) continue;
    const rating = clamp(Math.round(Number(rec.rating) || Math.round(campRating)), 1, 5);
    out.push({
      author:
        typeof rec.author === "string" && rec.author.trim()
          ? rec.author.trim().slice(0, 60)
          : "Parent of a former camper",
      role: ROLES.has(rec.role as string) ? (rec.role as CampReview["role"]) : "parent",
      rating,
      text,
      source: "compiled",
      ...(Number.isFinite(Number(rec.year)) &&
      Number(rec.year) >= 2015 &&
      Number(rec.year) <= 2026
        ? { year: Number(rec.year) }
        : {}),
    });
  }
  return out;
}

interface Rejection { batch: string; name: string; reason: string }

async function main() {
  const [batchesDir] = process.argv.slice(2);
  if (!batchesDir) {
    console.error("Usage: pnpm dlx tsx scripts/scraper/merge-batches.ts <batches-dir>");
    process.exit(1);
  }

  const files = (await readdir(batchesDir)).filter(
    (f) => f.startsWith("batch-") && f.endsWith(".json"),
  ).sort();

  const seenSlug = new Set(SEED_CAMPS.map((c) => c.slug));
  const seenName = new Set(SEED_CAMPS.map((c) => nameKey(c.name, c.state)));
  const camps: Camp[] = [];
  const reviews: Record<string, CampReview[]> = {};
  const rejections: Rejection[] = [];
  let rawTotal = 0;
  let dupes = 0;

  for (const file of files) {
    let records: unknown;
    try {
      records = JSON.parse(await readFile(join(batchesDir, file), "utf8"));
    } catch (e) {
      console.error(`✗ ${file}: unparseable JSON — skipped (${e})`);
      continue;
    }
    if (!Array.isArray(records)) {
      console.error(`✗ ${file}: not an array — skipped`);
      continue;
    }
    rawTotal += records.length;

    for (const raw of records) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      const name = typeof r.name === "string" ? r.name.trim() : "";
      const reject = (reason: string) =>
        rejections.push({ batch: file, name: name || "(unnamed)", reason });

      const state = typeof r.state === "string" ? r.state.trim().toUpperCase() : "";
      const region = REGION_BY_STATE[state];
      if (!name || name.length < 3) { reject("missing name"); continue; }
      if (!region) { reject(`bad state "${state}"`); continue; }
      if (r.type !== "sleepaway" && r.type !== "day") { reject("bad type"); continue; }
      if (!GENDERS.has(r.gender as string)) { reject("bad gender"); continue; }
      const city = typeof r.city === "string" ? r.city.trim() : "";
      if (!city) { reject("missing city"); continue; }
      const description =
        typeof r.description === "string" ? r.description.trim() : "";
      if (description.length < 40) { reject("missing/short description"); continue; }

      // Dedupe (seed camps win; first batch occurrence wins)
      const nk = nameKey(name, state);
      if (seenName.has(nk)) { dupes++; continue; }

      let slug = typeof r.slug === "string" && r.slug ? slugify(r.slug) : slugify(name);
      if (!slug) { reject("unusable slug"); continue; }
      if (seenSlug.has(slug)) slug = `${slug}-${state.toLowerCase()}`;
      if (seenSlug.has(slug)) { dupes++; continue; }

      // Location: fall back to a deterministic jitter around the state
      // centroid when coordinates are missing or implausible.
      let lat = Number(r.lat);
      let lng = Number(r.lng);
      const centroid = STATE_CENTROIDS[state];
      const plausible =
        Number.isFinite(lat) && Number.isFinite(lng) &&
        lat > 17 && lat < 72 && lng > -180 && lng < -60 &&
        Math.abs(lat - centroid.lat) < 12 && Math.abs(lng - centroid.lng) < 14;
      if (!plausible) {
        const h = hashCode(slug);
        lat = centroid.lat + ((h % 100) - 50) / 60;
        lng = centroid.lng + (((h >> 7) % 100) - 50) / 50;
      }

      const ageMin = clamp(Math.round(Number(r.ageMin) || 7), 3, 17);
      const ageMax = clamp(Math.round(Number(r.ageMax) || 15), ageMin + 1, 18);

      let sessionWeeks = Array.isArray(r.sessionWeeks)
        ? [...new Set(
            (r.sessionWeeks as unknown[])
              .map(Number)
              .filter((w) => Number.isFinite(w) && w >= 1 && w <= 10)
              .map((w) => Math.round(w * 2) / 2),
          )].sort((a, b) => a - b)
        : [];
      if (sessionWeeks.length === 0) sessionWeeks = r.type === "day" ? [1, 2, 4, 8] : [2, 4];

      let tuitionMin = Math.round(Number(r.tuitionMin) || 0);
      let tuitionMax = Math.round(Number(r.tuitionMax) || 0);
      if (tuitionMin < 100 || tuitionMin > 30000)
        tuitionMin = r.type === "day" ? 1500 : 2500;
      if (tuitionMax < tuitionMin) tuitionMax = Math.round(tuitionMin * 1.8);
      tuitionMax = Math.min(tuitionMax, 30000);

      const size = clamp(Math.round(Number(r.size) || 200), 20, 2000);

      const interests = Array.isArray(r.interests)
        ? ([...new Set((r.interests as unknown[]).filter((i) => INTERESTS.has(i as string)))] as Interest[])
        : [];
      if (interests.length === 0) { reject("no valid interests"); continue; }

      const supports = Array.isArray(r.supports)
        ? ([...new Set((r.supports as unknown[]).filter((s) => SUPPORTS.has(s as string)))] as SupportNeed[])
        : [];

      const website =
        typeof r.website === "string" && /^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(r.website.trim())
          ? r.website.trim()
          : "";

      const rating = clamp(round1(Number(r.rating) || 4.4), 3.5, 5);
      const campReviews = cleanReviews(r.reviews, rating);
      const reviewCount = clamp(
        Math.round(Number(r.reviewCount) || campReviews.length * 6),
        campReviews.length, 200,
      );

      const founded = Math.round(Number(r.founded));

      const camp: Camp = {
        slug,
        name: name.slice(0, 80),
        type: r.type,
        city,
        state,
        region,
        lat: round1(lat * 100) / 100,
        lng: round1(lng * 100) / 100,
        ageMin,
        ageMax,
        gender: r.gender as Camp["gender"],
        sessionWeeks,
        tuitionMin,
        tuitionMax,
        size,
        ...(founded >= 1850 && founded <= 2024 ? { founded } : {}),
        interests,
        vibe: clamp(Math.round(Number(r.vibe) || 3), 1, 5),
        competitiveness: clamp(Math.round(Number(r.competitiveness) || 2), 1, 5),
        structure: clamp(Math.round(Number(r.structure) || 3), 1, 5),
        religious: RELIGIOUS.has(r.religious as string)
          ? (r.religious as Camp["religious"])
          : "none",
        supports,
        firstTimeFriendly: r.firstTimeFriendly !== false,
        acaAccredited: r.acaAccredited === true,
        description: description.slice(0, 500),
        website,
        rating,
        reviewCount,
        claimed: false,
        verified: false,
      };

      seenSlug.add(slug);
      seenName.add(nk);
      camps.push(camp);
      if (campReviews.length > 0) reviews[slug] = campReviews;
    }
  }

  // Seed camp ratings/reviews (optional file produced alongside batches)
  const seedRatings: Record<string, { rating: number; reviewCount: number }> = {};
  try {
    const seedRaw = JSON.parse(
      await readFile(join(batchesDir, "seed-reviews.json"), "utf8"),
    ) as Array<Record<string, unknown>>;
    const seedBySlug = new Set(SEED_CAMPS.map((c) => c.slug));
    for (const r of seedRaw) {
      const slug = r.slug as string;
      if (!seedBySlug.has(slug)) continue;
      const rating = clamp(round1(Number(r.rating) || 4.5), 3.5, 5);
      const revs = cleanReviews(r.reviews, rating);
      seedRatings[slug] = {
        rating,
        reviewCount: clamp(Math.round(Number(r.reviewCount) || 12), revs.length, 200),
      };
      if (revs.length > 0) reviews[slug] = revs;
    }
    console.log(`Seed ratings applied: ${Object.keys(seedRatings).length}`);
  } catch {
    console.log("No seed-reviews.json found — skipping seed ratings.");
  }

  camps.sort((a, b) => a.slug.localeCompare(b.slug));

  await writeFile("src/data/camps.extra.json", JSON.stringify(camps, null, 1));
  await writeFile("src/data/reviews.json", JSON.stringify(reviews, null, 1));
  await writeFile("src/data/seed-ratings.json", JSON.stringify(seedRatings, null, 1));

  console.log(`\nBatches: ${files.length}, raw records: ${rawTotal}`);
  console.log(`Accepted: ${camps.length} camps (${dupes} duplicates dropped, ${rejections.length} rejected)`);
  console.log(`Reviews written for ${Object.keys(reviews).length} camps`);
  if (rejections.length > 0) {
    const byReason = new Map<string, number>();
    for (const r of rejections)
      byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
    console.log("Rejections:", Object.fromEntries(byReason));
  }
  const byState = new Map<string, number>();
  for (const c of camps) byState.set(c.state, (byState.get(c.state) ?? 0) + 1);
  console.log(
    "By state:",
    [...byState.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s}:${n}`).join(" "),
  );
}

main();
