import { Truck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useFreeShippingProgress } from "@/hooks/use-free-shipping-progress";
import { formatPrice } from "@/lib/currency";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface FreeShippingBarProps {
  subtotal: number;
  threshold?: number;
  className?: string;
}

const FreeShippingBar = ({ subtotal, threshold, className = "" }: FreeShippingBarProps) => {
  const { t } = useTranslation("common");
  const { remaining, progress, unlocked } = useFreeShippingProgress(subtotal, threshold);

  if (subtotal === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-sm">
        <Truck className="h-4 w-4 text-primary" />
        {unlocked ? (
          <motion.span
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="font-display text-xs font-semibold uppercase tracking-wider text-green-600"
          >
            🎉 {t("cart.freeShippingUnlocked", "Free shipping unlocked!")}
          </motion.span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {t("cart.awayFromFreeShipping", "{{amount}} away from free shipping", { amount: formatPrice(remaining) })}
          </span>
        )}
      </div>
      <motion.div
        key={Math.round(progress)}
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
      >
        <Progress value={progress} className="h-2" />
      </motion.div>
    </div>
  );
};

export default FreeShippingBar;
