import { usePublishedSetting } from "@/hooks/use-published-settings";
import { diag } from "@/lib/storefront-diagnostics";

export interface RewardsStoreConfig {
  title: string;
  subtitle: string;
  ctaText: string;
  emptyStateText: string;
  insufficientPointsText: string;
  columns: number;
  hoverAnimation: string;
}

export const DEFAULT_REWARDS_STORE_CONFIG: RewardsStoreConfig = {
  title: "Rewards Store",
  subtitle: "Redeem your points for exclusive perks",
  ctaText: "Redeem",
  emptyStateText: "No rewards available right now.",
  insufficientPointsText: "more points needed",
  columns: 2,
  hoverAnimation: "lift",
};

const asString = (v: unknown, fallback: string) =>
  typeof v === "string" && v.trim() ? v : fallback;

const asNumber = (v: unknown, fallback: number, min = 1, max = 4) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
};

export function useRewardsStoreConfig() {
  const { data, isLoading } = usePublishedSetting<Partial<RewardsStoreConfig> & Record<string, unknown>>(
    "rewards_store_config",
  );

  if (!isLoading && !data) {
    diag("rewards", "no published 'rewards_store_config' row; using defaults");
  }

  const config: RewardsStoreConfig = {
    title: asString(data?.title, DEFAULT_REWARDS_STORE_CONFIG.title),
    subtitle: asString(data?.subtitle, DEFAULT_REWARDS_STORE_CONFIG.subtitle),
    ctaText: asString(data?.ctaText, DEFAULT_REWARDS_STORE_CONFIG.ctaText),
    emptyStateText: asString(data?.emptyStateText, DEFAULT_REWARDS_STORE_CONFIG.emptyStateText),
    insufficientPointsText: asString(
      data?.insufficientPointsText,
      DEFAULT_REWARDS_STORE_CONFIG.insufficientPointsText,
    ),
    columns: asNumber(data?.columns, DEFAULT_REWARDS_STORE_CONFIG.columns, 1, 4),
    hoverAnimation: asString(data?.hoverAnimation, DEFAULT_REWARDS_STORE_CONFIG.hoverAnimation),
  };

  return { config, isLoading };
}
