import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Copy, Plus, Save, Search, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import RewardsStoreEditor from "@/components/admin/RewardsStoreEditor";

type TargetMode = "all" | "specific_user" | "specific_users" | "rules_based";

type RuleGroup = "existing" | "new_registered" | "newcomer" | "invited" | "min_points" | "min_orders" | "referral" | "achievement";

interface DiscountRules {
  specific_ids?: string[];
  groups?: RuleGroup[];
  new_registered_days?: number;
  newcomer_logic?: "days" | "zero_orders";
  newcomer_days?: number;
  min_points?: number;
  min_orders?: number;
  achievement_keys?: string[];
  referral_requirements?: {
    min_successful_invites?: number;
    min_registered_invites?: number;
  };
}

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  scope: string;
  scope_target_id: string | null;
  scope_target_user_id: string | null;
  target_mode: TargetMode;
  discount_rules: DiscountRules | null;
  per_user_limit: number | null;
  priority: number;
  min_order_amount: number;
  min_quantity: number;
  max_uses: number | null;
  used_count: number;
  is_stackable: boolean;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface ProductOption { id: string; name: string; }
interface CategoryOption { id: string; name: string; }

interface AuthUser {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: string | null;
  user_metadata?: { full_name?: string } | null;
}

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

interface UserOption {
  id: string;
  label: string;
  searchText: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_invited?: boolean;
}

interface DiscountForm {
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  scope: string;
  scope_target_id: string | null;
  target_mode: TargetMode;
  // specific_user
  scope_target_user_id: string | null;
  // specific_users
  specific_user_ids: string[];
  // rules_based
  rule_groups: RuleGroup[];
  new_registered_days: number;
  newcomer_logic: "days" | "zero_orders";
  newcomer_days: number;
  min_points: number;
  min_orders: number;
  achievement_keys: string[];
  referral_min_successful: number;
  referral_min_registered: number;
  // common
  min_order_amount: number;
  min_quantity: number;
  max_uses: number | null;
  per_user_limit: number | null;
  priority: number;
  is_stackable: boolean;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
}

const emptyForm: DiscountForm = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  scope: "all",
  scope_target_id: null,
  target_mode: "all",
  scope_target_user_id: null,
  specific_user_ids: [],
  rule_groups: [],
  new_registered_days: 14,
  newcomer_logic: "days",
  newcomer_days: 30,
  min_points: 0,
  min_orders: 0,
  achievement_keys: [],
  referral_min_successful: 0,
  referral_min_registered: 0,
  min_order_amount: 0,
  min_quantity: 1,
  max_uses: null,
  per_user_limit: null,
  priority: 0,
  is_stackable: false,
  is_active: true,
  starts_at: null,
  expires_at: null,
};

const RULE_GROUP_OPTIONS: { value: RuleGroup; label: string; desc: string }[] = [
  { value: "existing", label: "All Existing Users", desc: "Every registered account" },
  { value: "new_registered", label: "Newly Registered", desc: "Users who signed up within X days" },
  { value: "newcomer", label: "Newcomers", desc: "New users based on configurable logic" },
  { value: "invited", label: "Invited Users", desc: "Users who joined via referral invite" },
  { value: "min_points", label: "Min Loyalty Points", desc: "Users with at least X loyalty points" },
  { value: "min_orders", label: "Min Completed Orders", desc: "Users with at least X completed orders" },
  { value: "referral", label: "Referral Milestones", desc: "Users who invited X people" },
  { value: "achievement", label: "Achievement Holders", desc: "Users with specific achievements" },
];

