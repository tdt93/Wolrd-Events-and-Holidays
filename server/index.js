import express from "express";

const app = express();
const PORT = Number(process.env.API_PORT || 3000);
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NAGER_BASE = "https://date.nager.at/api/v3";

const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

async function fetchNager(path) {
  const res = await fetch(`${NAGER_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Nager API error: ${res.status}`);
  }
  return res.json();
}

const TICKETMASTER_SEGMENT_MAP = {
  music: "Music",
  festival: "Arts & Theatre",
  sports: "Sports",
  arts: "Arts & Theatre",
};

function mapTicketmasterEvent(event, countryCode) {
  const classifications = event.classifications ?? [];
  const c0 = classifications[0];
  const segment = c0?.segment?.name ?? "Other";
  const genre = (c0?.genre?.name ?? "").toLowerCase();
  const subGenre = (c0?.subGenre?.name ?? "").toLowerCase();
  const typeName = (c0?.type?.name ?? "").toLowerCase();

  let category = "other";
  if (segment === "Sports") category = "sports";
  else if (
    genre.includes("festival") ||
    subGenre.includes("festival") ||
    typeName.includes("festival")
  )
    category = "festival";
  else if (segment === "Music") category = "music";
  else if (segment === "Arts & Theatre") category = "arts";

  const dates = event.dates;
  const embedded = event._embedded;
  const venue = embedded?.venues?.[0];
  const city = venue?.city?.name;
  const venueName = venue?.name;
  const region = venue?.state?.name ?? venue?.state?.stateCode;
  const info = (event.info || event.pleaseNote || "").trim();

  return {
    id: `tm-${event.id}`,
    source: "ticketmaster",
    title: event.name,
    startDate: dates?.start?.localDate ?? "",
    category,
    countryCode,
    city,
    region,
    venue: venueName,
    info: info || undefined,
    description: info
      ? info.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : undefined,
    lat: venue?.location?.latitude
      ? parseFloat(venue.location.latitude)
      : undefined,
    lng: venue?.location?.longitude
      ? parseFloat(venue.location.longitude)
      : undefined,
    url: event.url ?? undefined,
  };
}

app.get("/health", (_req, res) => {
  res.type("text").send("ok\n");
});

app.get("/api/countries", async (_req, res) => {
  try {
    const cacheKey = "countries";
    const cached = getCached(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const data = await fetchNager("/AvailableCountries");
    setCache(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "upstream_failed" });
  }
});

app.get("/api/holidays/heatmap", async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const from = String(req.query.from || `${year}-01-01`);
  const to = String(req.query.to || `${year}-12-31`);

  const cacheKey = `heatmap-${year}-${from}-${to}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const countries = await fetchNager("/AvailableCountries");
    const counts = {};

    await Promise.all(
      countries.map(async ({ countryCode }) => {
        try {
          const holidays = await fetchNager(
            `/PublicHolidays/${year}/${countryCode}`,
          );
          const inRange = holidays.filter(
            (h) => h.date >= from && h.date <= to,
          );
          if (inRange.length > 0) counts[countryCode] = inRange.length;
        } catch {
          /* skip unsupported */
        }
      }),
    );

    setCache(cacheKey, counts);
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "upstream_failed" });
  }
});

app.get("/api/holidays/:countryCode", async (req, res) => {
  const countryCode = String(req.params.countryCode).toUpperCase();
  const year = Number(req.query.year) || new Date().getFullYear();

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    res.status(400).json({ error: "invalid_country_code" });
    return;
  }

  try {
    const cacheKey = `holidays-${countryCode}-${year}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const data = await fetchNager(`/PublicHolidays/${year}/${countryCode}`);
    setCache(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "upstream_failed" });
  }
});

app.get("/api/events/:countryCode", async (req, res) => {
  const countryCode = String(req.params.countryCode).toUpperCase();
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    res.json([]);
    return;
  }

  const classificationParam = String(req.query.classification || "");
  const categories = classificationParam.split(",").filter(Boolean);

  try {
    const cacheKey = `events-${countryCode}-${categories.join("-")}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const params = new URLSearchParams({
      apikey: apiKey,
      countryCode,
      size: "100",
      sort: "date,asc",
    });

    if (categories.length === 1 && TICKETMASTER_SEGMENT_MAP[categories[0]]) {
      params.set(
        "classificationName",
        TICKETMASTER_SEGMENT_MAP[categories[0]],
      );
    }

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params}`;
    const tmRes = await fetch(url);
    if (!tmRes.ok) {
      res.json([]);
      return;
    }

    const body = await tmRes.json();
    let events = (body._embedded?.events ?? []).map((e) =>
      mapTicketmasterEvent(e, countryCode),
    );

    if (categories.length > 0) {
      events = events.filter((e) => categories.includes(e.category));
    }

    setCache(cacheKey, events);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`API listening on http://127.0.0.1:${PORT}`);
});
