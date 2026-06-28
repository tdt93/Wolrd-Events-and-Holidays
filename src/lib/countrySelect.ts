import type { SelectedCountry } from "../hooks/useMapSelection";
import type { AppLanguage } from "../hooks/useSettings";
import { getCountryCentroid } from "./geocode";
import { iso2ToName } from "./iso";
import { countryNameInLang } from "./locale";

export function resolveCountrySelection(
  code: string,
  countriesList: { countryCode: string; name: string }[],
  lang: AppLanguage,
): SelectedCountry {
  const upper = code.toUpperCase();
  const match = countriesList.find((c) => c.countryCode === upper);
  const name =
    match?.name ?? countryNameInLang(upper, lang) ?? iso2ToName(upper) ?? upper;
  return {
    code: upper,
    name,
    centroid: getCountryCentroid(upper),
  };
}
