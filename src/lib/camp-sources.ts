import type { CampSources } from "./types";
import sourcesJson from "@/data/camp-sources.json";

/**
 * Per-field provenance for researched camps, keyed by slug. Kept out of the
 * main camp records (like reviews) so it's loaded server-side only. A camp
 * field with no entry here is a compiled estimate, not a sourced fact.
 */
const SOURCES = sourcesJson as unknown as Record<string, CampSources>;

export function getSourcesForCamp(slug: string): CampSources | undefined {
  return SOURCES[slug];
}
