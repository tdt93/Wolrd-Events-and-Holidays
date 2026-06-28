import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import type { MapEvent } from "../types/event";
import { humanizeRegion } from "./eventGeo";

export function boundaryFeatureName(feature: Feature): string {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  return String(
    props.name ?? props.shapeName ?? props.NAME ?? props.admin ?? "",
  ).trim();
}

export function normalizeRegionText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function enrichRegionGeoJson(geo: FeatureCollection): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: geo.features.map((feature, index) => {
      const name = boundaryFeatureName(feature);
      return {
        ...feature,
        id: feature.id ?? index,
        properties: {
          ...(feature.properties ?? {}),
          name,
        },
      };
    }),
  };
}

export function extractRegionNames(geo: FeatureCollection): string[] {
  const names = geo.features
    .map((f) => boundaryFeatureName(f))
    .filter(Boolean);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

export function findRegionFeature(
  geo: FeatureCollection,
  regionName: string,
): Feature | undefined {
  const target = normalizeRegionText(regionName);
  return geo.features.find(
    (f) => normalizeRegionText(boundaryFeatureName(f)) === target,
  );
}

function regionCodeMatchesName(
  code: string,
  regionName: string,
  countryCode: string,
): boolean {
  const target = normalizeRegionText(regionName);
  const humanized = humanizeRegion(code, countryCode);
  const candidates = [code, humanized, code.split("-").pop() ?? ""]
    .map(normalizeRegionText)
    .filter(Boolean);
  return candidates.some(
    (c) => c === target || c.includes(target) || target.includes(c),
  );
}

function eventRegionCandidates(
  event: MapEvent,
  countryCode: string,
): string[] {
  const out: string[] = [];
  if (event.region) {
    out.push(event.region);
    out.push(humanizeRegion(event.region, countryCode));
  }
  if (event.city) out.push(event.city);
  return out.filter(Boolean);
}

/** Whether an event should appear when a map region filter is active. */
export function eventPassesRegionFilter(
  event: MapEvent,
  regionName: string | null | undefined,
  countryCode: string,
  regionGeo?: FeatureCollection | null,
): boolean {
  if (!regionName) return true;

  if (event.category === "holiday") {
    const regional =
      event.isGlobal === false ||
      (event.holidayRegions != null && event.holidayRegions.length > 0);
    if (!regional) return true;
  }

  if (eventMatchesRegion(event, regionName, countryCode)) return true;

  if (regionGeo && event.lat != null && event.lng != null) {
    const feature = findRegionFeature(regionGeo, regionName);
    if (feature) {
      try {
        if (
          booleanPointInPolygon(
            point([event.lng, event.lat]),
            feature as Feature<Polygon | MultiPolygon>,
          )
        ) {
          return true;
        }
      } catch {
        /* ignore invalid geometry */
      }
    }
  }

  return false;
}

export function eventMatchesRegion(
  event: MapEvent,
  regionName: string,
  countryCode: string,
): boolean {
  const target = normalizeRegionText(regionName);
  if (!target) return true;

  if (event.holidayRegions?.length) {
    for (const code of event.holidayRegions) {
      if (regionCodeMatchesName(code, regionName, countryCode)) return true;
    }
  }

  for (const candidate of eventRegionCandidates(event, countryCode)) {
    const norm = normalizeRegionText(candidate);
    if (!norm) continue;
    if (norm === target || norm.includes(target) || target.includes(norm)) {
      return true;
    }
  }
  return false;
}
