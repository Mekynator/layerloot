import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";

export type CartDiscountCode = {
  code: string;
  label: string;
  type: "percent" | "fixed";
  value: number;
  /** Original/full value (useful for partially-used gift cards) */
  originalValue?: number;
  category: "voucher" | "gift_card" | "free_shipping" | "discount";
  userVoucherId?: string;
  voucherType?: string;
  expiresAt?: string | null;
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

function mapVoucherCategory(discountType: string): CartDiscountCode["category"] {
  if (discountType === "gift_card") return "gift_card";
  if (discountType === "free_shipping") return "free_shipping";
  return "voucher";
}

async function fetchCartAccountData(userId: string, userEmail?: string) {
  const voucherSelect = "id, user_id, code, balance, is_used, recipient_email, expires_at, vouchers(name, discount_type, discount_value)";

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

  const nowMs = Date.now();
  const availableDiscountCodes: CartDiscountCode[] = rows
    .filter((row) => {
      // Filter out expired vouchers
      if (row.expires_at && new Date(row.expires_at).getTime() < nowMs) return false;
      if (row.vouchers?.discount_type === "gift_card") {
        return Number(row.balance ?? 0) > 0;
      }
      return true;
    })
    .map((row) => {
      const voucher = row.vouchers;
      const discountType = voucher?.discount_type || "fixed";
      const category = mapVoucherCategory(discountType);
      const originalValue = Number(voucher?.discount_value ?? 0);

      const labelValue =
        discountType === "free_shipping"
          ? "Free delivery"
          : discountType === "gift_card"
            ? `${formatPrice(Number(row.balance ?? originalValue))} gift card`
            : discountType === "percent_discount"
              ? `${originalValue}% off`
              : `${formatPrice(originalValue)} off`;

      return {
        code: row.code,
        label: `${row.code} - ${labelValue}`,
        type: discountType === "percent_discount" ? "percent" : "fixed",
        value:
          discountType === "gift_card"
            ? Number(row.balance ?? originalValue)
            : discountType === "free_shipping"
              ? 0
              : originalValue,
        originalValue: discountType === "gift_card" ? originalValue : undefined,
        category,
        userVoucherId: row.id,
        voucherType: discountType,
        expiresAt: row.expires_at ?? null,
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
