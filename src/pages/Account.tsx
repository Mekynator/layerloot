import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Star,
  Package,
  Gift,
  LogOut,
  Shield,
  Eye,
  Send,
  MessageSquare,
  DollarSign,
  CheckCircle2,
  XCircle,
  Truck,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import ToolReviewForm from "@/components/reviews/ToolReviewForm";
import { payCustomOrder } from "@/lib/payCustomOrder";
import { useAccountOverview } from "@/hooks/use-account-overview";
import { AccountOverviewSkeleton, RewardsGridSkeleton, SectionCardSkeleton } from "@/components/shared/loading-states";

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  tool_type?: "custom-print" | "lithophane" | null;
}

interface Voucher {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  discount_type: string;
  discount_value: number;
  is_active?: boolean;
}

interface UserVoucher {
  id: string;
  user_id: string;
  voucher_id: string;
  code: string;
  is_used: boolean;
  balance: number | null;
  redeemed_at: string;
  recipient_email: string | null;
  recipient_name?: string | null;
  used_at?: string | null;
  vouchers: { name: string; discount_value: number; discount_type: string } | null;
}

interface CustomOrder {
  id: string;
  name: string;
  email: string;
  description: string;
  model_url: string;
  model_filename: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  quoted_price: number | null;
  final_agreed_price: number | null;
  customer_response_status: "pending" | "accepted" | "declined";
  payment_status: "unpaid" | "awaiting_payment" | "paid" | "refunded" | "cancelled";
  production_status: "pending" | "queued" | "in_production" | "completed" | "shipped" | "cancelled";
  request_fee_status?: string;
  request_fee_amount?: number;
}

interface CustomOrderMessage {
  id: string;
  custom_order_id: string;
  sender_role: "user" | "admin" | "system";
  sender_user_id: string | null;
  message: string | null;
  message_type: "note" | "quote" | "status_update" | "system";
  proposed_price: number | null;
  created_at: string;
}

type RewardCatalogItem = {
  key: string;
  name: string;
  description: string;
  pointsCost: number;
  discountType: string;
  discountValue: number;
  badge?: string;
};

type AccountTab = "orders" | "custom-requests" | "rewards" | "vouchers" | "settings";
type CustomRequestsView = "ongoing" | "done";
type VoucherView = "active" | "used";

type SeenState = {
  ordersLastSeenAt: string | null;
  customRequestsLastSeenAt: string | null;
};

const statusColors: Record<string, string> = {
  completed: "text-green-500",
  shipped: "text-blue-500",
  processing: "text-purple-500",
  cancelled: "text-destructive",
  pending: "text-muted-foreground",
  delivered: "text-green-500",
};

const customStatusBadgeColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  reviewing: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  quoted: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  accepted: "bg-green-500/10 text-green-600 border-green-500/30",
  in_production: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  rejected: "bg-red-500/10 text-red-600 border-red-500/30",
};

const REWARD_CATALOG: RewardCatalogItem[] = [
  {
    key: "25-discount",
    name: "25 KR DISCOUNT",
    description: "Get 25 kr off your next order",
    pointsCost: 200,
    discountType: "fixed_discount",
    discountValue: 25,
  },
  {
    key: "50-discount",
    name: "50 KR DISCOUNT",
    description: "Get 50 kr off your next order",
    pointsCost: 400,
    discountType: "fixed_discount",
    discountValue: 50,
  },
  {
    key: "100-discount",
    name: "100 KR DISCOUNT",
    description: "Get 100 kr off your next order",
    pointsCost: 800,
    discountType: "fixed_discount",
    discountValue: 100,
  },
  {
    key: "150-discount",
    name: "150 KR DISCOUNT",
    description: "Get 150 kr off your next order",
    pointsCost: 1200,
    discountType: "fixed_discount",
    discountValue: 150,
  },
  {
    key: "250-discount",
    name: "250 KR DISCOUNT",
    description: "Get 250 kr off your next order",
    pointsCost: 2000,
    discountType: "fixed_discount",
    discountValue: 250,
  },
  {
    key: "500-gift-card",
    name: "500 KR GIFT CARD",
    description: "A 500 kr gift card - use it yourself or send it to someone!",
    pointsCost: 5000,
    discountType: "gift_card",
    discountValue: 500,
    badge: "Gift Card",
  },
  {
    key: "free-delivery",
    name: "FREE DELIVERY DISCOUNT",
    description: "Get free delivery on one order",
    pointsCost: 800,
    discountType: "free_shipping",
    discountValue: 0,
    badge: "Shipping",
  },
];

const DONE_CUSTOM_STATUSES = new Set(["rejected", "completed"]);
const DONE_PRODUCTION_STATUSES = new Set(["shipped", "cancelled", "completed"]);

function isCustomOrderDone(order: CustomOrder) {
  return (
    DONE_CUSTOM_STATUSES.has((order.status || "").toLowerCase()) ||
    DONE_PRODUCTION_STATUSES.has((order.production_status || "").toLowerCase())
  );
}

