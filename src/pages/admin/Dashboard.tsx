import { useState, useEffect } from "react";
import {
  DollarSign, Package, ShoppingCart, Users, Download, Calendar, Star,
  MessageSquareMore, Palette, TicketPercent, Truck, Tags, FileText,
  Settings, TrendingUp, AlertTriangle, Box,
  Clock, CheckCircle, Zap, BarChart3, Activity, Eye,
  ArrowRight, Bell, Calculator, Megaphone, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminDashboard, Period } from "@/hooks/use-admin-dashboard";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { Link } from "react-router-dom";

const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(160,60%,45%)", "hsl(45,90%,55%)",
  "hsl(280,60%,55%)", "hsl(0,70%,55%)", "hsl(200,70%,50%)",
];

const TILE_CLASS = "rounded-xl border border-primary/20 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.15)] transition-all duration-200 hover:border-primary/35 hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.25)]";

const ICON_MAP: Record<string, typeof Package> = {
  Package, ShoppingCart, Box, Palette, TicketPercent, Tags, Truck, FileText,
  Star, Users, BarChart3, Settings, TrendingUp, Megaphone, Wallet, Calculator,
  MessageSquareMore, Calendar, Eye,
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
  { id: "showcases", label: "Showcases", icon: "Palette", to: "/admin/showcases", visible: true },
  { id: "discounts", label: "Discounts", icon: "TicketPercent", to: "/admin/discounts", visible: true },
  { id: "categories", label: "Categories", icon: "Tags", to: "/admin/categories", visible: true },
  { id: "shipping", label: "Shipping", icon: "Truck", to: "/admin/shipping", visible: true },
  { id: "editor", label: "Page Editor", icon: "FileText", to: "/admin/editor", visible: true },
  { id: "reviews", label: "Reviews", icon: "Star", to: "/admin/reviews", visible: true },
  { id: "clients", label: "Users", icon: "Users", to: "/admin/clients", visible: true },
  { id: "reports", label: "Reports", icon: "BarChart3", to: "/admin/reports", visible: true },
  { id: "settings", label: "Settings", icon: "Settings", to: "/admin/settings", visible: true },
  { id: "growth", label: "Growth", icon: "TrendingUp", to: "/admin/growth", visible: true },
  { id: "campaigns", label: "Campaigns", icon: "Megaphone", to: "/admin/campaigns", visible: true },
  { id: "revenue", label: "Revenue Engine", icon: "Wallet", to: "/admin/revenue", visible: true },
  { id: "pricing", label: "Pricing", icon: "Calculator", to: "/admin/pricing", visible: true },
];

/* ─── Activity Feed ─── */
interface ActivityEvent {
  id: string;
  text: string;
  time: string;
  icon: typeof ShoppingCart;
  to: string;
}

function useActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [ordersRes, customRes, reviewsRes] = await Promise.all([
        supabase.from("orders").select("id, status, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("custom_orders").select("id, name, status, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("product_reviews").select("id, created_at, is_approved").order("created_at", { ascending: false }).limit(3),
      ]);
      if (!mounted) return;
      const items: ActivityEvent[] = [];
      (ordersRes.data ?? []).forEach(o => items.push({
        id: `o-${o.id}`, text: `Order #${o.id.slice(0,8)} — ${o.status}`,
        time: o.created_at, icon: ShoppingCart, to: "/admin/orders",
      }));
      (customRes.data ?? []).forEach(c => items.push({
        id: `c-${c.id}`, text: `Custom request from ${c.name} — ${c.status}`,
        time: c.created_at, icon: Box, to: "/admin/custom-orders",
      }));
      (reviewsRes.data ?? []).forEach(r => items.push({
        id: `r-${r.id}`, text: `New review ${r.is_approved ? "(approved)" : "(pending)"}`,
        time: r.created_at, icon: Star, to: "/admin/reviews",
      }));
      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setEvents(items.slice(0, 10));
    };
    load();
    return () => { mounted = false; };
  }, []);

  return events;
}

/* ─── Small reusable components ─── */
const SectionTitle = ({ icon: Icon, title }: { icon: typeof Zap; title: string }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon className="h-4 w-4 text-primary" />
    <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
  </div>
);

