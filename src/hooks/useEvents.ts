import { useCallback, useEffect, useState } from "react";
import type { MapEvent } from "../types/event";
import { buildEventDescription } from "../lib/descriptions";

interface UseEventsOptions {
  countryCode: string | null;
  categories: string[];
  enabled: boolean;
}

export function useTicketmasterEvents({
  countryCode,
  categories,
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
      const params = new URLSearchParams({ countryCode });
      if (categories.length) params.set("classification", categories.join(","));
      const res = await fetch(`/api/events/${countryCode}?${params}`);
      if (!res.ok) throw new Error("Events unavailable");
      const data = (await res.json()) as MapEvent[];
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
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [countryCode, categories, enabled]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading };
}
