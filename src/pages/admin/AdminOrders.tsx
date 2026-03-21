import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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

interface CustomOrderInOrders {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  final_agreed_price: number | null;
  quoted_price: number | null;
  customer_offer_price: number | null;
  payment_status: string;
  production_status: string;
  model_filename: string;
  admin_notes: string | null;
}

type AdminOrderRow =
  | {
      source: "store";
      id: string;
      customerName: string;
      total: number;
      status: string;
      tracking_number: string | null;
      created_at: string;
      raw: StoreOrder;
    }
  | {
      source: "custom";
      id: string;
      customerName: string;
      total: number;
      status: string;
      tracking_number: null;
      created_at: string;
      raw: CustomOrderInOrders;
    };

const storeStatuses = ["pending", "processing", "shipped", "completed", "cancelled"];
const customProductionStatuses = ["queued", "in_production", "completed", "shipped", "cancelled"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600",
  processing: "bg-blue-500/10 text-blue-600",
  queued: "bg-sky-500/10 text-sky-600",
  in_production: "bg-orange-500/10 text-orange-600",
  shipped: "bg-purple-500/10 text-purple-600",
  completed: "bg-green-500/10 text-green-600",
  cancelled: "bg-red-500/10 text-red-600",
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [detailOrder, setDetailOrder] = useState<AdminOrderRow | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editShipping, setEditShipping] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const [editProductionStatus, setEditProductionStatus] = useState("in_production");
  const [editPaymentStatus, setEditPaymentStatus] = useState("paid");
  const { toast } = useToast();

  const fetchOrders = async () => {
    const [storeRes, customRes] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, user_id, status, subtotal, shipping_cost, total, created_at, tracking_number, tracking_url, notes, profiles!orders_user_id_fkey(full_name)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("custom_orders")
        .select(
          "id, name, email, status, created_at, final_agreed_price, quoted_price, customer_offer_price, payment_status, production_status, model_filename, admin_notes",
        )
        .eq("request_fee_status", "paid")
        .in("status", ["in_production", "completed"])
        .order("created_at", { ascending: false }),
    ]);

    const storeOrders: AdminOrderRow[] = ((storeRes.data as any[]) ?? []).map((o) => ({
      source: "store",
      id: o.id,
      customerName: o.profiles?.full_name || "Guest",
      total: Number(o.total),
      status: o.status,
      tracking_number: o.tracking_number,
      created_at: o.created_at,
      raw: o,
    }));

    const customOrders: AdminOrderRow[] = ((customRes.data as any[]) ?? []).map((o) => ({
      source: "custom",
      id: o.id,
      customerName: o.name || o.email || "Custom Customer",
      total: Number(o.final_agreed_price ?? o.quoted_price ?? o.customer_offer_price ?? 0),
      status: o.production_status || o.status,
      tracking_number: null,
      created_at: o.created_at,
      raw: o,
    }));

    const merged = [...storeOrders, ...customOrders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    setOrders(merged);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStoreStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("order_status_history").insert({ order_id: id, status, note: null });
    toast({ title: `Order updated to ${status}` });
    fetchOrders();
  };

  const updateCustomStatus = async (id: string, production_status: string) => {
    const mappedStatus =
      production_status === "completed" || production_status === "shipped" ? "completed" : "in_production";
    const { error } = await supabase
      .from("custom_orders")
      .update({ production_status, status: mappedStatus })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: `Custom order updated to ${production_status}` });
    fetchOrders();
  };

  const openDetail = async (o: AdminOrderRow) => {
    setDetailOrder(o);
    setOrderItems([]);

    if (o.source === "store") {
      setTrackingNumber(o.raw.tracking_number ?? "");
      setTrackingUrl(o.raw.tracking_url ?? "");
      setEditNotes(o.raw.notes ?? "");
      setEditShipping(String(o.raw.shipping_cost));
      setEditTotal(String(o.raw.total));
      const { data } = await supabase.from("order_items").select("*").eq("order_id", o.id);
      setOrderItems((data as OrderItem[]) ?? []);
    } else {
      setTrackingNumber("");
      setTrackingUrl("");
      setEditNotes(o.raw.admin_notes ?? "");
      setEditShipping("0");
      setEditTotal(String(o.total));
      setEditProductionStatus(o.raw.production_status || "in_production");
      setEditPaymentStatus(o.raw.payment_status || "paid");
    }
  };

  const saveOrderDetails = async () => {
    if (!detailOrder) return;

    if (detailOrder.source === "store") {
      await supabase
        .from("orders")
        .update({
          tracking_number: trackingNumber || null,
          tracking_url: trackingUrl || null,
          notes: editNotes || null,
          shipping_cost: parseFloat(editShipping) || 0,
          total: parseFloat(editTotal) || detailOrder.total,
        })
        .eq("id", detailOrder.id);
      toast({ title: "Order details saved" });
    } else {
      await supabase
        .from("custom_orders")
        .update({
          admin_notes: editNotes || null,
          final_agreed_price: parseFloat(editTotal) || detailOrder.total,
          payment_status: editPaymentStatus,
          production_status: editProductionStatus,
          status:
            editProductionStatus === "completed" || editProductionStatus === "shipped" ? "completed" : "in_production",
        })
        .eq("id", detailOrder.id);
      toast({ title: "Custom order details saved" });
    }

    setDetailOrder(null);
    fetchOrders();
  };

  const filtered = filterStatus === "all" ? orders : orders.filter((o) => o.status === filterStatus);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Orders</h1>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {[...new Set([...storeStatuses, ...customProductionStatuses])].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Type</TableHead>
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
                <TableRow key={`${o.source}-${o.id}`}>
                  <TableCell className="font-display text-sm font-semibold uppercase">#{o.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{o.source === "store" ? "Store" : "Custom"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{o.customerName}</TableCell>
                  <TableCell className="font-display font-bold text-primary">{Number(o.total).toFixed(2)} kr</TableCell>
                  <TableCell>
                    {o.source === "store" ? (
                      <Select value={o.status} onValueChange={(v) => updateStoreStatus(o.id, v)}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {storeStatuses.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select value={o.status} onValueChange={(v) => updateCustomStatus(o.id, v)}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {customProductionStatuses.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {o.tracking_number ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {o.tracking_number}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(o)} className="text-xs">
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detailOrder} onOpenChange={(v) => !v && setDetailOrder(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Order #{detailOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer:</span>{" "}
                  <span className="font-semibold">{detailOrder.customerName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  <Badge variant="outline">{detailOrder.source === "store" ? "Store" : "Custom Print"}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {new Date(detailOrder.created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span> {Number(detailOrder.total).toFixed(2)} kr
                </div>
              </div>

              {detailOrder.source === "store" && orderItems.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="mb-2 font-display text-sm font-semibold uppercase">Items</p>
                  <div className="space-y-1 text-sm">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>
                          {item.product_name} × {item.quantity}
                        </span>
                        <span className="font-bold">{Number(item.total_price).toFixed(2)} kr</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailOrder.source === "store" ? (
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Shipping Cost</Label>
                      <Input value={editShipping} onChange={(e) => setEditShipping(e.target.value)} />
                    </div>
                    <div>
                      <Label>Total</Label>
                      <Input value={editTotal} onChange={(e) => setEditTotal(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Tracking Number</Label>
                    <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                  </div>
                  <div>
                    <Label>Tracking URL</Label>
                    <Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />
                  </div>
                  <Button onClick={saveOrderDetails} className="w-full font-display uppercase tracking-wider text-xs">
                    Save All Changes
                  </Button>
                </div>
              ) : (
                <div className="border-t border-border pt-4 space-y-3">
                  <div>
                    <Label>Final Agreed Price</Label>
                    <Input value={editTotal} onChange={(e) => setEditTotal(e.target.value)} />
                  </div>
                  <div>
                    <Label>Payment Status</Label>
                    <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["unpaid", "awaiting_payment", "paid", "refunded", "cancelled"].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Production Status</Label>
                    <Select value={editProductionStatus} onValueChange={setEditProductionStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {customProductionStatuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Admin Notes</Label>
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
                  </div>
                  <Button onClick={saveOrderDetails} className="w-full font-display uppercase tracking-wider text-xs">
                    Save Custom Order
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOrders;
