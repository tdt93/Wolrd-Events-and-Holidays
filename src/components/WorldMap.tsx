import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import simplify from "@turf/simplify";
import bbox from "@turf/bbox";
import centroid from "@turf/centroid";
import type { Feature, FeatureCollection, Geometry, Point } from "geojson";
import type { MapEvent } from "../types/event";
import type { SelectedCountry } from "../hooks/useMapSelection";
import { findRegionFeature } from "../lib/regions";
import {
  COUNTRY_GEOJSON_URL,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  countryCodeFromProps,
  countryNameFromProps,
} from "../lib/mapConfig";
import {
  CITY_FILL_COLOR,
  CITY_LINE_COLOR,
  LABEL_HALO_COLOR,
  LABEL_TEXT_COLOR,
  LAND_FILL_COLOR,
  LAND_FILL_HOVER,
  LAND_FILL_SELECTED,
  LAND_LINE_COLOR,
  LAND_LINE_HOVER,
  LAND_LINE_SELECTED,
  MINIMAL_MAP_STYLE,
  REGION_FILL_DEFAULT,
  REGION_FILL_SELECTED,
  REGION_LINE_DEFAULT,
  REGION_LINE_SELECTED,
} from "../lib/mapStyle";
import { resolveCountryCode, iso2ToName } from "../lib/iso";
import { countryNameInLang, t } from "../lib/locale";
import { eventPrimaryTitle } from "../lib/eventDisplay";
import { formatDisplayDate } from "../lib/geocode";
import type { AppLanguage } from "../hooks/useSettings";
import { createClusterMarkerElement, createEventMarkerElement } from "../lib/markerIcons";
import {
  buildEventClusterIndex,
  mapBounds,
  type ClusterPointProps,
  type EventPointProps,
} from "../lib/mapClusters";

const SOURCE_ID = "countries";
const LABEL_SOURCE = "country-labels";
const REGION_SOURCE = "regions";
const CITY_SOURCE = "cities";
const FILL_LAYER = "countries-fill";
const HEAT_LAYER = "countries-heat";
const LINE_LAYER = "countries-line";
const REGION_LINE = "regions-line";
const REGION_FILL = "regions-fill";
const REGION_LABEL = "regions-label";
const CITY_LINE = "cities-line";
const CITY_FILL = "cities-fill";
const CITY_LABEL = "cities-label";
const COUNTRY_LABEL = "country-labels";

function fitMaxZoom(box: [number, number, number, number]): number {
  const span = Math.max(box[2] - box[0], box[3] - box[1]);
  if (span < 3) return 9;
  if (span < 8) return 7.5;
  if (span < 18) return 6;
  return 5;
}

function setBoundaryData(
  map: maplibregl.Map,
  sourceId: string,
  geo: FeatureCollection,
) {
  const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  source.setData(geo);
}

interface WorldMapProps {
  isGlobe: boolean;
  selectedCountry: SelectedCountry | null;
  selectedRegion: string | null;
  onRegionSelect: (region: string | null) => void;
  regionGeo: FeatureCollection;
  cityGeo: FeatureCollection;
  hoveredCode: string | null;
  onHover: (code: string | null) => void;
  onSelect: (country: SelectedCountry) => void;
  events: MapEvent[];
  heatmapCounts: Record<string, number>;
  showHeatmap: boolean;
  showCountryNames: boolean;
  regionsLoading?: boolean;
  language: AppLanguage;
}

interface MapTooltip {
  x: number;
  y: number;
  title: string;
  body: string;
  date?: string;
  url?: string;
  imageUrl?: string;
  pinned: boolean;
}

function enrichGeoJson(geo: FeatureCollection): FeatureCollection {
  const features = geo.features
    .map((f) => {
      const iso2 = resolveCountryCode(
        String(f.id ?? "") ||
          (countryCodeFromProps(
            (f.properties ?? {}) as Record<string, unknown>,
          ) ?? ""),
      );
      if (!iso2) return null;
      return {
        ...f,
        id: iso2,
        properties: {
          ...(f.properties ?? {}),
          iso2,
          name:
            countryNameFromProps(
              (f.properties ?? {}) as Record<string, unknown>,
            ) || iso2ToName(iso2) || iso2,
        },
      } as Feature;
    })
    .filter(Boolean) as Feature[];

  const enriched: FeatureCollection = { type: "FeatureCollection", features };
  try {
    return simplify(enriched, { tolerance: 0.12, highQuality: false });
  } catch {
    return enriched;
  }
}

