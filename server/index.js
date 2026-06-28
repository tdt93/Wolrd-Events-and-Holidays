import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import countries from "i18n-iso-countries";

const require = createRequire(import.meta.url);
const en = require("i18n-iso-countries/langs/en.json");

countries.registerLocale(en);

function loadEnvFile() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;

  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] !== value) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

import { searchGeocode, reverseGeocode } from "./geocodeProxy.js";
import { fetchAllApiFootball } from "./apiFootball.js";
import { inferSportSub } from "./sportSub.js";
import { fetchFestivo } from "./festivo.js";
import { applyEventInterest } from "./eventInterest.js";

const app = express();
const PORT = Number(process.env.API_PORT || 3000);
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NAGER_BASE = "https://date.nager.at/api/v3";

const VALID_APP_LANGS = new Set(["en", "de", "fr", "es", "vi", "ja"]);

function parseAppLang(raw) {
  const lang = String(raw || "en").toLowerCase();
  return VALID_APP_LANGS.has(lang) ? lang : "en";
}

const CALENDARIFIC_LANG = {
  en: "en",
  de: "de",
  fr: "fr",
  es: "es",
  vi: "en",
  ja: "ja",
};

const TICKETMASTER_LOCALE = {
  en: "en-us",
  de: "de-de",
  fr: "fr-fr",
  es: "es-es",
  vi: "en-us",
  ja: "ja-jp",
};

const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data, ttlMs = CACHE_TTL_MS) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
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

function pickEventImage(images) {
  if (!Array.isArray(images) || images.length === 0) return undefined;
  const sorted = [...images].sort(
    (a, b) => (b.width ?? 0) - (a.width ?? 0),
  );
  const wide =
    sorted.find((img) => img.ratio === "16_9" && (img.width ?? 0) >= 640) ??
    sorted.find((img) => img.ratio === "16_9") ??
    sorted.find((img) => (img.width ?? 0) >= 640) ??
    sorted[0];
  return wide?.url ?? undefined;
}

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

  const mapped = {
    id: `tm-${event.id}`,
    source: "ticketmaster",
    title: event.name,
    startDate: dates?.start?.localDate ?? "",
    category,
    countryCode,
    countryName: countries.getName(countryCode, "en"),
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
    imageUrl: pickEventImage(event.images),
  };

  if (category === "sports") {
    mapped.sportSub = inferSportSub({
      source: "ticketmaster",
      genre,
      subGenre,
      typeName,
      title: event.name ?? "",
    });
  }

  return mapped;
}

function iso3FromIso2(iso2) {
  return countries.alpha2ToAlpha3(iso2.toUpperCase());
}

async function fetchGeoBoundaryGeoJSON(iso3, admLevel) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const metaRes = await fetch(
      `https://www.geoboundaries.org/api/current/gbOpen/${iso3}/${admLevel}/`,
      { signal: controller.signal },
    );
    if (!metaRes.ok) {
      return { type: "FeatureCollection", features: [] };
    }
    const meta = await metaRes.json();
    const entries = Array.isArray(meta) ? meta : meta ? [meta] : [];
    const entry =
      entries.find((m) => m?.gjDownloadURL) ??
      entries.find((m) => m?.downloadURL) ??
      entries[0];
    if (!entry?.gjDownloadURL && !entry?.downloadURL) {
      return { type: "FeatureCollection", features: [] };
    }
    const geoUrl = entry.gjDownloadURL ?? entry.downloadURL;
    const geoRes = await fetch(geoUrl, {
      signal: controller.signal,
    });
    if (!geoRes.ok) {
      return { type: "FeatureCollection", features: [] };
    }
    const geo = await geoRes.json();
    if (!geo?.features?.length) {
      return { type: "FeatureCollection", features: [] };
    }
    return geo;
  } catch (err) {
    console.warn(`geoBoundaries ${iso3}/${admLevel}:`, err.message);
    return { type: "FeatureCollection", features: [] };
  } finally {
    clearTimeout(timeout);
  }
}

