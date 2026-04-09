import { useState, useEffect } from "react";
import {
  DollarSign, Package, ShoppingCart, Users, Download, Calendar,
  Box, TrendingUp, Activity, BarChart3, MessageCircle, Mail, Star, Shield, FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminDashboard, Period } from "@/hooks/use-admin-dashboard";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import type { AdminRole } from "@/hooks/use-admin-permissions";
import { useAuth } from "@/contexts/AuthContext";
import type { AdminRoleKey } from "@/lib/admin-permissions-map";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

// Widgets
import QuickActionsWidget from "@/components/admin/dashboard/QuickActionsWidget";

const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(160,60%,45%)", "hsl(45,90%,55%)",
  "hsl(280,60%,55%)", "hsl(0,70%,55%)", "hsl(200,70%,50%)",
];

const TILE_CLASS = "rounded-xl border border-primary/20 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.15)] transition-all duration-200 hover:border-primary/35 hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.25)]";

type WidgetKey = "action" | "kpi" | "content" | "operations" | "product" | "translation" | "charts" | "activity" | "shortcuts" | "referrals";

const ROLE_WIDGETS: Record<string, WidgetKey[]> = {
  owner: ["action", "kpi", "content", "operations", "product", "translation", "referrals", "charts", "activity", "shortcuts"],
  super_admin: ["action", "kpi", "content", "operations", "product", "translation", "referrals", "charts", "activity", "shortcuts"],
  admin: ["action", "kpi", "content", "operations", "product", "translation", "referrals", "charts", "activity", "shortcuts"],
  content_admin: ["content", "product", "translation", "activity", "shortcuts"],
  orders_admin: ["action", "kpi", "operations", "activity", "shortcuts"],
  support_admin: ["action", "operations", "activity", "shortcuts"],
  marketing_admin: ["kpi", "referrals", "charts", "activity", "shortcuts"],
  editor: ["content", "translation", "activity", "shortcuts"],
  support: ["action", "operations", "activity", "shortcuts"],
  custom: ["action", "activity", "shortcuts"],
};


