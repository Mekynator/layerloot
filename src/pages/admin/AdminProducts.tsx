import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  images: string[];
  stock: number;
  is_featured: boolean;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
}

const emptyProduct = {
  name: "", slug: "", description: "", price: 0, compare_at_price: null as number | null,
  category_id: null as string | null, images: [] as string[], stock: 0, is_featured: false, is_active: true,
};

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const { toast } = useToast();

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts((data as Product[]) ?? []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name");
    setCategories((data as Category[]) ?? []);
  };

  useEffect(() => { fetchProducts(); fetchCategories(); }, []);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    const ext = imageFile.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, imageFile);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return null; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadModel = async (): Promise<string | null> => {
    if (!modelFile) return null;
    const ext = modelFile.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("3d-models").upload(path, modelFile);
    if (error) { toast({ title: "Model upload failed", description: error.message, variant: "destructive" }); return null; }
    const { data } = supabase.storage.from("3d-models").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    let images = form.images;
    const uploadedUrl = await uploadImage();
    if (uploadedUrl) images = [...images, uploadedUrl];

    let model_url = (form as any).model_url || null;
    const uploadedModelUrl = await uploadModel();
    if (uploadedModelUrl) model_url = uploadedModelUrl;

    const payload = {
      name: form.name,
      slug: form.slug || generateSlug(form.name),
      description: form.description || null,
      price: form.price,
      compare_at_price: form.compare_at_price || null,
      category_id: form.category_id || null,
      images,
      stock: form.stock,
      is_featured: form.is_featured,
      is_active: form.is_active,
      model_url,
    };

    if (editingId) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Product updated" });
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Product created" });
    }
    setOpen(false);
    setForm(emptyProduct);
    setEditingId(null);
    setImageFile(null);
    setModelFile(null);
    fetchProducts();
  };

  const editProduct = (p: Product & { model_url?: string | null }) => {
    setForm({
      name: p.name, slug: p.slug, description: p.description ?? "",
      price: Number(p.price), compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null,
      category_id: p.category_id, images: p.images ?? [], stock: p.stock,
      is_featured: p.is_featured, is_active: p.is_active, model_url: (p as any).model_url ?? null,
    } as any);
    setEditingId(p.id);
    setOpen(true);
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    toast({ title: "Product deleted" });
    fetchProducts();
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Products</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyProduct); setEditingId(null); setImageFile(null); setModelFile(null); } }}>
          <DialogTrigger asChild>
            <Button className="font-display uppercase tracking-wider"><Plus className="mr-1 h-4 w-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle className="font-display uppercase">{editingId ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Price ($)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Compare Price ($)</Label><Input type="number" step="0.01" value={form.compare_at_price ?? ""} onChange={(e) => setForm({ ...form, compare_at_price: parseFloat(e.target.value) || null })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} /></div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category_id ?? "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Product Image</Label>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
              </div>
              <div>
                <Label>3D Model (STL, OBJ, 3MF)</Label>
                <Input type="file" accept=".stl,.obj,.3mf" onChange={(e) => setModelFile(e.target.files?.[0] ?? null)} />
                {(form as any).model_url && <p className="mt-1 text-xs text-muted-foreground">Current model uploaded ✓</p>}
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} /> Featured
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active
                </label>
              </div>
              <Button onClick={handleSubmit} className="w-full font-display uppercase tracking-wider">
                {editingId ? "Update" : "Create"} Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover" />}
                      <div>
                        <p className="font-display text-sm font-semibold uppercase">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-display font-bold text-primary">${Number(p.price).toFixed(2)}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell>
                    <span className={`font-display text-xs uppercase ${p.is_active ? "text-green-500" : "text-muted-foreground"}`}>
                      {p.is_active ? "Active" : "Draft"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/admin/products/${p.id}/variants`}>
                      <Button variant="ghost" size="icon" title="Manage Variants"><Layers className="h-4 w-4" /></Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => editProduct(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No products yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminProducts;
