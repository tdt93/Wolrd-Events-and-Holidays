const NOMINATIM_HEADERS = {
  "User-Agent": "SunnyAtlas/1.0 (hobby travel map)",
  "Accept-Language": "en",
};

export async function searchGeocode(q, countryCode, options = {}) {
  if (!q) return [];

  const limit = Math.min(10, Math.max(1, Number(options.limit) || 1));
  const params = new URLSearchParams({
    q,
    format: "json",
    limit: String(limit),
    addressdetails: "1",
  });

  if (countryCode) {
    params.set("countrycodes", countryCode.toLowerCase());
  }

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
    addressdetails: "1",
    zoom: "10",
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
