import { useMemo } from "react";
import type { CatalogProduct } from "./use-storefront";
import type { ProductSocialProof } from "@/lib/social-proof";
import { usePersonalizationEngine } from "./use-personalization-engine";
import { useRecentlyViewedProducts } from "./use-recently-viewed";
import { useCart } from "@/contexts/CartContext";
import { useUserSignals } from "./use-user-signals";
import type { RecommendationConfig } from "@/lib/personalization";

const SAVED_ITEMS_KEY = "layerloot-saved-items";

function getSavedItemIds(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Personalized product recommendations based on configurable modes.
 * Supports: recently_viewed, saved_items, cart_based, category_interest,
 * bestsellers, featured, manual, and campaign_featured modes with fallbacks.
 */
export function usePersonalizedRecommendations(
  allProducts: CatalogProduct[],
  socialProofMap: Map<string, ProductSocialProof>,
  config: RecommendationConfig,
  excludeProductId?: string,
) {
  const engine = usePersonalizationEngine();
  const { recentProducts } = useRecentlyViewedProducts();
  const { items: cartItems } = useCart();
  const { signals } = useUserSignals();

  const products = useMemo(() => {
    const available = excludeProductId
      ? allProducts.filter((p) => p.id !== excludeProductId)
      : allProducts;

    if (!available.length) return [];

    const result = resolveMode(config.mode, available, socialProofMap, engine, recentProducts, cartItems, signals, config);
    if (result.length >= config.limit) return result.slice(0, config.limit);

    // Fallback mode if primary didn't return enough
    const fallback = resolveMode(config.fallbackMode, available, socialProofMap, engine, recentProducts, cartItems, signals, config);
    const resultIds = new Set(result.map((p) => p.id));
    const merged = [...result, ...fallback.filter((p) => !resultIds.has(p.id))];
    return merged.slice(0, config.limit);
  }, [allProducts, socialProofMap, config, excludeProductId, engine, recentProducts, cartItems, signals]);

  return { products };
}

function resolveMode(
  mode: RecommendationConfig["mode"],
  available: CatalogProduct[],
  socialProofMap: Map<string, ProductSocialProof>,
  engine: ReturnType<typeof usePersonalizationEngine>,
  recentProducts: { id: string }[],
  cartItems: { id: string; slug?: string }[],
  signals: ReturnType<typeof useUserSignals>["signals"],
  config: RecommendationConfig,
): CatalogProduct[] {
  const limit = config.limit;

  switch (mode) {
    case "recently_viewed": {
      const recentIds = recentProducts.map((p) => p.id);
      return available.filter((p) => recentIds.includes(p.id)).slice(0, limit);
    }

    case "saved_items": {
      const savedIds = getSavedItemIds();
      return available.filter((p) => savedIds.includes(p.id)).slice(0, limit);
    }

    case "cart_based": {
      // Products from the same categories as cart items
      const cartProductIds = new Set(cartItems.map((ci) => ci.id));
      const cartProducts = available.filter((p) => cartProductIds.has(p.id));
      const cartCategories = new Set(cartProducts.map((p) => p.category_id).filter(Boolean));
      return available
        .filter((p) => !cartProductIds.has(p.id) && p.category_id && cartCategories.has(p.category_id))
        .slice(0, limit);
    }

    case "past_orders":
    case "category_interest": {
      // Use personalization engine scoring
      return engine.rankProducts(available, socialProofMap, limit);
    }

    case "campaign_featured": {
      if (!signals.activeCampaignId) return [];
      return available.filter((p) => p.is_featured).slice(0, limit);
    }

    case "bestsellers": {
      return [...available]
        .sort((a, b) => {
          const sa = socialProofMap.get(a.id);
          const sb = socialProofMap.get(b.id);
          return (sb?.reviewCount ?? 0) - (sa?.reviewCount ?? 0);
        })
        .slice(0, limit);
    }

    case "featured": {
      const featured = available.filter((p) => p.is_featured);
      return featured.length >= 2
        ? featured.slice(0, limit)
        : available.slice(0, limit);
    }

    case "manual": {
      if (!config.manualProductIds?.length) return [];
      const idSet = new Set(config.manualProductIds);
      return available.filter((p) => idSet.has(p.id)).slice(0, limit);
    }

    default:
      return available.slice(0, limit);
  }
}
