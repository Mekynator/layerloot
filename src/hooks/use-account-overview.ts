import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AccountOverviewData = {
  loyaltyHistory: { id: string; points: number; reason: string | null; created_at: string }[];
  orders: { id: string; status: string; total: number; created_at: string; tool_type?: "custom-print" | "lithophane" | null }[];
  customOrders: any[];
  customOrderMessages: Record<string, any[]>;
  vouchers: any[];
  userVouchers: any[];
  invoices: { id: string; order_id: string; invoice_number: string; invoice_date: string; pdf_path: string | null; order_total?: number; order_status?: string }[];
  pointsBalance: number;
  pointsEarned: number;
  pointsSpent: number;
  profileName: string | null;
};

function summarizeLoyalty(rows: { points: number }[]) {
  const balance = rows.reduce((sum, row) => sum + Number(row.points ?? 0), 0);
  const earned = rows.filter((row) => Number(row.points ?? 0) > 0).reduce((sum, row) => sum + Number(row.points ?? 0), 0);
  const spent = Math.abs(rows.filter((row) => Number(row.points ?? 0) < 0).reduce((sum, row) => sum + Number(row.points ?? 0), 0));
  return { balance, earned, spent };
}


async function fetchAccountOverview(userId: string): Promise<AccountOverviewData> {
  const voucherSelect = "id, user_id, voucher_id, code, is_used, balance, redeemed_at, recipient_email, recipient_name, recipient_user_id, sender_user_id, sender_name, sender_email, gift_message, gifted_at, claimed_at, gift_status, used_at, vouchers(name, discount_value, discount_type)";

  const [loyaltyRes, ordersRes, customOrdersRes, vouchersRes, userVouchersRes, invoicesRes, profileRes] = await Promise.all([
    supabase.from("loyalty_points").select("id, points, reason, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("orders").select("id, status, total, created_at, tool_type").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("custom_orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("vouchers").select("*").eq("is_active", true).order("points_cost", { ascending: true }),
    supabase.from("user_vouchers").select(voucherSelect).eq("user_id", userId).order("redeemed_at", { ascending: false }),
    supabase.from("invoices").select("id, order_id, invoice_number, invoice_date, pdf_path").order("invoice_date", { ascending: false }),
    supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
  ]);

  if (loyaltyRes.error) throw loyaltyRes.error;
  if (ordersRes.error) throw ordersRes.error;
  if (customOrdersRes.error) throw customOrdersRes.error;
  if (vouchersRes.error) throw vouchersRes.error;
  if (userVouchersRes.error) throw userVouchersRes.error;
  if (invoicesRes.error) throw invoicesRes.error;

  const customOrders = customOrdersRes.data ?? [];
  let customOrderMessages: Record<string, any[]> = {};

  if (customOrders.length > 0) {
    const ids = customOrders.map((order: any) => order.id);
    const { data: messageRows, error: messageError } = await (supabase
      .from("custom_order_messages")
      .select("*")
      .in("custom_order_id", ids)
      .order("created_at", { ascending: true }) as unknown as Promise<{ data: any[] | null; error: any }>);

    if (messageError) throw messageError;

    customOrderMessages = (messageRows ?? []).reduce((acc: Record<string, any[]>, message: any) => {
      if (!acc[message.custom_order_id]) acc[message.custom_order_id] = [];
      acc[message.custom_order_id].push(message);
      return acc;
    }, {});
  }

  const loyaltyHistory = (loyaltyRes.data ?? []) as AccountOverviewData["loyaltyHistory"];
  const summary = summarizeLoyalty(loyaltyHistory);
  const ordersData = (ordersRes.data ?? []) as AccountOverviewData["orders"];

  // Enrich invoices with order total/status
  const orderMap = new Map(ordersData.map(o => [o.id, o]));
  const invoices = (invoicesRes.data ?? []).map((inv: any) => {
    const order = orderMap.get(inv.order_id);
    return {
      ...inv,
      order_total: order?.total ?? null,
      order_status: order?.status ?? null,
    };
  });

  return {
    loyaltyHistory,
    orders: ordersData,
    customOrders,
    customOrderMessages,
    vouchers: vouchersRes.data ?? [],
    userVouchers: (userVouchersRes.data ?? []).sort(
      (a: any, b: any) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime(),
    ),
    invoices,
    pointsBalance: summary.balance,
    pointsEarned: summary.earned,
    pointsSpent: summary.spent,
    profileName: profileRes.data?.full_name ?? null,
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
