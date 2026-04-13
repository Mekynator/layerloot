import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Truck, Star,
  FileText, Settings, Box, TicketPercent, Calculator, Megaphone,
  BarChart3, ImageIcon, Activity, Globe, MessageCircle, Instagram,
  Brain, FlaskConical, DollarSign, Sparkles, Menu, X, Layers,
  Tags, Crown, Palette, Shield, Gift, Wrench,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type AdminRoleKey } from "@/lib/admin-permissions-map";

const ICON_MAP: Record<string, typeof Package> = {
  LayoutDashboard, Package, ShoppingCart, Users, Truck, Star, FileText,
  Settings, Box, TicketPercent, Calculator, Megaphone, BarChart3,
  ImageIcon, Activity, Globe, MessageCircle, Instagram, Brain,
  FlaskConical, DollarSign, Sparkles, Layers, Tags, Palette, Shield,
  Crown, Gift, Wrench,
};

interface SidebarItem {
  id: string;
  to: string;
  label: string;
  icon: string;
  permission?: string;
}

interface SidebarGroup {
  name: string;
  items: SidebarItem[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    name: "Overview",
    items: [
      { id: "dashboard", to: "/", label: "Dashboard", icon: "LayoutDashboard" },
      { id: "analytics", to: "/analytics", label: "Analytics", icon: "BarChart3", permission: "reports.view" },
      { id: "activity", to: "/activity", label: "Activity Log", icon: "Activity", permission: "reports.view" },
    ],
  },
  {
    name: "Orders",
    items: [
      { id: "orders", to: "/orders", label: "Orders", icon: "ShoppingCart", permission: "orders.manage" },
      { id: "custom-orders", to: "/custom-orders", label: "Custom Orders", icon: "Package", permission: "custom_orders.manage" },
      { id: "shipping", to: "/shipping", label: "Shipping", icon: "Truck", permission: "shipping.manage" },
    ],
  },
  {
    name: "Catalog",
    items: [
      { id: "products", to: "/products", label: "Products", icon: "Package", permission: "products.manage" },
      { id: "categories", to: "/categories", label: "Categories", icon: "Tags", permission: "categories.manage" },
      { id: "pricing", to: "/pricing", label: "Pricing", icon: "Calculator", permission: "pricing.manage" },
      { id: "showcases", to: "/showcases", label: "Showcases", icon: "Layers", permission: "showcases.manage" },
    ],
  },
  {
    name: "Users & Roles",
    items: [
      { id: "users", to: "/users", label: "Users & Admins", icon: "Users", permission: "*" },
      { id: "admin-roles", to: "/admin-roles", label: "Admin Roles", icon: "Shield", permission: "*" },
      { id: "reviews", to: "/reviews", label: "Reviews", icon: "Star", permission: "reviews.manage" },
    ],
  },
  {
    name: "Marketing",
    items: [
      { id: "campaigns", to: "/campaigns", label: "Campaigns", icon: "Megaphone", permission: "campaigns.manage" },
      { id: "discounts", to: "/discounts", label: "Discounts & Vouchers", icon: "TicketPercent", permission: "discounts.manage" },
      { id: "automations", to: "/automations", label: "Automations", icon: "Sparkles", permission: "campaigns.manage" },
      { id: "instagram", to: "/instagram", label: "Instagram", icon: "Instagram", permission: "settings.view" },
    ],
  },
  {
    name: "AI Tools",
    items: [
      { id: "chat", to: "/chat", label: "AI Chat", icon: "MessageCircle", permission: "settings.view" },
      { id: "personalization", to: "/personalization", label: "Personalization", icon: "Brain", permission: "settings.view" },
      { id: "ab-testing", to: "/ab-testing", label: "A/B Testing", icon: "FlaskConical", permission: "settings.view" },
      { id: "ai-insights", to: "/ai-insights", label: "AI Insights", icon: "Sparkles", permission: "settings.view" },
    ],
  },
  {
    name: "Content",
    items: [
      { id: "editor", to: "/editor", label: "Pages & Layout", icon: "FileText", permission: "content.edit" },
      { id: "visual-editor", to: "/visual-editor", label: "Visual Editor", icon: "Palette", permission: "content.edit" },
      { id: "design-system", to: "/design-system", label: "Design System", icon: "Palette", permission: "content.edit" },
      { id: "media", to: "/media", label: "Media Library", icon: "ImageIcon", permission: "media.manage" },
      { id: "components", to: "/components", label: "Components", icon: "Box", permission: "content.edit" },
      { id: "translations", to: "/translations", label: "Translations", icon: "Globe", permission: "translations.manage" },
      { id: "backgrounds", to: "/backgrounds", label: "Backgrounds", icon: "ImageIcon", permission: "backgrounds.manage" },
    ],
  },
  {
    name: "Settings",
    items: [
      { id: "financial", to: "/financial", label: "Financial", icon: "DollarSign", permission: "settings.view" },
      { id: "email-logs", to: "/email-logs", label: "Email Logs", icon: "FileText", permission: "reports.view" },
    ],
  },
];

const AdminStudioLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  const { hasPermission, adminRole, isOwner } = useAdminPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [isAdmin, loading, user, navigate]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  if (loading || !isAdmin) return null;

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname === to || location.pathname.startsWith(`${to}/`);

  const visibleGroups = SIDEBAR_GROUPS
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => !item.permission || hasPermission(item.permission)),
    }))
    .filter((g) => g.items.length > 0);

  const currentLabel = visibleGroups.flatMap(g => g.items).find(i => isActive(i.to))?.label ?? "Admin Studio";

  const navContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border/30 px-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <span className="font-display text-xs font-bold uppercase tracking-widest text-sidebar-foreground">
            LayerLoot Studio
          </span>
        </div>
        <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground" onClick={() => setMobileOpen(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {visibleGroups.map((group, gi) => (
          <div key={group.name}>
            {gi > 0 && <div className="my-3 border-t border-sidebar-border/40" />}
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              {group.name}
            </p>
            {group.items.map((item) => {
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
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border/30 p-3">
        <div className="mb-2 flex items-center gap-2 px-3">
          {isOwner && <Crown className="h-3.5 w-3.5 text-primary" />}
          <Badge variant="outline" className="text-[9px]">
            {ROLE_LABELS[(adminRole as AdminRoleKey) ?? "admin"] ?? adminRole ?? "Admin"}
          </Badge>
        </div>
        <p className="px-3 text-[10px] text-sidebar-foreground/40 truncate">
          {user?.email}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-12 items-center bg-sidebar/95 backdrop-blur-md px-4 lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground hover:text-primary">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="ml-2 font-display text-sm font-bold uppercase tracking-wider text-sidebar-foreground">
          {currentLabel}
        </span>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex h-full w-60 flex-col bg-sidebar">{navContent}</aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border/30 bg-sidebar lg:flex">
        {navContent}
      </aside>

      {/* Main content */}
      <main className="mt-12 flex-1 overflow-auto p-6 lg:mt-0">{children}</main>
    </div>
  );
};

export default AdminStudioLayout;
