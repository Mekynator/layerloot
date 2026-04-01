import { useMemo } from "react";
import { useBehaviorTracking } from "./use-behavior-tracking";
import type { CatalogProduct } from "./use-storefront";
import type { ProductSocialProof } from "@/lib/social-proof";

export type RecommendationSection = {
  key: string;
  title: string;
  subtitle: string;
  products: CatalogProduct[];
};

/**
 * Frontend-driven recommendation engine.
 * Uses behavior tracking + catalog data to generate personalized sections.
 */
export function useSmartRecommendations(
  allProducts: CatalogProduct[],
  socialProofMap: Map<string, ProductSocialProof>,
  currentProductId?: string,
) {
  const { getInterestProfile } = useBehaviorTracking();
  const profile = getInterestProfile();

  const recommendations = useMemo(() => {
    if (!allProducts.length) return [];

    const sections: RecommendationSection[] = [];
    const excluded = new Set(currentProductId ? [currentProductId] : []);

    const available = allProducts.filter((p) => !excluded.has(p.id));

    // 1. "Because you viewed X" — same category as most-viewed
    if (profile.topCategories.length > 0) {
      const topCat = profile.topCategories[0];
      const catProducts = available
        .filter((p) => p.category_id === topCat && !profile.recentProductIds.includes(p.id))
        .slice(0, 4);
      if (catProducts.length >= 2) {
        sections.push({
          key: "because-viewed",
          title: "Inspired by your browsing",
          subtitle: "Based on what you've been exploring recently",
          products: catProducts,
        });
      }
    }

    // 2. Trending / hot products
    const trending = available
      .filter((p) => {
        const proof = socialProofMap.get(p.id);
        return proof && proof.weeklyReviewCount >= 1;
      })
      .sort((a, b) => {
        const pa = socialProofMap.get(a.id);
        const pb = socialProofMap.get(b.id);
        return (pb?.weeklyReviewCount ?? 0) - (pa?.weeklyReviewCount ?? 0);
      })
      .slice(0, 4);
    if (trending.length >= 2) {
      sections.push({
        key: "trending",
        title: "Trending now",
        subtitle: "Popular with other LayerLoot shoppers this week",
        products: trending,
      });
    }

    // 3. Top rated
    const topRated = available
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
    }

    // 4. New arrivals
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const newArrivals = available
      .filter((p) => new Date(p.created_at).getTime() > thirtyDaysAgo)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);
    if (newArrivals.length >= 2) {
      sections.push({
        key: "new-arrivals",
        title: "Just dropped",
        subtitle: "Fresh additions to the collection",
        products: newArrivals,
      });
    }

    // 5. Budget-friendly (lowest price, different from other sections)
    const usedIds = new Set(sections.flatMap((s) => s.products.map((p) => p.id)));
    const budgetPicks = available
      .filter((p) => !usedIds.has(p.id))
      .sort((a, b) => a.price - b.price)
      .slice(0, 4);
    if (budgetPicks.length >= 2 && profile.isReturningUser) {
      sections.push({
        key: "budget",
        title: "Great value picks",
        subtitle: "Quality prints at friendly prices",
        products: budgetPicks,
      });
    }

    return sections.slice(0, 3); // max 3 recommendation sections
  }, [allProducts, socialProofMap, profile, currentProductId]);

  return { recommendations, profile };
}
