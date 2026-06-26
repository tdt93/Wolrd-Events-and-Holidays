import type { FeatureCollection, Point } from "geojson";
import type { MapEvent } from "../types/event";
import { getEventIcon } from "./eventIcons";

export function eventsToMarkerGeoJSON(events: MapEvent[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: events
      .filter((e) => e.lat != null && e.lng != null)
      .map((e) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [e.lng!, e.lat!],
        },
        properties: {
          id: e.id,
          icon: getEventIcon(e),
          title: e.localTitle || e.title,
          description: e.description ?? "",
          date: e.startDate,
        },
      })),
  };
}
