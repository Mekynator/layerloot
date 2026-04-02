import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign, CheckCircle2, XCircle, Send, LampDesk, Box,
  ChevronDown, Sparkles, FileText, Video, Image as ImageIcon,
  Clock, Eye, Package, Search, Printer, Truck, Check, Info,
  MessageSquare, Paperclip, Lock,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { payCustomOrder } from "@/lib/payCustomOrder";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { AccountModuleProps, CustomOrder, CustomOrderMessage, SeenState } from "./types";
import {
  customStatusBadgeColors, isCustomOrderDone, detectCustomOrderType,
  parseCustomOrderDescription, isAfter, getLatestDate,
} from "./types";

interface Props extends AccountModuleProps {
  customOrders: CustomOrder[];
  customOrderMessages: Record<string, CustomOrderMessage[]>;
  seenState: SeenState;
}

/* ─── Timeline for custom orders ─── */

const CUSTOM_TIMELINE_STEPS = [
  { key: "received", label: "Received", icon: <Package className="h-3.5 w-3.5" /> },
  { key: "reviewing", label: "Reviewing", icon: <Search className="h-3.5 w-3.5" /> },
  { key: "quoted", label: "Quoted", icon: <DollarSign className="h-3.5 w-3.5" /> },
  { key: "in_production", label: "In Production", icon: <Printer className="h-3.5 w-3.5" /> },
  { key: "completed", label: "Completed", icon: <Check className="h-3.5 w-3.5" /> },
  { key: "shipped", label: "Shipped", icon: <Truck className="h-3.5 w-3.5" /> },
];

function getCustomTimelineIndex(order: CustomOrder): number {
  const s = (order.status || "").toLowerCase();
  const p = (order.production_status || "").toLowerCase();
  if (p === "shipped") return 5;
  if (p === "completed" || s === "completed") return 4;
  if (p === "in_production" || p === "queued" || s === "in_production") return 3;
  if (s === "quoted" || s === "accepted") return 2;
  if (s === "reviewing") return 1;
  return 0;
}