function enrichBoundaryFeatures(geo) {
  return (geo.features ?? []).map((f) => ({
    ...f,
    properties: {
      ...(f.properties ?? {}),
      name:
        f.properties?.shapeName ??
        f.properties?.name ??
        f.properties?.NAME ??
        "Area",
    },
  }));
}

async function fetchTicketmasterPage(
  apiKey,
  countryCode,
  page,
  classification,
  locale,
) {
  const params = new URLSearchParams({
    apikey: apiKey,
    countryCode,
    size: "200",
    page: String(page),
    sort: "date,asc",
  });
  if (classification) params.set("classificationName", classification);
  if (locale) params.set("locale", locale);

  const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params}`;
  const tmRes = await fetch(url);
  if (!tmRes.ok) return [];
  const body = await tmRes.json();
  return (body._embedded?.events ?? []).map((e) =>
    mapTicketmasterEvent(e, countryCode),
  );
}

async function fetchAllTicketmaster(apiKey, countryCode, categories, locale) {
  const segments = new Set();
  if (categories.length === 0) {
    segments.add(null);
  } else {
    for (const cat of categories) {
      segments.add(TICKETMASTER_SEGMENT_MAP[cat] ?? null);
    }
  }

  const all = [];
  const seen = new Set();

  for (const classification of segments) {
    for (let page = 0; page < 4; page += 1) {
      const batch = await fetchTicketmasterPage(
        apiKey,
        countryCode,
        page,
        classification,
        locale,
      );
      if (batch.length === 0) break;
      for (const event of batch) {
        if (seen.has(event.id)) continue;
        seen.add(event.id);
        all.push(event);
      }
      if (batch.length < 200) break;
    }
  }

  if (categories.length > 0) {
    return all.filter((e) => categories.includes(e.category));
  }
  return all;
}

const CALENDARIFIC_TYPE_MAP = {
  "National holiday": ["Public"],
  "Federal Holiday": ["Public"],
  "Common local holiday": ["Public"],
  "Local holiday": ["Public"],
  "Bank holiday": ["Bank"],
  "School holiday": ["School"],
  "Optional holiday": ["Optional"],
  Observance: ["Observance"],
  "United nations observance": ["Observance"],
  Season: ["Observance"],
  "Clock change": ["Observance"],
};

function mapCalendarificTypes(types) {
  const out = new Set();
  for (const typeName of types ?? []) {
    for (const mapped of CALENDARIFIC_TYPE_MAP[typeName] ?? ["Observance"]) {
      out.add(mapped);
    }
  }
  return out.size > 0 ? [...out] : ["Observance"];
}

function mapCalendarificHoliday(holiday, countryCode) {
  const states = holiday.states;
  const locations = holiday.locations;
  const isGlobal =
    !states ||
    states === "All" ||
    locations === "All" ||
    (Array.isArray(locations) && locations.includes("All"));

  let counties = null;
  if (!isGlobal && states && states !== "All") {
    if (Array.isArray(states)) {
      counties = states.map(String).filter(Boolean);
    } else if (typeof states === "string") {
      counties = states
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return {
    date: holiday.date.iso,
    localName: holiday.name,
    name: holiday.name,
    countryCode,
    global: isGlobal,
    counties,
    types: mapCalendarificTypes(holiday.type),
    source: "calendarific",
  };
}

async function fetchCalendarific(apiKey, countryCode, year, lang = "en") {
  const params = new URLSearchParams({
    api_key: apiKey,
    country: countryCode,
    year: String(year),
  });
  const calLang = CALENDARIFIC_LANG[lang] ?? "en";
  if (calLang !== "en") params.set("language", calLang);
  const res = await fetch(
    `https://calendarific.com/api/v2/holidays?${params}`,
  );
  if (!res.ok) {
    console.warn(`Calendarific ${countryCode}: HTTP ${res.status}`);
    return [];
  }
  const body = await res.json();
  if (body.meta?.code !== 200) {
    console.warn(
      `Calendarific ${countryCode}:`,
      body.meta?.error ?? body.meta?.code,
    );
    return [];
  }
  return (body.response?.holidays ?? []).map((h) =>
    mapCalendarificHoliday(h, countryCode),
  );
}

