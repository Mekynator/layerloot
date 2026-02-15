import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
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

const statuses = ["pending", "processing", "shipped", "completed", "cancelled"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600",
  processing: "bg-blue-500/10 text-blue-600",
  shipped: "bg-purple-500/10 text-purple-600",
  completed: "bg-green-500/10 text-green-600",
  cancelled: "bg-red-500/10 text-red-600",
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editShipping, setEditShipping] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const { toast } = useToast();

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, user_id, status, subtotal, shipping_cost, total, created_at, tracking_number, tracking_url, notes, profiles!orders_user_id_fkey(full_name)")
      .order("created_at", { ascending: false });
    setOrders((data as any[]) ?? []);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("order_status_history").insert({ order_id: id, status, note: statusNote || null });
    toast({ title: `Order updated to ${status}` });
    setStatusNote("");
    fetchOrders();
  };

  const openDetail = async (o: Order) => {
    setDetailOrder(o);
    setTrackingNumber(o.tracking_number ?? "");
    setTrackingUrl(o.tracking_url ?? "");
    setEditNotes(o.notes ?? "");
    setEditShipping(String(o.shipping_cost));
    setEditTotal(String(o.total));
    const { data } = await supabase.from("order_items").select("*").eq("order_id", o.id);
    setOrderItems((data as OrderItem[]) ?? []);
  };

  const saveOrderDetails = async () => {
    if (!detailOrder) return;
    await supabase.from("orders").update({
      tracking_number: trackingNumber || null,
      tracking_url: trackingUrl || null,
      notes: editNotes || null,
      shipping_cost: parseFloat(editShipping) || 0,
      total: parseFloat(editTotal) || detailOrder.total,
    }).eq("id", detailOrder.id);
    toast({ title: "Order details saved" });
    setDetailOrder(null);
    fetchOrders();
  };

  const filtered = filterStatus === "all" ? orders : orders.filter((o) => o.status === filterStatus);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Orders</h1>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
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
                <TableRow key={o.id}>
                  <TableCell className="font-display text-sm font-semibold uppercase">#{o.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm">{o.profiles?.full_name || "Guest"}</TableCell>
                  <TableCell className="font-display font-bold text-primary">{Number(o.total).toFixed(2)} kr</TableCell>
                  <TableCell>
                    <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {o.tracking_number ? (
                      <Badge variant="outline" className="font-mono text-xs">{o.tracking_number}</Badge>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(o)} className="text-xs">Details</Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No orders found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detailOrder} onOpenChange={(v) => !v && setDetailOrder(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display uppercase">Order #{detailOrder?.id.slice(0, 8)}</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> <span className="font-semibold">{detailOrder.profiles?.full_name || "Guest"}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={statusColors[detailOrder.status]}>{detailOrder.status}</Badge></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(detailOrder.created_at).toLocaleDateString()}</div>
                <div><span className="text-muted-foreground">Subtotal:</span> {Number(detailOrder.subtotal).toFixed(2)} kr</div>
              </div>

              {/* Order Items */}
              {orderItems.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="mb-2 font-display text-sm font-semibold uppercase">Items</p>
                  <div className="space-y-1 text-sm">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.product_name} × {item.quantity}</span>
                        <span className="font-bold">{Number(item.total_price).toFixed(2)} kr</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Editable fields */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Shipping Cost</Label><Input value={editShipping} onChange={(e) => setEditShipping(e.target.value)} /></div>
                  <div><Label>Total</Label><Input value={editTotal} onChange={(e) => setEditTotal(e.target.value)} /></div>
                </div>
                <div><Label>Tracking Number</Label><Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} /></div>
                <div><Label>Tracking URL</Label><Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} /></div>
                <div><Label>Notes</Label><Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} /></div>
                <Button onClick={saveOrderDetails} className="w-full font-display uppercase tracking-wider text-xs">Save All Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOrders;
