import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Package, Gift, LogOut, Shield, Star, CreditCard,
  MessageSquare, FileText, Heart, Settings, UserPlus,
  ChevronRight, Sparkles, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAccountOverview } from "@/hooks/use-account-overview";
import { AccountOverviewSkeleton } from "@/components/shared/loading-states";
import AccountSheetView, { type AccountSection } from "@/components/account/AccountSheetView";
import type {
  AccountPageConfig, Order, CustomOrder, CustomOrderMessage,
  Voucher, UserVoucher, SeenState,
} from "@/components/account/types";
import {
  DEFAULT_ACCOUNT_CONFIG, readSeenState, saveSeenState,
  isAfter, getLatestDate, classifyVoucher, isCustomOrderDone,
} from "@/components/account/types";
import { computeLoyaltyProgress } from "@/hooks/use-loyalty-progress";
import { formatPrice } from "@/lib/currency";
import { useReferrals } from "@/hooks/use-referrals";
import { useRecentlyViewedProducts } from "@/hooks/use-recently-viewed";
import SavedItemsSection from "@/components/account/SavedItemsSection";
import { motion } from "framer-motion";

const VALID_SECTIONS: AccountSection[] = ["orders", "custom-requests", "invoices", "rewards", "vouchers", "referrals", "preferences", "settings"];

