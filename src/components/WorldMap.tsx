import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import simplify from "@turf/simplify";
import bbox from "@turf/bbox";
import centroid from "@turf/centroid";
import type { Feature, FeatureCollection, Geometry, Point } from "geojson";
import type { MapEvent } from "../types/event";
import type { SelectedCountry } from "../hooks/useMapSelection";
import {
  COUNTRY_GEOJSON_URL,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  countryCodeFromProps,
  countryNameFromProps,
} from "../lib/mapConfig";
import { LAND_FILL_COLOR, MINIMAL_MAP_STYLE } from "../lib/mapStyle";
import { resolveCountryCode, iso2ToName } from "../lib/iso";
import { countryNameInLang } from "../lib/locale";
import type { AppLanguage } from "../hooks/useSettings";
import { createEventMarkerElement } from "../lib/markerIcons";

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
  hoveredCode: string | null;
  onHover: (code: string | null) => void;
  onSelect: (country: SelectedCountry) => void;
  events: MapEvent[];
  heatmapCounts: Record<string, number>;
  showHeatmap: boolean;
  showCountryNames: boolean;
  language: AppLanguage;
}

interface MapTooltip {
  x: number;
  y: number;
  title: string;
  body: string;
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
  hoveredCode,
  onHover,
  onSelect,
  events,
  heatmapCounts,
  showHeatmap,
  showCountryNames,
  language,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const geoRef = useRef<FeatureCollection | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const layersReadyRef = useRef(false);
  const interactionsReadyRef = useRef(false);
  const isGlobeRef = useRef(isGlobe);
  const languageRef = useRef(language);
  const [tooltip, setTooltip] = useState<MapTooltip | null>(null);

  isGlobeRef.current = isGlobe;
  languageRef.current = language;

  const updateCountryPaint = useCallback(
    (map: maplibregl.Map) => {
      if (!layersReadyRef.current || !map.getLayer(LINE_LAYER)) return;

      const selected = selectedCountry?.code ?? "";
      const hovered = hoveredCode ?? "";
      const maxCount = Math.max(1, ...Object.values(heatmapCounts));

      map.setPaintProperty(FILL_LAYER, "fill-color", [
        "case",
        ["==", ["get", "iso2"], selected],
        "#fde68a",
        ["==", ["get", "iso2"], hovered],
        "#bae6fd",
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
        "#f59e0b",
        ["==", ["get", "iso2"], hovered],
        "#38bdf8",
        "#64748b",
      ]);

      map.setPaintProperty(LINE_LAYER, "line-width", [
        "case",
        ["==", ["get", "iso2"], selected],
        2,
        ["==", ["get", "iso2"], hovered],
        1.5,
        0.75,
      ]);
    },
    [selectedCountry?.code, hoveredCode, heatmapCounts, showHeatmap],
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

  const loadRegions = useCallback((map: maplibregl.Map, countryCode: string) => {
    if (!map.getSource(REGION_SOURCE)) return;

    fetch(`/api/regions/${countryCode}`)
      .then((r) => r.json())
      .then((geo: FeatureCollection) => setBoundaryData(map, REGION_SOURCE, geo))
      .catch(() =>
        setBoundaryData(map, REGION_SOURCE, {
          type: "FeatureCollection",
          features: [],
        }),
      );
  }, []);

  const loadCities = useCallback((map: maplibregl.Map, countryCode: string) => {
    if (!map.getSource(CITY_SOURCE)) return;

    fetch(`/api/cities/${countryCode}`)
      .then((r) => r.json())
      .then((geo: FeatureCollection) => setBoundaryData(map, CITY_SOURCE, geo))
      .catch(() =>
        setBoundaryData(map, CITY_SOURCE, {
          type: "FeatureCollection",
          features: [],
        }),
      );
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
          "line-color": "#64748b",
          "line-width": 0.85,
          "line-opacity": 0.95,
        },
      });

      // Region subdivisions (states/provinces)
      targetMap.addLayer({
        id: REGION_FILL,
        type: "fill",
        source: REGION_SOURCE,
        minzoom: 3,
        paint: {
          "fill-color": "#e2e8f0",
          "fill-opacity": 0.2,
        },
      });

