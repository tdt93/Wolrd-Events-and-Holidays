import { useEffect } from "react";
import type { AppLanguage } from "../hooks/useSettings";
import { SITE_NAME } from "../lib/config";
import { SITE_DESCRIPTION } from "../lib/seo";

const HTML_LANG: Record<AppLanguage, string> = {
  en: "en",
  de: "de",
  fr: "fr",
  es: "es",
  vi: "vi",
  ja: "ja",
};

export function useSiteMeta(language: AppLanguage) {
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[language] ?? "en";
    document.title = `${SITE_NAME} — Global festivals, holidays & events`;

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute("content", SITE_DESCRIPTION);
    }
  }, [language]);
}
