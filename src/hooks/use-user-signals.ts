import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useBehaviorTracking } from "./use-behavior-tracking";
import { useRecentlyViewedProducts } from "./use-recently-viewed";
import { usePersonalizationEngine, type UserSegment } from "./use-personalization-engine";
import { useActiveCampaign } from "./use-active-campaign";
import { useIsMobile } from "./use-mobile";
import { getAnalyticsDeviceType } from "@/lib/analytics";
import type { UserSignals, PreviewPersona } from "@/lib/personalization";

const SAVED_ITEMS_KEY = "layerloot-saved-items";
const ORDERS_KEY = "layerloot_has_orders";

function getGuestSavedCount(): number {
  try {
    const raw = localStorage.getItem(SAVED_ITEMS_KEY);
    if (!raw) return 0;
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids.length : 0;
  } catch {
    return 0;
  }
}

function getHasOrders(): boolean {
  try {
    return localStorage.getItem(ORDERS_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Collects all runtime user signals into a single object for personalization evaluation.
 * Supports persona overrides for editor preview mode.
 */
export function useUserSignals(personaOverride?: PreviewPersona | null) {
  const { user } = useAuth();
  const { items: cartItems } = useCart();
  const { behavior, getInterestProfile } = useBehaviorTracking();
  const { recentProducts } = useRecentlyViewedProducts();
  const engine = usePersonalizationEngine();
  const { campaign } = useActiveCampaign();
  const isMobile = useIsMobile();

  const profile = getInterestProfile();

  const baseSignals = useMemo<UserSignals>(() => {
    const deviceType = getAnalyticsDeviceType() as "mobile" | "tablet" | "desktop";
    const savedCount = getGuestSavedCount();
    const segment: UserSegment = engine.getUserSegment();
    const lang = typeof document !== "undefined"
      ? document.documentElement.lang || navigator.language?.split("-")[0] || "en"
      : "en";

    return {
      isLoggedIn: !!user,
      isFirstTimeVisitor: behavior.totalSessions <= 1 && behavior.viewedProducts.length <= 1,
      isReturningVisitor: behavior.totalSessions >= 2,
      hasSavedItems: savedCount > 0,
      hasCartItems: cartItems.length > 0,
      hasOrders: getHasOrders(),
      hasRecentViews: recentProducts.length > 0,
      language: lang,
      device: isMobile ? "mobile" : deviceType,
      activeCampaignId: campaign?.id ?? null,
      userSegment: segment,
      topCategoryIds: profile.topCategories,
      cartItemCount: cartItems.length,
      savedItemCount: savedCount,
    };
  }, [user, cartItems, behavior, recentProducts, engine, campaign, isMobile, profile]);

  // Apply persona override for preview
  const signals = useMemo<UserSignals>(() => {
    if (!personaOverride?.signals || Object.keys(personaOverride.signals).length === 0) {
      return baseSignals;
    }
    return { ...baseSignals, ...personaOverride.signals };
  }, [baseSignals, personaOverride]);

  const markHasOrders = useCallback(() => {
    try { localStorage.setItem(ORDERS_KEY, "true"); } catch { /* ignore */ }
  }, []);

  return { signals, markHasOrders };
}
