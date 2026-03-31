import i18n from "@/lib/i18n";

type Localized = string | Record<string, string>;

const cache = new Map<string, string>();

export function getLang() {
  return (i18n.resolvedLanguage || i18n.language || "en")
    .toLowerCase()
    .split("-")[0];
}

// 🔥 MAIN FUNCTION
export function tr(value: Localized, fallback = ""): string {
  if (!value) return fallback;

  // simple string → return
  if (typeof value === "string") return value;

  const lang = getLang();

  // exact match
  if (value[lang]) return value[lang];

  // fallback EN
  if (value.en) return value.en;

  return fallback;
}
