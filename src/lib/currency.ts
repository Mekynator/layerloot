import { getLang } from "@/lib/translate";

const LOCALE_MAP: Record<string, string> = {
  en: "en-DK",
  da: "da-DK",
  de: "de-DE",
  es: "es-ES",
  ro: "ro-RO",
};

export function formatPrice(amount: number, currency = "DKK"): string {
  const lang = getLang();
  const locale = LOCALE_MAP[lang] || "en-DK";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
