export type AnalyticsDeviceType = "desktop" | "tablet" | "mobile";
export type AnalyticsSurface = "storefront" | "admin" | "editor-preview";

export type AnalyticsEventName =
  | "page_view"
  | "page_engagement"
  | "scroll_depth"
  | "section_view"
  | "section_click"
  | "component_view"
  | "component_click"
  | "popup_view"
  | "popup_close"
  | "popup_click"
  | "button_impression"
  | "button_click"
  | "cta_click"
  | "product_view"
  | "product_click"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_started"
  | "purchase_completed"
  | "newsletter_signup"
  | "custom_order_submit"
  | "editor_page_opened"
  | "editor_block_selected"
  | "editor_block_added"
  | "editor_save"
  | "editor_publish"
  | "editor_undo"
  | "editor_redo"
  | "preset_applied"
  | "preset_saved"
  | "preset_deleted"
  | "reusable_section_saved"
  | "reusable_section_insert"
  | "global_component_used"
  | "component_detached"
  | "component_override_local"
  | "component_resynced"
  | "component_global_edit"
  | "personalized_variant_shown"
  | "personalized_section_hidden"
  | "personalized_recommendation_click"
  | "ab_variant_shown"
  | "ab_variant_click"
  | "ab_conversion";

export type AnalyticsEntityType =
  | "page"
  | "section"
  | "reusable_section"
  | "global_component"
  | "component_instance"
  | "button"
  | "popup"
  | "campaign"
  | "product"
  | "editor"
  | "preset"
  | "order"
  | "experiment";

export interface AttributionTouchpoint {
  id: string;
  sourceType: "popup" | "cta" | "section" | "campaign" | "component";
  sourceId: string;
  label?: string;
  pagePath?: string;
  campaignId?: string | null;
  reusableId?: string | null;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsEventInput {
  eventName: AnalyticsEventName;
  entityType?: AnalyticsEntityType;
  entityId?: string | null;
  parentEntityId?: string | null;
  reusableId?: string | null;
  componentId?: string | null;
  popupId?: string | null;
  campaignId?: string | null;
  pagePath?: string;
  pageTitle?: string | null;
  source?: string | null;
  value?: number | null;
  dedupeKey?: string | null;
  allowDuplicates?: boolean;
  context?: Record<string, unknown>;
}

export interface AnalyticsEventRow {
  session_id: string;
  user_id: string | null;
  event_name: AnalyticsEventName;
  event_category: string;
  page_path: string | null;
  page_title: string | null;
  surface: AnalyticsSurface;
  device_type: AnalyticsDeviceType;
  entity_type: AnalyticsEntityType | null;
  entity_id: string | null;
  parent_entity_id: string | null;
  reusable_id: string | null;
  component_id: string | null;
  popup_id: string | null;
  campaign_id: string | null;
  source: string | null;
  value: number | null;
  context: Record<string, unknown>;
  created_at: string;
}

const SESSION_KEY = "layerloot.analytics.session-id";
const ATTRIBUTION_KEY = "layerloot.analytics.touchpoints";
const ONCE_PREFIX = "layerloot.analytics.once";
const DEDUPE_WINDOW_MS = 2500;
const TOUCHPOINT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const recentEventMap = new Map<string, number>();

const sanitizePart = (value: unknown) => String(value ?? "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-_]+/gi, "-")
  .replace(/-{2,}/g, "-")
  .replace(/^-|-$/g, "");

export const buildStableAnalyticsId = (...parts: Array<unknown>) => {
  const normalized = parts.map(sanitizePart).filter(Boolean);
  return normalized.join("-") || "unknown";
};

export const getAnalyticsSessionId = () => {
  if (typeof window === "undefined") return "server";
  try {
    let sessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `session-${Date.now()}`;
      window.sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return `session-${Date.now()}`;
  }
};

export const getAnalyticsDeviceType = (): AnalyticsDeviceType => {
  if (typeof window === "undefined") return "desktop";
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
};

export const getAnalyticsSurface = (pathName?: string, search = ""): AnalyticsSurface => {
  const path = pathName || (typeof window !== "undefined" ? window.location.pathname : "/");
  if (search.includes("editorPreview=1")) return "editor-preview";
  return path.startsWith("/admin") ? "admin" : "storefront";
};

export const isAnalyticsEnabled = () => {
  if (typeof window === "undefined") return false;
  const doNotTrack = [navigator.doNotTrack, (window as any).doNotTrack, (navigator as any).msDoNotTrack]
    .map((value) => String(value || "").toLowerCase())
    .some((value) => value === "1" || value === "yes");
  return !doNotTrack;
};

export const shouldTrackOncePerSession = (key: string) => {
  if (typeof window === "undefined") return true;
  try {
    const storageKey = `${ONCE_PREFIX}:${key}`;
    if (window.sessionStorage.getItem(storageKey)) return false;
    window.sessionStorage.setItem(storageKey, "1");
    return true;
  } catch {
    return true;
  }
};

export const shouldSkipDuplicateEvent = (key: string) => {
  const now = Date.now();
  const last = recentEventMap.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) return true;
  recentEventMap.set(key, now);
  if (recentEventMap.size > 250) {
    recentEventMap.forEach((value, mapKey) => {
      if (now - value > DEDUPE_WINDOW_MS * 4) recentEventMap.delete(mapKey);
    });
  }
  return false;
};

const readStoredTouchpoints = (): AttributionTouchpoint[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AttributionTouchpoint[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.sourceId === "string");
  } catch {
    return [];
  }
};