const EVENTBRITE_CATEGORY_MAP = {
  music: "103",
  arts: "105",
  sports: "108",
  festival: "110",
};

function mapEventbriteEvent(event, countryCode) {
  const venue = event.venue;
  const categoryId = String(event.category_id ?? "");
  const title = event.name?.text ?? event.name ?? "Event";
  const titleLower = title.toLowerCase();

  let category = "other";
  if (categoryId === "103") category = "music";
  else if (categoryId === "105") category = "arts";
  else if (categoryId === "108") category = "sports";
  else if (categoryId === "110" || titleLower.includes("festival")) {
    category = "festival";
  }

  const start = event.start?.local ?? event.start?.utc ?? "";
  const startDate = start.slice(0, 10);
  const rawDesc = event.description?.text ?? "";
  const info = rawDesc
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    id: `eb-${event.id}`,
    source: "eventbrite",
    title,
    startDate,
    category,
    countryCode,
    countryName: countries.getName(countryCode, "en"),
    city: venue?.address?.city,
    region: venue?.address?.region,
    venue: venue?.name,
    info: info || undefined,
    description: info || undefined,
    lat: venue?.latitude ? parseFloat(venue.latitude) : undefined,
    lng: venue?.longitude ? parseFloat(venue.longitude) : undefined,
    url: event.url ?? undefined,
    imageUrl: event.logo?.url ?? undefined,
  };
}

let eventbriteSearchWarned = false;

