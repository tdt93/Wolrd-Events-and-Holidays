import type { AppUrlPanel, AppUrlState, EventCategory } from "../types/event";
import { ALL_EVENT_CATEGORIES } from "./categories";
import { SITE_URL } from "./config";

const VALID_PANELS = new Set<AppUrlPanel>([
  "events",
  "filters",
  "settings",
  "about",
]);

function parsePanel(param: string | null): AppUrlPanel | undefined {
  if (!param) return undefined;
  return VALID_PANELS.has(param as AppUrlPanel)
    ? (param as AppUrlPanel)
    : undefined;
}

function parseEventCategories(
  param: string | null,
): EventCategory[] | undefined {
  if (!param) return undefined;
  const valid = new Set<string>(ALL_EVENT_CATEGORIES);
  const cats = param
    .split(",")
    .filter((c): c is EventCategory => valid.has(c));
  return cats.length ? cats : undefined;
}

export function parseUrlState(): AppUrlState {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get("cat");
  const ecat = params.get("ecat");
  const region = params.get("region");
  return {
    country: params.get("country")?.toUpperCase() || undefined,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    cat: cat ? cat.split(",").filter(Boolean) : undefined,
    ecat: parseEventCategories(ecat),
    globe: params.get("globe") !== "0",
    nationalOnly: params.get("national") === "1",
    region: region ? decodeURIComponent(region) : undefined,
    panel: parsePanel(params.get("panel")),
    event: params.get("event") || undefined,
  };
}

export function buildShareUrl(state: AppUrlState): string {
  const qs = serializeUrlQuery(state);
  return qs ? `${SITE_URL}/?${qs}` : `${SITE_URL}/`;
}

export function writeUrlState(state: AppUrlState): void {
  const qs = serializeUrlQuery(state);
  window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
}

function serializeUrlQuery(state: AppUrlState): string {
  const params = new URLSearchParams();
  if (state.country) params.set("country", state.country);
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  if (state.cat?.length) params.set("cat", state.cat.join(","));
  if (state.ecat?.length) params.set("ecat", state.ecat.join(","));
  if (state.region) params.set("region", state.region);
  if (state.globe === false) params.set("globe", "0");
  if (state.nationalOnly) params.set("national", "1");
  if (state.panel) params.set("panel", state.panel);
  if (state.event) params.set("event", state.event);
  return params.toString();
}
