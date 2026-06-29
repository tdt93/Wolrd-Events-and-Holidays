import type { AppLanguage } from "../hooks/useSettings";
import {
  hasGroupedSearchResults,
  type GroupedSearchResults,
  type SearchCityHit,
  type SearchCountryHit,
  type SearchEventHit,
  type SearchHolidayHit,
} from "../lib/globalSearch";
import { t } from "../lib/locale";

interface SearchResultsPanelProps {
  results: GroupedSearchResults;
  citiesLoading: boolean;
  language: AppLanguage;
  listboxId: string;
  onSelectCountry: (hit: SearchCountryHit) => void;
  onSelectCity: (hit: SearchCityHit) => void;
  onSelectEvent: (hit: SearchEventHit) => void;
  onSelectHoliday: (hit: SearchHolidayHit) => void;
}

export function SearchResultsPanel({
  results,
  citiesLoading,
  language,
  listboxId,
  onSelectCountry,
  onSelectCity,
  onSelectEvent,
  onSelectHoliday,
}: SearchResultsPanelProps) {
  if (!hasGroupedSearchResults(results) && !citiesLoading) return null;

  return (
    <div
      id={listboxId}
      className="search-results search-results--grouped search-results--float"
      role="listbox"
      aria-label={t("searchResultsLabel", language)}
    >
      {results.countries.length > 0 && (
        <section className="search-results__group" aria-label={t("searchGroupCountries", language)}>
          <h3 className="search-results__heading">{t("searchGroupCountries", language)}</h3>
          <ul className="search-results__list">
            {results.countries.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="search-results__item"
                  role="option"
                  onClick={() => onSelectCountry(hit)}
                >
                  <span className="search-results__title">{hit.name}</span>
                  <span className="search-results__meta">{hit.countryCode}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(results.cities.length > 0 || citiesLoading) && (
        <section className="search-results__group" aria-label={t("searchGroupCities", language)}>
          <h3 className="search-results__heading">{t("searchGroupCities", language)}</h3>
          <ul className="search-results__list">
            {citiesLoading && results.cities.length === 0 && (
              <li className="search-results__status">{t("searchCitiesLoading", language)}</li>
            )}
            {results.cities.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="search-results__item"
                  role="option"
                  onClick={() => onSelectCity(hit)}
                >
                  <span className="search-results__title">{hit.name}</span>
                  <span className="search-results__meta">{hit.subtitle}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results.events.length > 0 && (
        <section className="search-results__group" aria-label={t("searchGroupEvents", language)}>
          <h3 className="search-results__heading">{t("searchGroupEvents", language)}</h3>
          <ul className="search-results__list">
            {results.events.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="search-results__item"
                  role="option"
                  onClick={() => onSelectEvent(hit)}
                >
                  <span className="search-results__title">{hit.title}</span>
                  <span className="search-results__meta">{hit.subtitle}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results.holidays.length > 0 && (
        <section className="search-results__group" aria-label={t("searchGroupHolidays", language)}>
          <h3 className="search-results__heading">{t("searchGroupHolidays", language)}</h3>
          <ul className="search-results__list">
            {results.holidays.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="search-results__item"
                  role="option"
                  onClick={() => onSelectHoliday(hit)}
                >
                  <span className="search-results__title">{hit.title}</span>
                  <span className="search-results__meta">{hit.subtitle}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
