import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MiniCart from "@/components/layout/MiniCart";
import AccountDropdown from "@/components/layout/AccountDropdown";
import { CountBadge } from "@/components/ui/count-badge";
import { useSavedItemsCount } from "@/hooks/use-saved-items-count";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavLinks, type NavItem } from "@/hooks/use-nav-links";
import MegaMenuDropdown from "@/components/layout/MegaMenuDropdown";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublishedSettings } from "@/hooks/use-published-settings";
import GlobalSectionRenderer from "@/components/layout/GlobalSectionRenderer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
// DropdownMenu no longer needed for account — using hover dropdown

type BrandingSettings = {
  brand_name?: string;
  brand_accent?: string;
  logo_text_left?: string | Record<string, string>;
  logo_text_right?: string | Record<string, string>;
  logo_image_url?: string;
  logo_link?: string;
  logo_alt?: string | Record<string, string>;
};

type HeaderSettings = {
  show_logo_icon?: boolean;
  show_logo_text?: boolean;
  show_cart_icon?: boolean;
  show_account_icon?: boolean;
  show_admin_icon?: boolean;
  show_mobile_menu?: boolean;
  desktop_nav_enabled?: boolean;
  mobile_nav_enabled?: boolean;
  logo_height_px?: number;
  logo_text_class?: string;
  account_label?: string | Record<string, string>;
  auth_label?: string | Record<string, string>;
  admin_label?: string | Record<string, string>;
  sign_out_label?: string | Record<string, string>;
  mobile_account_label?: string | Record<string, string>;
  mobile_admin_label?: string | Record<string, string>;
};

type SeenState = {
  ordersLastSeenAt: string | null;
  customRequestsLastSeenAt: string | null;
};

type FlyToCartState = {
  visible: boolean;
  image: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
};

const defaultBranding: BrandingSettings = {
  brand_name: "LayerLoot",
  brand_accent: "Loot",
  logo_text_left: "Layer",
  logo_text_right: "Loot",
  logo_image_url: "",
  logo_link: "/",
  logo_alt: "LayerLoot",
};

const defaultHeaderSettings: HeaderSettings = {
  show_logo_icon: true,
  show_logo_text: true,
  show_cart_icon: true,
  show_account_icon: true,
  show_admin_icon: true,
  show_mobile_menu: true,
  desktop_nav_enabled: true,
  mobile_nav_enabled: true,
  logo_height_px: 36,
  logo_text_class: "font-display text-2xl font-bold uppercase tracking-wider text-foreground",
  account_label: "My Account",
  auth_label: "Login / Register",
  admin_label: "Admin Dashboard",
  sign_out_label: "Sign Out",
  mobile_account_label: "My Account",
  mobile_admin_label: "Admin",
};

const getNotificationsStorageKey = (userId: string) => `layerloot_account_notifications_${userId}`;

const getLocalizedValue = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const lang = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase().split("-")[0];
  const map = value as Record<string, string>;
  return map[lang] || map.en || fallback;
};

const readSeenState = (userId: string): SeenState => {
  try {
    const raw = localStorage.getItem(getNotificationsStorageKey(userId));
    if (!raw) return { ordersLastSeenAt: null, customRequestsLastSeenAt: null };
    const parsed = JSON.parse(raw);
    return {
      ordersLastSeenAt: parsed?.ordersLastSeenAt ?? null,
      customRequestsLastSeenAt: parsed?.customRequestsLastSeenAt ?? null,
    };
  } catch {
    return { ordersLastSeenAt: null, customRequestsLastSeenAt: null };
  }
};

const getLatestDate = (values: (string | null | undefined)[]) => {
  const valid = values.filter(Boolean) as string[];
  if (valid.length === 0) return null;
  return valid.reduce((latest, current) =>
    new Date(current).getTime() > new Date(latest).getTime() ? current : latest,
  );
};

const isAfter = (dateStr?: string | null, compareStr?: string | null) => {
  if (!dateStr) return false;
  if (!compareStr) return true;
  return new Date(dateStr).getTime() > new Date(compareStr).getTime();
};

const normalizePath = (value?: string | null) => {
  if (!value) return "/";
  if (value === "/") return "/";
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
};

