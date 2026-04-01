import { useState } from "react";
import {
  DollarSign, Package, ShoppingCart, Users, Download, Calendar, Star,
  MessageSquareMore, Palette, TicketPercent, Truck, Tags, FileText,
  Settings, TrendingUp, AlertTriangle, Gift, Award, Box,
  Clock, CheckCircle, Zap, BarChart3, Activity, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin/AdminLayout";
import StatTile from "@/components/admin/dashboard/StatTile";
import ChartCard from "@/components/admin/dashboard/ChartCard";
import AlertItem from "@/components/admin/dashboard/AlertItem";
import InsightCard from "@/components/admin/dashboard/InsightCard";
import { useAdminDashboard, Period } from "@/hooks/use-admin-dashboard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { Link } from "react-router-dom";

const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(160,60%,45%)", "hsl(45,90%,55%)",
  "hsl(280,60%,55%)", "hsl(0,70%,55%)", "hsl(200,70%,50%)",
];

const Dashboard = () => {
  const [period, setPeriod] = useState<Period>("30d");
  const { data, loading } = useAdminDashboard(period);

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

  const quickLinks = [
    { label: "Products", icon: Package, to: "/admin/products" },
    { label: "Orders", icon: ShoppingCart, to: "/admin/orders" },
    { label: "Custom Orders", icon: Box, to: "/admin/custom-orders" },
    { label: "Showcases", icon: Palette, to: "/admin/showcases" },
    { label: "Discounts", icon: TicketPercent, to: "/admin/discounts" },
    { label: "Categories", icon: Tags, to: "/admin/categories" },
    { label: "Shipping", icon: Truck, to: "/admin/shipping" },
    { label: "Page Editor", icon: FileText, to: "/admin/editor" },
    { label: "Reviews", icon: Star, to: "/admin/reviews" },
    { label: "Users", icon: Users, to: "/admin/clients" },
    { label: "Settings", icon: Settings, to: "/admin/settings" },
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
            Intelligence Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Business overview & operational intelligence</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-36 glass-card border-white/[0.06]">
              <Calendar className="mr-1 h-4 w-4 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV} className="glass-card border-white/[0.06] font-display text-xs uppercase tracking-wider">
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Tiles */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Revenue" value={`${data.revenue.toFixed(0)} kr`} icon={DollarSign}
              sub={`Avg order: ${data.avgOrderValue.toFixed(0)} kr`} accent="green" />
            <StatTile label="Orders" value={data.ordersCount} icon={ShoppingCart}
              sub={`${data.pendingOrders} pending`} to="/admin/orders" alert={data.pendingOrders} />
            <StatTile label="Custom Orders" value={data.customOrdersActive} icon={MessageSquareMore}
              sub={`${data.quotesAwaiting} quotes awaiting reply`} to="/admin/custom-orders" alert={data.quotesAwaiting} accent="purple" />
            <StatTile label="Users" value={data.clientsCount} icon={Users}
              sub="Registered accounts" to="/admin/clients" />
            <StatTile label="Products" value={data.productsCount} icon={Package}
              sub="Active catalog" to="/admin/products" />
            <StatTile label="Loyalty Points" value={data.loyaltyPointsIssued.toLocaleString()} icon={Award}
              sub="Total issued" accent="amber" />
            <StatTile label="Vouchers Used" value={data.vouchersRedeemed} icon={Gift}
              sub="Redeemed by customers" accent="purple" />
            <StatTile label="Pending Reviews" value={data.pendingReviews} icon={Star}
              sub="Awaiting approval" to="/admin/reviews" alert={data.pendingReviews} accent="amber" />
          </div>

          {/* Alerts & Insights */}
          {(data.insights.length > 0 || data.pendingOrders > 0 || data.quotesAwaiting > 0 || data.pendingShowcases > 0 || data.lowStockProducts.length > 0) && (
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              {/* Attention Needed */}
              <ChartCard title="Needs Attention" icon={AlertTriangle}>
                <div className="space-y-2">
                  <AlertItem icon={ShoppingCart} label="Pending orders" count={data.pendingOrders} to="/admin/orders" severity="urgent" />
                  <AlertItem icon={MessageSquareMore} label="Quotes awaiting reply" count={data.quotesAwaiting} to="/admin/custom-orders" severity="warning" />
                  <AlertItem icon={Palette} label="Showcases pending approval" count={data.pendingShowcases} to="/admin/showcases" severity="info" />
                  <AlertItem icon={Star} label="Reviews pending approval" count={data.pendingReviews} to="/admin/reviews" severity="info" />
                  {data.lowStockProducts.length > 0 && (
                    <AlertItem icon={Package} label={`Low stock products (≤5 units)`} count={data.lowStockProducts.length} to="/admin/products" severity="warning" />
                  )}
                  {data.pendingOrders === 0 && data.quotesAwaiting === 0 && data.pendingShowcases === 0 && data.pendingReviews === 0 && data.lowStockProducts.length === 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm text-foreground">All clear — nothing needs your attention right now!</span>
                    </div>
                  )}
                </div>
              </ChartCard>

              {/* Smart Insights */}
              <ChartCard title="Smart Insights" icon={Zap}>
                <div className="space-y-2">
                  {data.insights.length > 0 ? data.insights.map((ins, i) => (
                    <InsightCard key={i} message={ins.message} type={ins.type} />
                  )) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">Not enough data for insights yet.</p>
                  )}
                </div>
              </ChartCard>
            </div>
          )}

          {/* Charts Row 1 */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <ChartCard title="Revenue Trend" icon={TrendingUp}>
              {data.revenueByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.revenueByDay}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => `${v.toFixed(2)} kr`} />
                    <Area type="monotone" dataKey="revenue" fill="url(#revGrad)" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">No revenue data yet.</p>
              )}
            </ChartCard>

            <ChartCard title="Orders Trend" icon={Activity}>
              {data.revenueByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.revenueByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">No order data yet.</p>
              )}
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="mb-8 grid gap-6 lg:grid-cols-3">
            <ChartCard title="Orders by Status" icon={BarChart3}>
              {data.ordersByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "hsl(var(--muted-foreground))" }}>
                      {data.ordersByStatus.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>
              )}
            </ChartCard>

            <ChartCard title="Custom Orders by Status" icon={Box}>
              {data.customOrdersByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.customOrdersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "hsl(var(--muted-foreground))" }}>
                      {data.customOrdersByStatus.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">No custom order data yet.</p>
              )}
            </ChartCard>

            <ChartCard title="Top Products by Revenue" icon={TrendingUp}>
              {data.topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.topProducts} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => `${v.toFixed(2)} kr`} />
                    <Bar dataKey="rev" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">No product data yet.</p>
              )}
            </ChartCard>
          </div>

          {/* Recent Orders & Low Stock */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <ChartCard title="Recent Orders" icon={Clock}
              action={<Link to="/admin/orders" className="text-xs text-primary hover:underline">View all →</Link>}>
              {data.recentOrders.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.recentOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]">
                      <div>
                        <p className="font-display text-sm font-semibold">#{o.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-primary">{Number(o.total).toFixed(2)} kr</p>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          o.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                          o.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                          "bg-primary/10 text-primary"
                        }`}>{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            <ChartCard title="Low Stock Alert" icon={AlertTriangle}
              action={<Link to="/admin/products" className="text-xs text-primary hover:underline">Manage →</Link>}>
              {data.lowStockProducts.length === 0 ? (
                <div className="flex items-center gap-2 py-6 justify-center">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm text-muted-foreground">All products well stocked.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.lowStockProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-amber-500/10 bg-amber-500/5 px-4 py-3">
                      <span className="text-sm text-foreground">{p.name}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        p.stock === 0 ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                      }`}>{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</span>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
          </div>

          {/* Quick Links */}
          <ChartCard title="Quick Navigation" icon={Eye}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {quickLinks.map(({ label, icon: Icon, to }) => (
                <Link key={to} to={to}
                  className="glass-card flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] p-4 text-center transition-all hover:border-primary/30 hover:shadow-[0_0_15px_-5px_hsl(var(--primary)/0.15)]">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </Link>
              ))}
            </div>
          </ChartCard>
        </>
      )}
    </AdminLayout>
  );
};

export default Dashboard;
