import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, RotateCcw, Gift, Layers, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRecentlyViewedProducts } from "@/hooks/use-recently-viewed";
import RecentlyViewedSection from "@/components/product/RecentlyViewedSection";
import SmartRecommendationSection from "./SmartRecommendationSection";
import { useSmartRecommendations } from "@/hooks/use-smart-recommendations";
import { usePersonalizationEngine } from "@/hooks/use-personalization-engine";
import type { CatalogProduct } from "@/hooks/use-storefront";
import type { ProductSocialProof } from "@/lib/social-proof";

interface Props {
  products: CatalogProduct[];
  socialProofMap: Map<string, ProductSocialProof>;
  categories?: { id: string; name: string; slug: string }[];
}

export default function SmartHomeSections({ products, socialProofMap, categories = [] }: Props) {
  const { recentProducts } = useRecentlyViewedProducts();
  const engine = usePersonalizationEngine();
  const { recommendations } = useSmartRecommendations(products, socialProofMap);

  const segment = engine.getUserSegment();
  const topCatIds = engine.getTopCategories();

  // Map top category IDs to names
  const topCategoryChips = useMemo(() => {
    if (!topCatIds.length || !categories.length) return [];
    return topCatIds
      .map((id) => categories.find((c) => c.id === id))
      .filter(Boolean)
      .slice(0, 4) as { id: string; name: string; slug: string }[];
  }, [topCatIds, categories]);

  const showShortcuts = engine.profile.isReturningUser || engine.profile.usesCustomTools || engine.profile.isGiftShopper;

  return (
    <div className="space-y-12">
      {/* Segment-aware greeting */}
      {(segment === "engaged" || segment === "loyal") && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground"
        >
          Welcome back 👋
        </motion.p>
      )}

      {/* Personalized category chips */}
      {topCategoryChips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          {topCategoryChips.map((cat) => (
            <Link key={cat.id} to={`/products?category=${cat.slug}`}>
              <Badge
                variant="outline"
                className="gap-1.5 rounded-full px-3 py-1 text-xs cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <Tag className="h-3 w-3 text-primary" />
                {cat.name}
              </Badge>
            </Link>
          ))}
        </motion.div>
      )}

      {/* Quick action shortcuts for returning users */}
      {showShortcuts && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-3"
        >
          {engine.profile.usesCustomTools && (
            <Link to="/create">
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                <Layers className="h-3.5 w-3.5" />
                Continue custom print
              </Button>
            </Link>
          )}
          {engine.profile.usesLithophane && (
            <Link to="/create">
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                <Sparkles className="h-3.5 w-3.5" />
                Create lithophane
              </Button>
            </Link>
          )}
          {engine.profile.isGiftShopper && (
            <Link to="/products">
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                <Gift className="h-3.5 w-3.5" />
                Find gifts
              </Button>
            </Link>
          )}
          {engine.profile.isReturningUser && (
            <Link to="/account">
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                <RotateCcw className="h-3.5 w-3.5" />
                Reorder
              </Button>
            </Link>
          )}
        </motion.div>
      )}

      {/* Recently viewed */}
      {recentProducts.length > 0 && (
        <RecentlyViewedSection
          products={recentProducts}
          title="Pick up where you left off"
          maxItems={6}
        />
      )}

      {/* Smart recommendation sections */}
      {recommendations.map((section) => (
        <SmartRecommendationSection
          key={section.key}
          section={section}
          socialProofMap={socialProofMap}
        />
      ))}
    </div>
  );
}
