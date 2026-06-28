import type { AppLanguage } from "../hooks/useSettings";
import { t } from "../lib/locale";
import { DateField } from "./DateField";

interface TripPlannerProps {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  tripFrom: string;
  tripTo: string;
  onTripFromChange: (v: string) => void;
  onTripToChange: (v: string) => void;
  language: AppLanguage;
}

export function TripPlanner({
  enabled,
  onEnabledChange,
  tripFrom,
  tripTo,
  onTripFromChange,
  onTripToChange,
  language,
}: TripPlannerProps) {
  return (
    <section className={`filter-card trip-card ${enabled ? "trip-card--on" : ""}`}>
      <div className="filter-card__head trip-card__head">
        <span className="filter-card__icon" aria-hidden="true">
          ✈️
        </span>
        <div className="trip-card__intro">
          <h3 className="filter-card__title">{t("tripPlanner", language)}</h3>
          <p className="filter-card__hint">{t("tripMode", language)}</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            aria-label={t("tripPlanner", language)}
          />
          <span className="switch__track" />
        </label>
      </div>

      {enabled && (
        <div className="date-range-row">
          <DateField
            label={t("tripDates", language)}
            value={tripFrom}
            onChange={onTripFromChange}
          />
          <span className="date-range-arrow" aria-hidden="true">
            →
          </span>
          <DateField
            label={"\u00a0"}
            value={tripTo}
            onChange={onTripToChange}
          />
        </div>
      )}
    </section>
  );
}
