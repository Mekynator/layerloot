import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  Users,
  Truck,
  Layers,
  ArrowLeft,
  Star,
  FileText,
  Settings,
  Menu,
  X,
  Box,
  TicketPercent,
  Palette,
  Calculator,
  TrendingUp,
  Megaphone,
  BarChart3,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const sidebarLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, notificationKey: null },
  { to: "/admin/products", label: "Products", icon: Package, notificationKey: null },
  { to: "/admin/categories", label: "Categories & Tags", icon: Tags, notificationKey: null },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart, notificationKey: "orders" },
  { to: "/admin/custom-orders", label: "Custom Orders", icon: Box, notificationKey: "customOrders" },
  { to: "/admin/discounts", label: "Discounts", icon: TicketPercent, notificationKey: null },
  { to: "/admin/clients", label: "Users", icon: Users, notificationKey: null },
  { to: "/admin/reviews", label: "Reviews", icon: Star, notificationKey: "reviews" },
  { to: "/admin/showcases", label: "Showcases", icon: Palette, notificationKey: "showcases" },
  { to: "/admin/pricing", label: "Pricing", icon: Calculator, notificationKey: null },
  { to: "/admin/growth", label: "Growth", icon: TrendingUp, notificationKey: null },
  { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone, notificationKey: null },
  { to: "/admin/reports", label: "Reports", icon: BarChart3, notificationKey: null },
  { to: "/admin/editor", label: "Page Editor", icon: FileText, notificationKey: null },
  { to: "/admin/shipping", label: "Shipping", icon: Truck, notificationKey: null },
  { to: "/admin/settings", label: "Settings", icon: Settings, notificationKey: null },
] as const;

type NotificationState = {
  orders: number;
  customOrders: number;
  reviews: number;
  showcases: number;
};

const EMPTY_NOTIFICATIONS: NotificationState = {
  orders: 0,
  customOrders: 0,
  reviews: 0,
  showcases: 0,
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationState>(EMPTY_NOTIFICATIONS);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/");
  }, [isAdmin, loading, user, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAdmin) {
      setNotifications(EMPTY_NOTIFICATIONS);
      return;
    }

    let mounted = true;

    const fetchNotifications = async () => {
      const [ordersRes, customOrdersRes, reviewsRes, showcasesRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
        supabase
          .from("custom_orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "reviewing", "quoted", "accepted"]),
        supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("custom_order_showcases").select("id", { count: "exact", head: true }).eq("visibility_status", "shared").eq("approved_by_admin", false),
      ]);

      if (!mounted) return;

      setNotifications({
        orders: ordersRes.count ?? 0,
        customOrders: customOrdersRes.count ?? 0,
        reviews: reviewsRes.count ?? 0,
        showcases: showcasesRes.count ?? 0,
      });
    };

    void fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [isAdmin]);

  if (loading || !isAdmin) return null;

  const isActive = (to: string) =>
    location.pathname === to || (to !== "/admin" && location.pathname.startsWith(`${to}/`));

  const getNotificationCount = (key: (typeof sidebarLinks)[number]["notificationKey"]) => {
    if (!key) return 0;
    return notifications[key];
  };

  const navContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-sidebar-primary" />
          <span className="font-display text-sm font-bold uppercase tracking-wider text-sidebar-foreground">
            Admin Panel
          </span>
        </div>

        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <nav className="space-y-1 p-3">
        {sidebarLinks.map(({ to, label, icon: Icon, notificationKey }) => {
          const notificationCount = getNotificationCount(notificationKey);
          const active = isActive(to);

          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="relative inline-flex">
                  <Icon className="h-4 w-4" />
                  {notificationCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_2px_hsl(var(--sidebar))]" />
                  )}
                </span>
                {label}
              </span>

              {notificationCount > 0 && (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                  {notificationCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-sidebar-border p-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <div className="fixed left-0 right-0 top-16 z-40 flex h-12 items-center border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-sidebar-foreground hover:text-sidebar-primary"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <span className="ml-2 font-display text-sm font-bold uppercase tracking-wider text-sidebar-foreground">
          {sidebarLinks.find((l) => isActive(l.to))?.label || "Admin"}
        </span>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex h-full w-64 flex-col bg-sidebar">{navContent}</aside>
        </div>
      )}

      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {navContent}
      </aside>

      <main className="mt-12 flex-1 overflow-auto bg-background p-6 lg:mt-0">{children}</main>
    </div>
  );
};

export default AdminLayout;
