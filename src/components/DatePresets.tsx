import type { DatePreset } from "../types/event";

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "this-week", label: "This week" },
  { id: "this-month", label: "This month" },
  { id: "next-3-months", label: "Next 3 months" },
  { id: "this-year", label: "This year" },
];

interface DatePresetsProps {
  active: DatePreset;
  onChange: (preset: DatePreset) => void;
  from: string;
  to: string;
  onCustomRange: (from: string, to: string) => void;
}

export function DatePresets({
  active,
  onChange,
  from,
  to,
  onCustomRange,
}: DatePresetsProps) {
  return (
    <div className="date-presets">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`preset-btn ${active === p.id ? "active" : ""}`}
          onClick={() => onChange(p.id)}
        >
          {p.label}
        </button>
      ))}
      <div className="custom-range">
        <input
          type="date"
          value={from}
          onChange={(e) => {
            onCustomRange(e.target.value, to);
          }}
          aria-label="From date"
        />
        <span>→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => {
            onCustomRange(from, e.target.value);
          }}
          aria-label="To date"
        />
      </div>
    </div>
  );
}