const Account = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const tt = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useAccountOverview(user?.id);

  const [openSection, setOpenSection] = useState<AccountSection | null>(null);
  const [seenState, setSeenState] = useState<SeenState>({ ordersLastSeenAt: null, customRequestsLastSeenAt: null });

  // Deep-link: open section from URL on mount
  useEffect(() => {
    const s = searchParams.get("section") as AccountSection | null;
    // Also support legacy ?tab= param
    const tab = searchParams.get("tab") as AccountSection | null;
    const target = s || tab;
    if (target && VALID_SECTIONS.includes(target)) {
      setOpenSection(target);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setSeenState(readSeenState(user.id));
  }, [user]);

  const openSheet = useCallback((section: AccountSection) => {
    setOpenSection(section);
    setSearchParams({ section });
  }, [setSearchParams]);

  const closeSheet = useCallback(() => {
    setOpenSection(null);
    setSearchParams({});
  }, [setSearchParams]);

  // Data extraction
  const orders = (overview?.orders ?? []) as Order[];
  const customOrders = (overview?.customOrders ?? []) as CustomOrder[];
  const customOrderMessages = (overview?.customOrderMessages ?? {}) as Record<string, CustomOrderMessage[]>;
  const vouchers = (overview?.vouchers ?? []) as Voucher[];
  const userVouchers = (overview?.userVouchers ?? []) as UserVoucher[];
  const invoices = overview?.invoices ?? [];

  const pointsBalance = overview?.pointsBalance ?? 0;
  const pointsEarned = overview?.pointsEarned ?? 0;
  const pointsSpent = overview?.pointsSpent ?? 0;
  const loyalty = useMemo(() => computeLoyaltyProgress(pointsBalance, pointsEarned, pointsSpent), [pointsBalance, pointsEarned, pointsSpent]);

  const activeVouchers = useMemo(() => userVouchers.filter(v => classifyVoucher(v) === "active"), [userVouchers]);
  const activeCustomOrders = useMemo(() => customOrders.filter(o => !isCustomOrderDone(o)), [customOrders]);
  const latestOrder = orders[0];

  const { data: referralData } = useReferrals(user?.id);
  const refStats = referralData ?? { totalInvited: 0, accountsCreated: 0, firstOrders: 0, pointsEarned: 0 };
  const { recentProducts } = useRecentlyViewedProducts();

  // Notification dots
  const latestOrderActivityAt = useMemo(() => getLatestDate(orders.map(o => o.created_at)), [orders]);
  const latestCustomActivityAt = useMemo(() => {
    const dates: (string | null)[] = [];
    customOrders.forEach(order => {
      dates.push(order.created_at, order.updated_at);
      (customOrderMessages[order.id] || []).forEach(msg => dates.push(msg.created_at));
    });
    return getLatestDate(dates);
  }, [customOrders, customOrderMessages]);

  const hasNewOrders = useMemo(() => isAfter(latestOrderActivityAt, seenState.ordersLastSeenAt), [latestOrderActivityAt, seenState.ordersLastSeenAt]);
  const hasNewCustomRequests = useMemo(() => isAfter(latestCustomActivityAt, seenState.customRequestsLastSeenAt), [latestCustomActivityAt, seenState.customRequestsLastSeenAt]);

  // Mark as seen when opening sections
  useEffect(() => {
    if (!user || !openSection) return;
    if (openSection === "orders" && latestOrderActivityAt && hasNewOrders) {
      const next = { ...seenState, ordersLastSeenAt: latestOrderActivityAt };
      setSeenState(next);
      saveSeenState(user.id, next);
    }
    if (openSection === "custom-requests" && latestCustomActivityAt && hasNewCustomRequests) {
      const next = { ...seenState, customRequestsLastSeenAt: latestCustomActivityAt };
      setSeenState(next);
      saveSeenState(user.id, next);
    }
  }, [openSection, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !user) return null;

  if (overviewLoading && !overview) {
    return <div className="py-8"><div className="container max-w-4xl"><AccountOverviewSkeleton /></div></div>;
  }

  const moduleProps = { user, overview, refetchOverview, tt };

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? tt("account.greeting.morning", "Good morning") : hour < 18 ? tt("account.greeting.afternoon", "Good afternoon") : tt("account.greeting.evening", "Good evening");
  const profileName = overview?.profileName;

  const giftCardBalance = activeVouchers
    .filter(v => v.vouchers?.discount_type === "gift_card" && Number(v.balance ?? 0) > 0)
    .reduce((sum, v) => sum + Number(v.balance ?? 0), 0);

  return (
    <div className="py-6 lg:py-10">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground lg:text-2xl">
              {greeting}{profileName ? `, ${profileName}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="text-xs"><Shield className="mr-1 h-3.5 w-3.5" /> {tt("nav.admin", "Admin")}</Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} className="text-xs text-muted-foreground"><LogOut className="mr-1 h-3.5 w-3.5" /> {tt("nav.signOut", "Sign Out")}</Button>
          </div>
        </div>

        {/* Stat Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: tt("account.stat.points", "Points"), value: pointsBalance.toLocaleString(), icon: Star, onClick: () => openSheet("rewards") },
            { label: tt("account.stat.orders", "Orders"), value: orders.length, icon: Package, onClick: () => openSheet("orders"), dot: hasNewOrders },
            { label: tt("account.stat.vouchers", "Vouchers"), value: activeVouchers.length, icon: Gift, onClick: () => openSheet("vouchers") },
            { label: tt("account.stat.giftBalance", "Gift Balance"), value: `${giftCardBalance.toFixed(0)} kr`, icon: CreditCard, onClick: () => openSheet("vouchers") },
          ].map(({ label, value, icon: Icon, onClick, dot }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <button onClick={onClick} className="w-full text-left rounded-xl border border-border/20 bg-card/50 p-4 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/80 group">
                <div className="flex items-center justify-between mb-1.5">
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  {dot && <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />}
                </div>
                <p className="font-display text-xl font-bold text-foreground">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="space-y-3">
          {/* Latest Order */}
          <SummaryCard
            icon={Package}
            title={tt("account.card.orders", "Orders")}
            onClick={() => openSheet("orders")}
            dot={hasNewOrders}
          >
            {latestOrder ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">#{latestOrder.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(latestOrder.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">{formatPrice(Number(latestOrder.total))}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">{latestOrder.status}</Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{tt("account.card.noOrders", "No orders yet")}</p>
            )}
          </SummaryCard>

          {/* Rewards */}
          <SummaryCard
            icon={Star}
            title={tt("account.card.rewards", "Rewards")}
            onClick={() => openSheet("rewards")}
            badge={loyalty.canRedeem ? `${loyalty.redeemableRewards.length} available` : undefined}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-primary">{pointsBalance} points</span>
                {loyalty.nextReward && loyalty.pointsToNext > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">{loyalty.pointsToNext} to next reward</span>
                )}
              </div>
              {activeVouchers.length > 0 && (
                <span className="text-xs text-muted-foreground">{activeVouchers.length} active voucher{activeVouchers.length !== 1 ? "s" : ""}</span>
              )}
            </div>
          </SummaryCard>

          {/* Custom Requests */}
          <SummaryCard
            icon={Sparkles}
            title={tt("account.card.customRequests", "Custom Requests")}
            onClick={() => openSheet("custom-requests")}
            dot={hasNewCustomRequests}
          >
            {activeCustomOrders.length > 0 ? (
              <div className="flex items-center justify-between">
                <p className="text-sm">{activeCustomOrders.length} active request{activeCustomOrders.length !== 1 ? "s" : ""}</p>
                <Badge variant="outline" className="text-[10px] uppercase">{activeCustomOrders[0].status}</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{tt("account.card.noCustom", "No active requests")}</p>
            )}
          </SummaryCard>

          {/* Referrals */}
          <SummaryCard
            icon={UserPlus}
            title={tt("account.card.referrals", "Invite Friends")}
            onClick={() => openSheet("referrals")}
          >
            <div className="flex items-center gap-4">
              <span className="text-sm"><strong>{refStats.totalInvited}</strong> <span className="text-muted-foreground">invited</span></span>
              <span className="text-sm"><strong>{refStats.pointsEarned}</strong> <span className="text-muted-foreground">points earned</span></span>
            </div>
          </SummaryCard>

          {/* Invoices */}
          <SummaryCard
            icon={FileText}
            title={tt("account.card.invoices", "Invoices")}
            onClick={() => openSheet("invoices")}
          >
            <p className="text-sm text-muted-foreground">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
          </SummaryCard>

          {/* Preferences & Settings — compact row */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              icon={Heart}
              title={tt("account.card.preferences", "Preferences")}
              onClick={() => openSheet("preferences")}
              compact
            >
              <p className="text-xs text-muted-foreground">{tt("account.card.prefDesc", "Saved choices")}</p>
            </SummaryCard>
            <SummaryCard
              icon={Settings}
              title={tt("account.card.settings", "Settings")}
              onClick={() => openSheet("settings")}
              compact
            >
              <p className="text-xs text-muted-foreground">{tt("account.card.settingsDesc", "Profile & account")}</p>
            </SummaryCard>
          </div>
        </div>

        {/* Saved for Later Section */}
        <SavedItemsSection />

        {/* Recently Viewed — minimal */}
        {recentProducts.length >= 2 && (
          <div className="mt-8">
            <h3 className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> {tt("account.card.recentlyViewed", "Recently Viewed")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {recentProducts.slice(0, 4).map((product) => (
                <Link key={product.id} to={`/products/${product.slug}`} className="group block">
                  <div className="aspect-square overflow-hidden rounded-xl bg-muted/50">
                    {product.image && (
                      <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-xs font-medium">{product.name}</p>
                  <p className="text-xs text-primary font-bold">{formatPrice(product.price)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sheet-based detail views */}
      <AccountSheetView
        section={openSection}
        onClose={closeSheet}
        moduleProps={moduleProps}
        orders={orders}
        customOrders={customOrders}
        customOrderMessages={customOrderMessages}
        vouchers={vouchers}
        userVouchers={userVouchers}
        invoices={invoices}
        seenState={seenState}
        overviewLoading={overviewLoading}
      />
    </div>
  );
};

/* ─── Summary Card ─── */
interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick: () => void;
  dot?: boolean;
  badge?: string;
  compact?: boolean;
  children: React.ReactNode;
}

function SummaryCard({ icon: Icon, title, onClick, dot, badge, compact, children }: SummaryCardProps) {
  return (
    <button onClick={onClick} className="w-full text-left">
      <Card className="border-border/15 bg-card/40 hover:bg-card/70 hover:border-primary/20 transition-all group cursor-pointer">
        <CardContent className={compact ? "p-4" : "p-4 sm:p-5"}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="font-display text-xs uppercase tracking-wider text-foreground">{title}</span>
              {dot && <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />}
              {badge && <Badge variant="default" className="text-[9px] px-1.5 py-0">{badge}</Badge>}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </div>
          {children}
        </CardContent>
      </Card>
    </button>
  );
}

export default Account;
