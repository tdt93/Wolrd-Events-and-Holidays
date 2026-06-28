const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

const MAX_LEAGUES_PER_COUNTRY = 4;
const MAX_RANGE_DAYS = 90;
const REQUEST_GAP_MS = 120;
const DEFAULT_MAX_SEASON = Number(process.env.API_FOOTBALL_MAX_SEASON) || 2024;
const DEFAULT_MIN_SEASON = Number(process.env.API_FOOTBALL_MIN_SEASON) || 2022;

/** ISO2 → extra API-Football country names when `code` alone returns nothing. */
const COUNTRY_NAME_FALLBACKS = {
  GB: ["England", "Scotland", "Wales", "Northern-Ireland"],
  UK: ["England", "Scotland", "Wales", "Northern-Ireland"],
  US: ["USA"],
  KR: ["South-Korea"],
  CZ: ["Czech-Republic"],
  MK: ["Macedonia"],
  BO: ["Bolivia"],
  IR: ["Iran"],
  RU: ["Russia"],
  TW: ["Taiwan"],
  TZ: ["Tanzania"],
  VE: ["Venezuela"],
  VN: ["Vietnam"],
};

function resolveApiSeason(requestYear) {
  const year = Number(requestYear) || new Date().getFullYear();
  if (year > DEFAULT_MAX_SEASON) return DEFAULT_MAX_SEASON;
  if (year < DEFAULT_MIN_SEASON) return DEFAULT_MIN_SEASON;
  return year;
}

function shiftDateYear(isoDate, targetYear) {
  const parts = isoDate.split("-");
  if (parts.length < 3) return isoDate;
  return `${targetYear}-${parts[1]}-${parts[2]}`;
}

