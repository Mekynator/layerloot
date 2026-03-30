import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface GiftTag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  icon_name: string | null;
}

const AdminCategories = () => {
  const [tags, setTags] = useState<GiftTag[]>([]);
  const [form, setForm] = useState({ name: "", description: "", sort_order: 0, icon_name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const fetchTags = async () => {
    const { data } = await supabase.from("categories").select("id, name, slug, description, sort_order, icon_name").order("sort_order");
    setTags((data as GiftTag[]) ?? []);
  };

  useEffect(() => { fetchTags(); }, []);

  const generateSlug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: generateSlug(form.name),
      description: form.description || null,
      sort_order: form.sort_order,
      icon_name: form.icon_name || null,
    };

    if (editingId) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Tag updated" });
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Tag created" });
    }

    setOpen(false);
    resetForm();
    fetchTags();
  };

  const resetForm = () => {
    setForm({ name: "", description: "", sort_order: 0, icon_name: "" });
    setEditingId(null);
  };

  const edit = (t: GiftTag) => {
    setForm({ name: t.name, description: t.description ?? "", sort_order: t.sort_order, icon_name: t.icon_name ?? "" });
    setEditingId(t.id);
    setOpen(true);
  };

  const del = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    toast({ title: "Tag deleted" });
    fetchTags();
  };

  const ICON_OPTIONS = [
    "Gamepad2", "Swords", "Monitor", "Heart", "Home", "Baby", "Dog",
    "Palette", "Music", "Trophy", "Flower2", "Wrench", "Gift", "Star",
    "Camera", "Bike", "Car", "Book", "Coffee", "Zap",
  ];

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase text-foreground">Gift Finder Tags</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the tags shown in the Gift Finder. Assign these to products via the product editor.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="font-display uppercase tracking-wider"><Plus className="mr-1 h-4 w-4" /> Add Tag</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display uppercase">{editingId ? "Edit" : "Add"} Gift Finder Tag</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tag Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gamer, Music Fan" />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
              </div>
              <div>
                <Label>Icon</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm({ ...form, icon_name: icon })}
                      className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        form.icon_name === icon
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <Button onClick={handleSubmit} className="w-full font-display uppercase tracking-wider">{editingId ? "Update" : "Create"} Tag</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {tags.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No gift finder tags yet. Add your first tag above.</CardContent></Card>
        )}
        {tags.map((tag) => (
          <Card key={tag.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-display font-semibold uppercase text-card-foreground">{tag.name}</p>
                  {tag.description && <p className="text-xs text-muted-foreground">{tag.description}</p>}
                  {tag.icon_name && <p className="text-xs text-muted-foreground">Icon: {tag.icon_name}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => edit(tag)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => del(tag.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
