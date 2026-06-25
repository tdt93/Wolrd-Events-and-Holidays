import type { StyleSpecification } from "maplibre-gl";

/** Flat color basemap — no terrain or satellite texture */
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
        "background-color": "#bfdbfe",
      },
    },
  ],
};

export const LAND_FILL_COLOR = "#f1f5f9";
export const LAND_LINE_COLOR = "#94a3b8";
