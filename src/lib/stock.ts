/**
 * Stock Logic Utility
 *
 * Core rule:
 * - stock === 0 → Made to order (always purchasable, no stock tracking)
 * - stock > 0  → Tracked inventory (normal stock behavior)
 */

/** Returns true if the product uses tracked inventory (stock > 0) */
export function isTrackedStock(stock: number | null | undefined): boolean {
  return (stock ?? 0) > 0;
}

/** Returns true if the product is made to order (stock === 0) */
export function isMadeToOrder(stock: number | null | undefined): boolean {
  return (stock ?? 0) === 0;
}

/** Returns true if the product can be purchased */
export function isPurchasable(stock: number | null | undefined): boolean {
  // stock=0 means made-to-order (always purchasable)
  // stock>0 means tracked and available
  // Only unpurchasable if tracked stock that has run out — but tracked starts > 0,
  // so if it was tracked and reached 0, we can't distinguish from made-to-order.
  // Convention: stock=0 is always purchasable.
  return true; // All products are purchasable under the new rule
}

/** Returns true if low stock warning should show (only for tracked inventory) */
export function isLowStock(stock: number | null | undefined, threshold = 5): boolean {
  const s = stock ?? 0;
  return s > 0 && s <= threshold;
}

/** Returns a human-readable stock label */
export function getStockLabel(stock: number | null | undefined): string {
  const s = stock ?? 0;
  if (s === 0) return "Made to order";
  return `${s} in stock`;
}

/** Returns a short stock type label for admin views */
export function getStockTypeBadge(stock: number | null | undefined): { label: string; type: "mto" | "tracked" | "low" } {
  const s = stock ?? 0;
  if (s === 0) return { label: "Made to order", type: "mto" };
  if (s <= 5) return { label: `Low stock: ${s}`, type: "low" };
  return { label: `Stock: ${s}`, type: "tracked" };
}
