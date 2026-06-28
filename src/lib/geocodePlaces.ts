import type { MapEvent } from "../types/event";
import {
  buildGeocodeQuery,
  hasTrustedCoords,
  hasValidCoords,
  humanizeRegion,
  spreadCoords,
} from "./eventGeo";

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

export { humanizeRegion };

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

const GEOCODE_QUERY_LIMIT = 24;

async function geocodeQueries(
  events: MapEvent[],
  countryCode: string,
  countryName: string | undefined,
): Promise<Map<string, [number, number]>> {
  const out = new Map<string, [number, number]>();
  const queries = new Set<string>();

  for (const event of events) {
    const q = buildGeocodeQuery(event, countryCode, countryName);
    if (q) queries.add(q);
  }

  let n = 0;
  for (const q of queries) {
    if (n >= GEOCODE_QUERY_LIMIT) break;
    const coords = await nominatimSearch(q, countryCode);
    if (coords) out.set(q, coords);
    n += 1;
    if (n % 3 === 0) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return out;
}

export async function placeEventsOnMap(
  events: MapEvent[],
  countryCode: string,
  countryName: string | undefined,
  fallback: [number, number],
): Promise<MapEvent[]> {
  const needsGeocode = events.filter((e) => !hasValidCoords(e));
  const queryCoords = await geocodeQueries(needsGeocode, countryCode, countryName);
  const fallbackBase = CAPITALS[countryCode] ?? fallback;
  let fallbackIdx = 0;

  return events.map((event, index) => {
    if (hasTrustedCoords(event)) {
      return { ...event, lng: event.lng!, lat: event.lat! };
    }

    if (hasValidCoords(event)) {
      const [lng, lat] = spreadCoords([event.lng!, event.lat!], index, true);
      return { ...event, lng, lat };
    }

    const query = buildGeocodeQuery(event, countryCode, countryName);
    const base =
      (query && queryCoords.get(query)) ??
      (event.category === "holiday" && event.isGlobal !== false
        ? fallbackBase
        : null);

    if (base) {
      const [lng, lat] = spreadCoords(base, index, Boolean(query && queryCoords.get(query)));
      return { ...event, lng, lat };
    }

    const [lng, lat] = spreadCoords(fallbackBase, fallbackIdx);
    fallbackIdx += 1;
    return { ...event, lng, lat };
  });
}

export async function resolveEventCoords(
  countryCode: string,
  countryName: string | undefined,
  region: string | undefined,
  city: string | undefined,
  venue: string | undefined,
  fallback: [number, number],
  index: number,
): Promise<[number, number]> {
  const stub: MapEvent = {
    id: "stub",
    source: "nager",
    title: "",
    startDate: "",
    category: "other",
    countryCode,
    city,
    region,
    venue,
  };
  const q = buildGeocodeQuery(stub, countryCode, countryName);
  if (q) {
    const coords = await nominatimSearch(q, countryCode);
    if (coords) return spreadCoords(coords, index, true);
  }

  const capital = CAPITALS[countryCode];
  if (capital) return spreadCoords(capital, index);

  return spreadCoords(fallback, index);
}
