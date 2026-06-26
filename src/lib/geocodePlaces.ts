import type { MapEvent } from "../types/event";

const geoCache = new Map<string, [number, number]>();

const CAPITALS: Record<string, [number, number]> = {
  US: [-77.0369, 38.9072],
  GB: [-0.1276, 51.5074],
  FR: [2.3522, 48.8566],
  DE: [13.405, 52.52],
  JP: [139.6917, 35.6895],
  AU: [149.13, -35.2809],
  BR: [-47.9292, -15.7801],
  IN: [77.209, 28.6139],
  CN: [116.4074, 39.9042],
  PL: [21.0122, 52.2297],
  VN: [105.8342, 21.0278],
  CA: [-75.6972, 45.4215],
  MX: [-99.1332, 19.4326],
  IT: [12.4964, 41.9028],
  ES: [-3.7038, 40.4168],
  KR: [126.978, 37.5665],
  TH: [100.5018, 13.7563],
  PH: [120.9842, 14.5995],
  ID: [106.8456, -6.2088],
  NL: [4.9041, 52.3676],
  SE: [18.0686, 59.3293],
  NO: [10.7522, 59.9139],
  DK: [12.5683, 55.6761],
  FI: [24.9384, 60.1699],
  IE: [-6.2603, 53.3498],
  PT: [-9.1393, 38.7223],
  AT: [16.3738, 48.2082],
  CH: [7.4474, 46.948],
  BE: [4.3517, 50.8503],
  NZ: [174.7633, -41.2865],
  ZA: [28.0473, -26.2041],
  AR: [-58.3816, -34.6037],
  CL: [-70.6693, -33.4489],
  CO: [-74.0721, 4.711],
  EG: [31.2357, 30.0444],
  TR: [32.8597, 39.9334],
  SA: [46.6753, 24.7136],
  AE: [54.3773, 24.4539],
  SG: [103.8198, 1.3521],
  MY: [101.6869, 3.139],
};

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

function humanizeRegion(region: string, countryCode: string): string {
  const cc = countryCode.toUpperCase();
  const usMatch = region.match(/^US-([A-Z]{2})$/i);
  if (cc === "US" && usMatch) {
    return US_STATE_NAMES[usMatch[1].toUpperCase()] ?? region;
  }

  const isoMatch = region.match(/^[A-Z]{2}-(.+)$/i);
  if (isoMatch) {
    return isoMatch[1].replace(/_/g, " ");
  }

  return region;
}

const BULK_GEOCODE_THRESHOLD = 25;
const NOMINATIM_TIMEOUT_MS = 5000;

async function nominatimSearch(
  query: string,
  countryCode: string,
): Promise<[number, number] | null> {
  const key = `${countryCode}:${query.toLowerCase()}`;
  const cached = geoCache.get(key);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      q: query,
      countryCode: countryCode.toLowerCase(),
    });
    const res = await fetch(`/api/geocode/search?${params}`, {
      signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data[0]) return null;
    const coords: [number, number] = [
      parseFloat(data[0].lon),
      parseFloat(data[0].lat),
    ];
    geoCache.set(key, coords);
    return coords;
  } catch {
    return null;
  }
}

function fastPlaceEvents(
  events: MapEvent[],
  countryCode: string,
  fallback: [number, number],
): MapEvent[] {
  const base = CAPITALS[countryCode] ?? fallback;
  const cityBases = new Map<string, [number, number]>();
  let cityIdx = 0;

  return events.map((e, i) => {
    if (e.lat != null && e.lng != null) return e;

    let coords: [number, number];
    if (e.city) {
      let cityBase = cityBases.get(e.city);
      if (!cityBase) {
        cityBase = jitter(base, cityIdx);
        cityBases.set(e.city, cityBase);
        cityIdx += 1;
      }
      coords = jitter(cityBase, i);
    } else {
      coords = jitter(base, i);
    }

    const [lng, lat] = coords;
    return { ...e, lng, lat };
  });
}

export async function placeEventsOnMap(
  events: MapEvent[],
  countryCode: string,
  countryName: string | undefined,
  fallback: [number, number],
): Promise<MapEvent[]> {
  if (events.length >= BULK_GEOCODE_THRESHOLD) {
    return fastPlaceEvents(events, countryCode, fallback);
  }

  const needsPlacement = events.filter(
    (e) => e.lat == null || e.lng == null,
  );
  const cityCache = new Map<string, [number, number]>();
  const uniqueCities = [
    ...new Set(
      needsPlacement.map((e) => e.city).filter((c): c is string => Boolean(c)),
    ),
  ];

  let throttle = 0;
  for (const city of uniqueCities) {
    const coords = await nominatimSearch(
      `${city}, ${countryName ?? countryCode}`,
      countryCode,
    );
    if (coords) cityCache.set(city, coords);
    throttle += 1;
    if (throttle % 3 === 0) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const placed: MapEvent[] = [];
  let i = 0;
  for (const e of events) {
    if (e.lat != null && e.lng != null) {
      placed.push(e);
      continue;
    }

    let base: [number, number] | null = null;
    if (e.city && cityCache.has(e.city)) {
      base = cityCache.get(e.city)!;
    } else if (e.region) {
      const regionLabel = humanizeRegion(e.region, countryCode);
      base = await nominatimSearch(
        `${regionLabel}, ${countryName ?? countryCode}`,
        countryCode,
      );
    }

    if (!base) {
      base = CAPITALS[countryCode] ?? fallback;
    }

    const [lng, lat] = jitter(base, i);
    placed.push({ ...e, lng, lat });
    i += 1;
  }
  return placed;
}

export async function resolveEventCoords(
  countryCode: string,
  countryName: string | undefined,
  region: string | undefined,
  city: string | undefined,
  fallback: [number, number],
  index: number,
): Promise<[number, number]> {
  if (city) {
    const q = `${city}, ${countryName ?? countryCode}`;
    const coords = await nominatimSearch(q, countryCode);
    if (coords) return jitter(coords, index);
  }

  if (region) {
    const regionLabel = humanizeRegion(region, countryCode);
    const coords = await nominatimSearch(
      `${regionLabel}, ${countryName ?? countryCode}`,
      countryCode,
    );
    if (coords) return jitter(coords, index);
  }

  const capital = CAPITALS[countryCode];
  if (capital) return jitter(capital, index);

  return jitter(fallback, index);
}

function jitter([lng, lat]: [number, number], i: number): [number, number] {
  return [lng + (i % 7) * 0.08 - 0.24, lat + Math.floor(i / 7) * 0.06 - 0.18];
}
