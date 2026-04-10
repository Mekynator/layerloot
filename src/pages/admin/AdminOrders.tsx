import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logAdminActivity } from "@/lib/activity-log";
import AdminLayout from "@/components/admin/AdminLayout";
import { formatPrice } from "@/lib/currency";

interface StoreOrder {
  id: string;
  user_id: string | null;
  status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  created_at: string;
  tracking_number: string | null;
  tracking_url: string | null;
  notes: string | null;
  profiles: { full_name: string | null } | null;
}

const ORDER_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  { value: "paid", label: "Paid", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  { value: "processing", label: "Processing", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  { value: "printing", label: "Printing", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  { value: "finishing", label: "Finishing", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  { value: "packed", label: "Packed", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30" },
  { value: "shipped", label: "Shipped", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  { value: "delivered", label: "Delivered", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  { value: "completed", label: "Completed", color: "bg-green-600/10 text-green-700 border-green-600/30" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500/10 text-red-600 border-red-500/30" },
  { value: "refunded", label: "Refunded", color: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  { value: "on_hold", label: "On Hold", color: "bg-gray-500/10 text-gray-600 border-gray-500/30" },
];

const AdminOrders = () => {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, user_id, status, subtotal, shipping_cost, total, created_at, tracking_number, tracking_url, notes")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    const orders = (data ?? []) as any[];

    // Fetch profile names for orders with user_id
    const userIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];
    const profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      (profiles ?? []).forEach((p: any) => {
        profileMap[p.user_id] = p.full_name ?? "";
      });
    }

    setOrders(orders.map(o => ({
      ...o,
      profiles: o.user_id ? { full_name: profileMap[o.user_id] || null } : null,
    })) as StoreOrder[]);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, newStatus: string, oldStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("order_status_history").insert({ order_id: id, status: newStatus, note: null });
    logAdminActivity({
      userId: user?.id ?? "",
      userEmail: user?.email ?? undefined,
      action: "order_status_changed",
      entityType: "order",
      entityId: id,
      summary: `Order status: ${oldStatus} → ${newStatus}`,
      metadata: { old_status: oldStatus, new_status: newStatus },
    });
    toast({ title: `Order updated to ${newStatus}` });
    fetchOrders();
  };

  const getStatusBadge = (status: string) => {
    const s = ORDER_STATUSES.find((st) => st.value === status);
    return (
      <Badge variant="outline" className={`text-xs capitalize ${s?.color ?? ""}`}>
        {s?.label ?? status.replace(/_/g, " ")}
      </Badge>
    );
  };

  let filtered = filterStatus === "all" ? orders : orders.filter((o) => o.status === filterStatus);
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((o) =>
      o.id.toLowerCase().includes(q) ||
      ((o.profiles as any)?.full_name ?? "").toLowerCase().includes(q)
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Orders</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order ID or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                  <TableCell className="font-display text-sm font-semibold uppercase">#{o.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm">{(o.profiles as any)?.full_name || "Guest"}</TableCell>
                  <TableCell className="font-display font-bold text-primary">{formatPrice(o.total)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v, o.status)}>
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {o.tracking_number ? (
                      <Badge variant="outline" className="font-mono text-xs">{o.tracking_number}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/admin/orders/${o.id}`); }}>
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No orders found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminOrders;
