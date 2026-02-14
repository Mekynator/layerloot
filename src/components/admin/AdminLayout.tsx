import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, FolderTree, ShoppingCart, Users, Truck, Layers, ArrowLeft, Star, FileText, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const sidebarLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/content", label: "Page Editor", icon: FileText },
  { to: "/admin/shipping", label: "Shipping", icon: Truck },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/");
  }, [isAdmin, loading, user, navigate]);

  if (loading || !isAdmin) return null;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <Layers className="h-5 w-5 text-sidebar-primary" />
          <span className="font-display text-sm font-bold uppercase tracking-wider text-sidebar-foreground">
            Admin Panel
          </span>
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
      </aside>
      <main className="flex-1 overflow-auto bg-background p-6">{children}</main>
    </div>
  );
};

export default AdminLayout;