const writeStoredTouchpoints = (items: AttributionTouchpoint[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(items.slice(0, 20)));
  } catch {
    // ignore quota errors
  }
};

export const registerAttributionTouchpoint = (touchpoint: Omit<AttributionTouchpoint, "id" | "timestamp"> & { id?: string; timestamp?: number }) => {
  if (typeof window === "undefined") return;

  const now = touchpoint.timestamp ?? Date.now();
  const nextItem: AttributionTouchpoint = {
    id: touchpoint.id || `${touchpoint.sourceType}:${touchpoint.sourceId}:${now}`,
    timestamp: now,
    ...touchpoint,
  };

  const current = readStoredTouchpoints().filter((item) => now - item.timestamp <= TOUCHPOINT_WINDOW_MS);
  const deduped = current.filter((item) => !(item.sourceType === nextItem.sourceType && item.sourceId === nextItem.sourceId && now - item.timestamp < 30_000));
  writeStoredTouchpoints([nextItem, ...deduped]);
};

export const readAttributionSnapshot = (windowMs = TOUCHPOINT_WINDOW_MS) => {
  const now = Date.now();
  return readStoredTouchpoints().filter((item) => now - item.timestamp <= windowMs);
};

export const readActiveCampaignSnapshot = (): { id?: string | null; name?: string | null } | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("layerloot.activeCampaign");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getEventCategory = (eventName: AnalyticsEventName) => {
  if (eventName.startsWith("editor_") || eventName.startsWith("preset_") || eventName.startsWith("reusable_")) return "editor";
  if (eventName.includes("purchase") || eventName.includes("cart") || eventName.includes("checkout")) return "commerce";
  if (eventName.includes("popup") || eventName.includes("component") || eventName.includes("section") || eventName.includes("button") || eventName.includes("cta")) return "engagement";
  return "navigation";
};

export const buildAnalyticsEventRow = (
  input: AnalyticsEventInput,
  userId: string | null,
  pathName?: string,
  search = "",
): AnalyticsEventRow => {
  const activeCampaign = readActiveCampaignSnapshot();
  const pagePath = input.pagePath || pathName || (typeof window !== "undefined" ? window.location.pathname : "/");
  const context = {
    ...(input.context ?? {}),
    attribution: readAttributionSnapshot().map((item) => ({
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      pagePath: item.pagePath,
      campaignId: item.campaignId,
      reusableId: item.reusableId,
      timestamp: item.timestamp,
    })),
  };

  return {
    session_id: getAnalyticsSessionId(),
    user_id: userId,
    event_name: input.eventName,
    event_category: getEventCategory(input.eventName),
    page_path: pagePath,
    page_title: input.pageTitle ?? null,
    surface: getAnalyticsSurface(pagePath, search),
    device_type: getAnalyticsDeviceType(),
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    parent_entity_id: input.parentEntityId ?? null,
    reusable_id: input.reusableId ?? null,
    component_id: input.componentId ?? null,
    popup_id: input.popupId ?? null,
    campaign_id: input.campaignId ?? activeCampaign?.id ?? null,
    source: input.source ?? null,
    value: typeof input.value === "number" ? input.value : null,
    context,
    created_at: new Date().toISOString(),
  };
};

export const percentage = (numerator: number, denominator: number) => {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
};

export const formatDelta = (current: number, previous: number) => {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return ((current - previous) / previous) * 100;
};
