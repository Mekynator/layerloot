import { useMemo } from "react";

const DEFAULT_FREE_SHIPPING_THRESHOLD = 500;

export function useFreeShippingProgress(subtotal: number, threshold = DEFAULT_FREE_SHIPPING_THRESHOLD) {
  return useMemo(() => {
    const remaining = Math.max(threshold - subtotal, 0);
    const progress = Math.min((subtotal / threshold) * 100, 100);
    const unlocked = subtotal >= threshold;
    return { remaining, progress, unlocked, threshold };
  }, [subtotal, threshold]);
}
