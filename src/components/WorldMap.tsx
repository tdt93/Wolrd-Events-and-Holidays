import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import simplify from "@turf/simplify";
import bbox from "@turf/bbox";
import centroid from "@turf/centroid";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { MapEvent } from "../types/event";
import type { SelectedCountry } from "../hooks/useMapSelection";
import {
  COUNTRY_GEOJSON_URL,
  COUNTRY_ZOOM,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  countryCodeFromProps,
  countryNameFromProps,
} from "../lib/mapConfig";
import { LAND_FILL_COLOR, MINIMAL_MAP_STYLE } from "../lib/mapStyle";
import { resolveCountryCode, iso2ToName } from "../lib/iso";
import { getEventIcon } from "../lib/eventIcons";

const SOURCE_ID = "countries";
const FILL_LAYER = "countries-fill";
const LINE_LAYER = "countries-line";
const HEAT_LAYER = "countries-heat";

interface WorldMapProps {
  isGlobe: boolean;
  selectedCountry: SelectedCountry | null;
  hoveredCode: string | null;
  onHover: (code: string | null) => void;
  onSelect: (country: SelectedCountry) => void;
  events: MapEvent[];
  heatmapCounts: Record<string, number>;
  showHeatmap: boolean;
  timelineDate: string | null;
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
  timelineDate,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const geoRef = useRef<FeatureCollection | null>(null);
  const layersReadyRef = useRef(false);
  const interactionsReadyRef = useRef(false);
  const isGlobeRef = useRef(isGlobe);

  isGlobeRef.current = isGlobe;

  const buildMarkerLayers = useCallback(() => {
    const filteredEvents =
      timelineDate != null
        ? events.filter((e) => e.startDate === timelineDate)
        : events;

    const withCoords = filteredEvents.filter(
      (e) => e.lat != null && e.lng != null,
    );

    const pinLayer = new ScatterplotLayer<MapEvent>({
      id: "event-pins",
      data: withCoords,
      pickable: true,
      opacity: 0.95,
      stroked: true,
      filled: true,
      radiusMinPixels: 10,
      radiusMaxPixels: 14,
      lineWidthMinPixels: 2,
      getPosition: (d) => [d.lng!, d.lat!],
      getFillColor: [255, 255, 255, 230],
      getLineColor: [245, 158, 11, 255],
    });

    const iconLayer = new TextLayer<MapEvent>({
      id: "event-icons",
      data: withCoords,
      pickable: true,
      billboard: true,
      getPosition: (d) => [d.lng!, d.lat!],
      getText: (d) => getEventIcon(d),
      getSize: 18,
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      fontFamily: "Arial, sans-serif",
      characterSet: Array.from(
        new Set(withCoords.map((d) => getEventIcon(d))),
      ).join(""),
      updateTriggers: { getText: [filteredEvents] },
    });

    return [pinLayer, iconLayer];
  }, [events, timelineDate]);

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

      map.setPaintProperty(FILL_LAYER, "fill-opacity", 1);

      map.setPaintProperty(HEAT_LAYER, "fill-opacity", showHeatmap ? 0.45 : 0);
      map.setPaintProperty(HEAT_LAYER, "fill-color", [
        "interpolate",
        ["linear"],
        ["/", ["coalesce", ["get", "holidayCount"], 0], maxCount],
        0,
        "#bae6fd",
        0.35,
        "#fef3c7",
        1,
        "#fb7185",
      ]);

      map.setPaintProperty(LINE_LAYER, "line-color", [
        "case",
        ["==", ["get", "iso2"], selected],
        "#f59e0b",
        ["==", ["get", "iso2"], hovered],
        "#38bdf8",
        "#94a3b8",
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
    let overlay: MapboxOverlay | null = null;

    const setupLayers = (targetMap: maplibregl.Map, geo: FeatureCollection) => {
      if (cancelled || targetMap.getSource(SOURCE_ID)) return;

      geoRef.current = geo;

      targetMap.addSource(SOURCE_ID, {
        type: "geojson",
        data: geo,
        generateId: false,
      });

      targetMap.addLayer({
        id: HEAT_LAYER,
        type: "fill",
        source: SOURCE_ID,
        paint: { "fill-color": "#fde68a", "fill-opacity": 0 },
      });

      targetMap.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: SOURCE_ID,
        paint: { "fill-color": LAND_FILL_COLOR, "fill-opacity": 1 },
      });

      targetMap.addLayer({
        id: LINE_LAYER,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#94a3b8",
          "line-width": 0.75,
          "line-opacity": 0.85,
        },
      });

      layersReadyRef.current = true;
      updateCountryPaint(targetMap);
      overlay?.setProps({ layers: buildMarkerLayers() });
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

      overlay = new MapboxOverlay({ interleaved: true, layers: [] });
      map.addControl(overlay);
      map.addControl(
        new maplibregl.NavigationControl({
          visualizePitch: isGlobeRef.current,
          showCompass: isGlobeRef.current,
        }),
        "bottom-right",
      );

      mapRef.current = map;
      overlayRef.current = overlay;

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
      overlayRef.current = null;
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
    overlayRef.current?.setProps({ layers: buildMarkerLayers() });
  }, [
    applyHeatmapCounts,
    updateCountryPaint,
    buildMarkerLayers,
    heatmapCounts,
    showHeatmap,
  ]);

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
        { padding: 48, duration: 850, maxZoom: COUNTRY_ZOOM },
      );
    });
  }, [selectedCountry]);

  return <div ref={containerRef} className="world-map" aria-label="World map" />;
}
