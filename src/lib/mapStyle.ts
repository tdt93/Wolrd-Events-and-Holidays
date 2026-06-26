import type { StyleSpecification } from "maplibre-gl";

export const OCEAN_COLOR = "#7dd3fc";
export const PAGE_BG_COLOR = "#e0f2fe";
export const LAND_FILL_COLOR = "#f1f5f9";

/** Flat color basemap — ocean only; land comes from country GeoJSON layers */
export const MINIMAL_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "Sunny Atlas Flat",
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": OCEAN_COLOR,
      },
    },
  ],
};

export const LAND_LINE_COLOR = "#94a3b8";
