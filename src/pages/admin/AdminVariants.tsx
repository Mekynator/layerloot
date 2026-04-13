import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Variant {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  sort_order: number;
  is_active: boolean;
}

const emptyVariant = { name: "", sku: "", price: 0, stock: 0, color: "", size: "", material: "", sort_order: 0, is_active: true };

const AdminVariants = () => {
  const { productId } = useParams<{ productId: string }>();
  const [productName, setProductName] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [form, setForm] = useState(emptyVariant);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    if (!productId) return;
    const { data: p } = await supabase.from("products").select("name").eq("id", productId).maybeSingle();
    setProductName(p?.name ?? "");
    const { data } = await supabase.from("product_variants").select("*").eq("product_id", productId).order("sort_order");
    setVariants((data as Variant[]) ?? []);
  };

  useEffect(() => { fetchData(); }, [productId]);

  const handleSubmit = async () => {
    const attributes: Record<string, string> = {};
    if (form.color) attributes.color = form.color;
    if (form.size) attributes.size = form.size;
    if (form.material) attributes.material = form.material;

    const payload = {
      product_id: productId!,
      name: form.name,
      sku: form.sku || null,
      price: form.price,
      stock: form.stock,
      attributes,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase.from("product_variants").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Variant updated" });
    } else {
      const { error } = await supabase.from("product_variants").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Variant created" });
    }
    setOpen(false);
    setForm(emptyVariant);
    setEditingId(null);
    fetchData();
  };

  const edit = (v: Variant) => {
    setForm({
      name: v.name, sku: v.sku ?? "", price: Number(v.price), stock: v.stock,
      color: v.attributes?.color ?? "", size: v.attributes?.size ?? "", material: v.attributes?.material ?? "",
      sort_order: v.sort_order, is_active: v.is_active,
    });
    setEditingId(v.id);
    setOpen(true);
  };

  const del = async (id: string) => {
    await supabase.from("product_variants").delete().eq("id", id);
    toast({ title: "Variant deleted" });
    fetchData();
  };

  return (
    <>
      <div className="mb-2">
        <Link to="/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase text-foreground">Variants</h1>
          <p className="text-sm text-muted-foreground">{productName}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyVariant); setEditingId(null); } }}>
          <DialogTrigger asChild>
            <Button className="font-display uppercase tracking-wider"><Plus className="mr-1 h-4 w-4" /> Add Variant</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display uppercase">{editingId ? "Edit" : "Add"} Variant</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Variant Name (e.g. "Red / Large")</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Price (kr)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Color</Label><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
                <div><Label>Size</Label><Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} /></div>
                <div><Label>Material</Label><Input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} /></div>
              </div>
              <div className="flex gap-6">
                <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-20" /></div>
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active</label>
              </div>
              <Button onClick={handleSubmit} className="w-full font-display uppercase tracking-wider">{editingId ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Attributes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-display text-sm font-semibold uppercase">{v.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.sku || "—"}</TableCell>
                  <TableCell className="font-display font-bold text-primary">{Number(v.price).toFixed(2)} kr</TableCell>
                  <TableCell>{v.stock}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <span className={`font-display text-xs uppercase ${v.is_active ? "text-green-500" : "text-muted-foreground"}`}>
                      {v.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => edit(v)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => del(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {variants.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No variants. Add one to offer size, color, or material options.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

export default AdminVariants;
