/** ISO 3166-1 alpha-2 → flag image URL (reliable on Windows vs emoji flags) */
export function countryFlagUrl(code: string | null | undefined): string | null {
  const upper = code?.trim().toUpperCase();
  if (!upper || !/^[A-Z]{2}$/.test(upper)) return null;
  return `https://flagcdn.com/w40/${upper.toLowerCase()}.png`;
}

/** @deprecated Use countryFlagUrl — emoji flags often fail on Windows */
export function countryCodeToFlag(code: string): string {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "🏳️";
  return String.fromCodePoint(
    ...[...upper].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
