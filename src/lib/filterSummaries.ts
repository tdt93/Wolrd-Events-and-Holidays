import type { AppLanguage } from "../hooks/useSettings";
import type { DatePreset, EventCategory, HolidayType, SportSubcategory } from "../types/event";
import {
  ALL_EVENT_CATEGORIES,
  ALL_HOLIDAY_TYPES,
  ALL_SPORT_SUBCATEGORIES,
} from "./categories";
import { isoToDisplay } from "./dateFormat";
import {
  eventCategoryLabel,
  holidayTypeLabel,
  sportSubLabel,
  t,
  tf,
} from "./locale";

const DATE_PRESET_LABEL: Record<Exclude<DatePreset, "custom">, string> = {
  "this-week": "thisWeek",
  "this-month": "thisMonth",
  "next-3-months": "next3Months",
  "this-year": "thisYear",
};

function joinSummary(parts: string[], max = 2): string {
  if (parts.length === 0) return "";
  if (parts.length <= max) return parts.join(" · ");
  const head = parts.slice(0, max).join(" · ");
  return `${head} · +${parts.length - max}`;
}

export function dateFilterSummary(
  active: DatePreset,
  from: string,
  to: string,
  language: AppLanguage,
): string {
  if (active !== "custom") {
    const key = DATE_PRESET_LABEL[active];
    return key ? t(key, language) : t("customDates", language);
  }
  return `${isoToDisplay(from)} – ${isoToDisplay(to)}`;
}

export function holidayFilterSummary(
  selected: HolidayType[],
  nationalOnly: boolean,
  longWeekendOnly: boolean,
  language: AppLanguage,
): string {
  const allOn =
    selected.length === ALL_HOLIDAY_TYPES.length &&
    ALL_HOLIDAY_TYPES.every((id) => selected.includes(id));

  const parts: string[] = [];

  if (allOn && !nationalOnly && !longWeekendOnly) {
    parts.push(t("filterSummaryAll", language));
  } else if (!allOn) {
    const labels = selected.map((id) => holidayTypeLabel(id, language));
    parts.push(
      labels.length === 0
        ? t("filterSummaryNone", language)
        : joinSummary(labels, 2),
    );
  } else {
    parts.push(t("filterSummaryAll", language));
  }

  if (nationalOnly) parts.push(t("nationalOnly", language));
  if (longWeekendOnly) parts.push(t("longWeekends", language));

  return parts.join(" · ");
}

export function eventFilterSummary(
  selected: EventCategory[],
  sportSubs: SportSubcategory[],
  language: AppLanguage,
): string {
  const allEventsOn =
    selected.length === ALL_EVENT_CATEGORIES.length &&
    ALL_EVENT_CATEGORIES.every((id) => selected.includes(id));
  const sportsOn = selected.includes("sports");
  const allSportSubsOn =
    sportSubs.length === ALL_SPORT_SUBCATEGORIES.length &&
    ALL_SPORT_SUBCATEGORIES.every((id) => sportSubs.includes(id));

  const parts: string[] = [];

  if (!allEventsOn) {
    const labels = selected.map((id) => eventCategoryLabel(id, language));
    parts.push(
      labels.length === 0
        ? t("filterSummaryNone", language)
        : joinSummary(labels, 2),
    );
  } else {
    parts.push(t("filterSummaryAll", language));
  }

  if (sportsOn && !allSportSubsOn && sportSubs.length > 0) {
    const subLabels = sportSubs.map((id) => sportSubLabel(id, language));
    parts.push(joinSummary(subLabels, 2));
  }

  return parts.join(" · ");
}

export function regionFilterSummary(
  selected: string | null,
  language: AppLanguage,
): string {
  return selected ?? t("allRegions", language);
}

export function watchlistFilterSummary(
  count: number,
  language: AppLanguage,
): string {
  return tf("filterSummaryWatching", language, { count: String(count) });
}
