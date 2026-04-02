import { useState, useMemo, useCallback } from "react";
import type { CartDiscountCode } from "@/hooks/use-cart-account-data";

export type AppliedSaving = {
  code: string;
  label: string;
  category: "discount" | "voucher" | "gift_card" | "free_shipping";
  type: "percent" | "fixed";
  value: number;
  /** For gift cards: the amount actually being applied (may be less than value) */
  appliedAmount: number;
  /** The user_voucher row id if applicable */
  userVoucherId?: string;
  voucherType?: string;
};

export type SavingsSummary = {
  discountAmount: number;
  shippingDiscount: number;
  giftCardDeduction: number;
  totalSavings: number;
};

// Phase 1 stacking rules (hardcoded, will be admin-configurable in Phase 2)
const STACKING = {
  maxDiscountOrVoucher: 1, // 1 discount code OR 1 redeemed voucher
  allowGiftCard: true,     // gift card can stack with above
  allowFreeShipping: true, // free shipping can stack with everything
};

export function useCheckoutSavings(
  subtotal: number,
  shippingCost: number,
  available: CartDiscountCode[],
) {
  const [applied, setApplied] = useState<AppliedSaving[]>([]);
  const [giftCardSliderValue, setGiftCardSliderValue] = useState<number | null>(null);

  const categorized = useMemo(() => {
    const vouchers: CartDiscountCode[] = [];
    const giftCards: CartDiscountCode[] = [];
    const freeShipping: CartDiscountCode[] = [];
    const discounts: CartDiscountCode[] = [];

    available.forEach((d) => {
      if (d.category === "gift_card") giftCards.push(d);
      else if (d.category === "free_shipping") freeShipping.push(d);
      else vouchers.push(d);
    });

    return { vouchers, giftCards, freeShipping, discounts };
  }, [available]);

  const hasDiscountOrVoucher = applied.some(
    (a) => a.category === "discount" || a.category === "voucher",
  );
  const hasGiftCard = applied.some((a) => a.category === "gift_card");
  const hasFreeShipping = applied.some((a) => a.category === "free_shipping");

  const canApply = useCallback(
    (item: CartDiscountCode): { allowed: boolean; reason?: string } => {
      const cat = item.category ?? "voucher";

      if (applied.some((a) => a.code === item.code)) {
        return { allowed: false, reason: "Already applied" };
      }

      if ((cat === "discount" || cat === "voucher") && hasDiscountOrVoucher) {
        return { allowed: false, reason: "Only one discount or voucher at a time" };
      }
      if (cat === "gift_card" && hasGiftCard) {
        return { allowed: false, reason: "Only one gift card at a time" };
      }
      if (cat === "free_shipping" && hasFreeShipping) {
        return { allowed: false, reason: "Free shipping already applied" };
      }
      if (cat === "free_shipping" && shippingCost <= 0) {
        return { allowed: false, reason: "Shipping is already free" };
      }

      return { allowed: true };
    },
    [applied, hasDiscountOrVoucher, hasGiftCard, hasFreeShipping, shippingCost],
  );

  const applySaving = useCallback(
    (item: CartDiscountCode) => {
      const check = canApply(item);
      if (!check.allowed) return check.reason;

      const cat = (item.category ?? "voucher") as AppliedSaving["category"];
      let appliedAmount = 0;

      if (cat === "gift_card") {
        appliedAmount = giftCardSliderValue != null
          ? Math.min(giftCardSliderValue, item.value, subtotal + shippingCost)
          : Math.min(item.value, subtotal + shippingCost);
      } else if (cat === "free_shipping") {
        appliedAmount = shippingCost;
      } else if (item.type === "percent") {
        appliedAmount = Number(((subtotal * item.value) / 100).toFixed(2));
      } else {
        appliedAmount = Math.min(item.value, subtotal + shippingCost);
      }

      const saving: AppliedSaving = {
        code: item.code,
        label: item.label,
        category: cat,
        type: item.type,
        value: item.value,
        appliedAmount,
        userVoucherId: item.userVoucherId,
        voucherType: item.voucherType,
      };

      setApplied((prev) => [...prev, saving]);
      setGiftCardSliderValue(null);
      return null; // success
    },
    [canApply, subtotal, shippingCost, giftCardSliderValue],
  );

  const removeSaving = useCallback((code: string) => {
    setApplied((prev) => prev.filter((a) => a.code !== code));
  }, []);

  const summary: SavingsSummary = useMemo(() => {
    let discountAmount = 0;
    let shippingDiscount = 0;
    let giftCardDeduction = 0;

    applied.forEach((a) => {
      if (a.category === "free_shipping") {
        shippingDiscount += a.appliedAmount;
      } else if (a.category === "gift_card") {
        giftCardDeduction += a.appliedAmount;
      } else {
        discountAmount += a.appliedAmount;
      }
    });

    // Clamp: discount can't exceed subtotal
    discountAmount = Math.min(discountAmount, subtotal);
    shippingDiscount = Math.min(shippingDiscount, shippingCost);

    const remainingAfterDiscount = subtotal - discountAmount + (shippingCost - shippingDiscount);
    giftCardDeduction = Math.min(giftCardDeduction, Math.max(remainingAfterDiscount, 0));

    return {
      discountAmount,
      shippingDiscount,
      giftCardDeduction,
      totalSavings: discountAmount + shippingDiscount + giftCardDeduction,
    };
  }, [applied, subtotal, shippingCost]);

  const finalTotal = Math.max(
    subtotal + shippingCost - summary.discountAmount - summary.shippingDiscount - summary.giftCardDeduction,
    0,
  );

  // Best savings recommendation
  const bestSuggestion = useMemo(() => {
    if (applied.length > 0) return null;
    const eligible = categorized.vouchers.filter((v) => canApply(v).allowed);
    if (eligible.length <= 1) return null;

    let best: CartDiscountCode | null = null;
    let bestSave = 0;
    eligible.forEach((v) => {
      const save = v.type === "percent"
        ? (subtotal * v.value) / 100
        : Math.min(v.value, subtotal);
      if (save > bestSave) {
        bestSave = save;
        best = v;
      }
    });
    return best;
  }, [categorized.vouchers, applied, subtotal, canApply]);

  return {
    applied,
    categorized,
    summary,
    finalTotal,
    bestSuggestion,
    canApply,
    applySaving,
    removeSaving,
    giftCardSliderValue,
    setGiftCardSliderValue,
  };
}
