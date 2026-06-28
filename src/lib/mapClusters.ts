import Supercluster from "supercluster";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { Feature, Point } from "geojson";
import type { MapEvent } from "../types/event";

export type EventPointProps = {
  id: string;
  featured?: boolean;
};

export type ClusterPointProps = {
  cluster: true;
  cluster_id: number;
  point_count: number;
};

type EventPointFeature = Feature<Point, EventPointProps>;

export function buildEventClusterIndex(events: MapEvent[]) {
  const byId = new Map<string, MapEvent>();
  const features: EventPointFeature[] = [];

  for (const event of events) {
    if (event.lat == null || event.lng == null) continue;
    byId.set(event.id, event);
    features.push({
      type: "Feature",
      properties: {
        id: event.id,
        featured: event.featured,
      },
      geometry: {
        type: "Point",
        coordinates: [event.lng, event.lat],
      },
    });
  }

  const index = new Supercluster<EventPointProps, ClusterPointProps>({
    radius: 52,
    maxZoom: 15,
    minPoints: 2,
  });
  index.load(features);

  return { index, byId };
}

export function mapBounds(
  map: MaplibreMap,
): [number, number, number, number] {
  const b = map.getBounds();
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
}
