import type { EventCategory, HolidayType, SportSubcategory } from "../types/event";

export interface CategoryStyle {
  id: HolidayType;
  label: string;
  bg: string;
  border: string;
  marker: string;
}

export const HOLIDAY_CATEGORIES: CategoryStyle[] = [
  {
    id: "Public",
    label: "Public",
    bg: "#d1fae5",
    border: "#10b981",
    marker: "#10b981",
  },
  {
    id: "Bank",
    label: "Bank",
    bg: "#cffafe",
    border: "#06b6d4",
    marker: "#06b6d4",
  },
  {
    id: "School",
    label: "School",
    bg: "#dbeafe",
    border: "#3b82f6",
    marker: "#3b82f6",
  },
  {
    id: "Observance",
    label: "Observance",
    bg: "#ede9fe",
    border: "#8b5cf6",
    marker: "#8b5cf6",
  },
  {
    id: "Optional",
    label: "Optional",
    bg: "#fef3c7",
    border: "#f59e0b",
    marker: "#f59e0b",
  },
  {
    id: "Authorities",
    label: "Authorities",
    bg: "#f1f5f9",
    border: "#64748b",
    marker: "#64748b",
  },
];

export const EVENT_CATEGORIES: {
  id: EventCategory;
  label: string;
  icon: string;
  bg: string;
  border: string;
}[] = [
  { id: "festival", label: "Festivals", icon: "🎪", bg: "#fce7f3", border: "#db2777" },
  { id: "sports", label: "Sports", icon: "⚽", bg: "#dcfce7", border: "#16a34a" },
  { id: "music", label: "Music", icon: "🎵", bg: "#ede9fe", border: "#7c3aed" },
  { id: "arts", label: "Arts", icon: "🎨", bg: "#ffedd5", border: "#ea580c" },
];

export const ALL_HOLIDAY_TYPES: HolidayType[] = HOLIDAY_CATEGORIES.map(
  (c) => c.id,
);
export const ALL_EVENT_CATEGORIES: EventCategory[] = EVENT_CATEGORIES.map(
  (c) => c.id,
);

export const SPORTS_SUBCATEGORIES: {
  id: SportSubcategory;
  label: string;
  icon: string;
  bg: string;
  border: string;
}[] = [
  { id: "football", label: "Football / Soccer", icon: "⚽", bg: "#dcfce7", border: "#16a34a" },
  { id: "basketball", label: "Basketball", icon: "🏀", bg: "#ffedd5", border: "#ea580c" },
  { id: "american-football", label: "American Football", icon: "🏈", bg: "#dbeafe", border: "#2563eb" },
  { id: "hockey", label: "Hockey", icon: "🏒", bg: "#e0f2fe", border: "#0284c7" },
  { id: "baseball", label: "Baseball", icon: "⚾", bg: "#fef3c7", border: "#d97706" },
  { id: "tennis", label: "Tennis", icon: "🎾", bg: "#ecfccb", border: "#65a30d" },
  { id: "motorsport", label: "Motorsport", icon: "🏎️", bg: "#f1f5f9", border: "#475569" },
  { id: "other", label: "Other sports", icon: "🏅", bg: "#f1f5f9", border: "#64748b" },
];

export const ALL_SPORT_SUBCATEGORIES: SportSubcategory[] =
  SPORTS_SUBCATEGORIES.map((c) => c.id);

export function getEventCategoryStyle(category: EventCategory) {
  return (
    EVENT_CATEGORIES.find((c) => c.id === category) ?? {
      id: "other" as EventCategory,
      label: "Event",
      icon: "📍",
      bg: "#f1f5f9",
      border: "#64748b",
    }
  );
}

export function getCategoryStyle(type: HolidayType): CategoryStyle {
  return (
    HOLIDAY_CATEGORIES.find((c) => c.id === type) ?? HOLIDAY_CATEGORIES[0]
  );
}

export function getPrimaryHolidayType(types: HolidayType[]): HolidayType {
  const order: HolidayType[] = [
    "Public",
    "Bank",
    "School",
    "Observance",
    "Optional",
    "Authorities",
  ];
  for (const t of order) {
    if (types.includes(t)) return t;
  }
  return types[0] ?? "Public";
}
