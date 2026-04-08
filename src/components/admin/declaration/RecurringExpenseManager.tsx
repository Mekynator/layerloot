import { useState } from "react";
import { Plus, Trash2, Edit2, RotateCcw, Power, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useExpenseCategories } from "@/hooks/use-expense-categories";
import type { RecurringExpense } from "@/hooks/use-recurring-expenses";

interface Props {
  items: RecurringExpense[];
  loading: boolean;
  onAdd: (e: Omit<RecurringExpense, "id" | "created_at" | "updated_at">) => Promise<unknown>;
  onUpdate: (id: string, e: Partial<RecurringExpense>) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
  onApply: (year: number, month: number) => Promise<{ applied: number; skipped: number }>;
  year: number;
  month: number;
}

const EMPTY = {
  title: "",
  vendor_name: "",
  category: "Miscellaneous",
  subcategory: "",
  default_net_amount: 0,
  default_vat_amount: 0,
  default_gross_amount: 0,
  billing_day: 1,
  is_active: true,
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const RecurringExpenseManager = ({ items, loading, onAdd, onUpdate, onRemove, onApply, year, month }: Props) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const { categoryNames } = useExpenseCategories();

  const cats = categoryNames.length > 0 ? categoryNames : ["Miscellaneous"];

  const openNew = () => { setForm(EMPTY); setEditing(null); setOpen(true); };
  const openEdit = (r: RecurringExpense) => {
    setForm({
      title: r.title,
      vendor_name: r.vendor_name || "",
      category: r.category,
      subcategory: r.subcategory || "",
      default_net_amount: r.default_net_amount,
      default_vat_amount: r.default_vat_amount,
      default_gross_amount: r.default_gross_amount,
      billing_day: r.billing_day,
      is_active: r.is_active,
    });
    setEditing(r.id);
    setOpen(true);
  };

  const handleNet = (v: number) => {
    const vat = +(v * 0.25).toFixed(2);
    setForm(f => ({ ...f, default_net_amount: v, default_vat_amount: vat, default_gross_amount: +(v + vat).toFixed(2) }));
  };

  const save = async () => {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    setSaving(true);
    const payload = { ...form, vendor_name: form.vendor_name || null, subcategory: form.subcategory || null };
    const err = editing ? await onUpdate(editing, payload) : await onAdd(payload as Omit<RecurringExpense, "id" | "created_at" | "updated_at">);
    if (err) toast({ title: "Error", description: String(err), variant: "destructive" });
    else { toast({ title: editing ? "Updated" : "Created" }); setOpen(false); }
    setSaving(false);
  };

  const handleApply = async () => {
    setApplying(true);
    const result = await onApply(year, month);
    toast({
      title: `Applied to ${MONTHS[month - 1]} ${year}`,
      description: `${result.applied} added, ${result.skipped} skipped (already exist).`,
    });
    setApplying(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recurring expense?")) return;
    const err = await onRemove(id);
    if (err) toast({ title: "Error", variant: "destructive" });
  };

  const toggleActive = async (r: RecurringExpense) => {
    await onUpdate(r.id, { is_active: !r.is_active });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recurring Expenses</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleApply} disabled={applying} className="gap-1.5 text-xs">
            <PlayCircle className="h-3.5 w-3.5" /> Apply to {MONTHS[month - 1]} {year}
          </Button>
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Template
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-8 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">No recurring expenses configured.</p>
      ) : (
        <div className="space-y-2">
          {items.map(r => (
            <div key={r.id} className={`flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5 text-sm ${r.is_active ? "bg-card/40" : "bg-card/20 opacity-60"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-3 w-3 text-primary shrink-0" />
                  <span className="font-medium text-foreground truncate">{r.title}</span>
                  <Badge variant="outline" className="text-[9px] shrink-0">{r.category}</Badge>
                  {!r.is_active && <Badge variant="secondary" className="text-[9px]">Inactive</Badge>}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {r.vendor_name && <span>{r.vendor_name} · </span>}
                  Day {r.billing_day} each month
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium font-mono">{Number(r.default_gross_amount).toFixed(2)} kr</p>
                <p className="text-[10px] text-muted-foreground">Net: {Number(r.default_net_amount).toFixed(2)}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(r)} title={r.is_active ? "Deactivate" : "Activate"}>
                  <Power className={`h-3 w-3 ${r.is_active ? "text-emerald-400" : "text-muted-foreground"}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Recurring Expense" : "Add Recurring Expense"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Title / Description</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Electricity bill" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Billing Day (1-28)</Label>
                <Input type="number" min={1} max={28} value={form.billing_day} onChange={e => setForm(f => ({ ...f, billing_day: +e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Vendor</Label>
              <Input value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} placeholder="e.g. Ørsted, Hiper" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Net Amount</Label>
                <Input type="number" step="0.01" value={form.default_net_amount || ""} onChange={e => handleNet(+e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">VAT (25%)</Label>
                <Input type="number" step="0.01" value={form.default_vat_amount || ""} readOnly className="opacity-60" />
              </div>
              <div>
                <Label className="text-xs">Gross</Label>
                <Input type="number" step="0.01" value={form.default_gross_amount || ""} readOnly className="opacity-60" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label className="text-xs">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecurringExpenseManager;
