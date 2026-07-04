/** Approximate population-weighted centroids per state, for distance scoring. */
export const STATE_CENTROIDS: Record<string, { lat: number; lng: number; name: string }> = {
  AL: { lat: 32.8, lng: -86.8, name: "Alabama" },
  AK: { lat: 61.2, lng: -149.5, name: "Alaska" },
  AZ: { lat: 33.4, lng: -112.1, name: "Arizona" },
  AR: { lat: 34.9, lng: -92.4, name: "Arkansas" },
  CA: { lat: 35.5, lng: -119.4, name: "California" },
  CO: { lat: 39.6, lng: -105.0, name: "Colorado" },
  CT: { lat: 41.6, lng: -72.7, name: "Connecticut" },
  DE: { lat: 39.5, lng: -75.6, name: "Delaware" },
  DC: { lat: 38.9, lng: -77.0, name: "Washington DC" },
  FL: { lat: 27.8, lng: -81.6, name: "Florida" },
  GA: { lat: 33.4, lng: -83.9, name: "Georgia" },
  HI: { lat: 21.3, lng: -157.9, name: "Hawaii" },
  ID: { lat: 43.6, lng: -116.2, name: "Idaho" },
  IL: { lat: 41.6, lng: -88.1, name: "Illinois" },
  IN: { lat: 39.9, lng: -86.2, name: "Indiana" },
  IA: { lat: 41.9, lng: -93.4, name: "Iowa" },
  KS: { lat: 38.8, lng: -96.0, name: "Kansas" },
  KY: { lat: 37.8, lng: -85.2, name: "Kentucky" },
  LA: { lat: 30.5, lng: -91.0, name: "Louisiana" },
  ME: { lat: 44.0, lng: -70.0, name: "Maine" },
  MD: { lat: 39.2, lng: -76.8, name: "Maryland" },
  MA: { lat: 42.3, lng: -71.4, name: "Massachusetts" },
  MI: { lat: 42.7, lng: -83.6, name: "Michigan" },
  MN: { lat: 45.0, lng: -93.4, name: "Minnesota" },
  MS: { lat: 32.6, lng: -89.9, name: "Mississippi" },
  MO: { lat: 38.6, lng: -91.4, name: "Missouri" },
  MT: { lat: 46.6, lng: -112.0, name: "Montana" },
  NE: { lat: 41.2, lng: -97.0, name: "Nebraska" },
  NV: { lat: 36.6, lng: -115.4, name: "Nevada" },
  NH: { lat: 43.1, lng: -71.5, name: "New Hampshire" },
  NJ: { lat: 40.7, lng: -74.3, name: "New Jersey" },
  NM: { lat: 34.9, lng: -106.3, name: "New Mexico" },
  NY: { lat: 41.1, lng: -74.5, name: "New York" },
  NC: { lat: 35.5, lng: -79.8, name: "North Carolina" },
  ND: { lat: 47.2, lng: -99.6, name: "North Dakota" },
  OH: { lat: 40.2, lng: -82.7, name: "Ohio" },
  OK: { lat: 35.6, lng: -97.0, name: "Oklahoma" },
  OR: { lat: 44.7, lng: -122.6, name: "Oregon" },
  PA: { lat: 40.4, lng: -76.8, name: "Pennsylvania" },
  RI: { lat: 41.7, lng: -71.5, name: "Rhode Island" },
  SC: { lat: 34.0, lng: -80.9, name: "South Carolina" },
  SD: { lat: 44.2, lng: -99.3, name: "South Dakota" },
  TN: { lat: 35.8, lng: -86.4, name: "Tennessee" },
  TX: { lat: 31.0, lng: -97.6, name: "Texas" },
  UT: { lat: 40.4, lng: -111.7, name: "Utah" },
  VT: { lat: 44.1, lng: -72.7, name: "Vermont" },
  VA: { lat: 37.9, lng: -77.8, name: "Virginia" },
  WA: { lat: 47.4, lng: -121.5, name: "Washington" },
  WV: { lat: 38.8, lng: -80.7, name: "West Virginia" },
  WI: { lat: 44.2, lng: -89.6, name: "Wisconsin" },
  WY: { lat: 43.0, lng: -107.6, name: "Wyoming" },
};

const EARTH_RADIUS_MI = 3958.8;

export function milesBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

export function distanceFromHome(
  homeState: string,
  camp: { lat: number; lng: number },
): number | null {
  const home = STATE_CENTROIDS[homeState];
  if (!home) return null;
  return Math.round(milesBetween(home, camp));
}
