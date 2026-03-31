import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, User, Menu, X, LogOut, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavLinks } from "@/components/admin/NavLinkEditor";
import { supabase } from "@/integrations/supabase/client";
import GlobalSectionRenderer from "@/components/layout/GlobalSectionRenderer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BrandingSettings = {
  brand_name?: string;
  brand_accent?: string;
  logo_text_left?: string;
  logo_text_right?: string;
  logo_image_url?: string;
  logo_link?: string;
  logo_alt?: string;
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
  account_label?: string;
  auth_label?: string;
  admin_label?: string;
  sign_out_label?: string;
  mobile_account_label?: string;
  mobile_admin_label?: string;
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
  logo_text_class: "font-display text-2xl font-bold uppercase tracking-wider text-secondary-foreground",
  account_label: "My Account",
  auth_label: "Login / Register",
  admin_label: "Admin Dashboard",
  sign_out_label: "Sign Out",
  mobile_account_label: "My Account",
  mobile_admin_label: "Admin",
};

const getNotificationsStorageKey = (userId: string) => `layerloot_account_notifications_${userId}`;

const readSeenState = (userId: string): SeenState => {
  try {
    const raw = localStorage.getItem(getNotificationsStorageKey(userId));
    if (!raw) {
      return {
        ordersLastSeenAt: null,
        customRequestsLastSeenAt: null,
      };
    }

    const parsed = JSON.parse(raw);
    return {
      ordersLastSeenAt: parsed?.ordersLastSeenAt ?? null,
      customRequestsLastSeenAt: parsed?.customRequestsLastSeenAt ?? null,
    };
  } catch {
    return {
      ordersLastSeenAt: null,
      customRequestsLastSeenAt: null,
    };
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
  const [adminAlerts, setAdminAlerts] = useState(0);
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [headerSettings, setHeaderSettings] = useState<HeaderSettings>(defaultHeaderSettings);
  const [hasAccountNotifications, setHasAccountNotifications] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const [cartGlow, setCartGlow] = useState(false);
  const [cartToast, setCartToast] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: "",
  });
  const [flyToCart, setFlyToCart] = useState<FlyToCartState>({
    visible: false,
    image: null,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const location = useLocation();
  const { totalItems } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const navLinks = useNavLinks();
  const cartButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const fetchAdminAlerts = async () => {
      if (!isAdmin) {
        setAdminAlerts(0);
        return;
      }

      const [ordersRes, customRes, reviewsRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
        supabase
          .from("custom_orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "reviewing", "quoted", "accepted"]),
        supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
      ]);

      setAdminAlerts((ordersRes.count ?? 0) + (customRes.count ?? 0) + (reviewsRes.count ?? 0));
    };

    void fetchAdminAlerts();
  }, [isAdmin, user]);

  useEffect(() => {
    const fetchAccountNotifications = async () => {
      if (!user) {
        setHasAccountNotifications(false);
        return;
      }

      const seenState = readSeenState(user.id);

      const [ordersRes, customOrdersRes] = await Promise.all([
        supabase
          .from("orders")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }) as unknown as Promise<{
          data: { created_at: string }[] | null;
          error: any;
        }>,
        supabase
          .from("custom_orders")
          .select("id, created_at, updated_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }) as unknown as Promise<{
          data: { id: string; created_at: string; updated_at: string }[] | null;
          error: any;
        }>,
      ]);

      const customOrders = customOrdersRes.data ?? [];
      const customOrderIds = customOrders.map((order) => order.id);

      let messages: { created_at: string }[] = [];

      if (customOrderIds.length > 0) {
        const { data: msgData } = await supabase
          .from("custom_order_messages")
          .select("created_at, custom_order_id")
          .in("custom_order_id", customOrderIds);

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
    Promise.all([
      supabase.from("site_settings").select("value").eq("key", "branding").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "header_settings").maybeSingle(),
    ]).then(([brandingRes, headerRes]) => {
      if (brandingRes.data?.value) {
        setBranding({
          ...defaultBranding,
          ...(brandingRes.data.value as BrandingSettings),
        });
      }

      if (headerRes.data?.value) {
        setHeaderSettings({
          ...defaultHeaderSettings,
          ...(headerRes.data.value as HeaderSettings),
        });
      }
    });
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
        text: detail?.name ? `${detail.name} added to cart` : "Added to cart",
      });

      window.setTimeout(() => setCartPulse(false), 550);
      window.setTimeout(() => setCartGlow(false), 1600);
      window.setTimeout(() => setCartToast({ visible: false, text: "" }), 1900);

      const cartRect = cartButtonRef.current?.getBoundingClientRect();
      const sourceRect = detail?.sourceRect;

      if (detail?.image && cartRect && sourceRect) {
        setFlyToCart({
          visible: true,
          image: detail.image,
          x: sourceRect.left,
          y: sourceRect.top,
          width: sourceRect.width,
          height: sourceRect.height,
        });

        window.setTimeout(() => {
          setFlyToCart((prev) => ({ ...prev, visible: false }));
        }, 900);
      }
    };

    window.addEventListener("layerloot:add-to-cart", handleAddToCartEvent as EventListener);
    return () => {
      window.removeEventListener("layerloot:add-to-cart", handleAddToCartEvent as EventListener);
    };
  }, []);

  const logoLeft = branding.logo_text_left || "Layer";
  const logoRight = branding.logo_text_right || branding.brand_accent || "Loot";
  const logoLink = branding.logo_link || "/";
  const logoAlt = branding.logo_alt || branding.brand_name || "Logo";
  const logoHeight = Math.max(20, Number(headerSettings.logo_height_px || 36));

  const desktopLinks = useMemo(
    () =>
      navLinks
        .filter((link) => !!link.to && !!link.label)
        .map((link) => ({
          ...link,
          to: normalizePath(link.to),
        })),
    [navLinks],
  );

  const cartDestinationRect = cartButtonRef.current?.getBoundingClientRect();

  return (
    <>
      <GlobalSectionRenderer page="global_header_top" />

      <AnimatePresence>
        {flyToCart.visible && flyToCart.image && cartDestinationRect && (
          <motion.img
            src={flyToCart.image}
            alt=""
            className="pointer-events-none fixed z-[80] rounded-xl object-cover shadow-2xl"
            initial={{
              left: flyToCart.x,
              top: flyToCart.y,
              width: flyToCart.width,
              height: flyToCart.height,
              opacity: 0.95,
              scale: 1,
            }}
            animate={{
              left: cartDestinationRect.left + cartDestinationRect.width / 2 - 18,
              top: cartDestinationRect.top + cartDestinationRect.height / 2 - 18,
              width: 36,
              height: 36,
              opacity: 0.15,
              scale: 0.35,
              rotate: 12,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 border-b border-border bg-secondary">
        <div className="container flex h-16 items-center justify-between">
          <Link to={logoLink} className="flex items-center gap-2">
            {branding.logo_image_url ? (
              <img
                src={branding.logo_image_url}
                alt={logoAlt}
                style={{ height: `${logoHeight}px` }}
                className="w-auto object-contain"
              />
            ) : (
              <>
                {headerSettings.show_logo_icon && (
                  <img
                    src={logoImg}
                    alt={logoAlt}
                    style={{ height: `${logoHeight}px` }}
                    className="w-auto object-contain"
                  />
                )}
                {headerSettings.show_logo_text && (
                  <span className={headerSettings.logo_text_class || defaultHeaderSettings.logo_text_class}>
                    {logoLeft}
                    <span className="text-primary">{logoRight}</span>
                  </span>
                )}
              </>
            )}
          </Link>

          {headerSettings.desktop_nav_enabled && (
            <nav className="hidden items-center gap-8 md:flex">
              {desktopLinks.map((link) => (
                <Link
                  key={`${link.label}-${link.to}`}
                  to={link.to}
                  className={`font-display text-sm uppercase tracking-widest transition-colors hover:text-primary ${
                    isActiveLink(location.pathname, link.to) ? "text-primary" : "text-secondary-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="relative flex items-center gap-2">
            {headerSettings.show_cart_icon && (
              <div className="relative">
                <Link to="/cart">
                  <motion.div
                    animate={
                      cartPulse
                        ? {
                            scale: [1, 0.92, 1.12, 1],
                            rotate: [0, -6, 4, 0],
                          }
                        : {
                            scale: 1,
                            rotate: 0,
                          }
                    }
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <Button
                      ref={cartButtonRef}
                      variant="ghost"
                      size="icon"
                      className={`relative text-secondary-foreground transition-all hover:text-foreground ${
                        cartGlow ? "shadow-[0_0_28px_hsl(var(--primary)/0.35)]" : ""
                      }`}
                    >
                      <ShoppingCart className="h-5 w-5" />
                      {totalItems > 0 && (
                        <motion.span
                          key={totalItems}
                          initial={{ scale: 0.7, opacity: 0.5 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs font-bold text-primary"
                        >
                          {totalItems}
                        </motion.span>
                      )}
                    </Button>
                  </motion.div>
                </Link>

                <AnimatePresence>
                  {cartToast.visible && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      className="pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap rounded-full border border-primary/20 bg-background/95 px-3 py-1.5 text-xs font-medium text-primary shadow-lg"
                    >
                      {cartToast.text}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {isAdmin && headerSettings.show_admin_icon && (
              <Link to="/admin">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-secondary-foreground hover:text-foreground"
                >
                  <Shield className="h-5 w-5" />
                  {adminAlerts > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />}
                </Button>
              </Link>
            )}

            {headerSettings.show_account_icon && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative text-secondary-foreground hover:text-primary"
                      >
                        <User className="h-5 w-5" />
                        {hasAccountNotifications && (
                          <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/account" className="cursor-pointer">
                          {headerSettings.account_label || defaultHeaderSettings.account_label}
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="cursor-pointer">
                            <Shield className="mr-2 h-4 w-4" />{" "}
                            {headerSettings.admin_label || defaultHeaderSettings.admin_label}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />{" "}
                        {headerSettings.sign_out_label || defaultHeaderSettings.sign_out_label}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/auth">
                    <Button variant="ghost" size="icon" className="text-secondary-foreground hover:text-primary">
                      <User className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
              </>
            )}

            {headerSettings.show_mobile_menu && (
              <Button
                variant="ghost"
                size="icon"
                className="text-secondary-foreground hover:text-primary md:hidden"
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>

        {mobileOpen && headerSettings.mobile_nav_enabled && (
          <nav className="border-t border-border bg-secondary px-4 pb-4 md:hidden">
            {desktopLinks.map((link) => (
              <Link
                key={`${link.label}-${link.to}`}
                to={link.to}
                className={`block py-3 font-display text-sm uppercase tracking-widest transition-colors hover:text-primary ${
                  isActiveLink(location.pathname, link.to) ? "text-primary" : "text-secondary-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <>
                <Link
                  to="/account"
                  className="block py-3 font-display text-sm uppercase tracking-widest text-secondary-foreground hover:text-primary"
                >
                  {headerSettings.mobile_account_label ||
                    headerSettings.account_label ||
                    defaultHeaderSettings.mobile_account_label}
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="block py-3 font-display text-sm uppercase tracking-widest text-secondary-foreground hover:text-primary"
                  >
                    {headerSettings.mobile_admin_label ||
                      headerSettings.admin_label ||
                      defaultHeaderSettings.mobile_admin_label}
                  </Link>
                )}
              </>
            ) : (
              <Link
                to="/auth"
                className="block py-3 font-display text-sm uppercase tracking-widest text-secondary-foreground hover:text-primary"
              >
                {headerSettings.auth_label || defaultHeaderSettings.auth_label}
              </Link>
            )}
          </nav>
        )}
      </header>

      <GlobalSectionRenderer page="global_header_bottom" />
    </>
  );
};

export default Header;
