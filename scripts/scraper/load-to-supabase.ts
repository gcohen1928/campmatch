/**
 * Load the compiled dataset into Supabase.
 *
 * Upserts every camp from the app dataset into public.camps
 * (source = 'seed' for curated camps, 'scraper' for compiled ones) and
 * replaces compiled rows in public.camp_reviews from src/data/reviews.json.
 * Requires migrations 0001 + 0002 and a service-role key (RLS bypass):
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   pnpm dlx tsx scripts/scraper/load-to-supabase.ts
 */
import { createClient } from "@supabase/supabase-js";
import { SEED_CAMPS } from "../../src/lib/camps-seed";
import extraCamps from "../../src/data/camps.extra.json";
import reviewsJson from "../../src/data/reviews.json";
import seedRatings from "../../src/data/seed-ratings.json";
import type { Camp, CampReview } from "../../src/lib/types";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key);

const RATINGS = seedRatings as Record<string, { rating: number; reviewCount: number }>;
const REVIEWS = reviewsJson as Record<string, CampReview[]>;

function toRow(camp: Camp, source: "seed" | "scraper") {
  return {
    slug: camp.slug,
    name: camp.name,
    type: camp.type,
    city: camp.city,
    state: camp.state,
    region: camp.region,
    lat: camp.lat,
    lng: camp.lng,
    age_min: camp.ageMin,
    age_max: camp.ageMax,
    gender: camp.gender,
    session_weeks: camp.sessionWeeks,
    tuition_min: camp.tuitionMin,
    tuition_max: camp.tuitionMax,
    size: camp.size,
    founded: camp.founded ?? null,
    interests: camp.interests,
    vibe: camp.vibe,
    competitiveness: camp.competitiveness,
    structure: camp.structure,
    religious: camp.religious,
    supports: camp.supports,
    first_time_friendly: camp.firstTimeFriendly,
    aca_accredited: camp.acaAccredited,
    description: camp.description,
    website: camp.website || null,
    photos: camp.photos ?? [],
    rating: camp.rating ?? RATINGS[camp.slug]?.rating ?? null,
    review_count: camp.reviewCount ?? RATINGS[camp.slug]?.reviewCount ?? 0,
    source,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  const rows = [
    ...SEED_CAMPS.map((c) => toRow(c, "seed")),
    ...(extraCamps as Camp[]).map((c) => toRow(c, "scraper")),
  ];

  console.log(`Upserting ${rows.length} camps…`);
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase
      .from("camps")
      .upsert(chunk, { onConflict: "slug" });
    if (error) throw new Error(`camps upsert failed at ${i}: ${error.message}`);
    console.log(`  ${Math.min(i + 500, rows.length)}/${rows.length}`);
  }

  console.log("Replacing compiled reviews…");
  const { error: delError } = await supabase
    .from("camp_reviews")
    .delete()
    .eq("source", "compiled");
  if (delError) throw new Error(`review cleanup failed: ${delError.message}`);

  const reviewRows = Object.entries(REVIEWS).flatMap(([slug, reviews]) =>
    reviews.map((r) => ({
      camp_slug: slug,
      author: r.author,
      role: r.role,
      rating: r.rating,
      text: r.text,
      source: "compiled",
      year: r.year ?? null,
    })),
  );
  for (let i = 0; i < reviewRows.length; i += 500) {
    const chunk = reviewRows.slice(i, i + 500);
    const { error } = await supabase.from("camp_reviews").insert(chunk);
    if (error) throw new Error(`reviews insert failed at ${i}: ${error.message}`);
    console.log(`  ${Math.min(i + 500, reviewRows.length)}/${reviewRows.length}`);
  }

  console.log(`Done: ${rows.length} camps, ${reviewRows.length} reviews.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