const AdminDiscounts = () => {
  const { toast } = useToast();

  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState<DiscountForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [userSearch, setUserSearch] = useState("");
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  const fetchAll = async () => {
    setLoading(true);

    const [
      { data: discountData, error: discountError },
      { data: productData },
      { data: categoryData },
      authUsersRes,
      profilesRes,
      { data: referralData },
    ] = await Promise.all([
      supabase.from("discount_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.functions.invoke("admin-users"),
      supabase.from("profiles").select("id, user_id, full_name, created_at, updated_at"),
      supabase.from("referral_invites").select("invited_user_id").not("invited_user_id", "is", null),
    ]);

    if (discountError) {
      toast({ title: "Failed to load discounts", description: discountError.message, variant: "destructive" });
    }

    setDiscounts((discountData as unknown as DiscountCode[]) ?? []);
    setProducts((productData as ProductOption[]) ?? []);
    setCategories((categoryData as CategoryOption[]) ?? []);

    const authUsers = ((authUsersRes.data as { users?: AuthUser[] } | null)?.users ?? []) as AuthUser[];
    const profiles = (profilesRes.data ?? []) as ProfileRow[];
    const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
    const invitedUserIds = new Set(
      ((referralData ?? []) as Array<{ invited_user_id: string }>).map((r) => r.invited_user_id),
    );

    const mappedUsers = authUsers.map((u) => {
      const profile = profileMap.get(u.id);
      const email = (u.email || "").trim();
      const fullName = (profile?.full_name || u.user_metadata?.full_name || "").trim();
      return {
        id: u.id,
        label: email || fullName || u.id,
        searchText: `${email} ${fullName} ${u.id}`.toLowerCase(),
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        is_invited: invitedUserIds.has(u.id),
      } satisfies UserOption;
    });

    setUsers(Array.from(new Map(mappedUsers.map((u) => [u.id, u])).values()).sort((a, b) => a.label.localeCompare(b.label)));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Derive selected user labels
  const selectedUserIds = form.target_mode === "specific_user"
    ? (form.scope_target_user_id ? [form.scope_target_user_id] : [])
    : form.specific_user_ids;

  const selectedUsers = useMemo(
    () => users.filter((u) => selectedUserIds.includes(u.id)),
    [users, selectedUserIds],
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.searchText.includes(q));
  }, [users, userSearch]);

  const userButtonLabel = useMemo(() => {
    if (selectedUsers.length === 0) return "Select users";
    if (selectedUsers.length === 1) return selectedUsers[0].label;
    return `${selectedUsers.length} users selected`;
  }, [selectedUsers]);

  const openCreate = () => {
    setEditing(null);
    setUserSearch("");
    setForm({ ...emptyForm, code: `LL-${Math.random().toString(36).substring(2, 8).toUpperCase()}` });
    setDialogOpen(true);
  };

  const openEdit = (d: DiscountCode) => {
    setEditing(d);
    setUserSearch("");

    const rules = d.discount_rules || {};
    const targetMode = (d.target_mode || "all") as TargetMode;

    setForm({
      code: d.code,
      description: d.description || "",
      discount_type: d.discount_type,
      discount_value: d.discount_value,
      scope: d.scope,
      scope_target_id: d.scope_target_id,
      target_mode: targetMode,
      scope_target_user_id: d.scope_target_user_id,
      specific_user_ids: rules.specific_ids || [],
      rule_groups: (rules.groups || []) as RuleGroup[],
      new_registered_days: rules.new_registered_days || 14,
      newcomer_logic: (rules.newcomer_logic as "days" | "zero_orders") || "days",
      newcomer_days: rules.newcomer_days || 30,
      min_points: rules.min_points || 0,
      min_orders: rules.min_orders || 0,
      achievement_keys: rules.achievement_keys || [],
      referral_min_successful: rules.referral_requirements?.min_successful_invites || 0,
      referral_min_registered: rules.referral_requirements?.min_registered_invites || 0,
      min_order_amount: d.min_order_amount,
      min_quantity: d.min_quantity,
      max_uses: d.max_uses,
      per_user_limit: d.per_user_limit,
      priority: d.priority,
      is_stackable: d.is_stackable,
      is_active: d.is_active,
      starts_at: d.starts_at,
      expires_at: d.expires_at,
    });
    setDialogOpen(true);
  };

  const toggleUserSelection = (userId: string) => {
    if (form.target_mode === "specific_user") {
      setForm((c) => ({ ...c, scope_target_user_id: c.scope_target_user_id === userId ? null : userId }));
    } else {
      setForm((c) => {
        const exists = c.specific_user_ids.includes(userId);
        return { ...c, specific_user_ids: exists ? c.specific_user_ids.filter((id) => id !== userId) : [...c.specific_user_ids, userId] };
      });
    }
  };

  const removeSelectedUser = (userId: string) => {
    if (form.target_mode === "specific_user") {
      setForm((c) => ({ ...c, scope_target_user_id: null }));
    } else {
      setForm((c) => ({ ...c, specific_user_ids: c.specific_user_ids.filter((id) => id !== userId) }));
    }
  };

  const toggleRuleGroup = (group: RuleGroup) => {
    setForm((c) => {
      const has = c.rule_groups.includes(group);
      return { ...c, rule_groups: has ? c.rule_groups.filter((g) => g !== group) : [...c.rule_groups, group] };
    });
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast({ title: "Code required", variant: "destructive" });
      return;
    }
    if ((form.scope === "product" || form.scope === "category") && !form.scope_target_id) {
      toast({ title: "Select a target", variant: "destructive" });
      return;
    }
    if (form.target_mode === "specific_user" && !form.scope_target_user_id) {
      toast({ title: "Select a user", variant: "destructive" });
      return;
    }
    if (form.target_mode === "specific_users" && form.specific_user_ids.length === 0) {
      toast({ title: "Select at least one user", variant: "destructive" });
      return;
    }
    if (form.target_mode === "rules_based" && form.rule_groups.length === 0) {
      toast({ title: "Select at least one rule group", variant: "destructive" });
      return;
    }

    setSaving(true);

    // Build discount_rules JSONB
    let discountRules: DiscountRules | null = null;
    let scopeTargetUserId: string | null = null;

    switch (form.target_mode) {
      case "specific_user":
        scopeTargetUserId = form.scope_target_user_id;
        break;
      case "specific_users":
        discountRules = { specific_ids: form.specific_user_ids };
        break;
      case "rules_based":
        discountRules = {
          groups: form.rule_groups,
          ...(form.rule_groups.includes("new_registered") && { new_registered_days: form.new_registered_days }),
          ...(form.rule_groups.includes("newcomer") && { newcomer_logic: form.newcomer_logic, newcomer_days: form.newcomer_days }),
          ...(form.rule_groups.includes("min_points") && form.min_points > 0 && { min_points: form.min_points }),
          ...(form.rule_groups.includes("min_orders") && form.min_orders > 0 && { min_orders: form.min_orders }),
          ...(form.rule_groups.includes("achievement") && form.achievement_keys.length > 0 && { achievement_keys: form.achievement_keys }),
          ...(form.rule_groups.includes("referral") && {
            referral_requirements: {
              min_successful_invites: form.referral_min_successful,
              min_registered_invites: form.referral_min_registered,
            },
          }),
        };
        break;
    }

    const payload: Record<string, unknown> = {
      code: form.code.toUpperCase(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      scope: form.scope,
      scope_target_id: form.scope === "product" || form.scope === "category" ? form.scope_target_id : null,
      target_mode: form.target_mode,
      scope_target_user_id: scopeTargetUserId,
      discount_rules: discountRules,
      min_order_amount: Number(form.min_order_amount) || 0,
      min_quantity: Number(form.min_quantity) || 1,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      per_user_limit: form.per_user_limit ? Number(form.per_user_limit) : null,
      priority: Number(form.priority) || 0,
      is_stackable: form.is_stackable,
      is_active: form.is_active,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
    };

    const { error } = editing
      ? await supabase.from("discount_codes").update(payload as never).eq("id", editing.id)
      : await supabase.from("discount_codes").insert(payload as never);

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: editing ? "Discount updated" : "Discount created" });
    setDialogOpen(false);
    setUserPickerOpen(false);
    fetchAll();
  };

  const toggleActive = async (d: DiscountCode) => {
    const { error } = await supabase.from("discount_codes").update({ is_active: !d.is_active }).eq("id", d.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    fetchAll();
  };

  const deleteDiscount = async (id: string) => {
    const { error } = await supabase.from("discount_codes").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Discount deleted" });
    fetchAll();
  };

  const getTargetLabel = (d: DiscountCode): string => {
    const mode = d.target_mode || "all";
    if (mode === "all") return "All users";
    if (mode === "specific_user") {
      const u = users.find((u) => u.id === d.scope_target_user_id);
      return u ? u.label : "1 specific user";
    }
    if (mode === "specific_users") {
      const ids = d.discount_rules?.specific_ids || [];
      return `${ids.length} specific user${ids.length !== 1 ? "s" : ""}`;
    }
    if (mode === "rules_based") {
      const groups = d.discount_rules?.groups || [];
      return groups.length > 0 ? groups.join(", ") : "Rules";
    }
    return "—";
  };

  const getScopeLabel = (d: DiscountCode) => {
    if (d.scope === "product") return products.find((p) => p.id === d.scope_target_id)?.name || "Specific product";
    if (d.scope === "category") return categories.find((c) => c.id === d.scope_target_id)?.name || "Specific category";
    if (d.scope === "bulk") return `Bulk (min ${d.min_quantity})`;
    return "All products";
  };

  const showUserPicker = form.target_mode === "specific_user" || form.target_mode === "specific_users";

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Discounts & Rewards</h1>
        <p className="text-sm text-muted-foreground">Manage discount codes and the rewards store catalog.</p>
      </div>

      <Tabs defaultValue="discounts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="discounts">Discount Codes</TabsTrigger>
          <TabsTrigger value="rewards">Rewards Store</TabsTrigger>
        </TabsList>

        <TabsContent value="discounts" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={openCreate} className="font-display uppercase tracking-wider">
              <Plus className="mr-1 h-4 w-4" /> New Discount
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="font-mono text-sm font-bold">{d.code}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => { navigator.clipboard.writeText(d.code); toast({ title: "Copied!" }); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{d.discount_type.replace("_", " ")}</TableCell>
                      <TableCell className="font-display text-sm font-semibold">
                        {d.discount_type === "percentage" ? `${d.discount_value}%` : d.discount_type === "free_shipping" ? "Free" : `${d.discount_value} kr`}
                      </TableCell>
                      <TableCell className="text-sm">{getScopeLabel(d)}</TableCell>
                      <TableCell className="text-sm">{getTargetLabel(d)}</TableCell>
                      <TableCell className="text-sm">{d.used_count}{d.max_uses ? `/${d.max_uses}` : ""}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {d.expires_at ? `Until ${new Date(d.expires_at).toLocaleDateString()}` : "No expiry"}
                      </TableCell>
                      <TableCell><Switch checked={d.is_active} onCheckedChange={() => toggleActive(d)} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>Edit</Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDiscount(d.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && discounts.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No discount codes yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Create/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setUserPickerOpen(false); setUserSearch(""); } }}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle className="font-display uppercase">{editing ? "Edit Discount" : "Create Discount"}</DialogTitle>
                <DialogDescription>Configure discount code settings.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Code + Description */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Code</Label>
                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER2026" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Summer sale 20% off" />
                  </div>
                </div>

                {/* Type + Value */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Discount Type</Label>
                    <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (kr)</SelectItem>
                        <SelectItem value="free_shipping">Free Shipping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{form.discount_type === "percentage" ? "Percentage" : "Amount (kr)"}</Label>
                    <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} disabled={form.discount_type === "free_shipping"} />
                  </div>
                </div>

                {/* Scope (product targeting) */}
                <div>
                  <Label>Product Scope</Label>
                  <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v, scope_target_id: null })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="product">Specific Product</SelectItem>
                      <SelectItem value="category">Specific Category</SelectItem>
                      <SelectItem value="bulk">Bulk Discount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.scope === "product" && (
                  <div>
                    <Label>Product</Label>
                    <Select value={form.scope_target_id ?? undefined} onValueChange={(v) => setForm({ ...form, scope_target_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                {form.scope === "category" && (
                  <div>
                    <Label>Category</Label>
                    <Select value={form.scope_target_id ?? undefined} onValueChange={(v) => setForm({ ...form, scope_target_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                {/* Target Mode (user targeting) */}
                <div>
                  <Label>User Targeting</Label>
                  <Select value={form.target_mode} onValueChange={(v) => setForm({ ...form, target_mode: v as TargetMode, scope_target_user_id: null, specific_user_ids: [], rule_groups: [] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="specific_user">Specific User</SelectItem>
                      <SelectItem value="specific_users">Multiple Users</SelectItem>
                      <SelectItem value="rules_based">Rules-Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* User Picker for specific_user / specific_users */}
                {showUserPicker && (
                  <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-4">
                    <Label className="text-xs">{form.target_mode === "specific_user" ? "Select one user" : "Select users"}</Label>
                    <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
                          <span className="truncate text-left">{userButtonLabel}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <div className="border-b p-3">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search email or name..." className="pl-9" />
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {filteredUsers.length > 0 ? filteredUsers.map((u) => {
                            const selected = selectedUserIds.includes(u.id);
                            return (
                              <button key={u.id} type="button" onClick={() => toggleUserSelection(u.id)}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground">
                                <span className="truncate">{u.label}</span>
                                <Check className={`ml-3 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                              </button>
                            );
                          }) : (
                            <div className="px-3 py-3 text-sm text-muted-foreground">No users found</div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedUsers.map((u) => (
                          <Badge key={u.id} variant="secondary" className="flex items-center gap-1 pr-1">
                            <span className="max-w-[220px] truncate">{u.label}</span>
                            <button type="button" onClick={() => removeSelectedUser(u.id)} className="rounded-full p-0.5 hover:bg-black/10">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Rules-Based targeting */}
                {form.target_mode === "rules_based" && (
                  <div className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-4">
                    <Label className="text-sm font-semibold">Rule Groups</Label>
                    <p className="text-xs text-muted-foreground">User must match at least one selected group (OR logic).</p>

                    <div className="space-y-2">
                      {RULE_GROUP_OPTIONS.map((opt) => (
                        <label key={opt.value} className="flex items-start gap-3 rounded-md border border-border/30 bg-card/60 p-3 cursor-pointer hover:bg-accent/10 transition-colors">
                          <Checkbox checked={form.rule_groups.includes(opt.value)} onCheckedChange={() => toggleRuleGroup(opt.value)} className="mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{opt.label}</p>
                            <p className="text-xs text-muted-foreground">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Conditional config panels */}
                    {form.rule_groups.includes("new_registered") && (
                      <div className="rounded-md border border-border/30 bg-card/40 p-3 space-y-2">
                        <Label className="text-xs">Registered within last</Label>
                        <Select value={String(form.new_registered_days)} onValueChange={(v) => setForm({ ...form, new_registered_days: Number(v) })}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[7, 14, 30, 60, 90].map((d) => <SelectItem key={d} value={String(d)}>{d} days</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {form.rule_groups.includes("newcomer") && (
                      <div className="rounded-md border border-border/30 bg-card/40 p-3 space-y-2">
                        <Label className="text-xs">Newcomer logic</Label>
                        <Select value={form.newcomer_logic} onValueChange={(v) => setForm({ ...form, newcomer_logic: v as "days" | "zero_orders" })}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">Registered within X days</SelectItem>
                            <SelectItem value="zero_orders">No completed orders yet</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="pt-1">
                          <Label className="text-xs">Within last</Label>
                          <Select value={String(form.newcomer_days)} onValueChange={(v) => setForm({ ...form, newcomer_days: Number(v) })}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[7, 14, 30, 60, 90].map((d) => <SelectItem key={d} value={String(d)}>{d} days</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {form.rule_groups.includes("min_points") && (
                      <div className="rounded-md border border-border/30 bg-card/40 p-3 space-y-2">
                        <Label className="text-xs">Minimum loyalty points</Label>
                        <Input type="number" value={form.min_points} onChange={(e) => setForm({ ...form, min_points: Number(e.target.value) })} className="h-9" />
                      </div>
                    )}

                    {form.rule_groups.includes("min_orders") && (
                      <div className="rounded-md border border-border/30 bg-card/40 p-3 space-y-2">
                        <Label className="text-xs">Minimum completed orders</Label>
                        <Input type="number" value={form.min_orders} onChange={(e) => setForm({ ...form, min_orders: Number(e.target.value) })} className="h-9" />
                      </div>
                    )}

                    {form.rule_groups.includes("referral") && (
                      <div className="rounded-md border border-border/30 bg-card/40 p-3 space-y-2">
                        <Label className="text-xs">Min successful invite orders</Label>
                        <Input type="number" value={form.referral_min_successful} onChange={(e) => setForm({ ...form, referral_min_successful: Number(e.target.value) })} className="h-9" />
                        <Label className="text-xs">Min registered invites</Label>
                        <Input type="number" value={form.referral_min_registered} onChange={(e) => setForm({ ...form, referral_min_registered: Number(e.target.value) })} className="h-9" />
                      </div>
                    )}

                    {form.rule_groups.includes("achievement") && (
                      <div className="rounded-md border border-border/30 bg-card/40 p-3 space-y-2">
                        <Label className="text-xs">Achievement keys (comma-separated)</Label>
                        <Input value={form.achievement_keys.join(", ")} onChange={(e) => setForm({ ...form, achievement_keys: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="invite_5, first_order" className="h-9" />
                      </div>
                    )}

                    {/* Summary */}
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
                      <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{form.rule_groups.length}</span> rule group{form.rule_groups.length !== 1 ? "s" : ""} active
                        </p>
                        <p className="text-xs text-muted-foreground italic">Applies to current and future users matching these criteria</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Limits */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <Label>Min Order (kr)</Label>
                    <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Min Quantity</Label>
                    <Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Max Uses</Label>
                    <Input type="number" value={form.max_uses ?? ""} onChange={(e) => setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : null })} placeholder="∞" />
                  </div>
                  <div>
                    <Label>Per-User Limit</Label>
                    <Input type="number" value={form.per_user_limit ?? ""} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value ? Number(e.target.value) : null })} placeholder="∞" />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Starts At</Label>
                    <Input type="datetime-local" value={form.starts_at ? new Date(form.starts_at).toISOString().slice(0, 16) : ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                  </div>
                  <div>
                    <Label>Expires At</Label>
                    <Input type="datetime-local" value={form.expires_at ? new Date(form.expires_at).toISOString().slice(0, 16) : ""} onChange={(e) => setForm({ ...form, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                  </div>
                </div>

                {/* Priority */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Priority</Label>
                    <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
                    <p className="text-xs text-muted-foreground mt-1">Higher = applied first when stacking</p>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_stackable} onCheckedChange={(v) => setForm({ ...form, is_stackable: v })} />
                    <Label>Stackable</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                    <Label>Active</Label>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full font-display uppercase tracking-wider">
                  <Save className="mr-1 h-4 w-4" />
                  {saving ? "Saving..." : editing ? "Update Discount" : "Create Discount"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="rewards">
          <RewardsStoreEditor />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminDiscounts;
