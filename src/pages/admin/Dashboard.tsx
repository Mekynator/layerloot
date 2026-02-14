import { useEffect, useState } from "react";
import { DollarSign, Package, ShoppingCart, Users, Download, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(25,95%,53%)", "hsl(220,10%,45%)", "hsl(25,80%,70%)", "hsl(220,15%,30%)", "hsl(0,84%,60%)"];

const Dashboard = () => {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, products: 0, clients: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [dailyOrders, setDailyOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [ordersRes, productsRes, profilesRes] = await Promise.all([
        supabase.from("orders").select("total, status, created_at"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      const orders = ordersRes.data ?? [];
      const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
      setStats({ revenue, orders: orders.length, products: productsRes.count ?? 0, clients: profilesRes.count ?? 0 });

      // Revenue by month
      const monthMap: Record<string, number> = {};
      const dayMap: Record<string, number> = {};
      const statusMap: Record<string, number> = {};
      orders.forEach((o) => {
        const d = new Date(o.created_at);
        const monthKey = d.toLocaleString("en", { month: "short", year: "2-digit" });
        monthMap[monthKey] = (monthMap[monthKey] || 0) + Number(o.total);
        const dayKey = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        dayMap[dayKey] = (dayMap[dayKey] || 0) + 1;
        statusMap[o.status] = (statusMap[o.status] || 0) + 1;
      });
      setRevenueByMonth(Object.entries(monthMap).map(([name, revenue]) => ({ name, revenue })));
      setDailyOrders(Object.entries(dayMap).slice(-14).map(([name, orders]) => ({ name, orders })));
      setOrdersByStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })));
    };

    const fetchRecent = async () => {
      const { data } = await supabase.from("orders").select("id, total, status, created_at, profiles!orders_user_id_fkey(full_name)").order("created_at", { ascending: false }).limit(5);
      setRecentOrders(data ?? []);
    };
    fetchStats();
    fetchRecent();
  }, []);

  const exportCSV = () => {
    const rows = [["Order ID", "Total", "Status", "Date"]];
    recentOrders.forEach((o) => rows.push([o.id.slice(0, 8), Number(o.total).toFixed(2), o.status, new Date(o.created_at).toLocaleDateString()]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "orders-report.csv";
    a.click();
  };

  const cards = [
    { label: "Revenue", value: `${stats.revenue.toFixed(2)} kr`, icon: DollarSign, trend: "+12%" },
    { label: "Orders", value: stats.orders, icon: ShoppingCart, trend: "+8%" },
    { label: "Products", value: stats.products, icon: Package, trend: "" },
    { label: "Clients", value: stats.clients, icon: Users, trend: "+5%" },
  ];

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Dashboard</h1>
        <Button variant="outline" onClick={exportCSV} className="font-display text-xs uppercase tracking-wider">
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, trend }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-display text-2xl font-bold text-card-foreground">{value}</p>
                {trend && <p className="flex items-center text-xs text-green-600"><TrendingUp className="mr-1 h-3 w-3" />{trend}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="font-display uppercase">Revenue Overview</CardTitle></CardHeader>
          <CardContent>
            {revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,10%,85%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)} kr`} />
                  <Bar dataKey="revenue" fill="hsl(25,95%,53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="py-12 text-center text-sm text-muted-foreground">No revenue data yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display uppercase">Daily Orders (Last 14 days)</CardTitle></CardHeader>
          <CardContent>
            {dailyOrders.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyOrders}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,10%,85%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="hsl(25,95%,53%)" strokeWidth={2} dot={{ fill: "hsl(25,95%,53%)" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="py-12 text-center text-sm text-muted-foreground">No order data yet.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Pie + Recent Orders */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="font-display uppercase">Orders by Status</CardTitle></CardHeader>
          <CardContent>
            {ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="font-display uppercase">Recent Orders</CardTitle></CardHeader>
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
