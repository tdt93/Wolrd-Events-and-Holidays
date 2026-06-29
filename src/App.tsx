import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorldMap } from "./components/WorldMap";
import { CountrySidebar } from "./components/CountrySidebar";
import { GlobeToggle } from "./components/GlobeToggle";
import { TopBar } from "./components/TopBar";
import { SearchResultsPanel } from "./components/SearchResultsPanel";
import { TripPlanner } from "./components/TripPlanner";
import { BottomCardPanel } from "./components/BottomCardPanel";
import { DockButton } from "./components/DockButton";
import {
  IconHeatmap,
  IconGitHub,
  IconInfo,
  IconList,
  IconSettings,
  IconTrip,
} from "./components/DockIcons";
import { useHolidays, useCountries, useCountryHeatmap } from "./hooks/useHolidays";
import { useCountryRegions } from "./hooks/useCountryRegions";
import { useMapSelection } from "./hooks/useMapSelection";
import type { SelectedCountry } from "./hooks/useMapSelection";
import { useWatchlist } from "./hooks/useWatchlist";
import { useTicketmasterEvents } from "./hooks/useEvents";
import type { DatePreset, EventCategory, HolidayType, MapEvent, SportSubcategory } from "./types/event";
import {
  filterByDateRange,
  filterEvents,
  getDatePresetRange,
} from "./lib/geocode";
import { parseUrlState, writeUrlState, buildShareUrl } from "./lib/urlState";
import { resolveCountrySelection } from "./lib/countrySelect";
import { countryCodeFromNominatim } from "./lib/geocode";
import { resolveCountryCode } from "./lib/iso";
import { REPO_URL, SITE_VERSION } from "./lib/config";
import { CountryFlag } from "./components/CountryFlag";
import { useSettings } from "./hooks/useSettings";
import { useSiteMeta } from "./hooks/useSiteMeta";
import { usePanelShortcuts } from "./hooks/usePanelShortcuts";
import { useGroupedSearch } from "./hooks/useGroupedSearch";
import type {
  SearchCityHit,
  SearchCountryHit,
  SearchEventHit,
  SearchHolidayHit,
} from "./lib/globalSearch";
import { hasGroupedSearchResults } from "./lib/globalSearch";
import {
  ALL_EVENT_CATEGORIES,
  ALL_HOLIDAY_TYPES,
  ALL_SPORT_SUBCATEGORIES,
} from "./lib/categories";
import { countryNameInLang, LANGUAGE_OPTIONS, localizeCountryList, t, tf } from "./lib/locale";
import "./styles/global.css";

type PanelId = "filters" | "events" | "settings" | "about" | null;

const SEARCH_LISTBOX_ID = "global-search-results";

function initialPanelFromUrl(
  panel: ReturnType<typeof parseUrlState>["panel"],
  country?: string,
  event?: string,
): PanelId {
  if (panel) return panel;
  if (country || event) return "events";
  return null;
}

