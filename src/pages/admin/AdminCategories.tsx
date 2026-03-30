import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

interface GiftFinderTag {
  id: string;
  name: string;
  slug: string;
  icon_key: string | null;
  sort_order: number | null;
  is_active: boolean;
}

const emptyCategory = {
  name: "",
  slug: "",
  parent_id: null as string | null,
};

const emptyGiftTag = {
  name: "",
  slug: "",
  icon_key: "",
  sort_order: 0,
  is_active: true,
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

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

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, parent_id")
      .order("name", { ascending: true });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setCategories((data as Category[]) ?? []);
  };

  const fetchGiftFinderTags = async () => {
    const { data, error } = await supabase
      .from("gift_finder_tags")
      .select("id, name, slug, icon_key, sort_order, is_active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setGiftFinderTags((data as GiftFinderTag[]) ?? []);
  };

  useEffect(() => {
    void fetchCategories();
    void fetchGiftFinderTags();
  }, []);

  const resetCategoryEditor = () => {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategory);
  };

  const resetGiftTagEditor = () => {
    setEditingGiftTagId(null);
    setGiftTagForm(emptyGiftTag);
  };

  const handleCategorySubmit = async () => {
    const payload = {
      name: categoryForm.name.trim(),
      slug: categoryForm.slug || slugify(categoryForm.name),
      parent_id: categoryForm.parent_id || null,
    };

    if (!payload.name) {
      toast({ title: "Name required", description: "Please enter a category name.", variant: "destructive" });
      return;
    }

    if (editingCategoryId) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editingCategoryId);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Category updated" });
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Category created" });
    }

    setCategoryDialogOpen(false);
    resetCategoryEditor();
    void fetchCategories();
  };

  const handleGiftTagSubmit = async () => {
    const payload = {
      name: giftTagForm.name.trim(),
      slug: giftTagForm.slug || slugify(giftTagForm.name),
      icon_key: giftTagForm.icon_key?.trim() || null,
      sort_order: Number(giftTagForm.sort_order) || 0,
      is_active: giftTagForm.is_active,
    };

    if (!payload.name) {
      toast({ title: "Name required", description: "Please enter a Gift Finder tag name.", variant: "destructive" });
      return;
    }

    if (editingGiftTagId) {
      const { error } = await supabase.from("gift_finder_tags").update(payload).eq("id", editingGiftTagId);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Gift Finder tag updated" });
    } else {
      const { error } = await supabase.from("gift_finder_tags").insert(payload);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Gift Finder tag created" });
    }

    setGiftTagDialogOpen(false);
    resetGiftTagEditor();
    void fetchGiftFinderTags();
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Category deleted" });
    void fetchCategories();
  };

  const handleDeleteGiftTag = async (id: string) => {
    const { error } = await supabase.from("gift_finder_tags").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Gift Finder tag deleted" });
    void fetchGiftFinderTags();
  };

  const openEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id,
    });
    setCategoryDialogOpen(true);
  };

  const openEditGiftTag = (tag: GiftFinderTag) => {
    setEditingGiftTagId(tag.id);
    setGiftTagForm({
      name: tag.name,
      slug: tag.slug,
      icon_key: tag.icon_key ?? "",
      sort_order: tag.sort_order ?? 0,
      is_active: tag.is_active,
    });
    setGiftTagDialogOpen(true);
  };

  const parentCategories = categories.filter((category) => !category.parent_id);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase text-foreground">Categories & Gift Finder Tags</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Product categories control the Products page. Gift Finder tags control only the Create Your Own → Gift
            Finder section.
          </p>
        </div>

        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="categories">Product Categories</TabsTrigger>
            <TabsTrigger value="gift-finder">Gift Finder Tags</TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="font-display uppercase">Product Categories</CardTitle>

                <Dialog
                  open={categoryDialogOpen}
                  onOpenChange={(value) => {
                    setCategoryDialogOpen(value);
                    if (!value) resetCategoryEditor();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="font-display uppercase tracking-wider">
                      <Plus className="mr-1 h-4 w-4" /> Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-display uppercase">
                        {editingCategoryId ? "Edit" : "Add"} Category
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={categoryForm.name}
                          onChange={(e) =>
                            setCategoryForm({
                              ...categoryForm,
                              name: e.target.value,
                              slug: slugify(e.target.value),
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Slug</Label>
                        <Input
                          value={categoryForm.slug}
                          onChange={(e) => setCategoryForm({ ...categoryForm, slug: slugify(e.target.value) })}
                        />
                      </div>

                      <div>
                        <Label>Parent Category</Label>
                        <Select
                          value={categoryForm.parent_id ?? "none"}
                          onValueChange={(value) =>
                            setCategoryForm({
                              ...categoryForm,
                              parent_id: value === "none" ? null : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="No parent" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No parent</SelectItem>
                            {parentCategories
                              .filter((category) => category.id !== editingCategoryId)
                              .map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button onClick={handleCategorySubmit} className="w-full font-display uppercase tracking-wider">
                        {editingCategoryId ? "Update" : "Create"} Category
                      </Button>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>{category.name}</TableCell>
                        <TableCell>{category.slug}</TableCell>
                        <TableCell>
                          {category.parent_id
                            ? (categories.find((parent) => parent.id === category.parent_id)?.name ?? "—")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditCategory(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gift-finder">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="font-display uppercase">Gift Finder Tags</CardTitle>

                <Dialog
                  open={giftTagDialogOpen}
                  onOpenChange={(value) => {
                    setGiftTagDialogOpen(value);
                    if (!value) resetGiftTagEditor();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="font-display uppercase tracking-wider">
                      <Plus className="mr-1 h-4 w-4" /> Add Tag
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-display uppercase">
                        {editingGiftTagId ? "Edit" : "Add"} Gift Finder Tag
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={giftTagForm.name}
                          onChange={(e) =>
                            setGiftTagForm({
                              ...giftTagForm,
                              name: e.target.value,
                              slug: slugify(e.target.value),
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Slug</Label>
                        <Input
                          value={giftTagForm.slug}
                          onChange={(e) => setGiftTagForm({ ...giftTagForm, slug: slugify(e.target.value) })}
                        />
                      </div>

                      <div>
                        <Label>Icon Key</Label>
                        <Input
                          value={giftTagForm.icon_key}
                          onChange={(e) => setGiftTagForm({ ...giftTagForm, icon_key: e.target.value })}
                          placeholder="gamer, fantasy, desk, personalized..."
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Optional. Use keys like gamer, fantasy, desk, home, kids, pets, art, music, sports, garden,
                          tools.
                        </p>
                      </div>

                      <div>
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={giftTagForm.sort_order}
                          onChange={(e) =>
                            setGiftTagForm({
                              ...giftTagForm,
                              sort_order: parseInt(e.target.value, 10) || 0,
                            })
                          }
                        />
                      </div>

                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={giftTagForm.is_active}
                          onCheckedChange={(value) => setGiftTagForm({ ...giftTagForm, is_active: value })}
                        />
                        Active
                      </label>

                      <Button onClick={handleGiftTagSubmit} className="w-full font-display uppercase tracking-wider">
                        {editingGiftTagId ? "Update" : "Create"} Tag
                      </Button>
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
                          <Button variant="ghost" size="icon" onClick={() => openEditGiftTag(tag)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteGiftTag(tag.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
    </AdminLayout>
  );
};

export default AdminCategories;
