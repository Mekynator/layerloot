import { useCallback, useMemo } from "react";
import { useBehaviorTracking } from "./use-behavior-tracking";
import { useRememberedChoices } from "./use-remembered-choices";
import type { CatalogProduct } from "./use-storefront";
import type { ProductSocialProof } from "@/lib/social-proof";
import type { RecommendationSection } from "./use-smart-recommendations";

const BEHAVIOR_KEY = "layerloot_user_behavior";
const CHOICES_KEY = "layerloot_remembered_choices";

export type UserSegment = "new" | "casual" | "engaged" | "loyal";

export interface PersonalizationWeights {
  behavior: number;
  preference: number;
  popularity: number;
  recency: number;
  adminBoostIds: string[];
  enabled: boolean;
}

const DEFAULT_WEIGHTS: PersonalizationWeights = {
  behavior: 1,
  preference: 1,
  popularity: 1,
  recency: 1,
  adminBoostIds: [],
  enabled: true,
};

export function parsePersonalizationWeights(raw: any): PersonalizationWeights {
  if (!raw || typeof raw !== "object") return DEFAULT_WEIGHTS;
  return {
    behavior: raw.behavior ?? 1,
    preference: raw.preference ?? 1,
    popularity: raw.popularity ?? 1,
    recency: raw.recency ?? 1,
    adminBoostIds: Array.isArray(raw.adminBoostIds) ? raw.adminBoostIds : [],
    enabled: raw.enabled !== false,
  };
}

function parseStored(val?: string): string[] {
  if (!val) return [];
  return val.split(",").map((v) => v.trim()).filter(Boolean);
}

