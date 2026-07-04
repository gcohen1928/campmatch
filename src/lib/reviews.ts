import type { CampReview } from "./types";
import reviewsJson from "@/data/reviews.json";

/**
 * Community snapshots per camp, keyed by slug. Kept out of the main camp
 * records so the full review text is only loaded server-side on camp detail
 * pages, never shipped in the client bundle with the dataset.
 */
const REVIEWS = reviewsJson as Record<string, CampReview[]>;

export function getReviewsForCamp(slug: string): CampReview[] {
  return REVIEWS[slug] ?? [];
}
