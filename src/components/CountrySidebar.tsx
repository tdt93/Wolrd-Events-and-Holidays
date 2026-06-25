import type { MapEvent } from "../types/event";
import {
  downloadIcs,
  formatDisplayDate,
  generateIcs,
  isToday,
} from "../lib/geocode";
import { getCategoryStyle, getEventCategoryStyle, getPrimaryHolidayType } from "../lib/categories";
import type { HolidayType } from "../types/event";

interface CountrySidebarProps {
  countryName: string | null;
  countryCode: string | null;
  events: MapEvent[];
  loading: boolean;
  error: string | null;
  isWatched: boolean;
  onToggleWatch: () => void;
  tripMode: boolean;
  tripFrom?: string;
  tripTo?: string;
}

export function CountrySidebar({
  countryName,
  countryCode,
  events,
  loading,
  error,
  isWatched,
  onToggleWatch,
  tripMode,
  tripFrom,
  tripTo,
}: CountrySidebarProps) {
  const handleExport = () => {
    if (!countryName || events.length === 0) return;
    const ics = generateIcs(events, countryName);
    downloadIcs(ics, `${countryCode ?? "holidays"}-holidays.ics`);
  };

  return (
    <div className="country-sidebar">
      <div className="sidebar-header">
        {countryName ? (
          <>
            <h2>{countryName}</h2>
            <p className="subtitle">
              {events.length} celebration{events.length !== 1 ? "s" : ""} in
              range
            </p>
            <div className="sidebar-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleExport}
                disabled={events.length === 0}
              >
                Export .ics
              </button>
              <button
                type="button"
                className={`btn-secondary watch-btn ${isWatched ? "watched" : ""}`}
                onClick={onToggleWatch}
              >
                {isWatched ? "★ Watching" : "☆ Watch"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Where to next?</h2>
            <p className="subtitle">
              Pick a country on the map to discover its holidays
            </p>
          </>
        )}
      </div>

      {tripMode && tripFrom && tripTo && (
        <div className="trip-banner">
          Trip mode: {tripFrom} → {tripTo}
        </div>
      )}

      {loading && (
        <div className="loading-dots" aria-live="polite">
          <span />
          <span />
          <span />
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}

      {!loading && !error && countryName && events.length === 0 && (
        <p className="empty-msg">
          No holidays in this range — try widening your dates.
        </p>
      )}

      <ul className="event-list">
        {events.map((event) => {
          const isHoliday = event.category === "holiday";
          const primaryType = event.holidayTypes
            ? getPrimaryHolidayType(event.holidayTypes)
            : ("Public" as HolidayType);
          const style = isHoliday
            ? getCategoryStyle(primaryType)
            : getEventCategoryStyle(event.category);
          const place = [event.city, event.region].filter(Boolean).join(", ");

          return (
            <li
              key={event.id}
              className="event-row"
              style={{ borderLeftColor: style.border }}
            >
              <div className="event-date">
                {formatDisplayDate(event.startDate)}
                {isToday(event.startDate) && (
                  <span className="today-badge">Today</span>
                )}
              </div>
              <div className="event-body">
                <strong>{event.localTitle || event.title}</strong>
                {event.localTitle && event.localTitle !== event.title && (
                  <span className="event-alt">{event.title}</span>
                )}
                {place && <span className="event-place">📍 {place}</span>}
                {event.description && (
                  <p className="event-description">{event.description}</p>
                )}
                <div className="event-meta">
                  <span
                    className="type-chip"
                    style={{
                      background: style.bg,
                      color: style.border,
                    }}
                  >
                    {"icon" in style ? `${style.icon} ${style.label}` : style.label}
                  </span>
                  {event.isLongWeekend && (
                    <span className="long-weekend-badge">Long weekend</span>
                  )}
                  {event.source === "ticketmaster" && (
                    <span className="source-badge">Event</span>
                  )}
                </div>
                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="event-link"
                  >
                    View details →
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
