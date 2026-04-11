// ─── Personalization Types & Evaluation Engine ───
// Pure logic — no React, no hooks. Evaluates audience rules against user signals.

// ─── Audience Condition Types ───

export type AudienceConditionType =
  | "auth_status"       // guest | logged_in
  | "visitor_type"      // first_time | returning
  | "has_saved_items"   // true | false
  | "has_cart_items"    // true | false
  | "has_orders"       // true | false — past buyer
  | "no_orders"        // true | false — never bought
  | "has_recent_views" // true | false — recently viewed products
  | "language"         // specific language code
  | "device"           // mobile | desktop | tablet
  | "campaign"         // active campaign id
  | "user_segment"     // new | casual | engaged | loyal
  | "category_interest"; // specific category id

export interface AudienceCondition {
  type: AudienceConditionType;
  value: string;
}

/** AND-group: all conditions must match */
export type AudienceRuleGroup = AudienceCondition[];

/** OR across groups: at least one group must fully match */
export type AudienceRules = AudienceRuleGroup[];

// ─── Variant Types ───

export interface PersonalizationVariant {
  id: string;
  label: string;
  audienceRules: AudienceRules;
  content: Record<string, unknown>;
  priority: number; // lower = higher priority
}

export interface PersonalizationConfig {
  enabled: boolean;
  variants: PersonalizationVariant[];
}

// ─── User Signals (evaluated at runtime) ───

export interface UserSignals {
  isLoggedIn: boolean;
  isFirstTimeVisitor: boolean;
  isReturningVisitor: boolean;
  hasSavedItems: boolean;
  hasCartItems: boolean;
  hasOrders: boolean;
  hasRecentViews: boolean;
  language: string;
  device: "mobile" | "tablet" | "desktop";
  activeCampaignId: string | null;
  userSegment: "new" | "casual" | "engaged" | "loyal";
  topCategoryIds: string[];
  cartItemCount: number;
  savedItemCount: number;
}

// ─── Preview Persona ───

export interface PreviewPersona {
  id: string;
  label: string;
  icon: string;
  signals: Partial<UserSignals>;
}

export const PREVIEW_PERSONAS: PreviewPersona[] = [
  { id: "default", label: "Default (no override)", icon: "Eye", signals: {} },
  { id: "guest", label: "Guest visitor", icon: "UserX", signals: { isLoggedIn: false, isFirstTimeVisitor: true, isReturningVisitor: false, hasOrders: false, hasSavedItems: false, hasCartItems: false } },
  { id: "logged_in", label: "Logged-in user", icon: "User", signals: { isLoggedIn: true } },
  { id: "returning", label: "Returning visitor", icon: "RotateCcw", signals: { isReturningVisitor: true, isFirstTimeVisitor: false } },
  { id: "with_saved", label: "Has saved items", icon: "Heart", signals: { hasSavedItems: true, savedItemCount: 3 } },
  { id: "with_cart", label: "Has cart items", icon: "ShoppingCart", signals: { hasCartItems: true, cartItemCount: 2 } },
  { id: "past_buyer", label: "Past buyer", icon: "Package", signals: { hasOrders: true, isReturningVisitor: true } },
  { id: "mobile", label: "Mobile user", icon: "Smartphone", signals: { device: "mobile" } },
];

// ─── Recommendation Mode ───

export type RecommendationMode =
  | "recently_viewed"
  | "saved_items"
  | "cart_based"
  | "past_orders"
  | "category_interest"
  | "campaign_featured"
  | "bestsellers"
  | "featured"
  | "manual";

export interface RecommendationConfig {
  mode: RecommendationMode;
  fallbackMode: RecommendationMode;
  limit: number;
  manualProductIds?: string[];
}

// ─── Default factories ───

export function createDefaultPersonalizationConfig(): PersonalizationConfig {
  return { enabled: false, variants: [] };
}

export function createDefaultVariant(label: string): PersonalizationVariant {
  return {
    id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label,
    audienceRules: [],
    content: {},
    priority: 10,
  };
}

export function createDefaultRecommendationConfig(): RecommendationConfig {
  return { mode: "bestsellers", fallbackMode: "featured", limit: 4 };
}

// ─── Condition Evaluation ───

