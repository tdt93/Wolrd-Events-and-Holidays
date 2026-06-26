import type { CSSProperties } from "react";
import type { DatePreset } from "../types/event";
import type { AppLanguage } from "../hooks/useSettings";
import { t } from "../lib/locale";

const DATE_PRESET_STYLE = {
  "--chip-bg": "#fef3c7",
  "--chip-border": "#f59e0b",
} as CSSProperties;

const PRESET_KEYS: { id: DatePreset; labelKey: string }[] = [
  { id: "this-week", labelKey: "thisWeek" },
  { id: "this-month", labelKey: "thisMonth" },
  { id: "next-3-months", labelKey: "next3Months" },
  { id: "this-year", labelKey: "thisYear" },
];

interface DatePresetsProps {
  active: DatePreset;
  onChange: (preset: DatePreset) => void;
  from: string;
  to: string;
  onCustomRange: (from: string, to: string) => void;
  language: AppLanguage;
}

export function DatePresets({
  active,
  onChange,
  from,
  to,
  onCustomRange,
  language,
}: DatePresetsProps) {
  return (
    <section className="filter-card">
      <div className="filter-card__head">
        <span className="filter-card__icon" aria-hidden="true">
          📅
        </span>
        <div>
          <h3 className="filter-card__title">{t("dateRange", language)}</h3>
          <p className="filter-card__hint">{t("customDates", language)}</p>
        </div>
      </div>

      <div className="chip-grid chip-grid--presets">
        {PRESET_KEYS.map((p) => {
          const isActive = active === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={isActive}
              className={`filter-chip ${isActive ? "filter-chip--on" : "filter-chip--off"}`}
              style={isActive ? DATE_PRESET_STYLE : undefined}
              onClick={() => onChange(p.id)}
            >
              <span className="filter-chip__check" aria-hidden="true">
                {isActive ? "✓" : ""}
              </span>
              {t(p.labelKey, language)}
            </button>
          );
        })}
      </div>

      <div className="date-range-row">
        <label className="date-field">
          <span className="date-field__label">{t("from", language)}</span>
          <input
            type="date"
            value={from}
            onChange={(e) => onCustomRange(e.target.value, to)}
            aria-label={t("from", language)}
          />
        </label>
        <span className="date-range-arrow" aria-hidden="true">
          →
        </span>
        <label className="date-field">
          <span className="date-field__label">{t("to", language)}</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onCustomRange(from, e.target.value)}
            aria-label={t("to", language)}
          />
        </label>
      </div>
    </section>
  );
}
