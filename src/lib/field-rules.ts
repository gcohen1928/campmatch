import type { Camp, CampType } from "./types";

/**
 * Which camp fields apply to which camp type. A field that doesn't apply
 * (bunk size at a day camp, lunch at a sleepaway camp) is "not applicable",
 * never "missing", in coverage reports and in the UI.
 */
const SLEEPAWAY_ONLY = new Set<keyof Camp>([
  "acInBunks",
  "bunkSize",
  "laundryService",
  "doctorOnSite",
  "visitingDaysPerSession",
  "phoneCallsPerSession",
  "trunkPickup",
  "trunkPickupAreas",
]);

const DAY_ONLY = new Set<keyof Camp>(["extendedCare", "lunchIncluded"]);

export function fieldApplies(type: CampType, field: keyof Camp): boolean {
  if (type === "day") return !SLEEPAWAY_ONLY.has(field);
  return !DAY_ONLY.has(field);
}

/** Fields a researcher should try to fill, per camp type. */
export const RESEARCH_FIELDS: (keyof Camp)[] = [
  "website",
  "address",
  "city",
  "state",
  "type",
  "ageMin",
  "ageMax",
  "gender",
  "sessionWeeks",
  "sessionModel",
  "tuitionMin",
  "tuitionMax",
  "size",
  "founded",
  "religious",
  "ownership",
  "acaAccredited",
  "activities",
  "supports",
  "firstTimeFriendly",
  "lakeOnSite",
  "acInBunks",
  "bunkSize",
  "laundryService",
  "uniformRequired",
  "doctorOnSite",
  "visitingDaysPerSession",
  "phoneCallsPerSession",
  "tripsPerSession",
  "traditions",
  "lastRenovated",
  "busService",
  "busCities",
  "trunkPickup",
  "trunkPickupAreas",
  "rookieDay",
  "extendedCare",
  "lunchIncluded",
];

export function researchFieldsFor(type: CampType): (keyof Camp)[] {
  return RESEARCH_FIELDS.filter((f) => fieldApplies(type, f));
}
