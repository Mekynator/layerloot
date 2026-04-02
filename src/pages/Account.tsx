import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Package, Gift, LogOut, Shield, Settings, LayoutDashboard,
} from "lucide-react";
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
  AccountPageConfig, Order, CustomOrder, CustomOrderMessage,
  Voucher, UserVoucher, SeenState,
} from "@/components/account/types";
import {
  DEFAULT_ACCOUNT_CONFIG, readSeenState, saveSeenState,
  isAfter, getLatestDate,
} from "@/components/account/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type MainTab = "dashboard" | "orders" | "rewards" | "settings";

const Account = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const tt = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useAccountOverview(user?.id);

  const initialTab = (searchParams.get("tab") as MainTab) || "dashboard";
  const [tab, setTab] = useState<MainTab>(initialTab);
  const [ordersSubTab, setOrdersSubTab] = useState<"orders" | "custom-requests">("orders");
  const [rewardsSubTab, setRewardsSubTab] = useState<"store" | "vouchers">("store");
  const [settingsSubTab, setSettingsSubTab] = useState<"general" | "preferences">("general");
  const [config, setConfig] = useState<AccountPageConfig>(DEFAULT_ACCOUNT_CONFIG);
  const [seenState, setSeenState] = useState<SeenState>({ ordersLastSeenAt: null, customRequestsLastSeenAt: null });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    const t = searchParams.get("tab") as MainTab | null;
    if (t && ["dashboard", "orders", "rewards", "settings"].includes(t)) setTab(t);
  }, [searchParams]);

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

  const markTabAsSeen = (targetTab: "orders" | "custom-requests") => {
    if (!user) return;
    const next: SeenState = { ...seenState };
    if (targetTab === "orders" && latestOrderActivityAt) next.ordersLastSeenAt = latestOrderActivityAt;
    if (targetTab === "custom-requests" && latestCustomActivityAt) next.customRequestsLastSeenAt = latestCustomActivityAt;
    setSeenState(next);
    saveSeenState(user.id, next);
  };

  useEffect(() => {
    if (!user || tab !== "orders") return;
    if (ordersSubTab === "orders" && latestOrderActivityAt && hasNewOrders) markTabAsSeen("orders");
    if (ordersSubTab === "custom-requests" && latestCustomActivityAt && hasNewCustomRequests) markTabAsSeen("custom-requests");
  }, [tab, ordersSubTab, user, latestOrderActivityAt, latestCustomActivityAt, hasNewOrders, hasNewCustomRequests]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeTab = (t: MainTab) => {
    setTab(t);
    setSearchParams({ tab: t });
  };

  if (loading || !user) return null;

  if (overviewLoading && !overview) {
    return <div className="py-8"><div className="container max-w-5xl"><AccountOverviewSkeleton /></div></div>;
  }

  const moduleProps = { user, overview, refetchOverview, tt };

  const hasOrderNotification = hasNewOrders || hasNewCustomRequests;

  const mainTabs: { id: MainTab; label: string; icon: any; hasDot?: boolean }[] = [
    { id: "dashboard", label: tt("account.tabs.dashboard", "Dashboard"), icon: LayoutDashboard },
    { id: "orders", label: tt("account.tabs.orders", "Orders"), icon: Package, hasDot: hasOrderNotification },
    { id: "rewards", label: tt("account.tabs.rewards", "Rewards"), icon: Gift },
    { id: "settings", label: tt("account.tabs.settings", "Settings"), icon: Settings },
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

        {/* Main tab bar */}
        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border/20 bg-card/40 p-2 backdrop-blur-sm">
          {mainTabs.map(({ id, label, icon: Icon, hasDot }) => (
            <Button
              key={id}
              variant={tab === id ? "default" : "ghost"}
              size="sm"
              onClick={() => changeTab(id)}
              className={`relative font-display uppercase tracking-wider transition-all ${tab === id ? "glow-primary shadow-md" : "hover:bg-muted/40"}`}
            >
              <Icon className="mr-1 h-4 w-4" />
              {label}
              {hasDot && <span className="ml-2 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />}
            </Button>
          ))}
        </div>

        {/* Dashboard */}
        {tab === "dashboard" && (
          <AccountDashboard
            {...moduleProps}
            orders={orders}
            customOrders={customOrders}
            userVouchers={userVouchers}
            onSwitchTab={(t) => changeTab(t as MainTab)}
          />
        )}

        {/* Orders with sub-tabs */}
        {tab === "orders" && (
          <div className="space-y-4">
            <Tabs value={ordersSubTab} onValueChange={(v) => setOrdersSubTab(v as any)}>
              <TabsList className="bg-muted/20 border border-border/10">
                <TabsTrigger value="orders" className="font-display text-xs uppercase tracking-wider relative">
                  {tt("account.tabs.orders", "Orders")}
                  {hasNewOrders && <span className="ml-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />}
                </TabsTrigger>
                <TabsTrigger value="custom-requests" className="font-display text-xs uppercase tracking-wider relative">
                  {tt("account.tabs.customRequests", "Custom Requests")}
                  {hasNewCustomRequests && <span className="ml-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="orders" className="mt-4">
                <OrdersModule {...moduleProps} orders={orders} seenState={seenState} />
              </TabsContent>
              <TabsContent value="custom-requests" className="mt-4">
                <CustomOrdersModule {...moduleProps} customOrders={customOrders} customOrderMessages={customOrderMessages} seenState={seenState} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Rewards with sub-tabs (Store + Vouchers) */}
        {tab === "rewards" && (
          <div className="space-y-4">
            <Tabs value={rewardsSubTab} onValueChange={(v) => setRewardsSubTab(v as any)}>
              <TabsList className="bg-muted/20 border border-border/10">
                <TabsTrigger value="store" className="font-display text-xs uppercase tracking-wider">
                  {tt("account.tabs.rewardsStore", "Rewards Store")}
                </TabsTrigger>
                <TabsTrigger value="vouchers" className="font-display text-xs uppercase tracking-wider">
                  {tt("account.tabs.myVouchers", "My Vouchers")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="store" className="mt-4">
                <RewardsModule {...moduleProps} vouchers={vouchers} overviewLoading={overviewLoading} />
              </TabsContent>
              <TabsContent value="vouchers" className="mt-4">
                <VouchersModule {...moduleProps} userVouchers={userVouchers} overviewLoading={overviewLoading} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Settings with sub-tabs (General + Preferences) */}
        {tab === "settings" && (
          <div className="space-y-4">
            <Tabs value={settingsSubTab} onValueChange={(v) => setSettingsSubTab(v as any)}>
              <TabsList className="bg-muted/20 border border-border/10">
                <TabsTrigger value="general" className="font-display text-xs uppercase tracking-wider">
                  {tt("account.tabs.generalSettings", "General")}
                </TabsTrigger>
                <TabsTrigger value="preferences" className="font-display text-xs uppercase tracking-wider">
                  {tt("account.tabs.preferences", "Preferences")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="mt-4">
                <SettingsModule {...moduleProps} />
              </TabsContent>
              <TabsContent value="preferences" className="mt-4">
                <SavedPreferencesModule tt={tt} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
