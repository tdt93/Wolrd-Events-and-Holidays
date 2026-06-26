import type { AppLanguage } from "../hooks/useSettings";
import { t } from "../lib/locale";

interface GlobeToggleProps {
  isGlobe: boolean;
  onChange: (globe: boolean) => void;
  language: AppLanguage;
}

export function GlobeToggle({ isGlobe, onChange, language }: GlobeToggleProps) {
  return (
    <div className="globe-toggle" role="group" aria-label={t("globe", language)}>
      <button
        type="button"
        className={isGlobe ? "active" : ""}
        onClick={() => onChange(true)}
        aria-pressed={isGlobe}
      >
        🌍 {t("globeView", language)}
      </button>
      <button
        type="button"
        className={!isGlobe ? "active" : ""}
        onClick={() => onChange(false)}
        aria-pressed={!isGlobe}
      >
        🗺️ {t("mapView", language)}
      </button>
    </div>
  );
}
