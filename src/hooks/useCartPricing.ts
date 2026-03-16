import { useMemo } from "react";
import type { PricingInput, PricingResult } from "@/types/cart";

const clampCurrency = (value: number) => Math.max(0, Number(value.toFixed(2)));

function getDiscountAmount(subtotal: number, input: PricingInput) {
  const discount = input.selectedDiscount;
  if (!discount) return 0;
  if (discount.minimum_order_value && subtotal < discount.minimum_order_value) return 0;

  const raw =
    discount.discount_type === "percent"
      ? subtotal * (discount.discount_value / 100)
      : discount.discount_value;

  return clampCurrency(Math.min(raw, subtotal));
}

function getPointsDiscount(subtotalAfterDiscount: number, input: PricingInput) {
  if (!input.usePoints || !input.availablePoints) return 0;
  const rate = input.pointRate ?? 0.1; // 10 points = 1 DKK
  const raw = input.availablePoints * rate;
  return clampCurrency(Math.min(raw, subtotalAfterDiscount));
}

function estimateBuildPlateUsage(input: PricingInput) {
  const totalGrams = input.items.reduce(
    (sum, item) => sum + (item.material_grams ?? 0) * item.quantity,
    0,
  );

  // Simple visual estimator for phase 1.
  // Tune against your real printer profiles later.
  return Math.min(100, Math.round((totalGrams / 500) * 100));
}

export function useCartPricing(input: PricingInput): PricingResult {
  return useMemo(() => {
    const subtotal = clampCurrency(
      input.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    );

    const shippingThreshold = input.shippingThreshold ?? 499;
    const shippingCost = input.shippingCost ?? 39;
    const qualifiesForFreeShipping = subtotal >= shippingThreshold;
    const amountUntilFreeShipping = clampCurrency(
      Math.max(0, shippingThreshold - subtotal),
    );

    const discountAmount = getDiscountAmount(subtotal, input);
    const subtotalAfterDiscount = clampCurrency(subtotal - discountAmount);
    const pointsDiscount = getPointsDiscount(subtotalAfterDiscount, input);

    const shipping = qualifiesForFreeShipping ? 0 : shippingCost;
    const total = clampCurrency(subtotalAfterDiscount - pointsDiscount + shipping);
    const buildPlateUsagePercent = estimateBuildPlateUsage(input);

    return {
      subtotal,
      shipping,
      discountAmount,
      pointsDiscount,
      total,
      qualifiesForFreeShipping,
      amountUntilFreeShipping,
      buildPlateUsagePercent,
    };
  }, [input]);
}
