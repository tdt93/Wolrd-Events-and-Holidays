import { useEffect, useRef, useState } from "react";
import type { AppLanguage } from "../hooks/useSettings";
import { t } from "../lib/locale";
import { SiteLogo } from "./SiteLogo";
import { IconDoodleNearMe } from "./NearMeIcon";

interface TopBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  onNearMe: () => void;
  locating: boolean;
  language: AppLanguage;
  searchListboxId?: string;
  searchExpanded?: boolean;
  children?: React.ReactNode;
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M16 16l4.5 4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TopBar({
  search,
  onSearchChange,
  onNearMe,
  locating,
  language,
  searchListboxId,
  searchExpanded = false,
  children,
}: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [searchOpen]);

  useEffect(() => {
    if (search.trim()) setSearchOpen(true);
  }, [search]);

  return (
    <header className="top-bar">
      <a href="/" className="logo logo-link" aria-label={t("siteName", language)}>
        <SiteLogo size={36} className="logo-icon" />
        <div className="logo-text-wrap">
          <span className="logo-text">{t("siteName", language)}</span>
          <span className="logo-tagline">{t("siteTagline", language)}</span>
        </div>
      </a>
      <button
        type="button"
        className={`icon-btn top-bar__search-toggle ${searchOpen ? "top-bar__search-toggle--open" : ""}`}
        onClick={() => setSearchOpen((open) => !open)}
        aria-expanded={searchOpen}
        aria-label={t("searchPlaceholder", language)}
      >
        <IconSearch />
      </button>
      <div className={`search-wrap ${searchOpen ? "search-wrap--open" : ""}`}>
        <input
          ref={searchInputRef}
          type="search"
          role="combobox"
          placeholder={t("searchPlaceholder", language)}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={t("searchPlaceholder", language)}
          aria-expanded={searchExpanded}
          aria-controls={searchListboxId}
          aria-autocomplete="list"
        />
      </div>
      <button
        type="button"
        className="filter-chip filter-chip--on filter-chip--action near-me-chip"
        onClick={onNearMe}
        disabled={locating}
      >
        {locating ? (
          t("locating", language)
        ) : (
          <>
            <IconDoodleNearMe />
            <span className="near-me-chip__label">{t("nearMe", language)}</span>
          </>
        )}
      </button>
      {children}
    </header>
  );
}
