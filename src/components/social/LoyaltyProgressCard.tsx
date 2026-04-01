import { motion } from "framer-motion";
import { Star, Gift, Truck, Zap, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { LoyaltyProgressData, RewardTier } from "@/hooks/use-loyalty-progress";

interface LoyaltyProgressCardProps {
  progress: LoyaltyProgressData;
  variant?: "full" | "compact";
}

function tierIcon(tier: RewardTier) {
  if (tier.discountType === "free_shipping") return <Truck className="h-3 w-3" />;
  if (tier.discountType === "gift_card") return <Gift className="h-3 w-3" />;
  return <Star className="h-3 w-3" />;
}

export default function LoyaltyProgressCard({ progress, variant = "full" }: LoyaltyProgressCardProps) {
  const { balance, nextReward, pointsToNext, progressPercent, canRedeem, message, allTiers } = progress;

  if (variant === "compact") {
    if (balance === 0) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-primary/20 bg-primary/5 p-3"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            <span>{balance} pts</span>
          </div>
          {nextReward && (
            <span className="text-[11px] text-muted-foreground">
              {pointsToNext} to {nextReward.name.toLowerCase()}
            </span>
          )}
        </div>
        <Progress value={progressPercent} className="h-1.5" />
        {canRedeem && (
          <p className="mt-1.5 text-[11px] font-medium text-primary">
            <Zap className="mr-0.5 inline h-3 w-3" /> Rewards ready to redeem!
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-foreground">{balance}</p>
                <p className="text-xs text-muted-foreground">loyalty points</p>
              </div>
            </div>
          </div>
          {canRedeem && (
            <Badge className="bg-primary/10 text-primary border-primary/20 font-display text-[10px] uppercase tracking-wider">
              <Zap className="mr-1 h-3 w-3" /> Rewards available
            </Badge>
          )}
        </div>

        {/* Progress bar with milestone markers */}
        <div className="relative mb-2">
          <Progress value={progressPercent} className="h-2.5" />
          {/* Milestone dots */}
          <div className="absolute inset-x-0 top-0 h-2.5">
            {allTiers.slice(0, 5).map((tier) => {
              const maxTierCost = allTiers[allTiers.length - 1].pointsCost;
              const position = Math.min(100, (tier.pointsCost / (nextReward ? Math.max(nextReward.pointsCost, maxTierCost * 0.4) : maxTierCost)) * 100);
              if (position > 100) return null;
              const achieved = balance >= tier.pointsCost;
              return (
                <div
                  key={tier.key}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${Math.min(position, 97)}%` }}
                  title={`${tier.name} — ${tier.pointsCost} pts`}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all ${
                      achieved
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {tierIcon(tier)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Message */}
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>

        {/* Next milestone detail */}
        {nextReward && pointsToNext > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {tierIcon(nextReward)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{nextReward.name}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-primary">{pointsToNext}</span> points to go •{" "}
                {nextReward.pointsCost} pts needed
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
