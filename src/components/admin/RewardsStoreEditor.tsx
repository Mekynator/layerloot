import { useEffect, useState } from "react";
import {
  Plus, Save, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Star, Tag, Truck, Gift, CreditCard, Percent, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ICON_MAP: Record<string, React.ElementType> = {
  Tag, Truck, Gift, CreditCard, Percent, Star, Package,
};

const REWARD_TYPES = [
  { value: "fixed_discount", label: "Fixed Discount" },
  { value: "percentage", label: "Percentage Discount" },
  { value: "gift_card", label: "Gift Card" },
  { value: "free_shipping", label: "Free Shipping" },
  { value: "gift_wrap", label: "Gift Wrap" },
  { value: "custom", label: "Custom" },
];

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

interface VoucherRow {
  id: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  points_cost: number;
  is_active: boolean;
  badge_text: string | null;
  icon_key: string | null;
  image_url: string | null;
  sort_order: number;
  reward_type: string;
  usage_limit_per_user: number | null;
  global_usage_limit: number | null;
  expiry_days: number | null;
}

interface StoreConfig {
  columns: number;
  title: string;
  subtitle: string;
  emptyStateText: string;
  insufficientPointsText: string;
  ctaText: string;
  hoverAnimation: string;
}

const defaultStoreConfig: StoreConfig = {
  columns: 2,
  title: "Rewards Store",
  subtitle: "Redeem your points for exclusive rewards",
  emptyStateText: "No rewards available right now.",
  insufficientPointsText: "You need {needed} more points",
  ctaText: "Redeem",
  hoverAnimation: "lift",
};

const emptyVoucher: Omit<VoucherRow, "id"> = {
  name: "",
  description: "",
  discount_type: "fixed_discount",
  discount_value: 0,
  points_cost: 100,
  is_active: true,
  badge_text: null,
  icon_key: "Tag",
  image_url: null,
  sort_order: 0,
  reward_type: "fixed_discount",
  usage_limit_per_user: null,
  global_usage_limit: null,
  expiry_days: null,
};

const RewardsStoreEditor = () => {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(defaultStoreConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [vRes, sRes] = await Promise.all([
      supabase.from("vouchers").select("*").order("sort_order", { ascending: true }),
      supabase.from("site_settings").select("value").eq("key", "rewards_store_config").maybeSingle(),
    ]);
    if (vRes.data) setVouchers(vRes.data as unknown as VoucherRow[]);
    if (sRes.data?.value) setStoreConfig({ ...defaultStoreConfig, ...(sRes.data.value as any) });
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const saveStoreConfig = async () => {
    setSaving(true);
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "rewards_store_config").maybeSingle();
    if (existing) {
      await supabase.from("site_settings").update({ value: storeConfig as any }).eq("key", "rewards_store_config");
    } else {
      await supabase.from("site_settings").insert({ key: "rewards_store_config", value: storeConfig as any });
    }
    setSaving(false);
    toast({ title: "Store config saved!" });
  };

  const saveVoucher = async (v: VoucherRow | Omit<VoucherRow, "id">) => {
    setSaving(true);
    if ("id" in v && v.id) {
      const { error } = await supabase.from("vouchers").update({
        name: v.name,
        description: v.description,
        discount_type: v.discount_type,
        discount_value: v.discount_value,
        points_cost: v.points_cost,
        is_active: v.is_active,
        badge_text: v.badge_text as any,
        icon_key: v.icon_key as any,
        image_url: v.image_url as any,
        sort_order: v.sort_order as any,
        reward_type: v.reward_type as any,
        usage_limit_per_user: v.usage_limit_per_user as any,
        global_usage_limit: v.global_usage_limit as any,
        expiry_days: v.expiry_days as any,
      }).eq("id", v.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    } else {
      const { error } = await supabase.from("vouchers").insert({
        name: v.name,
        description: v.description,
        discount_type: v.discount_type,
        discount_value: v.discount_value,
        points_cost: v.points_cost,
        is_active: v.is_active,
        badge_text: v.badge_text as any,
        icon_key: v.icon_key as any,
        image_url: v.image_url as any,
        sort_order: v.sort_order as any,
        reward_type: v.reward_type as any,
        usage_limit_per_user: v.usage_limit_per_user as any,
        global_usage_limit: v.global_usage_limit as any,
        expiry_days: v.expiry_days as any,
      });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    }
    setSaving(false);
    setDialogOpen(false);
    setEditingVoucher(null);
    toast({ title: "Reward saved!" });
    fetchAll();
  };

  const deleteVoucher = async (id: string) => {
    await supabase.from("vouchers").delete().eq("id", id);
    setDeleteConfirmId(null);
    toast({ title: "Reward deleted" });
    fetchAll();
  };

  const moveVoucher = async (idx: number, dir: -1 | 1) => {
    const arr = [...vouchers];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    arr.forEach((v, i) => { v.sort_order = i; });
    setVouchers(arr);
    await Promise.all(arr.map((v) => supabase.from("vouchers").update({ sort_order: v.sort_order as any }).eq("id", v.id)));
  };

  const openEdit = (v?: VoucherRow) => {
    setEditingVoucher(v || null);
    setDialogOpen(true);
  };

  if (loading) return <div className="text-sm text-muted-foreground p-4">Loading rewards...</div>;

  return (
    <div className="space-y-8">
      {/* Store Config */}
      <Card className="border-primary/20">
        <CardHeader><CardTitle className="font-display text-sm uppercase">Rewards Store Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label className="text-xs">Store Title</Label><Input value={storeConfig.title} onChange={e => setStoreConfig({ ...storeConfig, title: e.target.value })} /></div>
            <div><Label className="text-xs">Subtitle</Label><Input value={storeConfig.subtitle} onChange={e => setStoreConfig({ ...storeConfig, subtitle: e.target.value })} /></div>
            <div><Label className="text-xs">Columns</Label>
              <Select value={String(storeConfig.columns)} onValueChange={v => setStoreConfig({ ...storeConfig, columns: Number(v) })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Column</SelectItem>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">CTA Button Text</Label><Input value={storeConfig.ctaText} onChange={e => setStoreConfig({ ...storeConfig, ctaText: e.target.value })} /></div>
            <div><Label className="text-xs">Empty State Text</Label><Input value={storeConfig.emptyStateText} onChange={e => setStoreConfig({ ...storeConfig, emptyStateText: e.target.value })} /></div>
            <div><Label className="text-xs">Insufficient Points Text</Label><Input value={storeConfig.insufficientPointsText} onChange={e => setStoreConfig({ ...storeConfig, insufficientPointsText: e.target.value })} /></div>
          </div>
          <Button size="sm" onClick={saveStoreConfig} disabled={saving} className="font-display text-xs uppercase tracking-wider">
            <Save className="mr-1 h-3 w-3" /> Save Config
          </Button>
        </CardContent>
      </Card>

      {/* Rewards List */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">Reward Catalog ({vouchers.length})</h3>
        <Button size="sm" onClick={() => openEdit()} className="font-display text-xs uppercase tracking-wider">
          <Plus className="mr-1 h-3 w-3" /> Add Reward
        </Button>
      </div>

      <div className="space-y-2">
        {vouchers.map((v, idx) => {
          const Icon = ICON_MAP[v.icon_key || ""] || Package;
          return (
            <Card key={v.id} className={`border-primary/20 transition-opacity ${!v.is_active ? "opacity-50" : ""}`}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-semibold uppercase truncate">{v.name}</span>
                    {v.badge_text && <Badge variant="outline" className="text-[10px]">{v.badge_text}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{v.points_cost} pts</span>
                    <span>{v.reward_type}</span>
                    {v.discount_value > 0 && <span>{v.discount_value} kr</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveVoucher(idx, -1)} disabled={idx === 0}><ChevronUp className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveVoucher(idx, 1)} disabled={idx === vouchers.length - 1}><ChevronDown className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}><Eye className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirmId(v.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <VoucherEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        voucher={editingVoucher}
        onSave={saveVoucher}
        saving={saving}
      />

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reward?</DialogTitle>
            <DialogDescription>This will permanently remove this reward from the catalog. Existing redeemed vouchers will not be affected.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && deleteVoucher(deleteConfirmId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Voucher Edit Dialog ─── */
function VoucherEditDialog({ open, onOpenChange, voucher, onSave, saving }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  voucher: VoucherRow | null;
  onSave: (v: VoucherRow | Omit<VoucherRow, "id">) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<VoucherRow | Omit<VoucherRow, "id">>(emptyVoucher);

  useEffect(() => {
    if (open) {
      setForm(voucher || { ...emptyVoucher, sort_order: 99 });
    }
  }, [open, voucher]);

  const isNew = !voucher;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display uppercase">{isNew ? "Add Reward" : "Edit Reward"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label className="text-xs">Description</Label><Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label className="text-xs">Reward Type</Label>
              <Select value={form.reward_type} onValueChange={v => setForm({ ...form, reward_type: v, discount_type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{REWARD_TYPES.map(rt => <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Points Cost</Label><Input type="number" value={form.points_cost} onChange={e => setForm({ ...form, points_cost: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Discount Value</Label><Input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Badge Text</Label><Input value={form.badge_text || ""} onChange={e => setForm({ ...form, badge_text: e.target.value || null })} placeholder="e.g. Popular" /></div>
            <div><Label className="text-xs">Icon</Label>
              <Select value={form.icon_key || "Tag"} onValueChange={v => setForm({ ...form, icon_key: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{AVAILABLE_ICONS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Image URL</Label><Input value={form.image_url || ""} onChange={e => setForm({ ...form, image_url: e.target.value || null })} placeholder="Optional" /></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label className="text-xs">Per-User Limit</Label><Input type="number" value={form.usage_limit_per_user ?? ""} onChange={e => setForm({ ...form, usage_limit_per_user: e.target.value ? Number(e.target.value) : null })} placeholder="Unlimited" /></div>
            <div><Label className="text-xs">Global Limit</Label><Input type="number" value={form.global_usage_limit ?? ""} onChange={e => setForm({ ...form, global_usage_limit: e.target.value ? Number(e.target.value) : null })} placeholder="Unlimited" /></div>
            <div><Label className="text-xs">Expiry (days)</Label><Input type="number" value={form.expiry_days ?? ""} onChange={e => setForm({ ...form, expiry_days: e.target.value ? Number(e.target.value) : null })} placeholder="Never" /></div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            <Label className="text-xs">Active</Label>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-primary/20 bg-card p-4">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Preview</p>
            <RewardTilePreview reward={form} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.name}>
            <Save className="mr-1 h-3 w-3" /> {saving ? "Saving..." : "Save Reward"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Preview Tile ─── */
function RewardTilePreview({ reward }: { reward: VoucherRow | Omit<VoucherRow, "id"> }) {
  const Icon = ICON_MAP[reward.icon_key || ""] || Package;
  return (
    <div className="rounded-xl border border-primary/20 bg-card/80 p-4 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.15)]">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="font-display text-sm font-semibold uppercase">{reward.name || "Reward Name"}</span>
        {reward.badge_text && <Badge variant="outline" className="text-[10px]">{reward.badge_text}</Badge>}
      </div>
      <p className="text-xs text-muted-foreground mb-3">{reward.description || "Description..."}</p>
      <div className="flex items-end justify-between">
        <div>
          {reward.reward_type === "free_shipping" ? (
            <span className="font-display text-lg font-bold text-primary">Free delivery</span>
          ) : reward.reward_type === "gift_wrap" ? (
            <span className="font-display text-lg font-bold text-primary">Free gift wrap</span>
          ) : (
            <span className="font-display text-lg font-bold text-primary">{reward.discount_value} kr</span>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
          <Star className="h-3 w-3" /> {reward.points_cost} pts
        </div>
      </div>
    </div>
  );
}

export default RewardsStoreEditor;
