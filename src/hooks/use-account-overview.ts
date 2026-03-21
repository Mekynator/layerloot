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

async function fetchAccountOverview(userId: string, userEmail?: string): Promise<AccountOverviewData> {
  const voucherSelect = "id, user_id, voucher_id, code, is_used, balance, redeemed_at, recipient_email, recipient_name, used_at, vouchers(name, discount_value, discount_type)";

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const [loyaltyRes, ordersRes, customOrdersRes, vouchersRes, ownedVouchersRes, receivedVouchersRes] = await Promise.all([
    supabase.from("loyalty_points").select("id, points, reason, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("orders").select("id, status, total, created_at, tool_type").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.functions.invoke("get-account-custom-orders", {
      headers: session?.access_token
        ? {
            Authorization: `Bearer ${session.access_token}`,
          }
        : undefined,
    }),
    supabase.from("vouchers").select("*").eq("is_active", true).order("points_cost", { ascending: true }),
    supabase.from("user_vouchers").select(voucherSelect).eq("user_id", userId).order("redeemed_at", { ascending: false }),
    userEmail
      ? supabase.from("user_vouchers").select(voucherSelect).ilike("recipient_email", userEmail).neq("user_id", userId).order("redeemed_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (loyaltyRes.error) throw loyaltyRes.error;
  if (ordersRes.error) throw ordersRes.error;
  if (customOrdersRes.error) throw customOrdersRes.error;
  if (vouchersRes.error) throw vouchersRes.error;
  if (ownedVouchersRes.error) throw ownedVouchersRes.error;
  if (receivedVouchersRes.error) throw receivedVouchersRes.error;

  const customOrders = customOrdersRes.data?.orders ?? [];
  const customOrderMessages = (customOrdersRes.data?.messages ?? []).reduce((acc: Record<string, any[]>, message: any) => {
    if (!acc[message.custom_order_id]) acc[message.custom_order_id] = [];
    acc[message.custom_order_id].push(message);
    return acc;
  }, {});

  const loyaltyHistory = (loyaltyRes.data ?? []) as AccountOverviewData["loyaltyHistory"];
  const summary = summarizeLoyalty(loyaltyHistory);

  return {
    loyaltyHistory,
    orders: (ordersRes.data ?? []) as AccountOverviewData["orders"],
    customOrders,
    customOrderMessages,
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
