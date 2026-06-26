import { useCallback, useEffect, useState } from "react";
import type { MapEvent } from "../types/event";
import { buildEventDescription } from "../lib/descriptions";

interface UseEventsOptions {
  countryCode: string | null;
  categories: string[];
  from: string;
  to: string;
  enabled: boolean;
}

export function useTicketmasterEvents({
  countryCode,
  categories,
  from,
  to,
  enabled,
}: UseEventsOptions) {
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!countryCode || !enabled) {
      setEvents([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ countryCode, from, to });
      if (categories.length) params.set("classification", categories.join(","));
      const res = await fetch(`/api/events/${countryCode}?${params}`);
      if (!res.ok) throw new Error("Events unavailable");
      const data = (await res.json()) as MapEvent[];
      const football = data.filter((e) => e.source === "api-football").length;
      if (import.meta.env.DEV && football > 0) {
        console.info(`[events] ${countryCode}: ${football} football fixtures`);
      }
      setEvents(
        data.map((e) => ({
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
        })),
      );
    } catch (err) {
      console.error("Events fetch failed:", countryCode, err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [countryCode, categories, from, to, enabled]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading };
}
