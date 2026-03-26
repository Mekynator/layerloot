import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AccountOverviewData = {
  loyaltyHistory: { id: string; points: number; reason: string | null; created_at: string }[];
  orders: { id: string; status: string; total: number; created_at: string; tool_type?: "custom-print" | "lithophane" | null }[];
  customOrders: any[];
  customOrderMessages: Record<string, any[]>;
  vouchers: any[];
  userVouchers: any[];
  pointsBalance: number;
  pointsEarned: number;
  pointsSpent: number;
};

function summarizeLoyalty(rows: { points: number }[]) {
  const balance = rows.reduce((sum, row) => sum + Number(row.points ?? 0), 0);
  const earned = rows.filter((row) => Number(row.points ?? 0) > 0).reduce((sum, row) => sum + Number(row.points ?? 0), 0);
  const spent = Math.abs(rows.filter((row) => Number(row.points ?? 0) < 0).reduce((sum, row) => sum + Number(row.points ?? 0), 0));
  return { balance, earned, spent };
}

function mergeUserVouchers(owned: any[], received: any[], userId: string, userEmail?: string) {
  const normalizedEmail = (userEmail || "").trim().toLowerCase();
  const merged = [...owned, ...received].filter(Boolean);
  const unique = new Map<string, any>();

  merged.forEach((voucher) => {
    const recipientEmail = (voucher.recipient_email || "").trim().toLowerCase();
    const isGiftCard = voucher.vouchers?.discount_type === "gift_card";
    const giftedAway = isGiftCard && voucher.user_id === userId && recipientEmail && recipientEmail !== normalizedEmail;
    if (!giftedAway) unique.set(voucher.id, voucher);
  });

  return Array.from(unique.values()).sort(
    (a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime(),
  );
}

function mergeCustomOrders(owned: any[], emailMatched: any[]) {
  const unique = new Map<string, any>();

  [...owned, ...emailMatched].filter(Boolean).forEach((order) => {
    unique.set(order.id, order);
  });

  return Array.from(unique.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function mapMessages(rows: any[]) {
  return rows.reduce((acc: Record<string, any[]>, message: any) => {
    if (!acc[message.custom_order_id]) acc[message.custom_order_id] = [];
    acc[message.custom_order_id].push(message);
    return acc;
  }, {});
}

async function fetchCustomOrders(userId: string, userEmail?: string) {
  const normalizedEmail = (userEmail || "").trim();

  const [ownedCustomOrdersRes, emailCustomOrdersRes] = await Promise.all([
    (supabase.from("custom_orders") as any)
      .select("id, name, email, description, model_url, model_filename, status, admin_notes, created_at, updated_at, user_id, quoted_price, final_agreed_price, customer_response_status, payment_status, production_status")
      .eq("user_id", userId)
      .eq("request_fee_status", "paid")
      .order("created_at", { ascending: false }),
    normalizedEmail
      ? supabase
          .from("custom_orders")
          .select("id, name, email, description, model_url, model_filename, status, admin_notes, created_at, updated_at, user_id, quoted_price, final_agreed_price, customer_response_status, payment_status, production_status")
          .ilike("email", normalizedEmail)
          .eq("request_fee_status", "paid")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (ownedCustomOrdersRes.error) throw ownedCustomOrdersRes.error;
  if (emailCustomOrdersRes.error) throw emailCustomOrdersRes.error;

  const customOrders = mergeCustomOrders(ownedCustomOrdersRes.data ?? [], emailCustomOrdersRes.data ?? []);

  if (customOrders.length === 0) {
    return { customOrders: [], customOrderMessages: {} };
  }

  const { data: messageRows, error: messageError } = await supabase
    .from("custom_order_messages")
    .select("*")
    .in("custom_order_id", customOrders.map((order: any) => order.id))
    .order("created_at", { ascending: true });

  if (messageError) {
    console.warn("Could not load custom order messages", messageError.message);
    return {
      customOrders,
      customOrderMessages: {},
    };
  }

  return {
    customOrders,
    customOrderMessages: mapMessages(messageRows ?? []),
  };
}

async function fetchAccountOverview(userId: string, userEmail?: string): Promise<AccountOverviewData> {
  const voucherSelect = "id, user_id, voucher_id, code, is_used, balance, redeemed_at, recipient_email, recipient_name, used_at, vouchers(name, discount_value, discount_type)";

  const [loyaltyRes, ordersRes, customOrdersData, vouchersRes, ownedVouchersRes, receivedVouchersRes] = await Promise.all([
    supabase.from("loyalty_points").select("id, points, reason, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("orders").select("id, status, total, created_at, tool_type").eq("user_id", userId).order("created_at", { ascending: false }),
    fetchCustomOrders(userId, userEmail),
    supabase.from("vouchers").select("*").eq("is_active", true).order("points_cost", { ascending: true }),
    supabase.from("user_vouchers").select(voucherSelect).eq("user_id", userId).order("redeemed_at", { ascending: false }),
    userEmail
      ? supabase.from("user_vouchers").select(voucherSelect).ilike("recipient_email", userEmail).neq("user_id", userId).order("redeemed_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (loyaltyRes.error) throw loyaltyRes.error;
  if (ordersRes.error) throw ordersRes.error;
  if (vouchersRes.error) throw vouchersRes.error;
  if (ownedVouchersRes.error) throw ownedVouchersRes.error;
  if (receivedVouchersRes.error) throw receivedVouchersRes.error;

  const loyaltyHistory = (loyaltyRes.data ?? []) as AccountOverviewData["loyaltyHistory"];
  const summary = summarizeLoyalty(loyaltyHistory);

  return {
    loyaltyHistory,
    orders: (ordersRes.data ?? []) as AccountOverviewData["orders"],
    customOrders: customOrdersData.customOrders,
    customOrderMessages: customOrdersData.customOrderMessages,
    vouchers: vouchersRes.data ?? [],
    userVouchers: mergeUserVouchers(ownedVouchersRes.data ?? [], receivedVouchersRes.data ?? [], userId, userEmail),
    pointsBalance: summary.balance,
    pointsEarned: summary.earned,
    pointsSpent: summary.spent,
  };
}

export function useAccountOverview(userId?: string, userEmail?: string) {
  return useQuery({
    queryKey: ["account-overview", userId, userEmail ?? ""],
    queryFn: () => fetchAccountOverview(userId as string, userEmail),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  });
}
