import { motion } from "framer-motion";
import { Eye, Clock, Flame } from "lucide-react";
import { useSocialProof, formatRelativePurchaseTime } from "@/hooks/use-social-proof";

interface SocialProofBadgesProps {
  productId: string;
  variant?: "full" | "compact";
}

export default function SocialProofBadges({ productId, variant = "full" }: SocialProofBadgesProps) {
  const { data } = useSocialProof(variant === "full" ? productId : undefined);

  // For compact mode, use lightweight pseudo data
  const viewingNow = data?.viewingNow ?? 0;
  const lastPurchased = data?.lastPurchasedAt;
  const weeklyPurchases = data?.purchaseCountThisWeek ?? 0;

  if (variant === "compact") {
    if (viewingNow < 5) return null;
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        <span>{viewingNow} viewing</span>
      </div>
    );
  }

  const showViewing = viewingNow >= 3;
  const showPurchase = lastPurchased || weeklyPurchases >= 2;

  if (!showViewing && !showPurchase) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="flex flex-wrap gap-2"
    >
      {showViewing && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50 duration-[2s]" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <Eye className="h-3 w-3" />
          <span>
            <span className="font-medium text-foreground">{viewingNow}</span> viewing now
          </span>
        </div>
      )}

      {weeklyPurchases >= 2 && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          <Flame className="h-3 w-3 text-primary" />
          <span>
            Purchased <span className="font-medium text-foreground">{weeklyPurchases}</span> times this week
          </span>
        </div>
      )}

      {lastPurchased && weeklyPurchases < 2 && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span>
            Last purchased{" "}
            <span className="font-medium text-foreground">
              {formatRelativePurchaseTime(lastPurchased)}
            </span>
          </span>
        </div>
      )}
    </motion.div>
  );
}
