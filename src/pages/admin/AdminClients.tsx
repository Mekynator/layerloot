import { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Gift, Mail, Pencil, Plus, Minus, ShieldCheck, ShoppingBag, Ticket, Crown, AlertTriangle, UserMinus, Users, Zap, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AuthUser {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: string | null;
  user_metadata?: {
    full_name?: string;
  } | null;
}

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderRow {
  id: string;
  user_id: string | null;
  status: string;
  total: number;
  created_at: string;
  tool_type: string | null;
}

interface CustomOrderRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
  final_agreed_price: number | null;
  quoted_price: number | null;
  customer_offer_price: number | null;
  payment_status: string;
  production_status: string;
}

interface LoyaltyRow {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  created_at: string;
}

interface VoucherDefinition {
  id: string;
  name: string;
  discount_type: string;
  discount_value: number;
  points_cost: number;
}

interface VoucherRow {
  id: string;
  user_id: string;
  code: string;
  is_used: boolean;
  balance: number | null;
  recipient_email: string | null;
  recipient_name: string | null;
  redeemed_at: string;
  used_at: string | null;
  vouchers: VoucherDefinition | VoucherDefinition[] | null;
}

interface UserRoleRow {
  user_id: string;
  role: "admin" | "user";
}

interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  created_at: string;
  tone?: "default" | "positive" | "negative";
}

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string;
  joined_at: string;
  last_sign_in_at: string | null;
  last_activity_at: string | null;
  role: "admin" | "user";
  profile: ProfileRow | null;
  points_balance: number;
  order_count: number;
  total_spent: number;
  active_vouchers: number;
  used_vouchers: number;
  custom_order_count: number;
  orders: OrderRow[];
  customOrders: CustomOrderRow[];
  loyaltyHistory: LoyaltyRow[];
  vouchers: VoucherRow[];
  activity: ActivityItem[];
  tier: "new" | "active" | "loyal" | "vip" | "dormant" | "at_risk";
  daysSinceLastActivity: number | null;
  recommendedAction: string | null;
}

const TIER_STYLES: Record<AdminUser["tier"], string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  loyal: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  vip: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  dormant: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  at_risk: "bg-red-500/10 text-red-400 border-red-500/20",
};

const TIER_LABELS: Record<AdminUser["tier"], string> = {
  new: "New", active: "Active", loyal: "Loyal", vip: "VIP", dormant: "Dormant", at_risk: "At Risk",
};

function classifyTier(orderCount: number, totalSpent: number, daysSince: number | null): AdminUser["tier"] {
  if (daysSince !== null && daysSince > 90) return "dormant";
  if (daysSince !== null && daysSince > 60 && totalSpent > 500) return "at_risk";
  if (totalSpent > 3000 || orderCount > 8) return "vip";
  if (orderCount >= 3 || totalSpent > 1000) return "loyal";
  if (orderCount >= 1) return "active";
  return "new";
}

function getRecommendedAction(user: { tier: AdminUser["tier"]; unusedVouchers: number; customOrderCount: number; pointsBalance: number }): string | null {
  if (user.tier === "at_risk") return "Send personalized win-back offer";
  if (user.tier === "dormant") return "Re-engage with discount campaign";
  if (user.tier === "vip" && user.unusedVouchers === 0) return "Reward with exclusive voucher";
  if (user.unusedVouchers > 0) return "Remind about unused vouchers";
  if (user.pointsBalance > 200) return "Encourage reward redemption";
  if (user.customOrderCount > 0 && user.tier === "active") return "Follow up on custom orders";
  return null;
}

const currency = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 2,
});

const dateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : "—");
const dateOnly = (value: string | null) => (value ? new Date(value).toLocaleDateString() : "—");

function getVoucherDefinition(voucher: VoucherRow): VoucherDefinition | null {
  if (!voucher.vouchers) return null;
  return Array.isArray(voucher.vouchers) ? voucher.vouchers[0] ?? null : voucher.vouchers;
}

