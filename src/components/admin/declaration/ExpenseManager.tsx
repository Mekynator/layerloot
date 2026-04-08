import { useState } from "react";
import { Plus, Trash2, Edit2, Receipt, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { EXPENSE_CATEGORIES, type ExpenseEntry } from "@/hooks/use-monthly-declaration";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  expenses: ExpenseEntry[];
  loading: boolean;
  onAdd: (e: any) => Promise<any>;
  onUpdate: (id: string, e: any) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

const EMPTY_FORM = {
  expense_date: new Date().toISOString().slice(0, 10),
  supplier: "",
  category: "Miscellaneous",
  description: "",
  net_amount: 0,
  vat_amount: 0,
  gross_amount: 0,
  receipt_reference: "",
  receipt_file_url: "",
  notes: "",
  is_recurring: false,
};

const ExpenseManager = ({ expenses, loading, onAdd, onUpdate, onDelete }: Props) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const openNew = () => { setForm(EMPTY_FORM); setEditing(null); setOpen(true); };
  const openEdit = (e: ExpenseEntry) => {
    setForm({
      expense_date: e.expense_date,
      supplier: e.supplier || "",
      category: e.category,
      description: e.description,
      net_amount: e.net_amount,
      vat_amount: e.vat_amount,
      gross_amount: e.gross_amount,
      receipt_reference: e.receipt_reference || "",
      receipt_file_url: e.receipt_file_url || "",
      notes: e.notes || "",
      is_recurring: e.is_recurring,
    });
    setEditing(e.id);
    setOpen(true);
  };

  const handleNet = (v: number) => {
    const vat = +(v * 0.25).toFixed(2);
    setForm(f => ({ ...f, net_amount: v, vat_amount: vat, gross_amount: +(v + vat).toFixed(2) }));
  };

  const handleGross = (v: number) => {
    const net = +(v / 1.25).toFixed(2);
    const vat = +(v - net).toFixed(2);
    setForm(f => ({ ...f, gross_amount: v, net_amount: net, vat_amount: vat }));
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const path = `receipts/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      setForm(f => ({ ...f, receipt_file_url: urlData.publicUrl }));
      toast({ title: "Receipt uploaded" });
    }
    setUploading(false);
  };

  const save = async () => {
    setSaving(true);
    const err = editing
      ? await onUpdate(editing, form)
      : await onAdd(form);
    if (err) toast({ title: "Error", description: err.message, variant: "destructive" });
    else { toast({ title: editing ? "Updated" : "Added" }); setOpen(false); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const err = await onDelete(id);
    if (err) toast({ title: "Error", description: err.message, variant: "destructive" });
    else toast({ title: "Deleted" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Manual Expenses</h3>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Expense
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-8 text-center">Loading…</p>
      ) : expenses.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">No expenses recorded this month.</p>
      ) : (
        <div className="space-y-2">
          {expenses.map(e => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/40 px-3 py-2.5 text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">{e.description || e.category}</span>
                  <Badge variant="outline" className="text-[9px] shrink-0">{e.category}</Badge>
                  {e.is_recurring && <RotateCcw className="h-3 w-3 text-primary shrink-0" />}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {e.supplier && <span>{e.supplier} · </span>}
                  {e.expense_date}
                  {e.receipt_reference && <span> · Ref: {e.receipt_reference}</span>}
                  {!e.receipt_reference && !e.receipt_file_url && (
                    <span className="text-amber-400 ml-1">⚠ No receipt</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium">{Number(e.gross_amount).toFixed(2)} kr</p>
                <p className="text-[10px] text-muted-foreground">VAT: {Number(e.vat_amount).toFixed(2)}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)}>
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
            <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Supplier / Vendor</Label>
              <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="e.g. Prusa, PostNord" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was purchased" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Net Amount</Label>
                <Input type="number" step="0.01" value={form.net_amount || ""} onChange={e => handleNet(+e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">VAT (25%)</Label>
                <Input type="number" step="0.01" value={form.vat_amount || ""} onChange={e => setForm(f => ({ ...f, vat_amount: +e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Gross Amount</Label>
                <Input type="number" step="0.01" value={form.gross_amount || ""} onChange={e => handleGross(+e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Receipt Reference</Label>
                <Input value={form.receipt_reference} onChange={e => setForm(f => ({ ...f, receipt_reference: e.target.value }))} placeholder="Invoice #" />
              </div>
              <div>
                <Label className="text-xs">Receipt File</Label>
                <div className="flex gap-1">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    className="text-xs"
                    onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    disabled={uploading}
                  />
                </div>
                {form.receipt_file_url && (
                  <a href={form.receipt_file_url} target="_blank" rel="noopener" className="text-[10px] text-primary hover:underline mt-0.5 block truncate">
                    View uploaded file
                  </a>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_recurring} onCheckedChange={v => setForm(f => ({ ...f, is_recurring: v }))} />
              <Label className="text-xs">Recurring monthly expense</Label>
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

export default ExpenseManager;
