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
      countrycodes: countryCode.toLowerCase(),
      format: "json",
      limit: "1",
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { "Accept-Language": "en", "User-Agent": "SunnyAtlas/1.0" } },
    );
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
    const coords = await nominatimSearch(
      `${region}, ${countryName ?? countryCode}`,
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
