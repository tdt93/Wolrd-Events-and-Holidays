import type { CSSProperties } from "react";
import type { EventCategory, HolidayType } from "../types/event";
import type { AppLanguage } from "../hooks/useSettings";
import {
  ALL_EVENT_CATEGORIES,
  ALL_HOLIDAY_TYPES,
  EVENT_CATEGORIES,
  HOLIDAY_CATEGORIES,
} from "../lib/categories";
import {
  eventCategoryLabel,
  holidayTypeLabel,
  t,
} from "../lib/locale";

interface CategoryFiltersProps {
  selectedHolidays: HolidayType[];
  onHolidayChange: (types: HolidayType[]) => void;
  selectedEvents: EventCategory[];
  onEventChange: (cats: EventCategory[]) => void;
  nationalOnly: boolean;
  onNationalOnlyChange: (v: boolean) => void;
  longWeekendOnly: boolean;
  onLongWeekendOnlyChange: (v: boolean) => void;
  onClearAll: () => void;
  language: AppLanguage;
}

export function CategoryFilters({
  selectedHolidays,
  onHolidayChange,
  selectedEvents,
  onEventChange,
  nationalOnly,
  onNationalOnlyChange,
  longWeekendOnly,
  onLongWeekendOnlyChange,
  onClearAll,
  language,
}: CategoryFiltersProps) {
  const toggleHoliday = (id: HolidayType) => {
    if (selectedHolidays.includes(id)) {
      onHolidayChange(selectedHolidays.filter((x) => x !== id));
    } else {
      onHolidayChange([...selectedHolidays, id]);
    }
  };

  const toggleEvent = (id: EventCategory) => {
    if (selectedEvents.includes(id)) {
      onEventChange(selectedEvents.filter((x) => x !== id));
    } else {
      onEventChange([...selectedEvents, id]);
    }
  };

  const allHolidaysOn =
    selectedHolidays.length === ALL_HOLIDAY_TYPES.length &&
    ALL_HOLIDAY_TYPES.every((id) => selectedHolidays.includes(id));
  const allEventsOn =
    selectedEvents.length === ALL_EVENT_CATEGORIES.length &&
    ALL_EVENT_CATEGORIES.every((id) => selectedEvents.includes(id));
  const isDefault =
    allHolidaysOn &&
    allEventsOn &&
    !nationalOnly &&
    !longWeekendOnly;

  return (
    <section className="filter-card filter-card--categories">
      <div className="filter-card__head filter-card__head--split">
        <div className="filter-card__head-main">
          <span className="filter-card__icon" aria-hidden="true">
            🎛️
          </span>
          <h3 className="filter-card__title">{t("holidays", language)}</h3>
        </div>
        <button
          type="button"
          className="clear-all-btn"
          onClick={onClearAll}
          disabled={isDefault}
        >
          {t("clearAll", language)}
        </button>
      </div>

      <div className="chip-grid">
        {HOLIDAY_CATEGORIES.map((cat) => {
          const active = selectedHolidays.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={active}
              className={`filter-chip ${active ? "filter-chip--on" : "filter-chip--off"}`}
              style={
                {
                  "--chip-bg": cat.bg,
                  "--chip-border": cat.border,
                } as CSSProperties
              }
              onClick={() => toggleHoliday(cat.id)}
            >
              <span className="filter-chip__check" aria-hidden="true">
                {active ? "✓" : ""}
              </span>
              {holidayTypeLabel(cat.id, language)}
            </button>
          );
        })}
      </div>

      <h4 className="filter-card__subtitle">{t("events", language)}</h4>
      <div className="chip-grid">
        {EVENT_CATEGORIES.map((cat) => {
          const active = selectedEvents.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={active}
              className={`filter-chip ${active ? "filter-chip--on" : "filter-chip--off"}`}
              style={
                {
                  "--chip-bg": cat.bg,
                  "--chip-border": cat.border,
                } as CSSProperties
              }
              onClick={() => toggleEvent(cat.id)}
            >
              <span className="filter-chip__check" aria-hidden="true">
                {active ? "✓" : ""}
              </span>
              {cat.icon} {eventCategoryLabel(cat.id, language)}
            </button>
          );
        })}
      </div>

      <div className="filter-toggle-list">
        <label className="filter-toggle-row">
          <span>{t("nationalOnly", language)}</span>
          <input
            type="checkbox"
            checked={nationalOnly}
            onChange={(e) => onNationalOnlyChange(e.target.checked)}
          />
        </label>
        <label className="filter-toggle-row">
          <span>{t("longWeekends", language)}</span>
          <input
            type="checkbox"
            checked={longWeekendOnly}
            onChange={(e) => onLongWeekendOnlyChange(e.target.checked)}
          />
        </label>
      </div>
    </section>
  );
}
