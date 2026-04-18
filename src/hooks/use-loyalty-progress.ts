import { useMemo } from "react";
import { useAccountOverview } from "@/hooks/use-account-overview";
import { diag } from "@/lib/storefront-diagnostics";

export type RewardTier = {
  key: string;
  name: string;
  pointsCost: number;
  discountType: string;
  discountValue: number;
};

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

function tiersFromVouchers(vouchers?: any[] | null): RewardTier[] {
  if (!vouchers || vouchers.length === 0) {
    diag("loyalty", "no vouchers loaded from Admin; tier list will be empty");
    return [];
  }
  return vouchers
    .filter((v) => v?.is_active !== false && typeof v?.points_cost === "number")
    .map((v) => ({
      key: String(v.id ?? v.name),
      name: String(v.name ?? "Reward").toUpperCase(),
      pointsCost: Number(v.points_cost) || 0,
      discountType: String(v.discount_type ?? "fixed_discount"),
      discountValue: Number(v.discount_value ?? 0),
    }))
    .sort((a, b) => a.pointsCost - b.pointsCost);
}

export function getNextReward(balance: number, vouchers?: any[] | null): RewardTier | null {
  const tiers = tiersFromVouchers(vouchers);
  return tiers.find((tier) => tier.pointsCost > balance) ?? null;
}

export function computeLoyaltyProgress(
  balance: number,
  earned: number,
  spent: number,
  vouchers?: any[] | null,
): LoyaltyProgressData {
  const allTiers = tiersFromVouchers(vouchers);

  // Defensive: no tiers configured at all → return clean empty state
  if (allTiers.length === 0) {
    return {
      balance,
      earned,
      spent,
      nextReward: null,
      pointsToNext: 0,
      progressPercent: 0,
      canRedeem: false,
      redeemableRewards: [],
      message: "",
      allTiers: [],
    };
  }

  const redeemableRewards = allTiers.filter((t) => t.pointsCost <= balance);
  const canRedeem = redeemableRewards.length > 0;
  const nextReward = allTiers.find((tier) => tier.pointsCost > balance) ?? null;

  let progressPercent = 0;
  let pointsToNext = 0;

  if (nextReward) {
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
    allTiers,
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
      overview.vouchers,
    );
  }, [overview]);

  return { data: progress, isLoading };
}
