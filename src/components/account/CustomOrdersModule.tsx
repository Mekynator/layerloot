import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign, CheckCircle2, XCircle, Send, LampDesk, Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { payCustomOrder } from "@/lib/payCustomOrder";
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

function customTypeBadge(orderType: "custom-print" | "lithophane", label: string, altLabel: string) {
  return orderType === "lithophane" ? (
    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs uppercase"><LampDesk className="mr-1 h-3 w-3" />{label}</Badge>
  ) : (
    <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-700 text-xs uppercase"><Box className="mr-1 h-3 w-3" />{altLabel}</Badge>
  );
}

const CustomOrdersModule = ({ user, tt, customOrders, customOrderMessages, seenState, refetchOverview }: Props) => {
  const { toast } = useToast();
  const [customRequestsView, setCustomRequestsView] = useState<"ongoing" | "done">("ongoing");
  const [expandedCustomOrderId, setExpandedCustomOrderId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState(false);
  const [processingCustomPaymentOrderId, setProcessingCustomPaymentOrderId] = useState<string | null>(null);

  const parsedCustomOrders = useMemo(
    () => customOrders.map(order => ({ ...order, parsed: parseCustomOrderDescription(order.description), orderType: detectCustomOrderType(order) })),
    [customOrders]
  );
  const ongoingCustomOrders = useMemo(() => parsedCustomOrders.filter(o => !isCustomOrderDone(o)), [parsedCustomOrders]);
  const doneCustomOrders = useMemo(() => parsedCustomOrders.filter(o => isCustomOrderDone(o)), [parsedCustomOrders]);

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

  const customStatusBadge = (status: string) => (
    <Badge variant="outline" className={`font-display text-xs uppercase ${customStatusBadgeColors[status] || ""}`}>{status.replace(/_/g, " ")}</Badge>
  );

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
          const showFeeBadge = order.orderType === "custom-print" && !feePaid;
          const showFeeGate = order.orderType === "custom-print" && !feePaid;

          return (
            <Card key={order.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-semibold uppercase text-card-foreground">{tt("account.customRequests.request", "Custom Request")} #{order.id.slice(0, 8)}</p>
                      {hasUnread && <span className="h-2.5 w-2.5 rounded-full bg-destructive" />}
                      {customTypeBadge(order.orderType, tt("account.customRequests.typeLithophane", "Lithophane"), tt("account.customRequests.typeCustomPrint", "Custom 3D Print"))}
                      {customStatusBadge(order.status)}
                      {showFeeBadge && <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600 text-xs uppercase">{tt("account.customRequests.feeUnpaid", "Fee Unpaid")}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{tt("account.customRequests.submittedOn", "Submitted on")} {new Date(order.created_at).toLocaleString()}</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {["material", "color", "quality", "quantity", "scale"].map(field => (
                        <div key={field} className="text-sm"><span className="text-muted-foreground">{tt(`account.customRequests.${field}`, field.charAt(0).toUpperCase() + field.slice(1))}:</span> {(order.parsed as any)[field]}</div>
                      ))}
                    </div>
                    {feePaid && (
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{tt("account.customRequests.payment", "Payment")}: {order.payment_status.replace(/_/g, " ")}</Badge>
                        <Badge variant="outline">{tt("account.customRequests.production", "Production")}: {order.production_status.replace(/_/g, " ")}</Badge>
                        {currentQuote !== null && <Badge variant="outline" className="border-primary text-primary">{tt("account.customRequests.quote", "Quote")}: {Number(currentQuote).toFixed(2)} kr</Badge>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {showFeeGate ? (
                      <Button onClick={async () => {
                        try {
                          setProcessingCustomPaymentOrderId(order.id);
                          const { data: sessionData } = await supabase.auth.getSession();
                          const token = sessionData.session?.access_token;
                          if (!token) throw new Error(tt("auth.signInAgain", "Please sign in again"));
                          const { data, error } = await supabase.functions.invoke("create-request-fee-checkout", { body: { orderId: order.id }, headers: { Authorization: `Bearer ${token}` } });
                          if (error) throw error;
                          if (data?.alreadyPaid) { toast({ title: tt("account.customRequests.feeAlreadyPaid", "Fee already paid") }); await refetchOverview(); return; }
                          if (data?.url) window.location.href = data.url;
                        } catch (err: any) { toast({ title: tt("common.error", "Error"), description: err?.message || tt("account.customRequests.couldNotStartPayment", "Could not start payment"), variant: "destructive" }); } finally { setProcessingCustomPaymentOrderId(null); }
                      }} disabled={processingCustomPaymentOrderId === order.id} className="font-display uppercase tracking-wider">
                        <DollarSign className="mr-1 h-4 w-4" />
                        {processingCustomPaymentOrderId === order.id ? tt("common.redirecting", "Redirecting...") : `${tt("account.customRequests.payFee", "Pay")} ${order.request_fee_amount ?? 100} kr ${tt("account.customRequests.fee", "Fee")}`}
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => setExpandedCustomOrderId(expanded ? null : order.id)} className="font-display uppercase tracking-wider">
                        {expanded ? tt("account.customRequests.hideDetails", "Hide Details") : tt("account.customRequests.viewDetails", "View Details")}
                      </Button>
                    )}
                  </div>
                </div>

                {showFeeGate && (
                  <div className="mt-4 rounded-md border border-yellow-500/20 bg-yellow-500/5 p-4">
                    <p className="text-sm font-medium text-foreground">{tt("account.customRequests.requestFeeRequired", "Request Fee Required")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{tt("account.customRequests.requestFeeDescription", "A one-time request fee of")} {order.request_fee_amount ?? 100} kr {tt("account.customRequests.requestFeeDescriptionEnd", "is required before your custom order can be reviewed. This fee will be deducted from your final order total.")}</p>
                  </div>
                )}

                {expanded && feePaid && (
                  <div className="mt-5 space-y-5 border-t border-border pt-5">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">{tt("account.customRequests.originalRequest", "Your Original Request")}</Label>
                        <pre className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-muted p-3 text-sm text-foreground">{order.parsed.customerDescription || "-"}</pre>
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-md border border-border bg-muted/40 p-3">
                          <Label className="text-xs text-muted-foreground">{tt("account.customRequests.adminNotes", "Admin Notes")}</Label>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{order.admin_notes || tt("account.customRequests.noAdminNotes", "No admin notes yet.")}</p>
                        </div>
                        <div className="rounded-md border border-border bg-muted/40 p-3">
                          <Label className="text-xs text-muted-foreground">{tt("account.customRequests.negotiationState", "Current Negotiation State")}</Label>
                          <div className="mt-2 space-y-1 text-sm">
                            <p><span className="text-muted-foreground">{tt("account.customRequests.quotedPrice", "Quoted Price")}:</span> {order.quoted_price !== null ? `${Number(order.quoted_price).toFixed(2)} kr` : "-"}</p>
                            <p><span className="text-muted-foreground">{tt("account.customRequests.finalAgreed", "Final Agreed")}:</span> {order.final_agreed_price !== null ? `${Number(order.final_agreed_price).toFixed(2)} kr` : "-"}</p>
                            <p><span className="text-muted-foreground">{tt("account.customRequests.yourResponse", "Your Response")}:</span> {order.customer_response_status.replace(/_/g, " ")}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">{tt("account.customRequests.conversationHistory", "Conversation History")}</Label>
                      <div className="mt-2 space-y-3 rounded-md border border-border bg-muted/20 p-3">
                        {messages.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{tt("account.customRequests.noConversation", "No conversation yet.")}</p>
                        ) : messages.map(msg => {
                          const isUnreadMessage = msg.sender_role === "admin" && isAfter(msg.created_at, seenState.customRequestsLastSeenAt);
                          return (
                            <div key={msg.id} className={`rounded-lg border p-3 text-sm ${msg.sender_role === "admin" ? "border-primary/20 bg-primary/5" : "border-border bg-background"}`}>
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <Badge variant={msg.sender_role === "admin" ? "default" : "outline"} className="text-[10px] uppercase">{msg.sender_role}</Badge>
                                <Badge variant="outline" className="text-[10px] uppercase">{msg.message_type.replace(/_/g, " ")}</Badge>
                                {isUnreadMessage && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
                                {msg.proposed_price !== null && <Badge variant="outline" className="border-primary text-[10px] uppercase text-primary">{Number(msg.proposed_price).toFixed(2)} kr</Badge>}
                              </div>
                              <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
                              <p className="whitespace-pre-wrap text-foreground">{msg.message || "-"}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {order.status === "quoted" && order.quoted_price !== null && order.customer_response_status !== "accepted" && order.customer_response_status !== "declined" && (
                      <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                        <div className="mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /><p className="font-display text-sm font-semibold uppercase text-foreground">{tt("account.customRequests.quoteActionRequired", "Quote Action Required")}</p></div>
                        <p className="mb-4 text-sm text-muted-foreground">{tt("account.customRequests.quoteActionText", "Admin has quoted this request at")} <span className="font-semibold text-foreground">{Number(order.quoted_price).toFixed(2)} kr</span>. {tt("account.customRequests.quoteActionTextEnd", "Please accept or decline the quote.")}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => respondToQuote(order, true)} disabled={processingCustomPaymentOrderId === order.id} className="font-display uppercase tracking-wider"><CheckCircle2 className="mr-1 h-4 w-4" />{processingCustomPaymentOrderId === order.id ? tt("common.redirecting", "Redirecting...") : tt("account.customRequests.acceptQuote", "Accept Quote")}</Button>
                          <Button variant="outline" onClick={() => respondToQuote(order, false)} className="font-display uppercase tracking-wider"><XCircle className="mr-1 h-4 w-4" />{tt("account.customRequests.declineQuote", "Decline Quote")}</Button>
                        </div>
                      </div>
                    )}

                    <div className="rounded-md border border-border bg-muted/30 p-4">
                      <div className="space-y-3">
                        <Label>{tt("account.customRequests.replyToAdmin", "Reply to Admin")}</Label>
                        <Textarea value={replyMessage[order.id] || ""} onChange={e => setReplyMessage(prev => ({ ...prev, [order.id]: e.target.value }))} placeholder={tt("account.customRequests.replyPlaceholder", "Write a message to admin...")} rows={4} />
                        <Button onClick={() => sendCustomOrderReply(order.id)} disabled={sendingReply || !(replyMessage[order.id] || "").trim()} className="font-display uppercase tracking-wider"><Send className="mr-1 h-4 w-4" />{tt("account.customRequests.sendReply", "Send Reply")}</Button>
                      </div>
                    </div>

                    {order.customer_response_status === "accepted" && order.payment_status === "awaiting_payment" && order.final_agreed_price !== null && (
                      <div className="rounded-md border border-green-500/20 bg-green-500/5 p-4">
                        <p className="font-display text-sm font-semibold uppercase text-foreground">{tt("account.customRequests.paymentPending", "Payment Pending")}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{tt("account.customRequests.finalAgreedAmount", "Final agreed amount")}: <span className="font-semibold text-foreground">{Number(order.final_agreed_price).toFixed(2)} kr</span></p>
                        {order.orderType === "custom-print" ? (
                          <p className="mt-2 text-xs text-muted-foreground">{tt("account.customRequests.customPrintFeeNote", "The 100 kr custom request fee should be deducted from the final order total at checkout.")}</p>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">{tt("account.customRequests.lithophaneFeeNote", "Lithophane orders do not include a request fee.")}</p>
                        )}
                        <Button onClick={async () => {
                          try { setProcessingCustomPaymentOrderId(order.id); await payCustomOrder(order.id); } catch (paymentError: any) { toast({ title: tt("account.customRequests.paymentError", "Payment error"), description: paymentError?.message || tt("account.customRequests.couldNotOpenCheckout", "Could not open checkout."), variant: "destructive" }); } finally { setProcessingCustomPaymentOrderId(null); }
                        }} disabled={processingCustomPaymentOrderId === order.id} className="mt-3 font-display uppercase tracking-wider">
                          {processingCustomPaymentOrderId === order.id ? tt("common.redirecting", "Redirecting...") : tt("account.customRequests.payNow", "Pay Now")}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
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
