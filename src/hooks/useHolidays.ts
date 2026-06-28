import { useCallback, useEffect, useState } from "react";
import type { AppLanguage } from "../hooks/useSettings";
import type { MapEvent, NagerHoliday } from "../types/event";
import {
  detectLongWeekends,
  getCountryCentroid,
  nagerToMapEvents,
} from "../lib/geocode";
import { placeEventsOnMap } from "../lib/geocodePlaces";
import {
  holidaysCacheKey,
  sessionGet,
  sessionSet,
} from "../lib/sessionCache";

interface UseHolidaysOptions {
  countryCode: string | null;
  countryName?: string | null;
  year: number;
  centroid?: [number, number];
  language: AppLanguage;
}

export function useHolidays({
  countryCode,
  countryName,
  year,
  centroid,
  language,
}: UseHolidaysOptions) {
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!countryCode) return;

    const cacheKey = holidaysCacheKey(countryCode, year, language);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/holidays/${countryCode}?year=${year}&lang=${language}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to load holidays (${res.status})`);
      }
      const data = (await res.json()) as NagerHoliday[];
      const center = centroid ?? getCountryCentroid(countryCode);
      const mapped = detectLongWeekends(
        nagerToMapEvents(data, center, countryName ?? undefined, language),
      );
      const placed = await placeEventsOnMap(
        mapped,
        countryCode,
        countryName ?? undefined,
        center,
      );
      sessionSet(cacheKey, placed);
      setEvents(placed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [countryCode, countryName, year, centroid, language]);

  useEffect(() => {
    if (!countryCode) {
      setEvents([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cacheKey = holidaysCacheKey(countryCode, year, language);
    const cached = sessionGet<MapEvent[]>(cacheKey);
    if (cached) {
      setEvents(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setError(null);
    setLoading(true);

    let active = true;

    (async () => {
      try {
        const res = await fetch(
          `/api/holidays/${countryCode}?year=${year}&lang=${language}`,
        );
        if (!res.ok) {
          throw new Error(`Failed to load holidays (${res.status})`);
        }
        const data = (await res.json()) as NagerHoliday[];
        if (!active) return;

        const center = centroid ?? getCountryCentroid(countryCode);
        const mapped = detectLongWeekends(
          nagerToMapEvents(data, center, countryName ?? undefined, language),
        );
        const placed = await placeEventsOnMap(
          mapped,
          countryCode,
          countryName ?? undefined,
          center,
        );
        sessionSet(cacheKey, placed);
        if (active) setEvents(placed);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setEvents([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [countryCode, countryName, year, language]);

  return { events, loading, error, refetch };
}

export function useCountries() {
  const [countries, setCountries] = useState<
    { countryCode: string; name: string }[]
  >([]);

  useEffect(() => {
    const cached = sessionGet<{ countryCode: string; name: string }[]>(
      "countries:list",
    );
    if (cached?.length) {
      setCountries(cached);
      return;
    }

    fetch("/api/countries")
      .then((r) => r.json())
      .then((data: { countryCode: string; name: string }[]) => {
        sessionSet("countries:list", data);
        setCountries(data);
      })
      .catch(() => setCountries([]));
  }, []);

  return countries;
}

export function useCountryHeatmap(
  year: number,
  from: string,
  to: string,
  enabled: boolean,
) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) return;

    const cacheKey = `heatmap:${year}:${from}:${to}`;
    const cached = sessionGet<Record<string, number>>(cacheKey);
    if (cached) {
      setCounts(cached);
      return;
    }

    let cancelled = false;
    fetch(`/api/holidays/heatmap?year=${year}&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data: Record<string, number>) => {
        if (!cancelled) {
          sessionSet(cacheKey, data);
          setCounts(data);
        }
      })
      .catch(() => {
        if (!cancelled) setCounts({});
      });

    return () => {
      cancelled = true;
    };
  }, [year, from, to, enabled]);

  return counts;
}
