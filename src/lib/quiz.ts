import type {
  Comfort,
  EatingHabits,
  Interest,
  MedicationNeeds,
  QuizAnswers,
  SupportNeed,
} from "./types";

export const INTEREST_LABELS: Record<Interest, string> = {
  "team-sports": "Team sports",
  "individual-sports": "Tennis, golf & individual sports",
  waterfront: "Swimming, boating & waterski",
  "arts-theater": "Theater & visual arts",
  music: "Music",
  stem: "STEM, coding & robotics",
  "outdoor-adventure": "Hiking, climbing & adventure",
  horseback: "Horseback riding",
  "gymnastics-dance": "Gymnastics, dance & cheer",
  "nature-animals": "Nature & animals",
  "action-sports": "Skate, bike & action sports",
};

export const SUPPORT_LABELS: Record<SupportNeed, string> = {
  "food-allergies": "Serious food allergies",
  "adhd-learning": "ADHD or learning differences",
  "anxiety-support": "Anxiety / homesickness support",
  "inclusion-program": "Inclusion / special-needs program",
};

export const INTEREST_EMOJI: Record<Interest, string> = {
  "team-sports": "🏀",
  "individual-sports": "🎾",
  waterfront: "🌊",
  "arts-theater": "🎭",
  music: "🎸",
  stem: "🤖",
  "outdoor-adventure": "⛰️",
  horseback: "🐴",
  "gymnastics-dance": "🤸",
  "nature-animals": "🦉",
  "action-sports": "🛹",
};

/** Human labels for camp attributes, reused across cards and detail pages. */
export const RELIGIOUS_LABELS: Record<string, string> = {
  none: "No religious affiliation",
  "jewish-cultural": "Jewish (cultural)",
  "jewish-observant": "Jewish (kosher / Shabbat observant)",
  christian: "Christian",
};

export const GENDER_LABELS: Record<string, string> = {
  coed: "Co-ed",
  boys: "Boys",
  girls: "Girls",
  "brother-sister": "Brother / sister",
};

export const DISTANCE_LABELS: Record<string, string> = {
  "1h": "Within about an hour",
  "3h": "Up to 2–3 hours",
  region: "Anywhere in our region",
  anywhere: "Anywhere in the USA",
};

export const COMFORT_LABELS: Record<Comfort, string> = {
  "ac-bunks": "Air-conditioned bunks",
  lake: "Lake on site",
  laundry: "Laundry service",
  doctor: "Doctor on site",
  bus: "Bus to camp",
  "trunk-pickup": "Trunk / baggage pickup",
};

export const COMFORT_EMOJI: Record<Comfort, string> = {
  "ac-bunks": "❄️",
  lake: "🛶",
  laundry: "🧺",
  doctor: "🩺",
  bus: "🚌",
  "trunk-pickup": "🧳",
};

export const EATING_LABELS: Record<EatingHabits, string> = {
  adventurous: "Eats anything",
  typical: "Typical kid menu",
  picky: "Picky eater",
  "very-picky": "Very picky / limited menu",
};

export const MEDICATION_LABELS: Record<MedicationNeeds, string> = {
  none: "No medications",
  occasional: "Occasional / as-needed",
  daily: "Daily medications",
};

export const PHONE_PREF_LABELS: Record<QuizAnswers["phoneCallPref"], string> = {
  frequent: "Regular calls home",
  occasional: "A call or two per session",
  "letters-fine": "Letters & photos are fine",
};

export const VISITING_PREF_LABELS: Record<QuizAnswers["visitingDayPref"], string> = {
  must: "Visiting day is a must",
  nice: "Nice to have",
  any: "No preference",
};

export const UNIFORM_PREF_LABELS: Record<QuizAnswers["uniformPref"], string> = {
  "no-uniform": "Prefer no uniform",
  "uniform-fine": "Uniforms are a plus",
  any: "No preference",
};

export const OWNERSHIP_LABELS: Record<string, string> = {
  family: "Privately owned",
  nonprofit: "Independent nonprofit",
  agency: "Agency-sponsored (federation / Y / scouts)",
};

export const SESSION_MODEL_LABELS: Record<string, string> = {
  "full-summer": "Full-summer camp (everyone stays all summer)",
  sessions: "Session camp (enroll by session)",
  flexible: "Flexible splits (e.g. 3+3 — come for part of summer)",
};

/** Canonical starting answers, shared by the quiz, admin sandbox and
 *  normalization of previously saved answers. */
export const DEFAULT_ANSWERS: QuizAnswers = {
  childAge: 10,
  childGender: "any",
  campType: "both",
  sessionWeeks: "flexible",
  wantsSplitOption: false,
  homeState: "NJ",
  maxDistance: "3h",
  interests: [],
  hobbies: "",
  activityLevel: 3,
  eatingHabits: "typical",
  medications: "none",
  socialStyle: "jumps-in",
  vibe: 3,
  competitiveness: 3,
  structure: 3,
  culture: 3,
  genderPref: "any",
  religious: "any",
  sizePref: "any",
  uniformPref: "any",
  mustHaves: [],
  phoneCallPref: "occasional",
  visitingDayPref: "nice",
  firstTime: false,
  supports: [],
};

/** Merge stored/partial answers (possibly from an older quiz version, e.g.
 *  ones that still had a budget question) into the current shape. */
export function normalizeAnswers(raw: unknown): QuizAnswers {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ANSWERS };
  const merged = { ...DEFAULT_ANSWERS, ...(raw as Partial<QuizAnswers>) };
  return merged;
}