async function fetchEventbritePage(token, countryCode, page, categoryId) {
  const params = new URLSearchParams({
    "location.country": countryCode,
    expand: "venue",
    page_size: "50",
    page: String(page),
    sort_by: "date",
  });
  if (categoryId) params.set("categories", categoryId);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      if (!eventbriteSearchWarned) {
        console.warn(
          `Eventbrite search returned HTTP ${res.status}. Public event search was discontinued in 2020 — add SEATGEEK_CLIENT_ID or TICKETMASTER_API_KEY for ticketed events.`,
        );
        eventbriteSearchWarned = true;
      }
      return [];
    }
    const body = await res.json();
    return (body.events ?? []).map((e) => mapEventbriteEvent(e, countryCode));
  } catch (err) {
    if (!eventbriteSearchWarned) {
      console.warn(
        "Eventbrite search unavailable (deprecated API). Skipping.",
        err instanceof Error ? err.message : err,
      );
      eventbriteSearchWarned = true;
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAllEventbrite(token, countryCode, categories) {
  const categoryIds = new Set();
  if (categories.length === 0) {
    categoryIds.add(null);
  } else {
    for (const cat of categories) {
      categoryIds.add(EVENTBRITE_CATEGORY_MAP[cat] ?? null);
    }
  }

  const all = [];
  const seen = new Set();

  for (const categoryId of categoryIds) {
    for (let page = 1; page <= 4; page += 1) {
      const batch = await fetchEventbritePage(
        token,
        countryCode,
        page,
        categoryId,
      );
      if (batch.length === 0) break;
      for (const event of batch) {
        if (seen.has(event.id)) continue;
        seen.add(event.id);
        all.push(event);
      }
      if (batch.length < 50) break;
    }
  }

  if (categories.length > 0) {
    return all.filter(
      (e) =>
        categories.includes(e.category) ||
        e.category === "other" ||
        e.category === "community",
    );
  }
  return all;
}

const SEATGEEK_TYPE_MAP = {
  sports: "sports",
  nba: "sports",
  nfl: "sports",
  mlb: "sports",
  nhl: "sports",
  mls: "sports",
  ncaa_basketball: "sports",
  ncaa_football: "sports",
  concert: "music",
  music_festival: "festival",
  theater: "arts",
  broadway_tickets_national: "arts",
  comedy: "arts",
};

function mapSeatGeekEvent(event, countryCode) {
  const venue = event.venue;
  const type = event.type ?? "";
  const title = event.title ?? event.short_title ?? "Event";
  const titleLower = title.toLowerCase();

  let category = SEATGEEK_TYPE_MAP[type] ?? "other";
  if (titleLower.includes("festival")) category = "festival";

  return {
    id: `sg-${event.id}`,
    source: "seatgeek",
    title,
    startDate: event.datetime_local?.slice(0, 10) ?? "",
    category,
    sportSub:
      category === "sports"
        ? inferSportSub({
            source: "seatgeek",
            title,
            seatgeekType: type,
          })
        : undefined,
    countryCode,
    countryName: countries.getName(countryCode, "en"),
    city: venue?.city,
    region: venue?.state,
    venue: venue?.name,
    lat: venue?.location?.lat != null ? parseFloat(String(venue.location.lat)) : undefined,
    lng: venue?.location?.lon != null ? parseFloat(String(venue.location.lon)) : undefined,
    url: event.url ?? undefined,
    imageUrl:
      event.performers?.[0]?.image ??
      event.performers?.[0]?.images?.huge ??
      event.image?.url ??
      undefined,
    popularity:
      typeof event.popularity === "number" ? event.popularity : undefined,
  };
}

async function fetchAllSeatGeek(clientId, countryCode, categories) {
  const all = [];
  const seen = new Set();

  for (let page = 1; page <= 4; page += 1) {
    const params = new URLSearchParams({
      client_id: clientId,
      per_page: "100",
      page: String(page),
      "venue.country": countryCode,
    });
    const res = await fetch(`https://api.seatgeek.com/2/events?${params}`);
    if (!res.ok) {
      console.warn(`SeatGeek ${countryCode}: HTTP ${res.status}`);
      break;
    }
    const body = await res.json();
    const batch = (body.events ?? []).map((e) =>
      mapSeatGeekEvent(e, countryCode),
    );
    if (batch.length === 0) break;
    for (const event of batch) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      all.push(event);
    }
    if (batch.length < 100) break;
  }

  if (categories.length > 0) {
    return all.filter(
      (e) =>
        categories.includes(e.category) ||
        e.category === "other" ||
        e.category === "community",
    );
  }
  return all;
}

function normalizeTitle(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function holidaySourceRank(source, preferLocalized) {
  if (source === "festivo") return 0;
  if (preferLocalized && source === "calendarific") return 1;
  if (source === "nager") return preferLocalized ? 3 : 1;
  if (source === "calendarific") return 2;
  return 4;
}

function dedupeHolidays(items, preferLocalized = false) {
  const seen = new Set();
  const sorted = [...items].sort(
    (a, b) =>
      holidaySourceRank(a.source, preferLocalized) -
      holidaySourceRank(b.source, preferLocalized),
  );
  const result = [];
  for (const holiday of sorted) {
    const key = `${holiday.date}|${normalizeTitle(holiday.localName || holiday.name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(holiday);
  }
  return result;
}

function dedupeEvents(items) {
  const seen = new Set();
  const sorted = [...items].sort(
    (a, b) =>
      (a.source === "ticketmaster" ? 0 : 1) -
      (b.source === "ticketmaster" ? 0 : 1),
  );
  const result = [];
  for (const event of sorted) {
    const key = `${event.startDate}|${normalizeTitle(event.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result;
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
    const countryList = await fetchNager("/AvailableCountries");
    const counts = {};

    await Promise.all(
      countryList.map(async ({ countryCode }) => {
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

app.get("/api/regions/:countryCode", async (req, res) => {
  const countryCode = String(req.params.countryCode).toUpperCase();
  const iso3 = iso3FromIso2(countryCode);
  if (!iso3) {
    res.status(400).json({ error: "invalid_country_code" });
    return;
  }

  const cacheKey = `regions-geo-v2-${countryCode}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const geo = await fetchGeoBoundaryGeoJSON(iso3, "ADM1");
    const enriched = {
      type: "FeatureCollection",
      features: enrichBoundaryFeatures(geo),
    };
    if (enriched.features.length > 0) {
      setCache(cacheKey, enriched);
    }
    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.json({ type: "FeatureCollection", features: [] });
  }
});

app.get("/api/cities/:countryCode", async (req, res) => {
  const countryCode = String(req.params.countryCode).toUpperCase();
  const iso3 = iso3FromIso2(countryCode);
  if (!iso3) {
    res.status(400).json({ error: "invalid_country_code" });
    return;
  }

  const cacheKey = `cities-geo-v2-${countryCode}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const geo = await fetchGeoBoundaryGeoJSON(iso3, "ADM2");
    const enriched = {
      type: "FeatureCollection",
      features: enrichBoundaryFeatures(geo),
    };
    if (enriched.features.length > 0) {
      setCache(cacheKey, enriched);
    }
    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.json({ type: "FeatureCollection", features: [] });
  }
});

app.get("/api/holidays/:countryCode", async (req, res) => {
  const countryCode = String(req.params.countryCode).toUpperCase();
  const year = Number(req.query.year) || new Date().getFullYear();
  const lang = parseAppLang(req.query.lang);

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    res.status(400).json({ error: "invalid_country_code" });
    return;
  }

  try {
    const sourceTags = [
      process.env.FESTIVO_API_KEY ? "festivo" : "",
      process.env.CALENDARIFIC_API_KEY ? "cal" : "",
    ]
      .filter(Boolean)
      .join("+");
    const cacheKey = `holidays-v4-${countryCode}-${year}-${lang}${sourceTags ? `-${sourceTags}` : ""}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    let nagerItems = [];
    try {
      const data = await fetchNager(`/PublicHolidays/${year}/${countryCode}`);
      nagerItems = data.map((h) => ({ ...h, source: "nager" }));
    } catch (err) {
      if (
        !process.env.CALENDARIFIC_API_KEY &&
        !process.env.FESTIVO_API_KEY
      ) {
        throw err;
      }
      console.warn(`Nager holidays ${countryCode}:`, err.message);
    }

    let merged = nagerItems;
    const preferLocalized = lang !== "en";

    const festivoKey = process.env.FESTIVO_API_KEY;
    if (festivoKey) {
      try {
        const festivoItems = await fetchFestivo(
          festivoKey,
          countryCode,
          year,
          lang,
        );
        merged = dedupeHolidays(
          [...merged, ...festivoItems],
          preferLocalized,
        );
      } catch (err) {
        console.warn(`Festivo ${countryCode}:`, err.message);
      }
    }

    const calendarificKey = process.env.CALENDARIFIC_API_KEY;
    if (calendarificKey) {
      try {
        const calItems = await fetchCalendarific(
          calendarificKey,
          countryCode,
          year,
          lang,
        );
        merged = dedupeHolidays([...merged, ...calItems], preferLocalized);
      } catch (err) {
        console.warn(`Calendarific ${countryCode}:`, err.message);
      }
    }

    setCache(cacheKey, merged);
    res.json(merged);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "upstream_failed" });
  }
});

app.get("/api/events/:countryCode", async (req, res) => {
  const countryCode = String(req.params.countryCode).toUpperCase();
  const ticketmasterKey = process.env.TICKETMASTER_API_KEY;
  const eventbriteKey = process.env.EVENTBRITE_API_KEY;
  const seatgeekId = process.env.SEATGEEK_CLIENT_ID;
  const apiFootballKey = process.env.API_FOOTBALL_KEY;

  if (!ticketmasterKey && !eventbriteKey && !seatgeekId && !apiFootballKey) {
    res.json([]);
    return;
  }

  const classificationParam = String(req.query.classification || "");
  const categories = classificationParam.split(",").filter(Boolean);
  const year = new Date().getFullYear();
  const from = String(req.query.from || `${year}-01-01`);
  const to = String(req.query.to || `${year}-12-31`);
  const lang = parseAppLang(req.query.lang);
  const tmLocale = TICKETMASTER_LOCALE[lang] ?? "en-us";

  const sourceTag = [
    ticketmasterKey ? "tm" : "",
    eventbriteKey ? "eb" : "",
    seatgeekId ? "sg" : "",
    apiFootballKey ? "af" : "",
  ]
    .filter(Boolean)
    .join("+");

  try {
    const cacheKey = `events-v9-${countryCode}-${categories.join("-")}-${from}-${to}-${lang}-${sourceTag}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    let events = [];
    if (ticketmasterKey) {
      events = await fetchAllTicketmaster(
        ticketmasterKey,
        countryCode,
        categories,
        tmLocale,
      );
    }
    if (seatgeekId) {
      const seatgeekEvents = await fetchAllSeatGeek(
        seatgeekId,
        countryCode,
        categories,
      );
      events = dedupeEvents([...events, ...seatgeekEvents]);
    }
    if (apiFootballKey) {
      const footballEvents = await fetchAllApiFootball(
        apiFootballKey,
        countryCode,
        from,
        to,
        categories,
        (code, lang) => countries.getName(code, lang),
      );
      if (footballEvents.length > 0) {
        console.log(
          `API-Football: ${footballEvents.length} fixtures for ${countryCode} (${from} → ${to})`,
        );
      }
      events = dedupeEvents([...events, ...footballEvents]);
    }
    if (eventbriteKey) {
      const eventbriteEvents = await fetchAllEventbrite(
        eventbriteKey,
        countryCode,
        categories,
      );
      events = dedupeEvents([...events, ...eventbriteEvents]);
    }

    events = applyEventInterest(events);

    const ttl = events.length === 0 ? 5 * 60 * 1000 : CACHE_TTL_MS;
    setCache(cacheKey, events, ttl);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    sources: {
      festivo: Boolean(process.env.FESTIVO_API_KEY),
      calendarific: Boolean(process.env.CALENDARIFIC_API_KEY),
      ticketmaster: Boolean(process.env.TICKETMASTER_API_KEY),
      seatgeek: Boolean(process.env.SEATGEEK_CLIENT_ID),
      eventbrite: Boolean(process.env.EVENTBRITE_API_KEY),
      apiFootball: Boolean(process.env.API_FOOTBALL_KEY),
    },
    apiFootballSeasons: {
      min: Number(process.env.API_FOOTBALL_MIN_SEASON) || 2022,
      max: Number(process.env.API_FOOTBALL_MAX_SEASON) || 2024,
    },
  });
});

app.get("/api/geocode/search", async (req, res) => {
  const q = String(req.query.q || "");
  const countryCode = String(req.query.countryCode || "").toLowerCase();
  try {
    res.json(await searchGeocode(q, countryCode));
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

app.get("/api/geocode/reverse", async (req, res) => {
  const lat = String(req.query.lat || "");
  const lon = String(req.query.lon || "");
  if (!lat || !lon) {
    res.status(400).json({ error: "missing_coords" });
    return;
  }
  try {
    res.json(await reverseGeocode(lat, lon));
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "upstream_failed" });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`API listening on http://127.0.0.1:${PORT}`);
  console.log("Data sources configured:", {
    festivo: Boolean(process.env.FESTIVO_API_KEY),
    calendarific: Boolean(process.env.CALENDARIFIC_API_KEY),
    ticketmaster: Boolean(process.env.TICKETMASTER_API_KEY),
    seatgeek: Boolean(process.env.SEATGEEK_CLIENT_ID),
    eventbrite: Boolean(process.env.EVENTBRITE_API_KEY),
    apiFootball: Boolean(process.env.API_FOOTBALL_KEY),
  });
});
