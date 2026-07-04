import type { Camp } from "./types";
import { SEED_CAMPS } from "./camps-seed";
import extraCamps from "@/data/camps.extra.json";
import seedRatings from "@/data/seed-ratings.json";

/**
 * The full camp dataset = hand-curated seed camps (src/lib/camps-seed.ts)
 * merged with the compiled national dataset (src/data/camps.extra.json,
 * produced by scripts/scraper/merge-batches.ts).
 *
 * Every listing is `verified: false` — figures (tuition, size, ratings) are
 * good-faith estimates compiled from public sources until a camp claims and
 * verifies its listing. Community ratings/reviews are snapshots of public
 * web sentiment, not verified reviews.
 */

const RATINGS = seedRatings as Record<
  string,
  { rating: number; reviewCount: number }
>;

const seeded: Camp[] = SEED_CAMPS.map((c) => {
  const r = RATINGS[c.slug];
  return r ? { ...c, rating: r.rating, reviewCount: r.reviewCount } : c;
});

const seedSlugs = new Set(seeded.map((c) => c.slug));

const extra: Camp[] = (extraCamps as Camp[]).filter(
  (c) => !seedSlugs.has(c.slug),
);

export const CAMPS: Camp[] = [...seeded, ...extra];

const BY_SLUG = new Map(CAMPS.map((c) => [c.slug, c]));

export function getCampBySlug(slug: string): Camp | undefined {
  return BY_SLUG.get(slug);
}
