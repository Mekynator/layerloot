import { Link } from "react-router-dom";
import { Package, Truck, Star, Heart, ShoppingCart, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import OrderTimeline from "@/components/orders/OrderTimeline";
import type { AccountModuleProps, Order, CustomOrder, UserVoucher } from "./types";
import { isCustomOrderDone } from "./types";
import { useRememberedChoices } from "@/hooks/use-remembered-choices";
import { useBehaviorTracking } from "@/hooks/use-behavior-tracking";
import { useStorefront } from "@/hooks/use-storefront";
import { motion } from "framer-motion";

interface Props extends AccountModuleProps {
  orders: Order[];
  customOrders: CustomOrder[];
  userVouchers: UserVoucher[];
  onSwitchTab: (tab: string) => void;
}

export default function AccountDashboard({ overview, tt, orders, customOrders, userVouchers, onSwitchTab }: Props) {
  const pointsBalance = overview?.pointsBalance ?? 0;
  const { choices } = useRememberedChoices();
  const { getInterestProfile } = useBehaviorTracking();
  const profile = getInterestProfile();
  const { products } = useStorefront();

  const latestOrder = orders[0];
  const activeCustomOrders = customOrders.filter(o => !isCustomOrderDone(o));
  const activeVouchers = userVouchers.filter(v => !v.is_used && !v.used_at);

  // Next reward milestone
  const rewardMilestones = [50, 100, 200, 500, 1000];
  const nextMilestone = rewardMilestones.find(m => m > pointsBalance) ?? rewardMilestones[rewardMilestones.length - 1];
  const progressPercent = Math.min((pointsBalance / nextMilestone) * 100, 100);

  // Recommended products based on behavior
  const recommendedProducts = products
    .filter(p => !profile.recentProductIds.includes(p.id))
    .slice(0, 4);

  return (
    <div className="space-y-6">
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
                    <p className="font-display text-lg font-bold text-primary">{Number(latestOrder.total).toFixed(2)} kr</p>
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
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSwitchTab("rewards")}>
                {tt("account.dashboard.rewardsStore", "Store")} <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="font-display text-3xl font-bold text-primary">{pointsBalance}</p>
                <p className="text-xs text-muted-foreground">{tt("account.dashboard.pointsAvailable", "points available")}</p>
              </div>
              <p className="text-xs text-muted-foreground">{nextMilestone - pointsBalance} {tt("account.dashboard.toNextReward", "to next milestone")}</p>
            </div>
            <Progress value={progressPercent} className="h-2" />
            {activeVouchers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeVouchers.slice(0, 3).map(v => (
                  <Badge key={v.id} variant="secondary" className="text-[10px]">
                    {v.vouchers?.name ?? v.code}
                  </Badge>
                ))}
                {activeVouchers.length > 3 && <Badge variant="outline" className="text-[10px]">+{activeVouchers.length - 3} more</Badge>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Custom Orders + Saved Preferences */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Custom Orders Status */}
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
                      {order.quoted_price && <span className="text-xs font-bold text-primary">{order.quoted_price} kr</span>}
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

        {/* Saved Preferences */}
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between font-display text-sm uppercase">
              <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> {tt("account.dashboard.preferences", "Your Preferences")}</span>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSwitchTab("settings")}>
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

      {/* Row 3: Recommended Products */}
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
                    <p className="text-xs font-bold text-primary">{product.price} kr</p>
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
