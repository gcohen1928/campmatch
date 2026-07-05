export type CampType = "sleepaway" | "day";

export type Gender = "coed" | "boys" | "girls" | "brother-sister";

export type Religious =
  | "none"
  | "jewish-cultural"
  | "jewish-observant"
  | "christian";

export type Interest =
  | "team-sports"
  | "individual-sports"
  | "waterfront"
  | "arts-theater"
  | "music"
  | "stem"
  | "outdoor-adventure"
  | "horseback"
  | "gymnastics-dance"
  | "nature-animals"
  | "action-sports";

export type SupportNeed =
  | "food-allergies"
  | "adhd-learning"
  | "anxiety-support"
  | "inclusion-program";

/** Ownership model — "agency" = federation / Y / scout-sponsored (often cheaper). */
export type Ownership = "family" | "nonprofit" | "agency";

/**
 * "full-summer" = one long session, everyone stays the whole time.
 * "sessions"    = distinct enrollable sessions.
 * "flexible"    = split options (e.g. 3+3) — campers can come for part of summer.
 */
export type SessionModel = "full-summer" | "sessions" | "flexible";

/** Comforts / logistics a family can mark as must-haves in the questionnaire. */
export type Comfort =
  | "ac-bunks"
  | "lake"
  | "laundry"
  | "doctor"
  | "bus"
  | "trunk-pickup";

export interface RookieDay {
  offered: boolean;
  /** e.g. "Rookie Day each July; fall open houses" or scraped 2026 dates */
  details?: string;
  /** page on the camp's site describing rookie / visit days */
  url?: string;
}

export interface CampReview {
  /** persona, e.g. "Parent of a returning camper" — never a real name */
  author: string;
  role: "parent" | "camper" | "alum" | "counselor";
  rating: number; // 1–5
  text: string;
  /** "compiled" = community snapshot distilled from public web sentiment;
   *  "campmatch" = submitted through Camp Matching (future) */
  source: "compiled" | "campmatch";
  year?: number;
}

export interface Camp {
  slug: string;
  name: string;
  type: CampType;
  city: string;
  state: string; // two-letter code
  region: "northeast" | "mid-atlantic" | "south" | "midwest" | "west";
  lat: number;
  lng: number;
  ageMin: number;
  ageMax: number;
  gender: Gender;
  /** session lengths offered, in weeks */
  sessionWeeks: number[];
  /** approx tuition range in USD for a typical session/summer */
  tuitionMin: number;
  tuitionMax: number;
  /** approximate campers on site per session */
  size: number;
  founded?: number;
  interests: Interest[];
  /** 1 = rustic & traditional … 5 = modern amenities */
  vibe: number;
  /** 1 = laid-back … 5 = highly competitive */
  competitiveness: number;
  /** 1 = fully scheduled … 5 = fully elective/choice-based */
  structure: number;
  religious: Religious;
  supports: SupportNeed[];
  /** strong intro/first-year program or starter sessions */
  firstTimeFriendly: boolean;
  acaAccredited: boolean;
  description: string;
  /** empty string when the exact domain isn't known */
  website: string;
  /** real photo URLs when available; the app falls back to generated cover art */
  photos?: string[];
  /** average community rating (1–5, one decimal), unverified estimate */
  rating?: number;
  reviewCount?: number;
  /** whether a camp operator has claimed this listing */
  claimed: boolean;
  /** data reviewed by the camp itself; unverified = compiled estimates */
  verified: boolean;

  /* ── Life-at-camp details ─────────────────────────────────────────────
   * All optional: undefined means "not compiled yet" (the enrichment
   * pipeline in scripts/scraper fills these in camp by camp). The UI and
   * matching engine must treat missing values as unknown, never as "no". */

  /** 1 = down-to-earth & low-key … 5 = polished / upscale / scene-y */
  culture?: number;
  /** specific offerings, e.g. "waterski", "hockey rink", "go-karts", "climbing tower" */
  activities?: string[];
  lakeOnSite?: boolean;
  acInBunks?: boolean;
  /** campers per bunk/cabin */
  bunkSize?: number;
  /** camp does campers' laundry (weekly is the norm at overnight camps) */
  laundryService?: boolean;
  /** uniform required (families typically buy it) */
  uniformRequired?: boolean;
  /** physician on site (a 24/7 nurse is assumed standard at overnight camps) */
  doctorOnSite?: boolean;
  visitingDaysPerSession?: number;
  /** scheduled camper phone calls home per session */
  phoneCallsPerSession?: number;
  sessionModel?: SessionModel;
  /** out-of-camp trips per session */
  tripsPerSession?: number;
  /** signature traditions, e.g. "Color War", "College Days", "Sing" */
  traditions?: string[];
  ownership?: Ownership;
  /** most recent major facilities renovation year */
  lastRenovated?: number;
  /** runs buses to camp */
  busService?: boolean;
  /** metro areas the buses leave from */
  busCities?: string[];
  /** offers trunk/baggage pickup before camp starts */
  trunkPickup?: boolean;
  /** neighborhoods / regions covered by trunk pickup */
  trunkPickupAreas?: string[];
  rookieDay?: RookieDay;
}

export type EatingHabits = "adventurous" | "typical" | "picky" | "very-picky";

export type MedicationNeeds = "none" | "occasional" | "daily";

export interface QuizAnswers {
  childAge: number;
  childGender: "boy" | "girl" | "any";
  campType: CampType | "both";
  sessionWeeks?: "2" | "4" | "7" | "flexible";
  /** wants the option to attend part of the summer (e.g. a 3+3 split) */
  wantsSplitOption: boolean;
  homeState: string;
  maxDistance: "1h" | "3h" | "region" | "anywhere";
  interests: Interest[];
  /** free-text specific hobbies, e.g. "waterski, hockey, ceramics" */
  hobbies: string;
  /** 1 = mellow, happy reading … 5 = in motion from wake-up to lights-out */
  activityLevel: number;
  eatingHabits: EatingHabits;
  medications: MedicationNeeds;
  socialStyle: "jumps-in" | "warms-up" | "small-groups" | "big-energy";
  vibe: number; // 1-5
  competitiveness: number; // 1-5
  structure: number; // 1-5
  /** 1 = down-to-earth crowd … 5 = upscale / flashy crowd */
  culture: number;
  genderPref: "coed" | "single" | "any";
  religious: Religious | "any";
  sizePref: "intimate" | "medium" | "large" | "any";
  uniformPref: "no-uniform" | "uniform-fine" | "any";
  /** comforts & logistics that are non-negotiable */
  mustHaves: Comfort[];
  phoneCallPref: "frequent" | "occasional" | "letters-fine";
  visitingDayPref: "must" | "nice" | "any";
  firstTime: boolean;
  supports: SupportNeed[];
}

export interface MatchReason {
  label: string;
  detail: string;
  strength: "great" | "good";
}

export interface MatchResult {
  camp: Camp;
  /** 0–100 dating-app style match percentage */
  score: number;
  reasons: MatchReason[];
  cautions: string[];
  distanceMiles: number | null;
}

/** An application a family submits to a camp through Camp Matching. */
export interface CampApplication {
  campSlug: string;
  campName: string;
  parentName: string;
  email: string;
  phone: string;
  childName: string;
  childAge: number;
  /** desired session / start, free text (e.g. "First session 2027, 3+3 if possible") */
  sessionPreference: string;
  notes: string;
  /** quiz profile snapshot forwarded to the camp with the application */
  profile: QuizAnswers | null;
  submittedAt: string;
}
