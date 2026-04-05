import { useState } from "react";
import { Star, History, ChevronDown, ChevronUp, Package, Gift, CreditCard, TrendingUp, TrendingDown, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import type { AccountModuleProps, AccountPageConfig, UserVoucher } from "./types";
import { classifyVoucher } from "./types";

interface Props extends AccountModuleProps {
  config: AccountPageConfig;
}

const AccountOverviewPanel = ({ overview, tt, config }: Props) => {
  const [showHistory, setShowHistory] = useState(false);

  if (!config.showLoyaltySummary) return null;

  const pointsBalance = overview?.pointsBalance ?? 0;
  const pointsEarned = overview?.pointsEarned ?? 0;
  const pointsSpent = overview?.pointsSpent ?? 0;
  const loyaltyHistory = (overview?.loyaltyHistory ?? []) as Array<{
    id: string; points: number; reason: string | null; created_at: string;
  }>;

  const tiles = config.overviewTiles;
  const allUserVouchers = (overview?.userVouchers ?? []) as UserVoucher[];
  const activeVouchersCount = allUserVouchers.filter(v => classifyVoucher(v) === "active").length;
  const totalOrders = (overview?.orders ?? []).length;
  const giftCardBalance = allUserVouchers
    .filter(v => classifyVoucher(v) === "active" && v.vouchers?.discount_type === "gift_card" && Number(v.balance ?? 0) > 0)
    .reduce((sum: number, v) => sum + Number(v.balance ?? 0), 0);

  const tileData: Record<string, { label: string; value: string | number; icon: any }> = {
    points: { label: tt("account.points.earnedTotal", "Earned total"), value: pointsEarned, icon: Star },
    activeVouchers: { label: tt("account.overview.activeVouchers", "Active Vouchers"), value: activeVouchersCount, icon: Gift },
    totalOrders: { label: tt("account.overview.totalOrders", "Total Orders"), value: totalOrders, icon: Package },
    giftCardBalance: { label: tt("account.overview.giftCardBalance", "Gift Card Balance"), value: `${giftCardBalance.toFixed(2)} kr`, icon: CreditCard },
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="glass-card mb-8 border-primary/20 p-6 glow-border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Star className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{tt("account.points.balance", "Loyalty Points Balance")}</p>
            <p className="font-display text-3xl font-bold text-primary">{pointsBalance}</p>
            <p className="text-xs text-muted-foreground">{tt("account.points.rate", "1 point is earned for every 4 kr spent")}</p>
          </div>
          <div className="ml-auto grid min-w-[220px] gap-2 sm:grid-cols-2">
            {tiles.filter(t => tileData[t]).map(tileKey => {
              const tile = tileData[tileKey];
              const Icon = tile.icon;
              return (
                <div key={tileKey} className="rounded-xl border border-primary/20 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{tile.label}</p>
                  <p className="font-display text-xl font-bold text-foreground">{tile.value}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setShowHistory(prev => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3 text-left transition hover:bg-background"
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{tt("account.points.recentActivity", "Recent points activity")}</p>
                <p className="text-xs text-muted-foreground">{tt("account.points.recentActivityHint", "Press to show redeemed discounts and earned points")}</p>
              </div>
            </div>
            {showHistory ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {loyaltyHistory.length === 0 ? (
                <div className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                  {tt("account.points.noActivity", "No loyalty activity yet.")}
                </div>
              ) : (
                loyaltyHistory.slice(0, 8).map(row => {
                  const isReferral = (row.reason ?? "").toLowerCase().includes("referral");
                  return (
                  <div key={row.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-4 py-3">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isReferral ? "bg-purple-500/10" : row.points >= 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
                      {isReferral ? <UserPlus className="h-3.5 w-3.5 text-purple-600" /> : row.points >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-green-600" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{row.reason || tt("account.points.pointsUpdate", "Points update")}</p>
                      <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
                    </div>
                    <div className={`font-display text-sm font-bold ${isReferral ? "text-purple-600" : row.points >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {row.points >= 0 ? `+${row.points}` : row.points}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AccountOverviewPanel;
