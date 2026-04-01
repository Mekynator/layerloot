import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Repeat, Gift, Star, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/currency";
import type { CatalogProduct } from "@/hooks/use-storefront";

interface Props {
  recentProducts: CatalogProduct[];
  allProducts: CatalogProduct[];
  onQuickAdd?: (product: CatalogProduct) => void;
}

export default function PostPurchaseRecommendations({ recentProducts, allProducts, onQuickAdd }: Props) {
  if (recentProducts.length === 0 || allProducts.length === 0) return null;

  const recentIds = new Set(recentProducts.map((p) => p.id));
  const recentCategoryIds = new Set(recentProducts.map((p) => p.category_id).filter(Boolean));

  // Related by category
  const related = allProducts
    .filter((p) => !recentIds.has(p.id) && p.category_id && recentCategoryIds.has(p.category_id))
    .slice(0, 3);

  // Gift suggestions (featured items not already purchased)
  const giftSuggestions = allProducts
    .filter((p) => !recentIds.has(p.id) && p.is_featured)
    .slice(0, 2);

  const suggestions = [...related, ...giftSuggestions].slice(0, 4);
  if (suggestions.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="space-y-5"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">
          Your next best purchase
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {suggestions.map((product) => (
          <motion.div
            key={product.id}
            whileHover={{ y: -2 }}
            className="glass-card group overflow-hidden rounded-xl border border-white/[0.06] transition-all hover:border-primary/30"
          >
            <Link to={`/products/${product.slug}`} className="block">
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={product.images?.[0] || "/placeholder.svg"}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {product.is_featured && (
                  <Badge className="absolute left-2 top-2 border-primary/20 bg-primary/10 text-[10px] text-primary">
                    <Star className="mr-1 h-3 w-3" /> Featured
                  </Badge>
                )}
              </div>
            </Link>
            <div className="p-3 space-y-2">
              <Link to={`/products/${product.slug}`}>
                <p className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {product.name}
                </p>
              </Link>
              <div className="flex items-center justify-between">
                <p className="font-display text-sm font-bold text-primary">{formatPrice(product.price)}</p>
                {onQuickAdd && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-primary hover:bg-primary/10"
                    onClick={() => onQuickAdd(product)}>
                    Add <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
