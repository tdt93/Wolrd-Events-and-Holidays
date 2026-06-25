export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export const DEFAULT_CENTER: [number, number] = [10, 25];
export const DEFAULT_ZOOM = 1.5;
export const COUNTRY_ZOOM = 4.5;

export const COUNTRY_GEOJSON_URL = "/geo/countries.geojson";

export const ISO_PROP = "ISO_A2";

export function countryCodeFromProps(
  props: Record<string, unknown>,
): string | null {
  const iso2 =
    (props.ISO_A2 as string) ||
    (props.iso_a2 as string) ||
    (props["ISO3166-1-Alpha-2"] as string);
  if (iso2 && iso2 !== "-99" && iso2 !== "XX") return iso2.toUpperCase();

  const iso3 =
    (props.id as string) ||
    (props.ISO_A3 as string) ||
    (props.adm0_a3 as string);
  if (iso3 && iso3.length === 3) return iso3.toUpperCase();

  return null;
}

export function countryNameFromProps(
  props: Record<string, unknown>,
): string {
  return (
    (props.ADMIN as string) ||
    (props.name as string) ||
    (props.NAME as string) ||
    "Unknown"
  );
}
