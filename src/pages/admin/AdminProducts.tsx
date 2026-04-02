import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive, Calculator, Calendar, CheckCircle, Eye, History, Layers,
  Pencil, Plus, Tag, Trash2, X, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import PricingCalculator from "@/components/admin/PricingCalculator";
import RevisionHistoryPanel from "@/components/admin/RevisionHistoryPanel";
import SchedulePublishDialog from "@/components/admin/SchedulePublishDialog";
import { useProductAdmin, type ProductDraftData, type ProductStatus } from "@/hooks/use-product-admin";

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
  model_url?: string | null;
  print_time_hours?: number | null;
  dimensions_cm?: any;
  weight_grams?: number | null;
  finish_type?: string | null;
  material_type?: string | null;
  giftFinderTags?: GiftFinderTag[];
  status?: ProductStatus;
  has_draft?: boolean;
  draft_data?: any;
  published_at?: string | null;
  scheduled_publish_at?: string | null;
}

interface Category { id: string; name: string; }
interface GiftFinderTag { id: string; name: string; slug?: string; }
interface ProductGiftFinderLink { product_id: string; gift_finder_tag_id: string; }

const MAX_PRODUCT_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_PRODUCT_MODEL_SIZE_BYTES = 500 * 1024 * 1024;

const emptyProduct = {
  name: "", slug: "", description: "", price: 0,
  compare_at_price: null as number | null,
  category_id: null as string | null,
  images: [] as string[], stock: 0,
  is_featured: false, is_active: true,
  model_url: null as string | null,
  print_time_hours: null as number | null,
  dimensions_cm: null as any,
  weight_grams: null as number | null,
  finish_type: null as string | null,
  material_type: null as string | null,
  gift_finder_tag_ids: [] as string[],
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "success" | "destructive" | "outline" }> = {
  published: { label: "Published", variant: "success" },
  draft: { label: "Draft", variant: "secondary" },
  unpublished: { label: "Unpublished", variant: "outline" },
  archived: { label: "Archived", variant: "destructive" },
  scheduled: { label: "Scheduled", variant: "default" },
};

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [giftFinderTags, setGiftFinderTags] = useState<GiftFinderTag[]>([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingProductId, setPricingProductId] = useState<string | null>(null);
  const [giftTagPickerValue, setGiftTagPickerValue] = useState<string>("none");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [historyProductId, setHistoryProductId] = useState<string | null>(null);
  const [scheduleProductId, setScheduleProductId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; productId: string; name: string } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const productAdmin = useProductAdmin();

  const giftFinderTagMap = useMemo(() => new Map(giftFinderTags.map((tag) => [tag.id, tag])), [giftFinderTags]);

  const filteredProducts = useMemo(() => {
    if (statusFilter === "all") return products;
    if (statusFilter === "has_draft") return products.filter((p) => p.has_draft);
    return products.filter((p) => (p.status ?? "published") === statusFilter);
  }, [products, statusFilter]);

  const fetchProducts = async () => {
    const [{ data: productsData, error: productsError }, { data: linksData, error: linksError }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("product_gift_finder_tags").select("product_id, gift_finder_tag_id"),
    ]);
    if (productsError) { toast({ title: "Error", description: productsError.message, variant: "destructive" }); return; }
    if (linksError) { toast({ title: "Error", description: linksError.message, variant: "destructive" }); return; }

    const productTagIdsMap = new Map<string, string[]>();
    for (const row of (linksData as ProductGiftFinderLink[]) ?? []) {
      const current = productTagIdsMap.get(row.product_id) ?? [];
      current.push(row.gift_finder_tag_id);
      productTagIdsMap.set(row.product_id, current);
    }
    setProducts(((productsData as any[]) ?? []).map((product) => ({
      ...product,
      giftFinderTags: (productTagIdsMap.get(product.id) ?? []).map((tagId) => giftFinderTagMap.get(tagId)).filter(Boolean),
    })));
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase.from("categories").select("id, name").order("name");
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCategories((data as Category[]) ?? []);
  };

  const fetchGiftFinderTags = async () => {
    const { data, error } = await supabase.from("gift_finder_tags").select("id, name, slug").order("sort_order");
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setGiftFinderTags((data as GiftFinderTag[]) ?? []);
  };

  useEffect(() => { void fetchCategories(); void fetchGiftFinderTags(); }, []);
  useEffect(() => { if (giftFinderTags.length > 0) void fetchProducts(); }, [giftFinderTags.length]);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const resetFormState = () => { setForm(emptyProduct); setEditingId(null); setImageFiles([]); setModelFile(null); setGiftTagPickerValue("none"); };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];
    const urls: string[] = [];
    for (const file of imageFiles) {
      if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) throw new Error(`Image "${file.name}" too large (max 20 MB).`);
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw new Error(`Image upload failed: ${error.message}`);
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const uploadModel = async (): Promise<string | null> => {
    if (!modelFile) return null;
    if (modelFile.size > MAX_PRODUCT_MODEL_SIZE_BYTES) throw new Error("3D model too large (max 500 MB).");
    const ext = modelFile.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("3d-models").upload(path, modelFile);
    if (error) throw new Error(`Model upload failed: ${error.message}`);
    const { data } = supabase.storage.from("3d-models").getPublicUrl(path);
    return data.publicUrl;
  };

  const syncProductGiftTags = async (productId: string, tagIds: string[]) => {
    await supabase.from("product_gift_finder_tags").delete().eq("product_id", productId);
    const uniqueIds = Array.from(new Set(tagIds.filter(Boolean)));
    if (uniqueIds.length === 0) return;
    await supabase.from("product_gift_finder_tags").insert(uniqueIds.map((gift_finder_tag_id) => ({ product_id: productId, gift_finder_tag_id })));
  };

  const handleSubmit = async () => {
    try {
      let images = form.images;
      const uploadedUrls = await uploadImages();
      if (uploadedUrls.length > 0) images = [...images, ...uploadedUrls];

      let model_url = form.model_url || null;
      const uploadedModelUrl = await uploadModel();
      if (uploadedModelUrl) model_url = uploadedModelUrl;

      const draftData: ProductDraftData = {
        name: form.name,
        slug: form.slug || generateSlug(form.name),
        description: form.description || null,
        price: form.price,
        compare_at_price: form.compare_at_price || null,
        category_id: form.category_id || null,
        images,
        stock: form.stock,
        is_featured: form.is_featured,
        model_url,
        print_time_hours: form.print_time_hours || null,
        dimensions_cm: form.dimensions_cm || null,
        weight_grams: form.weight_grams || null,
        finish_type: form.finish_type || null,
        material_type: form.material_type || null,
      };

      if (editingId) {
        const ok = await productAdmin.saveDraftProduct(editingId, draftData, user?.id ?? "");
        if (ok) {
          await syncProductGiftTags(editingId, form.gift_finder_tag_ids);
        }
      } else {
        const newId = await productAdmin.createDraftProduct(draftData, user?.id ?? "");
        if (newId) {
          await syncProductGiftTags(newId, form.gift_finder_tag_ids);
        }
      }

      setOpen(false);
      resetFormState();
      await fetchProducts();
    } catch (error: any) {
      toast({ title: "Upload error", description: error?.message || "Failed", variant: "destructive" });
    }
  };

  const editProduct = (product: Product) => {
    const draft = product.draft_data as Record<string, any> | null;
    const source = draft ? { ...product, ...draft } : product;
    setForm({
      name: source.name, slug: source.slug,
      description: source.description ?? "",
      price: Number(source.price),
      compare_at_price: source.compare_at_price ? Number(source.compare_at_price) : null,
      category_id: source.category_id,
      images: source.images ?? [],
      stock: source.stock ?? 0,
      is_featured: source.is_featured ?? false,
      is_active: source.is_active ?? true,
      model_url: source.model_url ?? null,
      print_time_hours: source.print_time_hours ? Number(source.print_time_hours) : null,
      dimensions_cm: source.dimensions_cm ?? null,
      weight_grams: source.weight_grams ? Number(source.weight_grams) : null,
      finish_type: source.finish_type ?? null,
      material_type: source.material_type ?? null,
      gift_finder_tag_ids: product.giftFinderTags?.map((tag) => tag.id) ?? [],
    });
    setEditingId(product.id);
    setGiftTagPickerValue("none");
    setOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction || !user?.id) return;
    const { type, productId } = confirmAction;
    let ok = false;
    if (type === "publish") ok = await productAdmin.publishProduct(productId, user.id);
    else if (type === "unpublish") ok = await productAdmin.unpublishProduct(productId, user.id);
    else if (type === "archive") ok = await productAdmin.archiveProduct(productId, user.id);
    else if (type === "delete") {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: "Product deleted" }); ok = true; }
    }
    setConfirmAction(null);
    if (ok) await fetchProducts();
  };

  const handleScheduleConfirm = async (date: Date) => {
    if (!scheduleProductId || !user?.id) return;
    const ok = await productAdmin.scheduleProductPublish(scheduleProductId, date.toISOString(), user.id);
    setScheduleProductId(null);
    if (ok) await fetchProducts();
  };

  const addGiftFinderTagToForm = (tagId: string) => {
    if (!tagId || tagId === "none") return;
    setForm((prev) => ({ ...prev, gift_finder_tag_ids: prev.gift_finder_tag_ids.includes(tagId) ? prev.gift_finder_tag_ids : [...prev.gift_finder_tag_ids, tagId] }));
    setGiftTagPickerValue("none");
  };
  const removeGiftFinderTagFromForm = (tagId: string) => { setForm((prev) => ({ ...prev, gift_finder_tag_ids: prev.gift_finder_tag_ids.filter((id) => id !== tagId) })); };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Products</h1>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="unpublished">Unpublished</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="has_draft">Has Changes</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) resetFormState(); }}>
            <DialogTrigger asChild>
              <Button className="font-display uppercase tracking-wider"><Plus className="mr-1 h-4 w-4" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader><DialogTitle className="font-display uppercase">{editingId ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
              <Tabs defaultValue="general" className="space-y-4">
                <TabsList className="w-full">
                  <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
                  <TabsTrigger value="print" className="flex-1">Print Info</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })} /></div>
                  <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Price (DKK)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} /></div>
                    <div><Label>Compare Price (DKK)</Label><Input type="number" step="0.01" value={form.compare_at_price ?? ""} onChange={(e) => setForm({ ...form, compare_at_price: parseFloat(e.target.value) || null })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value, 10) || 0 })} /></div>
                    <div>
                      <Label>Product Category</Label>
                      <Select value={form.category_id ?? "none"} onValueChange={(value) => setForm({ ...form, category_id: value === "none" ? null : value })}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>Gift Finder Tags</Label>
                      <Select value={giftTagPickerValue} onValueChange={addGiftFinderTagToForm}>
                        <SelectTrigger><SelectValue placeholder="Add gift finder tag" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select tag</SelectItem>
                          {giftFinderTags.map((tag) => (<SelectItem key={tag.id} value={tag.id} disabled={form.gift_finder_tag_ids.includes(tag.id)}>{tag.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.gift_finder_tag_ids.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {form.gift_finder_tag_ids.map((tagId) => {
                          const tag = giftFinderTagMap.get(tagId);
                          if (!tag) return null;
                          return (
                            <div key={tag.id} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground">
                              <Tag className="h-3.5 w-3.5 text-primary" />{tag.name}
                              <button type="button" onClick={() => removeGiftFinderTagFromForm(tag.id)} className="text-muted-foreground transition-colors hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (<p className="text-xs text-muted-foreground">Hidden from the product UI. Used only by Gift Finder on Create Your Own.</p>)}
                  </div>

                  <div>
                    <Label>Product Images (max 20 MB each)</Label>
                    <Input type="file" accept="image/*" multiple onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))} />
                    {form.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {form.images.map((url, index) => (
                          <div key={index} className="group relative">
                            <img src={url} alt="" className="h-16 w-16 rounded border border-border object-cover" />
                            <button type="button" onClick={() => setForm({ ...form, images: form.images.filter((_, idx) => idx !== index) })} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>3D Model (STL, OBJ, 3MF, max 500 MB)</Label>
                    <Input type="file" accept=".stl,.obj,.3mf" onChange={(e) => setModelFile(e.target.files?.[0] ?? null)} />
                    {form.model_url && <p className="mt-1 text-xs text-muted-foreground">Current model uploaded ✓</p>}
                  </div>

                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_featured} onCheckedChange={(value) => setForm({ ...form, is_featured: value })} /> Featured</label>
                  </div>
                </TabsContent>

                <TabsContent value="print" className="space-y-4">
                  <p className="text-xs text-muted-foreground">These details show on the product page as craftsmanship indicators.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Print Time (hours)</Label><Input type="number" step="0.5" value={form.print_time_hours ?? ""} onChange={(e) => setForm({ ...form, print_time_hours: parseFloat(e.target.value) || null })} /></div>
                    <div><Label>Weight (grams)</Label><Input type="number" step="1" value={form.weight_grams ?? ""} onChange={(e) => setForm({ ...form, weight_grams: parseFloat(e.target.value) || null })} /></div>
                  </div>
                  <div>
                    <Label>Material Type</Label>
                    <Select value={form.material_type ?? "none"} onValueChange={(value) => setForm({ ...form, material_type: value === "none" ? null : value })}>
                      <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="PLA">PLA</SelectItem>
                        <SelectItem value="PLA Silk">PLA Silk</SelectItem>
                        <SelectItem value="PETG">PETG</SelectItem>
                        <SelectItem value="Resin">Resin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Finish Type</Label>
                    <Select value={form.finish_type ?? "none"} onValueChange={(value) => setForm({ ...form, finish_type: value === "none" ? null : value })}>
                      <SelectTrigger><SelectValue placeholder="Select finish" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="raw">Raw</SelectItem>
                        <SelectItem value="cleaned">Cleaned</SelectItem>
                        <SelectItem value="painted">Painted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div>
                    <Label>Dimensions (cm)</Label>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {(["length", "width", "height"] as const).map((dim) => (
                        <div key={dim}>
                          <Label className="text-xs text-muted-foreground capitalize">{dim}</Label>
                          <Input type="number" step="0.1" value={form.dimensions_cm?.[dim] ?? ""} onChange={(e) => setForm({ ...form, dimensions_cm: { ...(form.dimensions_cm || {}), [dim]: parseFloat(e.target.value) || undefined } })} />
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Button onClick={handleSubmit} className="w-full font-display uppercase tracking-wider">
                {editingId ? "Save Draft" : "Create Product"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
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
              {filteredProducts.map((product) => {
                const status = (product.status ?? "published") as string;
                const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.images?.[0] && <img src={product.images[0]} alt="" className="h-10 w-10 rounded object-cover" />}
                        <div>
                          <p className="font-display text-sm font-semibold uppercase">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-display font-bold text-primary">{Number(product.price).toFixed(2)} DKK</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        {product.has_draft && status === "published" && (
                          <Badge variant="outline" className="text-[10px]">Draft changes</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Link to={`/admin/products/${product.id}/preview`}>
                          <Button variant="ghost" size="icon" title="Preview"><Eye className="h-4 w-4" /></Button>
                        </Link>

                        {(status === "draft" || product.has_draft) && (
                          <Button variant="ghost" size="icon" title="Publish" onClick={() => setConfirmAction({ type: "publish", productId: product.id, name: product.name })}>
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          </Button>
                        )}

                        {status === "published" && (
                          <Button variant="ghost" size="icon" title="Unpublish" onClick={() => setConfirmAction({ type: "unpublish", productId: product.id, name: product.name })}>
                            <XCircle className="h-4 w-4 text-amber-500" />
                          </Button>
                        )}

                        <Button variant="ghost" size="icon" title="Schedule" onClick={() => setScheduleProductId(product.id)}>
                          <Calendar className="h-4 w-4" />
                        </Button>

                        <Button variant="ghost" size="icon" title="History" onClick={() => setHistoryProductId(product.id)}>
                          <History className="h-4 w-4" />
                        </Button>

                        <Button variant="ghost" size="icon" onClick={() => { setPricingProductId(product.id); setPricingOpen(true); }} title="Pricing">
                          <Calculator className="h-4 w-4" />
                        </Button>

                        <Link to={`/admin/products/${product.id}/variants`}>
                          <Button variant="ghost" size="icon" title="Variants"><Layers className="h-4 w-4" /></Button>
                        </Link>

                        <Button variant="ghost" size="icon" onClick={() => editProduct(product)}><Pencil className="h-4 w-4" /></Button>

                        {status !== "archived" && (
                          <Button variant="ghost" size="icon" title="Archive" onClick={() => setConfirmAction({ type: "archive", productId: product.id, name: product.name })}>
                            <Archive className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}

                        <Button variant="ghost" size="icon" onClick={() => setConfirmAction({ type: "delete", productId: product.id, name: product.name })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredProducts.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No products found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pricing Calculator Dialog */}
      <Dialog open={pricingOpen} onOpenChange={setPricingOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle className="font-display uppercase">Product Pricing Calculator</DialogTitle></DialogHeader>
          <PricingCalculator productId={pricingProductId} onPriceCalculated={() => {}} />
        </DialogContent>
      </Dialog>

      {/* Revision History Panel */}
      <RevisionHistoryPanel
        open={!!historyProductId}
        onOpenChange={(o) => { if (!o) setHistoryProductId(null); }}
        contentType="product"
        contentId={historyProductId ?? undefined}
        onRevisionRestored={async () => {
          setHistoryProductId(null);
          await fetchProducts();
        }}
      />

      {/* Schedule Publish Dialog */}
      <SchedulePublishDialog
        open={!!scheduleProductId}
        onOpenChange={(o) => { if (!o) setScheduleProductId(null); }}
        onConfirm={handleScheduleConfirm}
      />

      {/* Confirmation Alert Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "publish" && "Publish Product?"}
              {confirmAction?.type === "unpublish" && "Unpublish Product?"}
              {confirmAction?.type === "archive" && "Archive Product?"}
              {confirmAction?.type === "delete" && "Delete Product?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "publish" && `This will make "${confirmAction.name}" visible on the storefront.`}
              {confirmAction?.type === "unpublish" && `This will hide "${confirmAction.name}" from the storefront.`}
              {confirmAction?.type === "archive" && `This will archive "${confirmAction.name}". You can restore it later.`}
              {confirmAction?.type === "delete" && `This will permanently delete "${confirmAction.name}". This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminProducts;
