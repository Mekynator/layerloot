import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { computeLoyaltyProgress } from "@/hooks/use-loyalty-progress";
import LoyaltyProgressCard from "@/components/social/LoyaltyProgressCard";
import { RewardsGridSkeleton } from "@/components/shared/loading-states";
import type { AccountModuleProps, Voucher, RewardCatalogItem } from "./types";

interface Props extends AccountModuleProps {
  vouchers: Voucher[];
  overviewLoading: boolean;
}

const RewardsModule = ({ user, overview, refetchOverview, tt, vouchers, overviewLoading }: Props) => {
  const { toast } = useToast();
  const [redeemingKey, setRedeemingKey] = useState<string | null>(null);
  const pointsBalance = overview?.pointsBalance ?? 0;

  const redeemReward = async (reward: RewardCatalogItem) => {
    if (!user) return;
    if (pointsBalance < reward.points_cost) {
      toast({ title: tt("account.rewards.notEnoughPoints", "Not enough points"), variant: "destructive" });
      return;
    }
    setRedeemingKey(reward.id);
    const code = `LL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const isGiftCard = reward.discount_type === "gift_card";

    const { error: pointsError } = await supabase.from("loyalty_points").insert({
      user_id: user.id, points: -reward.points_cost, reason: `Redeemed: ${reward.name}`,
    });
    if (pointsError) {
      setRedeemingKey(null);
      toast({ title: tt("common.error", "Error"), description: pointsError.message, variant: "destructive" });
      return;
    }

    const { error: voucherError } = await supabase.from("user_vouchers").insert({
      user_id: user.id, voucher_id: reward.id, code, balance: isGiftCard ? reward.discount_value : null,
    });
    if (voucherError) {
      setRedeemingKey(null);
      toast({ title: tt("common.error", "Error"), description: voucherError.message, variant: "destructive" });
      return;
    }

    setRedeemingKey(null);
    toast({ title: "✨ " + tt("account.vouchers.redeemed", "Reward redeemed!"), description: `${tt("account.vouchers.code", "Your code")}: ${code}` });
    await refetchOverview();
  };

  return (
    <>
      {overviewLoading && !overview ? <RewardsGridSkeleton count={4} /> : null}
      {overview && (
        <div className="mb-6">
          <LoyaltyProgressCard progress={computeLoyaltyProgress(overview.pointsBalance, overview.pointsEarned, overview.pointsSpent)} variant="full" />
        </div>
      )}
      {vouchers.length === 0 && !overviewLoading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{tt("account.rewards.empty", "No rewards available right now.")}</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {vouchers.filter(v => v.is_active).sort((a, b) => ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0)).map(reward => {
            const canRedeem = pointsBalance >= reward.points_cost;
            const neededPoints = reward.points_cost - pointsBalance;
            return (
              <motion.div key={reward.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} whileHover={{ scale: 1.02 }}>
                <Card className="glass-card h-full shine-sweep border border-primary/10 hover:border-primary/30 transition-all duration-200">
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-center gap-2">
                      <div className="font-display text-lg uppercase">{reward.name}</div>
                      {(reward as any).badge_text && <Badge variant="outline" className="font-display text-xs">{(reward as any).badge_text}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{reward.description}</p>
                    {!canRedeem && (
                      <p className="text-xs text-muted-foreground">
                        {tt("account.rewards.needMore", "You need")} <span className="font-bold text-primary">{neededPoints}</span> {tt("account.rewards.morePoints", "more points")}
                      </p>
                    )}
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        {reward.discount_type === "free_shipping" ? (
                          <span className="font-display text-2xl font-bold text-primary">{tt("account.rewards.freeDelivery", "Free delivery")}</span>
                        ) : reward.discount_type === "gift_wrap" ? (
                          <span className="font-display text-2xl font-bold text-primary">{tt("account.rewards.freeGiftWrap", "Free gift wrap")}</span>
                        ) : (
                          <>
                            <span className="font-display text-2xl font-bold text-primary">{reward.discount_value} kr</span>
                            <span className="ml-1 text-sm text-muted-foreground">
                              {reward.discount_type === "gift_card" ? tt("account.rewards.giftCard", "gift card") : tt("account.rewards.discount", "discount")}
                            </span>
                          </>
                        )}
                      </div>
                      <Button size="sm" onClick={() => redeemReward(reward as unknown as RewardCatalogItem)} disabled={!canRedeem || redeemingKey === reward.id} className="font-display uppercase tracking-wider">
                        <Star className="mr-1 h-3 w-3" />
                        {redeemingKey === reward.id ? tt("account.rewards.redeeming", "Redeeming...") : `${reward.points_cost} ${tt("account.rewards.pointsShort", "pts")}`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default RewardsModule;
