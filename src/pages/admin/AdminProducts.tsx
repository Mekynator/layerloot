import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Layers, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import PricingCalculator from "@/components/admin/PricingCalculator";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  gift_finder_tag_id: string | null;
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
}

interface Category {
  id: string;
  name: string;
}

interface GiftFinderTag {
  id: string;
  name: string;
}

const MAX_PRODUCT_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_PRODUCT_MODEL_SIZE_BYTES = 500 * 1024 * 1024;

const emptyProduct = {
  name: "",
  slug: "",
  description: "",
  price: 0,
  compare_at_price: null as number | null,
  category_id: null as string | null,
  gift_finder_tag_id: null as string | null,
  images: [] as string[],
  stock: 0,
  is_featured: false,
  is_active: true,
  model_url: null as string | null,
  print_time_hours: null as number | null,
  dimensions_cm: null as any,
  weight_grams: null as number | null,
  finish_type: null as string | null,
  material_type: null as string | null,
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
  const { toast } = useToast();

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  const giftTagMap = useMemo(() => new Map(giftFinderTags.map((tag) => [tag.id, tag.name])), [giftFinderTags]);

  const resetEditor = () => {
    setForm(emptyProduct);
    setEditingId(null);
    setImageFiles([]);
    setModelFile(null);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts((data as Product[]) ?? []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name").order("name", { ascending: true });
    setCategories((data as Category[]) ?? []);
  };

  const fetchGiftFinderTags = async () => {
    const { data } = await supabase.from("gift_finder_tags").select("id, name").order("name", { ascending: true });
    setGiftFinderTags((data as GiftFinderTag[]) ?? []);
  };

  useEffect(() => {
    void fetchProducts();
    void fetchCategories();
    void fetchGiftFinderTags();
  }, []);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];
    const urls: string[] = [];

    for (const file of imageFiles) {
      if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
        throw new Error(`Image "${file.name}" is too large. Maximum allowed size is 20 MB.`);
      }

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
    if (modelFile.size > MAX_PRODUCT_MODEL_SIZE_BYTES) {
      throw new Error("3D model file is too large. Maximum allowed size is 500 MB.");
    }

    const ext = modelFile.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("3d-models").upload(path, modelFile);
    if (error) throw new Error(`Model upload failed: ${error.message}`);

    const { data } = supabase.storage.from("3d-models").getPublicUrl(path);
    return data.publicUrl;
  };

  const deleteOldModel = async (oldUrl: string) => {
    try {
      const bucketBase = supabase.storage.from("3d-models").getPublicUrl("").data.publicUrl;
      const path = oldUrl.replace(bucketBase, "");
      if (path) await supabase.storage.from("3d-models").remove([path]);
    } catch (e) {
      console.warn("Could not delete old model file:", e);
    }
  };

  const handleSubmit = async () => {
    try {
      let images = form.images;
      const uploadedUrls = await uploadImages();
      if (uploadedUrls.length > 0) images = [...images, ...uploadedUrls];

      let model_url = form.model_url || null;
      const uploadedModelUrl = await uploadModel();
      if (uploadedModelUrl) {
        if (model_url) await deleteOldModel(model_url);
        model_url = uploadedModelUrl;
      }

      const payload = {
        name: form.name,
        slug: form.slug || generateSlug(form.name),
        description: form.description || null,
        price: form.price,
        compare_at_price: form.compare_at_price || null,
        category_id: form.category_id || null,
        gift_finder_tag_id: form.gift_finder_tag_id || null,
        images,
        stock: form.stock,
        is_featured: form.is_featured,
        is_active: form.is_active,
        model_url,
        print_time_hours: form.print_time_hours || null,
        dimensions_cm: form.dimensions_cm || null,
        weight_grams: form.weight_grams || null,
        finish_type: form.finish_type || null,
        material_type: form.material_type || null,
      };

      if (editingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingId);
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          return;
        }
        toast({ title: "Product updated" });
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          return;
        }
        toast({ title: "Product created" });
      }

      setOpen(false);
      resetEditor();
      void fetchProducts();
    } catch (error: any) {
      toast({
        title: "Upload error",
        description: error?.message || "Failed to upload selected files.",
        variant: "destructive",
      });
    }
  };

  const editProduct = (product: Product) => {
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      price: Number(product.price),
      compare_at_price: product.compare_at_price ? Number(product.compare_at_price) : null,
      category_id: product.category_id,
      gift_finder_tag_id: product.gift_finder_tag_id,
      images: product.images ?? [],
      stock: product.stock,
      is_featured: product.is_featured,
      is_active: product.is_active,
      model_url: product.model_url ?? null,
      print_time_hours: product.print_time_hours ? Number(product.print_time_hours) : null,
      dimensions_cm: product.dimensions_cm ?? null,
      weight_grams: product.weight_grams ? Number(product.weight_grams) : null,
      finish_type: product.finish_type ?? null,
      material_type: product.material_type ?? null,
    });
    setEditingId(product.id);
    setOpen(true);
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Product deleted" });
    void fetchProducts();
  };

  const openPricing = (productId: string) => {
    setPricingProductId(productId);
    setPricingOpen(true);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Products</h1>

        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) resetEditor();
          }}
        >
          <DialogTrigger asChild>
            <Button className="font-display uppercase tracking-wider">
              <Plus className="mr-1 h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display uppercase">{editingId ? "Edit" : "Add"} Product</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="general" className="space-y-4">
              <TabsList className="w-full">
                <TabsTrigger value="general" className="flex-1">
                  General
                </TabsTrigger>
                <TabsTrigger value="print" className="flex-1">
                  Print Info
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                        slug: generateSlug(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price (DKK)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label>Compare Price (DKK)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.compare_at_price ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          compare_at_price: parseFloat(e.target.value) || null,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Stock</Label>
                    <Input
                      type="number"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label>Product Category</Label>
                    <Select
                      value={form.category_id ?? "none"}
                      onValueChange={(value) => setForm({ ...form, category_id: value === "none" ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Gift Finder Tag</Label>
                  <Select
                    value={form.gift_finder_tag_id ?? "none"}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        gift_finder_tag_id: value === "none" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Gift Finder tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No tag</SelectItem>
                      {giftFinderTags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          {tag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This is only used inside the Gift Finder on Create Your Own. It stays hidden on the storefront UI.
                  </p>
                </div>

                <div>
                  <Label>Product Images (max 20 MB each, multiple allowed)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
                  />
                  {form.images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {form.images.map((url, index) => (
                        <div key={index} className="group relative">
                          <img src={url} alt="" className="h-16 w-16 rounded border border-border object-cover" />
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, images: form.images.filter((_, i) => i !== index) })}
                            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label>3D Model (STL, OBJ, 3MF, max 500 MB)</Label>
                  <Input
                    type="file"
                    accept=".stl,.obj,.3mf"
                    onChange={(e) => setModelFile(e.target.files?.[0] ?? null)}
                  />
                  {form.model_url && <p className="mt-1 text-xs text-muted-foreground">Current model uploaded ✓</p>}
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.is_featured}
                      onCheckedChange={(value) => setForm({ ...form, is_featured: value })}
                    />
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(value) => setForm({ ...form, is_active: value })}
                    />
                    Active
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="print" className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  These details show on the product page as craftsmanship indicators.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Print Time (hours)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={form.print_time_hours ?? ""}
                      onChange={(e) => setForm({ ...form, print_time_hours: parseFloat(e.target.value) || null })}
                    />
                  </div>
                  <div>
                    <Label>Weight (grams)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={form.weight_grams ?? ""}
                      onChange={(e) => setForm({ ...form, weight_grams: parseFloat(e.target.value) || null })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Material Type</Label>
                  <Select
                    value={form.material_type ?? "none"}
                    onValueChange={(value) => setForm({ ...form, material_type: value === "none" ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
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
                  <Select
                    value={form.finish_type ?? "none"}
                    onValueChange={(value) => setForm({ ...form, finish_type: value === "none" ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select finish" />
                    </SelectTrigger>
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
                    <div>
                      <Label className="text-xs text-muted-foreground">Length</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={form.dimensions_cm?.length ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            dimensions_cm: {
                              ...(form.dimensions_cm || {}),
                              length: parseFloat(e.target.value) || undefined,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Width</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={form.dimensions_cm?.width ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            dimensions_cm: {
                              ...(form.dimensions_cm || {}),
                              width: parseFloat(e.target.value) || undefined,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Height</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={form.dimensions_cm?.height ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            dimensions_cm: {
                              ...(form.dimensions_cm || {}),
                              height: parseFloat(e.target.value) || undefined,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Button onClick={handleSubmit} className="w-full font-display uppercase tracking-wider">
              {editingId ? "Update" : "Create"} Product
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Gift Finder</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.images?.[0] && (
                        <img src={product.images[0]} alt="" className="h-10 w-10 rounded object-cover" />
                      )}
                      <div>
                        <p className="font-display text-sm font-semibold uppercase">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.slug}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {product.category_id ? (categoryMap.get(product.category_id) ?? "Unknown") : "—"}
                    </span>
                  </TableCell>

                  <TableCell>
                    {product.gift_finder_tag_id ? (
                      <Badge variant="secondary">{giftTagMap.get(product.gift_finder_tag_id) ?? "Unknown"}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="font-display font-bold text-primary">
                    {Number(product.price).toFixed(2)} DKK
                  </TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>
                    <span
                      className={`font-display text-xs uppercase ${
                        product.is_active ? "text-green-500" : "text-muted-foreground"
                      }`}
                    >
                      {product.is_active ? "Active" : "Draft"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openPricing(product.id)}
                      title="Pricing Calculator"
                    >
                      <Calculator className="h-4 w-4" />
                    </Button>
                    <Link to={`/admin/products/${product.id}/variants`}>
                      <Button variant="ghost" size="icon" title="Manage Variants">
                        <Layers className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => editProduct(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No products yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={pricingOpen} onOpenChange={setPricingOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Product Pricing Calculator</DialogTitle>
          </DialogHeader>
          <PricingCalculator productId={pricingProductId} onPriceCalculated={() => undefined} />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminProducts;
