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

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  scope: string;
  scope_target_id: string | null;
  scope_target_user_id: string | null;
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

interface ProductOption {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

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

interface UserOption {
  id: string;
  label: string;
  searchText: string;
  created_at: string;
  last_sign_in_at: string | null;
  order_count?: number;
  is_invited?: boolean;
}

type AudienceGroup = "specific" | "existing" | "new_registered" | "newcomers" | "invited";

type DiscountForm = Omit<DiscountCode, "id" | "created_at" | "used_count" | "scope_target_user_id"> & {
  scope_target_user_ids: string[];
  audience_groups: AudienceGroup[];
  new_registered_days: number;
  newcomer_logic: "days" | "zero_orders";
  newcomer_days: number;
};

const emptyDiscount: DiscountForm = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  scope: "all",
  scope_target_id: null,
  min_order_amount: 0,
  min_quantity: 1,
  max_uses: null,
  is_stackable: false,
  is_active: true,
  starts_at: null,
  expires_at: null,
  scope_target_user_ids: [],
  audience_groups: ["specific"],
  new_registered_days: 14,
  newcomer_logic: "days",
  newcomer_days: 30,
};

const normalizeUserIds = (value: string | null) => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const AdminDiscounts = () => {
  const { toast } = useToast();

  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState<DiscountForm>(emptyDiscount);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [userSearch, setUserSearch] = useState("");
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  const fetchAll = async () => {
    setLoading(true);

    const [
      { data: discountData, error: discountError },
      { data: productData, error: productError },
      { data: categoryData, error: categoryError },
      authUsersRes,
      profilesRes,
    ] = await Promise.all([
      supabase.from("discount_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.functions.invoke("admin-users"),
      supabase.from("profiles").select("id, user_id, full_name, created_at, updated_at"),
    ]);

    if (discountError) {
      toast({
        title: "Failed to load discounts",
        description: discountError.message,
        variant: "destructive",
      });
    }

    if (productError) {
      toast({
        title: "Failed to load products",
        description: productError.message,
        variant: "destructive",
      });
    }

    if (categoryError) {
      toast({
        title: "Failed to load categories",
        description: categoryError.message,
        variant: "destructive",
      });
    }

    if (authUsersRes.error) {
      toast({
        title: "Failed to load users",
        description: authUsersRes.error.message || "Admin user directory is not available.",
        variant: "destructive",
      });
    }

    if (profilesRes.error) {
      toast({
        title: "Failed to load profiles",
        description: profilesRes.error.message,
        variant: "destructive",
      });
    }

    setDiscounts((discountData as DiscountCode[]) ?? []);
    setProducts((productData as ProductOption[]) ?? []);
    setCategories((categoryData as CategoryOption[]) ?? []);

    const authUsers = ((authUsersRes.data as { users?: AuthUser[] } | null)?.users ?? []) as AuthUser[];
    const profiles = (profilesRes.data ?? []) as ProfileRow[];
    const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));

    const mappedUsers = authUsers.map((authUser) => {
      const profile = profileMap.get(authUser.id) ?? null;
      const email = (authUser.email || "").trim();
      const fullName = (profile?.full_name || authUser.user_metadata?.full_name || "").trim();

      return {
        id: authUser.id,
        label: email || fullName || authUser.id,
        searchText: `${email} ${fullName} ${authUser.id}`.toLowerCase(),
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
      } satisfies UserOption;
    });

    const uniqueUsers = Array.from(new Map(mappedUsers.map((user) => [user.id, user])).values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );

    setUsers(uniqueUsers);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const selectedUsers = useMemo(
    () => users.filter((user) => form.scope_target_user_ids.includes(user.id)),
    [users, form.scope_target_user_ids],
  );

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => user.searchText.includes(query));
  }, [users, userSearch]);

  const userButtonLabel = useMemo(() => {
    if (selectedUsers.length === 0) return "Select users";
    if (selectedUsers.length === 1) return selectedUsers[0].label;
    return `${selectedUsers.length} users selected`;
  }, [selectedUsers]);

  const openCreate = () => {
    setEditing(null);
    setUserSearch("");
    setForm({
      ...emptyDiscount,
      code: `LL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    });
    setDialogOpen(true);
  };

  const openEdit = (discount: DiscountCode) => {
    setEditing(discount);
    setUserSearch("");
    setForm({
      code: discount.code,
      description: discount.description || "",
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      scope: discount.scope,
      scope_target_id: discount.scope_target_id,
      min_order_amount: discount.min_order_amount,
      min_quantity: discount.min_quantity,
      max_uses: discount.max_uses,
      is_stackable: discount.is_stackable,
      is_active: discount.is_active,
      starts_at: discount.starts_at,
      expires_at: discount.expires_at,
      scope_target_user_ids: normalizeUserIds(discount.scope_target_user_id),
      audience_groups: normalizeUserIds(discount.scope_target_user_id).length > 0 ? ["specific"] : ["existing"],
      new_registered_days: 14,
      newcomer_logic: "days",
      newcomer_days: 30,
    });
    setDialogOpen(true);
  };

  const toggleUserSelection = (userId: string) => {
    setForm((current) => {
      const exists = current.scope_target_user_ids.includes(userId);
      return {
        ...current,
        scope_target_user_ids: exists
          ? current.scope_target_user_ids.filter((id) => id !== userId)
          : [...current.scope_target_user_ids, userId],
      };
    });
  };

  const removeSelectedUser = (userId: string) => {
    setForm((current) => ({
      ...current,
      scope_target_user_ids: current.scope_target_user_ids.filter((id) => id !== userId),
    }));
  };

  const toggleAudienceGroup = (group: AudienceGroup) => {
    setForm((current) => {
      const has = current.audience_groups.includes(group);
      const next = has
        ? current.audience_groups.filter((g) => g !== group)
        : [...current.audience_groups, group];
      return { ...current, audience_groups: next.length > 0 ? next : [group] };
    });
  };

  const matchedAudienceUsers = useMemo(() => {
    if (form.scope !== "user") return [];
    const now = Date.now();
    const ids = new Set<string>();

    for (const group of form.audience_groups) {
      if (group === "specific") {
        form.scope_target_user_ids.forEach((id) => ids.add(id));
      } else if (group === "existing") {
        users.forEach((u) => ids.add(u.id));
      } else if (group === "new_registered") {
        const cutoff = now - form.new_registered_days * 86400000;
        users.forEach((u) => {
          if (new Date(u.created_at).getTime() >= cutoff) ids.add(u.id);
        });
      } else if (group === "newcomers") {
        if (form.newcomer_logic === "days") {
          const cutoff = now - form.newcomer_days * 86400000;
          users.forEach((u) => {
            if (new Date(u.created_at).getTime() >= cutoff) ids.add(u.id);
          });
        } else {
          // zero_orders — all users (order filtering would need orders data; for now treat as all users with no order history indicator)
          users.forEach((u) => {
            if (!u.last_sign_in_at || new Date(u.created_at).getTime() === new Date(u.last_sign_in_at).getTime()) {
              ids.add(u.id);
            }
          });
        }
      } else if (group === "invited") {
        // Invited users — users whose metadata indicates invitation
        // Currently marks users who have never signed in as "invited"
        users.forEach((u) => {
          if (!u.last_sign_in_at) ids.add(u.id);
        });
      }
    }

    return Array.from(ids);
  }, [form.scope, form.audience_groups, form.scope_target_user_ids, form.new_registered_days, form.newcomer_logic, form.newcomer_days, users]);

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast({ title: "Code required", variant: "destructive" });
      return;
    }

    if (form.scope === "user" && matchedAudienceUsers.length === 0) {
      toast({ title: "No users matched. Select at least one audience or user.", variant: "destructive" });
      return;
    }

    if ((form.scope === "product" || form.scope === "category") && !form.scope_target_id) {
      toast({ title: "Select a target", variant: "destructive" });
      return;
    }

    setSaving(true);

    const payload = {
      code: form.code.toUpperCase(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      scope: form.scope,
      scope_target_id: form.scope === "product" || form.scope === "category" ? form.scope_target_id : null,
      scope_target_user_id: form.scope === "user" ? matchedAudienceUsers.join(",") : null,
      min_order_amount: Number(form.min_order_amount) || 0,
      min_quantity: Number(form.min_quantity) || 1,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      is_stackable: form.is_stackable,
      is_active: form.is_active,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
    };

    const { error } = editing
      ? await supabase.from("discount_codes").update(payload).eq("id", editing.id)
      : await supabase.from("discount_codes").insert(payload);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: editing ? "Discount updated" : "Discount created",
    });

    setDialogOpen(false);
    setUserPickerOpen(false);
    fetchAll();
  };

  const toggleActive = async (discount: DiscountCode) => {
    const { error } = await supabase
      .from("discount_codes")
      .update({ is_active: !discount.is_active })
      .eq("id", discount.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    fetchAll();
  };

  const deleteDiscount = async (id: string) => {
    const { error } = await supabase.from("discount_codes").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Discount deleted" });
    fetchAll();
  };

  const getScopeLabel = (discount: DiscountCode) => {
    if (discount.scope === "product") {
      return products.find((product) => product.id === discount.scope_target_id)?.name || "Specific product";
    }

    if (discount.scope === "category") {
      return categories.find((category) => category.id === discount.scope_target_id)?.name || "Specific category";
    }

    if (discount.scope === "user") {
      const selectedIds = normalizeUserIds(discount.scope_target_user_id);
      if (selectedIds.length === 0) return "User audience";
      const matchedUsers = users.filter((user) => selectedIds.includes(user.id));
      if (matchedUsers.length === 0) return `${selectedIds.length} targeted user(s)`;
      if (matchedUsers.length === 1) return matchedUsers[0].label;
      if (matchedUsers.length <= 3) return matchedUsers.map((user) => user.label).join(", ");
      return `${matchedUsers.length} targeted users`;
    }

    if (discount.scope === "bulk") {
      return `Bulk (min ${discount.min_quantity})`;
    }

    return "All products";
  };

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
              <Plus className="mr-1 h-4 w-4" />
              New Discount
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
                <TableHead>Uses</TableHead>
                <TableHead>Stackable</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {discounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-sm font-bold">{discount.code}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(discount.code);
                          toast({ title: "Copied!" });
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell className="text-sm capitalize">{discount.discount_type.replace("_", " ")}</TableCell>

                  <TableCell className="font-display text-sm font-semibold">
                    {discount.discount_type === "percentage"
                      ? `${discount.discount_value}%`
                      : discount.discount_type === "free_shipping"
                        ? "Free"
                        : `${discount.discount_value} kr`}
                  </TableCell>

                  <TableCell className="text-sm">{getScopeLabel(discount)}</TableCell>

                  <TableCell className="text-sm">
                    {discount.used_count}
                    {discount.max_uses ? `/${discount.max_uses}` : ""}
                  </TableCell>

                  <TableCell>
                    {discount.is_stackable ? (
                      <Badge variant="outline" className="text-xs">
                        Yes
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">No</span>
                    )}
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {discount.expires_at ? `Until ${new Date(discount.expires_at).toLocaleDateString()}` : "No expiry"}
                  </TableCell>

                  <TableCell>
                    <Switch checked={discount.is_active} onCheckedChange={() => toggleActive(discount)} />
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(discount)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteDiscount(discount.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && discounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    No discount codes yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setUserPickerOpen(false);
            setUserSearch("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">
              {editing ? "Edit Discount" : "Create Discount"}
            </DialogTitle>
            <DialogDescription>Configure discount code settings.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2026"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Summer sale 20% off"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Discount Type</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(value) => setForm({ ...form, discount_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (kr)</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{form.discount_type === "percentage" ? "Percentage" : "Amount (kr)"}</Label>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                  disabled={form.discount_type === "free_shipping"}
                />
              </div>
            </div>

            <div>
              <Label>Scope</Label>
              <Select
                value={form.scope}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    scope: value,
                    scope_target_id: null,
                    scope_target_user_ids: [],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="product">Specific Product</SelectItem>
                  <SelectItem value="category">Specific Category</SelectItem>
                  <SelectItem value="user">User Audience</SelectItem>
                  <SelectItem value="bulk">Bulk Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.scope === "product" && (
              <div>
                <Label>Product</Label>
                <Select
                  value={form.scope_target_id ?? undefined}
                  onValueChange={(value) => setForm({ ...form, scope_target_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.scope === "category" && (
              <div>
                <Label>Category</Label>
                <Select
                  value={form.scope_target_id ?? undefined}
                  onValueChange={(value) => setForm({ ...form, scope_target_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.scope === "user" && (
              <div className="space-y-4 rounded-lg border border-border/40 bg-muted/20 p-4">
                <Label className="text-sm font-semibold">Audience Targeting</Label>

                {/* Audience group checkboxes */}
                <div className="space-y-2">
                  {([
                    { value: "specific" as AudienceGroup, label: "Specific Users", desc: "Pick individual users by email or name" },
                    { value: "existing" as AudienceGroup, label: "All Existing Users", desc: "Every registered account" },
                    { value: "new_registered" as AudienceGroup, label: "Newly Registered", desc: "Users who signed up recently" },
                    { value: "newcomers" as AudienceGroup, label: "Newcomers", desc: "New users based on configurable logic" },
                    { value: "invited" as AudienceGroup, label: "Invited Users", desc: "Users who haven't signed in yet (pending invites)" },
                  ]).map((opt) => (
                    <label key={opt.value} className="flex items-start gap-3 rounded-md border border-border/30 bg-card/60 p-3 cursor-pointer hover:bg-accent/10 transition-colors">
                      <Checkbox
                        checked={form.audience_groups.includes(opt.value)}
                        onCheckedChange={() => toggleAudienceGroup(opt.value)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Newly registered config */}
                {form.audience_groups.includes("new_registered") && (
                  <div className="rounded-md border border-border/30 bg-card/40 p-3 space-y-2">
                    <Label className="text-xs">Registered within last</Label>
                    <Select value={String(form.new_registered_days)} onValueChange={(v) => setForm({ ...form, new_registered_days: Number(v) })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Newcomers config */}
                {form.audience_groups.includes("newcomers") && (
                  <div className="rounded-md border border-border/30 bg-card/40 p-3 space-y-2">
                    <Label className="text-xs">Newcomer logic</Label>
                    <Select value={form.newcomer_logic} onValueChange={(v) => setForm({ ...form, newcomer_logic: v as "days" | "zero_orders" })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Registered within X days</SelectItem>
                        <SelectItem value="zero_orders">Users with no activity</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.newcomer_logic === "days" && (
                      <div className="pt-1">
                        <Label className="text-xs">Within last</Label>
                        <Select value={String(form.newcomer_days)} onValueChange={(v) => setForm({ ...form, newcomer_days: Number(v) })}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 days</SelectItem>
                            <SelectItem value="14">14 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="60">60 days</SelectItem>
                            <SelectItem value="90">90 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Specific users picker */}
                {form.audience_groups.includes("specific") && (
                  <div className="space-y-2">
                    <Label className="text-xs">Search & select users</Label>
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
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => {
                              const selected = form.scope_target_user_ids.includes(user.id);
                              return (
                                <button key={user.id} type="button" onClick={() => toggleUserSelection(user.id)}
                                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground">
                                  <span className="truncate">{user.label}</span>
                                  <Check className={`ml-3 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-3 text-sm text-muted-foreground">No users found</div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedUsers.map((user) => (
                          <Badge key={user.id} variant="secondary" className="flex items-center gap-1 pr-1">
                            <span className="max-w-[220px] truncate">{user.label}</span>
                            <button type="button" onClick={() => removeSelectedUser(user.id)} className="rounded-full p-0.5 hover:bg-black/10">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Live matched preview */}
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{matchedAudienceUsers.length} user{matchedAudienceUsers.length !== 1 ? "s" : ""} matched</p>
                    <p className="text-xs text-muted-foreground">
                      {form.audience_groups.map((g) => {
                        if (g === "specific") return `${form.scope_target_user_ids.length} manually selected`;
                        if (g === "existing") return "all existing users";
                        if (g === "new_registered") return `registered in last ${form.new_registered_days} days`;
                        if (g === "newcomers") return form.newcomer_logic === "days" ? `newcomers (last ${form.newcomer_days} days)` : "newcomers (no activity)";
                        if (g === "invited") return "invited users";
                        return g;
                      }).join(" + ")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Min Order (kr)</Label>
                <Input
                  type="number"
                  value={form.min_order_amount}
                  onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label>Min Quantity</Label>
                <Input
                  type="number"
                  value={form.min_quantity}
                  onChange={(e) => setForm({ ...form, min_quantity: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label>Max Uses</Label>
                <Input
                  type="number"
                  value={form.max_uses ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      max_uses: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Starts At</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at ? new Date(form.starts_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </div>

              <div>
                <Label>Expires At</Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at ? new Date(form.expires_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      expires_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_stackable}
                  onCheckedChange={(value) => setForm({ ...form, is_stackable: value })}
                />
                <Label>Stackable with other discounts/vouchers</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(value) => setForm({ ...form, is_active: value })} />
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
