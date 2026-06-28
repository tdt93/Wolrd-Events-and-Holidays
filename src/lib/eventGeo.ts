import type { MapEvent } from "../types/event";

const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

export function humanizeRegion(region: string, countryCode: string): string {
  const cc = countryCode.toUpperCase();
  const trimmed = region.trim();
  const usMatch = trimmed.match(/^US-([A-Z]{2})$/i);
  if (cc === "US" && usMatch) {
    return US_STATE_NAMES[usMatch[1].toUpperCase()] ?? trimmed;
  }
  if (cc === "US" && /^[A-Z]{2}$/i.test(trimmed)) {
    return US_STATE_NAMES[trimmed.toUpperCase()] ?? trimmed;
  }

  const isoMatch = trimmed.match(/^[A-Z]{2}-(.+)$/i);
  if (isoMatch) {
    return isoMatch[1].replace(/_/g, " ");
  }

  return trimmed;
}

export function buildGeocodeQuery(
  event: MapEvent,
  countryCode: string,
  countryName?: string,
): string | null {
  const country = countryName ?? countryCode;
  if (event.venue && event.city) {
    return `${event.venue}, ${event.city}, ${country}`;
  }
  if (event.city) {
    return `${event.city}, ${country}`;
  }
  if (event.region) {
    return `${humanizeRegion(event.region, countryCode)}, ${country}`;
  }
  return null;
}

export function hasValidCoords(event: MapEvent): boolean {
  if (event.lat == null || event.lng == null) return false;
  if (!Number.isFinite(event.lat) || !Number.isFinite(event.lng)) return false;
  if (Math.abs(event.lat) < 0.01 && Math.abs(event.lng) < 0.01) return false;
  return true;
}

const TRUSTED_COORD_SOURCES = new Set([
  "ticketmaster",
  "seatgeek",
  "eventbrite",
  "api-football",
]);

export function hasTrustedCoords(event: MapEvent): boolean {
  return hasValidCoords(event) && TRUSTED_COORD_SOURCES.has(event.source);
}

export function spreadCoords(
  [lng, lat]: [number, number],
  index: number,
  tight = false,
): [number, number] {
  if (tight) {
    const d = 0.012;
    return [lng + (index % 5) * d - d * 2, lat + Math.floor(index / 5) * d * 0.8 - d];
  }
  const d = 0.07;
  return [lng + (index % 7) * d - d * 3, lat + Math.floor(index / 7) * d * 0.75 - d * 2];
}
