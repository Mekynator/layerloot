import { motion } from "framer-motion";
import { Flame, Eye, ShoppingBag, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSocialProof, formatRelativePurchaseTime } from "@/hooks/use-social-proof";

interface Props {
  productId: string;
  stock: number;
}

export default function ProductFOMOBar({ productId, stock }: Props) {
  const { t } = useTranslation("common");
  const { data } = useSocialProof(productId);

  const viewingNow = data?.viewingNow ?? 0;
  const weeklyPurchases = data?.purchaseCountThisWeek ?? 0;
  const lastPurchased = data?.lastPurchasedAt;

  const signals: { icon: React.ReactNode; text: string; highlight?: boolean }[] = [];

  if (viewingNow >= 5) {
    signals.push({
      icon: <Eye className="h-3.5 w-3.5" />,
      text: t("fomo.viewingNow", { count: viewingNow }),
      highlight: viewingNow >= 10,
    });
  }

  if (weeklyPurchases >= 2) {
    signals.push({
      icon: <Flame className="h-3.5 w-3.5" />,
      text: t("fomo.purchasedThisWeek", { count: weeklyPurchases }),
      highlight: true,
    });
  } else if (lastPurchased) {
    signals.push({
      icon: <ShoppingBag className="h-3.5 w-3.5" />,
      text: t("fomo.lastBought", { time: formatRelativePurchaseTime(lastPurchased) }),
    });
  }

  if (stock > 0 && stock <= 10) {
    signals.push({
      icon: <Clock className="h-3.5 w-3.5" />,
      text: stock <= 3
        ? t("fomo.onlyLeft", { count: stock })
        : t("fomo.remaining", { count: stock }),
      highlight: stock <= 3,
    });
  }

  if (signals.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex flex-wrap gap-2"
    >
      {signals.map((signal, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 + i * 0.1 }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs backdrop-blur-sm ${
            signal.highlight
              ? "bg-primary/10 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.1)]"
              : "bg-card/60 text-muted-foreground shadow-[0_2px_8px_hsl(225_44%_4%/0.3)]"
          }`}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            {signal.highlight && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50 duration-[2s]" />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${signal.highlight ? "bg-primary" : "bg-muted-foreground/50"}`} />
          </span>
          {signal.icon}
          <span>{signal.text}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
