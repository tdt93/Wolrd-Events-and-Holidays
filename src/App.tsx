import { useEffect, useMemo, useState } from "react";
import { WorldMap } from "./components/WorldMap";
import { CountrySidebar } from "./components/CountrySidebar";
import { CategoryFilters } from "./components/CategoryFilters";
import { GlobeToggle } from "./components/GlobeToggle";
import { TopBar } from "./components/TopBar";
import { DatePresets } from "./components/DatePresets";
import { TripPlanner } from "./components/TripPlanner";
import { SlidePanel } from "./components/SlidePanel";
import { DockButton } from "./components/DockButton";
import { RegionPicker } from "./components/RegionPicker";
import {
  IconFilter,
  IconHeatmap,
  IconGitHub,
  IconInfo,
  IconList,
  IconSettings,
} from "./components/DockIcons";
import { useHolidays, useCountries, useCountryHeatmap } from "./hooks/useHolidays";
import { useMapSelection } from "./hooks/useMapSelection";
import type { SelectedCountry } from "./hooks/useMapSelection";
import { useWatchlist } from "./hooks/useWatchlist";
import { useTicketmasterEvents } from "./hooks/useEvents";
import type { DatePreset, EventCategory, HolidayType, MapEvent } from "./types/event";
import {
  filterByDateRange,
  filterEvents,
  getDatePresetRange,
} from "./lib/geocode";
import { parseUrlState, writeUrlState } from "./lib/urlState";
import { resolveCountryCode } from "./lib/iso";
import { REPO_URL } from "./lib/config";
import { CountryFlag } from "./components/CountryFlag";
import { useSettings } from "./hooks/useSettings";
import {
  ALL_EVENT_CATEGORIES,
  ALL_HOLIDAY_TYPES,
} from "./lib/categories";
import { countryNameInLang, LANGUAGE_OPTIONS, localizeCountryList, t } from "./lib/locale";
import "./styles/global.css";

type PanelId = "filters" | "events" | "settings" | "about" | null;