const QuickAction = ({ icon: Icon, label, count, to, severity }: {
  icon: typeof ShoppingCart; label: string; count: number; to: string;
  severity: "urgent" | "warning" | "info";
}) => {
  if (count === 0) return null;
  const colors = {
    urgent: "bg-red-500/10 text-red-400 hover:bg-red-500/15",
    warning: "bg-amber-500/10 text-amber-400 hover:bg-amber-500/15",
    info: "bg-primary/10 text-primary hover:bg-primary/15",
  };
  return (
    <Link to={to} className={`group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${colors[severity]} ${TILE_CLASS}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <span className="rounded-full bg-foreground/5 px-2.5 py-0.5 text-xs font-bold">{count}</span>
      <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
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
  const activity = useActivityFeed();
  const [shortcuts, setShortcuts] = useState<DashboardShortcut[]>(DEFAULT_SHORTCUTS);

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "admin_dashboard_shortcuts").maybeSingle()
      .then(({ data: row }) => {
        if (row?.value && Array.isArray(row.value)) {
          setShortcuts(row.value as unknown as DashboardShortcut[]);
        }
      });
  }, []);

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

  const visibleShortcuts = shortcuts.filter(s => s.visible);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">Business overview & what needs attention</p>
        </div>
        <div className="flex gap-2">
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
          <Button variant="ghost" size="sm" onClick={exportCSV} className="h-9 text-xs text-muted-foreground hover:text-foreground">
            <Download className="mr-1 h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* ── ACTION CENTER ── */}
          {(data.pendingOrders > 0 || data.quotesAwaiting > 0 || data.pendingReviews > 0 || data.pendingShowcases > 0 || data.lowStockProducts.length > 0) && (
            <div className={`mb-6 ${TILE_CLASS} bg-card/30 p-4`}>
              <SectionTitle icon={Bell} title="Needs Your Attention" />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <QuickAction icon={ShoppingCart} label="Pending orders" count={data.pendingOrders} to="/admin/orders" severity={data.pendingOrders > 3 ? "urgent" : "warning"} />
                <QuickAction icon={MessageSquareMore} label="Quotes awaiting reply" count={data.quotesAwaiting} to="/admin/custom-orders" severity="warning" />
                <QuickAction icon={Star} label="Reviews pending" count={data.pendingReviews} to="/admin/reviews" severity="info" />
                <QuickAction icon={Palette} label="Showcases pending" count={data.pendingShowcases} to="/admin/showcases" severity="info" />
                {data.lowStockProducts.length > 0 && (
                  <QuickAction icon={Package} label="Low stock products" count={data.lowStockProducts.length} to="/admin/products" severity="warning" />
                )}
              </div>
            </div>
          )}

          {/* ── KPI GRID (removed Loyalty Points & Vouchers Used) ── */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Revenue" value={`${data.revenue.toFixed(0)} kr`} icon={DollarSign} sub={`Avg: ${data.avgOrderValue.toFixed(0)} kr`} accent="green" />
            <KpiCard label="Orders" value={data.ordersCount} icon={ShoppingCart} sub={`${data.pendingOrders} pending`} to="/admin/orders" />
            <KpiCard label="Custom Orders" value={data.customOrdersActive} icon={Box} sub={`${data.quotesAwaiting} awaiting reply`} to="/admin/custom-orders" accent="purple" />
            <KpiCard label="Customers" value={data.clientsCount} icon={Users} sub="Registered" to="/admin/clients" />
            <KpiCard label="Products" value={data.productsCount} icon={Package} sub="Active" to="/admin/products" />
            <KpiCard label="Reviews" value={data.pendingReviews} icon={Star} sub="Pending approval" to="/admin/reviews" accent="amber" />
          </div>

          {/* ── CHARTS ── */}
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
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
              ) : (
                <p className="py-12 text-center text-xs text-muted-foreground">No revenue data yet.</p>
              )}
            </MiniChart>

            <MiniChart title="Orders Trend" icon={Activity}>
              {data.revenueByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.revenueByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "none", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-xs text-muted-foreground">No data yet.</p>
              )}
            </MiniChart>
          </div>

          {/* ── BOTTOM ROW: Pie charts + Activity ── */}
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <MiniChart title="Orders by Status" icon={BarChart3}>
              {data.ordersByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={data.ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "hsl(var(--muted-foreground))" }}>
                      {data.ordersByStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "none", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="py-10 text-center text-xs text-muted-foreground">No data.</p>}
            </MiniChart>

            <MiniChart title="Top Products" icon={TrendingUp}>
              {data.topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.topProducts} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={80} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "none", borderRadius: 8 }} formatter={(v: number) => `${v.toFixed(2)} kr`} />
                    <Bar dataKey="rev" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-10 text-center text-xs text-muted-foreground">No data.</p>}
            </MiniChart>

            {/* Activity Stream */}
            <div className={`${TILE_CLASS} bg-card/40 p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-3.5 w-3.5 text-primary" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</p>
              </div>
              {activity.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">No recent activity.</p>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {activity.map((evt) => {
                    const EvtIcon = evt.icon;
                    return (
                      <Link key={evt.id} to={evt.to} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-card/60">
                        <EvtIcon className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-foreground/80">{evt.text}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(evt.time).toLocaleString()}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RECENT ORDERS & LOW STOCK ── */}
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <div className={`${TILE_CLASS} bg-card/40 p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent Orders</p>
                </div>
                <Link to="/admin/orders" className="text-[11px] text-primary hover:underline">View all →</Link>
              </div>
              {data.recentOrders.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No orders yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.recentOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg bg-background/30 px-3 py-2 transition-colors hover:bg-background/50">
                      <div>
                        <p className="font-display text-xs font-semibold">#{o.id.slice(0, 8)}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-primary">{Number(o.total).toFixed(2)} kr</p>
                        <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                          o.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                          o.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                          "bg-primary/10 text-primary"
                        }`}>{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`${TILE_CLASS} bg-card/40 p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Low Stock</p>
                </div>
                <Link to="/admin/products" className="text-[11px] text-primary hover:underline">Manage →</Link>
              </div>
              {data.lowStockProducts.length === 0 ? (
                <div className="flex items-center gap-2 py-6 justify-center">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs text-muted-foreground">All products well stocked.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {data.lowStockProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-amber-500/5 px-3 py-2">
                      <span className="text-xs text-foreground">{p.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        p.stock === 0 ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                      }`}>{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── DYNAMIC SHORTCUTS (replaces Quick Navigation) ── */}
          <div className={`${TILE_CLASS} bg-card/30 p-4`}>
            <SectionTitle icon={Eye} title="Management Shortcuts" />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {visibleShortcuts.map((sc) => {
                const Icon = ICON_MAP[sc.icon] || Package;
                return (
                  <Link key={sc.id} to={sc.to}
                    className={`flex flex-col items-center gap-1.5 rounded-lg bg-background/20 p-3 text-center transition-all duration-200 hover:bg-primary/10 hover:text-primary border border-primary/10 hover:border-primary/30`}>
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-medium text-muted-foreground">{sc.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export { DEFAULT_SHORTCUTS, ICON_MAP };
export default Dashboard;
