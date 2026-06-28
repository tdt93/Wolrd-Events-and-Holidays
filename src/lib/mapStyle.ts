import type { StyleSpecification } from "maplibre-gl";

/** Light sky — page background behind the map */
export const PAGE_BG_COLOR = "#b8e4f8";

/** Bright ocean blue — lighter and less green than before */
export const OCEAN_COLOR = "#5eb8f2";

/** Cream paper land fill */
export const LAND_FILL_COLOR = "#f5edd8";
export const LAND_FILL_HOVER = "#dceefb";
export const LAND_FILL_SELECTED = "#fde68a";

/** Dark ink borders — hand-drawn feel */
export const LAND_LINE_COLOR = "#1e293b";
export const LAND_LINE_HOVER = "#0284c7";
export const LAND_LINE_SELECTED = "#b45309";

export const REGION_FILL_DEFAULT = "#ebe3d0";
export const REGION_FILL_SELECTED = "#a8daf5";
export const REGION_LINE_DEFAULT = "#334155";
export const REGION_LINE_SELECTED = "#0369a1";

export const CITY_FILL_COLOR = "#e8dfc8";
export const CITY_LINE_COLOR = "#475569";

export const LABEL_HALO_COLOR = "#f5edd8";
export const LABEL_TEXT_COLOR = "#1e293b";

/** Flat color basemap — ocean only; land comes from country GeoJSON layers */
export const MINIMAL_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "FestSeekr Doodle",
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
