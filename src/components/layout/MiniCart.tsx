import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/currency";
import { useFreeShippingProgress } from "@/hooks/use-free-shipping-progress";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

interface MiniCartProps {
  cartButtonRef: React.RefObject<HTMLButtonElement | null>;
  cartPulse: boolean;
  cartGlow: boolean;
  totalItems: number;
}

const MiniCart = ({ cartButtonRef, cartPulse, cartGlow, totalItems }: MiniCartProps) => {
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, totalPrice } = useCart();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 250);
  }, []);

  const { remaining, progress, unlocked } = useFreeShippingProgress(totalPrice);

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link to="/cart">
        <motion.div
          animate={cartPulse ? { scale: [1, 0.92, 1.12, 1], rotate: [0, -6, 4, 0] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Button
            ref={cartButtonRef}
            variant="ghost"
            size="icon"
            className={`relative text-muted-foreground transition-all hover:text-foreground ${cartGlow ? "shadow-[0_0_28px_hsl(var(--primary)/0.35)]" : ""}`}
            aria-label={t("nav.cart", "Cart")}
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <motion.span
                key={totalItems}
                initial={{ scale: 0.7, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-[10px] font-bold text-primary-foreground"
              >
                {totalItems}
              </motion.span>
            )}
          </Button>
        </motion.div>
      </Link>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border/20 bg-card/95 shadow-2xl backdrop-blur-2xl"
          >
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <ShoppingBag className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t("cart.empty", "Your cart is empty")}</p>
                <Link to="/products">
                  <Button size="sm" variant="outline" className="font-display text-xs uppercase tracking-wider">
                    {t("cart.browseProducts", "Browse Products")}
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="max-h-64 overflow-y-auto p-3 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/20 transition-colors">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover border border-border/10" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted/30 flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">×{item.quantity}</span>
                          <span className="text-xs font-semibold text-primary">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeItem(item.id); }}
                        className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Free shipping */}
                <div className="px-3 py-2 border-t border-border/10">
                  {unlocked ? (
                    <p className="text-[10px] font-semibold text-green-500 font-display uppercase tracking-wider">
                      🎉 {t("cart.freeShippingUnlocked", "Free shipping unlocked!")}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground">
                        {t("cart.awayFromFreeShipping", "{{amount}} away from free shipping", { amount: formatPrice(remaining) })}
                      </p>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="px-3 py-2 border-t border-border/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-display uppercase tracking-wider">{t("cart.subtotal", "Subtotal")}</span>
                    <span className="text-sm font-bold text-foreground">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 p-3 border-t border-border/10">
                  <Link to="/cart" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full font-display text-xs uppercase tracking-wider">
                      {t("cart.viewCart", "View Cart")}
                    </Button>
                  </Link>
                  <Link to="/cart" className="flex-1">
                    <Button size="sm" className="w-full font-display text-xs uppercase tracking-wider">
                      {t("cart.checkout", "Checkout")} <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MiniCart;
