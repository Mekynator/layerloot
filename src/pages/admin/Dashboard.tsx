import { useEffect, useState } from "react";
import { DollarSign, Package, ShoppingCart, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

const Dashboard = () => {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, products: 0, clients: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [ordersRes, productsRes, profilesRes] = await Promise.all([
        supabase.from("orders").select("total, status"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      const orders = ordersRes.data ?? [];
      const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
      setStats({
        revenue,
        orders: orders.length,
        products: productsRes.count ?? 0,
        clients: profilesRes.count ?? 0,
      });
    };
    const fetchRecent = async () => {
      const { data } = await supabase.from("orders").select("id, total, status, created_at, profiles!orders_user_id_fkey(full_name)").order("created_at", { ascending: false }).limit(5);
      setRecentOrders(data ?? []);
    };
    fetchStats();
    fetchRecent();
  }, []);

  const cards = [
    { label: "Revenue", value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign },
    { label: "Orders", value: stats.orders, icon: ShoppingCart },
    { label: "Products", value: stats.products, icon: Package },
    { label: "Clients", value: stats.clients, icon: Users },
  ];

  return (
    <AdminLayout>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase text-foreground">Dashboard</h1>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-display text-2xl font-bold text-card-foreground">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
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
                    <p className="font-display font-bold text-primary">${Number(o.total).toFixed(2)}</p>
                    <p className="font-display text-xs uppercase text-muted-foreground">{o.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default Dashboard;
