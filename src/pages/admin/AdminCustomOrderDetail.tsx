import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Send, Download, Pin, Trash2,
  DollarSign, CheckCircle2, XCircle, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logAdminActivity } from "@/lib/activity-log";
import { useAdminNotes } from "@/hooks/use-admin-notes";
import AdminLayout from "@/components/admin/AdminLayout";
import OrderTimeline from "@/components/orders/OrderTimeline";
import ModelViewer from "@/components/ModelViewer";
import { formatPrice } from "@/lib/currency";

const STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  { value: "reviewing", label: "Reviewing", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  { value: "quoted", label: "Quoted", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  { value: "accepted", label: "Accepted", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  { value: "in_production", label: "In Production", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  { value: "completed", label: "Completed", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  { value: "rejected", label: "Rejected", color: "bg-red-500/10 text-red-600 border-red-500/30" },
];

const PAYMENT_STATUSES = ["unpaid", "awaiting_payment", "paid", "refunded", "cancelled"];
const PRODUCTION_STATUSES = ["pending", "queued", "in_production", "completed", "shipped", "cancelled"];

interface CustomOrderMessage {
  id: string;
  custom_order_id: string;
  sender_role: "user" | "admin" | "system";
  sender_user_id: string | null;
  message: string | null;
  message_type: string;
  proposed_price: number | null;
  created_at: string;
}

function extractImageUrl(message: string | null): string | null {
  if (!message) return null;
  const match = message.match(/https?:\/\/\S+\.(?:png|jpg|jpeg|webp)(?:\?\S*)?/i);
  return match ? match[0] : null;
}

function stripImageUrl(message: string | null): string {
  if (!message) return "-";
  return message.replace(/https?:\/\/\S+\.(?:png|jpg|jpeg|webp)(?:\?\S*)?/gi, "").trim() || "Image attachment";
}

const AdminCustomOrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [messages, setMessages] = useState<CustomOrderMessage[]>([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [statusUpdate, setStatusUpdate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [productionStatus, setProductionStatus] = useState("pending");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [threadMessage, setThreadMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState("");

  const { notes: internalNotes, addNote, togglePin, deleteNote } = useAdminNotes("custom_order", orderId);

  const loadOrder = async () => {
    if (!orderId) return;
    const { data } = await supabase.from("custom_orders").select("*").eq("id", orderId).maybeSingle();
    if (data) {
      setOrder(data);
      setStatusUpdate(data.status);
      setAdminNotes(data.admin_notes ?? "");
      setPaymentStatus(data.payment_status);
      setProductionStatus(data.production_status);
      setQuoteAmount(data.quoted_price ? String(data.quoted_price) : "");
    }
  };

  const loadMessages = async () => {
    if (!orderId) return;
    const { data } = await supabase
      .from("custom_order_messages")
      .select("*")
      .eq("custom_order_id", orderId)
      .order("created_at", { ascending: true });
    setMessages((data as CustomOrderMessage[]) ?? []);
  };

  useEffect(() => {
    loadOrder();
    loadMessages();
  }, [orderId]);

  const handleSave = async () => {
    if (!orderId || !order) return;
    setSaving(true);

    const oldStatus = order.status;
    const { error } = await supabase.from("custom_orders").update({
      status: statusUpdate,
      admin_notes: adminNotes || null,
      payment_status: paymentStatus,
      production_status: productionStatus,
    }).eq("id", orderId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    if (statusUpdate !== oldStatus) {
      await supabase.from("custom_order_messages").insert({
        custom_order_id: orderId,
        sender_role: "admin",
        message: `Status changed from ${oldStatus} to ${statusUpdate}`,
        message_type: "status_update",
      });
      logAdminActivity({
        userId: user?.id ?? "",
        userEmail: user?.email ?? undefined,
        action: "custom_order_status_changed",
        entityType: "custom_order",
        entityId: orderId,
        summary: `Custom order status: ${oldStatus} → ${statusUpdate}`,
        metadata: { old_status: oldStatus, new_status: statusUpdate },
      });
    }

    toast({ title: "Custom order saved" });
    setSaving(false);
    await loadOrder();
    await loadMessages();
  };

  const sendQuote = async () => {
    const amount = parseFloat(quoteAmount);
    if (!amount || amount <= 0 || !orderId) {
      toast({ title: "Enter a valid quote amount", variant: "destructive" });
      return;
    }
    setSaving(true);
    await supabase.from("custom_orders").update({
      quoted_price: amount,
      status: "quoted",
      customer_response_status: "pending",
    }).eq("id", orderId);

    await supabase.from("custom_order_messages").insert({
      custom_order_id: orderId,
      sender_role: "admin",
      message: threadMessage.trim() || `Quote sent: ${formatPrice(amount)}`,
      message_type: "quote",
      proposed_price: amount,
    });

    logAdminActivity({
      userId: user?.id ?? "",
      userEmail: user?.email ?? undefined,
      action: "quote_sent",
      entityType: "custom_order",
      entityId: orderId,
      summary: `Quote of ${formatPrice(amount)} sent`,
      metadata: { amount },
    });

    setThreadMessage("");
    toast({ title: "Quote sent" });
    setSaving(false);
    await loadOrder();
    await loadMessages();
  };

  const sendAdminMessage = async () => {
    if (!threadMessage.trim() || !orderId) return;
    setSaving(true);

    await supabase.from("custom_order_messages").insert({
      custom_order_id: orderId,
      sender_role: "admin",
      message: threadMessage.trim(),
      message_type: "note",
    });

    logAdminActivity({
      userId: user?.id ?? "",
      userEmail: user?.email ?? undefined,
      action: "customer_message_sent",
      entityType: "custom_order",
      entityId: orderId,
      summary: `Admin message sent on custom order`,
    });

    setThreadMessage("");
    toast({ title: "Message sent" });
    setSaving(false);
    await loadMessages();
  };

  const respondToOffer = async (accept: boolean) => {
    if (!orderId || !order?.customer_offer_price) return;
    setSaving(true);
    const update = accept
      ? { final_agreed_price: order.customer_offer_price, status: "accepted", customer_response_status: "accepted", payment_status: "awaiting_payment" }
      : { status: "reviewing" };

    await supabase.from("custom_orders").update(update).eq("id", orderId);
    await supabase.from("custom_order_messages").insert({
      custom_order_id: orderId,
      sender_role: "admin",
      message: accept
        ? `Accepted customer offer of ${formatPrice(order.customer_offer_price)}`
        : `Declined customer offer of ${formatPrice(order.customer_offer_price)}`,
      message_type: "status_update",
      proposed_price: accept ? order.customer_offer_price : null,
    });

    toast({ title: accept ? "Offer accepted" : "Offer declined" });
    setSaving(false);
    await loadOrder();
    await loadMessages();
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addNote(newNote.trim());
    setNewNote("");
  };

  if (!order) {
    return (
      <AdminLayout>
        <div className="flex items-center gap-2 py-12 text-muted-foreground">Loading custom order…</div>
      </AdminLayout>
    );
  }

  const statusDef = STATUSES.find((s) => s.value === statusUpdate);
  const metadata = order.metadata as any;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/custom-orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold uppercase">
              Custom Order #{orderId?.slice(0, 8)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {order.name} · {order.email} · {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="outline" className={statusDef?.color ?? ""}>
            {statusDef?.label ?? statusUpdate}
          </Badge>
        </div>

        {/* Timeline */}
        <Card>
          <CardContent className="pt-6">
            <OrderTimeline status={statusUpdate} productionStatus={productionStatus} adminMode />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="space-y-6 lg:col-span-2">
            {/* Description & Files */}
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Request Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm whitespace-pre-wrap">{order.description}</p>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {order.model_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={order.model_url} target="_blank" rel="noreferrer">
                        <Download className="mr-2 h-3.5 w-3.5" />
                        {order.model_filename || "Download Model"}
                      </a>
                    </Button>
                  )}
                  {metadata?.reference_image_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={metadata.reference_image_url} target="_blank" rel="noreferrer">
                        <ImageIcon className="mr-2 h-3.5 w-3.5" />
                        Reference Image
                      </a>
                    </Button>
                  )}
                </div>
                {order.model_url && (
                  <div className="h-48 rounded-lg overflow-hidden border border-border">
                    <ModelViewer url={order.model_url} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Communication */}
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Communication</CardTitle></CardHeader>
              <CardContent>
                <Tabs defaultValue="messages">
                  <TabsList className="mb-4">
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                    <TabsTrigger value="internal">Internal Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="messages" className="space-y-3">
                    <div className="max-h-80 space-y-3 overflow-y-auto">
                      {messages.filter(m => m.message_type !== "internal").map((msg) => {
                        const imgUrl = extractImageUrl(msg.message);
                        const isAdmin = msg.sender_role === "admin";
                        const isSystem = msg.sender_role === "system" || msg.message_type === "system" || msg.message_type === "status_update";
                        return (
                          <div
                            key={msg.id}
                            className={`text-sm rounded-lg p-3 ${
                              isSystem
                                ? "bg-muted/50 text-muted-foreground text-center text-xs"
                                : isAdmin
                                  ? "bg-primary/5 border border-primary/10 ml-8"
                                  : "bg-muted mr-8"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-xs capitalize">
                                {isSystem ? "System" : msg.sender_role}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap">{stripImageUrl(msg.message)}</p>
                            {imgUrl && (
                              <img src={imgUrl} alt="" className="mt-2 max-h-32 rounded border border-border" />
                            )}
                            {msg.proposed_price != null && (
                              <Badge variant="secondary" className="mt-1">{formatPrice(msg.proposed_price)}</Badge>
                            )}
                          </div>
                        );
                      })}
                      {messages.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                      )}
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Write a message to customer…"
                        value={threadMessage}
                        onChange={(e) => setThreadMessage(e.target.value)}
                        rows={2}
                        className="flex-1"
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="sm" onClick={sendAdminMessage} disabled={saving || !threadMessage.trim()}>
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Customer offer response */}
                    {order.customer_response_status === "countered" && order.customer_offer_price && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                        <p className="text-sm font-medium mb-2">
                          Customer counter-offer: <span className="text-primary font-bold">{formatPrice(order.customer_offer_price)}</span>
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => respondToOffer(true)} disabled={saving}>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => respondToOffer(false)} disabled={saving}>
                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Decline
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="internal" className="space-y-3">
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
                        placeholder="Add internal note (never visible to customer)…"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={2}
                        className="flex-1"
                      />
                      <Button onClick={handleAddNote} size="sm" disabled={!newNote.trim()}>Add</Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status controls */}
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Status & Actions</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Order Status</Label>
                  <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Production Status</Label>
                  <Select value={productionStatus} onValueChange={setProductionStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCTION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Admin Notes</Label>
                  <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full font-display uppercase tracking-wider text-xs">
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Quote */}
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Quoting</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Quoted:</span>
                  <span className="font-semibold">{order.quoted_price ? formatPrice(order.quoted_price) : "—"}</span>
                  <span className="text-muted-foreground">Customer offer:</span>
                  <span className="font-semibold">{order.customer_offer_price ? formatPrice(order.customer_offer_price) : "—"}</span>
                  <span className="text-muted-foreground">Agreed:</span>
                  <span className="font-semibold text-primary">{order.final_agreed_price ? formatPrice(order.final_agreed_price) : "—"}</span>
                  <span className="text-muted-foreground">Request fee:</span>
                  <Badge variant="outline" className={`text-xs ${order.request_fee_status === "paid" ? "border-green-500/30 text-green-600" : "border-yellow-500/30 text-yellow-600"}`}>
                    {order.request_fee_status} ({formatPrice(order.request_fee_amount)})
                  </Badge>
                </div>
                <Separator />
                <div>
                  <Label>New Quote (DKK)</Label>
                  <Input
                    type="number"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    placeholder="e.g. 350"
                  />
                </div>
                <Button onClick={sendQuote} disabled={saving} variant="secondary" className="w-full text-xs font-display uppercase">
                  <DollarSign className="mr-2 h-3.5 w-3.5" /> Send Quote
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCustomOrderDetail;
