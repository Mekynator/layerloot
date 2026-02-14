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
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [statusNote, setStatusNote] = useState("");
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
    // Add to status history
    await supabase.from("order_status_history").insert({
      order_id: id, status, note: statusNote || null,
    });
    toast({ title: `Order updated to ${status}` });
    setStatusNote("");
    fetchOrders();
  };

  const updateTracking = async (id: string) => {
    await supabase.from("orders").update({ tracking_number: trackingNumber || null, tracking_url: trackingUrl || null }).eq("id", id);
    toast({ title: "Tracking info updated" });
    setDetailOrder(null);
    fetchOrders();
  };

  const openDetail = (o: Order) => {
    setDetailOrder(o);
    setTrackingNumber(o.tracking_number ?? "");
    setTrackingUrl(o.tracking_url ?? "");
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
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(v) => !v && setDetailOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display uppercase">Order #{detailOrder?.id.slice(0, 8)}</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> <span className="font-semibold">{detailOrder.profiles?.full_name || "Guest"}</span></div>
                <div><span className="text-muted-foreground">Total:</span> <span className="font-bold text-primary">{Number(detailOrder.total).toFixed(2)} kr</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={statusColors[detailOrder.status]}>{detailOrder.status}</Badge></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(detailOrder.created_at).toLocaleDateString()}</div>
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <div><Label>Tracking Number</Label><Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Enter tracking number" /></div>
                <div><Label>Tracking URL</Label><Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." /></div>
                <Button onClick={() => updateTracking(detailOrder.id)} className="w-full font-display uppercase tracking-wider text-xs">Save Tracking</Button>
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <div><Label>Status Note (optional)</Label><Textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Add a note for the customer..." rows={2} /></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOrders;
