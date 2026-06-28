import type { AppLanguage } from "../hooks/useSettings";
import { t } from "../lib/locale";
import { IconDoodleFlatMap, IconDoodleGlobe } from "./ViewModeIcons";

interface GlobeToggleProps {
  isGlobe: boolean;
  onChange: (globe: boolean) => void;
  language: AppLanguage;
}

export function GlobeToggle({ isGlobe, onChange, language }: GlobeToggleProps) {
  const globeLabel = t("globeView", language);
  const mapLabel = t("mapView", language);
  const globeTip = t("globeViewTip", language);
  const mapTip = t("mapViewTip", language);

  return (
    <div
      className="globe-toggle globe-toggle--doodle"
      role="group"
      aria-label={t("globe", language)}
    >
      <button
        type="button"
        className={`globe-toggle__btn${isGlobe ? " active" : ""}`}
        onClick={() => onChange(true)}
        aria-pressed={isGlobe}
        aria-label={globeLabel}
        data-tooltip={globeTip}
      >
        <IconDoodleGlobe />
      </button>
      <button
        type="button"
        className={`globe-toggle__btn${!isGlobe ? " active" : ""}`}
        onClick={() => onChange(false)}
        aria-pressed={!isGlobe}
        aria-label={mapLabel}
        data-tooltip={mapTip}
      >
        <IconDoodleFlatMap />
      </button>
    </div>
  );
}
