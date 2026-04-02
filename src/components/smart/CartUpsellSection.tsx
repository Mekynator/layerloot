import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, TrendingUp, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/currency";
import { usePersonalizationEngine } from "@/hooks/use-personalization-engine";
import type { CatalogProduct } from "@/hooks/use-storefront";

interface Props {
  cartProductIds: string[];
  allProducts: CatalogProduct[];
  freeShippingGap: number;
  onQuickAdd?: (product: CatalogProduct) => void;
}

export default function CartUpsellSection({ cartProductIds, allProducts, freeShippingGap, onQuickAdd }: Props) {
  const engine = usePersonalizationEngine();

  const upsells = useMemo(() => {
    const cartSet = new Set(cartProductIds);
    const candidates = allProducts.filter((p) => !cartSet.has(p.id));

    // If close to free shipping, prioritize products that fill the gap, ranked by personalization
    if (freeShippingGap > 0 && freeShippingGap <= 200) {
      const fillers = candidates
        .filter((p) => p.price <= freeShippingGap + 50 && p.price >= freeShippingGap * 0.5);
      const ranked = engine.rankProducts(fillers, undefined, 3);
      if (ranked.length > 0) return { type: "shipping" as const, products: ranked };
    }

    // Otherwise rank all candidates by personalization score
    const ranked = engine.rankProducts(candidates, undefined, 3);
    return { type: "popular" as const, products: ranked };
  }, [cartProductIds, allProducts, freeShippingGap, engine.rankProducts]);

  if (upsells.products.length === 0) return null;

  const isShippingUpsell = upsells.type === "shipping";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        {isShippingUpsell ? (
          <>
            <Package className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
              Add {formatPrice(freeShippingGap)} more for free shipping
            </h3>
          </>
        ) : (
          <>
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
              Complete your order
            </h3>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {upsells.products.map((product) => (
          <div
            key={product.id}
            className="flex gap-3 rounded-xl border border-border/60 bg-background/40 p-3 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <Link to={`/products/${product.slug}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              <img
                src={product.images?.[0] || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <Link to={`/products/${product.slug}`} className="line-clamp-1 text-sm font-semibold text-foreground hover:underline">
                  {product.name}
                </Link>
                <p className="text-sm font-bold text-primary">{formatPrice(product.price)}</p>
              </div>
              {onQuickAdd && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 h-7 text-xs"
                  onClick={() => onQuickAdd(product)}
                >
                  <Zap className="mr-1 h-3 w-3" /> Quick add
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
