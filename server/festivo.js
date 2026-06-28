const FESTIVO_BASE = "https://api.getfestivo.com/v3/public-holidays";

/** Map app language codes to Festivo `language` query values. */
export const FESTIVO_LANG = {
  en: "en",
  de: "de",
  fr: "fr",
  es: "es",
  vi: "vi",
  ja: "ja",
};

const FESTIVO_TYPE_MAP = {
  national: ["Public"],
  public: ["Public"],
  federal: ["Public"],
  regional: ["Public"],
  local: ["Public"],
  bank: ["Bank"],
  school: ["School"],
  optional: ["Optional"],
  observance: ["Observance"],
  religious: ["Observance"],
};

function mapFestivoTypes(holiday) {
  if (holiday.public === false) return ["Observance"];
  const key = String(holiday.type ?? "").toLowerCase();
  return FESTIVO_TYPE_MAP[key] ?? ["Public"];
}

export function mapFestivoHoliday(holiday, countryCode) {
  const regions = Array.isArray(holiday.regions) ? holiday.regions : [];
  const typeLower = String(holiday.type ?? "").toLowerCase();
  const isGlobal =
    regions.length === 0 ||
    typeLower === "national" ||
    typeLower === "public" ||
    typeLower === "federal";

  const counties =
    regions.length > 0 ? regions.map((r) => r.code).filter(Boolean) : null;

  const name = holiday.name ?? holiday.name_local ?? "Holiday";
  const localName = holiday.name_local ?? name;

  return {
    date: holiday.date ?? holiday.observed ?? "",
    name,
    localName,
    countryCode,
    global: isGlobal,
    counties,
    types: mapFestivoTypes(holiday),
    source: "festivo",
  };
}

export async function fetchFestivo(apiKey, countryCode, year, lang = "en") {
  const params = new URLSearchParams({
    api_key: apiKey,
    country: countryCode,
    year: String(year),
  });

  const festivoLang = FESTIVO_LANG[lang] ?? "en";
  if (festivoLang) params.set("language", festivoLang);

  const res = await fetch(`${FESTIVO_BASE}/list?${params}`);
  if (!res.ok) {
    if (res.status === 402) {
      console.warn(
        `Festivo ${countryCode}: HTTP 402 (plan/quota — Festivo skipped; Nager/Calendarific still used)`,
      );
    } else if (res.status === 401) {
      console.warn(`Festivo ${countryCode}: HTTP 401 (invalid API key)`);
    } else {
      console.warn(`Festivo ${countryCode}: HTTP ${res.status}`);
    }
    return [];
  }

  const body = await res.json();
  const holidays = body.holidays ?? body.data?.holidays ?? [];
  if (!Array.isArray(holidays)) return [];

  return holidays
    .filter((h) => h.date || h.observed)
    .map((h) => mapFestivoHoliday(h, countryCode));
}
