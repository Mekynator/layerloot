import { useEffect, useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/currency";
import { useTranslation } from "react-i18next";

interface StickyAddToCartProps {
  product: { name: string; images?: string[] | null; slug: string };
  price: number;
  stock: number;
  disabled?: boolean;
  onAddToCart: () => void;
  justAdded?: boolean;
  /** Ref to the original add-to-cart section — bar shows when this scrolls out of view */
  observeRef: React.RefObject<HTMLElement | null>;
  /** Ref to a page-end sentinel — bar hides when this scrolls into view */
  hideRef?: React.RefObject<HTMLElement | null>;
  variantLabel?: string;
}

const StickyAddToCart = ({
  product,
  price,
  stock,
  disabled,
  onAddToCart,
  justAdded,
  observeRef,
  hideRef,
  variantLabel,
}: StickyAddToCartProps) => {
  const { t } = useTranslation("common");
  const [cartOutOfView, setCartOutOfView] = useState(false);
  const [nearPageEnd, setNearPageEnd] = useState(false);

  useEffect(() => {
    const el = observeRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCartOutOfView(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [observeRef]);

  useEffect(() => {
    const el = hideRef?.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNearPageEnd(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hideRef]);

  const visible = cartOutOfView && !nearPageEnd;
  const image = product.images?.[0] || "/placeholder.svg";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-border/20 bg-secondary/90 shadow-[0_-4px_30px_hsl(var(--primary)/0.1)] backdrop-blur-2xl"
        >
          <div
            className="container flex items-center gap-3 pt-3"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
          >
            <img
              src={image}
              alt={product.name}
              className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xs font-semibold uppercase text-foreground">
                {product.name}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold text-primary">
                  {formatPrice(price)}
                </span>
                {variantLabel && (
                  <span className="truncate text-xs text-muted-foreground">{variantLabel}</span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 font-display uppercase tracking-wider"
              onClick={onAddToCart}
              disabled={disabled}
            >
              {justAdded ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  {t("products.addedToCart", "Added")}
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-1 h-4 w-4" />
                  {t("products.addToCart", "Add to Cart")}
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyAddToCart;
