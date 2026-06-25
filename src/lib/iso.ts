import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

countries.registerLocale(en);

export function iso3ToIso2(iso3: string): string | null {
  return countries.alpha3ToAlpha2(iso3.toUpperCase()) ?? null;
}

export function iso2ToName(iso2: string): string | undefined {
  return countries.getName(iso2.toUpperCase(), "en");
}

export function resolveCountryCode(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.length === 2) return upper;
  if (upper.length === 3) return iso3ToIso2(upper);
  return null;
}