function isVoucherUsedOrArchived(voucher: UserVoucher, currentUserId: string, currentUserEmail?: string | null) {
  const remainingBalance = voucher.balance !== null ? Number(voucher.balance) : null;
  const normalizedEmail = (currentUserEmail || "").trim().toLowerCase();
  const recipientEmail = (voucher.recipient_email || "").trim().toLowerCase();
  const giftedAway = Boolean(recipientEmail) && voucher.user_id === currentUserId && recipientEmail !== normalizedEmail;

  return (
    voucher.is_used ||
    !!voucher.used_at ||
    giftedAway ||
    (remainingBalance !== null && remainingBalance <= 0)
  );
}

function parseCustomOrderDescription(description: string) {
  const raw = description || "";
  const marker = "\n--- Options ---";
  const parts = raw.split(marker);
  const customerDescription = (parts[0] || "").trim();
  const optionsText = (parts[1] || "").trim();

  const parsed = {
    material: "-",
    color: "-",
    quality: "-",
    quantity: "-",
    scale: "-",
  };

  optionsText.split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) return;
    const normalizedKey = key.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (normalizedKey === "material") parsed.material = value;
    if (normalizedKey === "color") parsed.color = value;
    if (normalizedKey === "quality") parsed.quality = value;
    if (normalizedKey === "quantity") parsed.quantity = value;
    if (normalizedKey === "scale") parsed.scale = value;
  });

  return { customerDescription, ...parsed };
}

function findMatchingVoucher(catalogItem: RewardCatalogItem, vouchers: Voucher[]) {
  return vouchers.find((voucher) => {
    if (catalogItem.discountType === "free_shipping") {
      return voucher.discount_type === "free_shipping";
    }

    return (
      voucher.discount_type === catalogItem.discountType &&
      Number(voucher.discount_value) === Number(catalogItem.discountValue) &&
      Number(voucher.points_cost) === Number(catalogItem.pointsCost)
    );
  });
}

function getNotificationsStorageKey(userId: string) {
  return `layerloot_account_notifications_${userId}`;
}

function readSeenState(userId: string): SeenState {
  try {
    const raw = localStorage.getItem(getNotificationsStorageKey(userId));
    if (!raw) return { ordersLastSeenAt: null, customRequestsLastSeenAt: null };
    const parsed = JSON.parse(raw);
    return {
      ordersLastSeenAt: parsed?.ordersLastSeenAt ?? null,
      customRequestsLastSeenAt: parsed?.customRequestsLastSeenAt ?? null,
    };
  } catch {
    return { ordersLastSeenAt: null, customRequestsLastSeenAt: null };
  }
}

function saveSeenState(userId: string, next: SeenState) {
  localStorage.setItem(getNotificationsStorageKey(userId), JSON.stringify(next));
}

function isAfter(dateStr?: string | null, compareStr?: string | null) {
  if (!dateStr) return false;
  if (!compareStr) return true;
  return new Date(dateStr).getTime() > new Date(compareStr).getTime();
}

function getLatestDate(values: (string | null | undefined)[]) {
  const valid = values.filter(Boolean) as string[];
  if (valid.length === 0) return null;
  return valid.reduce((latest, current) =>
    new Date(current).getTime() > new Date(latest).getTime() ? current : latest,
  );
}

function groupVouchersByDefinition(vouchers: UserVoucher[]) {
  const groups = new Map<string, { key: string; label: string; type: string | null; items: UserVoucher[] }>();

  vouchers.forEach((voucher) => {
    const key = voucher.voucher_id || voucher.vouchers?.name || voucher.id;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(voucher);
      return;
    }

    groups.set(key, {
      key,
      label: voucher.vouchers?.name ?? "Voucher",
      type: voucher.vouchers?.discount_type ?? null,
      items: [voucher],
    });
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    items: [...group.items].sort(
      (a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime(),
    ),
  }));
}

