import type { Camp } from "./types";

/**
 * "What's normal" context for camp shopping. Families comparing 4–5 camps
 * need a baseline: is no AC weird? Is one visiting day stingy? These norms
 * combine industry rules of thumb with live stats computed from our dataset.
 */

export interface CampNorm {
  emoji: string;
  label: string;
  /** what's typical across US sleepaway camps */
  typical: string;
}

export const CAMP_NORMS: CampNorm[] = [
  {
    emoji: "❄️",
    label: "AC in bunks",
    typical:
      "Not standard — most traditional sleepaway bunks are NOT air-conditioned. Camps with AC in every bunk are the exception, not the rule.",
  },
  {
    emoji: "🛶",
    label: "Waterfront",
    typical:
      "A private lake on site is the classic setup in the Northeast; other camps use pools or nearby lakes. Always ask which it is.",
  },
  {
    emoji: "🛏️",
    label: "Bunk size",
    typical:
      "8–12 campers per bunk with 2–4 live-in staff is typical. Under 8 is intimate; 14+ is big.",
  },
  {
    emoji: "🧺",
    label: "Laundry",
    typical:
      "Overnight camps almost always do camper laundry once a week. Day camps don't.",
  },
  {
    emoji: "👕",
    label: "Uniforms",
    typical:
      "Only a minority of camps require uniforms — and where they do, families buy them (budget ~$150–$400 extra).",
  },
  {
    emoji: "🩺",
    label: "Medical care",
    typical:
      "A 24/7 nurse and health center is standard at every accredited overnight camp. A physician living on site is common at larger camps; smaller ones use an on-call local doctor. If your child takes daily medication, confirm how the health center administers it.",
  },
  {
    emoji: "📞",
    label: "Phone calls",
    typical:
      "1–2 scheduled calls home per session is typical, and many camps are phone-free for the first week to help kids settle in. Unlimited calling is rare.",
  },
  {
    emoji: "👋",
    label: "Visiting days",
    typical:
      "One visiting day per session (or per summer at full-summer camps) is the norm.",
  },
  {
    emoji: "🗓️",
    label: "Sessions",
    typical:
      "Full-summer camps run ~7 weeks and expect campers to stay the whole time. Session camps sell 3–4 week blocks, and many offer splits like 3+3 so kids can come for part of the summer.",
  },
  {
    emoji: "🚌",
    label: "Getting there",
    typical:
      "Most Northeast sleepaway camps run buses from major metro hubs on opening day; elsewhere parent drop-off is common. Trunk pickup from your area about a week before camp is a standard add-on in big metros.",
  },
  {
    emoji: "🎉",
    label: "Traditions & trips",
    typical:
      "Nearly every camp has a signature all-camp event — Color War, College Days, Sing — plus 1–2 out-of-camp trips per session.",
  },
  {
    emoji: "🏕️",
    label: "Rookie days",
    typical:
      "Most camps host rookie days or summer tours where prospective campers spend a day on site. Families typically shortlist 4–5 camps, visit their rookie days, then decide.",
  },
  {
    emoji: "🏛️",
    label: "Ownership",
    typical:
      "Camps are family-owned, independent nonprofits, or agency-sponsored (federations, Ys, scouts). Agency camps are often far cheaper — sometimes with older facilities; family-owned camps tend to reinvest in amenities.",
  },
];

export interface DatasetStats {
  count: number;
  medianTuitionMin: number;
  medianTuitionMax: number;
  medianSize: number;
  medianFounded: number;
  acaPct: number;
  /** share of camps offering a session ≤ 4 weeks */
  shortSessionPct: number;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function datasetStats(camps: Camp[]): DatasetStats {
  const founded = camps.map((c) => c.founded).filter((f): f is number => !!f);
  return {
    count: camps.length,
    medianTuitionMin: median(camps.map((c) => c.tuitionMin)),
    medianTuitionMax: median(camps.map((c) => c.tuitionMax)),
    medianSize: median(camps.map((c) => c.size)),
    medianFounded: median(founded),
    acaPct: Math.round(
      (camps.filter((c) => c.acaAccredited).length / Math.max(1, camps.length)) * 100,
    ),
    shortSessionPct: Math.round(
      (camps.filter((c) => Math.min(...c.sessionWeeks) <= 4).length /
        Math.max(1, camps.length)) *
        100,
    ),
  };
}

/** Short "typical:" hints keyed by camp detail field, for the detail page. */
export const NORM_HINTS: Record<string, string> = {
  acInBunks: "Typical: no — most bunks aren't air-conditioned",
  lakeOnSite: "Typical: classic camps sit on a private lake",
  bunkSize: "Typical: 8–12 campers per bunk",
  laundryService: "Typical: weekly laundry at overnight camps",
  uniformRequired: "Typical: no uniform (where required, you buy it)",
  doctorOnSite: "Typical: 24/7 nurse; doctor at larger camps",
  visitingDaysPerSession: "Typical: 1 per session",
  phoneCallsPerSession: "Typical: 1–2 scheduled calls",
  sessionModel: "Typical: session camps often allow 3+3 splits",
  tripsPerSession: "Typical: 1–2 trips per session",
  ownership: "Agency camps are often cheapest",
  lastRenovated: "Ask what was renovated most recently",
  busService: "Typical: buses from major metros (Northeast)",
  trunkPickup: "Typical add-on in big metro areas",
  rookieDay: "Most camps host one — go before you decide",
};
