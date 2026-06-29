import { useState } from "react";
import type { DatePreset, EventCategory, HolidayType, SportSubcategory } from "../types/event";
import type { AppLanguage } from "../hooks/useSettings";
import {
  ALL_EVENT_CATEGORIES,
  ALL_HOLIDAY_TYPES,
  ALL_SPORT_SUBCATEGORIES,
} from "../lib/categories";
import {
  dateFilterSummary,
  eventFilterSummary,
  holidayFilterSummary,
  regionFilterSummary,
  watchlistFilterSummary,
} from "../lib/filterSummaries";
import { t } from "../lib/locale";
import { CategoryFilters } from "./CategoryFilters";
import { DatePresets } from "./DatePresets";
import { FilterAccordionSection } from "./FilterAccordionSection";
import { RegionPicker } from "./RegionPicker";

type FilterSectionId = "when" | "holidays" | "events" | "where" | "watching";

interface EventFiltersPanelProps {
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  from: string;
  to: string;
  onCustomRange: (from: string, to: string) => void;
  selectedHolidays: HolidayType[];
  onHolidayChange: (types: HolidayType[]) => void;
  selectedEvents: EventCategory[];
  onEventChange: (cats: EventCategory[]) => void;
  selectedSportSubs: SportSubcategory[];
  onSportSubChange: (subs: SportSubcategory[]) => void;
  nationalOnly: boolean;
  onNationalOnlyChange: (v: boolean) => void;
  longWeekendOnly: boolean;
  onLongWeekendOnlyChange: (v: boolean) => void;
  onClearAll: () => void;
  showRegionPicker: boolean;
  regionNames: string[];
  selectedRegion: string | null;
  onRegionChange: (region: string | null) => void;
  regionsLoading: boolean;
  watchlist?: string[];
  countriesList?: { countryCode: string; name: string }[];
  onOpenCountry?: (code: string) => void;
  language: AppLanguage;
}

function isDefaultFilters(
  selectedHolidays: HolidayType[],
  selectedEvents: EventCategory[],
  selectedSportSubs: SportSubcategory[],
  nationalOnly: boolean,
  longWeekendOnly: boolean,
): boolean {
  const allHolidaysOn =
    selectedHolidays.length === ALL_HOLIDAY_TYPES.length &&
    ALL_HOLIDAY_TYPES.every((id) => selectedHolidays.includes(id));
  const allEventsOn =
    selectedEvents.length === ALL_EVENT_CATEGORIES.length &&
    ALL_EVENT_CATEGORIES.every((id) => selectedEvents.includes(id));
  const allSportSubsOn =
    selectedSportSubs.length === ALL_SPORT_SUBCATEGORIES.length &&
    ALL_SPORT_SUBCATEGORIES.every((id) => selectedSportSubs.includes(id));
  return (
    allHolidaysOn &&
    allEventsOn &&
    allSportSubsOn &&
    !nationalOnly &&
    !longWeekendOnly
  );
}

