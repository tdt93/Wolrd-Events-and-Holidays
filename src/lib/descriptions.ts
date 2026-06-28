import type { AppLanguage } from "../hooks/useSettings";
import type { HolidayType, NagerHoliday } from "../types/event";
import { getPrimaryHolidayType } from "./categories";
import { t, tf } from "./locale";

const TYPE_DESC_KEY: Record<HolidayType, string> = {
  Public: "descTypePublic",
  Bank: "descTypeBank",
  School: "descTypeSchool",
  Observance: "descTypeObservance",
  Optional: "descTypeOptional",
  Authorities: "descTypeAuthorities",
};

const EVENT_CAT_DESC_KEY: Record<string, string> = {
  music: "descCatMusic",
  festival: "descCatFestival",
  sports: "descCatSports",
  arts: "descCatArts",
  community: "descCatCommunity",
  other: "descCatOther",
};

export function buildHolidayDescription(
  h: NagerHoliday,
  countryName: string | undefined,
  lang: AppLanguage,
): string {
  const primary = getPrimaryHolidayType(h.types ?? []);
  const parts: string[] = [];

  if (h.localName && h.localName !== h.name) {
    parts.push(tf("descLocallyKnown", lang, { name: h.localName }));
  }

  if (h.global) {
    parts.push(
      countryName
        ? tf("descObservedAcross", lang, { country: countryName })
        : t("descObservedNationwide", lang),
    );
  } else if (h.counties?.length) {
    parts.push(
      h.counties.length === 1
        ? t("descRegionalArea", lang)
        : tf("descRegionalAreas", lang, { count: h.counties.length }),
    );
  }

  parts.push(t(TYPE_DESC_KEY[primary], lang));

  return parts.join(" ");
}

export function buildEventDescription(
  title: string,
  category: string,
  lang: AppLanguage,
  city?: string,
  venue?: string,
  info?: string,
): string {
  const cleaned = info?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned) return cleaned;

  const place = [venue, city].filter(Boolean).join(", ");
  const label = t(EVENT_CAT_DESC_KEY[category] ?? "descCatOther", lang);

  if (place) {
    return tf("descAtPlace", lang, { category: label, place });
  }

  return tf("descNamed", lang, { category: label, title });
}
