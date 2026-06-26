import type { MapEvent } from "../types/event";
import type { AppLanguage } from "../hooks/useSettings";
import {
  downloadIcs,
  formatDisplayDate,
  generateIcs,
  isToday,
} from "../lib/geocode";
import {
  getCategoryStyle,
  getEventCategoryStyle,
  getPrimaryHolidayType,
} from "../lib/categories";
import {
  celebrationsLabel,
  eventCategoryLabel,
  holidayTypeLabel,
  t,
  tf,
} from "../lib/locale";
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
  language: AppLanguage;
}

function IconExport() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v10M8 9l4 4 4-4M5 19h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  language,
}: CountrySidebarProps) {
  const handleExport = () => {
    if (!countryName || events.length === 0) return;
    const ics = generateIcs(events, countryName);
    downloadIcs(ics, `${countryCode ?? "holidays"}-holidays.ics`);
  };

  return (
    <div className="country-sidebar">
      {countryName && (
        <div className="sidebar-header">
          <p className="subtitle">
            {celebrationsLabel(events.length, language)}
            {events.some((e) => e.source === "api-football") && (
              <span className="sports-count">
                {" "}
                · {events.filter((e) => e.source === "api-football").length}{" "}
                {t("footballFixture", language).toLowerCase()}
              </span>
            )}
          </p>
          <div className="sidebar-toolbar">
            <button
              type="button"
              className={`btn-secondary watch-btn ${isWatched ? "watched" : ""}`}
              onClick={onToggleWatch}
            >
              {isWatched ? `★ ${t("watchingBtn", language)}` : `☆ ${t("watch", language)}`}
            </button>
            <button
              type="button"
              className="icon-btn export-btn sidebar-toolbar__export"
              onClick={handleExport}
              disabled={events.length === 0}
              aria-label={t("exportIcs", language)}
              data-tooltip={t("exportIcs", language)}
            >
              <IconExport />
            </button>
          </div>
        </div>
      )}

      {!countryName && (
        <div className="sidebar-header sidebar-header--empty">
          <h2>{t("whereToNext", language)}</h2>
          <p className="subtitle">{t("pickCountry", language)}</p>
        </div>
      )}

      {tripMode && tripFrom && tripTo && (
        <div className="trip-banner">
          {tf("tripModeBanner", language, { from: tripFrom, to: tripTo })}
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
        <p className="empty-msg">{t("emptyEvents", language)}</p>
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
          const typeLabel = isHoliday
            ? holidayTypeLabel(primaryType, language)
            : `${getEventCategoryStyle(event.category).icon} ${eventCategoryLabel(event.category, language)}`;

          return (
            <li
              key={event.id}
              className="event-row"
              style={{ borderLeftColor: style.border }}
            >
              <div className="event-date">
                {formatDisplayDate(event.startDate)}
                {isToday(event.startDate) && (
                  <span className="today-badge">{t("today", language)}</span>
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
                    {typeLabel}
                  </span>
                  {event.isLongWeekend && (
                    <span className="long-weekend-badge">
                      {t("longWeekend", language)}
                    </span>
                  )}
                  {(event.source === "ticketmaster" ||
                    event.source === "eventbrite" ||
                    event.source === "seatgeek" ||
                    event.source === "api-football") && (
                    <span className="source-badge">
                      {event.source === "eventbrite"
                        ? t("eventbriteEvent", language)
                        : event.source === "seatgeek"
                          ? t("seatgeekEvent", language)
                          : event.source === "api-football"
                            ? t("footballFixture", language)
                            : t("ticketEvent", language)}
                    </span>
                  )}
                </div>
                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="event-link"
                  >
                    {t("viewDetails", language)} →
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
