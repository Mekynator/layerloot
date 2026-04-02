import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import {
  Star, Package, Gift, LogOut, Shield, MessageSquare, Settings, LayoutDashboard,
} from "lucide-react";
import { icons } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAccountOverview } from "@/hooks/use-account-overview";
import { AccountOverviewSkeleton } from "@/components/shared/loading-states";
import AccountOverviewPanel from "@/components/account/AccountOverviewPanel";
import AccountDashboard from "@/components/account/AccountDashboard";
import OrdersModule from "@/components/account/OrdersModule";
import CustomOrdersModule from "@/components/account/CustomOrdersModule";
import RewardsModule from "@/components/account/RewardsModule";
import VouchersModule from "@/components/account/VouchersModule";
import SettingsModule from "@/components/account/SettingsModule";
import SavedPreferencesModule from "@/components/account/SavedPreferencesModule";
import type {
  AccountTab, AccountPageConfig, Order, CustomOrder, CustomOrderMessage,
  Voucher, UserVoucher, SeenState,
} from "@/components/account/types";
import {
  DEFAULT_ACCOUNT_CONFIG, readSeenState, saveSeenState,
  isAfter, getLatestDate,
} from "@/components/account/types";

type ExtendedTab = AccountTab | "dashboard" | "preferences";

const ICON_MAP: Record<string, any> = { Package, MessageSquare, Gift, Star, Settings, LayoutDashboard };

const Account = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tt = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useAccountOverview(user?.id);

  const [tab, setTab] = useState<ExtendedTab>("dashboard");
  const [config, setConfig] = useState<AccountPageConfig>(DEFAULT_ACCOUNT_CONFIG);
  const [seenState, setSeenState] = useState<SeenState>({ ordersLastSeenAt: null, customRequestsLastSeenAt: null });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "account_page_config").maybeSingle().then(({ data }) => {
      if (data?.value) setConfig({ ...DEFAULT_ACCOUNT_CONFIG, ...(data.value as any) });
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    setSeenState(readSeenState(user.id));
  }, [user]);

  const orders = (overview?.orders ?? []) as Order[];
  const customOrders = (overview?.customOrders ?? []) as CustomOrder[];
  const customOrderMessages = (overview?.customOrderMessages ?? {}) as Record<string, CustomOrderMessage[]>;
  const vouchers = (overview?.vouchers ?? []) as Voucher[];
  const userVouchers = (overview?.userVouchers ?? []) as UserVoucher[];

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

  const markTabAsSeen = (targetTab: AccountTab) => {
    if (!user) return;
    const next: SeenState = { ...seenState };
    if (targetTab === "orders" && latestOrderActivityAt) next.ordersLastSeenAt = latestOrderActivityAt;
    if (targetTab === "custom-requests" && latestCustomActivityAt) next.customRequestsLastSeenAt = latestCustomActivityAt;
    setSeenState(next);
    saveSeenState(user.id, next);
  };

  useEffect(() => {
    if (!user) return;
    if (tab === "orders" && latestOrderActivityAt && hasNewOrders) markTabAsSeen("orders");
    if (tab === "custom-requests" && latestCustomActivityAt && hasNewCustomRequests) markTabAsSeen("custom-requests");
  }, [tab, user, latestOrderActivityAt, latestCustomActivityAt, hasNewOrders, hasNewCustomRequests]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleModules = useMemo(
    () => [...config.modules].filter(m => m.visible).sort((a, b) => a.order - b.order),
    [config.modules]
  );

  const dotMap: Record<string, boolean> = {
    orders: hasNewOrders,
    "custom-requests": hasNewCustomRequests,
  };

  if (loading || !user) return null;

  if (overviewLoading && !overview) {
    return <div className="py-8"><div className="container max-w-5xl"><AccountOverviewSkeleton /></div></div>;
  }

  const moduleProps = { user, overview, refetchOverview, tt };

  const allTabs: { id: ExtendedTab; label: string; icon: any }[] = [
    { id: "dashboard", label: tt("account.tabs.dashboard", "Dashboard"), icon: LayoutDashboard },
    ...visibleModules.map(mod => ({
      id: mod.id as ExtendedTab,
      label: mod.label,
      icon: ICON_MAP[mod.icon] || (icons as any)[mod.icon] || Package,
    })),
    { id: "preferences", label: tt("account.tabs.preferences", "Preferences"), icon: Settings },
  ];

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase text-foreground">{tt("account.title", "My Account")}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="font-display uppercase tracking-wider"><Shield className="mr-1 h-4 w-4" /> {tt("nav.admin", "Admin")}</Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={signOut} className="font-display uppercase tracking-wider"><LogOut className="mr-1 h-4 w-4" /> {tt("nav.signOut", "Sign Out")}</Button>
          </div>
        </div>

        <AccountOverviewPanel {...moduleProps} config={config} />

        {/* Tab bar */}
        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border/20 bg-card/40 p-2 backdrop-blur-sm">
          {allTabs.map(({ id, label, icon: Icon }) => {
            const hasDot = dotMap[id] ?? false;
            return (
              <Button
                key={id}
                variant={tab === id ? "default" : "ghost"}
                size="sm"
                onClick={() => setTab(id)}
                className={`relative font-display uppercase tracking-wider transition-all ${tab === id ? "glow-primary shadow-md" : "hover:bg-muted/40"}`}
              >
                <Icon className="mr-1 h-4 w-4" />
                {label}
                {hasDot && <span className="ml-2 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />}
              </Button>
            );
          })}
        </div>

        {/* Modules */}
        {tab === "dashboard" && <AccountDashboard {...moduleProps} orders={orders} customOrders={customOrders} userVouchers={userVouchers} onSwitchTab={(t) => setTab(t as ExtendedTab)} />}
        {tab === "orders" && <OrdersModule {...moduleProps} orders={orders} seenState={seenState} />}
        {tab === "custom-requests" && <CustomOrdersModule {...moduleProps} customOrders={customOrders} customOrderMessages={customOrderMessages} seenState={seenState} />}
        {tab === "rewards" && <RewardsModule {...moduleProps} vouchers={vouchers} overviewLoading={overviewLoading} />}
        {tab === "vouchers" && <VouchersModule {...moduleProps} userVouchers={userVouchers} overviewLoading={overviewLoading} />}
        {tab === "settings" && <SettingsModule {...moduleProps} />}
        {tab === "preferences" && <SavedPreferencesModule tt={tt} />}
      </div>
    </div>
  );
};

export default Account;
