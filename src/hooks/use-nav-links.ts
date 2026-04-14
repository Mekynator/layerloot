import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n";
import i18n from "@/lib/i18n";

type NavSource = "manual" | "site_page";
type LocalizedText = string | Partial<Record<SupportedLanguage, string>>;

export interface MegaMenuConfig {
  enabled: boolean;
  layout: "categories" | "featured" | "full";
  featuredProductIds?: string[];
  bannerImageUrl?: string;
  bannerLink?: string;
  bannerText?: string;
  showCategories?: boolean;
  showNewArrivals?: boolean;
  showBestSellers?: boolean;
}

export interface NavItem {
  label: LocalizedText;
  to: string;
  source?: NavSource;
  pageId?: string;
  openInNewTab?: boolean;
  visible?: boolean;
  megaMenu?: MegaMenuConfig;
}

const currentLang = () => (i18n.resolvedLanguage || i18n.language || "en").split("-")[0] as SupportedLanguage;

const getLocalizedValue = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const lang = currentLang();
  const map = value as Partial<Record<SupportedLanguage, string>>;
  return map[lang] || map.en || fallback;
};

const sanitizeLocalizedLabel = (value: unknown): Partial<Record<SupportedLanguage, string>> => {
  if (typeof value === "string") return { en: value };
  if (!value || typeof value !== "object" || Array.isArray(value)) return { en: "" };
  const next: Partial<Record<SupportedLanguage, string>> = {};
  for (const lang of SUPPORTED_LANGUAGES) {
    const raw = (value as Record<string, unknown>)[lang];
    if (typeof raw === "string") next[lang] = raw;
  }
  if (!next.en) next.en = "";
  return next;
};

const isNavItem = (value: unknown): value is NavItem => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return "label" in item && typeof item.to === "string";
};

const normalizePath = (value?: string | null) => {
  if (!value) return "/";
  if (value === "/") return "/";
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
};

const asNavItems = (value: unknown): NavItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isNavItem).map((item) => ({
    label: typeof item.label === "string" || (item.label && typeof item.label === "object") ? item.label : "",
    to: normalizePath(item.to),
    source: item.source === "site_page" ? "site_page" : "manual",
    pageId: item.pageId,
    openInNewTab: Boolean(item.openInNewTab),
    visible: item.visible !== false,
  }));
};

const makeLabel = (en: string, da = en, de = en, es = en, ro = en): Partial<Record<SupportedLanguage, string>> => ({
  en, da, de, es, ro,
});

type NavEditorItem = {
  label: Partial<Record<SupportedLanguage, string>>;
  to: string;
  source: NavSource;
  pageId?: string;
  openInNewTab?: boolean;
  visible?: boolean;
  megaMenu?: MegaMenuConfig;
};

const toEditorItem = (item: NavItem): NavEditorItem => ({
  label: sanitizeLocalizedLabel(item.label),
  to: normalizePath(item.to || "/"),
  source: item.source === "site_page" ? "site_page" : "manual",
  pageId: item.pageId,
  openInNewTab: Boolean(item.openInNewTab),
  visible: item.visible !== false,
  megaMenu: item.megaMenu,
});

const defaultHeaderNav: NavEditorItem[] = [
  { label: makeLabel("Home", "Hjem", "Startseite", "Inicio", "Acasă"), to: "/", source: "manual", openInNewTab: false, visible: true },
  { label: makeLabel("Products", "Produkter", "Produkte", "Productos", "Produse"), to: "/products", source: "manual", openInNewTab: false, visible: true },
  { label: makeLabel("Create Your Own", "Skab Din Egen", "Erstelle Dein Eigenes", "Crea el Tuyo", "Creează Al Tău"), to: "/create-your-own", source: "manual", openInNewTab: false, visible: true },
  { label: makeLabel("Creations", "Kreationer", "Kreationen", "Creaciones", "Creații"), to: "/creations", source: "manual", openInNewTab: false, visible: true },
  { label: makeLabel("About", "Om Os", "Über Uns", "Acerca de", "Despre"), to: "/about", source: "manual", openInNewTab: false, visible: true },
];

const defaultFooterNav: NavEditorItem[] = [
  { label: makeLabel("Home", "Hjem", "Startseite", "Inicio", "Acasă"), to: "/", source: "manual", openInNewTab: false, visible: true },
  { label: makeLabel("Products", "Produkter", "Produkte", "Productos", "Produse"), to: "/products", source: "manual", openInNewTab: false, visible: true },
  { label: makeLabel("About", "Om Os", "Über Uns", "Acerca de", "Despre"), to: "/about", source: "manual", openInNewTab: false, visible: true },
  { label: makeLabel("Contact", "Kontakt", "Kontakt", "Contacto", "Contact"), to: "/contact", source: "manual", openInNewTab: false, visible: true },
];

function useStoredNavLinks(key: "nav_links" | "footer_nav_links", fallback: NavEditorItem[]) {
  const [links, setLinks] = useState<NavItem[]>(fallback);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
      if (!mounted) return;
      const storedItems = asNavItems(data?.value);
      if (storedItems.length > 0) {
        setLinks(storedItems.map(toEditorItem).filter((item) => item.visible !== false));
      } else {
        setLinks(fallback.filter((item) => item.visible !== false));
      }
    };
    void load();
    return () => { mounted = false; };
  }, [key, fallback]);

  return links;
}

export const useNavLinks = () => useStoredNavLinks("nav_links", defaultHeaderNav);
export const useFooterNavLinks = () => useStoredNavLinks("footer_nav_links", defaultFooterNav);
