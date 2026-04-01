import { useEffect, useState } from "react";
import { DollarSign, Package, ShoppingCart, Users, Download, Calendar, Star, MessageSquareMore, Palette, TicketPercent, Truck, Tags, FileText, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Link } from "react-router-dom";

const COLORS = ["hsl(25,95%,53%)", "hsl(220,10%,45%)", "hsl(25,80%,70%)", "hsl(220,15%,30%)", "hsl(0,84%,60%)"];
type Period = "7d" | "30d" | "90d" | "all";

const Dashboard = () => {
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    products: 0,
    clients: 0,
    customOrders: 0,
    reviews: 0,
    showcases: 0,
  });
  const [alerts, setAlerts] = useState({
    orders: 0,
    customOrders: 0,
    reviews: 0,
    showcases: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [revenueByPeriod, setRevenueByPeriod] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [ordersTrend, setOrdersTrend] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>("30d");
  const [topProducts, setTopProducts] = useState<any[]>([]);

  const getDateThreshold = (p: Period) => {
    if (p === "all") return null;
    const d = new Date();
    if (p === "7d") d.setDate(d.getDate() - 7);
    else if (p === "30d") d.setDate(d.getDate() - 30);
    else if (p === "90d") d.setDate(d.getDate() - 90);
    return d.toISOString();
  };

  useEffect(() => {
    const fetchAll = async () => {
      const threshold = getDateThreshold(period);

      let ordersQuery = supabase.from("orders").select("total, status, created_at");
      if (threshold) ordersQuery = ordersQuery.gte("created_at", threshold);
      const { data: orders } = await ordersQuery;
      const allOrders = orders ?? [];

      const [
        productsRes,
        profilesRes,
        customOrdersRes,
        reviewsRes,
        pendingOrdersRes,
        activeCustomOrdersRes,
        pendingReviewsRes,
        pendingShowcasesRes,
      ] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("custom_orders")
          .select("id", { count: "exact", head: true })
          .not("status", "in", '("in_production","completed","rejected")'),
        supabase.from("product_reviews").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
        supabase
          .from("custom_orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "reviewing", "quoted", "accepted"]),
        supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("custom_order_showcases").select("id", { count: "exact", head: true }).eq("visibility_status", "shared").eq("approved_by_admin", false),
      ]);

      const revenue = allOrders.reduce((s, o) => s + Number(o.total), 0);
      setStats({
        revenue,
        orders: allOrders.length,
        products: productsRes.count ?? 0,
        clients: profilesRes.count ?? 0,
        customOrders: customOrdersRes.count ?? 0,
        reviews: reviewsRes.count ?? 0,
        showcases: pendingShowcasesRes.count ?? 0,
      });

      setAlerts({
        orders: pendingOrdersRes.count ?? 0,
        customOrders: activeCustomOrdersRes.count ?? 0,
        reviews: pendingReviewsRes.count ?? 0,
        showcases: pendingShowcasesRes.count ?? 0,
      });

      const dayMap: Record<string, { revenue: number; orders: number }> = {};
      const statusMap: Record<string, number> = {};
      allOrders.forEach((o) => {
        const d = new Date(o.created_at);
        const dayKey = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        if (!dayMap[dayKey]) dayMap[dayKey] = { revenue: 0, orders: 0 };
        dayMap[dayKey].revenue += Number(o.total);
        dayMap[dayKey].orders += 1;
        statusMap[o.status] = (statusMap[o.status] || 0) + 1;
      });

      const trendData = Object.entries(dayMap).map(([name, v]) => ({ name, ...v }));
      setRevenueByPeriod(trendData);
      setOrdersTrend(trendData);
      setOrdersByStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

      const { data: items } = await supabase.from("order_items").select("product_name, quantity, total_price");
      const prodMap: Record<string, { qty: number; rev: number }> = {};
      (items ?? []).forEach((i) => {
        if (!prodMap[i.product_name]) prodMap[i.product_name] = { qty: 0, rev: 0 };
        prodMap[i.product_name].qty += i.quantity;
        prodMap[i.product_name].rev += Number(i.total_price);
      });

      setTopProducts(
        Object.entries(prodMap)
          .sort((a, b) => b[1].rev - a[1].rev)
          .slice(0, 5)
          .map(([name, v]) => ({ name, ...v })),
      );
    };

    const fetchRecent = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, total, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentOrders(data ?? []);
    };

    fetchAll();
    fetchRecent();
  }, [period]);

  const exportCSV = () => {
    const rows = [["Order ID", "Total", "Status", "Date"]];
    recentOrders.forEach((o) =>
      rows.push([o.id.slice(0, 8), Number(o.total).toFixed(2), o.status, new Date(o.created_at).toLocaleDateString()]),
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "orders-report.csv";
    a.click();
  };

  const avgOrderValue = stats.orders > 0 ? (stats.revenue / stats.orders).toFixed(2) : "0.00";

  const cards = [
    {
      label: "Revenue",
      value: `${stats.revenue.toFixed(2)} kr`,
      icon: DollarSign,
      sub: `Avg: ${avgOrderValue} kr`,
      to: null,
      alert: 0,
    },
    {
      label: "Orders",
      value: stats.orders,
      icon: ShoppingCart,
      sub: `Open: ${alerts.orders}`,
      to: "/admin/orders",
      alert: alerts.orders,
    },
    { label: "Products", value: stats.products, icon: Package, sub: "Active catalog", to: "/admin/products", alert: 0 },
    { label: "Users", value: stats.clients, icon: Users, sub: "Registered accounts", to: "/admin/clients", alert: 0 },
    {
      label: "Custom Orders",
      value: stats.customOrders,
      icon: MessageSquareMore,
      sub: `Waiting: ${alerts.customOrders}`,
      to: "/admin/custom-orders",
      alert: alerts.customOrders,
    },
    {
      label: "Reviews",
      value: stats.reviews,
      icon: Star,
      sub: `Pending: ${alerts.reviews}`,
      to: "/admin/reviews",
      alert: alerts.reviews,
    },
  ];

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Dashboard</h1>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-36">
              <Calendar className="mr-1 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV} className="font-display text-xs uppercase tracking-wider">
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(({ label, value, icon: Icon, sub, to, alert }) => {
          const content = (
            <Card className="relative h-full transition-all hover:border-primary/40">
              {alert > 0 && <span className="absolute right-3 top-3 h-3 w-3 rounded-full bg-red-500" />}
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="font-display text-2xl font-bold text-card-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </CardContent>
            </Card>
          );

          return to ? (
            <Link key={label} to={to}>
              {content}
            </Link>
          ) : (
            <div key={label}>{content}</div>
          );
        })}
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display uppercase">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByPeriod.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={revenueByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,10%,85%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)} kr`} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    fill="hsl(25,95%,53%)"
                    fillOpacity={0.15}
                    stroke="hsl(25,95%,53%)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No revenue data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display uppercase">Orders Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={ordersTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,10%,85%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="hsl(25,95%,53%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(25,95%,53%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No order data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-display uppercase">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {ordersByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display uppercase">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topProducts} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)} kr`} />
                  <Bar dataKey="rev" fill="hsl(25,95%,53%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No product data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display uppercase">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="font-display text-sm font-semibold uppercase">#{o.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-primary">{Number(o.total).toFixed(2)} kr</p>
                      <p className="font-display text-xs uppercase text-muted-foreground">{o.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
