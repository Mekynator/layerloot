import type { User } from "@supabase/supabase-js";

export interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  tool_type?: "custom-print" | "lithophane" | null;
}

export interface Voucher {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  discount_type: string;
  discount_value: number;
  is_active?: boolean;
}

export interface UserVoucher {
  id: string;
  user_id: string;
  voucher_id: string;
  code: string;
  is_used: boolean;
  balance: number | null;
  redeemed_at: string;
  recipient_email: string | null;
  recipient_name?: string | null;
  recipient_user_id?: string | null;
  sender_user_id?: string | null;
  sender_name?: string | null;
  sender_email?: string | null;
  gift_message?: string | null;
  gifted_at?: string | null;
  claimed_at?: string | null;
  gift_status?: string | null;
  used_at?: string | null;
  vouchers: { name: string; discount_value: number; discount_type: string } | null;
}

export interface CustomOrder {
  id: string;
  name: string;
  email: string;
  description: string;
  model_url: string;
  model_filename: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  quoted_price: number | null;
  final_agreed_price: number | null;
  customer_response_status: "pending" | "accepted" | "declined";
  payment_status: "unpaid" | "awaiting_payment" | "paid" | "refunded" | "cancelled";
  production_status: "pending" | "queued" | "in_production" | "completed" | "shipped" | "cancelled";
  request_fee_status?: string;
  request_fee_amount?: number;
  metadata?: {
    order_type?: "custom-print" | "lithophane" | null;
    [key: string]: any;
  } | null;
}

export interface CustomOrderMessage {
  id: string;
  custom_order_id: string;
  sender_role: "user" | "admin" | "system";
  sender_user_id: string | null;
  message: string | null;
  message_type: "note" | "quote" | "status_update" | "system";
  proposed_price: number | null;
  created_at: string;
}

export type RewardCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  discount_type: string;
  discount_value: number;
  badge_text?: string | null;
  icon_key?: string | null;
  reward_type: string;
  sort_order: number;
};

export type AccountTab = "orders" | "custom-requests" | "rewards" | "vouchers" | "settings";

export interface AccountModuleConfig {
  id: AccountTab;
  label: string;
  icon: string;
  visible: boolean;
  order: number;
}

export interface AccountPageConfig {
  modules: AccountModuleConfig[];
  defaultTab: AccountTab;
  showLoyaltySummary: boolean;
  overviewTiles: string[];
  style: {
    cardBorder: string;
    hoverAnimation: string;
    tabStyle: string;
  };
}

export interface AccountModuleProps {
  user: User;
  overview: any;
  refetchOverview: () => Promise<any>;
  tt: (key: string, fallback: string) => string;
}

export const DEFAULT_ACCOUNT_CONFIG: AccountPageConfig = {
  modules: [
    { id: "orders", label: "Orders", icon: "Package", visible: true, order: 0 },
    { id: "custom-requests", label: "Custom Requests", icon: "MessageSquare", visible: true, order: 1 },
    { id: "rewards", label: "Rewards Store", icon: "Gift", visible: true, order: 2 },
    { id: "vouchers", label: "My Vouchers", icon: "Star", visible: true, order: 3 },
    { id: "settings", label: "Settings", icon: "Settings", visible: true, order: 4 },
  ],
  defaultTab: "orders",
  showLoyaltySummary: true,
  overviewTiles: ["points", "activeVouchers", "totalOrders", "giftCardBalance"],
  style: {
    cardBorder: "primary/20",
    hoverAnimation: "lift",
    tabStyle: "pills",
  },
};

// Helper utilities
export const statusColors: Record<string, string> = {
  completed: "text-green-500",
  shipped: "text-blue-500",
  processing: "text-purple-500",
  cancelled: "text-destructive",
  pending: "text-muted-foreground",
  delivered: "text-green-500",
};

export const customStatusBadgeColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  reviewing: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  quoted: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  accepted: "bg-green-500/10 text-green-600 border-green-500/30",
  in_production: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  rejected: "bg-red-500/10 text-red-600 border-red-500/30",
};

export const DONE_CUSTOM_STATUSES = new Set(["rejected", "completed"]);
export const DONE_PRODUCTION_STATUSES = new Set(["shipped", "cancelled", "completed"]);

export function isCustomOrderDone(order: CustomOrder) {
  return (
    DONE_CUSTOM_STATUSES.has((order.status || "").toLowerCase()) ||
    DONE_PRODUCTION_STATUSES.has((order.production_status || "").toLowerCase())
  );
}

