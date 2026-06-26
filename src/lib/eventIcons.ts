import type { MapEvent } from "../types/event";
import { getPrimaryHolidayType } from "./categories";
import type { HolidayType } from "../types/event";

const HOLIDAY_ICONS: Record<HolidayType, string> = {
  Public: "🎉",
  Bank: "🏦",
  School: "📚",
  Observance: "🎭",
  Optional: "✨",
  Authorities: "🏛️",
};

const EVENT_ICONS: Record<string, string> = {
  holiday: "🎉",
  festival: "🎪",
  sports: "⚽",
  music: "🎵",
  arts: "🎨",
  community: "🤝",
  other: "📍",
};

export function getEventIcon(event: MapEvent): string {
  if (event.category !== "holiday") {
    return EVENT_ICONS[event.category] ?? "📍";
  }
  const type = event.holidayTypes
    ? getPrimaryHolidayType(event.holidayTypes)
    : "Public";
  return HOLIDAY_ICONS[type];
}
