import type { AppLanguage } from "../hooks/useSettings";
import type { MapEvent } from "../types/event";
import { formatDisplayDate } from "./geocode";
import { eventPrimaryTitle } from "./eventDisplay";
import { countryNameInLang } from "./locale";

const SEARCH_ALIASES: Record<string, string> = {
  uk: "GB",
  gb: "GB",
  usa: "US",
  us: "US",
};

export interface SearchCountryHit {
  kind: "country";
  id: string;
  countryCode: string;
  name: string;
}

export interface SearchCityHit {
  kind: "city";
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  subtitle: string;
  lng: number;
  lat: number;
}

export interface SearchEventHit {
  kind: "event";
  id: string;
  eventId: string;
  title: string;
  subtitle: string;
  countryCode: string;
  startDate: string;
}

export interface SearchHolidayHit {
  kind: "holiday";
  id: string;
  eventId: string;
  title: string;
  subtitle: string;
  countryCode: string;
  startDate: string;
}

export interface GroupedSearchResults {
  countries: SearchCountryHit[];
  cities: SearchCityHit[];
  events: SearchEventHit[];
  holidays: SearchHolidayHit[];
}

export const EMPTY_GROUPED_SEARCH: GroupedSearchResults = {
  countries: [],
  cities: [],
  events: [],
  holidays: [],
};

const GROUP_LIMIT = 5;

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesQuery(text: string | undefined, query: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(query);
}

export function searchCountries(
  query: string,
  countries: { countryCode: string; name: string }[],
): SearchCountryHit[] {
  const q = normalizeQuery(query);
  if (!q) return [];

  const aliasCode = SEARCH_ALIASES[q];

  return countries
    .filter((country) => {
      const code = country.countryCode.toLowerCase();
      const name = country.name.toLowerCase();
      return (
        name.includes(q) ||
        code.includes(q) ||
        (aliasCode != null && country.countryCode === aliasCode)
      );
    })
    .slice(0, GROUP_LIMIT)
    .map((country) => ({
      kind: "country" as const,
      id: `country-${country.countryCode}`,
      countryCode: country.countryCode,
      name: country.name,
    }));
}

function eventSearchText(event: MapEvent, language: AppLanguage): string {
  return [
    event.title,
    event.localTitle,
    event.city,
    event.region,
    event.venue,
    event.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function searchLoadedEvents(
  query: string,
  events: MapEvent[],
  language: AppLanguage,
): { events: SearchEventHit[]; holidays: SearchHolidayHit[] } {
  const q = normalizeQuery(query);
  if (!q) return { events: [], holidays: [] };

  const eventHits: SearchEventHit[] = [];
  const holidayHits: SearchHolidayHit[] = [];

  for (const event of events) {
    if (!matchesQuery(eventSearchText(event, language), q)) continue;

    const title = eventPrimaryTitle(event, language);
    const place = [event.city, event.region].filter(Boolean).join(", ");
    const subtitle = [formatDisplayDate(event.startDate), place]
      .filter(Boolean)
      .join(" · ");

    if (event.category === "holiday") {
      if (holidayHits.length >= GROUP_LIMIT) continue;
      holidayHits.push({
        kind: "holiday",
        id: `holiday-${event.id}`,
        eventId: event.id,
        title,
        subtitle,
        countryCode: event.countryCode,
        startDate: event.startDate,
      });
      continue;
    }

    if (eventHits.length >= GROUP_LIMIT) continue;
    eventHits.push({
      kind: "event",
      id: `event-${event.id}`,
      eventId: event.id,
      title,
      subtitle,
      countryCode: event.countryCode,
      startDate: event.startDate,
    });
  }

  return { events: eventHits, holidays: holidayHits };
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  country?: string;
  country_code?: string;
}

interface NominatimSearchRow {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
  address?: NominatimAddress;
}

function cityNameFromAddress(address?: NominatimAddress): string | null {
  if (!address) return null;
  return (
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    null
  );
}

function isPlaceResult(row: NominatimSearchRow): boolean {
  if (row.class === "place") return true;
  const type = row.type ?? "";
  return ["city", "town", "village", "administrative"].includes(type);
}

export function mapNominatimCityHits(
  rows: NominatimSearchRow[],
  language: AppLanguage,
): SearchCityHit[] {
  const hits: SearchCityHit[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!isPlaceResult(row)) continue;

    const address = row.address;
    const countryCode = address?.country_code?.toUpperCase();
    if (!countryCode) continue;

    const name = cityNameFromAddress(address) ?? row.display_name.split(",")[0]?.trim();
    if (!name) continue;

    const dedupeKey = `${countryCode}:${name.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const countryName =
      countryNameInLang(countryCode, language) ?? address?.country ?? countryCode;
    const subtitle = [address?.state, countryName].filter(Boolean).join(", ");

    hits.push({
      kind: "city",
      id: `city-${row.place_id}`,
      name,
      countryCode,
      countryName,
      subtitle,
      lng: parseFloat(row.lon),
      lat: parseFloat(row.lat),
    });

    if (hits.length >= GROUP_LIMIT) break;
  }

  return hits;
}

export function hasGroupedSearchResults(results: GroupedSearchResults): boolean {
  return (
    results.countries.length > 0 ||
    results.cities.length > 0 ||
    results.events.length > 0 ||
    results.holidays.length > 0
  );
}
