import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { MapEvent, SportSubcategory } from "../types/event";
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
  SPORTS_SUBCATEGORIES,
} from "../lib/categories";
import {
  celebrationsLabel,
  eventCategoryLabel,
  holidayTypeLabel,
  sportSubLabel,
  t,
  tf,
} from "../lib/locale";
import { eventAltTitle, eventPrimaryTitle } from "../lib/eventDisplay";
import type { HolidayType } from "../types/event";

const EVENT_PAGE_SIZE = 30;

interface CountrySidebarProps {
  countryName: string | null;
  countryCode: string | null;
  events: MapEvent[];
  loading: boolean;
  error: string | null;
  isWatched: boolean;
  onToggleWatch: () => void;
  onShareLink: () => void;
  shareCopied: boolean;
  expandedEventId: string | null;
  onExpandedEventChange: (id: string | null) => void;
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

function IconShare() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function sportSubStyle(sub: SportSubcategory) {
  return (
    SPORTS_SUBCATEGORIES.find((c) => c.id === sub) ?? {
      bg: "#f1f5f9",
      border: "#64748b",
      icon: "🏅",
    }
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
  onShareLink,
  shareCopied,
  expandedEventId,
  onExpandedEventChange,
  tripMode,
  tripFrom,
  tripTo,
  language,
}: CountrySidebarProps) {
  const [visibleCount, setVisibleCount] = useState(EVENT_PAGE_SIZE);
  const listEndRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    setVisibleCount(EVENT_PAGE_SIZE);
  }, [countryCode]);

  useEffect(() => {
    if (!expandedEventId) return;
    const idx = events.findIndex((e) => e.id === expandedEventId);
    if (idx === -1) return;
    if (idx >= visibleCount) {
      setVisibleCount(
        Math.min(
          Math.ceil((idx + 1) / EVENT_PAGE_SIZE) * EVENT_PAGE_SIZE,
          events.length,
        ),
      );
    }
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-event-id="${expandedEventId}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expandedEventId, events, visibleCount]);

  const visibleEvents = events.slice(0, visibleCount);
  const hasMore = visibleCount < events.length;

  useEffect(() => {
    const sentinel = listEndRef.current;
    if (!sentinel || !hasMore) return;

    const root = sentinel.closest(".bottom-card__body");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) =>
            Math.min(count + EVENT_PAGE_SIZE, events.length),
          );
        }
      },
      { root, rootMargin: "80px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [events.length, hasMore, countryCode, visibleCount]);

  const handleExport = () => {
    if (!countryName || events.length === 0) return;
    const ics = generateIcs(events, countryName);
    downloadIcs(ics, `${countryCode ?? "holidays"}-holidays.ics`);
  };

  const toggleExpanded = (id: string) => {
    onExpandedEventChange(expandedEventId === id ? null : id);
  };

  return (
    <div className="country-sidebar">
      {countryName && (
        <div className="sidebar-header">
          <p className="subtitle">
            {celebrationsLabel(events.length, language)}
            {events.some((e) => e.category === "sports") && (
              <span className="sports-count">
                {" "}
                · {events.filter((e) => e.category === "sports").length}{" "}
                {t("event_sports", language).toLowerCase()}
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

      {!loading && events.length > 0 && (
        <div className="event-list__meta">
          <span className="event-list__meta-text">
            {tf("eventsShowing", language, {
              shown: String(visibleEvents.length),
              total: String(events.length),
            })}
          </span>
          <div className="event-list__meta-actions">
            <button
              type="button"
              className="icon-btn share-btn event-list__action"
              onClick={onShareLink}
              disabled={!countryCode}
              aria-label={
                shareCopied
                  ? t("linkCopied", language)
                  : t("copyShareLink", language)
              }
              data-tooltip={
                shareCopied
                  ? t("linkCopied", language)
                  : t("copyShareLink", language)
              }
            >
              <IconShare />
            </button>
            <button
              type="button"
              className="icon-btn export-btn event-list__action"
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

      <ul className="event-list">
        {visibleEvents.map((event) => {
          const isHoliday = event.category === "holiday";
          const primaryType = event.holidayTypes
            ? getPrimaryHolidayType(event.holidayTypes)
            : ("Public" as HolidayType);
          const style = isHoliday
            ? getCategoryStyle(primaryType)
            : getEventCategoryStyle(event.category);
          const sportStyle = event.sportSub
            ? sportSubStyle(event.sportSub)
            : null;
          const place = [event.city, event.region].filter(Boolean).join(", ");
          const typeLabel = isHoliday
            ? holidayTypeLabel(primaryType, language)
            : `${getEventCategoryStyle(event.category).icon} ${eventCategoryLabel(event.category, language)}`;
          const expanded = expandedEventId === event.id;

          const primaryTitle = eventPrimaryTitle(event, language);
          const altTitle = eventAltTitle(event, language);

          return (
            <li
              key={event.id}
              data-event-id={event.id}
              className={`event-row ${expanded ? "event-row--expanded" : ""}`}
            >
              <button
                type="button"
                className="event-row__summary"
                onClick={() => toggleExpanded(event.id)}
                aria-expanded={expanded}
              >
                <div className="event-date">
                  {formatDisplayDate(event.startDate)}
                  {isToday(event.startDate) && (
                    <span className="today-badge">{t("today", language)}</span>
                  )}
                </div>
                <div className="event-body">
                  <strong>
                    {primaryTitle}
                    {event.featured && (
                      <span className="event-featured-badge">
                        ★ {t("featuredEvent", language)}
                      </span>
                    )}
                  </strong>
                  {altTitle && <span className="event-alt">{altTitle}</span>}
                  {place && <span className="event-place">📍 {place}</span>}
                </div>
              </button>

              <div className="event-row__details">
                {expanded && event.imageUrl && (
                  <img
                    className="event-row__image"
                    src={event.imageUrl}
                    alt=""
                    loading="lazy"
                  />
                )}
                {event.description && (
                  <p className="event-description">{event.description}</p>
                )}
                <div className="event-meta">
                  <span
                    className="filter-chip filter-chip--on meta-chip"
                    style={{
                      "--chip-bg": style.bg,
                      "--chip-border": style.border,
                    } as CSSProperties}
                  >
                    {typeLabel}
                  </span>
                  {event.sportSub && sportStyle && (
                    <span
                      className="filter-chip filter-chip--on meta-chip"
                      style={{
                        "--chip-bg": sportStyle.bg,
                        "--chip-border": sportStyle.border,
                      } as CSSProperties}
                    >
                      {sportStyle.icon}{" "}
                      {sportSubLabel(event.sportSub, language)}
                    </span>
                  )}
                  {event.isLongWeekend && (
                    <span className="filter-chip filter-chip--on meta-chip meta-chip--muted">
                      {t("longWeekend", language)}
                    </span>
                  )}
                  {(event.source === "ticketmaster" ||
                    event.source === "eventbrite" ||
                    event.source === "seatgeek" ||
                    event.source === "api-football") && (
                    <span className="filter-chip filter-chip--on meta-chip meta-chip--muted">
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t("viewDetails", language)} →
                  </a>
                )}
              </div>
            </li>
          );
        })}
        {hasMore && (
          <li ref={listEndRef} className="event-list__load-more" aria-hidden="true">
            <span className="loading-dots loading-dots--inline">
              <span />
              <span />
              <span />
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