export default function App() {
  const initial = parseUrlState();
  const year = new Date().getFullYear();

  const [isGlobe, setIsGlobe] = useState(initial.globe !== false);
  const [datePreset, setDatePreset] = useState<DatePreset>("this-year");
  const [from, setFrom] = useState(
    initial.from ?? getDatePresetRange("this-year").from,
  );
  const [to, setTo] = useState(
    initial.to ?? getDatePresetRange("this-year").to,
  );
  const [selectedTypes, setSelectedTypes] = useState<HolidayType[]>(
    (initial.cat as HolidayType[])?.length
      ? (initial.cat as HolidayType[])
      : [...ALL_HOLIDAY_TYPES],
  );
  const [selectedEventCats, setSelectedEventCats] = useState<EventCategory[]>(
    initial.ecat?.length ? initial.ecat : [...ALL_EVENT_CATEGORIES],
  );
  const [nationalOnly, setNationalOnly] = useState(
    initial.nationalOnly ?? false,
  );
  const [longWeekendOnly, setLongWeekendOnly] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [search, setSearch] = useState("");
  const [locating, setLocating] = useState(false);
  const [tripMode, setTripMode] = useState(false);
  const [tripFrom, setTripFrom] = useState(from);
  const [tripTo, setTripTo] = useState(to);
  const [openPanel, setOpenPanel] = useState<PanelId>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const {
    selected,
    hoveredCode,
    setHoveredCode,
    selectCountry,
    clearSelection,
  } = useMapSelection();

  const countries = useCountries();
  const { watchlist, toggle, isWatched } = useWatchlist();
  const { settings, setLanguage, setShowCountryNames } = useSettings();

  const localizedCountries = useMemo(
    () => localizeCountryList(countries, settings.language),
    [countries, settings.language],
  );

  const selectedDisplayName = useMemo(() => {
    if (!selected?.code) return null;
    return (
      countryNameInLang(selected.code, settings.language) ?? selected.name
    );
  }, [selected, settings.language]);

  const { events: holidayEvents, loading, error } = useHolidays({
    countryCode: selected?.code ?? null,
    countryName: selected?.name ?? null,
    year,
    centroid: selected?.centroid,
  });

  const eventRangeFrom = tripMode ? tripFrom : from;
  const eventRangeTo = tripMode ? tripTo : to;

  const { events: ticketEvents } = useTicketmasterEvents({
    countryCode: selected?.code ?? null,
    categories: selectedEventCats,
    from: eventRangeFrom,
    to: eventRangeTo,
    enabled: Boolean(selected?.code),
  });

  const heatmapCounts = useCountryHeatmap(year, from, to, true);

  useEffect(() => {
    if (initial.country && countries.length > 0) {
      const match = countries.find(
        (c) => c.countryCode === initial.country,
      );
      if (match) {
        selectCountry({
          code: match.countryCode,
          name: match.name,
          centroid: [0, 20],
        });
      }
    }
  }, [initial.country, countries, selectCountry]);

  useEffect(() => {
    setSelectedRegion(null);
  }, [selected?.code]);

  useEffect(() => {
    writeUrlState({
      country: selected?.code,
      from,
      to,
      cat: selectedTypes,
      ecat: selectedEventCats,
      globe: isGlobe,
      nationalOnly,
    });
  }, [
    selected,
    from,
    to,
    selectedTypes,
    selectedEventCats,
    isGlobe,
    nationalOnly,
  ]);

  useEffect(() => {
    const syncFromUrl = () => {
      const state = parseUrlState();
      setSelectedTypes(
        state.cat?.length ? (state.cat as HolidayType[]) : [...ALL_HOLIDAY_TYPES],
      );
      setSelectedEventCats(
        state.ecat?.length ? state.ecat : [...ALL_EVENT_CATEGORIES],
      );
      if (state.from) setFrom(state.from);
      if (state.to) setTo(state.to);
      if (state.nationalOnly != null) {
        setNationalOnly(state.nationalOnly);
      }
      if (state.globe != null) setIsGlobe(state.globe);
    };
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    for (const e of [...holidayEvents, ...ticketEvents]) {
      if (e.region) set.add(e.region);
      if (e.city) set.add(e.city);
    }
    return [...set].sort();
  }, [holidayEvents, ticketEvents]);

  const filteredEvents = useMemo(() => {
    const rangeFrom = tripMode ? tripFrom : from;
    const rangeTo = tripMode ? tripTo : to;

    let merged: MapEvent[] = [
      ...filterByDateRange(holidayEvents, rangeFrom, rangeTo),
      ...filterByDateRange(ticketEvents, rangeFrom, rangeTo),
    ];

    merged = filterEvents(
      merged,
      selectedTypes,
      selectedEventCats,
      nationalOnly,
      selectedRegion,
    );

    if (longWeekendOnly) {
      merged = merged.filter((e) => e.isLongWeekend);
    }

    return merged.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [
    holidayEvents,
    ticketEvents,
    from,
    to,
    tripMode,
    tripFrom,
    tripTo,
    selectedTypes,
    selectedEventCats,
    nationalOnly,
    longWeekendOnly,
    selectedRegion,
  ]);

  const handleClearFilters = () => {
    setSelectedTypes([...ALL_HOLIDAY_TYPES]);
    setSelectedEventCats([...ALL_EVENT_CATEGORIES]);
    setNationalOnly(false);
    setLongWeekendOnly(false);
  };

  const handlePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const range = getDatePresetRange(preset);
    setFrom(range.from);
    setTo(range.to);
  };

  const handleCustomRange = (newFrom: string, newTo: string) => {
    setDatePreset("custom");
    setFrom(newFrom);
    setTo(newTo);
  };

  const handleOpenCountry = (code: string, name: string) => {
    selectCountry({ code, name, centroid: [0, 20] });
    setOpenPanel("events");
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/geocode/reverse?lat=${latitude}&lon=${longitude}`,
          );
          const data = await res.json();
          const code = resolveCountryCode(
            data.address?.country_code?.toUpperCase() ?? "",
          );
          if (!code) return;
          const name =
            countryNameInLang(code, settings.language) ??
            data.address?.country ??
            localizedCountries.find((c) => c.countryCode === code)?.name ??
            code;
          handleOpenCountry(code, name);
        } catch {
          /* ignore */
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
    );
  };

  const handleSearchSelect = (code: string) => {
    const c = localizedCountries.find((x) => x.countryCode === code);
    if (c) {
      handleOpenCountry(c.countryCode, c.name);
      setSearch("");
    }
  };

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return localizedCountries
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.countryCode.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [search, localizedCountries]);

  const handleSelectFromMap = (country: SelectedCountry) => {
    const code = resolveCountryCode(country.code);
    if (!code) return;
    const name =
      countryNameInLang(code, settings.language) ?? country.name;
    handleOpenCountry(code, name);
  };

  const togglePanel = (id: PanelId) => {
    setOpenPanel((p) => (p === id ? null : id));
  };

  return (
    <div className="app app--map-first">
      <div className="map-stage">
        <WorldMap
          isGlobe={isGlobe}
          selectedCountry={selected}
          hoveredCode={hoveredCode}
          onHover={setHoveredCode}
          onSelect={handleSelectFromMap}
          events={filteredEvents}
          heatmapCounts={heatmapCounts}
          showHeatmap={showHeatmap}
          showCountryNames={settings.showCountryNames}
          language={settings.language}
        />
      </div>

      <header className="float-header">
        <TopBar
          search={search}
          onSearchChange={setSearch}
          onNearMe={handleNearMe}
          locating={locating}
          language={settings.language}
        />
        {searchResults.length > 0 && (
          <ul className="search-results search-results--float">
            {searchResults.map((c) => (
              <li key={c.countryCode}>
                <button
                  type="button"
                  onClick={() => handleSearchSelect(c.countryCode)}
                >
                  {c.name} ({c.countryCode})
                </button>
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="float-globe">
        <GlobeToggle
          isGlobe={isGlobe}
          onChange={setIsGlobe}
          language={settings.language}
        />
      </div>

      <div className="float-dock">
        <DockButton
          label={t("dockFilters", settings.language)}
          description={t("dockFiltersDesc", settings.language)}
          active={openPanel === "filters"}
          onClick={() => togglePanel("filters")}
        >
          <IconFilter />
        </DockButton>
        <DockButton
          label={t("dockEvents", settings.language)}
          description={t("dockEventsDesc", settings.language)}
          active={openPanel === "events"}
          onClick={() => togglePanel("events")}
          badge={filteredEvents.length}
        >
          <IconList />
        </DockButton>
        <DockButton
          label={t("dockHeatmap", settings.language)}
          description={t("dockHeatmapDesc", settings.language)}
          active={showHeatmap}
          onClick={() => setShowHeatmap((v) => !v)}
        >
          <IconHeatmap />
        </DockButton>
        <DockButton
          label={t("dockSettings", settings.language)}
          description={t("dockSettingsDesc", settings.language)}
          active={openPanel === "settings"}
          onClick={() => togglePanel("settings")}
        >
          <IconSettings />
        </DockButton>
        <DockButton
          label={t("dockAbout", settings.language)}
          description={t("dockAboutDesc", settings.language)}
          active={openPanel === "about"}
          onClick={() => togglePanel("about")}
        >
          <IconInfo />
        </DockButton>
      </div>

      {selected && (
        <div className="float-selection">
          <span>{selectedDisplayName ?? selected.name}</span>
          <button type="button" onClick={clearSelection} aria-label={t("clearSelection", settings.language)}>
            ✕
          </button>
        </div>
      )}

      <SlidePanel
        open={openPanel === "filters"}
        onClose={() => setOpenPanel(null)}
        title={t("filtersDates", settings.language)}
        closeLabel={t("close", settings.language)}
        side="left"
        bodyClassName="slide-panel__body--filters"
      >
        <DatePresets
          active={datePreset}
          onChange={handlePreset}
          from={from}
          to={to}
          onCustomRange={handleCustomRange}
          language={settings.language}
        />
        <TripPlanner
          enabled={tripMode}
          onEnabledChange={setTripMode}
          tripFrom={tripFrom}
          tripTo={tripTo}
          onTripFromChange={setTripFrom}
          onTripToChange={setTripTo}
          language={settings.language}
        />
        <CategoryFilters
          selectedHolidays={selectedTypes}
          onHolidayChange={setSelectedTypes}
          selectedEvents={selectedEventCats}
          onEventChange={setSelectedEventCats}
          nationalOnly={nationalOnly}
          onNationalOnlyChange={setNationalOnly}
          longWeekendOnly={longWeekendOnly}
          onLongWeekendOnlyChange={setLongWeekendOnly}
          onClearAll={handleClearFilters}
          language={settings.language}
        />
        {selected && (
          <RegionPicker
            countryCode={selected?.code ?? null}
            regions={availableRegions}
            selected={selectedRegion}
            onChange={setSelectedRegion}
            language={settings.language}
          />
        )}
        {watchlist.length > 0 && (
          <div className="watchlist-inline filter-card">
            <h3 className="filter-card__title">{t("watching", settings.language)}</h3>
            <div className="chip-grid">
              {watchlist.map((code) => {
                const c = localizedCountries.find((x) => x.countryCode === code);
                return (
                  <button
                    key={code}
                    type="button"
                    className="watch-chip"
                    onClick={() =>
                      c && handleOpenCountry(c.countryCode, c.name)
                    }
                  >
                    {c?.name ?? code}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </SlidePanel>

      <SlidePanel
        open={openPanel === "events"}
        onClose={() => setOpenPanel(null)}
        title={selectedDisplayName ?? t("eventsTitle", settings.language)}
        closeLabel={t("close", settings.language)}
        subtitle={selectedRegion ?? undefined}
        headerLeading={
          selected?.code ? (
            <CountryFlag
              code={selected.code}
              label={selectedDisplayName ?? selected.name}
              size={40}
            />
          ) : undefined
        }
        side="right"
        bodyClassName="slide-panel__body--events"
      >
        <CountrySidebar
          countryName={selectedDisplayName}
          countryCode={selected?.code ?? null}
          events={filteredEvents}
          loading={loading}
          error={error}
          isWatched={selected ? isWatched(selected.code) : false}
          onToggleWatch={() => selected && toggle(selected.code)}
          tripMode={tripMode}
          tripFrom={tripFrom}
          tripTo={tripTo}
          language={settings.language}
        />
      </SlidePanel>

      <SlidePanel
        open={openPanel === "settings"}
        onClose={() => setOpenPanel(null)}
        title={t("settings", settings.language)}
        closeLabel={t("close", settings.language)}
        side="left"
      >
        <div className="settings-group filter-card">
          <label className="settings-field">
            <span>{t("language", settings.language)}</span>
            <select
              value={settings.language}
              onChange={(e) =>
                setLanguage(e.target.value as typeof settings.language)
              }
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-toggle-row">
            <span>{t("showCountryNames", settings.language)}</span>
            <input
              type="checkbox"
              checked={settings.showCountryNames}
              onChange={(e) => setShowCountryNames(e.target.checked)}
            />
          </label>
          <label className="filter-toggle-row">
            <span>{t("showHeatmap", settings.language)}</span>
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
            />
          </label>
          <label className="filter-toggle-row">
            <span>{t("globe", settings.language)}</span>
            <input
              type="checkbox"
              checked={isGlobe}
              onChange={(e) => setIsGlobe(e.target.checked)}
            />
          </label>
        </div>
      </SlidePanel>

      <SlidePanel
        open={openPanel === "about"}
        onClose={() => setOpenPanel(null)}
        title={t("aboutTitle", settings.language)}
        closeLabel={t("close", settings.language)}
        side="left"
      >
        <div className="about-panel">
          {t("aboutBody", settings.language).split("\n\n").map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="repo-link"
            aria-label={t("viewGitHub", settings.language)}
            title={t("viewGitHub", settings.language)}
          >
            <IconGitHub size={32} />
          </a>
        </div>
      </SlidePanel>
    </div>
  );
}
