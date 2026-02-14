import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface SiteBlock {
  id: string;
  page: string;
  block_type: string;
  title: string | null;
  content: any;
  sort_order: number;
  is_active: boolean;
}

const blockTypes = [
  { value: "hero", label: "Hero Banner" },
  { value: "carousel", label: "Image Carousel" },
  { value: "video", label: "Video Section" },
  { value: "text", label: "Text Block" },
  { value: "image", label: "Image Block" },
  { value: "banner", label: "Promo Banner" },
  { value: "cta", label: "Call to Action" },
];

const pages = ["home", "contact", "about", "products", "faq", "shipping-info", "returns"];

const emptyBlock = {
  page: "home",
  block_type: "hero",
  title: "",
  content: {} as any,
  sort_order: 0,
  is_active: true,
};

const AdminContent = () => {
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [form, setForm] = useState(emptyBlock);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activePage, setActivePage] = useState("home");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchBlocks = async () => {
    const { data } = await supabase.from("site_blocks").select("*").order("sort_order");
    setBlocks((data as SiteBlock[]) ?? []);
  };

  useEffect(() => { fetchBlocks(); }, []);

  const uploadFile = async (file: File): Promise<string | null> => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${ext}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file);
    setUploading(false);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return null; }
    const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) setForm({ ...form, content: { ...form.content, [field]: url } });
  };

  const handleCarouselImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadFile(file);
      if (url) urls.push(url);
    }
    setForm({ ...form, content: { ...form.content, images: [...(form.content.images || []), ...urls] } });
  };

  const handleSubmit = async () => {
    const payload = {
      page: form.page,
      block_type: form.block_type,
      title: form.title || null,
      content: form.content,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };
    if (editingId) {
      const { error } = await supabase.from("site_blocks").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Block updated" });
    } else {
      const { error } = await supabase.from("site_blocks").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Block created" });
    }
    setOpen(false);
    setForm(emptyBlock);
    setEditingId(null);
    fetchBlocks();
  };

  const editBlock = (b: SiteBlock) => {
    setForm({ page: b.page, block_type: b.block_type, title: b.title ?? "", content: b.content ?? {}, sort_order: b.sort_order, is_active: b.is_active });
    setEditingId(b.id);
    setOpen(true);
  };

  const deleteBlock = async (id: string) => {
    await supabase.from("site_blocks").delete().eq("id", id);
    toast({ title: "Block deleted" });
    fetchBlocks();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("site_blocks").update({ is_active: active }).eq("id", id);
    fetchBlocks();
  };

  const pageBlocks = blocks.filter((b) => b.page === activePage);

  const renderContentFields = () => {
    const t = form.block_type;
    return (
      <div className="space-y-3">
        {(t === "hero" || t === "banner" || t === "cta") && (
          <>
            <div><Label>Heading</Label><Input value={form.content.heading ?? ""} onChange={(e) => setForm({ ...form, content: { ...form.content, heading: e.target.value } })} /></div>
            <div><Label>Subheading</Label><Input value={form.content.subheading ?? ""} onChange={(e) => setForm({ ...form, content: { ...form.content, subheading: e.target.value } })} /></div>
            <div><Label>Button Text</Label><Input value={form.content.button_text ?? ""} onChange={(e) => setForm({ ...form, content: { ...form.content, button_text: e.target.value } })} /></div>
            <div><Label>Button Link</Label><Input value={form.content.button_link ?? ""} onChange={(e) => setForm({ ...form, content: { ...form.content, button_link: e.target.value } })} /></div>
            <div><Label>Background Image</Label><Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "bg_image")} />
              {form.content.bg_image && <img src={form.content.bg_image} alt="" className="mt-2 h-20 rounded object-cover" />}
            </div>
          </>
        )}
        {t === "text" && (
          <>
            <div><Label>Heading</Label><Input value={form.content.heading ?? ""} onChange={(e) => setForm({ ...form, content: { ...form.content, heading: e.target.value } })} /></div>
            <div><Label>Body</Label><Textarea value={form.content.body ?? ""} onChange={(e) => setForm({ ...form, content: { ...form.content, body: e.target.value } })} rows={4} /></div>
          </>
        )}
        {t === "image" && (
          <div><Label>Image</Label><Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "image_url")} />
            {form.content.image_url && <img src={form.content.image_url} alt="" className="mt-2 h-32 rounded object-cover" />}
          </div>
        )}
        {t === "carousel" && (
          <div>
            <Label>Carousel Images</Label>
            <Input type="file" accept="image/*" multiple onChange={handleCarouselImageUpload} />
            <div className="mt-2 flex flex-wrap gap-2">
              {(form.content.images || []).map((img: string, i: number) => (
                <div key={i} className="relative">
                  <img src={img} alt="" className="h-16 w-16 rounded object-cover" />
                  <button className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"
                    onClick={() => setForm({ ...form, content: { ...form.content, images: form.content.images.filter((_: string, j: number) => j !== i) } })}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {t === "video" && (
          <>
            <div><Label>Video URL (YouTube/Vimeo embed or direct MP4)</Label><Input value={form.content.video_url ?? ""} onChange={(e) => setForm({ ...form, content: { ...form.content, video_url: e.target.value } })} /></div>
            <div><Label>Or Upload Video</Label><Input type="file" accept="video/*" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              const url = await uploadFile(file);
              if (url) setForm({ ...form, content: { ...form.content, video_url: url, video_type: "upload" } });
            }} /></div>
            <div><Label>Caption</Label><Input value={form.content.caption ?? ""} onChange={(e) => setForm({ ...form, content: { ...form.content, caption: e.target.value } })} /></div>
          </>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Page Editor</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyBlock); setEditingId(null); } }}>
          <DialogTrigger asChild>
            <Button className="font-display uppercase tracking-wider"><Plus className="mr-1 h-4 w-4" /> Add Block</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle className="font-display uppercase">{editingId ? "Edit" : "Add"} Content Block</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Page</Label>
                  <Select value={form.page} onValueChange={(v) => setForm({ ...form, page: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {pages.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Block Type</Label>
                  <Select value={form.block_type} onValueChange={(v) => setForm({ ...form, block_type: v, content: {} })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {blockTypes.map((bt) => <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Title (internal label)</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              {renderContentFields()}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} /></div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active
                  </label>
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={uploading} className="w-full font-display uppercase tracking-wider">
                {uploading ? "Uploading..." : editingId ? "Update Block" : "Create Block"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Page Tabs */}
      <div className="mb-6 flex gap-2">
        {pages.map((p) => (
          <Button key={p} variant={activePage === p ? "default" : "outline"} size="sm"
            onClick={() => setActivePage(p)} className="font-display uppercase tracking-wider text-xs capitalize">
            {p}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {pageBlocks.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No content blocks for this page.</CardContent></Card>
        )}
        {pageBlocks.map((b) => (
          <Card key={b.id} className={!b.is_active ? "opacity-50" : ""}>
            <CardContent className="flex items-center gap-4 p-4">
              <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-display text-xs uppercase">{b.block_type}</Badge>
                  <span className="font-display text-sm font-semibold uppercase text-card-foreground">{b.title || "Untitled"}</span>
                </div>
                <p className="text-xs text-muted-foreground">Order: {b.sort_order}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => toggleActive(b.id, !b.is_active)}>
                {b.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => editBlock(b)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => deleteBlock(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminContent;
