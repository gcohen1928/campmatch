import type {
  Camp,
  MatchReason,
  MatchResult,
  QuizAnswers,
} from "./types";
import { distanceFromHome } from "./geo";
import { INTEREST_LABELS, RELIGIOUS_LABELS } from "./quiz";

/**
 * CampMatch scoring engine.
 *
 * Two layers, like a dating app:
 *  1. Hard filters — dealbreakers (age fit, gender fit, camp type,
 *     required special-needs support, observance requirements).
 *  2. Weighted compatibility — each dimension contributes weight * fit(0..1).
 *     The final percentage is normalized into a 40–99 band so results read
 *     like match percentages rather than raw scores.
 */

const DISTANCE_CAPS: Record<QuizAnswers["maxDistance"], number> = {
  "1h": 70,
  "3h": 200,
  region: 450,
  anywhere: Infinity,
};

const BUDGET_CAPS: Record<QuizAnswers["budget"], number> = {
  under3: 3000,
  "3to7": 7000,
  "7to12": 12000,
  "12plus": Infinity,
  any: Infinity,
};

interface Dimension {
  weight: number;
  fit: number; // 0..1
  reason?: MatchReason;
  caution?: string;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** 1 when equal, falls off linearly to 0 across the full 1–5 scale range. */
function scaleFit(a: number, b: number) {
  return clamp01(1 - Math.abs(a - b) / 4);
}

export function passesHardFilters(camp: Camp, q: QuizAnswers): boolean {
  // Camp type
  if (q.campType !== "both" && camp.type !== q.campType) return false;

  // Age fit
  if (q.childAge < camp.ageMin || q.childAge > camp.ageMax) return false;

  // Gender fit
  if (q.childGender === "boy" && camp.gender === "girls") return false;
  if (q.childGender === "girl" && camp.gender === "boys") return false;
  if (q.genderPref === "coed" && (camp.gender === "boys" || camp.gender === "girls"))
    return false;
  if (q.genderPref === "single" && camp.gender === "coed") return false;

  // Observant families need an observant camp
  if (q.religious === "jewish-observant" && camp.religious !== "jewish-observant")
    return false;

  // Required support programs (inclusion is the only true dealbreaker)
  if (q.supports.includes("inclusion-program") && !camp.supports.includes("inclusion-program"))
    return false;

  return true;
}

export function scoreCamp(camp: Camp, q: QuizAnswers): MatchResult | null {
  if (!passesHardFilters(camp, q)) return null;

  const distance = distanceFromHome(q.homeState, camp);
  const distanceCap = DISTANCE_CAPS[q.maxDistance];
  // Distance is a soft-ish filter: 25% over the cap survives with penalty,
  // beyond that the camp is dropped.
  if (distance !== null && distance > distanceCap * 1.25) return null;

  const budgetCap = BUDGET_CAPS[q.budget];
  // Drop camps whose cheapest option is >20% over budget.
  if (camp.tuitionMin > budgetCap * 1.2) return null;

  const dims: Dimension[] = [];

  // ── Interests (heaviest) ───────────────────────────────────────────
  const shared = q.interests.filter((i) => camp.interests.includes(i));
  const interestFit =
    q.interests.length === 0 ? 0.7 : clamp01(shared.length / Math.min(q.interests.length, 4));
  dims.push({
    weight: 26,
    fit: interestFit,
    reason:
      shared.length >= 2
        ? {
            label: "Loves what your kid loves",
            detail: `Strong programs in ${shared
              .slice(0, 3)
              .map((i) => INTEREST_LABELS[i].toLowerCase())
              .join(", ")}.`,
            strength: shared.length >= 3 ? "great" : "good",
          }
        : shared.length === 1
          ? {
              label: "Interest match",
              detail: `Strong ${INTEREST_LABELS[shared[0]].toLowerCase()} program.`,
              strength: "good",
            }
          : undefined,
    caution:
      q.interests.length > 0 && shared.length === 0
        ? "Doesn't specialize in the activities you picked."
        : undefined,
  });

  // ── Session length ─────────────────────────────────────────────────
  if (q.campType !== "day" && q.sessionWeeks && q.sessionWeeks !== "flexible") {
    const want = Number(q.sessionWeeks);
    const closest = Math.min(...camp.sessionWeeks.map((w) => Math.abs(w - want)));
    const fit = clamp01(1 - closest / 4);
    dims.push({
      weight: 10,
      fit,
      reason:
        closest <= 1
          ? {
              label: "Session length fits",
              detail: `Offers ${camp.sessionWeeks.join(" or ")}-week sessions — right in your range.`,
              strength: "good",
            }
          : undefined,
      caution:
        closest >= 3
          ? `Sessions run ${camp.sessionWeeks.join("/")} weeks — different from the ${want} weeks you wanted.`
          : undefined,
    });
  }

  // ── Distance ───────────────────────────────────────────────────────
  if (distance !== null) {
    const fit = distance <= distanceCap ? clamp01(1 - distance / (distanceCap * 1.5)) : 0.15;
    dims.push({
      weight: 9,
      fit,
      reason:
        distance <= 120
          ? {
              label: "Close to home",
              detail: `About ${distance} miles from ${q.homeState} — an easy visiting day.`,
              strength: distance <= 80 ? "great" : "good",
            }
          : undefined,
      caution:
        distance > distanceCap
          ? `Roughly ${distance} miles away — a bit past your distance preference.`
          : undefined,
    });
  }

  // ── Budget ─────────────────────────────────────────────────────────
  {
    const fit =
      camp.tuitionMin <= budgetCap
        ? 1
        : clamp01(1 - (camp.tuitionMin - budgetCap) / budgetCap);
    dims.push({
      weight: 8,
      fit,
      reason:
        q.budget !== "any" && camp.tuitionMin <= budgetCap * 0.8
          ? {
              label: "Comfortably in budget",
              detail: `Sessions start around $${camp.tuitionMin.toLocaleString()}.`,
              strength: "good",
            }
          : undefined,
      caution:
        camp.tuitionMin > budgetCap
          ? `Starts around $${camp.tuitionMin.toLocaleString()} — above your budget band.`
          : undefined,
    });
  }

  // ── Vibe: rustic ↔ modern ──────────────────────────────────────────
  {
    const fit = scaleFit(camp.vibe, q.vibe);
    dims.push({
      weight: 10,
      fit,
      reason:
        fit >= 0.75
          ? {
              label: camp.vibe >= 4 ? "Modern comforts" : camp.vibe <= 2 ? "Classic & rustic" : "Balanced vibe",
              detail:
                camp.vibe >= 4
                  ? "Updated facilities and amenities, the way you wanted."
                  : camp.vibe <= 2
                    ? "Traditional, unplugged camping — exactly your speed."
                    : "A healthy mix of tradition and comfort.",
              strength: fit >= 0.9 ? "great" : "good",
            }
          : undefined,
    });
  }

  // ── Competitiveness ────────────────────────────────────────────────
  {
    const fit = scaleFit(camp.competitiveness, q.competitiveness);
    dims.push({
      weight: 10,
      fit,
      reason:
        fit >= 0.75
          ? {
              label:
                camp.competitiveness >= 4
                  ? "Brings the intensity"
                  : camp.competitiveness <= 2
                    ? "Low-pressure culture"
                    : "Healthy competition",
              detail:
                camp.competitiveness >= 4
                  ? "Serious coaching and competition for a kid who wants to be pushed."
                  : camp.competitiveness <= 2
                    ? "Everyone plays, nobody sweats the scoreboard."
                    : "Spirited but supportive — competition without the pressure cooker.",
              strength: fit >= 0.9 ? "great" : "good",
            }
          : undefined,
      caution:
        camp.competitiveness - q.competitiveness >= 3
          ? "Noticeably more competitive than what you described."
          : undefined,
    });
  }

  // ── Structure: scheduled ↔ elective ────────────────────────────────
  {
    const fit = scaleFit(camp.structure, q.structure);
    dims.push({
      weight: 8,
      fit,
      reason:
        fit >= 0.75
          ? {
              label: camp.structure >= 4 ? "Kids choose their day" : camp.structure <= 2 ? "Structured days" : "Guided choice",
              detail:
                camp.structure >= 4
                  ? "Elective-driven scheduling — your camper builds their own summer."
                  : camp.structure <= 2
                    ? "A full, predictable schedule — great for kids who thrive on routine."
                    : "A base schedule with meaningful choices layered in.",
              strength: "good",
            }
          : undefined,
    });
  }

  // ── Size vs. preference & social style ─────────────────────────────
  {
    const sizeBand = camp.size < 250 ? "intimate" : camp.size <= 450 ? "medium" : "large";
    let fit = 0.7;
    if (q.sizePref !== "any") fit = q.sizePref === sizeBand ? 1 : sizeBand === "medium" ? 0.6 : 0.25;
    // Social style nudges: slow-to-warm & small-group kids fit smaller camps
    if (q.socialStyle === "warms-up" || q.socialStyle === "small-groups") {
      fit = clamp01(fit + (sizeBand === "intimate" ? 0.15 : sizeBand === "large" ? -0.2 : 0));
    }
    if (q.socialStyle === "big-energy" && sizeBand === "large") fit = clamp01(fit + 0.15);
    dims.push({
      weight: 8,
      fit,
      reason:
        fit >= 0.85
          ? {
              label:
                sizeBand === "intimate"
                  ? "Small enough to be known"
                  : sizeBand === "large"
                    ? "Big camp energy"
                    : "Right-sized community",
              detail: `About ${camp.size} campers — a good fit for your child's social style.`,
              strength: "good",
            }
          : undefined,
      caution:
        (q.socialStyle === "warms-up" || q.socialStyle === "small-groups") && sizeBand === "large"
          ? `Around ${camp.size} campers — big; slower-to-warm kids may need extra support settling in.`
          : undefined,
    });
  }

  // ── Religious / cultural fit ───────────────────────────────────────
  {
    let fit = 0.7;
    if (q.religious === "any") fit = 0.8;
    else if (q.religious === camp.religious) fit = 1;
    else if (q.religious === "none" && camp.religious === "none") fit = 1;
    else if (q.religious === "none" && camp.religious !== "none") fit = 0.45;
    else if (q.religious === "jewish-cultural" && camp.religious === "jewish-observant") fit = 0.75;
    else if (q.religious === "jewish-cultural" && camp.religious === "none") fit = 0.6;
    else if (camp.religious !== "none" && q.religious !== camp.religious) fit = 0.2;
    dims.push({
      weight: 9,
      fit,
      reason:
        fit >= 0.95 && camp.religious !== "none"
          ? {
              label: "Community fit",
              detail: `${RELIGIOUS_LABELS[camp.religious]} community, matching what you're looking for.`,
              strength: "great",
            }
          : undefined,
      caution:
        fit <= 0.45 && camp.religious !== "none"
          ? `${RELIGIOUS_LABELS[camp.religious]} camp — different from your preference.`
          : undefined,
    });
  }

  // ── First-time camper ──────────────────────────────────────────────
  if (q.firstTime && q.campType !== "day") {
    const shortOption = Math.min(...camp.sessionWeeks) <= 4;
    const fit = camp.firstTimeFriendly ? (shortOption ? 1 : 0.8) : shortOption ? 0.6 : 0.35;
    dims.push({
      weight: 7,
      fit,
      reason:
        camp.firstTimeFriendly
          ? {
              label: "Great for first-timers",
              detail: shortOption
                ? "Known for onboarding new campers, with shorter starter sessions."
                : "A culture that's known for welcoming brand-new campers.",
              strength: shortOption ? "great" : "good",
            }
          : undefined,
      caution:
        !camp.firstTimeFriendly && !shortOption
          ? "Full-summer only and most campers start young — a big first leap."
          : undefined,
    });
  }

  // ── Community reputation ───────────────────────────────────────────
  if (camp.rating !== undefined) {
    // 4.0 → 0.4, 4.5 → 0.7, 5.0 → 1.0; thin review counts pull toward neutral.
    const confidence = clamp01((camp.reviewCount ?? 0) / 15);
    const fit = clamp01(0.7 + (camp.rating - 4.5) * 0.6 * confidence);
    dims.push({
      weight: 5,
      fit,
      reason:
        camp.rating >= 4.7 && (camp.reviewCount ?? 0) >= 10
          ? {
              label: "Families rave about it",
              detail: `Rated ${camp.rating.toFixed(1)} across ${camp.reviewCount} community reviews.`,
              strength: camp.rating >= 4.8 ? "great" : "good",
            }
          : undefined,
      caution:
        camp.rating <= 4.0 && (camp.reviewCount ?? 0) >= 10
          ? "Community reviews are more mixed than most — read them before you commit."
          : undefined,
    });
  }

  // ── Support needs (soft ones) ──────────────────────────────────────
  const softNeeds = q.supports.filter((s) => s !== "inclusion-program");
  if (softNeeds.length > 0) {
    const covered = softNeeds.filter((s) => camp.supports.includes(s));
    const fit = covered.length / softNeeds.length;
    dims.push({
      weight: 9,
      fit,
      reason:
        covered.length === softNeeds.length
          ? {
              label: "Support needs covered",
              detail: "Programs in place for the support needs you flagged.",
              strength: "great",
            }
          : undefined,
      caution:
        covered.length < softNeeds.length
          ? "We couldn't confirm support for everything you flagged — ask the director directly."
          : undefined,
    });
  }

  // ── Compose ────────────────────────────────────────────────────────
  const totalWeight = dims.reduce((s, d) => s + d.weight, 0);
  const raw = dims.reduce((s, d) => s + d.weight * d.fit, 0) / totalWeight;

  // Normalize into a dating-app style 40–99 band.
  const score = Math.round(40 + raw * 59);

  const reasons = dims
    .filter((d): d is Dimension & { reason: MatchReason } => Boolean(d.reason))
    .sort((a, b) => b.weight * b.fit - a.weight * a.fit)
    .map((d) => d.reason)
    .slice(0, 4);

  const cautions = dims
    .map((d) => d.caution)
    .filter((c): c is string => Boolean(c))
    .slice(0, 2);

  return { camp, score, reasons, cautions, distanceMiles: distance };
}

export function matchCamps(camps: Camp[], q: QuizAnswers): MatchResult[] {
  return camps
    .map((c) => scoreCamp(c, q))
    .filter((r): r is MatchResult => r !== null)
    .sort((a, b) => b.score - a.score);
}
