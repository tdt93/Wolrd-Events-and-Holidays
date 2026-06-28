import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import {
  enrichRegionGeoJson,
  extractRegionNames,
} from "../lib/regions";
import { regionsCacheKey, sessionGet, sessionSet } from "../lib/sessionCache";

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

interface RegionCacheEntry {
  geo: FeatureCollection;
  cityGeo: FeatureCollection;
}

async function fetchBoundaryGeo(countryCode: string, kind: "regions" | "cities") {
  const res = await fetch(`/api/${kind}/${countryCode}`);
  if (!res.ok) return EMPTY;
  const raw = (await res.json()) as FeatureCollection;
  return enrichRegionGeoJson(raw ?? EMPTY);
}

export function useCountryRegions(countryCode: string | null) {
  const [geo, setGeo] = useState<FeatureCollection>(EMPTY);
  const [cityGeo, setCityGeo] = useState<FeatureCollection>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryCode) {
      setGeo(EMPTY);
      setCityGeo(EMPTY);
      setLoading(false);
      return;
    }

    const cacheKey = regionsCacheKey(countryCode);
    const cached = sessionGet<RegionCacheEntry>(cacheKey);
    if (cached) {
      setGeo(cached.geo);
      setCityGeo(cached.cityGeo);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setGeo(EMPTY);
    setCityGeo(EMPTY);
    setLoading(true);

    Promise.all([
      fetchBoundaryGeo(countryCode, "regions"),
      fetchBoundaryGeo(countryCode, "cities"),
    ])
      .then(([regions, cities]) => {
        if (cancelled) return;
        sessionSet(cacheKey, { geo: regions, cityGeo: cities });
        setGeo(regions);
        setCityGeo(cities);
      })
      .catch(() => {
        if (!cancelled) {
          setGeo(EMPTY);
          setCityGeo(EMPTY);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  const names = useMemo(() => extractRegionNames(geo), [geo]);

  return { geo, cityGeo, names, loading };
}
