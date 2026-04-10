import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface MiniCartProps {
  cartButtonRef: React.RefObject<HTMLButtonElement | null>;
  cartPulse: boolean;
  cartGlow: boolean;
  totalItems: number;
}

const MiniCart = ({ cartButtonRef, cartPulse, cartGlow, totalItems }: MiniCartProps) => {
  const { t } = useTranslation();

  return (
    <div className="relative">
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
            aria-label={t("nav.cart", { defaultValue: "Cart" })}
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
    </div>
  );
};

export default MiniCart;
