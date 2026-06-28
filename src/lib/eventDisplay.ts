import type { AppLanguage } from "../hooks/useSettings";
import type { MapEvent } from "../types/event";

/** Primary title based on UI language (English name vs local name). */
export function eventPrimaryTitle(event: MapEvent, lang: AppLanguage): string {
  const title = event.title?.trim() || "";
  const local = event.localTitle?.trim();
  if (!local || local === title) return title;
  if (lang === "en") return title;
  return local;
}

/** Secondary title when primary and alternate differ. */
export function eventAltTitle(
  event: MapEvent,
  lang: AppLanguage,
): string | null {
  const primary = eventPrimaryTitle(event, lang);
  const alt = lang === "en" ? event.localTitle?.trim() : event.title?.trim();
  if (!alt || alt === primary) return null;
  return alt;
}
