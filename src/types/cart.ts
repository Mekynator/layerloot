export type DiscountType = "percent" | "fixed";

export interface ProductRecommendation {
  id: string;
  product_id: string;
  recommended_product_id: string;
  sort_order: number;
}

export interface UserDiscountCode {
  id: string;
  user_id: string;
  code: string;
  title?: string | null;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order_value?: number | null;
  expires_at?: string | null;
  is_used: boolean;
}

export interface CartItem {
  id: string;
  product_id: string;
  title: string;
  slug?: string | null;
  image_url?: string | null;
  price: number;
  quantity: number;
  variant_label?: string | null;
  material?: string | null;
  color?: string | null;
  custom_note?: string | null;
  print_time_hours?: number | null;
  material_grams?: number | null;
  dispatch_note?: string | null;
  free_shipping_eligible?: boolean | null;
  variant_data?: Record<string, unknown> | null;
  custom_data?: Record<string, unknown> | null;
}

export interface SavedItem extends Omit<CartItem, "quantity"> {
  quantity: number;
  saved_at?: string | null;
}

export interface PricingInput {
  items: CartItem[];
  shippingThreshold?: number;
  shippingCost?: number;
  selectedDiscount?: UserDiscountCode | null;
  usePoints?: boolean;
  availablePoints?: number;
  pointRate?: number;
}

export interface PricingResult {
  subtotal: number;
  shipping: number;
  discountAmount: number;
  pointsDiscount: number;
  total: number;
  qualifiesForFreeShipping: boolean;
  amountUntilFreeShipping: number;
  buildPlateUsagePercent: number;
}
