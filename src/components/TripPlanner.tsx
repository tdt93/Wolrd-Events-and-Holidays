import type { CSSProperties } from "react";
import type { AppLanguage } from "../hooks/useSettings";
import {
  daysBetween,
  getTripPresetRange,
  tripMatchesPreset,
  type TripLengthPreset,
} from "../lib/tripDates";
import { t, tf } from "../lib/locale";
import { DateField } from "./DateField";

const TRIP_PRESET_CHIP_STYLE = {
  "--chip-bg": "#fef3c7",
  "--chip-border": "#f59e0b",
} as CSSProperties;

const TRIP_PRESETS: { id: TripLengthPreset; labelKey: string }[] = [
  { id: "weekend", labelKey: "tripPresetWeekend" },
  { id: "week", labelKey: "tripPresetWeek" },
  { id: "two-weeks", labelKey: "tripPresetTwoWeeks" },
  { id: "month", labelKey: "tripPresetMonth" },
];

interface TripPlannerProps {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  tripFrom: string;
  tripTo: string;
  onTripFromChange: (v: string) => void;
  onTripToChange: (v: string) => void;
  onTripRangeChange: (from: string, to: string) => void;
  matchCount?: number | null;
  totalInRangeCount?: number | null;
  countrySelected?: boolean;
  language: AppLanguage;
}

export function TripPlanner({
  enabled,
  onEnabledChange,
  tripFrom,
  tripTo,
  onTripFromChange,
  onTripToChange,
  onTripRangeChange,
  matchCount,
  totalInRangeCount,
  countrySelected = false,
  language,
}: TripPlannerProps) {
  const tripDays =
    tripFrom && tripTo && tripTo >= tripFrom
      ? daysBetween(tripFrom, tripTo)
      : 0;

  const applyPreset = (preset: TripLengthPreset) => {
    const range = getTripPresetRange(preset);
    onTripRangeChange(range.from, range.to);
    if (!enabled) onEnabledChange(true);
  };

  return (
    <section className={`filter-card trip-card ${enabled ? "trip-card--on" : ""}`}>
      <div className="filter-card__head trip-card__head">
        <span className="filter-card__icon" aria-hidden="true">
          ✈️
        </span>
        <div className="trip-card__intro">
          <h3 className="filter-card__title">{t("tripPlannerCardTitle", language)}</h3>
          <p className="filter-card__hint">{t("tripPlannerHint", language)}</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            aria-label={t("tripMode", language)}
          />
          <span className="switch__track" />
        </label>
      </div>

      <div className="trip-card__presets">
        <span className="trip-card__presets-label">{t("tripQuickPick", language)}</span>
        <div className="chip-grid chip-grid--presets">
          {TRIP_PRESETS.map((preset) => {
            const active =
              enabled && tripMatchesPreset(tripFrom, tripTo, preset.id);
            return (
              <button
                key={preset.id}
                type="button"
                className={`filter-chip ${active ? "filter-chip--on" : "filter-chip--off"}`}
                style={active ? TRIP_PRESET_CHIP_STYLE : undefined}
                onClick={() => applyPreset(preset.id)}
                aria-pressed={active}
              >
                <span className="filter-chip__check" aria-hidden="true">
                  {active ? "✓" : ""}
                </span>
                {t(preset.labelKey, language)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="date-range-row trip-card__dates">
        <DateField
          label={t("tripArrival", language)}
          value={tripFrom}
          onChange={onTripFromChange}
        />
        <span className="date-range-arrow" aria-hidden="true">
          →
        </span>
        <DateField
          label={t("tripDeparture", language)}
          value={tripTo}
          onChange={onTripToChange}
        />
      </div>

      {enabled && tripDays > 0 && (
        <p className="trip-card__duration">
          {tf("tripDurationDays", language, { count: String(tripDays) })}
        </p>
      )}

      {enabled && countrySelected && matchCount != null && (
        <p className="trip-card__stats" role="status">
          {totalInRangeCount != null && totalInRangeCount > matchCount
            ? tf("tripStatsCompare", language, {
                trip: String(matchCount),
                total: String(totalInRangeCount),
              })
            : tf("tripStats", language, { count: String(matchCount) })}
        </p>
      )}

    </section>
  );
}
