import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, User, Menu, X, Layers, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavLinks } from "@/components/admin/NavLinkEditor";
import { supabase } from "@/integrations/supabase/client";
import GlobalSectionRenderer from "@/components/layout/GlobalSectionRenderer";
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
};

type SeenState = {
  ordersLastSeenAt: string | null;
  customRequestsLastSeenAt: string | null;
};

const defaultBranding: BrandingSettings = {
  brand_name: "LayerLoot",
  brand_accent: "Loot",
  logo_text_left: "Layer",
  logo_text_right: "Loot",
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

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminAlerts, setAdminAlerts] = useState(0);
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [hasAccountNotifications, setHasAccountNotifications] = useState(false);

  const location = useLocation();
  const { totalItems } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const navLinks = useNavLinks();

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

    fetchAdminAlerts();
  }, [isAdmin, user]);

  useEffect(() => {
    const fetchAccountNotifications = async () => {
      if (!user) {
        setHasAccountNotifications(false);
        return;
      }

      const seenState = readSeenState(user.id);

      const normalizedEmail = (user.email || "").trim();

      const [ordersRes, ownedCustomOrdersRes, emailCustomOrdersRes] = await Promise.all([
        (supabase.from("orders") as any).select("created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase
          .from("custom_orders")
          .select("id, created_at, updated_at")
          .eq("user_id", user.id)
          .eq("request_fee_status", "paid")
          .order("created_at", { ascending: false }),
        normalizedEmail
          ? supabase
              .from("custom_orders")
              .select("id, created_at, updated_at")
              .ilike("email", normalizedEmail)
              .eq("request_fee_status", "paid")
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      const customOrdersMap = new Map<string, { id: string; created_at: string; updated_at: string }>();
      [...(ownedCustomOrdersRes.data ?? []), ...(emailCustomOrdersRes.data ?? [])].forEach((order) => {
        customOrdersMap.set(order.id, order);
      });
      const customOrders = Array.from(customOrdersMap.values());
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

    fetchAccountNotifications();

    const interval = window.setInterval(fetchAccountNotifications, 30000);
    return () => window.clearInterval(interval);
  }, [user]);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "branding")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          setBranding({
            ...defaultBranding,
            ...(data.value as BrandingSettings),
          });
        }
      });
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const logoLeft = branding.logo_text_left || "Layer";
  const logoRight = branding.logo_text_right || branding.brand_accent || "Loot";

  const desktopLinks = useMemo(() => navLinks.filter((link) => !!link.to && !!link.label), [navLinks]);

  return (
    <>
      <GlobalSectionRenderer page="global_header_top" />

      <header className="sticky top-0 z-50 border-b border-border bg-secondary">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Layers className="h-7 w-7 text-primary" />
            <span className="font-display text-2xl font-bold uppercase tracking-wider text-secondary-foreground">
              {logoLeft}
              <span className="text-primary">{logoRight}</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {desktopLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-display text-sm uppercase tracking-widest transition-colors hover:text-primary ${
                  location.pathname === link.to ? "text-primary" : "text-secondary-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative text-secondary-foreground hover:text-foreground">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs font-bold text-primary">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>

            {isAdmin && (
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

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-secondary-foreground hover:text-primary">
                    <User className="h-5 w-5" />
                    {hasAccountNotifications && (
                      <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="cursor-pointer">
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" /> Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
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

            <Button
              variant="ghost"
              size="icon"
              className="text-secondary-foreground hover:text-primary md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-border bg-secondary px-4 pb-4 md:hidden">
            {desktopLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`block py-3 font-display text-sm uppercase tracking-widest transition-colors hover:text-primary ${
                  location.pathname === link.to ? "text-primary" : "text-secondary-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {user && (
              <>
                <Link
                  to="/account"
                  className="block py-3 font-display text-sm uppercase tracking-widest text-secondary-foreground hover:text-primary"
                >
                  My Account
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="block py-3 font-display text-sm uppercase tracking-widest text-secondary-foreground hover:text-primary"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </nav>
        )}
      </header>

      <GlobalSectionRenderer page="global_header_bottom" />
    </>
  );
};

export default Header;
