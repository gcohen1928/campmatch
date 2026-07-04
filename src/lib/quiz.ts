import type { Interest, SupportNeed } from "./types";

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

export const BUDGET_LABELS: Record<string, string> = {
  under3: "Under $3,000",
  "3to7": "$3,000 – $7,000",
  "7to12": "$7,000 – $12,000",
  "12plus": "$12,000+",
  any: "Budget isn't a constraint",
};

export const DISTANCE_LABELS: Record<string, string> = {
  "1h": "Within about an hour",
  "3h": "Up to 2–3 hours",
  region: "Anywhere in our region",
  anywhere: "Anywhere in the USA",
};
