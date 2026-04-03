import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Package, Gift, LogOut, Shield, Settings, LayoutDashboard,
  MessageSquare, FileText, Heart, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
import InvoicesModule from "@/components/account/InvoicesModule";
import type {
  AccountPageConfig, Order, CustomOrder, CustomOrderMessage,
  Voucher, UserVoucher, SeenState,
} from "@/components/account/types";
import {
  DEFAULT_ACCOUNT_CONFIG, readSeenState, saveSeenState,
  isAfter, getLatestDate,
} from "@/components/account/types";

type MainTab = "dashboard" | "orders" | "custom-requests" | "invoices" | "rewards" | "vouchers" | "preferences" | "settings";

const VALID_TABS: MainTab[] = ["dashboard", "orders", "custom-requests", "invoices", "rewards", "vouchers", "preferences", "settings"];

const Account = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const tt = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useAccountOverview(user?.id);

  const initialTab = (searchParams.get("tab") as MainTab) || "dashboard";
  const [tab, setTab] = useState<MainTab>(VALID_TABS.includes(initialTab) ? initialTab : "dashboard");
  const [config, setConfig] = useState<AccountPageConfig>(DEFAULT_ACCOUNT_CONFIG);
  const [seenState, setSeenState] = useState<SeenState>({ ordersLastSeenAt: null, customRequestsLastSeenAt: null });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    const t = searchParams.get("tab") as MainTab | null;
    if (t && VALID_TABS.includes(t)) setTab(t);
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
  const invoices = overview?.invoices ?? [];

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
    if (!user) return;
    if (tab === "orders" && latestOrderActivityAt && hasNewOrders) markTabAsSeen("orders");
    if (tab === "custom-requests" && latestCustomActivityAt && hasNewCustomRequests) markTabAsSeen("custom-requests");
  }, [tab, user, latestOrderActivityAt, latestCustomActivityAt, hasNewOrders, hasNewCustomRequests]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeTab = (t: MainTab) => {
    setTab(t);
    setSearchParams({ tab: t });
  };

  if (loading || !user) return null;

  if (overviewLoading && !overview) {
    return <div className="py-8"><div className="container max-w-6xl"><AccountOverviewSkeleton /></div></div>;
  }

  const moduleProps = { user, overview, refetchOverview, tt };

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? tt("account.greeting.morning", "Good morning") : hour < 18 ? tt("account.greeting.afternoon", "Good afternoon") : tt("account.greeting.evening", "Good evening");
  const profileName = overview?.profileName;

  const sidebarItems: { id: MainTab; label: string; icon: any; hasDot?: boolean }[] = [
    { id: "dashboard", label: tt("account.tabs.dashboard", "Dashboard"), icon: LayoutDashboard },
    { id: "orders", label: tt("account.tabs.orders", "Orders"), icon: Package, hasDot: hasNewOrders },
    { id: "custom-requests", label: tt("account.tabs.customRequests", "Custom Requests"), icon: MessageSquare, hasDot: hasNewCustomRequests },
    { id: "invoices", label: tt("account.tabs.invoices", "Invoices"), icon: FileText },
    { id: "rewards", label: tt("account.tabs.rewards", "Rewards"), icon: Star },
    { id: "vouchers", label: tt("account.tabs.vouchers", "Vouchers"), icon: Gift },
    { id: "preferences", label: tt("account.tabs.preferences", "Preferences"), icon: Heart },
    { id: "settings", label: tt("account.tabs.settings", "Settings"), icon: Settings },
  ];

  return (
    <div className="py-6 lg:py-8">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold uppercase text-foreground lg:text-3xl">
              {greeting}{profileName ? `, ${profileName}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="font-display uppercase tracking-wider"><Shield className="mr-1 h-4 w-4" /> {tt("nav.admin", "Admin")}</Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={signOut} className="font-display uppercase tracking-wider"><LogOut className="mr-1 h-4 w-4" /> {tt("nav.signOut", "Sign Out")}</Button>
          </div>
        </div>

        {/* Mobile: horizontal scrollable pills */}
        <div className="mb-6 lg:hidden">
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {sidebarItems.map(({ id, label, icon: Icon, hasDot }) => (
                <Button
                  key={id}
                  variant={tab === id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => changeTab(id)}
                  className={`relative shrink-0 font-display text-xs uppercase tracking-wider transition-all ${
                    tab === id ? "glow-primary shadow-md" : "bg-card/60 hover:bg-muted/40 border border-border/20"
                  }`}
                >
                  <Icon className="mr-1 h-3.5 w-3.5" />
                  {label}
                  {hasDot && <span className="ml-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Desktop: sidebar + content */}
        <div className="flex gap-6">
          {/* Sidebar — desktop only */}
          <nav className="hidden lg:flex w-56 shrink-0 flex-col gap-1 rounded-2xl border border-border/20 bg-card/40 p-3 backdrop-blur-sm self-start sticky top-24">
            {sidebarItems.map(({ id, label, icon: Icon, hasDot }) => (
              <button
                key={id}
                onClick={() => changeTab(id)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left font-display text-xs uppercase tracking-wider transition-all ${
                  tab === id
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {hasDot && <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />}
              </button>
            ))}
          </nav>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {tab === "dashboard" && (
              <>
                <AccountOverviewPanel {...moduleProps} config={config} />
                <div className="mt-6">
                  <AccountDashboard
                    {...moduleProps}
                    orders={orders}
                    customOrders={customOrders}
                    userVouchers={userVouchers}
                    onSwitchTab={(t) => changeTab(t as MainTab)}
                  />
                </div>
              </>
            )}

            {tab === "orders" && (
              <OrdersModule {...moduleProps} orders={orders} seenState={seenState} />
            )}

            {tab === "custom-requests" && (
              <CustomOrdersModule {...moduleProps} customOrders={customOrders} customOrderMessages={customOrderMessages} seenState={seenState} />
            )}

            {tab === "invoices" && (
              <InvoicesModule {...moduleProps} invoices={invoices} />
            )}

            {tab === "rewards" && (
              <RewardsModule {...moduleProps} vouchers={vouchers} overviewLoading={overviewLoading} />
            )}

            {tab === "vouchers" && (
              <VouchersModule {...moduleProps} userVouchers={userVouchers} overviewLoading={overviewLoading} />
            )}

            {tab === "preferences" && (
              <SavedPreferencesModule tt={tt} />
            )}

            {tab === "settings" && (
              <SettingsModule {...moduleProps} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
