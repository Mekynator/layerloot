import { useState, useEffect } from "react";
import {
  DollarSign, Package, ShoppingCart, Users, Download, Calendar,
  Box, TrendingUp, Activity, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminDashboard, Period } from "@/hooks/use-admin-dashboard";
import { useAdminPermissions, AdminRole } from "@/hooks/use-admin-permissions";
import { useAuth } from "@/contexts/AuthContext";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { Link } from "react-router-dom";

// Widgets
import ActionCenterWidget from "@/components/admin/dashboard/ActionCenterWidget";
import ContentStatusWidget from "@/components/admin/dashboard/ContentStatusWidget";
import OperationsWidget from "@/components/admin/dashboard/OperationsWidget";
import TranslationWidget from "@/components/admin/dashboard/TranslationWidget";
import ProductAttentionWidget from "@/components/admin/dashboard/ProductAttentionWidget";
import QuickActionsWidget from "@/components/admin/dashboard/QuickActionsWidget";
import RecentActivityWidget from "@/components/admin/dashboard/RecentActivityWidget";

const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(160,60%,45%)", "hsl(45,90%,55%)",
  "hsl(280,60%,55%)", "hsl(0,70%,55%)", "hsl(200,70%,50%)",
];

const TILE_CLASS = "rounded-xl border border-primary/20 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.15)] transition-all duration-200 hover:border-primary/35 hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.25)]";

type WidgetKey = "action" | "kpi" | "content" | "operations" | "product" | "translation" | "charts" | "activity" | "shortcuts";

const ROLE_WIDGETS: Record<NonNullable<AdminRole>, WidgetKey[]> = {
  super_admin: ["action", "kpi", "content", "operations", "product", "translation", "charts", "activity", "shortcuts"],
  admin: ["action", "kpi", "content", "operations", "product", "translation", "charts", "activity", "shortcuts"],
  editor: ["content", "translation", "activity", "shortcuts"],
  support: ["action", "operations", "activity", "shortcuts"],
};

const KpiCard = ({ label, value, icon: Icon, sub, to, accent = "primary" }: {
  label: string; value: string | number; icon: typeof DollarSign; sub?: string;
  to?: string; accent?: "primary" | "green" | "amber" | "purple";
}) => {
  const accentMap = {
    primary: "text-primary bg-primary/10",
    green: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    purple: "text-purple-400 bg-purple-500/10",
  };
  const content = (
    <div className={`${TILE_CLASS} bg-card/40 p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentMap[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="font-display text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return content;
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
          {/* Action Center */}
          {show("action") && <ActionCenterWidget data={data} />}

          {/* KPI Grid */}
          {show("kpi") && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard label="Revenue" value={`${data.revenue.toFixed(0)} kr`} icon={DollarSign} sub={`Avg: ${data.avgOrderValue.toFixed(0)} kr`} accent="green" />
              <KpiCard label="Orders" value={data.ordersCount} icon={ShoppingCart} sub={`${data.pendingOrders} pending`} to="/admin/orders" />
              <KpiCard label="Custom Orders" value={data.customOrdersActive} icon={Box} sub={`${data.quotesAwaiting} awaiting reply`} to="/admin/custom-orders" accent="purple" />
              <KpiCard label="Customers" value={data.clientsCount} icon={Users} sub="Registered" to="/admin/clients" />
              <KpiCard label="Products" value={data.productsCount} icon={Package} sub={`${data.draftProductsCount} drafts`} to="/admin/products" />
              <KpiCard label="Fulfillment" value={data.ordersAwaitingShipment} icon={Package} sub="Awaiting shipment" to="/admin/orders" accent="amber" />
            </div>
          )}

          {/* Content + Operations side by side */}
          {(show("content") || show("operations")) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {show("content") && <ContentStatusWidget data={data} />}
              {show("operations") && <OperationsWidget data={data} />}
            </div>
          )}

          {/* Product + Translation side by side */}
          {(show("product") || show("translation")) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {show("product") && <ProductAttentionWidget data={data} />}
              {show("translation") && <TranslationWidget data={data} />}
            </div>
          )}

          {/* Charts */}
          {show("charts") && (
            <div className="grid gap-4 lg:grid-cols-2">
              <MiniChart title="Revenue Trend" icon={TrendingUp}>
                {data.revenueByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data.revenueByDay}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "none", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v.toFixed(2)} kr`} />
                      <Area type="monotone" dataKey="revenue" fill="url(#revGrad)" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <p className="py-12 text-center text-xs text-muted-foreground">No revenue data yet.</p>}
              </MiniChart>

              <MiniChart title="Orders by Status" icon={BarChart3}>
                {data.ordersByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data.ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: "hsl(var(--muted-foreground))" }}>
                        {data.ordersByStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "none", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="py-12 text-center text-xs text-muted-foreground">No data.</p>}
              </MiniChart>
            </div>
          )}

          {/* Recent Activity */}
          {show("activity") && <RecentActivityWidget />}

          {/* Quick Actions */}
          {show("shortcuts") && <QuickActionsWidget hasPermission={hasPermission} />}
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
