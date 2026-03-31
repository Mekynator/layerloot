import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "@/locales/en/common.json";
import da from "@/locales/da/common.json";
import de from "@/locales/de/common.json";
import es from "@/locales/es/common.json";
import ro from "@/locales/ro/common.json";

export const SUPPORTED_LANGUAGES = ["en", "da", "de", "es", "ro"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  da: "Dansk",
  de: "Deutsch",
  es: "Español",
  ro: "Română",
};

export const LANGUAGE_STORAGE_KEY = "layerloot-language";

export function resolveLanguage(
  profileLang?: string | null,
  localLang?: string | null,
  browserLang?: string | null,
): SupportedLanguage {
  const normalize = (l?: string | null): SupportedLanguage => {
    if (!l) return "en";
    const short = l.toLowerCase().split("-")[0];
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(short)
      ? (short as SupportedLanguage)
      : "en";
  };

  if (profileLang) return normalize(profileLang);
  if (localLang) return normalize(localLang);
  return normalize(browserLang);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      da: { common: da },
      de: { common: de },
      es: { common: es },
      ro: { common: ro },
    },
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export default i18n;
