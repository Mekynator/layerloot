import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, RotateCcw, Gift, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRecentlyViewedProducts } from "@/hooks/use-recently-viewed";
import RecentlyViewedSection from "@/components/product/RecentlyViewedSection";
import SmartRecommendationSection from "./SmartRecommendationSection";
import { useSmartRecommendations } from "@/hooks/use-smart-recommendations";
import { useBehaviorTracking } from "@/hooks/use-behavior-tracking";
import type { CatalogProduct } from "@/hooks/use-storefront";
import type { ProductSocialProof } from "@/lib/social-proof";

interface Props {
  products: CatalogProduct[];
  socialProofMap: Map<string, ProductSocialProof>;
}

export default function SmartHomeSections({ products, socialProofMap }: Props) {
  const { recentProducts } = useRecentlyViewedProducts();
  const { getInterestProfile } = useBehaviorTracking();
  const profile = getInterestProfile();
  const { recommendations } = useSmartRecommendations(products, socialProofMap);

  // Show personalized shortcuts for returning users
  const showShortcuts = profile.isReturningUser || profile.usesCustomTools || profile.isGiftShopper;

  return (
    <div className="space-y-12">
      {/* Quick action shortcuts for returning users */}
      {showShortcuts && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-3"
        >
          {profile.usesCustomTools && (
            <Link to="/create">
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                <Layers className="h-3.5 w-3.5" />
                Continue custom print
              </Button>
            </Link>
          )}
          {profile.usesLithophane && (
            <Link to="/create">
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                <Sparkles className="h-3.5 w-3.5" />
                Create lithophane
              </Button>
            </Link>
          )}
          {profile.isGiftShopper && (
            <Link to="/products">
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                <Gift className="h-3.5 w-3.5" />
                Find gifts
              </Button>
            </Link>
          )}
          {profile.isReturningUser && (
            <Link to="/account">
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                <RotateCcw className="h-3.5 w-3.5" />
                Reorder
              </Button>
            </Link>
          )}
        </motion.div>
      )}

      {/* Recently viewed - "Continue where you left off" */}
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
