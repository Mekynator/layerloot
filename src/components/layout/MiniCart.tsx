// Disable rule in this file: some third-party hooks return loosely-typed values
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import type { CartItem } from "@/types/cart";
import { useAuth } from "@/contexts/AuthContext";
import { saveProduct } from "@/lib/savedItems";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { ShoppingCart, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/currency";
import { useFreeShippingProgress } from "@/hooks/use-free-shipping-progress";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";

interface MiniCartProps {
  cartButtonRef: React.RefObject<HTMLButtonElement | null>;
  cartPulse: boolean;
  cartGlow: boolean;
  totalItems: number;
}

const MiniCart = ({ cartButtonRef, cartPulse, cartGlow, totalItems }: MiniCartProps) => {
  type TFunction = (key: string, options?: Record<string, unknown> | string | number | undefined) => string;
  const { t } = useTranslation() as { t: TFunction };
  type LocalCartCtx = {
    items: CartItem[];
    removeItem: (id: string) => void;
    updateQuantity: (id: string, qty: number) => void;
    totalPrice: number;
  };

  const cartCtx = useCart() as LocalCartCtx;
  const items = cartCtx.items;
  const removeItem = cartCtx.removeItem;
  const updateQuantity = cartCtx.updateQuantity;
  const totalPrice = cartCtx.totalPrice;
  const { user } = useAuth();
  const { toast } = useToast();
    // Move to Saved handler (shared logic)
    const handleMoveToSaved = async (item: CartItem) => {
      if (!user) {
        toast({ title: t("cart.loginToSave", "Please log in to save items") });
        return;
      }
      const result = await saveProduct(item.id, user.id);
      removeItem(item.id);
      window.dispatchEvent(new CustomEvent("layerloot:saved-items-updated"));
      const errMsg = (result as { error?: { message?: string } } | null)?.error?.message;
      if (!errMsg) {
        toast({ title: t("cart.movedToSaved", "Moved to Saved for Later"), description: item.name });
      } else {
        toast({ title: t("cart.saveFailed", "Could not save item"), description: errMsg, variant: "destructive" });
      }
    };
  const isMobile = useIsMobile();
  // Keep the cart icon and count but remove the floating dropdown for stability
  const [open] = useState(false);

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

      {/* Floating mini-cart dropdown removed to keep chat area and preview stable. */}
    </div>
  );
};

export default MiniCart;
