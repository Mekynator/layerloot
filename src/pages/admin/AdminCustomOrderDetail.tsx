import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Send, Download, Pin, Trash2,
  DollarSign, ChevronDown, ChevronRight, Paperclip,
  Video, Image as ImageIcon, Lock, Unlock, MessageSquare,
  Sparkles, FileText,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logAdminActivity } from "@/lib/activity-log";
import { useAdminNotes } from "@/hooks/use-admin-notes";
import AdminLayout from "@/components/admin/AdminLayout";
import ModelViewer from "@/components/ModelViewer";
import { formatPrice } from "@/lib/currency";
import { executeAutomation, trackSlaStage, DEFAULT_SLA_HOURS } from "@/hooks/use-custom-order-automation";
import CustomOrderSlaCard from "@/components/admin/CustomOrderSlaCard";

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

const CONVERSATION_STATUSES = ["open", "closed"] as const;
type ConversationStatus = typeof CONVERSATION_STATUSES[number];

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

/* ── Metadata helpers ─────────────────────────────────────── */

interface ParsedDetails {
  orderType?: string;
  dimensions?: string;
  material?: string;
  finish?: string;
  color?: string;
  quantity?: string;
  printTime?: string;
  estimatedPrice?: string;
  customerNotes?: string;
  options?: Record<string, string>;
}

function parseMetadata(meta: any): ParsedDetails {
  if (!meta || typeof meta !== "object") return {};
  const d: ParsedDetails = {};
  if (meta.order_type || meta.orderType) d.orderType = meta.order_type || meta.orderType;
  if (meta.dimensions) d.dimensions = typeof meta.dimensions === "object" ? JSON.stringify(meta.dimensions) : String(meta.dimensions);
  if (meta.material) d.material = String(meta.material);
  if (meta.finish) d.finish = String(meta.finish);
  if (meta.color || meta.colour) d.color = String(meta.color || meta.colour);
  if (meta.quantity) d.quantity = String(meta.quantity);
  if (meta.print_time || meta.printTime) d.printTime = String(meta.print_time || meta.printTime);
  if (meta.estimated_price || meta.estimatedPrice) d.estimatedPrice = String(meta.estimated_price || meta.estimatedPrice);
  if (meta.customer_notes || meta.customerNotes || meta.notes) d.customerNotes = String(meta.customer_notes || meta.customerNotes || meta.notes);

  // Collect remaining simple key-value pairs as options
  const knownKeys = new Set(["order_type", "orderType", "dimensions", "material", "finish", "color", "colour", "quantity", "print_time", "printTime", "estimated_price", "estimatedPrice", "customer_notes", "customerNotes", "notes", "reference_image_url", "referenceImageUrl"]);
  const opts: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (knownKeys.has(k)) continue;
    if (v === null || v === undefined || v === "") continue;
    if (typeof v === "object") continue; // skip nested objects
    opts[k.replace(/_/g, " ")] = String(v);
  }
  if (Object.keys(opts).length > 0) d.options = opts;

  return d;
}

/* ── Component ────────────────────────────────────────────── */

const AdminCustomOrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [messages, setMessages] = useState<CustomOrderMessage[]>([]);
  const [statusUpdate, setStatusUpdate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [productionStatus, setProductionStatus] = useState("pending");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [threadMessage, setThreadMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>("open");
  const [videoLink, setVideoLink] = useState("");
  const [pictureLink, setPictureLink] = useState("");
  const [messageTemplates, setMessageTemplates] = useState<{id: string; title: string; template: string; trigger_key: string}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { notes: internalNotes, addNote, togglePin, deleteNote } = useAdminNotes("custom_order", orderId);

  const loadOrder = async () => {
    if (!orderId) return;
    const { data } = await supabase.from("custom_orders").select("*").eq("id", orderId).maybeSingle();
    if (data) {
      setOrder(data);
      setStatusUpdate(data.status);
      setPaymentStatus(data.payment_status);
      setProductionStatus(data.production_status);
      setQuoteAmount(data.quoted_price ? String(data.quoted_price) : "");
      const meta = data.metadata as any;
      if (meta?.conversation_status) setConversationStatus(meta.conversation_status);
      if (meta?.video_link) setVideoLink(meta.video_link);
      if (meta?.picture_link) setPictureLink(meta.picture_link);
      // Mark as read by admin
      if ((data as any).unread_by_admin) {
        await supabase.from("custom_orders").update({ unread_by_admin: false } as any).eq("id", orderId);
      }
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

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("custom_order_message_templates" as any)
      .select("id, title, template, trigger_key")
      .eq("is_active", true)
      .order("sort_order");
    setMessageTemplates((data as any) ?? []);
  };

  useEffect(() => {
    loadOrder();
    loadMessages();
    loadTemplates();
  }, [orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSave = async () => {
    if (!orderId || !order) return;
    setSaving(true);

    const oldStatus = order.status;
    const existingMeta = (order.metadata as any) || {};
    const { error } = await supabase.from("custom_orders").update({
      status: statusUpdate,
      payment_status: paymentStatus,
      production_status: productionStatus,
      metadata: {
        ...existingMeta,
        conversation_status: conversationStatus,
        video_link: videoLink || null,
        picture_link: pictureLink || null,
      },
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
      // Trigger automation rules
      await executeAutomation({ orderId, triggerEvent: "status_changed", fromStatus: oldStatus, toStatus: statusUpdate });
      // Track SLA
      await trackSlaStage(orderId, statusUpdate, DEFAULT_SLA_HOURS[statusUpdate]);
    }

    const oldProd = order.production_status;
    if (productionStatus !== oldProd) {
      await executeAutomation({ orderId, triggerEvent: "production_changed", fromStatus: oldProd, toStatus: productionStatus });
      await trackSlaStage(orderId, productionStatus, DEFAULT_SLA_HOURS[productionStatus]);
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
    if (conversationStatus === "closed") {
      toast({ title: "Conversation is closed", description: "Reopen the conversation before sending messages.", variant: "destructive" });
      return;
    }
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

  const toggleConversation = async () => {
    const next: ConversationStatus = conversationStatus === "open" ? "closed" : "open";
    setConversationStatus(next);
    if (!orderId) return;

    const existingMeta = (order?.metadata as any) || {};
    await supabase.from("custom_orders").update({
      metadata: { ...existingMeta, conversation_status: next },
    }).eq("id", orderId);

    await supabase.from("custom_order_messages").insert({
      custom_order_id: orderId,
      sender_role: "system",
      message: next === "closed" ? "Conversation closed by admin" : "Conversation reopened by admin",
      message_type: "status_update",
    });

    toast({ title: next === "closed" ? "Conversation closed" : "Conversation reopened" });
    await loadMessages();
  };

  const sendQuickLink = async (type: "video" | "picture", url: string) => {
    if (!url.trim() || !orderId) return;
    const label = type === "video" ? "📹 Model Video" : "🖼️ Reference Picture";
    await supabase.from("custom_order_messages").insert({
      custom_order_id: orderId,
      sender_role: "admin",
      message: `${label}: ${url.trim()}`,
      message_type: "note",
    });
    toast({ title: `${type === "video" ? "Video" : "Picture"} link shared` });
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
  const details = parseMetadata(metadata);
  const isClosed = conversationStatus === "closed";

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/custom-orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold uppercase">
              Custom Order #{orderId?.slice(0, 8)}
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              {order.name} · {order.email} · {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={isClosed ? "bg-muted text-muted-foreground" : ""}>
              <MessageSquare className="mr-1 h-3 w-3" />
              {isClosed ? "Closed" : "Open"}
            </Badge>
            <Badge variant="outline" className={statusDef?.color ?? ""}>
              {statusDef?.label ?? statusUpdate}
            </Badge>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* ── Main Column ──────────────────────────── */}
          <div className="space-y-5 lg:col-span-2">

            {/* Communication — PRIMARY */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-sm uppercase flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Communication
                  </CardTitle>
                  <Button
                    variant={isClosed ? "outline" : "ghost"}
                    size="sm"
                    onClick={toggleConversation}
                    className="text-xs"
                  >
                    {isClosed ? <Unlock className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />}
                    {isClosed ? "Reopen" : "Close"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="messages">
                  <TabsList className="mb-3">
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                    <TabsTrigger value="internal">Internal Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="messages" className="space-y-3">
                    {/* Message thread */}
                    <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                      {messages.filter(m => m.message_type !== "internal").map((msg) => {
                        const imgUrl = extractImageUrl(msg.message);
                        const isAdmin = msg.sender_role === "admin";
                        const isSystem = msg.sender_role === "system" || msg.message_type === "system" || msg.message_type === "status_update";
                        return (
                          <div
                            key={msg.id}
                            className={`text-sm rounded-xl p-3 ${
                              isSystem
                                ? "bg-muted/50 text-muted-foreground text-center text-xs italic"
                                : isAdmin
                                  ? "bg-primary/5 border border-primary/20 ml-8"
                                  : "bg-muted/80 mr-8"
                            }`}
                          >
                            {!isSystem && (
                              <div className="flex items-center gap-2 mb-1.5">
                                {isAdmin ? (
                                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                                    <Sparkles className="h-3 w-3 text-primary" />
                                  </div>
                                ) : (
                                  <div className="h-5 w-5 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                    {order.name?.[0]?.toUpperCase() || "U"}
                                  </div>
                                )}
                                <span className="font-semibold text-xs capitalize">
                                  {isAdmin ? "LayerLoot" : order.name || "Customer"}
                                </span>
                                <span className="text-[10px] text-muted-foreground ml-auto">
                                  {new Date(msg.created_at).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {isSystem && (
                              <span className="text-[10px] text-muted-foreground block mb-0.5">
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                            )}
                            <p className="whitespace-pre-wrap">{stripImageUrl(msg.message)}</p>
                            {imgUrl && (
                              <img src={imgUrl} alt="" className="mt-2 max-h-32 rounded-lg border border-border" />
                            )}
                            {msg.proposed_price != null && (
                              <Badge variant="secondary" className="mt-1.5">
                                <DollarSign className="mr-1 h-3 w-3" />
                                {formatPrice(msg.proposed_price)}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                      {messages.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">No messages yet — start the conversation below.</p>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Quick links */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                        <Input
                          placeholder="Video link…"
                          value={videoLink}
                          onChange={(e) => setVideoLink(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 shrink-0"
                          disabled={!videoLink.trim()}
                          onClick={() => sendQuickLink("video", videoLink)}
                        >
                          <Video className="h-3.5 w-3.5 mr-1" /> Share
                        </Button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                        <Input
                          placeholder="Picture link…"
                          value={pictureLink}
                          onChange={(e) => setPictureLink(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 shrink-0"
                          disabled={!pictureLink.trim()}
                          onClick={() => sendQuickLink("picture", pictureLink)}
                        >
                          <ImageIcon className="h-3.5 w-3.5 mr-1" /> Share
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Compose */}
                    {isClosed ? (
                      <div className="text-center py-3 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                        <Lock className="inline h-3.5 w-3.5 mr-1.5" />
                        Conversation closed · Replies disabled
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Write a message to customer…"
                          value={threadMessage}
                          onChange={(e) => setThreadMessage(e.target.value)}
                          rows={2}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={sendAdminMessage} disabled={saving || !threadMessage.trim()} className="self-end h-10 px-4">
                          <Send className="h-4 w-4" />
                        </Button>
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

            {/* Request Details — COMPACT */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm uppercase">Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Description */}
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{order.description}</p>

                {/* Parsed metadata fields */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  {details.orderType && (
                    <>
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium capitalize">{details.orderType}</span>
                    </>
                  )}
                  {details.dimensions && (
                    <>
                      <span className="text-muted-foreground">Dimensions</span>
                      <span className="font-medium">{details.dimensions}</span>
                    </>
                  )}
                  {details.material && (
                    <>
                      <span className="text-muted-foreground">Material</span>
                      <span className="font-medium capitalize">{details.material}</span>
                    </>
                  )}
                  {details.finish && (
                    <>
                      <span className="text-muted-foreground">Finish</span>
                      <span className="font-medium capitalize">{details.finish}</span>
                    </>
                  )}
                  {details.color && (
                    <>
                      <span className="text-muted-foreground">Color</span>
                      <span className="font-medium capitalize">{details.color}</span>
                    </>
                  )}
                  {details.quantity && (
                    <>
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="font-medium">{details.quantity}</span>
                    </>
                  )}
                  {details.printTime && (
                    <>
                      <span className="text-muted-foreground">Est. Print Time</span>
                      <span className="font-medium">{details.printTime}</span>
                    </>
                  )}
                  {details.estimatedPrice && (
                    <>
                      <span className="text-muted-foreground">Est. Price</span>
                      <span className="font-medium">{details.estimatedPrice}</span>
                    </>
                  )}
                  {/* Additional options */}
                  {details.options && Object.entries(details.options).map(([k, v]) => (
                    <React.Fragment key={k}>
                      <span className="text-muted-foreground capitalize">{k}</span>
                      <span className="font-medium">{v}</span>
                    </React.Fragment>
                  ))}
                </div>

                {/* Customer notes */}
                {details.customerNotes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">Customer Notes</span>
                    <p className="mt-0.5">{details.customerNotes}</p>
                  </div>
                )}

                {/* Model file info */}
                {order.model_filename && (
                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">Uploaded File</span>
                    <p className="mt-0.5 font-medium">{order.model_filename}</p>
                  </div>
                )}

                {/* Collapsible Media & Attachments */}
                {(order.model_url || metadata?.reference_image_url) && (
                  <Collapsible open={mediaOpen} onOpenChange={setMediaOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground hover:text-foreground -mx-1">
                        {mediaOpen ? <ChevronDown className="mr-1.5 h-3.5 w-3.5" /> : <ChevronRight className="mr-1.5 h-3.5 w-3.5" />}
                        <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                        Media & Attachments
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          {(order.model_url ? 1 : 0) + (metadata?.reference_image_url ? 1 : 0)}
                        </Badge>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      {order.model_url && (
                        <>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={order.model_url} target="_blank" rel="noreferrer">
                                <Download className="mr-2 h-3.5 w-3.5" />
                                {order.model_filename || "Download Model"}
                              </a>
                            </Button>
                          </div>
                          <div className="h-48 rounded-lg overflow-hidden border border-border">
                            <ModelViewer url={order.model_url} />
                          </div>
                        </>
                      )}
                      {metadata?.reference_image_url && (
                        <div>
                          <a href={metadata.reference_image_url} target="_blank" rel="noreferrer" className="block">
                            <img
                              src={metadata.reference_image_url}
                              alt="Reference"
                              className="max-h-48 rounded-lg border border-border object-contain"
                            />
                          </a>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar ──────────────────────────────── */}
          <div className="space-y-5">
            {/* Status & Actions — no Admin Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm uppercase">Status & Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Order Status</Label>
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
                  <Label className="text-xs">Payment Status</Label>
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
                  <Label className="text-xs">Production Status</Label>
                  <Select value={productionStatus} onValueChange={setProductionStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCTION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full font-display uppercase tracking-wider text-xs">
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Quoting — no Customer Offer */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm uppercase flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Quoting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <span className="text-muted-foreground">Quoted</span>
                  <span className="font-semibold">{order.quoted_price ? formatPrice(order.quoted_price) : "—"}</span>
                  <span className="text-muted-foreground">Agreed</span>
                  <span className="font-semibold text-primary">{order.final_agreed_price ? formatPrice(order.final_agreed_price) : "—"}</span>
                  <span className="text-muted-foreground">Request Fee</span>
                  <Badge variant="outline" className={`text-xs ${order.request_fee_status === "paid" ? "border-green-500/30 text-green-600" : "border-yellow-500/30 text-yellow-600"}`}>
                    {order.request_fee_status} ({formatPrice(order.request_fee_amount)})
                  </Badge>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs">New Quote (DKK)</Label>
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

            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm uppercase">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{order.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium truncate max-w-[180px]">{order.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="font-medium">{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCustomOrderDetail;