      targetMap.addLayer({
        id: REGION_LINE,
        type: "line",
        source: REGION_SOURCE,
        minzoom: 3,
        paint: {
          "line-color": "#94a3b8",
          "line-width": 1.2,
          "line-opacity": 0.8,
        },
      });

      // City / county grids (finer detail when zoomed in)
      targetMap.addLayer({
        id: CITY_FILL,
        type: "fill",
        source: CITY_SOURCE,
        minzoom: 5,
        paint: {
          "fill-color": "#cbd5e1",
          "fill-opacity": 0.12,
        },
      });

      targetMap.addLayer({
        id: CITY_LINE,
        type: "line",
        source: CITY_SOURCE,
        minzoom: 5,
        paint: {
          "line-color": "#64748b",
          "line-width": 0.8,
          "line-opacity": 0.6,
          "line-dasharray": [2, 3],
        },
      });

      targetMap.addLayer({
        id: REGION_LABEL,
        type: "symbol",
        source: REGION_SOURCE,
        minzoom: 4,
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 7, 13],
          "text-allow-overlap": false,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": "#334155",
          "text-halo-color": "#f8fafc",
          "text-halo-width": 1.5,
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
          "text-halo-color": "#f8fafc",
          "text-halo-width": 1.2,
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
          "text-color": "#1e293b",
          "text-halo-color": "#f8fafc",
          "text-halo-width": 1.5,
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

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const visible = events;

    for (const event of visible) {
      if (event.lat == null || event.lng == null) continue;

      const el = createEventMarkerElement(event);

      const showTip = (clientX: number, clientY: number) => {
        const rect = wrap.getBoundingClientRect();
        setTooltip({
          x: clientX - rect.left,
          y: clientY - rect.top,
          title: event.localTitle || event.title,
          body: event.description || event.startDate,
        });
      };

      el.addEventListener("mouseenter", (ev) =>
        showTip(ev.clientX, ev.clientY),
      );
      el.addEventListener("mousemove", (ev) => showTip(ev.clientX, ev.clientY));
      el.addEventListener("mouseleave", () => setTooltip(null));
      el.addEventListener("focus", () => {
        const rect = el.getBoundingClientRect();
        showTip(rect.left + rect.width / 2, rect.top);
      });
      el.addEventListener("blur", () => setTooltip(null));

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([event.lng, event.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [events]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!selectedCountry?.code) {
      safeMapOp(map, (m) => {
        setBoundaryData(m, REGION_SOURCE, {
          type: "FeatureCollection",
          features: [],
        });
        setBoundaryData(m, CITY_SOURCE, {
          type: "FeatureCollection",
          features: [],
        });
      });
      return;
    }

    safeMapOp(map, (m) => {
      loadRegions(m, selectedCountry.code);
      loadCities(m, selectedCountry.code);
    });
  }, [selectedCountry?.code, loadRegions, loadCities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCountry?.code) return;

    const onZoom = () => {
      if (map.getZoom() >= 5) {
        loadCities(map, selectedCountry.code);
      }
    };

    map.on("zoomend", onZoom);
    return () => {
      map.off("zoomend", onZoom);
    };
  }, [selectedCountry?.code, loadCities]);

  useEffect(() => {
    if (!selectedCountry?.bbox) return;
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

    safeMapOp(map, (m) => {
      m.fitBounds(
        [
          [selectedCountry.bbox![0], selectedCountry.bbox![1]],
          [selectedCountry.bbox![2], selectedCountry.bbox![3]],
        ],
        {
          padding: 48,
          duration: 850,
          maxZoom: fitMaxZoom(selectedCountry.bbox!),
        },
      );
    });
  }, [selectedCountry]);

  return (
    <div className="world-map-wrap">
      <div ref={containerRef} className="world-map" aria-label="World map" />
      {tooltip && (
        <div
          className="map-tooltip"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <strong>{tooltip.title}</strong>
          {tooltip.body && <p>{tooltip.body}</p>}
        </div>
      )}
    </div>
  );
}
