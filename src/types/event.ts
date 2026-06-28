export type HolidayType =
  | "Public"
  | "Bank"
  | "School"
  | "Authorities"
  | "Optional"
  | "Observance";

export type EventCategory =
  | "holiday"
  | "music"
  | "festival"
  | "sports"
  | "arts"
  | "community"
  | "other";

export type SportSubcategory =
  | "football"
  | "basketball"
  | "american-football"
  | "hockey"
  | "baseball"
  | "tennis"
  | "motorsport"
  | "other";

export type EventSource =
  | "nager"
  | "calendarific"
  | "festivo"
  | "ticketmaster"
  | "eventbrite"
  | "seatgeek"
  | "api-football";

export interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  global: boolean;
  counties: string[] | null;
  types: HolidayType[];
  source?: "nager" | "calendarific" | "festivo";
}

export interface MapEvent {
  id: string;
  source: EventSource;
  title: string;
  localTitle?: string;
  startDate: string;
  endDate?: string;
  category: EventCategory;
  sportSub?: SportSubcategory;
  holidayTypes?: HolidayType[];
  countryCode: string;
  city?: string;
  venue?: string;
  info?: string;
  lat?: number;
  lng?: number;
  url?: string;
  imageUrl?: string;
  description?: string;
  isGlobal?: boolean;
  isLongWeekend?: boolean;
  region?: string;
  /** ISO/subdivision codes from holiday APIs (e.g. Festivo `IT-MILAN`, `US-CA`). */
  holidayRegions?: string[];
  countryName?: string;
  /** 0–100 interest score from ticket APIs + heuristics. */
  interestScore?: number;
  /** High-interest ticket events (top ~12%). */
  featured?: boolean;
  /** Raw popularity from SeatGeek when available. */
  popularity?: number;
}

export interface CountryMeta {
  countryCode: string;
  name: string;
  lat: number;
  lng: number;
}

export interface DateRange {
  from: string;
  to: string;
}

export type DatePreset =
  | "this-week"
  | "this-month"
  | "next-3-months"
  | "this-year"
  | "custom";

export type AppUrlPanel = "events" | "filters" | "settings" | "about";

export interface AppUrlState {
  country?: string;
  from?: string;
  to?: string;
  cat?: string[];
  ecat?: EventCategory[];
  globe?: boolean;
  nationalOnly?: boolean;
  region?: string;
  panel?: AppUrlPanel;
  event?: string;
}
