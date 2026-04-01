import { useEffect, useState } from "react";
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

const coreLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/custom-orders", label: "Custom Orders", icon: Box },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories & Tags", icon: Tags },
  { to: "/admin/clients", label: "Customers", icon: Users },
  { to: "/admin/editor", label: "Page Editor", icon: FileText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

const toolLinks = [
  { to: "/admin/discounts", label: "Discounts", icon: TicketPercent },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/showcases", label: "Showcases", icon: Palette },
  { to: "/admin/shipping", label: "Shipping", icon: Truck },
  { to: "/admin/pricing", label: "Pricing", icon: Calculator },
  { to: "/admin/growth", label: "Growth", icon: TrendingUp },
  { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/admin/revenue", label: "Revenue Engine", icon: Wallet },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
] as const;

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/");
  }, [isAdmin, loading, user, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (loading || !isAdmin) return null;

  const isActive = (to: string) =>
    location.pathname === to || (to !== "/admin" && location.pathname.startsWith(`${to}/`));

  const renderLinks = (links: readonly { to: string; label: string; icon: any }[]) =>
    links.map(({ to, label, icon: Icon }) => {
      const active = isActive(to);
      return (
        <Link
          key={to}
          to={to}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
            active
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </Link>
      );
    });

  const navContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
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

      {/* Core Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Core
        </p>
        {renderLinks(coreLinks)}

        <div className="my-3 border-t border-sidebar-border/50" />

        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Tools
        </p>
        {renderLinks(toolLinks)}
      </nav>

      {/* Back to Store */}
      <div className="border-t border-sidebar-border/30 p-3">
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
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-16 z-40 flex h-12 items-center bg-sidebar/95 backdrop-blur-md px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-sidebar-foreground hover:text-primary"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="ml-2 font-display text-sm font-bold uppercase tracking-wider text-sidebar-foreground">
          {[...coreLinks, ...toolLinks].find((l) => isActive(l.to))?.label || "Admin"}
        </span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex h-full w-60 flex-col bg-sidebar">{navContent}</aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col bg-sidebar lg:flex">
        {navContent}
      </aside>

      <main className="mt-12 flex-1 overflow-auto bg-background p-6 lg:mt-0">{children}</main>
    </div>
  );
};

export default AdminLayout;
