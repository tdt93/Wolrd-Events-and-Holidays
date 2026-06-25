interface TimelineScrubberProps {
  from: string;
  to: string;
  value: string;
  onChange: (date: string) => void;
  onClear: () => void;
}

export function TimelineScrubber({
  from,
  to,
  value,
  onChange,
  onClear,
}: TimelineScrubberProps) {
  return (
    <div className="timeline-scrubber">
      <label htmlFor="timeline-date">Day</label>
      <input
        id="timeline-date"
        type="date"
        min={from}
        max={to}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" className="btn-text" onClick={onClear}>
          Show all
        </button>
      )}
    </div>
  );
}
