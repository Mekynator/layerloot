import { useMemo } from "react";
import { usePersonalizationEngine } from "./use-personalization-engine";
import type { CatalogProduct } from "./use-storefront";
import type { ProductSocialProof } from "@/lib/social-proof";

export type RecommendationSection = {
  key: string;
  title: string;
  subtitle: string;
  products: CatalogProduct[];
};

/**
 * Recommendation engine powered by the unified personalization engine.
 */
export function useSmartRecommendations(
  allProducts: CatalogProduct[],
  socialProofMap: Map<string, ProductSocialProof>,
  currentProductId?: string,
) {
  const engine = usePersonalizationEngine();

  const recommendations = useMemo(() => {
    if (!allProducts.length) return [];
    const available = currentProductId
      ? allProducts.filter((p) => p.id !== currentProductId)
      : allProducts;
    return engine.getPersonalizedSections(available, socialProofMap);
  }, [allProducts, socialProofMap, currentProductId, engine.getPersonalizedSections]);

  return { recommendations, profile: engine.profile };
}