export function detectCustomOrderType(order: CustomOrder): "custom-print" | "lithophane" {
  const metadataType = order.metadata?.order_type;
  if (metadataType === "lithophane") return "lithophane";
  if (metadataType === "custom-print") return "custom-print";
  const raw = (order.description || "").toLowerCase();
  if (raw.includes("lithophane custom order") || raw.includes('"component": "lithophane"')) return "lithophane";
  return "custom-print";
}

export type VoucherCategory = "active" | "gifted" | "used" | "expired";

export function classifyVoucher(voucher: UserVoucher): VoucherCategory {
  const gs = voucher.gift_status || "";
  const remainingBalance = voucher.balance !== null ? Number(voucher.balance) : null;

  // Expired / voided
  if (gs === "cancelled") return "expired";

  // Gifted away
  if (
    gs === "pending_claim" ||
    gs === "gifted" ||
    gs === "claimed" ||
    !!voucher.recipient_email
  ) return "gifted";

  // Used / consumed
  if (
    voucher.is_used ||
    !!voucher.used_at ||
    (remainingBalance !== null && remainingBalance <= 0)
  ) return "used";

  return "active";
}

export function isVoucherUsedOrArchived(voucher: UserVoucher) {
  const remainingBalance = voucher.balance !== null ? Number(voucher.balance) : null;
  const gs = voucher.gift_status;
  return (
    voucher.is_used ||
    !!voucher.used_at ||
    gs === "pending_claim" ||
    gs === "gifted" ||
    gs === "claimed" ||
    gs === "cancelled" ||
    !!voucher.recipient_email ||
    (remainingBalance !== null && remainingBalance <= 0)
  );
}

export function parseCustomOrderDescription(description: string) {
  const raw = description || "";
  const marker = "\n--- Options ---";
  const parts = raw.split(marker);
  const customerDescription = (parts[0] || "").trim();
  const optionsText = (parts[1] || "").trim();
  const parsed = { material: "-", color: "-", quality: "-", quantity: "-", scale: "-" };
  optionsText.split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) return;
    const normalizedKey = key.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (normalizedKey === "material") parsed.material = value;
    if (normalizedKey === "color") parsed.color = value;
    if (normalizedKey === "quality") parsed.quality = value;
    if (normalizedKey === "quantity") parsed.quantity = value;
    if (normalizedKey === "scale") parsed.scale = value;
  });
  return { customerDescription, ...parsed };
}

export function groupVouchersByDefinition(vouchers: UserVoucher[]) {
  const groups = new Map<string, { key: string; label: string; type: string | null; items: UserVoucher[] }>();
  vouchers.forEach((voucher) => {
    const key = voucher.voucher_id || voucher.vouchers?.name || voucher.id;
    const existing = groups.get(key);
    if (existing) { existing.items.push(voucher); return; }
    groups.set(key, { key, label: voucher.vouchers?.name ?? "Voucher", type: voucher.vouchers?.discount_type ?? null, items: [voucher] });
  });
  return Array.from(groups.values()).map((group) => ({
    ...group,
    items: [...group.items].sort((a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime()),
  }));
}

export function getNotificationsStorageKey(userId: string) {
  return `layerloot_account_notifications_${userId}`;
}

export type SeenState = {
  ordersLastSeenAt: string | null;
  customRequestsLastSeenAt: string | null;
};

export function readSeenState(userId: string): SeenState {
  try {
    const raw = localStorage.getItem(getNotificationsStorageKey(userId));
    if (!raw) return { ordersLastSeenAt: null, customRequestsLastSeenAt: null };
    const parsed = JSON.parse(raw);
    return { ordersLastSeenAt: parsed?.ordersLastSeenAt ?? null, customRequestsLastSeenAt: parsed?.customRequestsLastSeenAt ?? null };
  } catch {
    return { ordersLastSeenAt: null, customRequestsLastSeenAt: null };
  }
}

export function saveSeenState(userId: string, next: SeenState) {
  localStorage.setItem(getNotificationsStorageKey(userId), JSON.stringify(next));
}

export function isAfter(dateStr?: string | null, compareStr?: string | null) {
  if (!dateStr) return false;
  if (!compareStr) return true;
  return new Date(dateStr).getTime() > new Date(compareStr).getTime();
}

export function getLatestDate(values: (string | null | undefined)[]) {
  const valid = values.filter(Boolean) as string[];
  if (valid.length === 0) return null;
  return valid.reduce((latest, current) =>
    new Date(current).getTime() > new Date(latest).getTime() ? current : latest,
  );
}
