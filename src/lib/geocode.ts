import type { Feature, FeatureCollection, Point } from "geojson";
import type { MapEvent, NagerHoliday } from "../types/event";
import { getPrimaryHolidayType } from "./categories";
import { buildHolidayDescription } from "./descriptions";

const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  US: [-98.5, 39.8],
  GB: [-2.5, 54.5],
  FR: [2.5, 46.5],
  DE: [10.5, 51.0],
  JP: [138.0, 36.0],
  AU: [134.0, -25.0],
  BR: [-52.0, -10.0],
  IN: [78.0, 22.0],
  CN: [104.0, 35.0],
  PL: [19.0, 52.0],
  VN: [106.0, 16.0],
};

export function getCountryCentroid(
  code: string,
  lng?: number,
  lat?: number,
): [number, number] {
  if (lng != null && lat != null) return [lng, lat];
  return COUNTRY_CENTROIDS[code] ?? [0, 20];
}

export function nagerToMapEvents(
  holidays: NagerHoliday[],
  centroid: [number, number],
  countryName?: string,
): MapEvent[] {
  return holidays.map((h, i) => ({
    id: `${h.source ?? "nager"}-${h.countryCode}-${h.date}-${i}`,
    source: h.source ?? "nager",
    title: h.name,
    localTitle: h.localName,
    startDate: h.date,
    category: "holiday",
    holidayTypes: h.types,
    countryCode: h.countryCode,
    countryName,
    region: h.counties?.[0] ?? undefined,
    lat: centroid[1] + (i % 5) * 0.15 - 0.3,
    lng: centroid[0] + Math.floor(i / 5) * 0.15 - 0.3,
    description: buildHolidayDescription(h, countryName),
    isGlobal: h.global,
  }));
}

export function filterEvents(
  events: MapEvent[],
  holidayTypes: string[],
  eventCategories: string[],
  nationalOnly: boolean,
  region?: string | null,
): MapEvent[] {
  return events.filter((e) => {
    if (region) {
      const matchRegion =
        e.region === region ||
        e.city === region ||
        (e.region && e.region.includes(region));
      if (!matchRegion) return false;
    }

    if (e.category === "holiday") {
      if (nationalOnly && e.isGlobal === false) return false;
      if (holidayTypes.length === 0) return false;
      const primary = e.holidayTypes
        ? getPrimaryHolidayType(e.holidayTypes)
        : "Public";
      return holidayTypes.includes(primary);
    }
    if (eventCategories.length === 0) return false;
    if (eventCategories.includes(e.category)) return true;
    return e.category === "other" || e.category === "community";
  });
}

export function holidaysToGeoJSON(
  events: MapEvent[],
): FeatureCollection<Point> {
  const features: Feature<Point>[] = events
    .filter((e) => e.lat != null && e.lng != null)
    .map((e) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [e.lng!, e.lat!],
      },
      properties: {
        id: e.id,
        title: e.title,
        date: e.startDate,
        type: e.holidayTypes?.[0] ?? "Public",
        category: e.category,
      },
    }));

  return { type: "FeatureCollection", features };
}

export function filterByTypes(
  events: MapEvent[],
  types: string[],
  nationalOnly: boolean,
): MapEvent[] {
  return events.filter((e) => {
    if (nationalOnly && e.isGlobal === false) return false;
    if (types.length === 0) return true;
    const primary = e.holidayTypes
      ? getPrimaryHolidayType(e.holidayTypes)
      : "Public";
    return types.includes(primary);
  });
}

export function filterByDateRange(
  events: MapEvent[],
  from: string,
  to: string,
): MapEvent[] {
  return events.filter((e) => e.startDate >= from && e.startDate <= to);
}

export function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr === today;
}

export function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getDatePresetRange(
  preset: string,
): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (preset) {
    case "this-week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: fmt(start), to: fmt(end) };
    }
    case "this-month": {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { from: fmt(start), to: fmt(end) };
    }
    case "next-3-months": {
      const end = new Date(now);
      end.setMonth(end.getMonth() + 3);
      return { from: fmt(now), to: fmt(end) };
    }
    case "this-year":
    default:
      return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
}

export function detectLongWeekends(
  events: MapEvent[],
): MapEvent[] {
  const holidayDates = new Set(events.map((e) => e.startDate));
  return events.map((e) => {
    const d = new Date(e.startDate + "T12:00:00");
    const day = d.getDay();
    const isFriday = day === 5;
    const isMonday = day === 1;
    const isThursday = day === 4;
    const isTuesday = day === 2;

    let isLongWeekend = false;
    if (isFriday || isMonday) {
      isLongWeekend = true;
    } else if (isThursday) {
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      isLongWeekend = holidayDates.has(fmt(next));
    } else if (isTuesday) {
      const prev = new Date(d);
      prev.setDate(d.getDate() - 1);
      isLongWeekend = holidayDates.has(fmt(prev));
    }

    return { ...e, isLongWeekend };
  });
}

function fmt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function generateIcs(events: MapEvent[], countryName: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sunny Atlas//Global Holidays//EN",
    `X-WR-CALNAME:${countryName} Holidays`,
  ];

  for (const e of events) {
    const date = e.startDate.replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@sunnyatlas`,
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${date}`,
      `SUMMARY:${e.localTitle || e.title}`,
      `DESCRIPTION:${e.title}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
