/** In-memory cache for the current browser tab — cleared on full page reload. */

const store = new Map<string, unknown>();

export function sessionGet<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function sessionSet<T>(key: string, value: T): void {
  store.set(key, value);
}

export function sessionHas(key: string): boolean {
  return store.has(key);
}

export function holidaysCacheKey(
  countryCode: string,
  year: number,
  language: string,
): string {
  return `holidays:${countryCode}:${year}:${language}`;
}

export function ticketEventsCacheKey(
  countryCode: string,
  from: string,
  to: string,
  language: string,
  categories: string[],
): string {
  const cats = [...categories].sort().join(",");
  return `events:${countryCode}:${from}:${to}:${language}:${cats}`;
}

export function regionsCacheKey(countryCode: string): string {
  return `regions:${countryCode}`;
}
