import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CartDiscountCode = {
  code: string;
  label: string;
  type: "percent" | "fixed";
  value: number;
};

function mergeAvailableVouchers(owned: any[], received: any[], userId: string, userEmail?: string) {
  const normalizedEmail = (userEmail || "").trim().toLowerCase();
  const unique = new Map<string, any>();

  [...owned, ...received].forEach((row) => {
    const recipientEmail = (row.recipient_email || "").trim().toLowerCase();
    const isGiftCard = row.vouchers?.discount_type === "gift_card";
    const giftedAway = isGiftCard && row.user_id === userId && recipientEmail && recipientEmail !== normalizedEmail;
    if (!giftedAway) unique.set(row.id, row);
  });

  return Array.from(unique.values());
}

async function fetchCartAccountData(userId: string, userEmail?: string) {
  const voucherSelect = "id, user_id, code, balance, is_used, recipient_email, vouchers(name, discount_type, discount_value)";

  const [loyaltyRes, ownedVouchersRes, receivedVouchersRes] = await Promise.all([
    supabase.from("loyalty_points").select("points").eq("user_id", userId),
    supabase
      .from("user_vouchers")
      .select(voucherSelect)
      .eq("user_id", userId)
      .eq("is_used", false)
      .order("redeemed_at", { ascending: false }),
    userEmail
      ? supabase
          .from("user_vouchers")
          .select(voucherSelect)
          .ilike("recipient_email", userEmail)
          .neq("user_id", userId)
          .eq("is_used", false)
          .order("redeemed_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (loyaltyRes.error) throw loyaltyRes.error;
  if (ownedVouchersRes.error) throw ownedVouchersRes.error;
  if (receivedVouchersRes.error) throw receivedVouchersRes.error;

  const pointsBalance = ((loyaltyRes.data ?? []) as { points: number }[]).reduce((sum, row) => sum + Number(row.points ?? 0), 0);
  const rows = mergeAvailableVouchers(ownedVouchersRes.data ?? [], receivedVouchersRes.data ?? [], userId, userEmail);

  const availableDiscountCodes: CartDiscountCode[] = rows
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

export function useCartAccountData(userId?: string, userEmail?: string) {
  return useQuery({
    queryKey: ["cart-account-data", userId, userEmail ?? ""],
    queryFn: () => fetchCartAccountData(userId as string, userEmail),
    enabled: Boolean(userId),
    staleTime: 1000 * 60,
  });
}
