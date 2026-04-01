import { useMemo } from "react";
import { useAccountOverview } from "@/hooks/use-account-overview";

export type RewardTier = {
  key: string;
  name: string;
  pointsCost: number;
  discountType: string;
  discountValue: number;
};

const REWARD_TIERS: RewardTier[] = [
  { key: "25-discount", name: "25 KR DISCOUNT", pointsCost: 200, discountType: "fixed_discount", discountValue: 25 },
  { key: "50-discount", name: "50 KR DISCOUNT", pointsCost: 400, discountType: "fixed_discount", discountValue: 50 },
  { key: "free-delivery", name: "FREE DELIVERY", pointsCost: 800, discountType: "free_shipping", discountValue: 0 },
  { key: "100-discount", name: "100 KR DISCOUNT", pointsCost: 800, discountType: "fixed_discount", discountValue: 100 },
  { key: "150-discount", name: "150 KR DISCOUNT", pointsCost: 1200, discountType: "fixed_discount", discountValue: 150 },
  { key: "250-discount", name: "250 KR DISCOUNT", pointsCost: 2000, discountType: "fixed_discount", discountValue: 250 },
  { key: "500-gift-card", name: "500 KR GIFT CARD", pointsCost: 5000, discountType: "gift_card", discountValue: 500 },
];

export type LoyaltyProgressData = {
  balance: number;
  earned: number;
  spent: number;
  nextReward: RewardTier | null;
  pointsToNext: number;
  progressPercent: number;
  canRedeem: boolean;
  redeemableRewards: RewardTier[];
  message: string;
  allTiers: RewardTier[];
};

export function getNextReward(balance: number): RewardTier | null {
  return REWARD_TIERS.find((tier) => tier.pointsCost > balance) ?? null;
}

export function computeLoyaltyProgress(balance: number, earned: number, spent: number): LoyaltyProgressData {
  const redeemableRewards = REWARD_TIERS.filter((t) => t.pointsCost <= balance);
  const canRedeem = redeemableRewards.length > 0;
  const nextReward = getNextReward(balance);

  let progressPercent = 0;
  let pointsToNext = 0;

  if (nextReward) {
    // Progress from last achieved tier (or 0) to next tier
    const prevThreshold = redeemableRewards.length > 0
      ? redeemableRewards[redeemableRewards.length - 1].pointsCost
      : 0;
    const range = nextReward.pointsCost - prevThreshold;
    const progress = balance - prevThreshold;
    progressPercent = range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 100;
    pointsToNext = nextReward.pointsCost - balance;
  } else {
    progressPercent = 100;
  }

  let message = "";
  if (balance === 0) {
    message = "Earn points with every purchase and unlock rewards";
  } else if (canRedeem && nextReward) {
    message = `You have rewards ready to redeem! ${pointsToNext} points to ${nextReward.name}`;
  } else if (canRedeem) {
    message = "You have rewards ready to redeem!";
  } else if (nextReward) {
    message = `${pointsToNext} points until ${nextReward.name}`;
  }

  return {
    balance,
    earned,
    spent,
    nextReward,
    pointsToNext,
    progressPercent,
    canRedeem,
    redeemableRewards,
    message,
    allTiers: REWARD_TIERS,
  };
}

export function useLoyaltyProgress(userId?: string) {
  const { data: overview, isLoading } = useAccountOverview(userId);

  const progress = useMemo(() => {
    if (!overview) return null;
    return computeLoyaltyProgress(
      overview.pointsBalance,
      overview.pointsEarned,
      overview.pointsSpent,
    );
  }, [overview]);

  return { data: progress, isLoading };
}
