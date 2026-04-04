import { Link } from "react-router-dom";
import { useMemo } from "react";
import {
  Package, Truck, Star, Heart, ShoppingCart, ArrowRight, Sparkles, Gift, Zap, Plus,
  RotateCcw, Eye, FileText, CheckCircle, MessageSquare, Download, CreditCard,
} from "lucide-react";
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
import { usePersonalizationEngine } from "@/hooks/use-personalization-engine";
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

// --- Smart Quick Actions Engine ---
interface SmartAction {
  label: string;
  icon: any;
  priority: number;
  onClick?: () => void;
  link?: string;
}

function computeSmartActions(
  orders: Order[],
  customOrders: CustomOrder[],
  userVouchers: UserVoucher[],
  loyalty: ReturnType<typeof computeLoyaltyProgress>,
  invoices: any[],
  onSwitchTab: (tab: string) => void,
  tt: (key: string, fallback: string) => string,
): SmartAction[] {
  const actions: SmartAction[] = [];

  // Pending quote — highest priority
  const pendingQuote = customOrders.find(
    (o) => o.status === "quoted" && o.customer_response_status === "pending" && !isCustomOrderDone(o),
  );
  if (pendingQuote) {
    actions.push({
      label: tt("account.smart.acceptQuote", "Accept your quote"),
      icon: CheckCircle,
      priority: 100,
      onClick: () => onSwitchTab("custom-requests"),
    });
  }

  // Active custom order in progress
  const activeCustom = customOrders.find(
    (o) => !isCustomOrderDone(o) && o.status !== "quoted",
  );
  if (activeCustom) {
    actions.push({
      label: tt("account.smart.viewCustomRequest", "View custom request"),
      icon: MessageSquare,
      priority: 85,
      onClick: () => onSwitchTab("custom-requests"),
    });
  }

  // Order in shipping
  const shippedOrder = orders.find((o) => o.status === "shipped" || o.status === "processing");
  if (shippedOrder) {
    actions.push({
      label: tt("account.smart.trackOrder", "Track your order"),
      icon: Truck,
      priority: 90,
      onClick: () => onSwitchTab("orders"),
    });
  }

  // Active voucher to use
  const activeVoucher = userVouchers.find((v) => classifyVoucher(v) === "active");
  if (activeVoucher) {
    const name = activeVoucher.vouchers?.name ?? "voucher";
    actions.push({
      label: tt("account.smart.useVoucher", `Use your ${name}`),
      icon: CreditCard,
      priority: 70,
      link: "/products",
    });
  }

  // Close to next reward
  if (loyalty.nextReward && loyalty.pointsToNext > 0 && loyalty.pointsToNext <= 50) {
    actions.push({
      label: `${loyalty.pointsToNext} points to ${loyalty.nextReward.name}`,
      icon: Star,
      priority: 75,
      onClick: () => onSwitchTab("rewards"),
    });
  }

  // Redeemable rewards
  if (loyalty.canRedeem && loyalty.redeemableRewards.length > 0) {
    actions.push({
      label: tt("account.smart.redeemReward", "Redeem reward"),
      icon: Gift,
      priority: 80,
      onClick: () => onSwitchTab("rewards"),
    });
  }

  // Latest invoice download
  if (invoices && invoices.length > 0) {
    actions.push({
      label: tt("account.smart.downloadInvoice", "Download latest invoice"),
      icon: Download,
      priority: 50,
      onClick: () => onSwitchTab("invoices"),
    });
  }

  // Reorder section removed per design

  // New custom request (always available, low priority)
  actions.push({
    label: tt("account.smart.newCustom", "New custom request"),
    icon: Plus,
    priority: 30,
    link: "/create-your-own",
  });

  // Browse products
  actions.push({
    label: tt("account.smart.browse", "Browse products"),
    icon: ShoppingCart,
    priority: 20,
    link: "/products",
  });

  return actions.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

export default function AccountDashboard({ overview, tt, orders, customOrders, userVouchers, onSwitchTab }: Props) {
  const pointsBalance = overview?.pointsBalance ?? 0;
  const pointsEarned = overview?.pointsEarned ?? 0;
  const pointsSpent = overview?.pointsSpent ?? 0;
  const invoices = overview?.invoices ?? [];
  const { choices } = useRememberedChoices();
  const { getInterestProfile } = useBehaviorTracking();
  const profile = getInterestProfile();
  const engine = usePersonalizationEngine();
  const { data: catalogData } = useStorefrontCatalog();
  const products = catalogData?.products ?? [];
  const { recentProducts } = useRecentlyViewedProducts();

  const latestOrder = orders[0];
  const activeCustomOrders = customOrders.filter((o) => !isCustomOrderDone(o));
  const activeVouchers = userVouchers.filter((v) => classifyVoucher(v) === "active");
  const loyalty = computeLoyaltyProgress(pointsBalance, pointsEarned, pointsSpent);

  // Use personalization engine for recommendations
  const recommendedProducts = useMemo(() => {
    if (!products.length) return [];
    const available = products.filter((p) => !profile.recentProductIds.includes(p.id));
    return engine.rankProducts(available, undefined, 4);
  }, [products, profile.recentProductIds, engine.rankProducts]);

  // "Buy Again" — products from completed orders that exist in catalog
  const buyAgainProducts = useMemo(() => {
    const completedOrders = orders.filter((o) => o.status === "completed" || o.status === "delivered");
    if (!completedOrders.length || !products.length) return [];
    // We don't have order_items here, so show products in same categories as what user bought
    // This is a reasonable proxy; the full reorder flow is in OrdersModule
    return products
      .filter((p) => profile.topCategories.includes(p.category_id ?? ""))
      .filter((p) => !profile.recentProductIds.includes(p.id))
      .slice(0, 4);
  }, [orders, products, profile]);

  // Smart Quick Actions
  const smartActions = useMemo(
    () => computeSmartActions(orders, customOrders, userVouchers, loyalty, invoices, onSwitchTab, tt),
    [orders, customOrders, userVouchers, loyalty, invoices, onSwitchTab, tt],
  );

  // Determine which sections to show
  const showCustomOrders = activeCustomOrders.length > 0 || profile.usesCustomTools;
  const showBuyAgain = buyAgainProducts.length >= 2 && profile.isReturningUser;
  const hasPreferences = choices.lastMaterial || choices.lastColor || choices.lastSize || choices.lastFinish;

  return (
    <div className="space-y-6">
      {/* Smart Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {smartActions.map((action, i) => (
          <motion.div key={`${action.label}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
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
              {loyalty.allTiers.map((tier) => (
                <TierMarker key={tier.key} tier={tier} balance={pointsBalance} isNext={loyalty.nextReward?.key === tier.key} onRedeem={() => onSwitchTab("rewards")} />
              ))}
            </div>
            {activeVouchers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeVouchers.slice(0, 3).map((v) => (
                  <Badge key={v.id} variant="secondary" className="text-[10px]">{v.vouchers?.name ?? v.code}</Badge>
                ))}
                {activeVouchers.length > 3 && <Badge variant="outline" className="text-[10px]">+{activeVouchers.length - 3} more</Badge>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Custom Orders (conditional) + Preferences */}
      <div className={`grid gap-4 ${showCustomOrders ? "lg:grid-cols-2" : ""}`}>
        {showCustomOrders && (
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
                  {activeCustomOrders.slice(0, 3).map((order) => (
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
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">{tt("account.dashboard.noCustomOrders", "No active custom orders")}</p>
                  <Link to="/create-your-own">
                    <Button variant="outline" size="sm" className="text-xs">
                      <Plus className="mr-1 h-3 w-3" /> Start a custom request
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasPreferences && (
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
              <div className="flex flex-wrap gap-2">
                {choices.lastMaterial && <Badge variant="secondary"><span className="text-muted-foreground mr-1">Material:</span>{choices.lastMaterial}</Badge>}
                {choices.lastColor && <Badge variant="secondary"><span className="text-muted-foreground mr-1">Color:</span>{choices.lastColor}</Badge>}
                {choices.lastSize && <Badge variant="secondary"><span className="text-muted-foreground mr-1">Size:</span>{choices.lastSize}</Badge>}
                {choices.lastFinish && <Badge variant="secondary"><span className="text-muted-foreground mr-1">Finish:</span>{choices.lastFinish}</Badge>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Buy Again section removed */}

      {/* Row 4: Recently Viewed */}
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

      {/* Row 5: Recommended Products (using personalization engine) */}
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
