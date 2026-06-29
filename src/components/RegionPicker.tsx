import type { AppLanguage } from "../hooks/useSettings";
import { t } from "../lib/locale";

interface RegionPickerProps {
  regions: string[];
  selected: string | null;
  onChange: (region: string | null) => void;
  language: AppLanguage;
  loading?: boolean;
  embedded?: boolean;
}

export function RegionPicker({
  regions,
  selected,
  onChange,
  language,
  loading,
  embedded = false,
}: RegionPickerProps) {
  if (loading || regions.length === 0) return null;

  const body = (
    <>
      <p className="filter-card__hint">{t("regionMapHint", language)}</p>
      <div className="chip-grid">
        <button
          type="button"
          className={`filter-chip ${!selected ? "filter-chip--on" : "filter-chip--off"}`}
          onClick={() => onChange(null)}
        >
          {t("allRegions", language)}
        </button>
        {regions.map((r) => (
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
    </>
  );

  if (embedded) {
    return <div className="filter-accordion__content">{body}</div>;
  }

  return (
    <div className="region-picker filter-card">
      <h3 className="filter-card__title">{t("region", language)}</h3>
      {body}
    </div>
  );
}
