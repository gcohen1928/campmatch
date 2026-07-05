import type {
  Camp,
  Comfort,
  MatchReason,
  MatchResult,
  QuizAnswers,
} from "./types";
import { distanceFromHome } from "./geo";
import { COMFORT_LABELS, INTEREST_LABELS, RELIGIOUS_LABELS } from "./quiz";

/**
 * Camp Matching scoring engine.
 *
 * Two layers, like a dating app:
 *  1. Hard filters — dealbreakers (age fit, gender fit, camp type,
 *     required special-needs support, observance requirements).
 *  2. Weighted compatibility — each dimension contributes weight * fit(0..1).
 *     The final percentage is normalized into a 40–99 band so results read
 *     like match percentages rather than raw scores.
 *
 * Life-at-camp details (AC, laundry, uniforms, phone policy…) are compiled
 * camp by camp and may be missing. Missing data is treated as UNKNOWN — a
 * neutral fit plus an honest caution — never as "the camp doesn't have it".
 */

/** Families shortlist 4–5 camps, visit rookie days, then decide — so we
 *  present a short list rather than a directory dump. */
export const TOP_MATCH_COUNT = 5;

/**
 * Weight each compatibility dimension contributes to the final score.
 * Exported so the admin dashboard reports the same numbers the engine uses.
 * Several dimensions only apply when the family's answers make them relevant
 * (or when the camp's data has been compiled).
 */
export const MATCHING_WEIGHTS = {
  interests: 20,
  hobbies: 6,
  sessionLength: 8,
  splitSession: 4,
  distance: 9,
  vibe: 8,
  culture: 9,
  competitiveness: 9,
  structure: 7,
  sizeSocial: 7,
  religious: 9,
  firstTime: 7,
  supports: 9,
  comforts: 10,
  health: 6,
  contact: 5,
  uniform: 3,
} as const;

const DISTANCE_CAPS: Record<QuizAnswers["maxDistance"], number> = {
  "1h": 70,
  "3h": 200,
  region: 450,
  anywhere: Infinity,
};

/** camp field backing each must-have comfort; undefined = not compiled yet */
const COMFORT_FIELDS: Record<Comfort, (c: Camp) => boolean | undefined> = {
  "ac-bunks": (c) => c.acInBunks,
  lake: (c) => c.lakeOnSite,
  laundry: (c) => c.laundryService,
  doctor: (c) => c.doctorOnSite,
  bus: (c) => c.busService,
  "trunk-pickup": (c) => c.trunkPickup,
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

/**
 * Camp culture on the down-to-earth ↔ upscale scale. Uses the compiled
 * `culture` field when we have it; otherwise estimates from amenity level
 * and price point (modern + expensive reads more upscale, agency-sponsored
 * and low-cost reads more down-to-earth).
 */
export function campCulture(camp: Camp): { value: number; estimated: boolean } {
  if (camp.culture !== undefined) return { value: camp.culture, estimated: false };
  let v = camp.vibe;
  if (camp.tuitionMax >= 12000) v += 1;
  if (camp.tuitionMax <= 4000) v -= 1;
  if (camp.ownership === "agency") v -= 1;
  return { value: Math.max(1, Math.min(5, v)), estimated: true };
}

/** Parse the free-text hobbies answer into matchable tokens. */
export function hobbyTokens(hobbies: string): string[] {
  return hobbies
    .split(/[,;/\n]|\band\b|\+/i)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 3);
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

  // Must-haves the camp is CONFIRMED not to offer are dealbreakers.
  // Unknown (not compiled yet) survives with a caution instead.
  for (const need of q.mustHaves) {
    if (COMFORT_FIELDS[need](camp) === false) return false;
  }

  return true;
}

