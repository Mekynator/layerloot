import { Link } from "react-router-dom";
import { Package, Truck, Star, Heart, ShoppingCart, ArrowRight, Sparkles, Gift, Zap, Plus, RotateCcw, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import OrderTimeline from "@/components/orders/OrderTimeline";
import type { AccountModuleProps, Order, CustomOrder, UserVoucher } from "./types";
import { isCustomOrderDone, classifyVoucher } from "./types";
import { computeLoyaltyProgress, type RewardTier } from "@/hooks/use-loyalty-progress";
import { useRememberedChoices } from "@/hooks/use-remembered-choices";
import { useBehaviorTracking } from "@/hooks/use-behavior-tracking";
import { useStorefrontCatalog } from "@/hooks/use-storefront";
import { useRecentlyViewedProducts } from "@/hooks/use-recently-viewed";
import { formatPrice } from "@/lib/currency";
import { motion } from "framer-motion";

interface Props extends AccountModuleProps {
  orders: Order[];
  customOrders: CustomOrder[];
  userVouchers: UserVoucher[];
  onSwitchTab: (tab: string) => void;
}

function TierMarker({ tier, balance, isNext, onRedeem }: { tier: RewardTier; balance: number; isNext: boolean; onRedeem: () => void }) {
  const canRedeem = balance >= tier.pointsCost;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`flex flex-col items-center gap-0.5 transition-all ${
            canRedeem ? "opacity-100 cursor-pointer" : "opacity-40 cursor-pointer hover:opacity-60"
          }`}
        >
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[9px] font-bold transition-all ${
              canRedeem
                ? "border-primary bg-primary text-primary-foreground shadow-[0_0_8px_hsl(var(--primary)/0.4)] animate-pulse"
                : isNext
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {tier.discountType === "free_shipping" ? <Truck className="h-3 w-3" /> : <Star className="h-3 w-3" />}
          </div>
          <span className={`text-[9px] font-medium whitespace-nowrap ${canRedeem ? "text-primary" : isNext ? "text-foreground" : "text-muted-foreground"}`}>
            {tier.discountType === "free_shipping" ? "Free Ship" : tier.discountType === "gift_card" ? `${tier.discountValue} GC` : `${tier.discountValue} kr`}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" side="top">
        <p className="font-display text-sm font-bold">{tier.name}</p>
        <p className="text-xs text-muted-foreground mt-1">{tier.pointsCost} points</p>
        {canRedeem ? (
          <Button size="sm" className="mt-2 w-full text-xs" onClick={onRedeem}>
            <Gift className="mr-1 h-3 w-3" /> Redeem
          </Button>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{tier.pointsCost - balance} more points needed</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function AccountDashboard({ overview, tt, orders, customOrders, userVouchers, onSwitchTab }: Props) {
  const pointsBalance = overview?.pointsBalance ?? 0;
  const pointsEarned = overview?.pointsEarned ?? 0;
  const pointsSpent = overview?.pointsSpent ?? 0;
  const { choices } = useRememberedChoices();
  const { getInterestProfile } = useBehaviorTracking();
  const profile = getInterestProfile();
  const { data: catalogData } = useStorefrontCatalog();
  const products = catalogData?.products ?? [];
  const { recentProducts } = useRecentlyViewedProducts();

  const latestOrder = orders[0];
  const activeCustomOrders = customOrders.filter(o => !isCustomOrderDone(o));
  const activeVouchers = userVouchers.filter(v => classifyVoucher(v) === "active");
  const loyalty = computeLoyaltyProgress(pointsBalance, pointsEarned, pointsSpent);

  const recommendedProducts = products
    .filter(p => !profile.recentProductIds.includes(p.id))
    .slice(0, 4);

  // Quick actions
  const quickActions = [
    latestOrder && { label: tt("account.dashboard.trackOrder", "Track Order"), icon: Truck, onClick: () => onSwitchTab("orders") },
    { label: tt("account.dashboard.createCustom", "New Custom Request"), icon: Plus, link: "/create-your-own" },
    { label: tt("account.dashboard.viewRewards", "View Rewards"), icon: Star, onClick: () => onSwitchTab("rewards") },
    latestOrder && { label: tt("account.dashboard.reorderPrevious", "Reorder Previous"), icon: RotateCcw, onClick: () => onSwitchTab("orders") },
  ].filter(Boolean) as { label: string; icon: any; onClick?: () => void; link?: string }[];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            {action.link ? (
              <Link to={action.link}>
                <Button variant="outline" size="sm" className="font-display text-xs uppercase tracking-wider border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                  <action.icon className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  {action.label}
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" onClick={action.onClick} className="font-display text-xs uppercase tracking-wider border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                <action.icon className="mr-1.5 h-3.5 w-3.5 text-primary" />
                {action.label}
              </Button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Row 1: Order Timeline + Rewards Progress */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Latest Order */}
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between font-display text-sm uppercase">
              <span className="flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> {tt("account.dashboard.latestOrder", "Latest Order")}</span>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSwitchTab("orders")}>
                {tt("account.dashboard.viewAll", "View all")} <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestOrder ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      #{latestOrder.id.slice(0, 8)} · {new Date(latestOrder.created_at).toLocaleDateString()}
                    </p>
                    <p className="font-display text-lg font-bold text-primary">{formatPrice(Number(latestOrder.total))}</p>
                  </div>
                  <Badge variant="outline" className="uppercase text-[10px]">{latestOrder.status}</Badge>
                </div>
                <OrderTimeline status={latestOrder.status} />
                <Link to={`/orders/${latestOrder.id}`}>
                  <Button variant="outline" size="sm" className="w-full text-xs uppercase tracking-wider">
                    <Truck className="mr-1 h-3 w-3" /> {tt("account.dashboard.trackOrder", "Track Order")}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {tt("account.dashboard.noOrders", "No orders yet")}
                <Link to="/products" className="ml-1 text-primary hover:underline">{tt("account.dashboard.startShopping", "Start shopping!")}</Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rewards Progress */}
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between font-display text-sm uppercase">
              <span className="flex items-center gap-2"><Star className="h-4 w-4 text-primary" /> {tt("account.dashboard.rewards", "Rewards Progress")}</span>
              <div className="flex items-center gap-2">
                {loyalty.canRedeem && (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                    <Button variant="default" size="sm" className="text-[10px] uppercase tracking-wider gap-1" onClick={() => onSwitchTab("rewards")}>
                      <Zap className="h-3 w-3" />
                      {loyalty.redeemableRewards.length} {tt("account.dashboard.rewardsAvailable", "Rewards")}
                    </Button>
                  </motion.div>
                )}
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSwitchTab("rewards")}>
                  {tt("account.dashboard.rewardsStore", "Store")} <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="font-display text-3xl font-bold text-primary">{pointsBalance}</p>
                <p className="text-xs text-muted-foreground">{tt("account.dashboard.pointsAvailable", "points available")}</p>
              </div>
              {loyalty.nextReward && loyalty.pointsToNext > 0 && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-primary">{loyalty.pointsToNext}</span> {tt("account.dashboard.toNextReward", "to next reward")}
                </p>
              )}
            </div>
            <Progress value={loyalty.progressPercent} className="h-2.5" />
            <div className="flex items-start justify-between gap-1 overflow-x-auto pb-1">
              {loyalty.allTiers.map(tier => (
                <TierMarker key={tier.key} tier={tier} balance={pointsBalance} isNext={loyalty.nextReward?.key === tier.key} onRedeem={() => onSwitchTab("rewards")} />
              ))}
            </div>
            {activeVouchers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeVouchers.slice(0, 3).map(v => (
                  <Badge key={v.id} variant="secondary" className="text-[10px]">{v.vouchers?.name ?? v.code}</Badge>
                ))}
                {activeVouchers.length > 3 && <Badge variant="outline" className="text-[10px]">+{activeVouchers.length - 3} more</Badge>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Custom Orders + Saved Preferences */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between font-display text-sm uppercase">
              <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {tt("account.dashboard.customOrders", "Custom Orders")}</span>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSwitchTab("custom-requests")}>
                {tt("account.dashboard.viewAll", "View all")} <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCustomOrders.length > 0 ? (
              <div className="space-y-2">
                {activeCustomOrders.slice(0, 3).map(order => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/30 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{order.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.quoted_price && <span className="text-xs font-bold text-primary">{formatPrice(Number(order.quoted_price))}</span>}
                      <Badge variant="outline" className="text-[10px] uppercase">{order.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {tt("account.dashboard.noCustomOrders", "No active custom orders")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between font-display text-sm uppercase">
              <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> {tt("account.dashboard.preferences", "Your Preferences")}</span>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSwitchTab("preferences")}>
                {tt("account.dashboard.edit", "Edit")} <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {choices.lastMaterial || choices.lastColor || choices.lastSize || choices.lastFinish ? (
              <div className="flex flex-wrap gap-2">
                {choices.lastMaterial && <Badge variant="secondary"><span className="text-muted-foreground mr-1">Material:</span>{choices.lastMaterial}</Badge>}
                {choices.lastColor && <Badge variant="secondary"><span className="text-muted-foreground mr-1">Color:</span>{choices.lastColor}</Badge>}
                {choices.lastSize && <Badge variant="secondary"><span className="text-muted-foreground mr-1">Size:</span>{choices.lastSize}</Badge>}
                {choices.lastFinish && <Badge variant="secondary"><span className="text-muted-foreground mr-1">Finish:</span>{choices.lastFinish}</Badge>}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {tt("account.dashboard.noPreferences", "No saved preferences yet. They'll appear here as you shop.")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Recently Viewed */}
      {recentProducts.length >= 2 && (
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-sm uppercase">
              <Eye className="h-4 w-4 text-primary" /> {tt("account.dashboard.recentlyViewed", "Recently Viewed")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {recentProducts.slice(0, 4).map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/products/${product.slug}`} className="group block">
                    <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                      {product.image && (
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                      )}
                    </div>
                    <p className="mt-2 truncate text-xs font-medium">{product.name}</p>
                    <p className="text-xs font-bold text-primary">{formatPrice(product.price)}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row 4: Recommended Products */}
      {recommendedProducts.length >= 2 && (
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-sm uppercase">
              <ShoppingCart className="h-4 w-4 text-primary" /> {tt("account.dashboard.recommended", "Recommended for You")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {recommendedProducts.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/products/${product.slug}`} className="group block">
                    <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                      {product.images?.[0] && (
                        <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                      )}
                    </div>
                    <p className="mt-2 truncate text-xs font-medium">{product.name}</p>
                    <p className="text-xs font-bold text-primary">{formatPrice(product.price)}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