function countriesToLabels(
  geo: FeatureCollection,
  language: AppLanguage,
): FeatureCollection<Point> {
  const features = geo.features.map((f) => {
    const c = centroid(f as Feature<Geometry>);
    const props = f.properties as Record<string, unknown>;
    const iso2 = (props?.iso2 as string) || "";
    const name =
      countryNameInLang(iso2, language) ||
      (props?.name as string) ||
      iso2ToName(iso2) ||
      "";
    return {
      type: "Feature",
      geometry: c.geometry as Point,
      properties: { name, iso2 },
    } as Feature<Point>;
  });
  return { type: "FeatureCollection", features };
}

function featureCode(feature: Feature): string | null {
  const props = feature.properties as Record<string, unknown> | null;
  return (
    (props?.iso2 as string) ||
    resolveCountryCode(
      String(feature.id ?? "") ||
        (countryCodeFromProps(props ?? {}) ?? ""),
    )
  );
}

function safeMapOp(
  map: maplibregl.Map | null,
  fn: (map: maplibregl.Map) => void,
) {
  if (!map) return;
  try {
    fn(map);
  } catch (err) {
    console.warn("Map operation skipped:", err);
  }
}

function refreshMapView(map: maplibregl.Map) {
  requestAnimationFrame(() => {
    map.resize();
    map.triggerRepaint();
    requestAnimationFrame(() => {
      map.resize();
      map.triggerRepaint();
    });
  });
}

