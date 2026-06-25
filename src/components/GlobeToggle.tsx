interface GlobeToggleProps {
  isGlobe: boolean;
  onChange: (globe: boolean) => void;
}

export function GlobeToggle({ isGlobe, onChange }: GlobeToggleProps) {
  return (
    <div className="globe-toggle" role="group" aria-label="Map projection">
      <button
        type="button"
        className={isGlobe ? "active" : ""}
        onClick={() => onChange(true)}
        aria-pressed={isGlobe}
      >
        🌍 Globe
      </button>
      <button
        type="button"
        className={!isGlobe ? "active" : ""}
        onClick={() => onChange(false)}
        aria-pressed={!isGlobe}
      >
        🗺️ Map
      </button>
    </div>
  );
}
