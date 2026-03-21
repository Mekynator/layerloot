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

async function fetchAccountOverview(userId: string): Promise<AccountOverviewData> {
  const [loyaltyRes, ordersRes, customOrdersRes, vouchersRes, userVouchersRes] = await Promise.all([
    supabase.from("loyalty_points").select("id, points, reason, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("orders").select("id, status, total, created_at, tool_type").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("custom_orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("vouchers").select("*").eq("is_active", true).order("points_cost", { ascending: true }),
    supabase.from("user_vouchers").select("id, code, is_used, balance, redeemed_at, recipient_email, recipient_name, used_at, vouchers(name, discount_value, discount_type)").eq("user_id", userId).order("redeemed_at", { ascending: false }),
  ]);

  if (loyaltyRes.error) throw loyaltyRes.error;
  if (ordersRes.error) throw ordersRes.error;
  if (customOrdersRes.error) throw customOrdersRes.error;
  if (vouchersRes.error) throw vouchersRes.error;
  if (userVouchersRes.error) throw userVouchersRes.error;

  const customOrders = customOrdersRes.data ?? [];
  let customOrderMessages: Record<string, any[]> = {};

  if (customOrders.length > 0) {
    const ids = customOrders.map((order: any) => order.id);
    const { data: messageRows, error: messageError } = await supabase
      .from("custom_order_messages")
      .select("*")
      .in("custom_order_id", ids)
      .order("created_at", { ascending: true });

    if (messageError) throw messageError;

    customOrderMessages = (messageRows ?? []).reduce((acc: Record<string, any[]>, message: any) => {
      if (!acc[message.custom_order_id]) acc[message.custom_order_id] = [];
      acc[message.custom_order_id].push(message);
      return acc;
    }, {});
  }

  const loyaltyHistory = (loyaltyRes.data ?? []) as AccountOverviewData["loyaltyHistory"];
  const summary = summarizeLoyalty(loyaltyHistory);

  return {
    loyaltyHistory,
    orders: (ordersRes.data ?? []) as AccountOverviewData["orders"],
    customOrders,
    customOrderMessages,
    vouchers: vouchersRes.data ?? [],
    userVouchers: userVouchersRes.data ?? [],
    pointsBalance: summary.balance,
    pointsEarned: summary.earned,
    pointsSpent: summary.spent,
  };
}

export function useAccountOverview(userId?: string) {
  return useQuery({
    queryKey: ["account-overview", userId],
    queryFn: () => fetchAccountOverview(userId as string),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  });
}
