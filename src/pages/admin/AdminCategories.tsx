import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ImageUploadField from "@/components/admin/editor/controls/ImageUploadField";
import SliderField from "@/components/admin/editor/controls/SliderField";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
}

interface GiftFinderTag {
  id: string;
  name: string;
  slug: string;
  icon_key: string | null;
  sort_order: number | null;
  is_active: boolean;
  image_url: string | null;
  image_opacity: number | null;
  image_fit: string | null;
}

const emptyCategory = { name: "", slug: "", parent_id: null as string | null };
const emptyGiftTag = { name: "", slug: "", icon_key: "", sort_order: 0, is_active: true, image_url: "", image_opacity: 30, image_fit: "cover" };

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AdminCategories = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [giftFinderTags, setGiftFinderTags] = useState<GiftFinderTag[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [giftTagDialogOpen, setGiftTagDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingGiftTagId, setEditingGiftTagId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [giftTagForm, setGiftTagForm] = useState(emptyGiftTag);
  const [collapsedMasters, setCollapsedMasters] = useState<Set<string>>(new Set());

  const fetchCategories = async () => {
    const { data, error } = await supabase.from("categories").select("id, name, slug, parent_id, sort_order").order("sort_order").order("name");
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCategories((data as Category[]) ?? []);
  };

  const fetchGiftFinderTags = async () => {
    const { data, error } = await supabase.from("gift_finder_tags").select("id, name, slug, icon_key, sort_order, is_active, image_url, image_opacity, image_fit").order("sort_order").order("name");
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setGiftFinderTags((data as GiftFinderTag[]) ?? []);
  };

  useEffect(() => { void fetchCategories(); void fetchGiftFinderTags(); }, []);

  const resetCategoryEditor = () => { setEditingCategoryId(null); setCategoryForm(emptyCategory); };
  const resetGiftTagEditor = () => { setEditingGiftTagId(null); setGiftTagForm(emptyGiftTag); };

  // Hierarchy helpers
  const masterCategories = useMemo(() => categories.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order), [categories]);
  const childrenMap = useMemo(() => {
    const map: Record<string, Category[]> = {};
    for (const c of categories) {
      if (c.parent_id) {
        if (!map[c.parent_id]) map[c.parent_id] = [];
        map[c.parent_id].push(c);
      }
    }
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [categories]);

  const toggleCollapse = (id: string) => {
    setCollapsedMasters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const moveCategoryInList = async (list: Category[], index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;
    const a = list[index];
    const b = list[swapIndex];
    await Promise.all([
      supabase.from("categories").update({ sort_order: b.sort_order } as any).eq("id", a.id),
      supabase.from("categories").update({ sort_order: a.sort_order } as any).eq("id", b.id),
    ]);
    await fetchCategories();
  };

  const handleCategorySubmit = async () => {
    const payload = {
      name: categoryForm.name.trim(),
      slug: categoryForm.slug || slugify(categoryForm.name),
      parent_id: categoryForm.parent_id || null,
    };
    if (!payload.name) { toast({ title: "Name required", variant: "destructive" }); return; }

    if (editingCategoryId) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editingCategoryId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Category updated" });
    } else {
      // Set sort_order to end
      const siblings = categories.filter(c => (payload.parent_id ? c.parent_id === payload.parent_id : !c.parent_id));
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(c => c.sort_order)) + 1 : 0;
      const { error } = await supabase.from("categories").insert({ ...payload, sort_order: maxOrder });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Category created" });
    }
    setCategoryDialogOpen(false);
    resetCategoryEditor();
    void fetchCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Category deleted" });
    void fetchCategories();
  };

  const openEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({ name: category.name, slug: category.slug, parent_id: category.parent_id });
    setCategoryDialogOpen(true);
  };

  // Gift tag handlers
  const handleGiftTagSubmit = async () => {
    const payload = {
      name: giftTagForm.name.trim(),
      slug: giftTagForm.slug || slugify(giftTagForm.name),
      icon_key: giftTagForm.icon_key?.trim() || null,
      sort_order: Number(giftTagForm.sort_order) || 0,
      is_active: giftTagForm.is_active,
      image_url: giftTagForm.image_url?.trim() || null,
      image_opacity: (giftTagForm.image_opacity ?? 30) / 100,
      image_fit: giftTagForm.image_fit || "cover",
    };
    if (!payload.name) { toast({ title: "Name required", variant: "destructive" }); return; }

    if (editingGiftTagId) {
      const { error } = await supabase.from("gift_finder_tags").update(payload).eq("id", editingGiftTagId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Gift Finder tag updated" });
    } else {
      const { error } = await supabase.from("gift_finder_tags").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Gift Finder tag created" });
    }
    setGiftTagDialogOpen(false);
    resetGiftTagEditor();
    void fetchGiftFinderTags();
  };

  const handleDeleteGiftTag = async (id: string) => {
    const { error } = await supabase.from("gift_finder_tags").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Gift Finder tag deleted" });
    void fetchGiftFinderTags();
  };

  const openEditGiftTag = (tag: GiftFinderTag) => {
    setEditingGiftTagId(tag.id);
    setGiftTagForm({
      name: tag.name, slug: tag.slug, icon_key: tag.icon_key ?? "",
      sort_order: tag.sort_order ?? 0, is_active: tag.is_active,
      image_url: tag.image_url ?? "", image_opacity: Math.round((tag.image_opacity ?? 0.3) * 100),
      image_fit: tag.image_fit ?? "cover",
    });
    setGiftTagDialogOpen(true);
  };

  const parentCategoriesForSelect = categories.filter(c => !c.parent_id);

  const renderCategoryRow = (cat: Category, index: number, list: Category[], indent: boolean = false) => (
    <TableRow key={cat.id} className={indent ? "bg-muted/5" : ""}>
      <TableCell>
        <div className="flex items-center gap-2">
          {!indent && (childrenMap[cat.id]?.length ?? 0) > 0 && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleCollapse(cat.id)}>
              {collapsedMasters.has(cat.id) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          )}
          {indent && <span className="ml-8 text-muted-foreground">↳</span>}
          <span className={indent ? "text-sm" : "font-medium"}>{cat.name}</span>
          {!indent && (childrenMap[cat.id]?.length ?? 0) > 0 && (
            <Badge variant="outline" className="text-[9px] ml-1">{childrenMap[cat.id].length} sub</Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">{cat.slug}</TableCell>
      <TableCell>
        {cat.parent_id ? (categories.find(p => p.id === cat.parent_id)?.name ?? "—") : "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => moveCategoryInList(list, index, "up")}>
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === list.length - 1} onClick={() => moveCategoryInList(list, index, "down")}>
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" onClick={() => openEditCategory(cat)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase text-foreground">Categories & Gift Finder Tags</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Product categories control the Products page. Gift Finder tags control only the Create Your Own → Gift Finder section.
          </p>
        </div>

        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="categories">Product Categories</TabsTrigger>
            <TabsTrigger value="gift-finder">Gift Finder Tags</TabsTrigger>
          </TabsList>

          {/* ─── Categories ─── */}
          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="font-display uppercase">Product Categories</CardTitle>
                <Dialog open={categoryDialogOpen} onOpenChange={(v) => { setCategoryDialogOpen(v); if (!v) resetCategoryEditor(); }}>
                  <DialogTrigger asChild>
                    <Button className="font-display uppercase tracking-wider"><Plus className="mr-1 h-4 w-4" /> Add Category</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle className="font-display uppercase">{editingCategoryId ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Name</Label><Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value, slug: slugify(e.target.value) })} /></div>
                      <div><Label>Slug</Label><Input value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: slugify(e.target.value) })} /></div>
                      <div>
                        <Label>Parent Category</Label>
                        <Select value={categoryForm.parent_id ?? "none"} onValueChange={(v) => setCategoryForm({ ...categoryForm, parent_id: v === "none" ? null : v })}>
                          <SelectTrigger><SelectValue placeholder="No parent" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No parent</SelectItem>
                            {parentCategoriesForSelect.filter(c => c.id !== editingCategoryId).map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCategorySubmit} className="w-full font-display uppercase tracking-wider">{editingCategoryId ? "Update" : "Create"} Category</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {masterCategories.map((master, mIdx) => (
                      <>
                        {renderCategoryRow(master, mIdx, masterCategories, false)}
                        {!collapsedMasters.has(master.id) && (childrenMap[master.id] ?? []).map((child, cIdx) =>
                          renderCategoryRow(child, cIdx, childrenMap[master.id], true)
                        )}
                      </>
                    ))}
                    {/* Orphan categories (have parent_id but parent doesn't exist or is also a child) */}
                    {categories.filter(c => c.parent_id && !masterCategories.find(m => m.id === c.parent_id) && !categories.find(p => p.id === c.parent_id && !p.parent_id)).length > 0 && null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Gift Finder Tags ─── */}
          <TabsContent value="gift-finder">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="font-display uppercase">Gift Finder Tags</CardTitle>
                <Dialog open={giftTagDialogOpen} onOpenChange={(v) => { setGiftTagDialogOpen(v); if (!v) resetGiftTagEditor(); }}>
                  <DialogTrigger asChild>
                    <Button className="font-display uppercase tracking-wider"><Plus className="mr-1 h-4 w-4" /> Add Tag</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle className="font-display uppercase">{editingGiftTagId ? "Edit" : "Add"} Gift Finder Tag</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Name</Label><Input value={giftTagForm.name} onChange={(e) => setGiftTagForm({ ...giftTagForm, name: e.target.value, slug: slugify(e.target.value) })} /></div>
                      <div><Label>Slug</Label><Input value={giftTagForm.slug} onChange={(e) => setGiftTagForm({ ...giftTagForm, slug: slugify(e.target.value) })} /></div>
                      <div><Label>Icon Key</Label><Input value={giftTagForm.icon_key} onChange={(e) => setGiftTagForm({ ...giftTagForm, icon_key: e.target.value })} placeholder="gamer, fantasy, desk..." /><p className="mt-1 text-xs text-muted-foreground">Optional key like gamer, fantasy, desk, home, kids, pets.</p></div>
                      <div><Label>Sort Order</Label><Input type="number" value={giftTagForm.sort_order} onChange={(e) => setGiftTagForm({ ...giftTagForm, sort_order: parseInt(e.target.value, 10) || 0 })} /></div>
                      <ImageUploadField label="Background Image" value={giftTagForm.image_url} onChange={(url) => setGiftTagForm({ ...giftTagForm, image_url: url })} />
                      <SliderField label="Image Opacity" value={giftTagForm.image_opacity} onChange={(v) => setGiftTagForm({ ...giftTagForm, image_opacity: v })} min={5} max={100} step={5} unit="%" />
                      <div>
                        <Label>Image Fit</Label>
                        <Select value={giftTagForm.image_fit} onValueChange={(v) => setGiftTagForm({ ...giftTagForm, image_fit: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cover">Cover</SelectItem>
                            <SelectItem value="contain">Contain</SelectItem>
                            <SelectItem value="stretch">Stretch</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-center gap-2 text-sm"><Switch checked={giftTagForm.is_active} onCheckedChange={(v) => setGiftTagForm({ ...giftTagForm, is_active: v })} /> Active</label>
                      <Button onClick={handleGiftTagSubmit} className="w-full font-display uppercase tracking-wider">{editingGiftTagId ? "Update" : "Create"} Tag</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Icon</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {giftFinderTags.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell>{tag.name}</TableCell>
                        <TableCell>{tag.slug}</TableCell>
                        <TableCell>{tag.icon_key || "—"}</TableCell>
                        <TableCell>{tag.sort_order ?? 0}</TableCell>
                        <TableCell>{tag.is_active ? "Active" : "Hidden"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditGiftTag(tag)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteGiftTag(tag.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default AdminCategories;
