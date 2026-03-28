import { useEffect, useState } from "react";
import { Plus, Trash2, Save, TicketPercent, Calendar, Users, Package, Layers3, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

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

const emptyDiscount: Omit<DiscountCode, "id" | "created_at" | "used_count"> = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  scope: "all",
  scope_target_id: null,
  scope_target_user_id: null,
  min_order_amount: 0,
  min_quantity: 1,
  max_uses: null,
  is_stackable: false,
  is_active: true,
  starts_at: null,
  expires_at: null,
};

const AdminDiscounts = () => {
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState(emptyDiscount);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const [{ data: d }, { data: p }, { data: c }] = await Promise.all([
      supabase.from("discount_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
    ]);
    setDiscounts((d as any[]) ?? []);
    setProducts((p as any[]) ?? []);
    setCategories((c as any[]) ?? []);
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyDiscount, code: `LL-${Math.random().toString(36).substring(2, 8).toUpperCase()}` });
    setDialogOpen(true);
  };

  const openEdit = (d: DiscountCode) => {
    setEditing(d);
    setForm({
      code: d.code,
      description: d.description || "",
      discount_type: d.discount_type,
      discount_value: d.discount_value,
      scope: d.scope,
      scope_target_id: d.scope_target_id,
      scope_target_user_id: d.scope_target_user_id,
      min_order_amount: d.min_order_amount,
      min_quantity: d.min_quantity,
      max_uses: d.max_uses,
      is_stackable: d.is_stackable,
      is_active: d.is_active,
      starts_at: d.starts_at,
      expires_at: d.expires_at,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast({ title: "Code required", variant: "destructive" }); return; }
    setSaving(true);

    const payload: any = {
      code: form.code.toUpperCase(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      scope: form.scope,
      scope_target_id: form.scope === "product" || form.scope === "category" ? form.scope_target_id : null,
      scope_target_user_id: form.scope === "user" ? form.scope_target_user_id : null,
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
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Discount updated" : "Discount created" });
    setDialogOpen(false);
    fetchAll();
  };

  const toggleActive = async (d: DiscountCode) => {
    await supabase.from("discount_codes").update({ is_active: !d.is_active }).eq("id", d.id);
    fetchAll();
  };

  const deleteDiscount = async (id: string) => {
    await supabase.from("discount_codes").delete().eq("id", id);
    toast({ title: "Discount deleted" });
    fetchAll();
  };

  const getScopeLabel = (d: DiscountCode) => {
    if (d.scope === "product") return products.find((p) => p.id === d.scope_target_id)?.name || "Specific product";
    if (d.scope === "category") return categories.find((c) => c.id === d.scope_target_id)?.name || "Specific category";
    if (d.scope === "user") return "Specific user";
    if (d.scope === "bulk") return `Bulk (min ${d.min_quantity})`;
    return "All products";
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase text-foreground">Discount Codes</h1>
          <p className="text-sm text-muted-foreground">Create and manage promotional discount codes.</p>
        </div>
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
                <TableHead>Uses</TableHead>
                <TableHead>Stackable</TableHead>
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
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(d.code); toast({ title: "Copied!" }); }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{d.discount_type.replace("_", " ")}</TableCell>
                  <TableCell className="font-display text-sm font-semibold">
                    {d.discount_type === "percentage" ? `${d.discount_value}%` : d.discount_type === "free_shipping" ? "Free" : `${d.discount_value} kr`}
                  </TableCell>
                  <TableCell className="text-sm">{getScopeLabel(d)}</TableCell>
                  <TableCell className="text-sm">{d.used_count}{d.max_uses ? `/${d.max_uses}` : ""}</TableCell>
                  <TableCell>{d.is_stackable ? <Badge variant="outline" className="text-xs">Yes</Badge> : <span className="text-xs text-muted-foreground">No</span>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.expires_at ? `Until ${new Date(d.expires_at).toLocaleDateString()}` : "No expiry"}
                  </TableCell>
                  <TableCell>
                    <Switch checked={d.is_active} onCheckedChange={() => toggleActive(d)} />
                  </TableCell>
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
              {discounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No discount codes yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">{editing ? "Edit Discount" : "Create Discount"}</DialogTitle>
            <DialogDescription>Configure discount code settings.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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

            <div>
              <Label>Scope</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v, scope_target_id: null, scope_target_user_id: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="product">Specific Product</SelectItem>
                  <SelectItem value="category">Specific Category</SelectItem>
                  <SelectItem value="user">Specific User</SelectItem>
                  <SelectItem value="bulk">Bulk Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.scope === "product" && (
              <div>
                <Label>Product</Label>
                <Select value={form.scope_target_id || ""} onValueChange={(v) => setForm({ ...form, scope_target_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {form.scope === "category" && (
              <div>
                <Label>Category</Label>
                <Select value={form.scope_target_id || ""} onValueChange={(v) => setForm({ ...form, scope_target_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {form.scope === "user" && (
              <div>
                <Label>User ID (UUID)</Label>
                <Input value={form.scope_target_user_id || ""} onChange={(e) => setForm({ ...form, scope_target_user_id: e.target.value || null })} placeholder="User UUID" />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
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
                <Input type="number" value={form.max_uses ?? ""} onChange={(e) => setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : null })} placeholder="Unlimited" />
              </div>
            </div>

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

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_stackable} onCheckedChange={(v) => setForm({ ...form, is_stackable: v })} />
                <Label>Stackable with other discounts/vouchers</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full font-display uppercase tracking-wider">
              <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : editing ? "Update Discount" : "Create Discount"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDiscounts;