function evaluateCondition(condition: AudienceCondition, signals: UserSignals): boolean {
  switch (condition.type) {
    case "auth_status":
      return condition.value === "logged_in" ? signals.isLoggedIn : !signals.isLoggedIn;

    case "visitor_type":
      return condition.value === "first_time"
        ? signals.isFirstTimeVisitor
        : signals.isReturningVisitor;

    case "has_saved_items":
      return condition.value === "true" ? signals.hasSavedItems : !signals.hasSavedItems;

    case "has_cart_items":
      return condition.value === "true" ? signals.hasCartItems : !signals.hasCartItems;

    case "has_orders":
      return condition.value === "true" ? signals.hasOrders : !signals.hasOrders;

    case "no_orders":
      return condition.value === "true" ? !signals.hasOrders : signals.hasOrders;

    case "has_recent_views":
      return condition.value === "true" ? signals.hasRecentViews : !signals.hasRecentViews;

    case "language":
      return signals.language.toLowerCase().startsWith(condition.value.toLowerCase());

    case "device":
      return signals.device === condition.value;

    case "campaign":
      return signals.activeCampaignId === condition.value;

    case "user_segment":
      return signals.userSegment === condition.value;

    case "category_interest":
      return signals.topCategoryIds.includes(condition.value);

    default:
      return true; // unknown conditions pass to avoid blocking content
  }
}

function evaluateGroup(group: AudienceRuleGroup, signals: UserSignals): boolean {
  if (group.length === 0) return true; // empty group = match all
  return group.every((condition) => evaluateCondition(condition, signals));
}

/** Returns true if the user matches at least one rule group (OR logic across groups, AND within each group) */
export function evaluateAudienceRules(rules: AudienceRules, signals: UserSignals): boolean {
  if (!rules || rules.length === 0) return true; // no rules = show to everyone
  return rules.some((group) => evaluateGroup(group, signals));
}

// ─── Variant Selection ───

/**
 * Given a list of variants and user signals, return the best matching variant.
 * Falls back to null if nothing matches (caller should use default content).
 */
export function selectVariant(
  variants: PersonalizationVariant[],
  signals: UserSignals,
): PersonalizationVariant | null {
  if (!variants.length) return null;

  const matches = variants
    .filter((v) => evaluateAudienceRules(v.audienceRules, signals))
    .sort((a, b) => a.priority - b.priority);

  return matches[0] ?? null;
}

// ─── Section Visibility ───

/**
 * Check if a block should be visible based on its personalization rules.
 * Returns true (show) if no rules are configured.
 */
export function shouldShowBlock(
  blockContent: Record<string, unknown> | null,
  signals: UserSignals,
): boolean {
  if (!blockContent) return true;
  const rules = blockContent._audienceRules as AudienceRules | undefined;
  if (!rules || !Array.isArray(rules) || rules.length === 0) return true;
  return evaluateAudienceRules(rules, signals);
}

/**
 * Get the effective content for a block, considering personalization variants.
 * Returns original content merged with variant overrides if a variant matches.
 */
export function getPersonalizedContent(
  blockContent: Record<string, unknown>,
  signals: UserSignals,
): Record<string, unknown> {
  const config = blockContent._personalization as PersonalizationConfig | undefined;
  if (!config?.enabled || !config.variants?.length) return blockContent;

  const variant = selectVariant(config.variants, signals);
  if (!variant) return blockContent;

  // Merge variant content onto base (shallow merge — variant overrides specific keys)
  return { ...blockContent, ...variant.content, _activeVariantId: variant.id };
}

// ─── Audience Condition Labels ───

export const AUDIENCE_CONDITION_LABELS: Record<AudienceConditionType, string> = {
  auth_status: "Login status",
  visitor_type: "Visitor type",
  has_saved_items: "Has saved items",
  has_cart_items: "Has cart items",
  has_orders: "Has previous orders",
  no_orders: "No previous orders",
  has_recent_views: "Recently viewed products",
  language: "Language",
  device: "Device type",
  campaign: "Active campaign",
  user_segment: "User engagement",
  category_interest: "Category interest",
};

export const CONDITION_VALUE_OPTIONS: Partial<Record<AudienceConditionType, { value: string; label: string }[]>> = {
  auth_status: [
    { value: "guest", label: "Guest" },
    { value: "logged_in", label: "Logged in" },
  ],
  visitor_type: [
    { value: "first_time", label: "First-time visitor" },
    { value: "returning", label: "Returning visitor" },
  ],
  has_saved_items: [
    { value: "true", label: "Yes" },
    { value: "false", label: "No" },
  ],
  has_cart_items: [
    { value: "true", label: "Yes" },
    { value: "false", label: "No" },
  ],
  has_orders: [
    { value: "true", label: "Yes" },
    { value: "false", label: "No" },
  ],
  no_orders: [
    { value: "true", label: "Yes — never ordered" },
    { value: "false", label: "No — has ordered" },
  ],
  has_recent_views: [
    { value: "true", label: "Yes" },
    { value: "false", label: "No" },
  ],
  device: [
    { value: "mobile", label: "Mobile" },
    { value: "tablet", label: "Tablet" },
    { value: "desktop", label: "Desktop" },
  ],
  user_segment: [
    { value: "new", label: "New" },
    { value: "casual", label: "Casual" },
    { value: "engaged", label: "Engaged" },
    { value: "loyal", label: "Loyal" },
  ],
};