const Account = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useAccountOverview(user?.id, user?.email);

  const [showHistory, setShowHistory] = useState(false);
  const [tab, setTab] = useState<AccountTab>("orders");
  const [customRequestsView, setCustomRequestsView] = useState<CustomRequestsView>("ongoing");
  const [voucherView, setVoucherView] = useState<VoucherView>("active");
  const [giftEmail, setGiftEmail] = useState("");
  const [giftName, setGiftName] = useState("");
  const [giftingVoucherId, setGiftingVoucherId] = useState<string | null>(null);
  const [expandedVoucherGroupKey, setExpandedVoucherGroupKey] = useState<string | null>(null);
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  const [expandedCustomOrderId, setExpandedCustomOrderId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState(false);
  const [processingCustomPaymentOrderId, setProcessingCustomPaymentOrderId] = useState<string | null>(null);
  const [redeemingKey, setRedeemingKey] = useState<string | null>(null);
  const [seenState, setSeenState] = useState<SeenState>({
    ordersLastSeenAt: null,
    customRequestsLastSeenAt: null,
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setSeenState(readSeenState(user.id));
  }, [user]);

  const pointsBalance = overview?.pointsBalance ?? 0;
  const pointsEarned = overview?.pointsEarned ?? 0;
  const pointsSpent = overview?.pointsSpent ?? 0;
  const loyaltyHistory = (overview?.loyaltyHistory ?? []) as Array<{
    id: string;
    points: number;
    reason: string | null;
    created_at: string;
  }>;
  const orders = (overview?.orders ?? []) as Order[];
  const customOrders = (overview?.customOrders ?? []) as CustomOrder[];
  const customOrderMessages = (overview?.customOrderMessages ?? {}) as Record<string, CustomOrderMessage[]>;
  const vouchers = (overview?.vouchers ?? []) as Voucher[];
  const userVouchers = (overview?.userVouchers ?? []) as UserVoucher[];

  const parsedCustomOrders = useMemo(
    () => customOrders.map((order) => ({ ...order, parsed: parseCustomOrderDescription(order.description) })),
    [customOrders],
  );

  const ongoingCustomOrders = useMemo(
    () => parsedCustomOrders.filter((order) => !isCustomOrderDone(order)),
    [parsedCustomOrders],
  );

  const doneCustomOrders = useMemo(
    () => parsedCustomOrders.filter((order) => isCustomOrderDone(order)),
    [parsedCustomOrders],
  );

  const activeVouchers = useMemo(
    () => userVouchers.filter((voucher) => user && !isVoucherUsedOrArchived(voucher, user.id, user.email)),
    [user, userVouchers],
  );

  const usedVouchers = useMemo(
    () => userVouchers.filter((voucher) => !user || isVoucherUsedOrArchived(voucher, user.id, user.email)),
    [user, userVouchers],
  );

  const activeVoucherGroups = useMemo(() => groupVouchersByDefinition(activeVouchers), [activeVouchers]);

  const usedVoucherGroups = useMemo(() => groupVouchersByDefinition(usedVouchers), [usedVouchers]);

  const latestOrderActivityAt = useMemo(() => getLatestDate(orders.map((order) => order.created_at)), [orders]);

  const latestCustomActivityAt = useMemo(() => {
    const dates: (string | null)[] = [];
    customOrders.forEach((order) => {
      dates.push(order.created_at, order.updated_at);
      (customOrderMessages[order.id] || []).forEach((msg) => dates.push(msg.created_at));
    });
    return getLatestDate(dates);
  }, [customOrders, customOrderMessages]);

  const hasNewOrders = useMemo(
    () => isAfter(latestOrderActivityAt, seenState.ordersLastSeenAt),
    [latestOrderActivityAt, seenState.ordersLastSeenAt],
  );

  const hasNewCustomRequests = useMemo(
    () => isAfter(latestCustomActivityAt, seenState.customRequestsLastSeenAt),
    [latestCustomActivityAt, seenState.customRequestsLastSeenAt],
  );

  const markTabAsSeen = (targetTab: AccountTab) => {
    if (!user) return;
    const next: SeenState = { ...seenState };
    if (targetTab === "orders" && latestOrderActivityAt) next.ordersLastSeenAt = latestOrderActivityAt;
    if (targetTab === "custom-requests" && latestCustomActivityAt)
      next.customRequestsLastSeenAt = latestCustomActivityAt;
    setSeenState(next);
    saveSeenState(user.id, next);
  };

  useEffect(() => {
    if (!user) return;
    if (tab === "orders" && latestOrderActivityAt && hasNewOrders) markTabAsSeen("orders");
    if (tab === "custom-requests" && latestCustomActivityAt && hasNewCustomRequests) markTabAsSeen("custom-requests");
  }, [tab, user, latestOrderActivityAt, latestCustomActivityAt, hasNewOrders, hasNewCustomRequests]); // eslint-disable-line react-hooks/exhaustive-deps

  const redeemVoucher = async (voucher: Voucher, pointsCostOverride?: number) => {
    const pointsCost = pointsCostOverride ?? voucher.points_cost;
    if (!user) return;

    if (pointsBalance < pointsCost) {
      toast({ title: "Not enough points", variant: "destructive" });
      return;
    }

    setRedeemingKey(voucher.id);

    const code = `LL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const isGiftCard = voucher.discount_type === "gift_card";

    const { error: pointsError } = await supabase.from("loyalty_points").insert({
      user_id: user.id,
      points: -pointsCost,
      reason: `Redeemed: ${voucher.name}`,
    });

    if (pointsError) {
      setRedeemingKey(null);
      toast({ title: "Error", description: pointsError.message, variant: "destructive" });
      return;
    }

    const { error: voucherError } = await supabase.from("user_vouchers").insert({
      user_id: user.id,
      voucher_id: voucher.id,
      code,
      balance: isGiftCard ? voucher.discount_value : null,
    });

    if (voucherError) {
      setRedeemingKey(null);
      toast({ title: "Error", description: voucherError.message, variant: "destructive" });
      return;
    }

    setRedeemingKey(null);
    toast({ title: "Voucher redeemed", description: `Your code: ${code}` });
    await refetchOverview();
  };

  const sendGiftCard = async (uvId: string) => {
    if (!giftEmail) {
      toast({ title: "Enter recipient email", variant: "destructive" });
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = await supabase.functions.invoke("send-gift-card", {
      body: {
        userVoucherId: uvId,
        recipientEmail: giftEmail,
        recipientName: giftName || null,
        giftMessage: "",
      },
      headers: session?.access_token
        ? {
            Authorization: `Bearer ${session.access_token}`,
          }
        : undefined,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    if (data?.error) {
      toast({ title: "Error", description: data.error, variant: "destructive" });
      return;
    }

    toast({
      title: "Gift card sent",
      description: data?.matchedExistingUser
        ? `Gift card sent to ${giftEmail}. The recipient also has an account notification.`
        : `Gift card sent to ${giftEmail}.`,
    });

    setGiftingVoucherId(null);
    setGiftEmail("");
    setGiftName("");
    setVoucherView("used");
    await refetchOverview();
  };

  const sendCustomOrderReply = async (customOrderId: string) => {
    const message = (replyMessage[customOrderId] || "").trim();
    if (!message || !user) return;

    setSendingReply(true);

    const { error } = await supabase.from("custom_order_messages").insert({
      custom_order_id: customOrderId,
      sender_role: "user",
      sender_user_id: user.id,
      message,
      message_type: "note",
    });

    setSendingReply(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setReplyMessage((prev) => ({ ...prev, [customOrderId]: "" }));
    toast({ title: "Reply sent" });
    await refetchOverview();
  };

  const respondToQuote = async (order: CustomOrder, accepted: boolean) => {
    if (!user) return;

    const newStatus = accepted ? "accepted" : "reviewing";
    const newCustomerResponse = accepted ? "accepted" : "declined";
    const paymentStatus = accepted ? "awaiting_payment" : order.payment_status;

    const { error: updateError } = await supabase
      .from("custom_orders")
      .update({
        status: newStatus,
        customer_response_status: newCustomerResponse,
        final_agreed_price: accepted ? (order.quoted_price ?? order.final_agreed_price) : order.final_agreed_price,
        payment_status: paymentStatus,
      })
      .eq("id", order.id);

    if (updateError) {
      toast({ title: "Error", description: updateError.message, variant: "destructive" });
      return;
    }

    await supabase.from("custom_order_messages").insert({
      custom_order_id: order.id,
      sender_role: "user",
      sender_user_id: user.id,
      message: accepted
        ? `Customer accepted the quoted price of ${(order.quoted_price ?? 0).toFixed(2)} kr.`
        : "Customer declined the current quote.",
      message_type: "status_update",
      proposed_price: accepted ? order.quoted_price : null,
    });

    if (accepted) {
      try {
        setProcessingCustomPaymentOrderId(order.id);
        await payCustomOrder(order.id);
      } catch (paymentError: any) {
        toast({
          title: "Quote accepted, payment not started",
          description: paymentError?.message || "Please click Pay Now to complete payment.",
          variant: "destructive",
        });
        await refetchOverview();
      } finally {
        setProcessingCustomPaymentOrderId(null);
      }
      return;
    }

    toast({
      title: "Quote declined",
      description: "The request has been marked as declined.",
    });

    await refetchOverview();
  };

  const customStatusBadge = (status: string) => (
    <Badge variant="outline" className={`font-display text-xs uppercase ${customStatusBadgeColors[status] || ""}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );

  const hasUnreadActivityForOrder = (order: CustomOrder) => {
    const seenAt = seenState.customRequestsLastSeenAt;
    const latestForOrder = getLatestDate([
      order.created_at,
      order.updated_at,
      ...(customOrderMessages[order.id] || []).map((msg) => msg.created_at),
    ]);
    return isAfter(latestForOrder, seenAt);
  };

  const renderCustomOrdersList = (
    list: (CustomOrder & { parsed: ReturnType<typeof parseCustomOrderDescription> })[],
  ) => {
    if (list.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">No requests in this section.</CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {list.map((order) => {
          const expanded = expandedCustomOrderId === order.id;
          const messages = customOrderMessages[order.id] || [];
          const currentQuote = order.final_agreed_price ?? order.quoted_price ?? null;
          const hasUnreadForThisOrder = hasUnreadActivityForOrder(order);
          const feePaid = order.request_fee_status === "paid";

          return (
            <Card key={order.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-lg font-semibold uppercase text-card-foreground">
                        Custom Request #{order.id.slice(0, 8)}
                      </p>
                      {hasUnreadForThisOrder && <span className="h-2.5 w-2.5 rounded-full bg-destructive" />}
                      {customStatusBadge(order.status)}
                      {!feePaid && (
                        <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600 text-xs uppercase">
                          Fee Unpaid
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Submitted on {new Date(order.created_at).toLocaleString()}
                    </p>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Material:</span> {order.parsed.material}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Color:</span> {order.parsed.color}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Quality:</span> {order.parsed.quality}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Qty:</span> {order.parsed.quantity}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Scale:</span> {order.parsed.scale}
                      </div>
                    </div>

                    {feePaid && (
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Payment: {order.payment_status.replace(/_/g, " ")}</Badge>
                        <Badge variant="outline">Production: {order.production_status.replace(/_/g, " ")}</Badge>
                        {currentQuote !== null && (
                          <Badge variant="outline" className="border-primary text-primary">
                            Quote: {Number(currentQuote).toFixed(2)} kr
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!feePaid ? (
                      <Button
                        onClick={async () => {
                          try {
                            setProcessingCustomPaymentOrderId(order.id);
                            const { data: sessionData } = await supabase.auth.getSession();
                            const token = sessionData.session?.access_token;
                            if (!token) throw new Error("Please sign in again");

                            const { data, error } = await supabase.functions.invoke("create-request-fee-checkout", {
                              body: { orderId: order.id },
                              headers: { Authorization: `Bearer ${token}` },
                            });

                            if (error) throw error;
                            if (data?.alreadyPaid) {
                              toast({ title: "Fee already paid" });
                              await refetchOverview();
                              return;
                            }
                            if (data?.url) window.location.href = data.url;
                          } catch (err: any) {
                            toast({ title: "Error", description: err?.message || "Could not start payment", variant: "destructive" });
                          } finally {
                            setProcessingCustomPaymentOrderId(null);
                          }
                        }}
                        disabled={processingCustomPaymentOrderId === order.id}
                        className="font-display uppercase tracking-wider"
                      >
                        <DollarSign className="mr-1 h-4 w-4" />
                        {processingCustomPaymentOrderId === order.id ? "Redirecting..." : `Pay ${order.request_fee_amount ?? 100} kr Fee`}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setExpandedCustomOrderId(expanded ? null : order.id)}
                        className="font-display uppercase tracking-wider"
                      >
                        {expanded ? "Hide Details" : "View Details"}
                      </Button>
                    )}
                  </div>
                </div>

                {!feePaid && (
                  <div className="mt-4 rounded-md border border-yellow-500/20 bg-yellow-500/5 p-4">
                    <p className="text-sm text-foreground font-medium">Request Fee Required</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      A one-time request fee of {order.request_fee_amount ?? 100} kr is required before your custom order can be reviewed. This fee will be deducted from your final order total.
                    </p>
                  </div>
                )}

                {expanded && feePaid && (
                  <div className="mt-5 space-y-5 border-t border-border pt-5">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Your Original Request</Label>
                        <pre className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-muted p-3 text-sm text-foreground">
                          {order.parsed.customerDescription || "-"}
                        </pre>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-md border border-border bg-muted/40 p-3">
                          <Label className="text-xs text-muted-foreground">Admin Notes</Label>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                            {order.admin_notes || "No admin notes yet."}
                          </p>
                        </div>
                        <div className="rounded-md border border-border bg-muted/40 p-3">
                          <Label className="text-xs text-muted-foreground">Current Negotiation State</Label>
                          <div className="mt-2 space-y-1 text-sm">
                            <p>
                              <span className="text-muted-foreground">Quoted Price:</span>{" "}
                              {order.quoted_price !== null ? `${Number(order.quoted_price).toFixed(2)} kr` : "-"}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Final Agreed:</span>{" "}
                              {order.final_agreed_price !== null
                                ? `${Number(order.final_agreed_price).toFixed(2)} kr`
                                : "-"}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Your Response:</span>{" "}
                              {order.customer_response_status.replace(/_/g, " ")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Conversation History</Label>
                      <div className="mt-2 space-y-3 rounded-md border border-border bg-muted/20 p-3">
                        {messages.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No conversation yet.</p>
                        ) : (
                          messages.map((msg) => {
                            const isUnreadMessage =
                              msg.sender_role === "admin" &&
                              isAfter(msg.created_at, seenState.customRequestsLastSeenAt);
                            return (
                              <div
                                key={msg.id}
                                className={`rounded-md border p-3 text-sm ${
                                  msg.sender_role === "admin"
                                    ? "border-blue-500/20 bg-blue-500/5"
                                    : msg.sender_role === "user"
                                      ? "border-primary/20 bg-primary/5"
                                      : "border-border bg-card"
                                }`}
                              >
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] uppercase">
                                      {msg.sender_role}
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] uppercase">
                                      {msg.message_type.replace(/_/g, " ")}
                                    </Badge>
                                    {isUnreadMessage && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
                                    {msg.proposed_price !== null && (
                                      <Badge
                                        variant="outline"
                                        className="border-primary text-[10px] uppercase text-primary"
                                      >
                                        {Number(msg.proposed_price).toFixed(2)} kr
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(msg.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap text-foreground">{msg.message || "-"}</p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {order.status === "quoted" &&
                      order.quoted_price !== null &&
                      order.customer_response_status !== "accepted" &&
                      order.customer_response_status !== "declined" && (
                        <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <p className="font-display text-sm font-semibold uppercase text-foreground">
                              Quote Action Required
                            </p>
                          </div>
                          <p className="mb-4 text-sm text-muted-foreground">
                            Admin has quoted this request at{" "}
                            <span className="font-semibold text-foreground">
                              {Number(order.quoted_price).toFixed(2)} kr
                            </span>
                            . Please accept or decline the quote.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => respondToQuote(order, true)}
                              disabled={processingCustomPaymentOrderId === order.id}
                              className="font-display uppercase tracking-wider"
                            >
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              {processingCustomPaymentOrderId === order.id ? "Redirecting..." : "Accept Quote"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => respondToQuote(order, false)}
                              className="font-display uppercase tracking-wider"
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Decline Quote
                            </Button>
                          </div>
                        </div>
                      )}

                    <div className="rounded-md border border-border bg-muted/30 p-4">
                      <div className="space-y-3">
                        <Label>Reply to Admin</Label>
                        <Textarea
                          value={replyMessage[order.id] || ""}
                          onChange={(e) => setReplyMessage((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          placeholder="Write a message to admin..."
                          rows={4}
                        />
                        <Button
                          onClick={() => sendCustomOrderReply(order.id)}
                          disabled={sendingReply || !(replyMessage[order.id] || "").trim()}
                          className="font-display uppercase tracking-wider"
                        >
                          <Send className="mr-1 h-4 w-4" />
                          Send Reply
                        </Button>
                      </div>
                    </div>

                    {order.customer_response_status === "accepted" &&
                      order.payment_status === "awaiting_payment" &&
                      order.final_agreed_price !== null && (
                        <div className="rounded-md border border-green-500/20 bg-green-500/5 p-4">
                          <p className="font-display text-sm font-semibold uppercase text-foreground">
                            Payment Pending
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Final agreed amount:{" "}
                            <span className="font-semibold text-foreground">
                              {Number(order.final_agreed_price).toFixed(2)} kr
                            </span>
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            The 100 kr custom request fee should be deducted from the final order total at checkout.
                          </p>
                          <Button
                            onClick={async () => {
                              try {
                                setProcessingCustomPaymentOrderId(order.id);
                                await payCustomOrder(order.id);
                              } catch (paymentError: any) {
                                toast({
                                  title: "Payment error",
                                  description: paymentError?.message || "Could not open checkout.",
                                  variant: "destructive",
                                });
                              } finally {
                                setProcessingCustomPaymentOrderId(null);
                              }
                            }}
                            disabled={processingCustomPaymentOrderId === order.id}
                            className="mt-3 font-display uppercase tracking-wider"
                          >
                            {processingCustomPaymentOrderId === order.id ? "Redirecting..." : "Pay Now"}
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

  if (loading || !user) return null;

  if (overviewLoading && !overview) {
    return (
      <div className="py-8">
        <div className="container max-w-5xl">
          <AccountOverviewSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase text-foreground">My Account</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          <div className="flex gap-2">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="font-display uppercase tracking-wider">
                  <Shield className="mr-1 h-4 w-4" /> Admin
                </Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={signOut} className="font-display uppercase tracking-wider">
              <LogOut className="mr-1 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Star className="h-7 w-7 text-primary" />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Loyalty Points Balance</p>
                  <p className="font-display text-3xl font-bold text-primary">{pointsBalance}</p>
                  <p className="text-xs text-muted-foreground">1 point is earned for every 4 kr spent</p>
                </div>

                <div className="ml-auto grid min-w-[220px] gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-primary/20 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">Earned total</p>
                    <p className="font-display text-xl font-bold text-foreground">{pointsEarned}</p>
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">Spent total</p>
                    <p className="font-display text-xl font-bold text-foreground">{pointsSpent}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowHistory((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3 text-left transition hover:bg-background"
                >
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Recent points activity</p>
                      <p className="text-xs text-muted-foreground">
                        Press to show redeemed discounts and earned points
                      </p>
                    </div>
                  </div>
                  {showHistory ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {showHistory && (
                  <div className="mt-3 space-y-2">
                    {loyaltyHistory.length === 0 ? (
                      <div className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                        No loyalty activity yet.
                      </div>
                    ) : (
                      loyaltyHistory.slice(0, 8).map((row) => (
                        <div
                          key={row.id}
                          className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-foreground">{row.reason || "Points update"}</p>
                            <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
                          </div>
                          <div
                            className={`font-display text-sm font-bold ${row.points >= 0 ? "text-green-600" : "text-destructive"}`}
                          >
                            {row.points >= 0 ? `+${row.points}` : row.points}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { key: "orders" as const, label: "Orders", icon: Package, hasDot: hasNewOrders },
            {
              key: "custom-requests" as const,
              label: "Custom Requests",
              icon: MessageSquare,
              hasDot: hasNewCustomRequests,
            },
            { key: "rewards" as const, label: "Rewards Store", icon: Gift, hasDot: false },
            { key: "vouchers" as const, label: "My Vouchers", icon: Star, hasDot: false },
          ].map(({ key, label, icon: Icon, hasDot }) => (
            <Button
              key={key}
              variant={tab === key ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(key)}
              className="relative font-display uppercase tracking-wider"
            >
              <Icon className="mr-1 h-4 w-4" />
              {label}
              {hasDot && <span className="ml-2 h-2.5 w-2.5 rounded-full bg-red-500" />}
            </Button>
          ))}
        </div>

        {tab === "orders" && (
          <>
            {orders.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No orders yet.{" "}
                  <Link to="/products" className="text-primary hover:underline">
                    Start shopping!
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const isNewOrder = isAfter(order.created_at, seenState.ordersLastSeenAt);
                  return (
                    <Card key={order.id} className="transition-all hover:border-primary hover:shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <Link to={`/orders/${order.id}`} className="flex flex-1 items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-display text-sm font-semibold uppercase text-card-foreground">
                                    Order #{order.id.slice(0, 8)}
                                  </p>
                                  {isNewOrder && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(order.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-display text-lg font-bold text-primary">
                                  {Number(order.total).toFixed(2)} kr
                                </p>
                                <p
                                  className={`font-display text-xs uppercase ${statusColors[order.status] || "text-muted-foreground"}`}
                                >
                                  {order.status}
                                </p>
                              </div>
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </Link>
                        </div>

                        {order.status === "delivered" &&
                          (order.tool_type === "custom-print" || order.tool_type === "lithophane") && (
                            <div className="mt-4 border-t border-border pt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReviewingOrderId(reviewingOrderId === order.id ? null : order.id)}
                                className="font-display uppercase tracking-wider"
                              >
                                {reviewingOrderId === order.id ? "Close Review" : "Leave Review"}
                              </Button>
                              {reviewingOrderId === order.id && (
                                <ToolReviewForm
                                  toolType={order.tool_type}
                                  orderId={order.id}
                                  onSubmitted={() => setReviewingOrderId(null)}
                                />
                              )}
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "custom-requests" && (
          <div className="space-y-4">
            {parsedCustomOrders.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No custom requests yet.{" "}
                  <Link to="/create" className="text-primary hover:underline">
                    Submit your first custom 3D print request.
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={customRequestsView === "ongoing" ? "default" : "outline"}
                    onClick={() => setCustomRequestsView("ongoing")}
                    className="font-display uppercase tracking-wider"
                  >
                    Ongoing ({ongoingCustomOrders.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={customRequestsView === "done" ? "default" : "outline"}
                    onClick={() => setCustomRequestsView("done")}
                    className="font-display uppercase tracking-wider"
                  >
                    Done ({doneCustomOrders.length})
                  </Button>
                </div>

                {customRequestsView === "ongoing"
                  ? renderCustomOrdersList(ongoingCustomOrders)
                  : renderCustomOrdersList(doneCustomOrders)}
              </>
            )}
          </div>
        )}

        {tab === "rewards" && (
          <>
            {overviewLoading && !overview ? <RewardsGridSkeleton count={4} /> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {REWARD_CATALOG.map((reward) => {
              const matchedVoucher = findMatchingVoucher(reward, vouchers);
              const canRedeem = !!matchedVoucher && pointsBalance >= reward.pointsCost;

              return (
                <motion.div
                  key={reward.key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="font-display text-lg uppercase">{reward.name}</CardTitle>
                        {reward.badge && (
                          <Badge variant="outline" className="font-display text-xs">
                            {reward.badge === "Shipping" ? <Truck className="mr-1 h-3 w-3" /> : null}
                            {reward.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          {reward.discountType === "free_shipping" ? (
                            <>
                              <span className="font-display text-2xl font-bold text-primary">Free delivery</span>
                              <span className="ml-1 text-sm text-muted-foreground">discount</span>
                            </>
                          ) : (
                            <>
                              <span className="font-display text-2xl font-bold text-primary">
                                {reward.discountValue} kr
                              </span>
                              <span className="ml-1 text-sm text-muted-foreground">
                                {reward.discountType === "gift_card" ? "gift card" : "discount"}
                              </span>
                            </>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => matchedVoucher && redeemVoucher(matchedVoucher, reward.pointsCost)}
                          disabled={!canRedeem || redeemingKey === matchedVoucher?.id}
                          className="font-display uppercase tracking-wider"
                        >
                          <Star className="mr-1 h-3 w-3" />
                          {redeemingKey === matchedVoucher?.id ? "Redeeming..." : `${reward.pointsCost} pts`}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
              })}
            </div>
          </>
        )}

        {tab === "vouchers" && (
          <div className="space-y-4">
            {overviewLoading && !overview ? <SectionCardSkeleton lines={4} /> : null}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={voucherView === "active" ? "default" : "outline"}
                onClick={() => setVoucherView("active")}
                className="font-display uppercase tracking-wider"
              >
                Active ({activeVouchers.length})
              </Button>
              <Button
                size="sm"
                variant={voucherView === "used" ? "default" : "outline"}
                onClick={() => setVoucherView("used")}
                className="font-display uppercase tracking-wider"
              >
                Used ({usedVouchers.length})
              </Button>
            </div>

            {(voucherView === "active" ? activeVoucherGroups : usedVoucherGroups).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {voucherView === "active" ? "No active vouchers available." : "No used vouchers yet."}
                </CardContent>
              </Card>
            ) : (
              (voucherView === "active" ? activeVoucherGroups : usedVoucherGroups).map((group) => {
                const isGiftCard = group.type === "gift_card";
                const giftCardBalance = group.items.reduce((sum, item) => sum + Number(item.balance ?? 0), 0);
                const isExpanded = expandedVoucherGroupKey === group.key;

                return (
                  <Card key={group.key} className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedVoucherGroupKey(isExpanded ? null : group.key)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/20"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-sm font-semibold uppercase text-card-foreground">
                            {group.label}
                            <span className="ml-2 text-xs text-muted-foreground">(x{group.items.length})</span>
                          </p>
                          {isGiftCard ? <Badge variant="outline" className="text-xs">Gift Card</Badge> : null}
                        </div>
                        {isGiftCard ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Balance: <span className="font-bold text-foreground">{giftCardBalance.toFixed(2)} kr</span>
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={voucherView === "active" ? "default" : "secondary"}>
                          {voucherView === "active" ? "Active" : "Used"}
                        </Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded ? (
                      <CardContent className="space-y-3 border-t border-border bg-background/40 p-4">
                        {group.items.map((uv) => {
                          const recipientEmail = (uv.recipient_email || "").trim().toLowerCase();
                          const isReceived = recipientEmail !== "" && recipientEmail === (user?.email || "").trim().toLowerCase();
                          const isGifted = !!uv.recipient_email && !isReceived;
                          const isUsed = uv.is_used || !!uv.used_at || (uv.balance !== null && Number(uv.balance) <= 0);

                          return (
                            <div key={uv.id} className="rounded-2xl border border-border/70 bg-card/80 p-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-1">
                                  <p className="font-mono text-lg font-bold text-primary">{uv.code}</p>
                                  {uv.balance !== null ? (
                                    <p className="text-sm text-muted-foreground">
                                      Balance: <span className="font-bold text-foreground">{Number(uv.balance).toFixed(2)} kr</span>
                                    </p>
                                  ) : null}
                                  {isGifted && uv.recipient_email ? (
                                    <p className="text-xs text-muted-foreground">
                                      Sent to: {uv.recipient_name ? `${uv.recipient_name} ` : ""}({uv.recipient_email})
                                    </p>
                                  ) : null}
                                  {isReceived ? <p className="text-xs text-muted-foreground">Received gift card</p> : null}
                                  <p className="text-xs text-muted-foreground">Redeemed: {new Date(uv.redeemed_at).toLocaleString()}</p>
                                  {uv.used_at ? <p className="text-xs text-muted-foreground">Used: {new Date(uv.used_at).toLocaleString()}</p> : null}
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  {voucherView === "active" &&
                                    uv.vouchers?.discount_type === "gift_card" &&
                                    !uv.recipient_email &&
                                    uv.user_id === user?.id &&
                                    !uv.is_used ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setGiftingVoucherId(giftingVoucherId === uv.id ? null : uv.id)}
                                        className="font-display text-xs uppercase tracking-wider"
                                      >
                                        <Send className="mr-1 h-3 w-3" /> Gift
                                      </Button>
                                    ) : null}

                                  {isUsed ? (
                                    <Badge variant="secondary">Used</Badge>
                                  ) : isGifted ? (
                                    <Badge variant="secondary">Gifted</Badge>
                                  ) : isReceived ? (
                                    <Badge variant="secondary">Received</Badge>
                                  ) : (
                                    <Badge variant="default">Active</Badge>
                                  )}
                                </div>
                              </div>

                              {voucherView === "active" && giftingVoucherId === uv.id ? (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  className="mt-4 space-y-3 border-t border-border pt-4"
                                >
                                  <input
                                    placeholder="Recipient email"
                                    value={giftEmail}
                                    onChange={(e) => setGiftEmail(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                  />
                                  <input
                                    placeholder="Recipient name (optional)"
                                    value={giftName}
                                    onChange={(e) => setGiftName(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => sendGiftCard(uv.id)}
                                    className="font-display uppercase tracking-wider"
                                  >
                                    <Send className="mr-1 h-3 w-3" /> Send Gift Card
                                  </Button>
                                </motion.div>
                              ) : null}
                            </div>
                          );
                        })}
                      </CardContent>
                    ) : null}
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
