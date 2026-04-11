import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, LayoutGrid, Tags, ArrowLeft, Layers, Menu, X,
  Package, ShoppingCart, Users, Truck, Star, FileText, Settings,
  Box, TicketPercent, Palette, Calculator, TrendingUp, Megaphone,
  BarChart3, Wallet, ImageIcon, Shield, Activity, Globe, MessageCircle,
  Instagram, Brain, UserPlus, Crown, ClipboardList,
  DollarSign, Calendar,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, isOwnerEmail, type AdminRoleKey } from "@/lib/admin-permissions-map";

const ICON_MAP: Record<string, typeof Package> = {
  LayoutDashboard, LayoutGrid, Package, ShoppingCart, Users, Truck, Star, FileText, Settings,
  Box, TicketPercent, Palette, Calculator, TrendingUp, Megaphone, BarChart3,
  Wallet, Tags, Layers, ImageIcon, Shield, Activity, Globe, MessageCircle, Instagram, Brain, UserPlus, ClipboardList,
  DollarSign, Calendar,
};

const AdminLayoutDepthContext = createContext(0);

export interface SidebarItem {
  id: string;
  to: string;
  label: string;
  icon: string;
  visible: boolean;
  permission?: string;
}

export interface SidebarConfig {
  groups: { name: string; items: SidebarItem[] }[];
}