export function EventFiltersPanel({
  datePreset,
  onDatePresetChange,
  from,
  to,
  onCustomRange,
  selectedHolidays,
  onHolidayChange,
  selectedEvents,
  onEventChange,
  selectedSportSubs,
  onSportSubChange,
  nationalOnly,
  onNationalOnlyChange,
  longWeekendOnly,
  onLongWeekendOnlyChange,
  onClearAll,
  showRegionPicker,
  regionNames,
  selectedRegion,
  onRegionChange,
  regionsLoading,
  watchlist = [],
  countriesList = [],
  onOpenCountry,
  language,
}: EventFiltersPanelProps) {
  const [openSection, setOpenSection] = useState<FilterSectionId | null>("when");

  const toggleSection = (id: FilterSectionId) => {
    setOpenSection((current) => (current === id ? null : id));
  };

  const showWatching = watchlist.length > 0 && Boolean(onOpenCountry);
  const filtersDefault = isDefaultFilters(
    selectedHolidays,
    selectedEvents,
    selectedSportSubs,
    nationalOnly,
    longWeekendOnly,
  );

  return (
    <div className="sidebar-filters-panel__content filter-accordion">
      <div className="filter-accordion__toolbar">
        <button
          type="button"
          className="clear-all-btn"
          onClick={onClearAll}
          disabled={filtersDefault}
        >
          {t("clearAll", language)}
        </button>
      </div>

      <FilterAccordionSection
        icon="📅"
        title={t("filterSectionWhen", language)}
        summary={dateFilterSummary(datePreset, from, to, language)}
        open={openSection === "when"}
        onToggle={() => toggleSection("when")}
      >
        <DatePresets
          active={datePreset}
          onChange={onDatePresetChange}
          from={from}
          to={to}
          onCustomRange={onCustomRange}
          language={language}
          embedded
        />
      </FilterAccordionSection>

      <FilterAccordionSection
        icon="🎌"
        title={t("holidays", language)}
        summary={holidayFilterSummary(
          selectedHolidays,
          nationalOnly,
          longWeekendOnly,
          language,
        )}
        open={openSection === "holidays"}
        onToggle={() => toggleSection("holidays")}
      >
        <CategoryFilters
          selectedHolidays={selectedHolidays}
          onHolidayChange={onHolidayChange}
          selectedEvents={selectedEvents}
          onEventChange={onEventChange}
          selectedSportSubs={selectedSportSubs}
          onSportSubChange={onSportSubChange}
          nationalOnly={nationalOnly}
          onNationalOnlyChange={onNationalOnlyChange}
          longWeekendOnly={longWeekendOnly}
          onLongWeekendOnlyChange={onLongWeekendOnlyChange}
          onClearAll={onClearAll}
          language={language}
          section="holidays"
          embedded
        />
      </FilterAccordionSection>

      <FilterAccordionSection
        icon="🎟️"
        title={t("events", language)}
        summary={eventFilterSummary(
          selectedEvents,
          selectedSportSubs,
          language,
        )}
        open={openSection === "events"}
        onToggle={() => toggleSection("events")}
      >
        <CategoryFilters
          selectedHolidays={selectedHolidays}
          onHolidayChange={onHolidayChange}
          selectedEvents={selectedEvents}
          onEventChange={onEventChange}
          selectedSportSubs={selectedSportSubs}
          onSportSubChange={onSportSubChange}
          nationalOnly={nationalOnly}
          onNationalOnlyChange={onNationalOnlyChange}
          longWeekendOnly={longWeekendOnly}
          onLongWeekendOnlyChange={onLongWeekendOnlyChange}
          onClearAll={onClearAll}
          language={language}
          section="events"
          embedded
        />
      </FilterAccordionSection>

      {showRegionPicker && (
        <FilterAccordionSection
          icon="📍"
          title={t("filterSectionWhere", language)}
          summary={regionFilterSummary(selectedRegion, language)}
          open={openSection === "where"}
          onToggle={() => toggleSection("where")}
        >
          <RegionPicker
            regions={regionNames}
            selected={selectedRegion}
            onChange={onRegionChange}
            language={language}
            loading={regionsLoading}
            embedded
          />
        </FilterAccordionSection>
      )}

      {showWatching && (
        <FilterAccordionSection
          icon="★"
          title={t("watching", language)}
          summary={watchlistFilterSummary(watchlist.length, language)}
          open={openSection === "watching"}
          onToggle={() => toggleSection("watching")}
        >
          <div className="filter-accordion__content">
            <div className="chip-grid">
              {watchlist.map((code) => {
                const c = countriesList.find((x) => x.countryCode === code);
                return (
                  <button
                    key={code}
                    type="button"
                    className="watch-chip"
                    onClick={() => onOpenCountry?.(code)}
                  >
                    {c?.name ?? code}
                  </button>
                );
              })}
            </div>
          </div>
        </FilterAccordionSection>
      )}
    </div>
  );
}

export function IconEventFilters() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7.5h14M7.2 12h9.6M9.4 16.5h5.2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="17.2" cy="7.5" r="1.2" fill="currentColor" />
      <circle cx="14.8" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
    </svg>
  );
}
