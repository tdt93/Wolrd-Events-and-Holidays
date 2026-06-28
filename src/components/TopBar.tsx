import type { AppLanguage } from "../hooks/useSettings";
import { t } from "../lib/locale";

interface TopBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  onNearMe: () => void;
  locating: boolean;
  language: AppLanguage;
  children?: React.ReactNode;
}

export function TopBar({
  search,
  onSearchChange,
  onNearMe,
  locating,
  language,
  children,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="logo">
        <span className="logo-icon" aria-hidden="true">
          🎪
        </span>
        <div className="logo-text-wrap">
          <span className="logo-text">{t("siteName", language)}</span>
          <span className="logo-tagline">{t("siteTagline", language)}</span>
        </div>
      </div>
      <div className="search-wrap">
        <input
          type="search"
          placeholder={t("searchCountries", language)}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={t("searchCountries", language)}
        />
      </div>
      <button
        type="button"
        className="filter-chip filter-chip--on filter-chip--action near-me-chip"
        onClick={onNearMe}
        disabled={locating}
      >
        {locating ? t("locating", language) : `📍 ${t("nearMe", language)}`}
      </button>
      {children}
    </header>
  );
}
