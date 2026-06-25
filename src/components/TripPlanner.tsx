interface TripPlannerProps {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  tripFrom: string;
  tripTo: string;
  onTripFromChange: (v: string) => void;
  onTripToChange: (v: string) => void;
}

export function TripPlanner({
  enabled,
  onEnabledChange,
  tripFrom,
  tripTo,
  onTripFromChange,
  onTripToChange,
}: TripPlannerProps) {
  return (
    <div className="trip-planner">
      <label className="toggle-label">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        Trip planner
      </label>
      {enabled && (
        <div className="trip-dates">
          <input
            type="date"
            value={tripFrom}
            onChange={(e) => onTripFromChange(e.target.value)}
            aria-label="Trip start"
          />
          <span>→</span>
          <input
            type="date"
            value={tripTo}
            onChange={(e) => onTripToChange(e.target.value)}
            aria-label="Trip end"
          />
        </div>
      )}
    </div>
  );
}
