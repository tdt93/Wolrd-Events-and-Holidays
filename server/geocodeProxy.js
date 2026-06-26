const NOMINATIM_HEADERS = {
  "User-Agent": "SunnyAtlas/1.0 (hobby travel map)",
  "Accept-Language": "en",
};

export async function searchGeocode(q, countryCode) {
  if (!q) return [];

  const params = new URLSearchParams({
    q,
    countrycodes: countryCode.toLowerCase(),
    format: "json",
    limit: "1",
  });

  const geoRes = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: NOMINATIM_HEADERS },
  );
  if (!geoRes.ok) return [];
  return geoRes.json();
}

export async function reverseGeocode(lat, lon) {
  if (!lat || !lon) {
    throw new Error("missing_coords");
  }

  const params = new URLSearchParams({
    lat,
    lon,
    format: "json",
  });

  const geoRes = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params}`,
    { headers: NOMINATIM_HEADERS },
  );
  if (!geoRes.ok) {
    throw new Error("upstream_failed");
  }
  return geoRes.json();
}
