import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBehaviorTracking } from "./use-behavior-tracking";

export type TrackableEvent =
  | "product_view"
  | "category_view"
  | "search"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_started"
  | "purchase_completed"
  | "custom_request_started"
  | "custom_request_submitted"
  | "quote_viewed"
  | "quote_accepted"
  | "invoice_downloaded"
  | "reward_viewed"
  | "reward_redeemed"
  | "voucher_used"
  | "material_selected"
  | "color_selected"
  | "gift_finder_tag_clicked"
  | "page_visit"
  | "dashboard_section_opened"
  | "reorder_clicked";

const SESSION_KEY = "layerloot_session_id";

function getSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

// Debounce duplicate events within 2 seconds
const recentEvents = new Map<string, number>();
const DEDUP_MS = 2000;

function isDuplicate(key: string): boolean {
  const now = Date.now();
  const last = recentEvents.get(key);
  if (last && now - last < DEDUP_MS) return true;
  recentEvents.set(key, now);
  // Clean old entries
  if (recentEvents.size > 100) {
    for (const [k, v] of recentEvents) {
      if (now - v > DEDUP_MS * 5) recentEvents.delete(k);
    }
  }
  return false;
}

export function useEventTracker() {
  const { user } = useAuth();
  const { trackProductView, trackCategoryView, trackCartAdd, trackToolUsage, trackSearch } = useBehaviorTracking();
  const queueRef = useRef<Array<{
    event_type: string;
    product_id?: string | null;
    category_id?: string | null;
    custom_order_id?: string | null;
    page_path?: string;
    metadata?: Record<string, any>;
  }>>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushQueue = useCallback(async () => {
    if (queueRef.current.length === 0) return;
    const batch = queueRef.current.splice(0, queueRef.current.length);
    const sessionId = getSessionId();
    const userId = user?.id ?? null;

    const rows = batch.map((e) => ({
      user_id: userId,
      session_id: sessionId,
      event_type: e.event_type,
      product_id: e.product_id ?? null,
      category_id: e.category_id ?? null,
      custom_order_id: e.custom_order_id ?? null,
      page_path: e.page_path ?? window.location.pathname,
      metadata: e.metadata ?? {},
    }));

    try {
      // Only write to DB if user is logged in (RLS requires user_id = auth.uid())
      if (userId) {
        await supabase.from("user_events").insert(rows as any);
      }
    } catch {
      // Silent fail — don't disrupt UX for analytics
    }
  }, [user?.id]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flushQueue();
    }, 3000); // Batch every 3 seconds
  }, [flushQueue]);

  const track = useCallback(
    (
      eventType: TrackableEvent,
      options?: {
        productId?: string;
        categoryId?: string;
        categoryName?: string;
        customOrderId?: string;
        metadata?: Record<string, any>;
      },
    ) => {
      const dedupKey = `${eventType}:${options?.productId ?? ""}:${options?.categoryId ?? ""}`;
      if (isDuplicate(dedupKey)) return;

      // Also write to localStorage-based behavior tracking for immediate client-side personalization
      if (eventType === "product_view" && options?.productId) {
        trackProductView(options.productId, options.categoryId ?? null);
      } else if (eventType === "category_view" && options?.categoryId) {
        trackCategoryView(options.categoryId, options.categoryName ?? "");
      } else if (eventType === "add_to_cart" && options?.productId) {
        trackCartAdd(options.productId, options.categoryId ?? null);
      } else if (eventType === "search" && options?.metadata?.query) {
        trackSearch(options.metadata.query);
      } else if (eventType === "custom_request_started" || eventType === "custom_request_submitted") {
        trackToolUsage("custom-print");
      }

      // Queue for DB write
      queueRef.current.push({
        event_type: eventType,
        product_id: options?.productId,
        category_id: options?.categoryId,
        custom_order_id: options?.customOrderId,
        metadata: options?.metadata,
      });
      scheduleFlush();
    },
    [trackProductView, trackCategoryView, trackCartAdd, trackSearch, trackToolUsage, scheduleFlush],
  );

  return { track };
}
