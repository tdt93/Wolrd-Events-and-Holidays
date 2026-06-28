import { useEffect, useState } from "react";
import type { AppLanguage } from "../hooks/useSettings";
import type { MapEvent } from "../types/event";
import { buildEventDescription } from "../lib/descriptions";
import { getCountryCentroid } from "../lib/geocode";
import { placeEventsOnMap } from "../lib/geocodePlaces";
import {
  sessionGet,
  sessionSet,
  ticketEventsCacheKey,
} from "../lib/sessionCache";

interface UseEventsOptions {
  countryCode: string | null;
  countryName?: string | null;
  centroid?: [number, number];
  categories: string[];
  from: string;
  to: string;
  enabled: boolean;
  language: AppLanguage;
}

export function useTicketmasterEvents({
  countryCode,
  countryName,
  centroid,
  categories,
  from,
  to,
  enabled,
  language,
}: UseEventsOptions) {
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryCode || !enabled) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const cacheKey = ticketEventsCacheKey(
      countryCode,
      from,
      to,
      language,
      categories,
    );
    const cached = sessionGet<MapEvent[]>(cacheKey);
    if (cached) {
      setEvents(cached);
      setLoading(false);
      return;
    }

    setLoading(true);

    let active = true;

    (async () => {
      try {
        const params = new URLSearchParams({ from, to, lang: language });
        if (categories.length) {
          params.set("classification", categories.join(","));
        }
        const res = await fetch(`/api/events/${countryCode}?${params}`);
        if (!res.ok) throw new Error("Events unavailable");
        const data = (await res.json()) as MapEvent[];
        if (!active) return;

        const football = data.filter((e) => e.source === "api-football").length;
        if (import.meta.env.DEV) {
          console.info(
            `[events] ${countryCode}: ${data.length} total (${football} football)`,
          );
        }

        const enriched = data.map((e) => ({
          ...e,
          description:
            e.description ??
            buildEventDescription(
              e.title,
              e.category,
              language,
              e.city,
              e.venue,
              e.info,
            ),
        }));
        setEvents(enriched);
        setLoading(false);

        const center = centroid ?? getCountryCentroid(countryCode);
        const placed = await placeEventsOnMap(
          enriched,
          countryCode,
          countryName ?? undefined,
          center,
        );
        if (active) {
          sessionSet(cacheKey, placed);
          setEvents(placed);
        }
      } catch (err) {
        if (!active) return;
        console.error("Events fetch failed:", countryCode, err);
        setEvents([]);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [countryCode, countryName, categories, from, to, enabled, language]);

  return { events, loading };
}
