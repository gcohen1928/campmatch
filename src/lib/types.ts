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
  website: string;
  /** whether a camp operator has claimed this listing */
  claimed: boolean;
  /** data reviewed by the camp itself; unverified = compiled estimates */
  verified: boolean;
}

export interface QuizAnswers {
  childAge: number;
  childGender: "boy" | "girl" | "any";
  campType: CampType | "both";
  sessionWeeks?: "2" | "4" | "7" | "flexible";
  homeState: string;
  maxDistance: "1h" | "3h" | "region" | "anywhere";
  budget: "under3" | "3to7" | "7to12" | "12plus" | "any";
  interests: Interest[];
  socialStyle: "jumps-in" | "warms-up" | "small-groups" | "big-energy";
  vibe: number; // 1-5
  competitiveness: number; // 1-5
  structure: number; // 1-5
  genderPref: "coed" | "single" | "any";
  religious: Religious | "any";
  sizePref: "intimate" | "medium" | "large" | "any";
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