// Dashboard tile with count and notification dot
const DashboardTile = ({ label, icon: Icon, to, count, showDot, accent, sub }: {
  label: string;
  icon: typeof DollarSign;
  to: string;
  count?: number;
  showDot?: boolean;
  accent?: "primary" | "green" | "amber" | "purple";
  sub?: string;
}) => {
  const accentMap = {
    primary: "text-primary bg-primary/10",
    green: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    purple: "text-purple-400 bg-purple-500/10",
  };
  return (
    <Link to={to} className={`${TILE_CLASS} bg-card/40 p-4 relative flex flex-col gap-1`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentMap[accent ?? "primary"]}`}> <Icon className="h-4 w-4" /> </div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {showDot && <span className="ml-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
      </div>
      <div className="flex items-center gap-2">
        {typeof count === "number" && <span className="font-display text-2xl font-bold text-foreground">{count}</span>}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </Link>
  );
};

const MiniChart = ({ title, icon: Icon, children }: { title: string; icon: typeof TrendingUp; children: React.ReactNode }) => (
  <div className={`${TILE_CLASS} bg-card/40 p-4`}>
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
    </div>
    {children}
  </div>
);

/* ─── Dashboard ─── */
const Dashboard = () => {
  const [period, setPeriod] = useState<Period>("30d");
  const { data, loading } = useAdminDashboard(period);
  const { adminRole, hasPermission } = useAdminPermissions();
  const { user } = useAuth();

  const role = adminRole ?? "admin";
  const widgets = new Set(ROLE_WIDGETS[role] ?? ROLE_WIDGETS.admin);
  const show = (k: WidgetKey) => widgets.has(k);

  const exportCSV = () => {
    const rows = [["Order ID", "Total", "Status", "Date"]];
    data.recentOrders.forEach((o) =>
      rows.push([o.id.slice(0, 8), Number(o.total).toFixed(2), o.status, new Date(o.created_at).toLocaleDateString()])
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    
    a.download = "orders-report.csv";
    a.click();
  };

  const greeting = user?.user_metadata?.full_name
    ? `Welcome, ${user.user_metadata.full_name}`
    : "Dashboard";

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">{greeting}</h1>
          <p className="text-xs text-muted-foreground">
            {role.replace("_", " ")} · What needs your attention
          </p>
        </div>
        <div className="flex gap-2">
          {show("kpi") && (
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-32 h-9 rounded-lg bg-card/40 text-xs">
                <Calendar className="mr-1 h-3.5 w-3.5 text-primary" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          )}
          {show("kpi") && (
            <Button variant="ghost" size="sm" onClick={exportCSV} className="h-9 text-xs text-muted-foreground hover:text-foreground">
              <Download className="mr-1 h-3.5 w-3.5" /> Export
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">

          {/* Operations */}
          <div className="mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 pl-1">Operations</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardTile label="Orders" icon={ShoppingCart} to="/admin/orders" count={data.ordersCount} showDot={data.pendingOrders > 0} sub={data.pendingOrders > 0 ? `${data.pendingOrders} pending` : undefined} />
              <DashboardTile label="Custom Orders" icon={Box} to="/admin/custom-orders" count={data.customOrdersActive} showDot={data.quotesAwaiting > 0 || data.unansweredCustomMessages > 0} sub={data.quotesAwaiting > 0 ? `${data.quotesAwaiting} awaiting reply` : undefined} accent="purple" />
              <DashboardTile label="Showcases" icon={FolderOpen} to="/admin/showcases" showDot={data.pendingShowcases > 0} count={data.pendingShowcases} />
              <DashboardTile label="Fulfillment" icon={Package} to="/admin/orders" count={data.ordersAwaitingShipment} sub={data.ordersAwaitingShipment > 0 ? "Awaiting shipment" : undefined} accent="amber" />
            </div>
          </div>

          {/* Users & AI */}
          <div className="mb-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardTile label="Users" icon={Users} to="/admin/clients" count={data.clientsCount} />
              <DashboardTile label="AI Chat" icon={MessageCircle} to="/admin/chat" />
            </div>
          </div>

          {/* Business / Financial */}
          <div className="mb-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardTile label="Products" icon={Package} to="/admin/products" count={data.productsCount} sub={data.draftProductsCount > 0 ? `${data.draftProductsCount} drafts` : undefined} />
              <DashboardTile label="Adjustments / Financial" icon={DollarSign} to="/admin/financial" />
            </div>
          </div>

          {/* System / Tools */}
          <div className="mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 pl-1">Admin Tools</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardTile label="Email Logs" icon={Mail} to="/admin/email-logs" />
            </div>
          </div>

          {/* Quick Actions (secondary shortcuts) */}
          <QuickActionsWidget hasPermission={hasPermission} />
        </div>
      )}
    </AdminLayout>
  );
};

// Legacy exports for AdminSettings compatibility
const ICON_MAP: Record<string, typeof Package> = {
  Package, ShoppingCart, Box, Users, TrendingUp, BarChart3, DollarSign,
};

export interface DashboardShortcut {
  id: string;
  label: string;
  icon: string;
  to: string;
  visible: boolean;
}

const DEFAULT_SHORTCUTS: DashboardShortcut[] = [
  { id: "products", label: "Products", icon: "Package", to: "/admin/products", visible: true },
  { id: "orders", label: "Orders", icon: "ShoppingCart", to: "/admin/orders", visible: true },
  { id: "custom-orders", label: "Custom Orders", icon: "Box", to: "/admin/custom-orders", visible: true },
  { id: "editor", label: "Page Editor", icon: "FileText", to: "/admin/editor", visible: true },
  { id: "reviews", label: "Reviews", icon: "Star", to: "/admin/reviews", visible: true },
  { id: "clients", label: "Users", icon: "Users", to: "/admin/clients", visible: true },
  { id: "settings", label: "Settings", icon: "Settings", to: "/admin/settings", visible: true },
];

export { DEFAULT_SHORTCUTS, ICON_MAP };
export default Dashboard;
