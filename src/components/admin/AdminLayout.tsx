import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, FolderTree, ShoppingCart, Users, Truck, Layers, ArrowLeft, Star, FileText, Settings, Menu, X, Box, Calculator } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const sidebarLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/custom-orders", label: "Custom Orders", icon: Box },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/editor", label: "Page Editor", icon: FileText },
  { to: "/admin/shipping", label: "Shipping", icon: Truck },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

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
        {sidebarLinks.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              location.pathname === to
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
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
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-16 z-40 flex h-12 items-center border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground hover:text-sidebar-primary">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="ml-2 font-display text-sm font-bold uppercase tracking-wider text-sidebar-foreground">
          {sidebarLinks.find(l => l.to === location.pathname)?.label || "Admin"}
        </span>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex h-full w-64 flex-col bg-sidebar">
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {navContent}
      </aside>

      <main className="mt-12 flex-1 overflow-auto bg-background p-6 lg:mt-0">{children}</main>
    </div>
  );
};

export default AdminLayout;
