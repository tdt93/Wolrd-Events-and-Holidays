import type { AppUrlState, EventCategory } from "../types/event";
import { ALL_EVENT_CATEGORIES } from "./categories";

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
  return {
    country: params.get("country")?.toUpperCase() || undefined,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    cat: cat ? cat.split(",").filter(Boolean) : undefined,
    ecat: parseEventCategories(ecat),
    globe: params.get("globe") !== "0",
    nationalOnly: params.get("national") === "1",
  };
}

export function writeUrlState(state: AppUrlState): void {
  const params = new URLSearchParams();
  if (state.country) params.set("country", state.country);
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  if (state.cat?.length) params.set("cat", state.cat.join(","));
  if (state.ecat?.length) params.set("ecat", state.ecat.join(","));
  if (state.globe === false) params.set("globe", "0");
  if (state.nationalOnly) params.set("national", "1");

  const qs = params.toString();
  const url = qs
    ? `${window.location.pathname}?${qs}`
    : window.location.pathname;
  window.history.replaceState(null, "", url);
}