export function usePersonalizationEngine(weights?: PersonalizationWeights) {
  const w = weights ?? DEFAULT_WEIGHTS;
  const { behavior, getInterestProfile } = useBehaviorTracking();
  const { choices } = useRememberedChoices();

  const profile = getInterestProfile();

  // Parsed preference arrays
  const prefMaterials = useMemo(() => parseStored(choices.lastMaterial), [choices.lastMaterial]);
  const prefColors = useMemo(() => parseStored(choices.lastColor), [choices.lastColor]);
  const prefCategories = useMemo(() => parseStored(choices.lastSize), [choices.lastSize]); // stored in lastSize
  const prefPriceRange = useMemo<[number, number]>(() => {
    const lo = choices.lastGiftSettings?.recipientAgeGroup ? Number(choices.lastGiftSettings.recipientAgeGroup) || 0 : 0;
    const hi = choices.lastGiftSettings?.occasion ? Number(choices.lastGiftSettings.occasion) || 100000 : 100000;
    return [lo, hi];
  }, [choices.lastGiftSettings]);

  // Category interest map from behavior (normalized)
  const behaviorCatScores = useMemo(() => {
    const map = new Map<string, number>();
    behavior.viewedProducts.forEach((p) => {
      if (p.categoryId) map.set(p.categoryId, (map.get(p.categoryId) || 0) + p.count);
    });
    behavior.cartAdds.forEach((a) => {
      if (a.categoryId) map.set(a.categoryId, (map.get(a.categoryId) || 0) + 3);
    });
    return map;
  }, [behavior.viewedProducts, behavior.cartAdds]);

  const maxBehaviorCatScore = useMemo(() => {
    let max = 1;
    behaviorCatScores.forEach((v) => { if (v > max) max = v; });
    return max;
  }, [behaviorCatScores]);

  const getUserSegment = useCallback((): UserSegment => {
    const sessions = behavior.totalSessions;
    const viewCount = behavior.viewedProducts.length;
    if (sessions >= 10 || viewCount >= 30) return "loyal";
    if (sessions >= 5 || viewCount >= 15) return "engaged";
    if (sessions >= 2) return "casual";
    return "new";
  }, [behavior.totalSessions, behavior.viewedProducts.length]);

  const scoreProduct = useCallback(
    (product: CatalogProduct, socialProof?: ProductSocialProof): number => {
      if (!w.enabled) return 0;

      let score = 0;

      // Category match (behavior) — up to 20
      if (product.category_id && behaviorCatScores.has(product.category_id)) {
        const normalized = behaviorCatScores.get(product.category_id)! / maxBehaviorCatScore;
        score += 20 * normalized * w.behavior;
      }

      // Category match (preference) — 15
      if (product.category_id && prefCategories.length > 0) {
        // We match by category name — need categories lookup, but we can only match by ID here
        // For simplicity, check if category_id is in top behavior categories that overlap with pref
        if (profile.topCategories.includes(product.category_id)) {
          score += 15 * w.preference;
        }
      }

      // Material match — 10
      if (prefMaterials.length > 0 && (product as any).material_type) {
        const mat = ((product as any).material_type as string).toLowerCase();
        if (prefMaterials.some((m) => mat.includes(m.toLowerCase()))) {
          score += 10 * w.preference;
        }
      }

      // Color match — 5 (check product name/description for color mentions)
      if (prefColors.length > 0) {
        const text = `${product.name} ${product.description || ""}`.toLowerCase();
        if (prefColors.some((c) => text.includes(c.toLowerCase()))) {
          score += 5 * w.preference;
        }
      }

      // Price in preferred range — 10
      if (prefPriceRange[0] > 0 || prefPriceRange[1] < 100000) {
        if (product.price >= prefPriceRange[0] && product.price <= prefPriceRange[1]) {
          score += 10 * w.preference;
        }
      }

      // Recency (created in last 30 days) — 5
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - new Date(product.created_at).getTime() < thirtyDays) {
        score += 5 * w.recency;
      }

      // Social proof — 5
      if (socialProof && socialProof.averageRating && socialProof.averageRating >= 4.5) {
        score += 5 * w.popularity;
      }

      // Featured / admin boost — 10
      if (product.is_featured) {
        score += 5 * w.popularity;
      }
      if (w.adminBoostIds.includes(product.id)) {
        score += 10;
      }

      // Already viewed penalty — -5
      if (profile.recentProductIds.includes(product.id)) {
        score -= 5;
      }

      // Normalize to 0-100
      const maxPossible = 20 * w.behavior + 15 * w.preference + 10 * w.preference + 5 * w.preference + 10 * w.preference + 5 * w.recency + 5 * w.popularity + 5 * w.popularity + 10;
      return Math.max(0, Math.min(100, (score / Math.max(maxPossible, 1)) * 100));
    },
    [w, behaviorCatScores, maxBehaviorCatScore, prefCategories, prefMaterials, prefColors, prefPriceRange, profile],
  );

  const rankProducts = useCallback(
    (products: CatalogProduct[], socialProofMap?: Map<string, ProductSocialProof>, limit?: number): CatalogProduct[] => {
      const scored = products.map((p) => ({
        product: p,
        score: scoreProduct(p, socialProofMap?.get(p.id)),
      }));
      scored.sort((a, b) => b.score - a.score);
      const sorted = scored.map((s) => s.product);
      return limit ? sorted.slice(0, limit) : sorted;
    },
    [scoreProduct],
  );

  const getTopCategories = useCallback((): string[] => {
    // Merge behavior top categories with preference categories
    const merged = new Map<string, number>();
    profile.topCategories.forEach((id, i) => {
      merged.set(id, (merged.get(id) || 0) + (10 - i));
    });
    // Preference categories are names, not IDs — so behavioral ones dominate
    return [...merged.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);
  }, [profile.topCategories]);

  const getPersonalizedSections = useCallback(
    (products: CatalogProduct[], socialProofMap: Map<string, ProductSocialProof>): RecommendationSection[] => {
      if (!products.length) return [];

      const sections: RecommendationSection[] = [];
      const usedIds = new Set<string>();

      // 1. "Recommended for you" — top scored, excluding recent views
      const recentSet = new Set(profile.recentProductIds);
      const recommended = rankProducts(
        products.filter((p) => !recentSet.has(p.id)),
        socialProofMap,
        4,
      );
      if (recommended.length >= 2) {
        sections.push({
          key: "recommended",
          title: "Recommended for you",
          subtitle: "Personalized picks based on your preferences and activity",
          products: recommended,
        });
        recommended.forEach((p) => usedIds.add(p.id));
      }

      // 2. "Trending for your interests"
      const trending = products
        .filter((p) => !usedIds.has(p.id))
        .filter((p) => {
          const proof = socialProofMap.get(p.id);
          return proof && proof.weeklyReviewCount >= 1;
        })
        .sort((a, b) => {
          const sa = scoreProduct(a, socialProofMap.get(a.id));
          const sb = scoreProduct(b, socialProofMap.get(b.id));
          return sb - sa;
        })
        .slice(0, 4);
      if (trending.length >= 2) {
        sections.push({
          key: "trending-interests",
          title: "Trending for your interests",
          subtitle: "Popular items that match your taste",
          products: trending,
        });
        trending.forEach((p) => usedIds.add(p.id));
      }

      // 3. Top rated
      const topRated = products
        .filter((p) => !usedIds.has(p.id))
        .filter((p) => {
          const proof = socialProofMap.get(p.id);
          return proof && proof.averageRating && proof.averageRating >= 4.5 && proof.reviewCount >= 2;
        })
        .sort((a, b) => {
          const pa = socialProofMap.get(a.id);
          const pb = socialProofMap.get(b.id);
          return (pb?.averageRating ?? 0) - (pa?.averageRating ?? 0);
        })
        .slice(0, 4);
      if (topRated.length >= 2) {
        sections.push({
          key: "top-rated",
          title: "Highest rated",
          subtitle: "Loved by our community",
          products: topRated,
        });
        topRated.forEach((p) => usedIds.add(p.id));
      }

      // 4. New arrivals
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const newArrivals = products
        .filter((p) => !usedIds.has(p.id) && new Date(p.created_at).getTime() > thirtyDaysAgo)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4);
      if (newArrivals.length >= 2) {
        sections.push({
          key: "new-arrivals",
          title: "Just dropped",
          subtitle: "Fresh additions to the collection",
          products: newArrivals,
        });
        newArrivals.forEach((p) => usedIds.add(p.id));
      }

      // 5. Budget-friendly for returning users
      const segment = getUserSegment();
      if (segment !== "new") {
        const budgetPicks = products
          .filter((p) => !usedIds.has(p.id))
          .sort((a, b) => a.price - b.price)
          .slice(0, 4);
        if (budgetPicks.length >= 2) {
          sections.push({
            key: "budget",
            title: "Great value picks",
            subtitle: "Quality prints at friendly prices",
            products: budgetPicks,
          });
        }
      }

      return sections.slice(0, 3);
    },
    [profile, rankProducts, scoreProduct, getUserSegment],
  );

  const resetPersonalization = useCallback(() => {
    localStorage.removeItem(BEHAVIOR_KEY);
    localStorage.removeItem(CHOICES_KEY);
    window.location.reload();
  }, []);

  return {
    scoreProduct,
    rankProducts,
    getPersonalizedSections,
    getTopCategories,
    getUserSegment,
    resetPersonalization,
    profile,
    prefMaterials,
    prefColors,
    prefCategories,
  };
}
