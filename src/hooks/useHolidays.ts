import { useCallback, useEffect, useState } from "react";
import type { MapEvent, NagerHoliday } from "../types/event";
import {
  detectLongWeekends,
  getCountryCentroid,
  nagerToMapEvents,
} from "../lib/geocode";
import { placeEventsOnMap } from "../lib/geocodePlaces";

interface UseHolidaysOptions {
  countryCode: string | null;
  countryName?: string | null;
  year: number;
  centroid?: [number, number];
}

export function useHolidays({
  countryCode,
  countryName,
  year,
  centroid,
}: UseHolidaysOptions) {
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHolidays = useCallback(async () => {
    if (!countryCode) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/holidays/${countryCode}?year=${year}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to load holidays (${res.status})`);
      }
      const data = (await res.json()) as NagerHoliday[];
      const center = centroid ?? getCountryCentroid(countryCode);
      const mapped = detectLongWeekends(
        nagerToMapEvents(data, center, countryName ?? undefined),
      );
      const placed = await placeEventsOnMap(
        mapped,
        countryCode,
        countryName ?? undefined,
        center,
      );
      setEvents(placed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [countryCode, countryName, year, centroid]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  return { events, loading, error, refetch: fetchHolidays };
}

export function useCountries() {
  const [countries, setCountries] = useState<
    { countryCode: string; name: string }[]
  >([]);

  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then(setCountries)
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

    let cancelled = false;
    fetch(`/api/holidays/heatmap?year=${year}&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data: Record<string, number>) => {
        if (!cancelled) setCounts(data);
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
