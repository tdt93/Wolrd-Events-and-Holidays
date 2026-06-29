import { useEffect, useMemo, useState } from "react";
import type { AppLanguage } from "./useSettings";
import type { MapEvent } from "../types/event";
import {
  EMPTY_GROUPED_SEARCH,
  mapNominatimCityHits,
  searchCountries,
  searchLoadedEvents,
  type GroupedSearchResults,
} from "../lib/globalSearch";

const CITY_DEBOUNCE_MS = 320;
const MIN_CITY_QUERY = 2;

interface NominatimSearchRow {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

export function useGroupedSearch(
  query: string,
  countries: { countryCode: string; name: string }[],
  searchableEvents: MapEvent[],
  language: AppLanguage,
) {
  const [cityResults, setCityResults] = useState<GroupedSearchResults["cities"]>(
    [],
  );
  const [citiesLoading, setCitiesLoading] = useState(false);

  const localResults = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return EMPTY_GROUPED_SEARCH;

    const { events, holidays } = searchLoadedEvents(
      trimmed,
      searchableEvents,
      language,
    );

    return {
      countries: searchCountries(trimmed, countries),
      cities: [] as GroupedSearchResults["cities"],
      events,
      holidays,
    };
  }, [query, countries, searchableEvents, language]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_CITY_QUERY) {
      setCityResults([]);
      setCitiesLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setCitiesLoading(true);
      try {
        const params = new URLSearchParams({
          q: trimmed,
          limit: "8",
        });
        const res = await fetch(`/api/geocode/search?${params}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) throw new Error("search_failed");
        const data = (await res.json()) as NominatimSearchRow[];
        if (cancelled) return;
        setCityResults(mapNominatimCityHits(data, language));
      } catch {
        if (!cancelled) setCityResults([]);
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    }, CITY_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, language]);

  const results = useMemo(
    (): GroupedSearchResults => ({
      ...localResults,
      cities: cityResults,
    }),
    [localResults, cityResults],
  );

  return { results, citiesLoading };
}
