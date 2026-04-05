import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const engine = usePersonalizationEngine();
  const { recommendations } = useSmartRecommendations(products, socialProofMap);

  const topCatIds = engine.getTopCategories();

  const topCategoryChips = useMemo(() => {
    if (!topCatIds.length || !categories.length) return [];
    return topCatIds
      .map((id) => categories.find((c) => c.id === id))
      .filter(Boolean)
      .slice(0, 4) as { id: string; name: string; slug: string }[];
  }, [topCatIds, categories]);

  return (
    <div className="space-y-12">
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

      {/* Smart recommendation sections — no badges, no subtitles by default */}
      {recommendations.map((section) => (
        <SmartRecommendationSection
          key={section.key}
          section={section}
          socialProofMap={socialProofMap}
          settings={{ showBadge: false, showSubtitle: false, showTitle: true }}
        />
      ))}
    </div>
  );
}
