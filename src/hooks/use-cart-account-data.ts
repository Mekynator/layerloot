import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CartDiscountCode = {
  code: string;
  label: string;
  type: "percent" | "fixed";
  value: number;
};

async function fetchCartAccountData(userId: string) {
  const [loyaltyRes, vouchersRes] = await Promise.all([
    supabase.from("loyalty_points").select("points").eq("user_id", userId),
    supabase
      .from("user_vouchers")
      .select("id, code, balance, is_used, vouchers(name, discount_type, discount_value)")
      .eq("user_id", userId)
      .eq("is_used", false)
      .order("redeemed_at", { ascending: false }),
  ]);

  if (loyaltyRes.error) throw loyaltyRes.error;
  if (vouchersRes.error) throw vouchersRes.error;

  const pointsBalance = ((loyaltyRes.data ?? []) as { points: number }[]).reduce((sum, row) => sum + Number(row.points ?? 0), 0);

  const availableDiscountCodes: CartDiscountCode[] = ((vouchersRes.data ?? []) as any[])
    .filter((row) => {
      if (row.vouchers?.discount_type === "gift_card") {
        return Number(row.balance ?? 0) > 0;
      }
      return true;
    })
    .map((row) => {
      const voucher = row.vouchers;
      const labelValue =
        voucher?.discount_type === "free_shipping"
          ? "Free delivery"
          : voucher?.discount_type === "gift_card"
            ? `${Number(row.balance ?? voucher?.discount_value ?? 0).toFixed(2)} kr gift card`
            : `${Number(voucher?.discount_value ?? 0).toFixed(2)} kr off`;

      return {
        code: row.code,
        label: `${row.code} - ${labelValue}`,
        type: voucher?.discount_type === "percent_discount" ? "percent" : "fixed",
        value:
          voucher?.discount_type === "gift_card"
            ? Number(row.balance ?? voucher?.discount_value ?? 0)
            : voucher?.discount_type === "free_shipping"
              ? 5.99
              : Number(voucher?.discount_value ?? 0),
      } as CartDiscountCode;
    });

  return { pointsBalance, availableDiscountCodes };
}

export function useCartAccountData(userId?: string) {
  return useQuery({
    queryKey: ["cart-account-data", userId],
    queryFn: () => fetchCartAccountData(userId as string),
    enabled: Boolean(userId),
    staleTime: 1000 * 60,
  });
}