export function WorldMap({
  isGlobe,
  selectedCountry,
  selectedRegion,
  onRegionSelect,
  regionGeo,
  cityGeo,
  hoveredCode,
  onHover,
  onSelect,
  events,
  heatmapCounts,
  showHeatmap,
  showCountryNames,
  regionsLoading = false,
  language,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const geoRef = useRef<FeatureCollection | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const clusterIndexRef = useRef<
    import("supercluster").default<EventPointProps, ClusterPointProps> | null
  >(null);
  const eventsByIdRef = useRef<Map<string, MapEvent>>(new Map());
  const layersReadyRef = useRef(false);
  const interactionsReadyRef = useRef(false);
  const isGlobeRef = useRef(isGlobe);
  const languageRef = useRef(language);
  const onRegionSelectRef = useRef(onRegionSelect);
  const selectedRegionRef = useRef(selectedRegion);
  const lastFitCountryRef = useRef<string | null>(null);
  const pinnedEventIdRef = useRef<string | null>(null);
  const [tooltip, setTooltip] = useState<MapTooltip | null>(null);

  const clearTooltip = useCallback(() => {
    pinnedEventIdRef.current = null;
    setTooltip(null);
  }, []);

  isGlobeRef.current = isGlobe;
  languageRef.current = language;
  onRegionSelectRef.current = onRegionSelect;
  selectedRegionRef.current = selectedRegion;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pinnedEventIdRef.current) clearTooltip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearTooltip]);

  const updateCountryPaint = useCallback(
    (map: maplibregl.Map) => {
      if (!layersReadyRef.current || !map.getLayer(LINE_LAYER)) return;

      const selected = selectedCountry?.code ?? "";
      const hovered = hoveredCode ?? "";
      const maxCount = Math.max(1, ...Object.values(heatmapCounts));

      map.setPaintProperty(FILL_LAYER, "fill-color", [
        "case",
        ["==", ["get", "iso2"], selected],
        LAND_FILL_SELECTED,
        ["==", ["get", "iso2"], hovered],
        LAND_FILL_HOVER,
        LAND_FILL_COLOR,
      ]);

      map.setPaintProperty(HEAT_LAYER, "fill-opacity", showHeatmap ? 0.72 : 0);
      map.setPaintProperty(HEAT_LAYER, "fill-color", [
        "interpolate",
        ["linear"],
        ["/", ["coalesce", ["get", "holidayCount"], 0], maxCount],
        0,
        "rgba(255,255,255,0)",
        0.15,
        "#fef08a",
        0.5,
        "#fb923c",
        1,
        "#e11d48",
      ]);

      map.setPaintProperty(LINE_LAYER, "line-color", [
        "case",
        ["==", ["get", "iso2"], selected],
        LAND_LINE_SELECTED,
        ["==", ["get", "iso2"], hovered],
        LAND_LINE_HOVER,
        LAND_LINE_COLOR,
      ]);

      map.setPaintProperty(LINE_LAYER, "line-width", [
        "interpolate",
        ["linear"],
        ["zoom"],
        1,
        [
          "case",
          ["==", ["get", "iso2"], selected],
          2.8,
          ["==", ["get", "iso2"], hovered],
          2.2,
          1.4,
        ],
        4,
        [
          "case",
          ["==", ["get", "iso2"], selected],
          3.6,
          ["==", ["get", "iso2"], hovered],
          2.8,
          1.9,
        ],
        8,
        [
          "case",
          ["==", ["get", "iso2"], selected],
          4.4,
          ["==", ["get", "iso2"], hovered],
          3.4,
          2.8,
        ],
      ]);
    },
    [selectedCountry?.code, hoveredCode, heatmapCounts, showHeatmap],
  );

  const updateRegionPaint = useCallback(
    (map: maplibregl.Map, region: string | null) => {
      if (!layersReadyRef.current || !map.getLayer(REGION_FILL)) return;

      const sel = region ?? "";
      const hasSelection = Boolean(sel);

      map.setPaintProperty(REGION_FILL, "fill-color", [
        "case",
        ["==", ["get", "name"], sel],
        REGION_FILL_SELECTED,
        REGION_FILL_DEFAULT,
      ]);

      map.setPaintProperty(REGION_FILL, "fill-opacity", [
        "case",
        ["==", ["get", "name"], sel],
        0.5,
        hasSelection ? 0.1 : 0.24,
      ]);

      map.setPaintProperty(REGION_LINE, "line-color", [
        "case",
        ["==", ["get", "name"], sel],
        REGION_LINE_SELECTED,
        REGION_LINE_DEFAULT,
      ]);

      map.setPaintProperty(REGION_LINE, "line-width", [
        "interpolate",
        ["linear"],
        ["zoom"],
        2,
        ["case", ["==", ["get", "name"], sel], 2.6, 1.3],
        5,
        ["case", ["==", ["get", "name"], sel], 3.2, 1.7],
        8,
        ["case", ["==", ["get", "name"], sel], 3.6, 2.2],
      ]);
    },
    [],
  );

  const applyHeatmapCounts = useCallback(
    (map: maplibregl.Map) => {
      const geo = geoRef.current;
      if (!geo || !map.getSource(SOURCE_ID)) return;

      const features = geo.features.map((f) => {
        const code = featureCode(f);
        return {
          ...f,
          properties: {
            ...(f.properties ?? {}),
            holidayCount: code ? (heatmapCounts[code] ?? 0) : 0,
          },
        };
      });

      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
      source.setData({ type: "FeatureCollection", features });
    },
    [heatmapCounts],
  );

  const applyRegionGeo = useCallback(
    (map: maplibregl.Map, geo: FeatureCollection, region: string | null) => {
      if (!map.getSource(REGION_SOURCE)) return;
      setBoundaryData(map, REGION_SOURCE, geo);
      updateRegionPaint(map, region);
    },
    [updateRegionPaint],
  );

  const applyCityGeo = useCallback((map: maplibregl.Map, geo: FeatureCollection) => {
    if (!map.getSource(CITY_SOURCE)) return;
    setBoundaryData(map, CITY_SOURCE, geo);
  }, []);

  const applyProjectionMode = useCallback((map: maplibregl.Map, globe: boolean) => {
    const center = map.getCenter();
    const zoom = map.getZoom();

    map.setProjection({ type: globe ? "globe" : "mercator" });

    if (globe) {
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
      map.jumpTo({ center, zoom });
    } else {
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.easeTo({ center, zoom, pitch: 0, bearing: 0, duration: 400 });
    }

    refreshMapView(map);
  }, []);

  const selectFeature = useCallback(
    (feature: Feature) => {
      const props = feature.properties as Record<string, unknown>;
      const code = featureCode(feature);
      if (!code) return;

      const c = centroid(feature as Feature<Geometry>);
      const [lng, lat] = c.geometry.coordinates;
      const box = bbox(feature) as [number, number, number, number];

      onSelect({
        code,
        name: (props.name as string) || iso2ToName(code) || code,
        centroid: [lng, lat],
        bbox: box,
      });
    },
    [onSelect],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let map: maplibregl.Map | null = null;

    const setupLayers = (targetMap: maplibregl.Map, geo: FeatureCollection) => {
      if (cancelled || targetMap.getSource(SOURCE_ID)) return;

      geoRef.current = geo;
      const labels = countriesToLabels(geo, languageRef.current);

      targetMap.addSource(SOURCE_ID, {
        type: "geojson",
        data: geo,
        generateId: false,
      });

      targetMap.addSource(LABEL_SOURCE, {
        type: "geojson",
        data: labels,
      });

      targetMap.addSource(REGION_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      targetMap.addSource(CITY_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Land base
      targetMap.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: SOURCE_ID,
        paint: { "fill-color": LAND_FILL_COLOR, "fill-opacity": 1 },
      });

      // Heatmap overlay on land
      targetMap.addLayer({
        id: HEAT_LAYER,
        type: "fill",
        source: SOURCE_ID,
        paint: { "fill-color": "#fef08a", "fill-opacity": 0 },
      });

      // Country borders
      targetMap.addLayer({
        id: LINE_LAYER,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": LAND_LINE_COLOR,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            1,
            1.4,
            4,
            1.9,
            8,
            2.8,
          ],
          "line-opacity": 0.98,
        },
      });

      // Region subdivisions (states/provinces)
      targetMap.addLayer({
        id: REGION_FILL,
        type: "fill",
        source: REGION_SOURCE,
        minzoom: 2,
        paint: {
          "fill-color": REGION_FILL_DEFAULT,
          "fill-opacity": 0.28,
        },
      });

      targetMap.addLayer({
        id: REGION_LINE,
        type: "line",
        source: REGION_SOURCE,
        minzoom: 2,
        paint: {
          "line-color": REGION_LINE_DEFAULT,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            1.3,
            5,
            1.8,
            8,
            2.4,
          ],
          "line-opacity": 0.95,
        },
      });

      // County / district grids (ADM2)
      targetMap.addLayer({
        id: CITY_FILL,
        type: "fill",
        source: CITY_SOURCE,
        minzoom: 4,
        paint: {
          "fill-color": CITY_FILL_COLOR,
          "fill-opacity": 0.1,
        },
      });

      targetMap.addLayer({
        id: CITY_LINE,
        type: "line",
        source: CITY_SOURCE,
        minzoom: 4,
        paint: {
          "line-color": CITY_LINE_COLOR,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            4,
            0.9,
            8,
            1.4,
            11,
            1.8,
          ],
          "line-opacity": 0.8,
          "line-dasharray": [3, 2],
        },
      });

      targetMap.addLayer({
        id: REGION_LABEL,
        type: "symbol",
        source: REGION_SOURCE,
        minzoom: 3,
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 7, 13],
          "text-allow-overlap": false,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": LABEL_TEXT_COLOR,
          "text-halo-color": LABEL_HALO_COLOR,
          "text-halo-width": 2,
        },
      });

      targetMap.addLayer({
        id: CITY_LABEL,
        type: "symbol",
        source: CITY_SOURCE,
        minzoom: 6,
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 6, 9, 9, 11],
          "text-allow-overlap": false,
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        },
        paint: {
          "text-color": "#475569",
          "text-halo-color": LABEL_HALO_COLOR,
          "text-halo-width": 1.6,
        },
      });

      // Country names
      targetMap.addLayer({
        id: COUNTRY_LABEL,
        type: "symbol",
        source: LABEL_SOURCE,
        maxzoom: 5,
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 2, 10, 5, 13],
          "text-allow-overlap": false,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": LABEL_TEXT_COLOR,
          "text-halo-color": LABEL_HALO_COLOR,
          "text-halo-width": 2,
        },
      });

      layersReadyRef.current = true;
      targetMap.setLayoutProperty(
        COUNTRY_LABEL,
        "visibility",
        showCountryNames ? "visible" : "none",
      );
      updateCountryPaint(targetMap);
    };

    const attachInteractions = (targetMap: maplibregl.Map) => {
      if (interactionsReadyRef.current) return;
      interactionsReadyRef.current = true;

      const onCountryClick = (
        e: maplibregl.MapMouseEvent & {
          features?: maplibregl.MapGeoJSONFeature[];
        },
      ) => {
        const feature = e.features?.[0];
        if (!feature) return;
        selectFeature(feature as unknown as Feature);
      };

      const onCountryMove = (
        e: maplibregl.MapMouseEvent & {
          features?: maplibregl.MapGeoJSONFeature[];
        },
      ) => {
        const feature = e.features?.[0];
        if (feature) {
          targetMap.getCanvas().style.cursor = "pointer";
          onHover(featureCode(feature as unknown as Feature));
        } else {
          targetMap.getCanvas().style.cursor = "";
          onHover(null);
        }
      };

      targetMap.on("click", LINE_LAYER, onCountryClick);
      targetMap.on("click", FILL_LAYER, onCountryClick);
      targetMap.on("mousemove", LINE_LAYER, onCountryMove);
      targetMap.on("mousemove", FILL_LAYER, onCountryMove);
      targetMap.on("mouseleave", LINE_LAYER, () => {
        targetMap.getCanvas().style.cursor = "";
        onHover(null);
      });
    };

    const loadCountries = (targetMap: maplibregl.Map) => {
      fetch(COUNTRY_GEOJSON_URL)
        .then((r) => r.json())
        .then((raw: FeatureCollection) => {
          if (cancelled || !map) return;
          const geo = enrichGeoJson(raw);
          setupLayers(targetMap, geo);
          attachInteractions(targetMap);
          applyHeatmapCounts(targetMap);
        })
        .catch(console.error);
    };

    const initMap = () => {
      if (cancelled || map) return;
      if (container.clientHeight < 8 || container.clientWidth < 8) return;

      map = new maplibregl.Map({
        container,
        style: MINIMAL_MAP_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: { compact: true },
        renderWorldCopies: false,
        dragRotate: isGlobeRef.current,
        pitchWithRotate: isGlobeRef.current,
        touchPitch: isGlobeRef.current,
      });

      map.addControl(
        new maplibregl.NavigationControl({
          visualizePitch: isGlobeRef.current,
          showCompass: isGlobeRef.current,
        }),
        "bottom-right",
      );

      mapRef.current = map;

      map.once("load", () => {
        if (cancelled || !map) return;
        applyProjectionMode(map, isGlobeRef.current);
        loadCountries(map);
        refreshMapView(map);
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!map) {
        initMap();
        return;
      }
      map.resize();
    });

    resizeObserver.observe(container);
    initMap();

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      layersReadyRef.current = false;
      interactionsReadyRef.current = false;
      geoRef.current = null;
      map?.remove();
      map = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => safeMapOp(map, (m) => applyProjectionMode(m, isGlobe));
    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [isGlobe, applyProjectionMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      safeMapOp(map, applyHeatmapCounts);
      safeMapOp(map, updateCountryPaint);
    }
  }, [
    applyHeatmapCounts,
    updateCountryPaint,
    heatmapCounts,
    showHeatmap,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const geo = geoRef.current;
    if (!map || !geo || !map.getSource(LABEL_SOURCE)) return;
    safeMapOp(map, (m) => {
      const source = m.getSource(LABEL_SOURCE) as maplibregl.GeoJSONSource;
      source.setData(countriesToLabels(geo, language));
      if (m.getLayer(COUNTRY_LABEL)) {
        m.setLayoutProperty(
          COUNTRY_LABEL,
          "visibility",
          showCountryNames ? "visible" : "none",
        );
      }
    });
  }, [language, showCountryNames]);

  useEffect(() => {
    const map = mapRef.current;
    const wrap = containerRef.current;
    if (!map || !wrap) return;

    const { index, byId } = buildEventClusterIndex(events);
    clusterIndexRef.current = index;
    eventsByIdRef.current = byId;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const pinnedRef = pinnedEventIdRef;

    const clearTip = () => {
      clearTooltip();
    };

    const onWrapClick = (e: MouseEvent) => {
      if ((e.target as Element).closest(".map-tooltip")) return;
      clearTip();
    };
    wrap.addEventListener("click", onWrapClick);

    const onMapClick = () => {
      clearTip();
    };
    map.on("click", onMapClick);

    const showEventTip = (
      event: MapEvent,
      clientX: number,
      clientY: number,
      pin = false,
    ) => {
      const rect = wrap.getBoundingClientRect();
      if (pin) pinnedRef.current = event.id;
      setTooltip({
        x: clientX - rect.left,
        y: clientY - rect.top,
        title: eventPrimaryTitle(event, languageRef.current),
        body: event.description || "",
        date: event.startDate,
        url: event.url,
        imageUrl: event.imageUrl,
        pinned: pin,
      });
    };

    const bindEventMarker = (event: MapEvent, el: HTMLButtonElement) => {
      el.addEventListener("mouseenter", (ev) => {
        if (pinnedRef.current && pinnedRef.current !== event.id) return;
        showEventTip(event, ev.clientX, ev.clientY);
      });
      el.addEventListener("mousemove", (ev) => {
        if (pinnedRef.current && pinnedRef.current !== event.id) return;
        showEventTip(event, ev.clientX, ev.clientY);
      });
      el.addEventListener("mouseleave", () => {
        if (pinnedRef.current === event.id) return;
        setTooltip(null);
      });
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (pinnedRef.current === event.id) {
          clearTip();
        } else {
          showEventTip(event, ev.clientX, ev.clientY, true);
        }
      });
      el.addEventListener("focus", () => {
        const rect = el.getBoundingClientRect();
        showEventTip(event, rect.left + rect.width / 2, rect.top, true);
      });
      el.addEventListener("blur", () => {
        if (pinnedRef.current === event.id) clearTip();
      });
    };

    let renderTimer: ReturnType<typeof setTimeout> | undefined;

    const renderMarkers = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const clusterIndex = clusterIndexRef.current;
      if (!clusterIndex) return;

      const bounds = mapBounds(map);
      const zoom = Math.floor(map.getZoom());
      const features = clusterIndex.getClusters(bounds, zoom);

      for (const feature of features) {
        const [lng, lat] = feature.geometry.coordinates as [number, number];
        const props = feature.properties as EventPointProps &
          ClusterPointProps & { cluster?: boolean };

        if (props.cluster) {
          const el = createClusterMarkerElement(props.point_count);
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const expansionZoom = clusterIndex.getClusterExpansionZoom(
              props.cluster_id,
            );
            map.easeTo({
              center: [lng, lat],
              zoom: Math.min(expansionZoom + 0.5, 16),
              duration: 480,
            });
          });
          markersRef.current.push(
            new maplibregl.Marker({ element: el, anchor: "center" })
              .setLngLat([lng, lat])
              .addTo(map),
          );
          continue;
        }

        const event = eventsByIdRef.current.get(props.id);
        if (!event) continue;

        const el = createEventMarkerElement(event);
        bindEventMarker(event, el);
        markersRef.current.push(
          new maplibregl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([lng, lat])
            .addTo(map),
        );
      }
    };

    const scheduleRenderMarkers = () => {
      if (renderTimer) window.clearTimeout(renderTimer);
      renderTimer = window.setTimeout(renderMarkers, 60);
    };

    const onMapMove = () => scheduleRenderMarkers();
    map.on("moveend", onMapMove);
    map.on("zoomend", onMapMove);
    scheduleRenderMarkers();

    return () => {
      if (renderTimer) window.clearTimeout(renderTimer);
      wrap.removeEventListener("click", onWrapClick);
      map.off("click", onMapClick);
      map.off("moveend", onMapMove);
      map.off("zoomend", onMapMove);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [events, clearTooltip]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    safeMapOp(map, (m) => {
      if (!selectedCountry?.code) {
        setBoundaryData(m, REGION_SOURCE, {
          type: "FeatureCollection",
          features: [],
        });
        setBoundaryData(m, CITY_SOURCE, {
          type: "FeatureCollection",
          features: [],
        });
        return;
      }

      applyRegionGeo(m, regionGeo, selectedRegion);
      applyCityGeo(m, cityGeo);
    });
  }, [
    selectedCountry?.code,
    regionGeo,
    cityGeo,
    selectedRegion,
    applyRegionGeo,
    applyCityGeo,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReadyRef.current || !selectedCountry?.code) return;

    const onRegionClick = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      const feature = e.features?.[0];
      const name = feature?.properties?.name as string | undefined;
      if (!name) return;
      e.originalEvent.stopPropagation();
      const current = selectedRegionRef.current;
      onRegionSelectRef.current(current === name ? null : name);
    };

    const onRegionMove = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      if (e.features?.length) {
        map.getCanvas().style.cursor = "pointer";
      }
    };

    const onRegionLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", REGION_FILL, onRegionClick);
    map.on("mousemove", REGION_FILL, onRegionMove);
    map.on("mouseleave", REGION_FILL, onRegionLeave);

    return () => {
      map.off("click", REGION_FILL, onRegionClick);
      map.off("mousemove", REGION_FILL, onRegionMove);
      map.off("mouseleave", REGION_FILL, onRegionLeave);
    };
  }, [selectedCountry?.code]);

  useEffect(() => {
    safeMapOp(mapRef.current, (m) =>
      updateRegionPaint(m, selectedRegion),
    );
  }, [selectedRegion, updateRegionPaint]);

  useEffect(() => {
    if (!selectedCountry?.bbox || selectedRegion) return;
    const map = mapRef.current;
    if (!map || !map.loaded()) return;
    if (lastFitCountryRef.current === selectedCountry.code) return;

    lastFitCountryRef.current = selectedCountry.code;

    safeMapOp(map, (m) => {
      m.fitBounds(
        [
          [selectedCountry.bbox![0], selectedCountry.bbox![1]],
          [selectedCountry.bbox![2], selectedCountry.bbox![3]],
        ],
        {
          padding: 48,
          duration: 420,
          maxZoom: fitMaxZoom(selectedCountry.bbox!),
        },
      );
    });
  }, [selectedCountry?.code, selectedCountry?.bbox, selectedRegion]);

  useEffect(() => {
    if (!selectedCountry?.code) {
      lastFitCountryRef.current = null;
    }
  }, [selectedCountry?.code]);

  useEffect(() => {
    if (!selectedRegion || !selectedCountry?.code) return;
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

    const feature = findRegionFeature(regionGeo, selectedRegion);
    if (!feature) return;

    const box = bbox(feature) as [number, number, number, number];
    safeMapOp(map, (m) => {
      m.fitBounds(
        [
          [box[0], box[1]],
          [box[2], box[3]],
        ],
        {
          padding: 48,
          duration: 420,
          maxZoom: fitMaxZoom(box),
        },
      );
    });
  }, [selectedRegion, regionGeo, selectedCountry?.code]);

  return (
    <div className="world-map-wrap" id="main-map">
      <div ref={containerRef} className="world-map" aria-label="World map" />
      {selectedCountry && regionsLoading && (
        <div
          className="map-country-loading"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="map-country-loading__note map-country-loading__note--doodle">
            <span className="loading-dots loading-dots--inline" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>{t("regionsLoading", language)}</span>
          </div>
        </div>
      )}
      {tooltip && (
        <div
          className={`map-tooltip map-tooltip--doodle${tooltip.pinned ? " map-tooltip--pinned" : ""}`}
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          role={tooltip.pinned ? "dialog" : "tooltip"}
          aria-label={tooltip.title}
        >
          {tooltip.pinned && (
            <button
              type="button"
              className="map-tooltip__close"
              onClick={clearTooltip}
              aria-label={t("close", language)}
            >
              ×
            </button>
          )}
          {tooltip.imageUrl && (
            <img
              className="map-tooltip__image"
              src={tooltip.imageUrl}
              alt=""
              loading="lazy"
            />
          )}
          <strong>{tooltip.title}</strong>
          {tooltip.date && (
            <p className="map-tooltip__date">{formatDisplayDate(tooltip.date)}</p>
          )}
          {tooltip.body && <p>{tooltip.body}</p>}
          {tooltip.url && (
            <a
              href={tooltip.url}
              target="_blank"
              rel="noopener noreferrer"
              className="map-tooltip__link"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              View event →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
