import type { MapEvent } from "../types/event";
import { getPrimaryHolidayType } from "./categories";
import type { HolidayType } from "../types/event";

const HOLIDAY_COLORS: Record<HolidayType, string> = {
  Public: "#f59e0b",
  Bank: "#0284c7",
  School: "#34d399",
  Observance: "#a78bfa",
  Optional: "#fbbf24",
  Authorities: "#64748b",
};

const EVENT_COLORS: Record<string, string> = {
  holiday: "#f59e0b",
  festival: "#e11d48",
  sports: "#0284c7",
  music: "#8b5cf6",
  arts: "#ec4899",
  community: "#14b8a6",
  other: "#94a3b8",
};

function markerColor(event: MapEvent): string {
  if (event.category !== "holiday") {
    return EVENT_COLORS[event.category] ?? EVENT_COLORS.other;
  }
  const type = event.holidayTypes
    ? getPrimaryHolidayType(event.holidayTypes)
    : "Public";
  return HOLIDAY_COLORS[type];
}

function markerGlyph(event: MapEvent): string {
  if (event.category === "festival") {
    return `<path d="M12 4l1.2 3.6H17l-3 2.2 1.2 3.6L12 11.2 8.8 13.4 10 10 7 7.6h3.8L12 4z" fill="#fff"/>`;
  }
  if (event.category === "sports") {
    return `<circle cx="12" cy="12" r="4.5" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M8 12h8M12 8v8" stroke="#fff" stroke-width="1.2"/>`;
  }
  if (event.category === "music") {
    return `<path d="M9.5 16.5V8.5l6-1.5v8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="16.5" r="2" fill="#fff"/><circle cx="14.5" cy="15" r="2" fill="#fff"/>`;
  }
  if (event.category === "arts") {
    return `<path d="M6 17l3-9 3 4 3-6 3 11H6z" fill="#fff"/>`;
  }
  // Holiday & default — confetti burst
  return `<circle cx="12" cy="12" r="2.2" fill="#fff"/><path d="M12 5v2M12 17v2M5 12h2M17 12h2M7.5 7.5l1.4 1.4M15.1 15.1l1.4 1.4M16.5 7.5l-1.4 1.4M8.9 15.1l-1.4 1.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
}

export function createEventMarkerSvg(event: MapEvent): string {
  const color = markerColor(event);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44" aria-hidden="true">
    <defs>
      <filter id="s" x="-20%" y="-10%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
      </filter>
    </defs>
    <path filter="url(#s)" d="M18 2C11.4 2 6 7.2 6 13.5c0 9.5 12 20.5 12 20.5s12-11 12-20.5C30 7.2 24.6 2 18 2z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
  <g transform="translate(6,5)">${markerGlyph(event)}</g>
  </svg>`;
}

export function createEventMarkerElement(event: MapEvent): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "map-event-marker";
  el.innerHTML = createEventMarkerSvg(event);
  el.setAttribute("aria-label", event.localTitle || event.title);
  return el;
}
