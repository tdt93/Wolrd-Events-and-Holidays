import { useEffect, useState } from "react";
import type { MapEvent } from "../types/event";
import { buildEventDescription } from "../lib/descriptions";
import { getCountryCentroid } from "../lib/geocode";
import { placeEventsOnMap } from "../lib/geocodePlaces";

interface UseEventsOptions {
  countryCode: string | null;
  countryName?: string | null;
  centroid?: [number, number];
  categories: string[];
  from: string;
  to: string;
  enabled: boolean;
}

export function useTicketmasterEvents({
  countryCode,
  countryName,
  centroid,
  categories,
  from,
  to,
  enabled,
}: UseEventsOptions) {
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryCode || !enabled) {
      setEvents([]);
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ from, to });
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
        if (active) setEvents(placed);
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
  }, [countryCode, countryName, centroid, categories, from, to, enabled]);

  return { events, loading };
}
