import { useCallback, useEffect, useState } from "react";

export type AppLanguage = "en" | "de" | "fr" | "es" | "vi" | "ja";

export interface AppSettings {
  language: AppLanguage;
  showCountryNames: boolean;
}

const STORAGE_KEY = "sunny-atlas-settings";

const DEFAULTS: AppSettings = {
  language: "en",
  showCountryNames: true,
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      language: parsed.language ?? DEFAULTS.language,
      showCountryNames: parsed.showCountryNames ?? DEFAULTS.showCountryNames,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const setLanguage = useCallback((language: AppLanguage) => {
    setSettings((s) => ({ ...s, language }));
  }, []);

  const setShowCountryNames = useCallback((showCountryNames: boolean) => {
    setSettings((s) => ({ ...s, showCountryNames }));
  }, []);

  return { settings, setLanguage, setShowCountryNames };
}