function getVoucherSummary(voucher: VoucherRow) {
  const definition = getVoucherDefinition(voucher);
  if (!definition) return "Voucher";
  if (definition.discount_type === "gift_card") {
    return `${definition.name} · ${Number(voucher.balance ?? definition.discount_value).toFixed(0)} kr`;
  }
  if (definition.discount_type === "percentage") {
    return `${definition.name} · ${Number(definition.discount_value).toFixed(0)}%`;
  }
  return `${definition.name} · ${Number(definition.discount_value).toFixed(0)} kr`;
}

function buildActivityItems(args: {
  user: AuthUser;
  profile: ProfileRow | null;
  orders: OrderRow[];
  customOrders: CustomOrderRow[];
  loyaltyHistory: LoyaltyRow[];
  vouchers: VoucherRow[];
}): ActivityItem[] {
  const items: ActivityItem[] = [
    {
      id: `joined-${args.user.id}`,
      label: "Account created",
      detail: args.user.email || "Registered user",
      created_at: args.user.created_at,
    },
  ];

  if (args.user.last_sign_in_at) {
    items.push({
      id: `signin-${args.user.id}`,
      label: "Last sign-in",
      detail: "User authenticated successfully",
      created_at: args.user.last_sign_in_at,
    });
  }

  if (args.profile?.updated_at) {
    items.push({
      id: `profile-${args.user.id}`,
      label: "Profile updated",
      detail: args.profile.full_name || "Profile details changed",
      created_at: args.profile.updated_at,
    });
  }

  args.orders.forEach((order) => {
    items.push({
      id: `order-${order.id}`,
      label: "Store order",
      detail: `#${order.id.slice(0, 8)} · ${order.status} · ${currency.format(Number(order.total || 0))}`,
      created_at: order.created_at,
    });
  });

  args.customOrders.forEach((order) => {
    const amount = Number(order.final_agreed_price ?? order.quoted_price ?? order.customer_offer_price ?? 0);
    items.push({
      id: `custom-${order.id}`,
      label: "Custom request",
      detail: `${order.production_status || order.status} · ${currency.format(amount)}`,
      created_at: order.updated_at || order.created_at,
    });
  });

  args.loyaltyHistory.forEach((row) => {
    items.push({
      id: `points-${row.id}`,
      label: "Points update",
      detail: `${row.reason} · ${row.points > 0 ? `+${row.points}` : row.points} pts`,
      created_at: row.created_at,
      tone: row.points >= 0 ? "positive" : "negative",
    });
  });

  args.vouchers.forEach((voucher) => {
    items.push({
      id: `voucher-${voucher.id}`,
      label: voucher.is_used ? "Voucher used" : "Voucher redeemed",
      detail: `${getVoucherSummary(voucher)} · ${voucher.code}`,
      created_at: voucher.used_at || voucher.redeemed_at,
    });
  });

  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

const AdminClients = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsReason, setPointsReason] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [adjustingPoints, setAdjustingPoints] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);

    const [
      authUsersRes,
      profilesRes,
      ordersRes,
      customOrdersRes,
      loyaltyRes,
      vouchersRes,
      rolesRes,
    ] = await Promise.all([
      supabase.functions.invoke("admin-users"),
      supabase.from("profiles").select("id, user_id, full_name, created_at, updated_at"),
      supabase.from("orders").select("id, user_id, status, total, created_at, tool_type").order("created_at", { ascending: false }),
      supabase
        .from("custom_orders")
        .select("id, user_id, name, email, status, created_at, updated_at, final_agreed_price, quoted_price, customer_offer_price, payment_status, production_status")
        .order("updated_at", { ascending: false }) as unknown as Promise<{ data: any[] | null; error: any }>,
      supabase.from("loyalty_points").select("id, user_id, points, reason, created_at").order("created_at", { ascending: false }),
      supabase
        .from("user_vouchers")
        .select("id, user_id, code, is_used, balance, recipient_email, recipient_name, redeemed_at, used_at, vouchers(id, name, discount_type, discount_value, points_cost)")
        .order("redeemed_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (authUsersRes.error) {
      setLoading(false);
      toast({
        title: "Error loading users",
        description: authUsersRes.error.message || "Admin user directory is not available yet.",
        variant: "destructive",
      });
      return;
    }

    const tableErrors = [
      profilesRes.error,
      ordersRes.error,
      customOrdersRes.error,
      loyaltyRes.error,
      vouchersRes.error,
      rolesRes.error,
    ].filter(Boolean);

    if (tableErrors.length > 0) {
      setLoading(false);
      toast({
        title: "Error loading admin data",
        description: tableErrors[0]?.message || "One of the admin queries failed.",
        variant: "destructive",
      });
      return;
    }

    const authUsers = ((authUsersRes.data as { users?: AuthUser[] } | null)?.users ?? []) as AuthUser[];
    const profiles = (profilesRes.data ?? []) as ProfileRow[];
    const orders = (ordersRes.data ?? []) as OrderRow[];
    const customOrders = (customOrdersRes.data ?? []) as CustomOrderRow[];
    const loyaltyRows = (loyaltyRes.data ?? []) as LoyaltyRow[];
    const vouchers = (vouchersRes.data ?? []) as VoucherRow[];
    const roles = (rolesRes.data ?? []) as UserRoleRow[];

    const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
    const roleMap = new Map(roles.map((role) => [role.user_id, role.role]));
    const ordersMap = new Map<string, OrderRow[]>();
    const customOrdersMap = new Map<string, CustomOrderRow[]>();
    const pointsMap = new Map<string, LoyaltyRow[]>();
    const voucherMap = new Map<string, VoucherRow[]>();

    orders.forEach((order) => {
      if (!order.user_id) return;
      ordersMap.set(order.user_id, [...(ordersMap.get(order.user_id) ?? []), order]);
    });

    customOrders.forEach((order) => {
      customOrdersMap.set(order.user_id, [...(customOrdersMap.get(order.user_id) ?? []), order]);
    });

    loyaltyRows.forEach((row) => {
      pointsMap.set(row.user_id, [...(pointsMap.get(row.user_id) ?? []), row]);
    });

    vouchers.forEach((voucher) => {
      voucherMap.set(voucher.user_id, [...(voucherMap.get(voucher.user_id) ?? []), voucher]);
    });

    const nextUsers = authUsers.map((authUser) => {
      const profile = profileMap.get(authUser.id) ?? null;
      const userOrders = ordersMap.get(authUser.id) ?? [];
      const userCustomOrders = customOrdersMap.get(authUser.id) ?? [];
      const userLoyalty = pointsMap.get(authUser.id) ?? [];
      const userVouchers = voucherMap.get(authUser.id) ?? [];
      const pointsBalance = userLoyalty.reduce((sum, row) => sum + Number(row.points ?? 0), 0);
      const totalSpent = userOrders.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
      const activity = buildActivityItems({
        user: authUser,
        profile,
        orders: userOrders,
        customOrders: userCustomOrders,
        loyaltyHistory: userLoyalty,
        vouchers: userVouchers,
      });

      const lastActivityAt = activity[0]?.created_at ?? authUser.last_sign_in_at ?? authUser.created_at;
      const daysSince = lastActivityAt ? Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86400000) : null;
      const orderCount = userOrders.length;
      const activeVouchers = userVouchers.filter((voucher) => !voucher.is_used).length;
      const customOrderCount = userCustomOrders.length;
      const tier = classifyTier(orderCount, totalSpent, daysSince);

      return {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Unnamed user",
        joined_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        last_activity_at: lastActivityAt,
        role: roleMap.get(authUser.id) === "admin" || authUser.role === "admin" ? "admin" : "user",
        profile,
        points_balance: pointsBalance,
        order_count: orderCount,
        total_spent: totalSpent,
        active_vouchers: activeVouchers,
        used_vouchers: userVouchers.filter((voucher) => voucher.is_used).length,
        custom_order_count: customOrderCount,
        orders: userOrders,
        customOrders: userCustomOrders,
        loyaltyHistory: userLoyalty,
        vouchers: userVouchers,
        activity,
        tier,
        daysSinceLastActivity: daysSince,
        recommendedAction: getRecommendedAction({ tier, unusedVouchers: activeVouchers, customOrderCount, pointsBalance }),
      } satisfies AdminUser;
    });

    setUsers(
      nextUsers.sort(
        (a, b) => new Date(b.last_activity_at || b.joined_at).getTime() - new Date(a.last_activity_at || a.joined_at).getTime(),
      ),
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => [user.full_name, user.email || "", user.id].some((value) => value.toLowerCase().includes(query)));
  }, [search, users]);

  const summary = useMemo(() => {
    const totalRevenue = users.reduce((sum, user) => sum + user.total_spent, 0);
    const activeUsers = users.filter((user) => {
      if (!user.last_activity_at) return false;
      const activityDate = new Date(user.last_activity_at);
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - 30);
      return activityDate >= threshold;
    }).length;

    return {
      users: users.length,
      admins: users.filter((user) => user.role === "admin").length,
      activeUsers,
      totalRevenue,
    };
  }, [users]);

  const openEdit = (user: AdminUser) => {
    setEditUser(user);
    setEditName(user.profile?.full_name || user.full_name || "");
    setPointsAmount(0);
    setPointsReason("");
  };

  const saveProfile = async () => {
    if (!editUser) return;
    setSavingProfile(true);

    const payload = {
      full_name: editName.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const query = editUser.profile
      ? supabase.from("profiles").update(payload).eq("user_id", editUser.id)
      : supabase.from("profiles").insert({
          user_id: editUser.id,
          full_name: editName.trim() || null,
        });

    const { error } = await query;
    setSavingProfile(false);

    if (error) {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Profile updated" });
    await fetchUsers();
  };

  const adjustPoints = async (positive: boolean) => {
    if (!editUser || pointsAmount <= 0 || !pointsReason.trim()) {
      toast({ title: "Enter an amount and reason", variant: "destructive" });
      return;
    }

    setAdjustingPoints(true);
    const { error } = await supabase.from("loyalty_points").insert({
      user_id: editUser.id,
      points: positive ? pointsAmount : -pointsAmount,
      reason: pointsReason.trim(),
    });
    setAdjustingPoints(false);

    if (error) {
      toast({ title: "Error updating points", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: `${positive ? "Added" : "Removed"} ${pointsAmount} points` });
    setPointsAmount(0);
    setPointsReason("");
    await fetchUsers();
  };

  const selectedUser = useMemo(() => (editUser ? users.find((user) => user.id === editUser.id) ?? editUser : null), [editUser, users]);

  return (
    
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">Registered accounts, orders, rewards, and recent activity in one place.</p>
        </div>
        <div className="w-full max-w-sm">
          <Label htmlFor="user-search" className="sr-only">
            Search users
          </Label>
          <Input
            id="user-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, or user id"
          />
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Registered users</p>
            <p className="mt-2 font-display text-3xl font-bold">{summary.users}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admins</p>
            <p className="mt-2 font-display text-3xl font-bold">{summary.admins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active last 30 days</p>
            <p className="mt-2 font-display text-3xl font-bold">{summary.activeUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Store revenue</p>
            <p className="mt-2 font-display text-3xl font-bold">{currency.format(summary.totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Action Hint</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No matching users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-display text-sm font-semibold uppercase">{user.full_name}</p>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role === "admin" ? "Admin" : "User"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email || "No email available"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${TIER_STYLES[user.tier]}`}>
                        {TIER_LABELS[user.tier]}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.order_count + user.custom_order_count}</TableCell>
                    <TableCell className="font-display font-bold text-primary">{currency.format(user.total_spent)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.points_balance} pts</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{dateTime(user.last_activity_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {user.recommendedAction || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedUser}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">User details</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-transparent p-0">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="crm">CRM</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="rewards">Rewards</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display uppercase">Account</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Full name</Label>
                          <div className="mt-2 flex gap-2">
                            <Input value={editName} onChange={(event) => setEditName(event.target.value)} />
                            <Button onClick={saveProfile} disabled={savingProfile}>
                              {savingProfile ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label>Email</Label>
                          <div className="mt-2 flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{selectedUser.email || "No email available"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Joined</p>
                          <p className="mt-2 text-sm font-medium">{dateTime(selectedUser.joined_at)}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last sign-in</p>
                          <p className="mt-2 text-sm font-medium">{dateTime(selectedUser.last_sign_in_at)}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last activity</p>
                          <p className="mt-2 text-sm font-medium">{dateTime(selectedUser.last_activity_at)}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Role</p>
                          <p className="mt-2 flex items-center gap-2 text-sm font-medium">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            {selectedUser.role}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display uppercase">Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Orders</p>
                        <p className="mt-2 font-display text-2xl font-bold">{selectedUser.order_count}</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Store spend</p>
                        <p className="mt-2 font-display text-2xl font-bold">{currency.format(selectedUser.total_spent)}</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Custom requests</p>
                        <p className="mt-2 font-display text-2xl font-bold">{selectedUser.custom_order_count}</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active rewards</p>
                        <p className="mt-2 font-display text-2xl font-bold">{selectedUser.active_vouchers}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="crm" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display uppercase">Customer Intelligence</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${TIER_STYLES[selectedUser.tier]}`}>
                          {selectedUser.tier === "vip" ? <Crown className="h-5 w-5" /> :
                           selectedUser.tier === "at_risk" ? <AlertTriangle className="h-5 w-5" /> :
                           selectedUser.tier === "dormant" ? <UserMinus className="h-5 w-5" /> :
                           <Users className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Customer Tier</p>
                          <Badge variant="outline" className={`mt-1 ${TIER_STYLES[selectedUser.tier]}`}>
                            {TIER_LABELS[selectedUser.tier]}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Avg Order Value</p>
                          <p className="mt-2 font-display text-xl font-bold">
                            {selectedUser.order_count > 0 ? currency.format(selectedUser.total_spent / selectedUser.order_count) : "—"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Days Since Activity</p>
                          <p className="mt-2 font-display text-xl font-bold">
                            {selectedUser.daysSinceLastActivity !== null ? `${selectedUser.daysSinceLastActivity}d` : "—"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lifetime Value</p>
                          <p className="mt-2 font-display text-xl font-bold">{currency.format(selectedUser.total_spent)}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Unused Vouchers</p>
                          <p className="mt-2 font-display text-xl font-bold">{selectedUser.active_vouchers}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display uppercase">Recommended Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedUser.recommendedAction ? (
                        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{selectedUser.recommendedAction}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Based on {TIER_LABELS[selectedUser.tier]} tier classification and activity patterns.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-foreground">
                          No specific action needed — customer is engaged.
                        </div>
                      )}

                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quick Actions</p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                            <Link to="/discounts">Create Offer</Link>
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                            <Link to="/campaigns">Start Campaign</Link>
                          </Button>
                          {selectedUser.custom_order_count > 0 && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                              <Link to="/custom-orders">View Custom Orders</Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display uppercase">Store orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[420px] pr-4">
                        <div className="space-y-3">
                          {selectedUser.orders.length === 0 ? (
                            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                              No store orders yet.
                            </div>
                          ) : (
                            selectedUser.orders.map((order) => (
                              <div key={order.id} className="rounded-lg border border-border p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-display text-sm font-semibold uppercase">#{order.id.slice(0, 8)}</p>
                                    <p className="text-xs text-muted-foreground">{dateTime(order.created_at)}</p>
                                  </div>
                                  <Badge variant="outline">{order.status}</Badge>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{order.tool_type || "Store"}</span>
                                  <span className="font-semibold text-primary">{currency.format(Number(order.total || 0))}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display uppercase">Custom requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[420px] pr-4">
                        <div className="space-y-3">
                          {selectedUser.customOrders.length === 0 ? (
                            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                              No custom requests yet.
                            </div>
                          ) : (
                            selectedUser.customOrders.map((order) => {
                              const amount = Number(order.final_agreed_price ?? order.quoted_price ?? order.customer_offer_price ?? 0);
                              return (
                                <div key={order.id} className="rounded-lg border border-border p-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="font-display text-sm font-semibold uppercase">#{order.id.slice(0, 8)}</p>
                                      <p className="text-xs text-muted-foreground">{dateTime(order.updated_at || order.created_at)}</p>
                                    </div>
                                    <Badge variant="outline">{order.production_status || order.status}</Badge>
                                  </div>
                                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                    <span>{order.payment_status}</span>
                                    <span>{currency.format(amount)}</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="rewards" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display uppercase">Loyalty controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current balance</p>
                        <p className="mt-2 font-display text-3xl font-bold">{selectedUser.points_balance} pts</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          min={1}
                          value={pointsAmount || ""}
                          onChange={(event) => setPointsAmount(parseInt(event.target.value, 10) || 0)}
                          placeholder="Points amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reason</Label>
                        <Input
                          value={pointsReason}
                          onChange={(event) => setPointsReason(event.target.value)}
                          placeholder="Reason for the adjustment"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => adjustPoints(true)} disabled={adjustingPoints} className="flex-1">
                          <Plus className="mr-1 h-4 w-4" /> Add
                        </Button>
                        <Button onClick={() => adjustPoints(false)} disabled={adjustingPoints} variant="destructive" className="flex-1">
                          <Minus className="mr-1 h-4 w-4" /> Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="font-display uppercase">Vouchers and gift cards</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[220px] pr-4">
                          <div className="space-y-3">
                            {selectedUser.vouchers.length === 0 ? (
                              <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                                No rewards redeemed yet.
                              </div>
                            ) : (
                              selectedUser.vouchers.map((voucher) => (
                                <div key={voucher.id} className="rounded-lg border border-border p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-medium text-foreground">{getVoucherSummary(voucher)}</p>
                                      <p className="mt-1 text-xs text-muted-foreground">{voucher.code}</p>
                                      {voucher.recipient_email && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          Gifted to {voucher.recipient_name || voucher.recipient_email}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant={voucher.is_used ? "secondary" : "outline"}>
                                      {voucher.is_used ? "Used" : "Active"}
                                    </Badge>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="font-display uppercase">Points history</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[220px] pr-4">
                          <div className="space-y-3">
                            {selectedUser.loyaltyHistory.length === 0 ? (
                              <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                                No loyalty activity yet.
                              </div>
                            ) : (
                              selectedUser.loyaltyHistory.map((row) => (
                                <div key={row.id} className="flex items-center justify-between rounded-lg border border-border p-4 text-sm">
                                  <div>
                                    <p className="font-medium text-foreground">{row.reason}</p>
                                    <p className="text-xs text-muted-foreground">{dateTime(row.created_at)}</p>
                                  </div>
                                  <span className={row.points >= 0 ? "font-semibold text-green-600" : "font-semibold text-red-600"}>
                                    {row.points > 0 ? `+${row.points}` : row.points} pts
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display uppercase">Recent activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[520px] pr-4">
                      <div className="space-y-3">
                        {selectedUser.activity.length === 0 ? (
                          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                            No activity recorded yet.
                          </div>
                        ) : (
                          selectedUser.activity.map((item) => (
                            <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border p-4">
                              <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                                {item.label.includes("order") ? (
                                  <ShoppingBag className="h-4 w-4" />
                                ) : item.label.includes("Voucher") ? (
                                  <Ticket className="h-4 w-4" />
                                ) : item.label.includes("Points") ? (
                                  <Gift className="h-4 w-4" />
                                ) : item.label.includes("sign") ? (
                                  <Clock3 className="h-4 w-4" />
                                ) : (
                                  <Activity className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-foreground">{item.label}</p>
                                  <span className="text-xs text-muted-foreground">{dateTime(item.created_at)}</span>
                                </div>
                                <p
                                  className={`mt-1 text-sm ${
                                    item.tone === "positive"
                                      ? "text-green-600"
                                      : item.tone === "negative"
                                        ? "text-red-600"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  {item.detail}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    
  );
};

export default AdminClients;
