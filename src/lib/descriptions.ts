import type { HolidayType, NagerHoliday } from "../types/event";
import { getPrimaryHolidayType } from "./categories";

const TYPE_SUMMARY: Record<HolidayType, string> = {
  Public: "A public holiday — typically a day off for schools and many workplaces.",
  Bank: "A bank holiday when banks and some businesses close.",
  School: "A school holiday or break for students and staff.",
  Observance: "A cultural or religious observance — not always a day off work.",
  Optional: "An optional holiday that employers may choose to observe.",
  Authorities: "A holiday observed by government and public authorities.",
};

export function buildHolidayDescription(
  h: NagerHoliday,
  countryName?: string,
): string {
  const primary = getPrimaryHolidayType(h.types ?? []);
  const parts: string[] = [];

  if (h.localName && h.localName !== h.name) {
    parts.push(`Locally known as “${h.localName}”.`);
  }

  if (h.global) {
    parts.push(
      countryName
        ? `Observed across ${countryName}.`
        : "Observed nationwide.",
    );
  } else if (h.counties?.length) {
    parts.push(
      `Regional holiday — applies in ${h.counties.length} area${h.counties.length > 1 ? "s" : ""}.`,
    );
  }

  parts.push(TYPE_SUMMARY[primary]);

  return parts.join(" ");
}

export function buildEventDescription(
  title: string,
  category: string,
  city?: string,
  venue?: string,
  info?: string,
): string {
  const cleaned = info?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned) return cleaned;

  const place = [venue, city].filter(Boolean).join(", ");
  const catLabels: Record<string, string> = {
    music: "Live music",
    festival: "Festival",
    sports: "Sports",
    arts: "Arts & culture",
    community: "Community",
    other: "Event",
  };
  const label = catLabels[category] ?? "Event";

  if (place) {
    return `${label} at ${place}.`;
  }

  return `${label}: ${title}.`;
}
