import { useCallback, useEffect, useState } from "react";

const BEHAVIOR_KEY = "layerloot_user_behavior";

export interface UserBehavior {
  viewedProducts: { id: string; categoryId: string | null; viewedAt: number; count: number }[];
  viewedCategories: { id: string; name: string; count: number; lastAt: number }[];
  cartAdds: { productId: string; categoryId: string | null; addedAt: number }[];
  searches: { query: string; at: number }[];
  toolUsage: { tool: "custom-print" | "lithophane" | "gift"; count: number; lastAt: number }[];
  sessionStart: number;
  totalSessions: number;
  lastVisit: number;
}

function defaultBehavior(): UserBehavior {
  return {
    viewedProducts: [],
    viewedCategories: [],
    cartAdds: [],
    searches: [],
    toolUsage: [],
    sessionStart: Date.now(),
    totalSessions: 1,
    lastVisit: Date.now(),
  };
}

function readBehavior(): UserBehavior {
  try {
    const raw = localStorage.getItem(BEHAVIOR_KEY);
    if (!raw) return defaultBehavior();
    const parsed = JSON.parse(raw);
    // Start new session if last visit > 30min ago
    const isNewSession = Date.now() - (parsed.lastVisit || 0) > 30 * 60 * 1000;
    return {
      ...defaultBehavior(),
      ...parsed,
      sessionStart: isNewSession ? Date.now() : parsed.sessionStart,
      totalSessions: isNewSession ? (parsed.totalSessions || 0) + 1 : parsed.totalSessions || 1,
      lastVisit: Date.now(),
    };
  } catch {
    return defaultBehavior();
  }
}

function writeBehavior(b: UserBehavior) {
  b.lastVisit = Date.now();
  localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(b));
}

export function useBehaviorTracking() {
  const [behavior, setBehavior] = useState<UserBehavior>(() => readBehavior());

  useEffect(() => {
    writeBehavior(behavior);
  }, [behavior]);

  const trackProductView = useCallback((productId: string, categoryId: string | null) => {
    setBehavior((prev) => {
      const existing = prev.viewedProducts.find((p) => p.id === productId);
      const viewedProducts = existing
        ? prev.viewedProducts.map((p) =>
            p.id === productId ? { ...p, count: p.count + 1, viewedAt: Date.now() } : p,
          )
        : [{ id: productId, categoryId, viewedAt: Date.now(), count: 1 }, ...prev.viewedProducts].slice(0, 50);
      return { ...prev, viewedProducts };
    });
  }, []);

  const trackCategoryView = useCallback((categoryId: string, categoryName: string) => {
    setBehavior((prev) => {
      const existing = prev.viewedCategories.find((c) => c.id === categoryId);
      const viewedCategories = existing
        ? prev.viewedCategories.map((c) =>
            c.id === categoryId ? { ...c, count: c.count + 1, lastAt: Date.now() } : c,
          )
        : [{ id: categoryId, name: categoryName, count: 1, lastAt: Date.now() }, ...prev.viewedCategories].slice(0, 20);
      return { ...prev, viewedCategories };
    });
  }, []);

  const trackCartAdd = useCallback((productId: string, categoryId: string | null) => {
    setBehavior((prev) => ({
      ...prev,
      cartAdds: [{ productId, categoryId, addedAt: Date.now() }, ...prev.cartAdds].slice(0, 30),
    }));
  }, []);

  const trackToolUsage = useCallback((tool: "custom-print" | "lithophane" | "gift") => {
    setBehavior((prev) => {
      const existing = prev.toolUsage.find((t) => t.tool === tool);
      const toolUsage = existing
        ? prev.toolUsage.map((t) => (t.tool === tool ? { ...t, count: t.count + 1, lastAt: Date.now() } : t))
        : [...prev.toolUsage, { tool, count: 1, lastAt: Date.now() }];
      return { ...prev, toolUsage };
    });
  }, []);

  const trackSearch = useCallback((query: string) => {
    setBehavior((prev) => ({
      ...prev,
      searches: [{ query, at: Date.now() }, ...prev.searches].slice(0, 20),
    }));
  }, []);

  /** Derive user interest profile for recommendations */
  const getInterestProfile = useCallback(() => {
    const catCounts = new Map<string, number>();
    behavior.viewedProducts.forEach((p) => {
      if (p.categoryId) catCounts.set(p.categoryId, (catCounts.get(p.categoryId) || 0) + p.count);
    });
    behavior.cartAdds.forEach((a) => {
      if (a.categoryId) catCounts.set(a.categoryId, (catCounts.get(a.categoryId) || 0) + 3); // cart adds weighted higher
    });

    const topCategories = [...catCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const usesCustomTools = behavior.toolUsage.some((t) => t.tool === "custom-print" && t.count >= 2);
    const usesLithophane = behavior.toolUsage.some((t) => t.tool === "lithophane" && t.count >= 1);
    const isGiftShopper = behavior.toolUsage.some((t) => t.tool === "gift" && t.count >= 1);
    const isReturningUser = behavior.totalSessions >= 3;
    const recentProductIds = behavior.viewedProducts
      .sort((a, b) => b.viewedAt - a.viewedAt)
      .slice(0, 10)
      .map((p) => p.id);

    return { topCategories, usesCustomTools, usesLithophane, isGiftShopper, isReturningUser, recentProductIds };
  }, [behavior]);

  return {
    behavior,
    trackProductView,
    trackCategoryView,
    trackCartAdd,
    trackToolUsage,
    trackSearch,
    getInterestProfile,
  };
}