const isActiveLink = (pathname: string, to: string) => {
  const current = normalizePath(pathname);
  const target = normalizePath(to);
  if (target === "/") return current === "/";
  return current === target || current.startsWith(`${target}/`);
};

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [headerSettings, setHeaderSettings] = useState<HeaderSettings>(defaultHeaderSettings);
  const [hasAccountNotifications, setHasAccountNotifications] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const [cartGlow, setCartGlow] = useState(false);
  const [cartToast, setCartToast] = useState<{ visible: boolean; text: string }>({ visible: false, text: "" });
  const [flyToCart, setFlyToCart] = useState<FlyToCartState>({ visible: false, image: null, x: 0, y: 0, width: 0, height: 0 });
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();
  const { totalItems } = useCart();
  const { user } = useAuth();
  const navLinks = useNavLinks();
  const { t } = useTranslation();
  const cartButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  useEffect(() => {
    const fetchAccountNotifications = async () => {
      if (!user) { setHasAccountNotifications(false); return; }
      const seenState = readSeenState(user.id);
      const [ordersRes, customOrdersRes] = await Promise.all([
        supabase.from("orders").select("created_at").eq("user_id", user.id).order("created_at", { ascending: false }) as unknown as Promise<{ data: { created_at: string }[] | null; error: any }>,
        supabase.from("custom_orders").select("id, created_at, updated_at").eq("user_id", user.id).order("created_at", { ascending: false }) as unknown as Promise<{ data: { id: string; created_at: string; updated_at: string }[] | null; error: any }>,
      ]);
      const customOrders = customOrdersRes.data ?? [];
      const customOrderIds = customOrders.map((order) => order.id);
      let messages: { created_at: string }[] = [];
      if (customOrderIds.length > 0) {
        const { data: msgData } = await supabase.from("custom_order_messages").select("created_at, custom_order_id").in("custom_order_id", customOrderIds);
        messages = msgData ?? [];
      }
      const latestOrderActivityAt = getLatestDate((ordersRes.data ?? []).map((order) => order.created_at));
      const latestCustomActivityAt = getLatestDate([
        ...customOrders.flatMap((order) => [order.created_at, order.updated_at]),
        ...messages.map((msg) => msg.created_at),
      ]);
      const hasNewOrders = isAfter(latestOrderActivityAt, seenState.ordersLastSeenAt);
      const hasNewCustomRequests = isAfter(latestCustomActivityAt, seenState.customRequestsLastSeenAt);
      setHasAccountNotifications(hasNewOrders || hasNewCustomRequests);
    };
    void fetchAccountNotifications();
    const interval = window.setInterval(fetchAccountNotifications, 30000);
    return () => window.clearInterval(interval);
  }, [user]);

  useEffect(() => {
    fetchPublishedSettings(["branding", "header_settings"]).then((settings) => {
      if (settings.branding) setBranding({ ...defaultBranding, ...(settings.branding as BrandingSettings) });
      if (settings.header_settings) setHeaderSettings({ ...defaultHeaderSettings, ...(settings.header_settings as HeaderSettings) });
    });
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handleAddToCartEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        name?: string;
        image?: string | null;
        sourceRect?: { left: number; top: number; width: number; height: number } | null;
      };
      setCartPulse(true);
      setCartGlow(true);
      setCartToast({
        visible: true,
        text: detail?.name
          ? t("header.addedToCartNamed", { name: detail.name, defaultValue: `${detail.name} added to cart` })
          : t("header.addedToCart", "Added to cart"),
      });
      window.setTimeout(() => setCartPulse(false), 550);
      window.setTimeout(() => setCartGlow(false), 1600);
      window.setTimeout(() => setCartToast({ visible: false, text: "" }), 1900);
      const cartRect = cartButtonRef.current?.getBoundingClientRect();
      const sourceRect = detail?.sourceRect;
      if (detail?.image && cartRect && sourceRect) {
        setFlyToCart({ visible: true, image: detail.image, x: sourceRect.left, y: sourceRect.top, width: sourceRect.width, height: sourceRect.height });
        window.setTimeout(() => { setFlyToCart((prev) => ({ ...prev, visible: false })); }, 900);
      }
    };
    window.addEventListener("layerloot:add-to-cart", handleAddToCartEvent as EventListener);
    return () => { window.removeEventListener("layerloot:add-to-cart", handleAddToCartEvent as EventListener); };
  }, [t]);

  const logoLeft = getLocalizedValue(branding.logo_text_left, "Layer");
  const logoRight = getLocalizedValue(branding.logo_text_right, branding.brand_accent || "Loot");
  const logoLink = branding.logo_link || "/";
  const logoAlt = getLocalizedValue(branding.logo_alt, branding.brand_name || "Logo");
  const logoHeight = Math.max(20, Number(headerSettings.logo_height_px || 36));

  const desktopLinks = useMemo(
    () =>
      navLinks
        .filter((link) => !!link.to && !!link.label)
        .filter((link) => {
          const path = normalizePath(link.to);
          if (path === "/creations" && !user) return false;
          return true;
        })
        .map((link) => ({
          ...link,
          to: normalizePath(link.to),
          localizedLabel: getLocalizedValue(link.label, typeof link.label === "string" ? link.label : ""),
          megaMenu: (link as NavItem).megaMenu,
        })),
    [navLinks, i18n.resolvedLanguage, i18n.language, user],
  );

  const cartDestinationRect = cartButtonRef.current?.getBoundingClientRect();

  const savedCount = useSavedItemsCount();
  return (
    <>
      <GlobalSectionRenderer page="global_header_top" />

      <AnimatePresence>
        {flyToCart.visible && flyToCart.image && cartDestinationRect && (
          <motion.img
            src={flyToCart.image}
            alt=""
            className="pointer-events-none fixed z-[80] rounded-xl object-cover shadow-2xl"
            initial={{ left: flyToCart.x, top: flyToCart.y, width: flyToCart.width, height: flyToCart.height, opacity: 0.95, scale: 1 }}
            animate={{ left: cartDestinationRect.left + cartDestinationRect.width / 2 - 18, top: cartDestinationRect.top + cartDestinationRect.height / 2 - 18, width: 36, height: 36, opacity: 0.15, scale: 0.35, rotate: 12 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      <motion.header
        initial={false}
        animate={{
          backgroundColor: scrolled ? "hsl(225 44% 4% / 0.85)" : "hsl(225 44% 4% / 0.4)",
          backdropFilter: scrolled ? "blur(24px) saturate(1.2)" : "blur(16px)",
        }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-50 border-b border-border/10"
      >
        <div className="container flex h-16 items-center justify-between">
          <Link to={logoLink} className="flex items-center gap-2.5 group">
            {branding.logo_image_url ? (
              <img src={branding.logo_image_url} alt={logoAlt} style={{ height: `${logoHeight}px` }} className="w-auto object-contain" />
            ) : (
              <>
                {headerSettings.show_logo_icon && (
                  <img src={logoImg} alt={logoAlt} style={{ height: `${logoHeight}px` }} className="w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
                )}
                {headerSettings.show_logo_text && (
                  <span className={headerSettings.logo_text_class || defaultHeaderSettings.logo_text_class}>
                    {logoLeft}
                    <span className="gradient-text">{logoRight}</span>
                  </span>
                )}
              </>
            )}
          </Link>

          {headerSettings.desktop_nav_enabled && (
            <nav className="hidden items-center gap-1 md:flex">
              {desktopLinks.map((link) => {
                const linkEl = (
                  <Link
                    key={`${link.to}-${link.localizedLabel}`}
                    to={link.to}
                    className={`relative px-4 py-2 font-display text-sm uppercase tracking-widest transition-all duration-200 rounded-lg hover:bg-accent/10 ${
                      isActiveLink(location.pathname, link.to) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {link.localizedLabel}
                    {isActiveLink(location.pathname, link.to) && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                  </Link>
                );

                if (link.megaMenu?.enabled) {
                  return (
                    <MegaMenuDropdown
                      key={`mega-${link.to}-${link.localizedLabel}`}
                      config={link.megaMenu}
                      linkTo={link.to}
                    >
                      {linkEl}
                    </MegaMenuDropdown>
                  );
                }

                return linkEl;
              })}
            </nav>
          )}

          <div className="relative flex items-center gap-1">
            {headerSettings.show_cart_icon && (
              <>
                <MiniCart
                  cartButtonRef={cartButtonRef}
                  cartPulse={cartPulse}
                  cartGlow={cartGlow}
                  totalItems={totalItems}
                />
                <AnimatePresence>
                  {cartToast.visible && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      className="pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap rounded-full border border-primary/20 bg-card/90 px-3 py-1.5 text-xs font-medium text-primary shadow-lg backdrop-blur-xl"
                    >
                      {cartToast.text}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            <LanguageSwitcher />

            {headerSettings.show_account_icon && (
              <div className="relative">
                <AccountDropdown hasNotifications={hasAccountNotifications} />
                {savedCount > 0 && (
                  <CountBadge count={savedCount} className="right-0.5 top-0.5" />
                )}
              </div>
            )}

            {headerSettings.show_mobile_menu && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary md:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? t("nav.closeMenu", "Close menu") : t("nav.openMenu", "Open menu")}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && headerSettings.mobile_nav_enabled && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-border/10 bg-card/80 backdrop-blur-2xl px-4 pb-4 md:hidden"
            >
              {desktopLinks.map((link) => (
                <Link
                  key={`${link.to}-${link.localizedLabel}-mobile`}
                  to={link.to}
                  className={`block py-3.5 font-display text-sm uppercase tracking-widest transition-colors border-b border-border/5 ${
                    isActiveLink(location.pathname, link.to) ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {link.localizedLabel}
                </Link>
              ))}
              {user ? (
                <>
                  <Link to="/account" className="block py-3.5 font-display text-sm uppercase tracking-widest text-muted-foreground border-b border-border/5">
                    {getLocalizedValue(headerSettings.mobile_account_label, getLocalizedValue(headerSettings.account_label, t("nav.account", "My Account")))}
                  </Link>
                  {/* Mobile admin link removed — admin access is via /admin/login */}
                </>
              ) : (
                <Link to="/auth" className="block py-3.5 font-display text-sm uppercase tracking-widest text-muted-foreground">
                  {getLocalizedValue(headerSettings.auth_label, t("nav.login", "Login / Register"))}
                </Link>
              )}
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>

      <GlobalSectionRenderer page="global_header_bottom" />
    </>
  );
};

export default Header;
