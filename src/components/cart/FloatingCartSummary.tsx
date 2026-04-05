import { useState } from "react";
import { ShoppingBag, ChevronUp, ChevronDown, ArrowRight, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useFreeShippingProgress } from "@/hooks/use-free-shipping-progress";
import { formatPrice } from "@/lib/currency";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

const FloatingCartSummary = () => {
  const { t } = useTranslation("common");
  const { items, totalItems, totalPrice } = useCart();
  const { remaining, progress, unlocked } = useFreeShippingProgress(totalPrice);
  const [expanded, setExpanded] = useState(false);

  if (totalItems === 0) return null;

  const lastItem = items[items.length - 1];

  return (
    <motion.div
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed bottom-20 right-4 z-40 w-72 md:bottom-6"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="glass-card overflow-hidden glow-border">
        {/* Header – always visible */}
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/40"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {totalItems}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-semibold uppercase text-foreground">
              {t("cart.title", "Cart")}
            </p>
            <p className="text-xs text-muted-foreground">{formatPrice(totalPrice)}</p>
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 border-t border-border px-3 pb-3 pt-2">
                {/* Last added item */}
                {lastItem && (
                  <div className="flex items-center gap-2">
                    {lastItem.image && (
                      <img
                        src={lastItem.image}
                        alt=""
                        className="h-8 w-8 rounded-md border border-border object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{lastItem.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t("cart.qty", "Qty")}: {lastItem.quantity}
                      </p>
                    </div>
                  </div>
                )}

                {/* Free shipping progress */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Truck className="h-3 w-3" />
                    {unlocked ? (
                      <span className="font-medium text-green-600">
                        {t("cart.freeShippingUnlocked", "Free shipping unlocked!")}
                      </span>
                    ) : (
                      <span>
                        {formatPrice(remaining)} {t("cart.awayFromFreeShipping", "away from free shipping")}
                      </span>
                    )}
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>

                {/* CTA */}
                <div className="flex gap-2">
                  <Link to="/cart" className="flex-1">
                    <Button size="sm" variant="outline" className="w-full font-display text-xs uppercase tracking-wider">
                      {t("cart.viewCart", "View Cart")}
                    </Button>
                  </Link>
                  <Link to="/cart" className="flex-1">
                    <Button size="sm" className="w-full font-display text-xs uppercase tracking-wider">
                      {t("cart.checkout", "Checkout")}
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default FloatingCartSummary;