function mapRangeToApiSeason(from, to) {
  const displayYear = Number(from.slice(0, 4)) || new Date().getFullYear();
  const apiSeason = resolveApiSeason(displayYear);
  let apiFrom = shiftDateYear(from, apiSeason);
  let apiTo = shiftDateYear(to, apiSeason);

  const start = new Date(`${apiFrom}T00:00:00Z`);
  let end = new Date(`${apiTo}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    apiFrom = `${apiSeason}-07-01`;
    apiTo = `${apiSeason}-09-30`;
    return { apiFrom, apiTo, apiSeason, displayYear };
  }
  if (end < start) {
    apiTo = apiFrom;
    end = start;
  }

  const spanDays = (end.getTime() - start.getTime()) / 86400000;

  if (spanDays > MAX_RANGE_DAYS) {
    const y = start.getUTCFullYear();
    const jul1 = new Date(Date.UTC(y, 6, 1));
    const julEnd = new Date(jul1);
    julEnd.setUTCDate(julEnd.getUTCDate() + MAX_RANGE_DAYS);

    if (jul1 >= start && jul1 <= end) {
      apiFrom = jul1.toISOString().slice(0, 10);
      apiTo = (julEnd > end ? end : julEnd).toISOString().slice(0, 10);
    } else {
      const capped = new Date(start);
      capped.setUTCDate(capped.getUTCDate() + MAX_RANGE_DAYS);
      apiTo = (capped > end ? end : capped).toISOString().slice(0, 10);
    }
  }

  return { apiFrom, apiTo, apiSeason, displayYear };
}

function footballSeasonFallbackRange(apiSeason) {
  return {
    apiFrom: `${apiSeason}-07-01`,
    apiTo: `${apiSeason}-09-30`,
  };
}

async function fetchFixturesForLeagues(
  apiKey,
  leagues,
  leaguesRaw,
  apiSeason,
  apiFrom,
  apiTo,
  countryCode,
  getName,
  displayYear,
) {
  const all = [];
  const seen = new Set();

  for (const league of leagues) {
    const entry = leaguesRaw.find((l) => l.league?.id === league.id);
    const season = entry
      ? resolveSeasonYear(entry, apiSeason)
      : apiSeason;

    const { response: fixtures, rateLimited } = await apiFootballFetch(
      apiKey,
      "/fixtures",
      {
        league: String(league.id),
        season: String(season),
        from: apiFrom,
        to: apiTo,
      },
    );
    if (rateLimited) break;
    if (!fixtures.length) {
      await sleep(REQUEST_GAP_MS);
      continue;
    }

    for (const fixture of fixtures) {
      const mapped = mapFixture(
        fixture,
        countryCode,
        getName,
        displayYear,
        apiSeason,
      );
      if (!mapped.startDate || seen.has(mapped.id)) continue;
      seen.add(mapped.id);
      all.push(mapped);
    }
    await sleep(REQUEST_GAP_MS);
  }

  return all;
}

function leaguePriority(entry) {
  const name = (entry.league?.name ?? "").toLowerCase();
  const type = entry.league?.type ?? "";
  let score = 0;
  if (type === "League") score += 10;
  if (type === "Cup") score += 5;
  if (
    /1\.|premier|ekstraklasa|v-league|bundesliga|serie a|la liga|ligue 1|division 1|first league|pro league|super lig|eredivisie|primeira|mls|liga mx/i.test(
      name,
    )
  ) {
    score += 20;
  }
  return score;
}

function pickLeagues(leagues) {
  return [...leagues]
    .sort((a, b) => leaguePriority(b) - leaguePriority(a))
    .slice(0, MAX_LEAGUES_PER_COUNTRY)
    .map((entry) => entry.league)
    .filter(Boolean);
}

function resolveSeasonYear(leagueEntry, apiSeason) {
  const seasons = leagueEntry.seasons ?? [];
  if (seasons.some((s) => s.year === apiSeason)) return apiSeason;
  const current = seasons.find((s) => s.current);
  if (current?.year) return current.year;
  return seasons[0]?.year ?? apiSeason;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasApiErrors(body) {
  const errors = body?.errors;
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  return Object.keys(errors).length > 0;
}

async function apiFootballFetch(apiKey, path, params = {}) {
  const query = new URLSearchParams(params);
  const url = `${API_FOOTBALL_BASE}${path}?${query}`;
  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey },
  });
  if (!res.ok) {
    console.warn(`API-Football HTTP ${res.status} for ${path}`);
    return { response: [], errors: { http: res.status }, rateLimited: res.status === 429 };
  }
  const body = await res.json();
  if (hasApiErrors(body)) {
    console.warn(`API-Football ${path}:`, body.errors);
  }
  return {
    response: body.response ?? [],
    errors: body.errors,
  };
}

async function fetchLeaguesForCountry(apiKey, countryCode, apiSeason, getName) {
  const code = countryCode.toUpperCase();
  const merged = [];
  const seen = new Set();

  const byCode = await apiFootballFetch(apiKey, "/leagues", {
    code,
    season: String(apiSeason),
  });
  for (const entry of byCode.response) {
    const id = entry.league?.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(entry);
  }
  if (merged.length > 0) return merged;

  const i18nName = getName(code, "en");
  if (i18nName) {
    const byName = await apiFootballFetch(apiKey, "/leagues", {
      country: i18nName,
      season: String(apiSeason),
    });
    for (const entry of byName.response) {
      const id = entry.league?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      merged.push(entry);
    }
  }
  if (merged.length > 0) return merged;

  const fallbacks = COUNTRY_NAME_FALLBACKS[code] ?? [];
  for (const countryName of fallbacks) {
    const byFallback = await apiFootballFetch(apiKey, "/leagues", {
      country: countryName,
      season: String(apiSeason),
    });
    for (const entry of byFallback.response) {
      const id = entry.league?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      merged.push(entry);
    }
    if (merged.length > 0) break;
  }

  return merged;
}

function mapFixture(fixture, countryCode, getName, displayYear, apiSeason) {
  const home = fixture.teams?.home?.name ?? "Home";
  const away = fixture.teams?.away?.name ?? "Away";
  const leagueName = fixture.league?.name ?? "Football";
  const round = fixture.league?.round;
  const venue = fixture.fixture?.venue;
  const info = round ? `${leagueName} · ${round}` : leagueName;

  let startDate = fixture.fixture.date?.slice(0, 10) ?? "";
  if (startDate && displayYear !== apiSeason) {
    startDate = shiftDateYear(startDate, displayYear);
  }

  const seasonNote =
    displayYear !== apiSeason
      ? ` Based on ${apiSeason} season schedule (API plan limit).`
      : "";

  return {
    id: `af-${fixture.fixture.id}-${displayYear}`,
    source: "api-football",
    title: `${home} vs ${away}`,
    startDate,
    category: "sports",
    sportSub: "football",
    countryCode,
    countryName: getName(countryCode, "en"),
    city: venue?.city ?? undefined,
    venue: venue?.name ?? undefined,
    info,
    description: `Football fixture in ${leagueName}. ${home} host ${away}.${seasonNote}`,
  };
}

export async function fetchAllApiFootball(
  apiKey,
  countryCode,
  from,
  to,
  categories,
  getName,
) {
  if (categories.length > 0 && !categories.includes("sports")) {
    return [];
  }

  const { apiFrom, apiTo, apiSeason, displayYear } = mapRangeToApiSeason(
    from,
    to,
  );

  const leaguesRaw = await fetchLeaguesForCountry(
    apiKey,
    countryCode,
    apiSeason,
    getName,
  );
  if (!leaguesRaw.length) {
    console.warn(
      `API-Football: no leagues for ${countryCode} (season ${apiSeason})`,
    );
    return [];
  }

  const leagues = pickLeagues(leaguesRaw);
  let all = await fetchFixturesForLeagues(
    apiKey,
    leagues,
    leaguesRaw,
    apiSeason,
    apiFrom,
    apiTo,
    countryCode,
    getName,
    displayYear,
  );

  if (all.length === 0) {
    const fallback = footballSeasonFallbackRange(apiSeason);
    if (fallback.apiFrom !== apiFrom || fallback.apiTo !== apiTo) {
      all = await fetchFixturesForLeagues(
        apiKey,
        leagues,
        leaguesRaw,
        apiSeason,
        fallback.apiFrom,
        fallback.apiTo,
        countryCode,
        getName,
        displayYear,
      );
    }
  }

  return all
    .filter((e) => e.startDate >= from && e.startDate <= to)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}