function CustomOrderTimeline({ order }: { order: CustomOrder }) {
  const activeIdx = getCustomTimelineIndex(order);
  return (
    <div className="flex w-full items-start justify-between gap-0.5">
      {CUSTOM_TIMELINE_STEPS.map((step, idx) => (
        <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full items-center">
            {idx > 0 && (
              <div className={`h-0.5 flex-1 transition-colors ${idx <= activeIdx ? "bg-primary" : "bg-border"}`} />
            )}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.06 }}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                idx < activeIdx
                  ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : idx === activeIdx
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                    : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {idx < activeIdx ? <Check className="h-3.5 w-3.5" /> : step.icon}
            </motion.div>
            {idx < CUSTOM_TIMELINE_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 transition-colors ${idx + 1 <= activeIdx ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
          <p className={`text-center text-[10px] font-medium leading-tight ${idx <= activeIdx ? "text-foreground" : "text-muted-foreground"}`}>
            {step.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─── Next steps guidance ─── */

function getNextStepsMessage(order: CustomOrder & { orderType: string }, feePaid: boolean, tt: Props["tt"]): { message: string; variant: "info" | "action" | "success" } {
  if (!feePaid && order.orderType === "custom-print") {
    return { message: tt("account.customRequests.nextStepPayFee", "Pay the request fee to get started."), variant: "action" };
  }
  const s = order.status.toLowerCase();
  const p = order.production_status.toLowerCase();
  if (s === "pending" || s === "reviewing") {
    return { message: tt("account.customRequests.nextStepReviewing", "Your request is being reviewed by our team."), variant: "info" };
  }
  if (s === "quoted" && order.customer_response_status === "pending") {
    return { message: tt("account.customRequests.nextStepQuoteWaiting", "You have a quote waiting — review and accept to proceed."), variant: "action" };
  }
  if (order.customer_response_status === "accepted" && order.payment_status === "awaiting_payment") {
    return { message: tt("account.customRequests.nextStepPayment", "Complete payment to start production."), variant: "action" };
  }
  if (p === "in_production" || p === "queued") {
    return { message: tt("account.customRequests.nextStepInProduction", "Your order is being crafted."), variant: "info" };
  }
  if (p === "completed") {
    return { message: tt("account.customRequests.nextStepCompleted", "Your order is complete and being prepared for shipping."), variant: "success" };
  }
  if (p === "shipped") {
    return { message: tt("account.customRequests.nextStepShipped", "Your order is on its way!"), variant: "success" };
  }
  return { message: tt("account.customRequests.nextStepDefault", "We'll update you as your request progresses."), variant: "info" };
}

const nextStepVariantClasses = {
  info: "border-blue-500/20 bg-blue-500/5 text-blue-700",
  action: "border-primary/20 bg-primary/5 text-primary",
  success: "border-green-500/20 bg-green-500/5 text-green-700",
};

/* ─── Media link detection ─── */

function isVideoLink(text: string) {
  return /youtube\.com|youtu\.be|vimeo\.com|📹/i.test(text);
}
function isImageLink(text: string) {
  return /\.(jpg|jpeg|png|gif|webp|svg)/i.test(text);
}
function extractUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

/* ─── Type badge ─── */

function CustomTypeBadge({ orderType, tt }: { orderType: "custom-print" | "lithophane"; tt: Props["tt"] }) {
  return orderType === "lithophane" ? (
    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs uppercase"><LampDesk className="mr-1 h-3 w-3" />{tt("account.customRequests.typeLithophane", "Lithophane")}</Badge>
  ) : (
    <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-700 text-xs uppercase"><Box className="mr-1 h-3 w-3" />{tt("account.customRequests.typeCustomPrint", "Custom 3D Print")}</Badge>
  );
}

/* ─── Message bubble ─── */

function MessageBubble({ msg, isUnread }: { msg: CustomOrderMessage; isUnread: boolean }) {
  const isAdmin = msg.sender_role === "admin";
  const isSystem = msg.sender_role === "system" || msg.message_type === "status_update" || msg.message_type === "system";
  const text = msg.message || "";
  const url = extractUrl(text);

  if (isSystem) {
    return (
      <div className="flex justify-center py-1.5">
        <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground italic">
          <Info className="h-3 w-3" />
          <span>{text}</span>
          {isUnread && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-destructive" />}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isAdmin ? "justify-start" : "justify-end"} gap-2`}>
      {isAdmin && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}
      <div className={`max-w-[75%] space-y-1 rounded-2xl px-3.5 py-2.5 text-sm ${
        isAdmin
          ? "rounded-tl-sm border border-primary/15 bg-primary/5 text-foreground"
          : "rounded-tr-sm bg-muted text-foreground"
      }`}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase text-muted-foreground">{isAdmin ? "Team" : "You"}</span>
          {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-destructive" />}
          {msg.proposed_price !== null && (
            <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">{Number(msg.proposed_price).toFixed(2)} kr</Badge>
          )}
        </div>
        <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
        {url && isVideoLink(text) && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-muted transition-colors">
            <Video className="h-3.5 w-3.5" /> View Model Video
          </a>
        )}
        {url && isImageLink(url) && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-muted transition-colors">
            <ImageIcon className="h-3.5 w-3.5" /> View Reference Image
          </a>
        )}
        <p className="text-[10px] text-muted-foreground/70">{new Date(msg.created_at).toLocaleString()}</p>
      </div>
    </div>
  );
}

/* ─── Main module ─── */

const CustomOrdersModule = ({ user, tt, customOrders, customOrderMessages, seenState, refetchOverview }: Props) => {
  const { toast } = useToast();
  const [customRequestsView, setCustomRequestsView] = useState<"ongoing" | "done">("ongoing");
  const [expandedCustomOrderId, setExpandedCustomOrderId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState(false);
  const [processingCustomPaymentOrderId, setProcessingCustomPaymentOrderId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const parsedCustomOrders = useMemo(
    () => customOrders.map(order => ({ ...order, parsed: parseCustomOrderDescription(order.description), orderType: detectCustomOrderType(order) })),
    [customOrders]
  );
  const ongoingCustomOrders = useMemo(() => parsedCustomOrders.filter(o => !isCustomOrderDone(o)), [parsedCustomOrders]);
  const doneCustomOrders = useMemo(() => parsedCustomOrders.filter(o => isCustomOrderDone(o)), [parsedCustomOrders]);

  useEffect(() => {
    if (expandedCustomOrderId) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      // Clear unread flag for user when expanding
      supabase.from("custom_orders").update({ unread_by_user: false } as any).eq("id", expandedCustomOrderId).then(() => {});
    }
  }, [expandedCustomOrderId, customOrderMessages]);

  const sendCustomOrderReply = async (customOrderId: string) => {
    const message = (replyMessage[customOrderId] || "").trim();
    if (!message || !user) return;
    setSendingReply(true);
    const { error } = await supabase.from("custom_order_messages").insert({ custom_order_id: customOrderId, sender_role: "user", sender_user_id: user.id, message, message_type: "note" });
    setSendingReply(false);
    if (error) { toast({ title: tt("common.error", "Error"), description: error.message, variant: "destructive" }); return; }
    setReplyMessage(prev => ({ ...prev, [customOrderId]: "" }));
    toast({ title: tt("account.customRequests.replySent", "Reply sent") });
    await refetchOverview();
  };

  const respondToQuote = async (order: CustomOrder, accepted: boolean) => {
    if (!user) return;
    const newStatus = accepted ? "accepted" : "reviewing";
    const newCustomerResponse = accepted ? "accepted" : "declined";
    const paymentStatus = accepted ? "awaiting_payment" : order.payment_status;
    const { error: updateError } = await supabase.from("custom_orders").update({ status: newStatus, customer_response_status: newCustomerResponse, final_agreed_price: accepted ? (order.quoted_price ?? order.final_agreed_price) : order.final_agreed_price, payment_status: paymentStatus }).eq("id", order.id);
    if (updateError) { toast({ title: tt("common.error", "Error"), description: updateError.message, variant: "destructive" }); return; }
    await supabase.from("custom_order_messages").insert({ custom_order_id: order.id, sender_role: "user", sender_user_id: user.id, message: accepted ? `${tt("account.customRequests.customerAcceptedQuote", "Customer accepted the quoted price of")} ${(order.quoted_price ?? 0).toFixed(2)} kr.` : tt("account.customRequests.customerDeclinedQuote", "Customer declined the current quote."), message_type: "status_update", proposed_price: accepted ? order.quoted_price : null });
    if (accepted) {
      try { setProcessingCustomPaymentOrderId(order.id); await payCustomOrder(order.id); } catch (paymentError: any) { toast({ title: tt("account.customRequests.quoteAcceptedPaymentNotStarted", "Quote accepted, payment not started"), description: paymentError?.message || tt("account.customRequests.clickPayNow", "Please click Pay Now to complete payment."), variant: "destructive" }); await refetchOverview(); } finally { setProcessingCustomPaymentOrderId(null); }
      return;
    }
    toast({ title: tt("account.customRequests.quoteDeclined", "Quote declined"), description: tt("account.customRequests.requestMarkedDeclined", "The request has been marked as declined.") });
    await refetchOverview();
  };

  const hasUnreadActivityForOrder = (order: CustomOrder) => {
    const seenAt = seenState.customRequestsLastSeenAt;
    const latestForOrder = getLatestDate([order.created_at, order.updated_at, ...(customOrderMessages[order.id] || []).map(msg => msg.created_at)]);
    return isAfter(latestForOrder, seenAt);
  };

  const renderList = (list: typeof parsedCustomOrders) => {
    if (list.length === 0) return <Card><CardContent className="p-8 text-center text-muted-foreground">{tt("account.customRequests.noneInSection", "No requests in this section.")}</CardContent></Card>;

    return (
      <div className="space-y-4">
        {list.map(order => {
          const expanded = expandedCustomOrderId === order.id;
          const messages = customOrderMessages[order.id] || [];
          const currentQuote = order.final_agreed_price ?? order.quoted_price ?? null;
          const hasUnread = hasUnreadActivityForOrder(order);
          const feePaid = order.orderType === "lithophane" ? true : order.request_fee_status === "paid";
          const showFeeGate = order.orderType === "custom-print" && !feePaid;
          const nextSteps = getNextStepsMessage(order, feePaid, tt);
          const conversationClosed = (order.metadata as any)?.conversation_status === "closed";
          const meta = (order.metadata || {}) as Record<string, any>;

          return (
            <Card key={order.id} className="overflow-hidden">
              {/* ─── Order header ─── */}
              <CardContent className="p-5 pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-semibold uppercase text-card-foreground">#{order.id.slice(0, 8)}</p>
                    {hasUnread && <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />}
                    <CustomTypeBadge orderType={order.orderType} tt={tt} />
                    <Badge variant="outline" className={`font-display text-xs uppercase ${customStatusBadgeColors[order.status] || ""}`}>{order.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                    {showFeeGate ? (
                      <Button size="sm" onClick={async () => {
                        try {
                          setProcessingCustomPaymentOrderId(order.id);
                          const { data: sessionData } = await supabase.auth.getSession();
                          const token = sessionData.session?.access_token;
                          if (!token) throw new Error(tt("auth.signInAgain", "Please sign in again"));
                          const { data, error } = await supabase.functions.invoke("create-request-fee-checkout", { body: { orderId: order.id }, headers: { Authorization: `Bearer ${token}` } });
                          if (error) throw error;
                          if (data?.alreadyPaid) { toast({ title: tt("account.customRequests.feeAlreadyPaid", "Fee already paid") }); await refetchOverview(); return; }
                          if (data?.url) window.location.href = data.url;
                        } catch (err: any) { toast({ title: tt("common.error", "Error"), description: err?.message, variant: "destructive" }); } finally { setProcessingCustomPaymentOrderId(null); }
                      }} disabled={processingCustomPaymentOrderId === order.id} className="font-display uppercase tracking-wider text-xs">
                        <DollarSign className="mr-1 h-3.5 w-3.5" />
                        {processingCustomPaymentOrderId === order.id ? tt("common.redirecting", "Redirecting...") : `${tt("account.customRequests.payFee", "Pay")} ${order.request_fee_amount ?? 100} kr`}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setExpandedCustomOrderId(expanded ? null : order.id)} className="font-display uppercase tracking-wider text-xs">
                        {expanded ? tt("account.customRequests.hideDetails", "Hide") : tt("account.customRequests.viewDetails", "View Details")}
                        <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </Button>
                    )}
                  </div>
                </div>

                {/* ─── Next steps banner ─── */}
                <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${nextStepVariantClasses[nextSteps.variant]}`}>
                  {nextSteps.variant === "action" ? <Eye className="h-3.5 w-3.5 shrink-0" /> : nextSteps.variant === "success" ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Clock className="h-3.5 w-3.5 shrink-0" />}
                  <span>{nextSteps.message}</span>
                </div>

                {/* ─── Timeline ─── */}
                <div className="mt-4">
                  <CustomOrderTimeline order={order} />
                </div>
              </CardContent>

              {/* ─── Fee gate message ─── */}
              {showFeeGate && (
                <div className="mx-5 mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                  <p className="text-sm font-medium text-foreground">{tt("account.customRequests.requestFeeRequired", "Request Fee Required")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tt("account.customRequests.requestFeeDescription", "A one-time request fee of")} {order.request_fee_amount ?? 100} kr {tt("account.customRequests.requestFeeDescriptionEnd", "is required before your custom order can be reviewed. This fee will be deducted from your final order total.")}</p>
                </div>
              )}

              {/* ─── Expanded content ─── */}
              {expanded && feePaid && (
                <div className="border-t border-border">
                  {/* ─── Status badges ─── */}
                  <div className="flex flex-wrap gap-2 px-5 pt-4">
                    <Badge variant="outline" className="text-xs">{tt("account.customRequests.payment", "Payment")}: {order.payment_status.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline" className="text-xs">{tt("account.customRequests.production", "Production")}: {order.production_status.replace(/_/g, " ")}</Badge>
                    {currentQuote !== null && <Badge variant="outline" className="border-primary/30 text-primary text-xs">{tt("account.customRequests.quote", "Quote")}: {Number(currentQuote).toFixed(2)} kr</Badge>}
                  </div>

                  <div className="grid gap-4 p-5 lg:grid-cols-5">
                    {/* ─── Left column: Details + Quoting ─── */}
                    <div className="space-y-4 lg:col-span-2">
                      {/* Request details */}
                      <Card className="border-border/50">
                        <CardHeader className="pb-2 pt-3 px-4">
                          <CardTitle className="text-xs font-display uppercase tracking-wider text-muted-foreground">{tt("account.customRequests.requestDetails", "Request Details")}</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-0">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {[
                              { label: tt("account.customRequests.material", "Material"), value: order.parsed.material },
                              { label: tt("account.customRequests.color", "Color"), value: order.parsed.color },
                              { label: tt("account.customRequests.quality", "Quality"), value: order.parsed.quality },
                              { label: tt("account.customRequests.quantity", "Quantity"), value: order.parsed.quantity },
                              { label: tt("account.customRequests.scale", "Scale"), value: order.parsed.scale },
                            ].map(f => (
                              <div key={f.label}>
                                <p className="text-[11px] text-muted-foreground">{f.label}</p>
                                <p className="font-medium text-foreground">{f.value}</p>
                              </div>
                            ))}
                          </div>
                          {order.parsed.customerDescription && order.parsed.customerDescription !== "-" && (
                            <div className="mt-3 border-t border-border/30 pt-3">
                              <p className="text-[11px] text-muted-foreground mb-1">{tt("account.customRequests.yourNotes", "Your Notes")}</p>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{order.parsed.customerDescription}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Attachments */}
                      <Collapsible>
                        <Card className="border-border/50">
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl">
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-display uppercase tracking-wider text-muted-foreground">{tt("account.customRequests.attachments", "Attachments")}</span>
                              </div>
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="px-4 pb-4 pt-0 space-y-2">
                              {order.model_filename && (
                                <a href={order.model_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5 text-sm hover:bg-muted/40 transition-colors">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <span className="truncate text-foreground">{order.model_filename}</span>
                                </a>
                              )}
                              {meta.reference_image_url && (
                                <a href={meta.reference_image_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-border/40">
                                  <img src={meta.reference_image_url} alt="Reference" className="h-32 w-full object-cover" />
                                </a>
                              )}
                              {!order.model_filename && !meta.reference_image_url && (
                                <p className="text-xs text-muted-foreground">{tt("account.customRequests.noAttachments", "No attachments.")}</p>
                              )}
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>

                      {/* Quoting section */}
                      {order.status === "quoted" && order.quoted_price !== null && order.customer_response_status !== "accepted" && order.customer_response_status !== "declined" && (
                        <Card className="border-primary/20 bg-primary/[0.02]">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <DollarSign className="h-4 w-4 text-primary" />
                              <p className="font-display text-sm font-semibold uppercase text-foreground">{tt("account.customRequests.quoteAvailable", "Quote Available")}</p>
                            </div>
                            <p className="text-2xl font-bold text-foreground mb-1">{Number(order.quoted_price).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">kr</span></p>
                            <p className="text-xs text-muted-foreground mb-4">{tt("account.customRequests.quoteActionTextEnd", "Please accept or decline the quote.")}</p>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => respondToQuote(order, true)} disabled={processingCustomPaymentOrderId === order.id} className="font-display uppercase tracking-wider text-xs flex-1">
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />{processingCustomPaymentOrderId === order.id ? tt("common.redirecting", "Redirecting...") : tt("account.customRequests.acceptQuote", "Accept")}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => respondToQuote(order, false)} className="font-display uppercase tracking-wider text-xs">
                                <XCircle className="mr-1 h-3.5 w-3.5" />{tt("account.customRequests.declineQuote", "Decline")}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Pay now */}
                      {order.customer_response_status === "accepted" && order.payment_status === "awaiting_payment" && order.final_agreed_price !== null && (
                        <Card className="border-green-500/20 bg-green-500/[0.02]">
                          <CardContent className="p-4">
                            <p className="font-display text-sm font-semibold uppercase text-foreground">{tt("account.customRequests.paymentPending", "Payment Pending")}</p>
                            <p className="mt-1 text-2xl font-bold text-foreground">{Number(order.final_agreed_price).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">kr</span></p>
                            {order.orderType === "custom-print" && (
                              <p className="mt-1 text-[11px] text-muted-foreground">{tt("account.customRequests.customPrintFeeNote", "The 100 kr request fee will be deducted.")}</p>
                            )}
                            <Button size="sm" onClick={async () => {
                              try { setProcessingCustomPaymentOrderId(order.id); await payCustomOrder(order.id); } catch (e: any) { toast({ title: tt("common.error", "Error"), description: e?.message, variant: "destructive" }); } finally { setProcessingCustomPaymentOrderId(null); }
                            }} disabled={processingCustomPaymentOrderId === order.id} className="mt-3 w-full font-display uppercase tracking-wider text-xs">
                              {processingCustomPaymentOrderId === order.id ? tt("common.redirecting", "Redirecting...") : tt("account.customRequests.payNow", "Pay Now")}
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {/* Pricing summary (when paid) */}
                      {order.payment_status === "paid" && currentQuote !== null && (
                        <Card className="border-border/50">
                          <CardContent className="p-4">
                            <p className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2">{tt("account.customRequests.pricingSummary", "Pricing Summary")}</p>
                            <div className="space-y-1 text-sm">
                              {order.quoted_price !== null && <div className="flex justify-between"><span className="text-muted-foreground">{tt("account.customRequests.quotedPrice", "Quoted")}</span><span>{Number(order.quoted_price).toFixed(2)} kr</span></div>}
                              {order.final_agreed_price !== null && <div className="flex justify-between font-medium"><span>{tt("account.customRequests.finalAgreed", "Final")}</span><span>{Number(order.final_agreed_price).toFixed(2)} kr</span></div>}
                              {order.orderType === "custom-print" && <div className="flex justify-between text-xs text-muted-foreground"><span>{tt("account.customRequests.requestFee", "Request fee")}</span><span>{tt("account.customRequests.deducted", "Deducted")}</span></div>}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* ─── Right column: Communication ─── */}
                    <div className="lg:col-span-3">
                      <Card className="border-border/50 flex flex-col h-full">
                        <CardHeader className="pb-2 pt-3 px-4 flex-row items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                            <CardTitle className="text-xs font-display uppercase tracking-wider text-muted-foreground">{tt("account.customRequests.conversation", "Conversation")}</CardTitle>
                          </div>
                          {conversationClosed && (
                            <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground"><Lock className="mr-1 h-2.5 w-2.5" />Closed</Badge>
                          )}
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-0 flex flex-col flex-1">
                          <div className="flex-1 overflow-y-auto max-h-[400px] space-y-2.5 rounded-lg border border-border/30 bg-muted/10 p-3 mb-3">
                            {messages.length === 0 ? (
                              <p className="text-sm text-center text-muted-foreground py-8">{tt("account.customRequests.noConversation", "No messages yet.")}</p>
                            ) : messages.map(msg => {
                              const isUnread = msg.sender_role === "admin" && isAfter(msg.created_at, seenState.customRequestsLastSeenAt);
                              return <MessageBubble key={msg.id} msg={msg} isUnread={isUnread} />;
                            })}
                            <div ref={messagesEndRef} />
                          </div>

                          {conversationClosed ? (
                            <div className="flex items-center justify-center gap-2 rounded-lg border border-border/30 bg-muted/20 py-3 text-xs text-muted-foreground">
                              <Lock className="h-3.5 w-3.5" />
                              {tt("account.customRequests.conversationClosed", "This conversation is closed.")}
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Textarea
                                value={replyMessage[order.id] || ""}
                                onChange={e => setReplyMessage(prev => ({ ...prev, [order.id]: e.target.value }))}
                                placeholder={tt("account.customRequests.replyPlaceholder", "Write a message...")}
                                rows={2}
                                className="min-h-[60px] text-sm"
                              />
                              <Button
                                size="icon"
                                onClick={() => sendCustomOrderReply(order.id)}
                                disabled={sendingReply || !(replyMessage[order.id] || "").trim()}
                                className="h-auto aspect-square shrink-0"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  if (parsedCustomOrders.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground">
        {tt("account.customRequests.empty", "No custom requests yet.")} <Link to="/create" className="text-primary hover:underline">{tt("account.customRequests.submitFirst", "Submit your first custom 3D print request.")}</Link>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={customRequestsView === "ongoing" ? "default" : "outline"} onClick={() => setCustomRequestsView("ongoing")} className="font-display uppercase tracking-wider">{tt("account.customRequests.ongoing", "Ongoing")} ({ongoingCustomOrders.length})</Button>
        <Button size="sm" variant={customRequestsView === "done" ? "default" : "outline"} onClick={() => setCustomRequestsView("done")} className="font-display uppercase tracking-wider">{tt("account.customRequests.done", "Done")} ({doneCustomOrders.length})</Button>
      </div>
      {customRequestsView === "ongoing" ? renderList(ongoingCustomOrders) : renderList(doneCustomOrders)}
    </div>
  );
};

export default CustomOrdersModule;
