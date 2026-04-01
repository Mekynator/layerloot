import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { useTranslation } from "react-i18next";
import type { ViewedProduct } from "@/hooks/use-recently-viewed";

interface RecentlyViewedSectionProps {
  products: ViewedProduct[];
  title?: string;
  maxItems?: number;
}

const RecentlyViewedSection = ({ products, title, maxItems = 6 }: RecentlyViewedSectionProps) => {
  const { t } = useTranslation("common");
  const displayed = products.slice(0, maxItems);

  if (displayed.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
          {title || t("products.recentlyViewed", "Recently Viewed")}
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {displayed.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`/products/${product.slug}`}
              className="group block w-36 shrink-0"
            >
              <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted transition-all group-hover:border-primary/40 group-hover:shadow-sm">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <p className="mt-1.5 truncate font-display text-xs font-semibold uppercase text-foreground">
                {product.name}
              </p>
              <p className="text-xs text-primary">{formatPrice(product.price)}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default RecentlyViewedSection;
