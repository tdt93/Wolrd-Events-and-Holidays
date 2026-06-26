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

export type EventSource =
  | "nager"
  | "calendarific"
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
  source?: "nager" | "calendarific";
}

export interface MapEvent {
  id: string;
  source: EventSource;
  title: string;
  localTitle?: string;
  startDate: string;
  endDate?: string;
  category: EventCategory;
  holidayTypes?: HolidayType[];
  countryCode: string;
  city?: string;
  venue?: string;
  info?: string;
  lat?: number;
  lng?: number;
  url?: string;
  description?: string;
  isGlobal?: boolean;
  isLongWeekend?: boolean;
  region?: string;
  countryName?: string;
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

export interface AppUrlState {
  country?: string;
  from?: string;
  to?: string;
  cat?: string[];
  ecat?: EventCategory[];
  globe?: boolean;
  nationalOnly?: boolean;
}
