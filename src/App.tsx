import { useEffect, useMemo, useState } from "react";
import { WorldMap } from "./components/WorldMap";
import { CountrySidebar } from "./components/CountrySidebar";
import { CategoryFilters } from "./components/CategoryFilters";
import { GlobeToggle } from "./components/GlobeToggle";
import { TopBar } from "./components/TopBar";
import { DatePresets } from "./components/DatePresets";
import { TripPlanner } from "./components/TripPlanner";
import { TimelineScrubber } from "./components/TimelineScrubber";
import { SlidePanel } from "./components/SlidePanel";
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
import "./styles/global.css";

type PanelId = "filters" | "events" | null;

const DEFAULT_EVENT_CATS: EventCategory[] = [
  "festival",
  "sports",
  "music",
  "arts",
];

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
    (initial.cat as HolidayType[]) ?? [],
  );
  const [selectedEventCats, setSelectedEventCats] =
    useState<EventCategory[]>(DEFAULT_EVENT_CATS);
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
  const [timelineDate, setTimelineDate] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<PanelId>(null);

  const {
    selected,
    hoveredCode,
    setHoveredCode,
    selectCountry,
    clearSelection,
  } = useMapSelection();

  const countries = useCountries();
  const { watchlist, toggle, isWatched } = useWatchlist();

  const { events: holidayEvents, loading, error } = useHolidays({
    countryCode: selected?.code ?? null,
    countryName: selected?.name ?? null,
    year,
    centroid: selected?.centroid,
  });

  const { events: ticketEvents } = useTicketmasterEvents({
    countryCode: selected?.code ?? null,
    categories: selectedEventCats,
    enabled: Boolean(selected?.code),
  });

  const heatmapCounts = useCountryHeatmap(year, from, to, showHeatmap);

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
    writeUrlState({
      country: selected?.code,
      from,
      to,
      cat: selectedTypes,
      globe: isGlobe,
      nationalOnly,
    });
  }, [selected, from, to, selectedTypes, isGlobe, nationalOnly]);

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
    );

    if (longWeekendOnly) {
      merged = merged.filter((e) => e.isLongWeekend);
    }

    if (timelineDate) {
      merged = merged.filter((e) => e.startDate === timelineDate);
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
    timelineDate,
  ]);

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

  const handleNearMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = await res.json();
          const code = resolveCountryCode(
            data.address?.country_code?.toUpperCase() ?? "",
          );
          if (!code) return;
          const name =
            data.address?.country ??
            countries.find((c) => c.countryCode === code)?.name ??
            code;
          selectCountry({
            code,
            name,
            centroid: [longitude, latitude],
          });
          setOpenPanel("events");
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
    const c = countries.find((x) => x.countryCode === code);
    if (c) {
      selectCountry({
        code: c.countryCode,
        name: c.name,
        centroid: [0, 20],
      });
      setSearch("");
      setOpenPanel("events");
    }
  };

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return countries
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.countryCode.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [search, countries]);

  const handleSelectFromMap = (country: SelectedCountry) => {
    const code = resolveCountryCode(country.code);
    if (!code) return;
    selectCountry({ ...country, code });
    setOpenPanel("events");
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
          timelineDate={timelineDate}
        />
      </div>

      <header className="float-header">
        <TopBar
          search={search}
          onSearchChange={setSearch}
          onNearMe={handleNearMe}
          locating={locating}
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
        <GlobeToggle isGlobe={isGlobe} onChange={setIsGlobe} />
      </div>

      <div className="float-dock">
        <button
          type="button"
          className={`dock-btn ${openPanel === "filters" ? "active" : ""}`}
          onClick={() => togglePanel("filters")}
          title="Filters & dates"
        >
          🎛️
        </button>
        <button
          type="button"
          className={`dock-btn ${openPanel === "events" ? "active" : ""}`}
          onClick={() => togglePanel("events")}
          title="Events list"
        >
          📋
          {filteredEvents.length > 0 && (
            <span className="dock-badge">{filteredEvents.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`dock-btn ${showHeatmap ? "active" : ""}`}
          onClick={() => setShowHeatmap((v) => !v)}
          title="Toggle heatmap"
        >
          🔥
        </button>
      </div>

      {selected && (
        <div className="float-selection">
          <span>{selected.name}</span>
          <button type="button" onClick={clearSelection} aria-label="Clear">
            ✕
          </button>
        </div>
      )}

      <SlidePanel
        open={openPanel === "filters"}
        onClose={() => setOpenPanel(null)}
        title="Filters & dates"
        side="left"
      >
        <DatePresets
          active={datePreset}
          onChange={handlePreset}
          from={from}
          to={to}
          onCustomRange={handleCustomRange}
        />
        <TripPlanner
          enabled={tripMode}
          onEnabledChange={setTripMode}
          tripFrom={tripFrom}
          tripTo={tripTo}
          onTripFromChange={setTripFrom}
          onTripToChange={setTripTo}
        />
        <TimelineScrubber
          from={from}
          to={to}
          value={timelineDate ?? ""}
          onChange={(d) => setTimelineDate(d || null)}
          onClear={() => setTimelineDate(null)}
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
        />
        {watchlist.length > 0 && (
          <div className="watchlist-inline">
            <span className="category-filters__title">Watching</span>
            <div className="filter-row">
              {watchlist.map((code) => {
                const c = countries.find((x) => x.countryCode === code);
                return (
                  <button
                    key={code}
                    type="button"
                    className="watch-chip"
                    onClick={() =>
                      c &&
                      selectCountry({
                        code: c.countryCode,
                        name: c.name,
                        centroid: [0, 20],
                      })
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
        title={selected?.name ?? "Events"}
        side="right"
      >
        <CountrySidebar
          countryName={selected?.name ?? null}
          countryCode={selected?.code ?? null}
          events={filteredEvents}
          loading={loading}
          error={error}
          isWatched={selected ? isWatched(selected.code) : false}
          onToggleWatch={() => selected && toggle(selected.code)}
          tripMode={tripMode}
          tripFrom={tripFrom}
          tripTo={tripTo}
        />
      </SlidePanel>
    </div>
  );
}