export default function App() {
  const initial = parseUrlState();
  const year = new Date().getFullYear();

  const [isGlobe, setIsGlobe] = useState(initial.globe !== false);
  const [datePreset, setDatePreset] = useState<DatePreset>(
    initial.from ? "custom" : "this-month",
  );
  const [from, setFrom] = useState(
    initial.from ?? getDatePresetRange("this-month").from,
  );
  const [to, setTo] = useState(
    initial.to ?? getDatePresetRange("this-month").to,
  );
  const [selectedTypes, setSelectedTypes] = useState<HolidayType[]>(
    (initial.cat as HolidayType[])?.length
      ? (initial.cat as HolidayType[])
      : [...ALL_HOLIDAY_TYPES],
  );
  const [selectedEventCats, setSelectedEventCats] = useState<EventCategory[]>(
    initial.ecat?.length ? initial.ecat : [...ALL_EVENT_CATEGORIES],
  );
  const [selectedSportSubs, setSelectedSportSubs] = useState<SportSubcategory[]>([
    ...ALL_SPORT_SUBCATEGORIES,
  ]);
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
  const [openPanel, setOpenPanel] = useState<PanelId>(
    initialPanelFromUrl(initial.panel, initial.country, initial.event),
  );
  const [eventFiltersOpen, setEventFiltersOpen] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(
    initial.event ?? null,
  );
  const pendingEventRef = useRef(initial.event);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(
    initial.region ?? null,
  );
  const [linkCopied, setLinkCopied] = useState(false);
  const pendingRegionRef = useRef(initial.region);
  const urlCountryHydratedRef = useRef(false);
  const userChangedCountryRef = useRef(false);
  const urlWriteEnabledRef = useRef(!initial.country);

  const markUserCountryChange = useCallback(() => {
    userChangedCountryRef.current = true;
    urlCountryHydratedRef.current = true;
    urlWriteEnabledRef.current = true;
  }, []);

  const {
    selected,
    hoveredCode,
    setHoveredCode,
    selectCountry,
    clearSelection,
  } = useMapSelection();

  const countries = useCountries();
  const { watchlist, toggle, isWatched } = useWatchlist();
  const { settings, setLanguage, setShowCountryNames, setShowKeyboardHints } =
    useSettings();

  useSiteMeta(settings.language);

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
    countryName: selectedDisplayName,
    year,
    centroid: selected?.centroid,
    language: settings.language,
  });

  const eventRangeFrom = tripMode ? tripFrom : from;
  const eventRangeTo = tripMode ? tripTo : to;

  const { events: ticketEvents, loading: ticketLoading } = useTicketmasterEvents({
    countryCode: selected?.code ?? null,
    countryName: selectedDisplayName,
    centroid: selected?.centroid,
    categories: selectedEventCats,
    from: eventRangeFrom,
    to: eventRangeTo,
    enabled: Boolean(selected?.code),
    language: settings.language,
  });

  const { geo: regionGeo, cityGeo, names: regionNames, loading: regionsLoading } =
    useCountryRegions(selected?.code ?? null);

  const heatmapCounts = useCountryHeatmap(year, from, to, true);

  useEffect(() => {
    if (
      urlCountryHydratedRef.current ||
      userChangedCountryRef.current ||
      !initial.country
    ) {
      urlWriteEnabledRef.current = true;
      return;
    }

    selectCountry(
      resolveCountrySelection(
        initial.country,
        countries,
        settings.language,
      ),
    );
    if (initial.region) {
      pendingRegionRef.current = initial.region;
    }
    if (initial.event) {
      pendingEventRef.current = initial.event;
      setExpandedEventId(initial.event);
    }
    setOpenPanel(
      initialPanelFromUrl(initial.panel, initial.country, initial.event),
    );
    urlCountryHydratedRef.current = true;
    urlWriteEnabledRef.current = true;
  }, [
    initial.country,
    initial.event,
    initial.panel,
    initial.region,
    countries,
    selectCountry,
    settings.language,
  ]);

  const prevCountryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selected?.code) {
      setEventFiltersOpen(false);
    }
  }, [selected?.code]);

  useEffect(() => {
    const code = selected?.code ?? null;
    if (prevCountryRef.current && prevCountryRef.current !== code) {
      setSelectedRegion(null);
      pendingRegionRef.current = undefined;
      setExpandedEventId(null);
      pendingEventRef.current = undefined;
    }
    prevCountryRef.current = code;
  }, [selected?.code]);

  useEffect(() => {
    const pending = pendingRegionRef.current;
    if (!pending || !selected?.code) return;
    if (regionNames.includes(pending)) {
      setSelectedRegion(pending);
      pendingRegionRef.current = undefined;
    }
  }, [regionNames, selected?.code]);

  useEffect(() => {
    if (!urlWriteEnabledRef.current) return;

    writeUrlState({
      country: selected?.code,
      from,
      to,
      cat: selectedTypes,
      ecat: selectedEventCats,
      globe: isGlobe,
      nationalOnly,
      region: selectedRegion ?? undefined,
      panel: openPanel ?? undefined,
      event: expandedEventId ?? undefined,
    });
  }, [
    selected,
    from,
    to,
    selectedTypes,
    selectedEventCats,
    isGlobe,
    nationalOnly,
    selectedRegion,
    openPanel,
    expandedEventId,
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
      if (state.region) {
        pendingRegionRef.current = state.region;
        setSelectedRegion(state.region);
      } else {
        pendingRegionRef.current = undefined;
        setSelectedRegion(null);
      }
      if (state.event) {
        pendingEventRef.current = state.event;
        setExpandedEventId(state.event);
      } else {
        pendingEventRef.current = undefined;
        setExpandedEventId(null);
      }
      if (state.panel) {
        setOpenPanel(state.panel);
      } else if (state.country || state.event) {
        setOpenPanel("events");
      } else {
        setOpenPanel(null);
      }
      if (state.country) {
        selectCountry(
          resolveCountrySelection(
            state.country,
            countries,
            settings.language,
          ),
        );
      } else {
        clearSelection();
      }
    };
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [countries, selectCountry, clearSelection, settings.language]);

  const handleCopyShareLink = useCallback(async () => {
    const url = buildShareUrl({
      country: selected?.code,
      from,
      to,
      cat: selectedTypes,
      ecat: selectedEventCats,
      globe: isGlobe,
      nationalOnly,
      region: selectedRegion ?? undefined,
      panel: openPanel ?? undefined,
      event: expandedEventId ?? undefined,
    });
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2200);
    } catch {
      window.prompt(t("copyShareLink", settings.language), url);
    }
  }, [
    selected?.code,
    from,
    to,
    selectedTypes,
    selectedEventCats,
    isGlobe,
    nationalOnly,
    selectedRegion,
    openPanel,
    expandedEventId,
    settings.language,
  ]);

  const buildFilteredEvents = useCallback(
    (rangeFrom: string, rangeTo: string) => {
      let merged: MapEvent[] = [
        ...filterByDateRange(holidayEvents, rangeFrom, rangeTo),
        ...filterByDateRange(ticketEvents, rangeFrom, rangeTo),
      ];

      if (selected?.code) {
        merged = merged.filter((e) => e.countryCode === selected.code);
      }

      merged = filterEvents(
        merged,
        selectedTypes,
        selectedEventCats,
        nationalOnly,
        selectedRegion,
        selectedSportSubs,
        selected?.code ?? null,
        regionGeo,
      );

      if (longWeekendOnly) {
        merged = merged.filter((e) => e.isLongWeekend);
      }

      return merged.sort((a, b) => a.startDate.localeCompare(b.startDate));
    },
    [
      holidayEvents,
      ticketEvents,
      selectedTypes,
      selectedEventCats,
      selectedSportSubs,
      nationalOnly,
      longWeekendOnly,
      selectedRegion,
      selected?.code,
      regionGeo,
    ],
  );

  const filteredEvents = useMemo(
    () =>
      buildFilteredEvents(
        tripMode ? tripFrom : from,
        tripMode ? tripTo : to,
      ),
    [buildFilteredEvents, tripMode, tripFrom, tripTo, from, to],
  );

  const dateRangeEventCount = useMemo(() => {
    if (!selected?.code) return null;
    return buildFilteredEvents(from, to).length;
  }, [buildFilteredEvents, from, to, selected?.code]);

  const searchableEvents = useMemo(() => {
    if (!selected?.code) return [];
    const seen = new Set<string>();
    return [...holidayEvents, ...ticketEvents].filter((event) => {
      if (event.countryCode !== selected.code) return false;
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
  }, [holidayEvents, ticketEvents, selected?.code]);

  const { results: groupedSearchResults, citiesLoading } = useGroupedSearch(
    search,
    localizedCountries,
    searchableEvents,
    settings.language,
  );

  const showSearchResults =
    search.trim().length > 0 &&
    (hasGroupedSearchResults(groupedSearchResults) || citiesLoading);

  useEffect(() => {
    const pending = pendingEventRef.current;
    if (!pending || !selected?.code) return;
    if (filteredEvents.some((e) => e.id === pending)) {
      setExpandedEventId(pending);
      pendingEventRef.current = undefined;
    }
  }, [filteredEvents, selected?.code]);

  const handleClearFilters = () => {
    setSelectedTypes([...ALL_HOLIDAY_TYPES]);
    setSelectedEventCats([...ALL_EVENT_CATEGORIES]);
    setSelectedSportSubs([...ALL_SPORT_SUBCATEGORIES]);
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

  const handleTripEnabledChange = (enabled: boolean) => {
    setTripMode(enabled);
    if (enabled && (!tripFrom || !tripTo)) {
      setTripFrom(from);
      setTripTo(to);
    }
  };

  const handleTripRangeChange = (tripStart: string, tripEnd: string) => {
    setTripFrom(tripStart);
    setTripTo(tripEnd);
    setTripMode(true);
  };

  const handleOpenCountry = (
    code: string,
    coords?: { lng: number; lat: number },
  ) => {
    markUserCountryChange();
    const resolved = resolveCountrySelection(
      code,
      localizedCountries,
      settings.language,
    );
    if (coords) {
      resolved.centroid = [coords.lng, coords.lat];
    }
    selectCountry(resolved);
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
          if (!res.ok || data?.error) return;

          const code = countryCodeFromNominatim(data);
          if (!code) return;

          handleOpenCountry(code, { lng: longitude, lat: latitude });
        } catch {
          /* ignore */
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const handleSearchSelectCountry = (hit: SearchCountryHit) => {
    handleOpenCountry(hit.countryCode);
    setSearch("");
  };

  const handleSearchSelectCity = (hit: SearchCityHit) => {
    handleOpenCountry(hit.countryCode, { lng: hit.lng, lat: hit.lat });
    setSearch("");
  };

  const ensureDateIncludes = (date: string) => {
    if (date < from) {
      setDatePreset("custom");
      setFrom(date);
    }
    if (date > to) {
      setDatePreset("custom");
      setTo(date);
    }
  };

  const handleSearchSelectEventLike = (
    hit: SearchEventHit | SearchHolidayHit,
  ) => {
    if (selected?.code !== hit.countryCode) {
      handleOpenCountry(hit.countryCode);
    }
    ensureDateIncludes(hit.startDate);
    pendingEventRef.current = hit.eventId;
    setExpandedEventId(hit.eventId);
    setOpenPanel("events");
    setSearch("");
  };

  const handleSelectFromMap = (country: SelectedCountry) => {
    markUserCountryChange();
    const code = resolveCountryCode(country.code);
    if (!code) return;
    const name =
      countryNameInLang(code, settings.language) ?? country.name;
    selectCountry({ ...country, code, name });
    setOpenPanel("events");
  };

  const togglePanel = useCallback((id: PanelId) => {
    setOpenPanel((p) => (p === id ? null : id));
  }, []);

  usePanelShortcuts(true, {
    onFilters: () => togglePanel("filters"),
    onEvents: () => togglePanel("events"),
    onHeatmap: () => setShowHeatmap((v) => !v),
    onSettings: () => togglePanel("settings"),
    onClose: () => setOpenPanel(null),
  });

  return (
    <div className="app app--map-first">
      <a className="skip-link" href="#main-map">
        {t("skipToMap", settings.language)}
      </a>
      <div className="map-stage">
        <WorldMap
          isGlobe={isGlobe}
          selectedCountry={selected}
          selectedRegion={selectedRegion}
          onRegionSelect={setSelectedRegion}
          regionGeo={regionGeo}
          cityGeo={cityGeo}
          hoveredCode={hoveredCode}
          onHover={setHoveredCode}
          onSelect={handleSelectFromMap}
          events={filteredEvents}
          heatmapCounts={heatmapCounts}
          showHeatmap={showHeatmap}
          showCountryNames={settings.showCountryNames}
          regionsLoading={regionsLoading}
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
          searchListboxId={SEARCH_LISTBOX_ID}
          searchExpanded={showSearchResults}
        />
        {showSearchResults && (
          <SearchResultsPanel
            results={groupedSearchResults}
            citiesLoading={citiesLoading}
            language={settings.language}
            listboxId={SEARCH_LISTBOX_ID}
            onSelectCountry={handleSearchSelectCountry}
            onSelectCity={handleSearchSelectCity}
            onSelectEvent={handleSearchSelectEventLike}
            onSelectHoliday={handleSearchSelectEventLike}
          />
        )}
        {settings.showKeyboardHints && !openPanel && (
          <div className="keyboard-hints-wrap">
            <div className="keyboard-hints" role="note">
              <span className="keyboard-hints__label">
                {t("keyboardHintsTitle", settings.language)}
              </span>
              <span className="keyboard-hints__item">
                <kbd>1</kbd> {t("dockEvents", settings.language)}
              </span>
              <span className="keyboard-hints__item">
                <kbd>2</kbd> {t("dockFilters", settings.language)}
              </span>
              <span className="keyboard-hints__item">
                <kbd>3</kbd> {t("dockHeatmap", settings.language)}
              </span>
              <span className="keyboard-hints__item">
                <kbd>4</kbd> {t("dockSettings", settings.language)}
              </span>
            </div>
            <button
              type="button"
              className="keyboard-hints__hide"
              onClick={() => setShowKeyboardHints(false)}
            >
              {t("hide", settings.language)}
            </button>
          </div>
        )}
        <div className="float-header__map-tools">
          <div className="float-globe">
            <GlobeToggle
              isGlobe={isGlobe}
              onChange={setIsGlobe}
              language={settings.language}
            />
          </div>
          {selected && (
            <div className="float-selection">
              {selected.code && (
                <CountryFlag
                  code={selected.code}
                  label={selectedDisplayName ?? selected.name}
                  size={22}
                />
              )}
              <span>{selectedDisplayName ?? selected.name}</span>
              <button
                type="button"
                onClick={clearSelection}
                aria-label={t("clearSelection", settings.language)}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="float-dock">
        <DockButton
          label={t("dockEvents", settings.language)}
          description={t("dockEventsDesc", settings.language)}
          active={openPanel === "events"}
          onClick={() => togglePanel("events")}
          badge={filteredEvents.length}
          shortcut="1"
          tone="mint"
        >
          <IconList />
        </DockButton>
        <DockButton
          label={t("dockFilters", settings.language)}
          description={t("dockFiltersDesc", settings.language)}
          active={openPanel === "filters"}
          onClick={() => togglePanel("filters")}
          shortcut="2"
          tone="sun"
        >
          <IconTrip />
        </DockButton>
        <DockButton
          label={t("dockHeatmap", settings.language)}
          description={t("dockHeatmapDesc", settings.language)}
          active={showHeatmap}
          onClick={() => setShowHeatmap((v) => !v)}
          shortcut="3"
          tone="heat"
        >
          <IconHeatmap />
        </DockButton>
        <DockButton
          label={t("dockSettings", settings.language)}
          description={t("dockSettingsDesc", settings.language)}
          active={openPanel === "settings"}
          onClick={() => togglePanel("settings")}
          shortcut="4"
          tone="sky"
        >
          <IconSettings />
        </DockButton>
        <DockButton
          label={t("dockAbout", settings.language)}
          description={t("dockAboutDesc", settings.language)}
          active={openPanel === "about"}
          onClick={() => togglePanel("about")}
          tone="rose"
        >
          <IconInfo />
        </DockButton>
      </div>

      <div className="bottom-card-stack">
      <BottomCardPanel
        open={openPanel === "events"}
        onToggle={() => togglePanel("events")}
        onClose={() => setOpenPanel(null)}
        title={selectedDisplayName ?? t("eventsTitle", settings.language)}
        peekTitle={
          selectedDisplayName
            ? tf("eventsInCountry", settings.language, {
                country: selectedDisplayName,
              })
            : t("dockEvents", settings.language)
        }
        closeLabel={t("close", settings.language)}
        pullDownLabel={t("pullDownToClose", settings.language)}
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
        stackIndex={0}
        stackTotal={4}
        tone="mint"
        bodyClassName="slide-panel__body--events"
      >
        <CountrySidebar
          countryName={selectedDisplayName}
          countryCode={selected?.code ?? null}
          events={filteredEvents}
          loading={loading || ticketLoading}
          error={error}
          isWatched={selected ? isWatched(selected.code) : false}
          onToggleWatch={() => selected && toggle(selected.code)}
          onShareLink={handleCopyShareLink}
          shareCopied={linkCopied}
          expandedEventId={expandedEventId}
          onExpandedEventChange={setExpandedEventId}
          tripMode={tripMode}
          tripFrom={tripFrom}
          tripTo={tripTo}
          filtersOpen={eventFiltersOpen}
          onFiltersToggle={() => setEventFiltersOpen((open) => !open)}
          datePreset={datePreset}
          onDatePresetChange={handlePreset}
          filterFrom={from}
          filterTo={to}
          onCustomRange={handleCustomRange}
          selectedHolidays={selectedTypes}
          onHolidayChange={setSelectedTypes}
          selectedEvents={selectedEventCats}
          onEventChange={setSelectedEventCats}
          selectedSportSubs={selectedSportSubs}
          onSportSubChange={setSelectedSportSubs}
          nationalOnly={nationalOnly}
          onNationalOnlyChange={setNationalOnly}
          longWeekendOnly={longWeekendOnly}
          onLongWeekendOnlyChange={setLongWeekendOnly}
          onClearFilters={handleClearFilters}
          regionNames={regionNames}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          regionsLoading={regionsLoading}
          watchlist={watchlist}
          countriesList={localizedCountries}
          onOpenCountry={(code) => handleOpenCountry(code)}
          language={settings.language}
        />
      </BottomCardPanel>

      <BottomCardPanel
        open={openPanel === "filters"}
        onToggle={() => togglePanel("filters")}
        onClose={() => setOpenPanel(null)}
        title={t("tripPlanner", settings.language)}
        peekTitle={t("tripPlanner", settings.language)}
        closeLabel={t("close", settings.language)}
        pullDownLabel={t("pullDownToClose", settings.language)}
        stackIndex={1}
        stackTotal={4}
        tone="sun"
        bodyClassName="slide-panel__body--filters"
      >
        <TripPlanner
          enabled={tripMode}
          onEnabledChange={handleTripEnabledChange}
          tripFrom={tripFrom}
          tripTo={tripTo}
          onTripFromChange={setTripFrom}
          onTripToChange={setTripTo}
          onTripRangeChange={handleTripRangeChange}
          matchCount={tripMode ? filteredEvents.length : null}
          totalInRangeCount={tripMode ? dateRangeEventCount : null}
          countrySelected={Boolean(selected?.code)}
          language={settings.language}
        />
      </BottomCardPanel>

      <BottomCardPanel
        open={openPanel === "settings"}
        onToggle={() => togglePanel("settings")}
        onClose={() => setOpenPanel(null)}
        title={t("settings", settings.language)}
        closeLabel={t("close", settings.language)}
        pullDownLabel={t("pullDownToClose", settings.language)}
        stackIndex={2}
        stackTotal={4}
        tone="sky"
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
            <span>{t("showKeyboardHints", settings.language)}</span>
            <input
              type="checkbox"
              checked={settings.showKeyboardHints}
              onChange={(e) => setShowKeyboardHints(e.target.checked)}
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
      </BottomCardPanel>

      <BottomCardPanel
        open={openPanel === "about"}
        onToggle={() => togglePanel("about")}
        onClose={() => setOpenPanel(null)}
        title={t("aboutTitle", settings.language)}
        closeLabel={t("close", settings.language)}
        pullDownLabel={t("pullDownToClose", settings.language)}
        stackIndex={3}
        stackTotal={4}
        tone="rose"
      >
        <div className="about-panel">
          {t("aboutBody", settings.language).split("\n\n").map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
          <section className="about-instructions">
            <h3>{t("aboutInstructionsTitle", settings.language)}</h3>
            <ul>
              {t("aboutInstructions", settings.language)
                .split("\n")
                .filter(Boolean)
                .map((line) => (
                  <li key={line.slice(0, 32)}>{line.replace(/^[•-]\s*/, "")}</li>
                ))}
            </ul>
          </section>
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
          <p className="about-version">
            {tf("siteVersion", settings.language, { version: SITE_VERSION })}
          </p>
        </div>
      </BottomCardPanel>
      </div>
    </div>
  );
}
