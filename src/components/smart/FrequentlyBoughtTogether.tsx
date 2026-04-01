import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShoppingCart, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/currency";
import type { CatalogProduct } from "@/hooks/use-storefront";

interface Props {
  products: CatalogProduct[];
  onAddAll?: () => void;
}

export default function FrequentlyBoughtTogether({ products, onAddAll }: Props) {
  if (products.length < 2) return null;

  const bundleTotal = products.reduce((sum, p) => sum + p.price, 0);
  const discount = Math.round(bundleTotal * 0.1);
  const bundlePrice = bundleTotal - discount;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
          Frequently bought together
        </h3>
        <Badge variant="outline" className="ml-auto border-primary/20 bg-primary/5 text-xs text-primary">
          Save {formatPrice(discount)}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {products.map((product, i) => (
          <div key={product.id} className="flex items-center gap-3">
            {i > 0 && <span className="text-lg font-bold text-muted-foreground">+</span>}
            <Link
              to={`/products/${product.slug}`}
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-2 transition-all hover:border-primary/30"
            >
              <div className="h-14 w-14 overflow-hidden rounded-lg bg-muted">
                <img
                  src={product.images?.[0] || "/placeholder.svg"}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-medium text-foreground">{product.name}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(product.price)}</p>
              </div>
            </Link>
          </div>
        ))}

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground line-through">{formatPrice(bundleTotal)}</p>
            <p className="font-display text-lg font-bold text-primary">{formatPrice(bundlePrice)}</p>
          </div>
          {onAddAll && (
            <Button onClick={onAddAll} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Add bundle
            </Button>
          )}
        </div>
      </div>
    </motion.section>
  );
}
