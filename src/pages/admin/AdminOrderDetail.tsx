import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Truck, Save, Pin, Trash2, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logAdminActivity } from "@/lib/activity-log";
import { useAdminNotes } from "@/hooks/use-admin-notes";
import AdminLayout from "@/components/admin/AdminLayout";
import OrderTimeline from "@/components/orders/OrderTimeline";
import { formatPrice } from "@/lib/currency";

const ORDER_STATUSES = [
  { value: "pending", label: "New / Pending", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
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

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface StatusHistoryEntry {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
}

const AdminOrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [status, setStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [invoice, setInvoice] = useState<{ invoice_number: string; invoice_url: string } | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const { notes: internalNotes, addNote, togglePin, deleteNote } = useAdminNotes("order", orderId);

  useEffect(() => {
    if (!orderId) return;
    const load = async () => {
      const [orderRes, itemsRes, historyRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*, profiles!orders_user_id_fkey(full_name)" as any)
          .eq("id", orderId)
          .maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
        supabase.from("order_status_history").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
      ]);
      if (orderRes.data) {
        setOrder(orderRes.data);
        setStatus((orderRes.data as any).status);
        setTrackingNumber((orderRes.data as any).tracking_number ?? "");
        setTrackingUrl((orderRes.data as any).tracking_url ?? "");
        setNotes((orderRes.data as any).notes ?? "");
      }
      setItems((itemsRes.data as OrderItem[]) ?? []);
      setHistory((historyRes.data as StatusHistoryEntry[]) ?? []);
    };
    load();
  }, [orderId]);

  const handleSave = async () => {
    if (!orderId || !order) return;
    setSaving(true);

    const oldStatus = order.status;
    const { error } = await supabase.from("orders").update({
      status,
      tracking_number: trackingNumber || null,
      tracking_url: trackingUrl || null,
      notes: notes || null,
    }).eq("id", orderId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    if (status !== oldStatus) {
      await supabase.from("order_status_history").insert({ order_id: orderId, status, note: null });
      logAdminActivity({
        userId: user?.id ?? "",
        userEmail: user?.email ?? undefined,
        action: "order_status_changed",
        entityType: "order",
        entityId: orderId,
        summary: `Order status changed from ${oldStatus} to ${status}`,
        metadata: { old_status: oldStatus, new_status: status },
      });

      // Trigger email for shipping/delivered status changes
      const customerEmail = (order as any).profiles?.email || (order.shipping_address as any)?.email;
      const customerName = (order as any).profiles?.full_name || "Customer";
      if (status === "shipped" && customerEmail) {
        supabase.functions.invoke('trigger-email', {
          body: {
            templateName: 'shipping-update',
            recipientEmail: customerEmail,
            idempotencyKey: `shipping-${orderId}-${Date.now()}`,
            templateData: { name: customerName, orderNumber: orderId.slice(0, 8), trackingUrl: trackingUrl || undefined, shippingMethod: 'Standard' },
          },
        }).catch(() => {});
      }
      if (status === "delivered" && customerEmail) {
        supabase.functions.invoke('trigger-email', {
          body: {
            templateName: 'delivered',
            recipientEmail: customerEmail,
            idempotencyKey: `delivered-${orderId}-${Date.now()}`,
            templateData: { name: customerName, orderNumber: orderId.slice(0, 8) },
          },
        }).catch(() => {});
      }
    }

    toast({ title: "Order saved" });
    setSaving(false);
    // Reload
    const { data } = await supabase
      .from("orders")
      .select("*, profiles!orders_user_id_fkey(full_name)" as any)
      .eq("id", orderId)
      .maybeSingle();
    if (data) setOrder(data);
    const { data: h } = await supabase.from("order_status_history").select("*").eq("order_id", orderId).order("created_at", { ascending: true });
    setHistory((h as StatusHistoryEntry[]) ?? []);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addNote(newNote.trim());
    setNewNote("");
  };

  if (!order) {
    return (
      <AdminLayout>
        <div className="flex items-center gap-2 py-12 text-muted-foreground">Loading order…</div>
      </AdminLayout>
    );
  }

  const customerName = (order as any).profiles?.full_name || "Guest";
  const statusDef = ORDER_STATUSES.find((s) => s.value === status);
  const shippingAddr = order.shipping_address as any;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold uppercase">
              Order #{orderId?.slice(0, 8)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {customerName} · {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="outline" className={statusDef?.color ?? ""}>
            {statusDef?.label ?? status}
          </Badge>
        </div>

        {/* Timeline */}
        <Card>
          <CardContent className="pt-6">
            <OrderTimeline status={status} adminMode />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Items */}
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Items</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.product_name} × {item.quantity}</span>
                      <span className="font-semibold">{formatPrice(item.total_price)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{formatPrice(order.shipping_cost)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status History */}
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Status History</CardTitle></CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No status changes recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center gap-3 text-sm">
                        <span className="text-xs text-muted-foreground w-28 shrink-0">
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">{h.status.replace(/_/g, " ")}</Badge>
                        {h.note && <span className="text-muted-foreground">{h.note}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Internal Notes */}
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Internal Notes</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {internalNotes.map((n) => (
                  <div key={n.id} className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                    <div className="flex-1">
                      {n.is_pinned && <Badge variant="secondary" className="mb-1 text-[10px]">Pinned</Badge>}
                      <p>{n.note}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePin(n.id, n.is_pinned)}>
                        <Pin className={`h-3 w-3 ${n.is_pinned ? "text-primary" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteNote(n.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add internal note…"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={handleAddNote} size="sm" disabled={!newNote.trim()}>Add</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Actions */}
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Status & Actions</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tracking Number</Label>
                  <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. 1Z999..." />
                </div>
                <div>
                  <Label>Tracking URL</Label>
                  <Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label>Order Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full font-display uppercase tracking-wider text-xs">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Customer</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Name:</span> {customerName}</p>
                {shippingAddr && (
                  <>
                    {shippingAddr.street && <p><span className="text-muted-foreground">Address:</span> {shippingAddr.street}</p>}
                    {(shippingAddr.city || shippingAddr.zip) && (
                      <p><span className="text-muted-foreground">City:</span> {shippingAddr.zip} {shippingAddr.city}</p>
                    )}
                    {shippingAddr.country && <p><span className="text-muted-foreground">Country:</span> {shippingAddr.country}</p>}
                  </>
                )}
                {order.discount_metadata && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-[10px]">Discount Applied</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOrderDetail;
