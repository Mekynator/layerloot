import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildAnalyticsEventRow,
  buildStableAnalyticsId,
  isAnalyticsEnabled,
  registerAttributionTouchpoint,
  shouldSkipDuplicateEvent,
  type AnalyticsEventInput,
  type AnalyticsEventRow,
  type AttributionTouchpoint,
} from "@/lib/analytics";

interface AnalyticsContextValue {
  track: (input: AnalyticsEventInput) => void;
  trackAttribution: (touchpoint: Omit<AttributionTouchpoint, "id" | "timestamp"> & { id?: string; timestamp?: number }) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const queueRef = useRef<AnalyticsEventRow[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const pageEnterRef = useRef<number>(Date.now());
  const maxScrollDepthRef = useRef(0);
  const firedMilestonesRef = useRef<number[]>([]);

  const flush = useCallback(async () => {
    if (!queueRef.current.length) return;
    const batch = queueRef.current.splice(0, queueRef.current.length);

    try {
      await supabase.from("analytics_events" as any).insert(batch as any);
    } catch {
      // Silent fail: analytics should never break the UX.
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      void flush();
    }, 2500);
  }, [flush]);

  const track = useCallback((input: AnalyticsEventInput) => {
    if (typeof window === "undefined" || !isAnalyticsEnabled()) return;

    const dedupeKey = input.dedupeKey || buildStableAnalyticsId(input.eventName, input.entityType, input.entityId, input.pagePath || location.pathname, input.source || "");
    if (!input.allowDuplicates && shouldSkipDuplicateEvent(dedupeKey)) return;

    const row = buildAnalyticsEventRow(input, user?.id ?? null, location.pathname, location.search);
    queueRef.current.push(row);
    scheduleFlush();
  }, [location.pathname, location.search, scheduleFlush, user?.id]);

  const trackAttribution = useCallback((touchpoint: Omit<AttributionTouchpoint, "id" | "timestamp"> & { id?: string; timestamp?: number }) => {
    registerAttributionTouchpoint(touchpoint);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAddToCart = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail || {};
      track({
        eventName: "add_to_cart",
        entityType: "product",
        entityId: String(detail.id || "unknown-product"),
        source: String(detail.source || "cart"),
        value: Number(detail.price || 0),
        context: {
          productName: detail.name,
          slug: detail.slug,
          quantity: detail.quantity,
          totalItems: detail.totalItems,
        },
      });
    };

    const handleRemoveFromCart = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail || {};
      track({
        eventName: "remove_from_cart",
        entityType: "product",
        entityId: String(detail.id || "unknown-product"),
        source: "cart",
        context: { quantity: detail.quantity ?? 1 },
      });
    };

    const handleCheckoutStarted = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail || {};
      track({
        eventName: "checkout_started",
        entityType: "order",
        entityId: String(detail.checkoutId || detail.id || "checkout"),
        source: "cart",
        value: Number(detail.total || 0),
        context: {
          itemCount: detail.itemCount,
          total: detail.total,
          shipping: detail.shipping,
          items: detail.items,
        },
      });
    };

    const handlePurchaseCompleted = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail || {};
      track({
        eventName: "purchase_completed",
        entityType: "order",
        entityId: String(detail.orderId || detail.checkoutId || "purchase"),
        source: "checkout_success",
        value: Number(detail.total || 0),
        context: detail,
      });
    };

    window.addEventListener("layerloot:add-to-cart", handleAddToCart as EventListener);
    window.addEventListener("layerloot:remove-from-cart", handleRemoveFromCart as EventListener);
    window.addEventListener("layerloot:checkout-started", handleCheckoutStarted as EventListener);
    window.addEventListener("layerloot:purchase-completed", handlePurchaseCompleted as EventListener);

    return () => {
      window.removeEventListener("layerloot:add-to-cart", handleAddToCart as EventListener);
      window.removeEventListener("layerloot:remove-from-cart", handleRemoveFromCart as EventListener);
      window.removeEventListener("layerloot:checkout-started", handleCheckoutStarted as EventListener);
      window.removeEventListener("layerloot:purchase-completed", handlePurchaseCompleted as EventListener);
    };
  }, [track]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isEditorPreview = location.search.includes("editorPreview=1");
    pageEnterRef.current = Date.now();
    maxScrollDepthRef.current = 0;
    firedMilestonesRef.current = [];

    if (!isEditorPreview) {
      track({
        eventName: "page_view",
        entityType: "page",
        entityId: location.pathname,
        pagePath: location.pathname,
        allowDuplicates: false,
        context: {
          referrer: document.referrer || null,
          title: document.title || null,
        },
      });
    }

    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const viewportHeight = window.innerHeight || 0;
      const fullHeight = Math.max(document.documentElement.scrollHeight - viewportHeight, 1);
      const depth = Math.max(0, Math.min(100, Math.round((scrollTop / fullHeight) * 100)));
      maxScrollDepthRef.current = Math.max(maxScrollDepthRef.current, depth);

      [25, 50, 75, 100].forEach((milestone) => {
        if (depth >= milestone && !firedMilestonesRef.current.includes(milestone)) {
          firedMilestonesRef.current.push(milestone);
          if (!isEditorPreview) {
            track({
              eventName: "scroll_depth",
              entityType: "page",
              entityId: location.pathname,
              pagePath: location.pathname,
              allowDuplicates: true,
              dedupeKey: `${location.pathname}:scroll:${milestone}`,
              value: milestone,
              context: { milestone },
            });
          }
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (!isEditorPreview) {
        track({
          eventName: "page_engagement",
          entityType: "page",
          entityId: location.pathname,
          pagePath: location.pathname,
          allowDuplicates: true,
          dedupeKey: `${location.pathname}:engagement:${pageEnterRef.current}`,
          value: Date.now() - pageEnterRef.current,
          context: {
            engagementMs: Date.now() - pageEnterRef.current,
            maxScrollDepth: maxScrollDepthRef.current,
          },
        });
      }
    };
  }, [location.pathname, location.search, track]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flush();
      }
    };
    window.addEventListener("beforeunload", () => { void flush(); });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flush]);

  const value = useMemo<AnalyticsContextValue>(() => ({ track, trackAttribution }), [track, trackAttribution]);

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
}

export function useAnalyticsSafe(): AnalyticsContextValue {
  return useContext(AnalyticsContext) ?? {
    track: () => undefined,
    trackAttribution: () => undefined,
  };
}
