/**
 * Central permission-to-module mapping.
 * Reused for: sidebar visibility, dashboard widgets, route guards, action buttons.
 */

export const OWNER_EMAIL = "bloodvyctim@gmail.com";

export type AdminRoleKey =
  | "owner"
  | "super_admin"
  | "admin"
  | "editor"
  | "support"
  | "content_admin"
  | "orders_admin"
  | "support_admin"
  | "marketing_admin"
  | "custom";

export const ALL_ADMIN_ROLES: AdminRoleKey[] = [
  "owner",
  "super_admin",
  "admin",
  "content_admin",
  "orders_admin",
  "support_admin",
  "marketing_admin",
  "editor",
  "support",
  "custom",
];

export const ROLE_LABELS: Record<AdminRoleKey, string> = {
  owner: "Owner",
  super_admin: "Super Admin",
  admin: "Admin",
  content_admin: "Content Admin",
  orders_admin: "Orders Admin",
  support_admin: "Support Admin",
  marketing_admin: "Marketing Admin",
  editor: "Editor",
  support: "Support",
  custom: "Custom Role",
};

export const ROLE_COLORS: Record<AdminRoleKey, string> = {
  owner: "destructive",
  super_admin: "destructive",
  admin: "default",
  content_admin: "secondary",
  orders_admin: "secondary",
  support_admin: "secondary",
  marketing_admin: "secondary",
  editor: "outline",
  support: "outline",
  custom: "outline",
};

/** All permission keys the system uses */
export const ALL_PERMISSIONS = [
  "manage_products",
  "manage_categories",
  "manage_page_editor",
  "manage_site_settings",
  "manage_navigation",
  "manage_footer_header",
  "manage_ai_chat_settings",
  "manage_custom_orders",
  "manage_orders",
  "manage_customers",
  "manage_reviews",
  "manage_discounts_rewards",
  "manage_email_templates",
  "manage_dashboard",
  "manage_admin_users",
  "publish_changes",
  "delete_content",
  // Legacy DB permissions (still used in route guards)
  "products.manage",
  "products.publish",
  "categories.manage",
  "content.edit",
  "content.preview",
  "content.publish",
  "custom_orders.manage",
  "customers.view",
  "discounts.manage",
  "media.manage",
  "orders.manage",
  "pricing.manage",
  "reports.view",
  "revenue.view",
  "reviews.manage",
  "settings.view",
  "shipping.manage",
  "showcases.manage",
  "translations.manage",
  "backgrounds.manage",
  "campaigns.manage",
  "*",
] as const;

export const PERMISSION_GROUPS: { label: string; permissions: string[] }[] = [
  { label: "Products & Catalog", permissions: ["products.manage", "products.publish", "categories.manage", "pricing.manage", "showcases.manage"] },
  { label: "Content & Pages", permissions: ["content.edit", "content.preview", "content.publish", "media.manage", "translations.manage", "backgrounds.manage"] },
  { label: "Orders & Fulfillment", permissions: ["orders.manage", "custom_orders.manage", "shipping.manage"] },
  { label: "Customers", permissions: ["customers.view", "reviews.manage"] },
  { label: "Marketing & Growth", permissions: ["campaigns.manage", "discounts.manage", "revenue.view", "reports.view"] },
  { label: "Settings & System", permissions: ["settings.view", "*"] },
];

/** Roles that are considered "admin-level" for sidebar/route checks */
export const ADMIN_ROLE_SET = new Set<string>([
  "owner", "super_admin", "admin", "editor", "support",
  "content_admin", "orders_admin", "support_admin", "marketing_admin", "custom",
]);

export function isOwnerEmail(email: string | undefined | null): boolean {
  return email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

export function canManageRole(actorRole: AdminRoleKey | null, targetRole: AdminRoleKey): boolean {
  if (!actorRole) return false;
  if (actorRole === "owner") return true;
  if (targetRole === "owner") return false;
  if (actorRole === "super_admin") return targetRole !== "super_admin";
  if (actorRole === "admin") return !["owner", "super_admin", "admin"].includes(targetRole);
  return false;
}
