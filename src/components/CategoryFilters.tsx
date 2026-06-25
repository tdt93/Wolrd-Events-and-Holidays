import type { CSSProperties } from "react";
import type { EventCategory, HolidayType } from "../types/event";
import { HOLIDAY_CATEGORIES, EVENT_CATEGORIES } from "../lib/categories";

interface CategoryFiltersProps {
  selectedHolidays: HolidayType[];
  onHolidayChange: (types: HolidayType[]) => void;
  selectedEvents: EventCategory[];
  onEventChange: (cats: EventCategory[]) => void;
  nationalOnly: boolean;
  onNationalOnlyChange: (v: boolean) => void;
  longWeekendOnly: boolean;
  onLongWeekendOnlyChange: (v: boolean) => void;
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
}: CategoryFiltersProps) {
  const toggleHoliday = (id: HolidayType) => {
    if (selectedHolidays.includes(id)) {
      onHolidayChange(selectedHolidays.filter((t) => t !== id));
    } else {
      onHolidayChange([...selectedHolidays, id]);
    }
  };

  const toggleEvent = (id: EventCategory) => {
    if (selectedEvents.includes(id)) {
      onEventChange(selectedEvents.filter((t) => t !== id));
    } else {
      onEventChange([...selectedEvents, id]);
    }
  };

  return (
    <div className="category-filters">
      <h3 className="category-filters__title">Holidays</h3>
      <div className="filter-row">
        {HOLIDAY_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`chip ${selectedHolidays.length === 0 || selectedHolidays.includes(cat.id) ? "active" : ""}`}
            style={
              {
                "--chip-bg": cat.bg,
                "--chip-border": cat.border,
              } as CSSProperties
            }
            onClick={() => toggleHoliday(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <h3 className="category-filters__title">Events</h3>
      <div className="filter-row">
        {EVENT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`chip ${selectedEvents.length === 0 || selectedEvents.includes(cat.id) ? "active" : ""}`}
            style={
              {
                "--chip-bg": cat.bg,
                "--chip-border": cat.border,
              } as CSSProperties
            }
            onClick={() => toggleEvent(cat.id)}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      <div className="filter-toggles">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={nationalOnly}
            onChange={(e) => onNationalOnlyChange(e.target.checked)}
          />
          National only
        </label>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={longWeekendOnly}
            onChange={(e) => onLongWeekendOnlyChange(e.target.checked)}
          />
          Long weekends
        </label>
      </div>
    </div>
  );
}
