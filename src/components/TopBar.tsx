interface TopBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  onNearMe: () => void;
  locating: boolean;
  children?: React.ReactNode;
}

export function TopBar({
  search,
  onSearchChange,
  onNearMe,
  locating,
  children,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="logo">
        <span className="logo-icon" aria-hidden="true">
          ☀️
        </span>
        <span className="logo-text">Sunny Atlas</span>
      </div>
      <div className="search-wrap">
        <input
          type="search"
          placeholder="Search countries…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search countries"
        />
      </div>
      <button
        type="button"
        className="btn-secondary near-me"
        onClick={onNearMe}
        disabled={locating}
      >
        {locating ? "Locating…" : "📍 Near me"}
      </button>
      {children}
    </header>
  );
}
