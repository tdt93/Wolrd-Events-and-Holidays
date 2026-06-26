import { useEffect, useState } from "react";
import type { AppLanguage } from "../hooks/useSettings";
import { t } from "../lib/locale";

interface RegionPickerProps {
  countryCode: string | null;
  regions: string[];
  selected: string | null;
  onChange: (region: string | null) => void;
  language: AppLanguage;
}

export function RegionPicker({
  countryCode,
  regions,
  selected,
  onChange,
  language,
}: RegionPickerProps) {
  const [apiRegions, setApiRegions] = useState<string[]>([]);

  useEffect(() => {
    if (!countryCode) {
      setApiRegions([]);
      return;
    }

    let cancelled = false;
    fetch(`/api/regions/${countryCode}`)
      .then((r) => r.json())
      .then((geo: { features?: { properties?: Record<string, string> }[] }) => {
        if (cancelled) return;
        const names = (geo.features ?? [])
          .map(
            (f) =>
              f.properties?.shapeName ??
              f.properties?.name ??
              "",
          )
          .filter(Boolean);
        setApiRegions([...new Set(names)].sort());
      })
      .catch(() => {
        if (!cancelled) setApiRegions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  const allRegions = [...new Set([...apiRegions, ...regions])].sort();
  if (allRegions.length === 0) return null;

  return (
    <div className="region-picker filter-card">
      <h3 className="filter-card__title">{t("region", language)}</h3>
      <div className="chip-grid">
        <button
          type="button"
          className={`filter-chip ${!selected ? "filter-chip--on" : "filter-chip--off"}`}
          onClick={() => onChange(null)}
        >
          {t("allRegions", language)}
        </button>
        {allRegions.map((r) => (
          <button
            key={r}
            type="button"
            className={`filter-chip ${selected === r ? "filter-chip--on" : "filter-chip--off"}`}
            onClick={() => onChange(r)}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