export function scoreCamp(camp: Camp, q: QuizAnswers): MatchResult | null {
  if (!passesHardFilters(camp, q)) return null;

  const distance = distanceFromHome(q.homeState, camp);
  const distanceCap = DISTANCE_CAPS[q.maxDistance];
  // Distance is a soft-ish filter: 25% over the cap survives with penalty,
  // beyond that the camp is dropped.
  if (distance !== null && distance > distanceCap * 1.25) return null;

  const dims: Dimension[] = [];

  // ── Interests (heaviest) ───────────────────────────────────────────
  const shared = q.interests.filter((i) => camp.interests.includes(i));
  const interestFit =
    q.interests.length === 0 ? 0.7 : clamp01(shared.length / Math.min(q.interests.length, 4));
  dims.push({
    weight: MATCHING_WEIGHTS.interests,
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

  // ── Specific hobbies vs. the camp's actual activity list ──────────
  // Only scored when the camp's specific activities have been compiled;
  // a camp with no compiled list is neither rewarded nor punished.
  const tokens = hobbyTokens(q.hobbies);
  if (tokens.length > 0 && camp.activities && camp.activities.length > 0) {
    const acts = camp.activities.map((a) => a.toLowerCase());
    const hits = tokens.filter((t) => acts.some((a) => a.includes(t) || t.includes(a)));
    dims.push({
      weight: MATCHING_WEIGHTS.hobbies,
      fit: clamp01(hits.length / tokens.length),
      reason:
        hits.length > 0
          ? {
              label: "Has their exact thing",
              detail: `Offers ${hits.slice(0, 3).join(", ")} — straight off your hobby list.`,
              strength: hits.length >= 2 ? "great" : "good",
            }
          : undefined,
      caution:
        hits.length === 0
          ? `We didn't find ${tokens.slice(0, 2).join(" or ")} on its activity list — ask the director.`
          : undefined,
    });
  }

  // ── Session length ─────────────────────────────────────────────────
  if (q.campType !== "day" && q.sessionWeeks && q.sessionWeeks !== "flexible") {
    const want = Number(q.sessionWeeks);
    const closest = Math.min(...camp.sessionWeeks.map((w) => Math.abs(w - want)));
    const fit = clamp01(1 - closest / 4);
    dims.push({
      weight: MATCHING_WEIGHTS.sessionLength,
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

  // ── Split-summer option (e.g. 3+3) ─────────────────────────────────
  if (q.wantsSplitOption && q.campType !== "day" && camp.sessionModel) {
    const fit =
      camp.sessionModel === "flexible" ? 1 : camp.sessionModel === "sessions" ? 0.75 : 0.2;
    dims.push({
      weight: MATCHING_WEIGHTS.splitSession,
      fit,
      reason:
        camp.sessionModel === "flexible"
          ? {
              label: "Split-summer friendly",
              detail: "Offers partial-summer splits (like 3+3) — no need to commit to the whole summer.",
              strength: "great",
            }
          : undefined,
      caution:
        camp.sessionModel === "full-summer"
          ? "Full-summer camp — campers are expected to stay the whole time."
          : undefined,
    });
  }

  // ── Distance ───────────────────────────────────────────────────────
  if (distance !== null) {
    const fit = distance <= distanceCap ? clamp01(1 - distance / (distanceCap * 1.5)) : 0.15;
    dims.push({
      weight: MATCHING_WEIGHTS.distance,
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

  // ── Vibe: rustic ↔ modern ──────────────────────────────────────────
  {
    const fit = scaleFit(camp.vibe, q.vibe);
    dims.push({
      weight: MATCHING_WEIGHTS.vibe,
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

  // ── Culture: down-to-earth ↔ upscale ───────────────────────────────
  {
    const cc = campCulture(camp);
    const fit = scaleFit(cc.value, q.culture);
    dims.push({
      weight: MATCHING_WEIGHTS.culture,
      fit,
      reason:
        fit >= 0.75
          ? {
              label:
                cc.value >= 4
                  ? "Polished crowd"
                  : cc.value <= 2
                    ? "Down-to-earth crowd"
                    : "Easygoing mix",
              detail:
                (cc.value >= 4
                  ? "An amenity-rich, see-and-be-seen community — what you asked for."
                  : cc.value <= 2
                    ? "Unpretentious families and a keep-it-simple culture."
                    : "Neither flashy nor rustic — a broad, easygoing mix of families.") +
                (cc.estimated ? " (estimated from price & amenities)" : ""),
              strength: fit >= 0.9 && !cc.estimated ? "great" : "good",
            }
          : undefined,
      caution:
        cc.value - q.culture >= 3
          ? "Noticeably more upscale/flashy than the community you described."
          : q.culture - cc.value >= 3
            ? "More bare-bones than the community you described."
            : undefined,
    });
  }

  // ── Competitiveness (blended with the child's activity level) ─────
  {
    // A kid in motion all day fits a higher-octane program even if the
    // family didn't max the competitiveness slider, and vice versa.
    const target = (2 * q.competitiveness + q.activityLevel) / 3;
    const fit = scaleFit(camp.competitiveness, target);
    dims.push({
      weight: MATCHING_WEIGHTS.competitiveness,
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
        camp.competitiveness - target >= 2.5
          ? "Noticeably more competitive than what you described."
          : undefined,
    });
  }

  // ── Structure: scheduled ↔ elective ────────────────────────────────
  {
    const fit = scaleFit(camp.structure, q.structure);
    dims.push({
      weight: MATCHING_WEIGHTS.structure,
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
      weight: MATCHING_WEIGHTS.sizeSocial,
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
      weight: MATCHING_WEIGHTS.religious,
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

  // ── Must-have comforts & logistics ─────────────────────────────────
  // Confirmed "no" is already a hard filter; here confirmed "yes" scores 1
  // and not-yet-compiled scores neutral with an honest caution.
  if (q.mustHaves.length > 0) {
    const confirmed = q.mustHaves.filter((m) => COMFORT_FIELDS[m](camp) === true);
    const unknown = q.mustHaves.filter((m) => COMFORT_FIELDS[m](camp) === undefined);
    const fit = (confirmed.length + unknown.length * 0.6) / q.mustHaves.length;
    dims.push({
      weight: MATCHING_WEIGHTS.comforts,
      fit,
      reason:
        confirmed.length > 0
          ? {
              label: "Has your must-haves",
              detail: `Confirmed: ${confirmed.map((m) => COMFORT_LABELS[m].toLowerCase()).join(", ")}.`,
              strength: confirmed.length === q.mustHaves.length ? "great" : "good",
            }
          : undefined,
      caution:
        unknown.length > 0
          ? `Not compiled yet for this camp: ${unknown
              .map((m) => COMFORT_LABELS[m].toLowerCase())
              .join(", ")} — confirm on your rookie day.`
          : undefined,
    });
  }

  // ── Health & medications ───────────────────────────────────────────
  if (q.medications === "daily") {
    const fit = camp.doctorOnSite === true ? 1 : camp.doctorOnSite === false ? 0.45 : 0.6;
    dims.push({
      weight: MATCHING_WEIGHTS.health,
      fit,
      reason:
        camp.doctorOnSite === true
          ? {
              label: "Doctor on site",
              detail: "A physician on site plus the health center for daily medication routines.",
              strength: "great",
            }
          : undefined,
      caution:
        camp.doctorOnSite !== true
          ? "Confirm how the health center stores and administers daily medications."
          : undefined,
    });
  }

  // ── Staying in touch (phone calls & visiting day) ──────────────────
  {
    const checks: number[] = [];
    let phoneReason: string | undefined;
    let caution: string | undefined;
    if (q.phoneCallPref !== "letters-fine" && camp.phoneCallsPerSession !== undefined) {
      const want = q.phoneCallPref === "frequent" ? 3 : 1;
      checks.push(clamp01(camp.phoneCallsPerSession / want));
      if (camp.phoneCallsPerSession >= want)
        phoneReason = `${camp.phoneCallsPerSession} scheduled call${camp.phoneCallsPerSession === 1 ? "" : "s"} per session`;
      else if (q.phoneCallPref === "frequent")
        caution = `Only ${camp.phoneCallsPerSession} scheduled call${camp.phoneCallsPerSession === 1 ? "" : "s"} per session — fewer than you'd like.`;
    }
    if (q.visitingDayPref === "must" && camp.visitingDaysPerSession !== undefined) {
      checks.push(camp.visitingDaysPerSession >= 1 ? 1 : 0);
      if (camp.visitingDaysPerSession === 0)
        caution = "No visiting day — a dealbreaker for many first-time families.";
    }
    if (checks.length > 0) {
      const fit = checks.reduce((s, c) => s + c, 0) / checks.length;
      dims.push({
        weight: MATCHING_WEIGHTS.contact,
        fit,
        reason:
          fit >= 0.95
            ? {
                label: "Easy to stay in touch",
                detail: phoneReason
                  ? `${phoneReason}, and visiting day works the way you want.`
                  : "Phone and visiting-day policy line up with what you want.",
                strength: "good",
              }
            : undefined,
        caution,
      });
    }
  }

  // ── Uniforms ───────────────────────────────────────────────────────
  if (q.uniformPref !== "any" && camp.uniformRequired !== undefined) {
    const wantsUniform = q.uniformPref === "uniform-fine";
    const fit = camp.uniformRequired === wantsUniform ? 1 : wantsUniform ? 0.6 : 0.35;
    dims.push({
      weight: MATCHING_WEIGHTS.uniform,
      fit,
      reason:
        fit === 1
          ? {
              label: camp.uniformRequired ? "Uniform camp" : "No uniform",
              detail: camp.uniformRequired
                ? "Everyone wears the same thing — simpler mornings, less clothing competition."
                : "No uniform to buy — pack what they already own.",
              strength: "good",
            }
          : undefined,
      caution:
        camp.uniformRequired && !wantsUniform
          ? "Uniform required — families buy it on top of tuition."
          : undefined,
    });
  }

  // ── First-time camper ──────────────────────────────────────────────
  if (q.firstTime && q.campType !== "day") {
    const shortOption = Math.min(...camp.sessionWeeks) <= 4;
    const rookie = camp.rookieDay?.offered === true;
    let fit = camp.firstTimeFriendly ? (shortOption ? 1 : 0.8) : shortOption ? 0.6 : 0.35;
    if (rookie) fit = clamp01(fit + 0.1);
    dims.push({
      weight: MATCHING_WEIGHTS.firstTime,
      fit,
      reason:
        camp.firstTimeFriendly
          ? {
              label: "Great for first-timers",
              detail:
                (shortOption
                  ? "Known for onboarding new campers, with shorter starter sessions."
                  : "A culture that's known for welcoming brand-new campers.") +
                (rookie ? " Hosts a rookie day so your kid can try it first." : ""),
              strength: shortOption ? "great" : "good",
            }
          : rookie
            ? {
                label: "Hosts a rookie day",
                detail: "Prospective campers can spend a day on site before you commit.",
                strength: "good",
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
      weight: MATCHING_WEIGHTS.supports,
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

  // Very picky eaters: purely advisory — no camp is scored down for it,
  // but the family should raise it everywhere they apply.
  const pickyCaution =
    q.eatingHabits === "very-picky"
      ? "Very picky eater — ask to see a sample weekly menu and the alternatives policy."
      : undefined;

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

  const cautions = [
    ...dims.map((d) => d.caution).filter((c): c is string => Boolean(c)),
    ...(pickyCaution ? [pickyCaution] : []),
  ].slice(0, 3);

  return { camp, score, reasons, cautions, distanceMiles: distance };
}

export function matchCamps(camps: Camp[], q: QuizAnswers): MatchResult[] {
  return camps
    .map((c) => scoreCamp(c, q))
    .filter((r): r is MatchResult => r !== null)
    .sort((a, b) => b.score - a.score);
}
