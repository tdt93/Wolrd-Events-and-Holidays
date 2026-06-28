import type { MapEvent } from "../types/event";
import { getPrimaryHolidayType } from "./categories";
import type { HolidayType } from "../types/event";

const INK = "#1e293b";

const HOLIDAY_COLORS: Record<HolidayType, string> = {
  Public: "#fde68a",
  Bank: "#bae6fd",
  School: "#bbf7d0",
  Observance: "#e9d5ff",
  Optional: "#fef08a",
  Authorities: "#e2e8f0",
};

const EVENT_COLORS: Record<string, string> = {
  holiday: "#fde68a",
  festival: "#fecdd3",
  sports: "#bae6fd",
  music: "#ddd6fe",
  arts: "#fbcfe8",
  community: "#ccfbf1",
  other: "#f1f5f9",
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
    return `<path d="M12 4.2l1.1 3.4h3.5l-2.8 2 1 3.4L12 11l-2.8 2 1-3.4-2.8-2h3.5z" fill="${INK}" stroke="none"/>`;
  }
  if (event.category === "sports") {
    return `<circle cx="12" cy="12" r="4.2" fill="none" stroke="${INK}" stroke-width="1.8"/><path d="M8.2 12h7.6M12 8.2v7.6" stroke="${INK}" stroke-width="1.4"/>`;
  }
  if (event.category === "music") {
    return `<path d="M9.8 16.2V8.8l5.8-1.4v7.4" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/><circle cx="8.4" cy="16.2" r="1.8" fill="${INK}"/><circle cx="14.6" cy="14.8" r="1.8" fill="${INK}"/>`;
  }
  if (event.category === "arts") {
    return `<path d="M6.4 17l2.8-8.2 2.6 3.6 2.8-5.4 2.8 9.8H6.4z" fill="${INK}" stroke="none"/>`;
  }
  return `<circle cx="12" cy="12" r="2" fill="${INK}"/><path d="M12 5.4v2.2M12 16.4v2.2M5.4 12h2.2M16.4 12h2.2M7.8 7.8l1.5 1.5M14.7 14.7l1.5 1.5M16.2 7.8l-1.5 1.5M9.3 14.7l-1.5 1.5" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`;
}

export function createEventMarkerSvg(event: MapEvent): string {
  const color = markerColor(event);
  const featured = event.featured
    ? ` stroke="#b45309" stroke-width="3"`
    : ` stroke="${INK}" stroke-width="2.4"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="46" viewBox="0 0 38 46" aria-hidden="true">
    <path d="M19 3.4c-6.2 0.5-11 5.6-10.5 11.8.3 4.4 3.2 8 7.4 9" fill="none" stroke="rgba(30,41,59,0.25)" stroke-width="2" stroke-linecap="round"/>
    <path d="M19 2.8C12.6 2.8 7.4 8 7.4 14.2c0 7.6 11.6 17.8 11.6 17.8S30.6 21.8 30.6 14.2C30.6 8 25.4 2.8 19 2.8z" fill="${color}"${featured} stroke-linejoin="round"/>
    <path d="M19 21.6 L17.9 38.8 M19 21.6 L20.3 38.4" stroke="#64748b" stroke-width="1.8" stroke-linecap="round"/>
    <g transform="translate(7,5.5) scale(0.92)">${markerGlyph(event)}</g>
  </svg>`;
}

export function createEventMarkerElement(event: MapEvent): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `map-event-marker map-event-marker--doodle${event.featured ? " map-event-marker--featured" : ""}`;
  el.innerHTML = createEventMarkerSvg(event);
  el.setAttribute("aria-label", event.localTitle || event.title);
  return el;
}

export function createClusterMarkerElement(count: number): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "map-cluster-marker map-cluster-marker--doodle";
  el.textContent = String(count);
  el.setAttribute("aria-label", `${count} events`);
  return el;
}