const DEFAULT_SIDEBAR_CONFIG: SidebarConfig = {
  groups: [
    {
      name: "Content",
      items: [
        { id: "dashboard", to: "/admin", label: "Dashboard", icon: "LayoutDashboard", visible: true },
        { id: "editor-workspace", to: "/admin/editor", label: "Content & Layout", icon: "LayoutGrid", visible: true, permission: "content.edit" },
        { id: "media", to: "/admin/media", label: "Media Library", icon: "ImageIcon", visible: true, permission: "media.manage" },
        { id: "reusable", to: "/admin/reusable-blocks", label: "Reusable Blocks", icon: "Box", visible: true, permission: "content.edit" },
        { id: "translations", to: "/admin/translations", label: "Translations", icon: "Globe", visible: true, permission: "translations.manage" },
        { id: "backgrounds", to: "/admin/backgrounds", label: "Backgrounds", icon: "ImageIcon", visible: true, permission: "backgrounds.manage" },
        // Hide old editor/content/policies/settings links
        { id: "editor", to: "/admin/visual-editor", label: "Page Editor", icon: "FileText", visible: false, permission: "content.edit" },
        { id: "content", to: "/admin/editor?section=blocks", label: "Blocks & Content", icon: "Layers", visible: false, permission: "content.edit" },
        { id: "policies", to: "/admin/policies", label: "Policies", icon: "Shield", visible: false, permission: "settings.view" },
        { id: "settings", to: "/admin/settings", label: "Site Settings", icon: "Settings", visible: false, permission: "settings.view" },
      ],
    },
    {
      name: "Commerce",
      items: [
        { id: "products", to: "/admin/products", label: "Products", icon: "Package", visible: true, permission: "products.manage" },
        { id: "categories", to: "/admin/categories", label: "Categories & Tags", icon: "Tags", visible: true, permission: "categories.manage" },
        { id: "discounts", to: "/admin/discounts", label: "Discounts", icon: "TicketPercent", visible: true, permission: "discounts.manage" },
        { id: "pricing", to: "/admin/pricing", label: "Pricing", icon: "Calculator", visible: true, permission: "pricing.manage" },
        { id: "showcases", to: "/admin/showcases", label: "Showcases", icon: "Layers", visible: true, permission: "showcases.manage" },
      ],
    },
    {
      name: "Operations",
      items: [
        { id: "orders", to: "/admin/orders", label: "Orders", icon: "ShoppingCart", visible: true, permission: "orders.manage" },
        { id: "custom-orders", to: "/admin/custom-orders", label: "Custom Orders", icon: "Package", visible: true, permission: "custom_orders.manage" },
        { id: "users", to: "/admin/users", label: "Users", icon: "Users", visible: true, permission: "*" },
      ],
    },
    {
      name: "Tools",
      items: [
        { id: "shipping", to: "/admin/shipping", label: "Shipping", icon: "Truck", visible: true, permission: "shipping.manage" },
        { id: "chat", to: "/admin/chat", label: "AI Chat", icon: "MessageCircle", visible: true, permission: "settings.view" },
        { id: "instagram", to: "/admin/instagram", label: "Instagram", icon: "Instagram", visible: true, permission: "settings.view" },
        { id: "campaigns", to: "/admin/campaigns", label: "Campaigns", icon: "Megaphone", visible: true, permission: "campaigns.manage" },
        // Hide Growth, Revenue, Reports, Declaration, Policies, Settings from sidebar
        { id: "financial", to: "/admin/financial", label: "Adjustments / Financial", icon: "DollarSign", visible: true, permission: "settings.view" },
        { id: "growth", to: "/admin/growth", label: "Growth", icon: "TrendingUp", visible: false, permission: "settings.view" },
        { id: "revenue", to: "/admin/revenue", label: "Revenue Engine", icon: "DollarSign", visible: false, permission: "settings.view" },
        { id: "reports", to: "/admin/reports", label: "Reports", icon: "FileText", visible: false, permission: "settings.view" },
        { id: "declaration", to: "/admin/declaration", label: "Monthly Declaration", icon: "Calendar", visible: false, permission: "settings.view" },
        { id: "policies", to: "/admin/policies", label: "Policies", icon: "Shield", visible: false, permission: "settings.view" },
        { id: "settings", to: "/admin/settings", label: "Settings", icon: "Settings", visible: false, permission: "settings.view" },
      ],
    },
    {
      name: "System",
      items: [
        { id: "chat", to: "/admin/chat", label: "AI Chat", icon: "MessageCircle", visible: false, permission: "settings.view" },
        { id: "personalization", to: "/admin/personalization", label: "AI Personalization", icon: "Brain", visible: false, permission: "settings.view" },
        { id: "activity", to: "/admin/activity", label: "Activity Log", icon: "Activity", visible: false, permission: "reports.view" },
        { id: "chat-analytics", to: "/admin/chat-analytics", label: "AI Analytics", icon: "BarChart3", visible: false, permission: "reports.view" },
      ],
    },
  ],
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const depth = useContext(AdminLayoutDepthContext);
  const { isAdmin, loading, user } = useAuth();
  const { hasPermission, adminRole, isOwner } = useAdminPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarConfig, setSidebarConfig] = useState<SidebarConfig>(DEFAULT_SIDEBAR_CONFIG);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/admin/login");
  }, [isAdmin, loading, user, navigate]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "admin_sidebar_config").maybeSingle()
      .then(({ data: row }) => {
        if (row?.value && typeof row.value === "object" && (row.value as any).groups) {
          setSidebarConfig(row.value as unknown as SidebarConfig);
        }
      });
  }, []);

  if (depth > 0) {
    return <>{children}</>;
  }

  if (loading || !isAdmin) return null;

  const isActive = (to: string) =>
    location.pathname === to || (to !== "/admin" && location.pathname.startsWith(`${to}/`));

  const visibleGroups = useMemo(
    () => sidebarConfig.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.visible && (!item.permission || hasPermission(item.permission))),
      }))
      .filter((group) => group.items.length > 0),
    [sidebarConfig, hasPermission],
  );

  const allItems = visibleGroups.flatMap(g => g.items);

  const renderLinks = (items: SidebarItem[]) =>
    items.map((item) => {
      const active = isActive(item.to);
      const Icon = ICON_MAP[item.icon] || Package;
      return (
        <Link
          key={item.id}
          to={item.to}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
            active
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      );
    });

  const navContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <span className="font-display text-sm font-bold uppercase tracking-wider text-sidebar-foreground">
            Admin
          </span>
        </div>
        <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground" onClick={() => setMobileOpen(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {visibleGroups.map((group, gi) => (
          <div key={group.name}>
            {gi > 0 && <div className="my-3 border-t border-sidebar-border/50" />}
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              {group.name}
            </p>
            {renderLinks(group.items)}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border/30 p-3">
        <div className="mb-2 flex items-center gap-2 px-3">
          {isOwner && <Crown className="h-3.5 w-3.5 text-primary" />}
          <Badge variant="outline" className="text-[9px]">
            {ROLE_LABELS[(adminRole as AdminRoleKey) ?? "admin"] ?? adminRole ?? "Admin"}
          </Badge>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </Link>
      </div>
    </div>
  );

  return (
    <AdminLayoutDepthContext.Provider value={depth + 1}>
      <div className="flex min-h-screen">
        <div className="fixed left-0 right-0 top-0 z-40 flex h-12 items-center bg-sidebar/95 backdrop-blur-md px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-sidebar-foreground hover:text-primary"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-2 font-display text-sm font-bold uppercase tracking-wider text-sidebar-foreground">
            {allItems.find((l) => isActive(l.to))?.label || "Admin"}
          </span>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="relative z-10 flex h-full w-60 flex-col bg-sidebar">{navContent}</aside>
          </div>
        )}

        <aside className="hidden w-56 shrink-0 flex-col bg-sidebar lg:flex">
          {navContent}
        </aside>

        <main className="mt-12 flex-1 overflow-auto bg-background p-6 lg:mt-0">{children}</main>
      </div>
    </AdminLayoutDepthContext.Provider>
  );
};

export { DEFAULT_SIDEBAR_CONFIG, ICON_MAP as SIDEBAR_ICON_MAP };
export default AdminLayout;
