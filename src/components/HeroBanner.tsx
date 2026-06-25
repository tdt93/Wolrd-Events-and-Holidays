interface HeroBannerProps {
  countryName: string | null;
  eventCount: number;
  dateLabel: string;
}

export function HeroBanner({
  countryName,
  eventCount,
  dateLabel,
}: HeroBannerProps) {
  return (
    <section className="hero-banner" aria-label="Welcome">
      <div className="hero-banner__glow" aria-hidden="true" />
      <div className="hero-banner__content">
        <p className="hero-banner__eyebrow">Global Holidays & Events Map</p>
        <h1 className="hero-banner__title">
          {countryName
            ? `Celebrations in ${countryName}`
            : "Discover celebrations worldwide"}
        </h1>
        <p className="hero-banner__subtitle">
          {countryName ? (
            <>
              <strong>{eventCount}</strong> upcoming in{" "}
              <span>{dateLabel}</span>
            </>
          ) : (
            <>Click any country on the map to explore holidays · {dateLabel}</>
          )}
        </p>
      </div>
      <div className="hero-banner__decor" aria-hidden="true">
        <span className="hero-banner__orb hero-banner__orb--sun" />
        <span className="hero-banner__orb hero-banner__orb--sky" />
      </div>
    </section>
  );
}
