import { useEffect, useState, useRef, useCallback } from "react";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Upload, ArrowUp, ArrowDown, Type, Image, Link2, Square, PlayCircle, Columns, MousePointer, Save, X, ChevronDown, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { tr } from "@/lib/translate";

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
  { value: "hero", label: "Hero Banner", icon: Square },
  { value: "text", label: "Text Block", icon: Type },
  { value: "image", label: "Image Block", icon: Image },
  { value: "carousel", label: "Image Carousel", icon: Columns },
  { value: "video", label: "Video Section", icon: PlayCircle },
  { value: "banner", label: "Promo Banner", icon: Square },
  { value: "cta", label: "Call to Action", icon: MousePointer },
  { value: "button", label: "Button with Link", icon: Link2 },
  { value: "spacer", label: "Spacer", icon: Square },
  { value: "html", label: "Custom HTML", icon: Type },
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activePage, setActivePage] = useState("home");
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBlocks = async () => {
    const { data } = await supabase.from("site_blocks").select("*").order("sort_order");
    setBlocks((data as SiteBlock[]) ?? []);
  };

  useEffect(() => { fetchBlocks(); }, []);

  const pageBlocks = blocks.filter((b) => b.page === activePage).sort((a, b) => a.sort_order - b.sort_order);

  // Upload
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

  // CRUD
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
      const maxOrder = pageBlocks.length > 0 ? Math.max(...pageBlocks.map(b => b.sort_order)) + 1 : 0;
      payload.sort_order = maxOrder;
      const { error } = await supabase.from("site_blocks").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Block created" });
    }
    setDialogOpen(false);
    setForm(emptyBlock);
    setEditingId(null);
    fetchBlocks();
  };

  const editBlock = (b: SiteBlock) => {
    setForm({ page: b.page, block_type: b.block_type, title: b.title ?? "", content: b.content ?? {}, sort_order: b.sort_order, is_active: b.is_active });
    setEditingId(b.id);
    setDialogOpen(true);
  };

  const deleteBlock = async (id: string) => {
    await supabase.from("site_blocks").delete().eq("id", id);
    toast({ title: "Block deleted" });
    setSelectedBlockId(null);
    fetchBlocks();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("site_blocks").update({ is_active: active }).eq("id", id);
    fetchBlocks();
  };

  const moveBlock = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= pageBlocks.length) return;
    const a = pageBlocks[index];
    const b = pageBlocks[swapIndex];
    await Promise.all([
      supabase.from("site_blocks").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("site_blocks").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    fetchBlocks();
  };

  // Drag & Drop
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDragEnd = async () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const reordered = [...pageBlocks];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dragOverIndex, 0, moved);
      await Promise.all(reordered.map((b, i) =>
        supabase.from("site_blocks").update({ sort_order: i }).eq("id", b.id)
      ));
      fetchBlocks();
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Quick add block
  const quickAddBlock = (type: string) => {
    setForm({ ...emptyBlock, page: activePage, block_type: type });
    setEditingId(null);
    setDialogOpen(true);
  };

  // Duplicate
  const duplicateBlock = async (b: SiteBlock) => {
    const maxOrder = pageBlocks.length > 0 ? Math.max(...pageBlocks.map(bl => bl.sort_order)) + 1 : 0;
    await supabase.from("site_blocks").insert({
      page: b.page, block_type: b.block_type, title: (b.title ?? "Untitled") + " (copy)",
      content: b.content, sort_order: maxOrder, is_active: b.is_active,
    });
    toast({ title: "Block duplicated" });
    fetchBlocks();
  };

  // Render live preview of a block
  const renderBlockPreview = (b: SiteBlock) => {
    const c = b.content || {};
    switch (b.block_type) {
      case "hero":
        return (
          <div className="relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-lg bg-secondary text-secondary-foreground"
            style={c.bg_image ? { backgroundImage: `url(${c.bg_image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
            <div className="relative z-10 p-8 text-center">
              <h2 className="font-display text-3xl font-bold uppercase">{tr(c.heading, "Hero Heading")}</h2>
              {c.subheading && <p className="mt-2 text-lg opacity-80">{tr(c.subheading, "")}</p>}
              {c.button_text && <button className="mt-4 rounded bg-primary px-6 py-2 font-display text-sm font-bold uppercase text-primary-foreground">{tr(c.button_text, "")}</button>}
            </div>
            {c.bg_image && <div className="absolute inset-0 bg-black/40" />}
          </div>
        );
      case "text":
        return (
          <div className="rounded-lg bg-card p-6">
            {c.heading && <h3 className="mb-2 font-display text-xl font-bold uppercase text-card-foreground">{tr(c.heading, "")}</h3>}
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tr(c.body, "Text content goes here...")}</p>
          </div>
        );
      case "image":
        return c.image_url ? (
          <img src={c.image_url} alt={c.alt || ""} className="h-40 w-full rounded-lg object-cover" />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted"><Image className="h-8 w-8 text-muted-foreground" /></div>
        );
      case "carousel":
        return (
          <div className="flex gap-2 overflow-x-auto rounded-lg bg-card p-4">
            {(c.images || []).length > 0
              ? (c.images as string[]).map((img, i) => <img key={i} src={img} alt="" className="h-24 w-32 shrink-0 rounded object-cover" />)
              : <div className="flex h-24 w-full items-center justify-center text-sm text-muted-foreground">No images added</div>}
          </div>
        );
      case "video":
        return (
          <div className="flex h-40 items-center justify-center rounded-lg bg-secondary">
            <PlayCircle className="h-12 w-12 text-secondary-foreground opacity-50" />
            {c.caption && <p className="ml-3 text-sm text-secondary-foreground">{tr(c.caption, "")}</p>}
          </div>
        );
      case "banner":
      case "cta":
        return (
          <div className="rounded-lg bg-primary/10 p-6 text-center">
            <h3 className="font-display text-xl font-bold uppercase text-foreground">{tr(c.heading, "Banner Heading")}</h3>
            {c.subheading && <p className="mt-1 text-sm text-muted-foreground">{tr(c.subheading, "")}</p>}
            {c.button_text && <button className="mt-3 rounded bg-primary px-5 py-2 font-display text-xs font-bold uppercase text-primary-foreground">{tr(c.button_text, "")}</button>}
          </div>
        );
      case "button":
        return (
          <div className="flex justify-center rounded-lg bg-card p-6">
            <button className="rounded bg-primary px-6 py-3 font-display text-sm font-bold uppercase text-primary-foreground">
              {tr(c.button_text, "Click Me")} {c.button_link && <span className="ml-1 text-xs opacity-70">→ {c.button_link}</span>}
            </button>
          </div>
        );
      case "spacer":
        return <div className="flex items-center justify-center rounded border-2 border-dashed border-border" style={{ height: `${c.height || 40}px` }}>
          <span className="text-xs text-muted-foreground">Spacer ({c.height || 40}px)</span>
        </div>;
      case "html":
        return (
          <div className="rounded-lg border border-border bg-card p-4">
            <pre className="overflow-auto text-xs text-muted-foreground">{tr(c.html, "<div>Custom HTML</div>")}</pre>
          </div>
        );
      default:
        return <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Unknown block type: {b.block_type}</div>;
    }
  };

  const renderContentFields = () => {
    const t = form.block_type;
    return (
      <div className="space-y-3">
        {(t === "hero" || t === "banner" || t === "cta") && (
          <>
            <div><Label>Heading</Label><Input value={tr(form.content.heading, "")} onChange={(e) => setForm({ ...form, content: { ...form.content, heading: e.target.value } })} /></div>
            <div><Label>Subheading</Label><Input value={tr(form.content.subheading, "")} onChange={(e) => setForm({ ...form, content: { ...form.content, subheading: e.target.value } })} /></div>
            <div><Label>Button Text</Label><Input value={tr(form.content.button_text, "")} onChange={(e) => setForm({ ...form, content: { ...form.content, button_text: e.target.value } })} /></div>
            <div><Label>Button Link</Label><Input value={tr(form.content.button_link, "")} onChange={(e) => setForm({ ...form, content: { ...form.content, button_link: e.target.value } })} /></div>
            {t === "hero" && <div><Label>Background Image</Label><Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "bg_image")} />
              {form.content.bg_image && <img src={form.content.bg_image} alt="" className="mt-2 h-20 rounded object-cover" />}
            </div>}
          </>
        )}
        {t === "text" && (
          <>
            <div><Label>Heading</Label><Input value={tr(form.content.heading, "")} onChange={(e) => setForm({ ...form, content: { ...form.content, heading: e.target.value } })} /></div>
            <div><Label>Body</Label><Textarea value={tr(form.content.body, "")} onChange={(e) => setForm({ ...form, content: { ...form.content, body: e.target.value } })} rows={4} /></div>
          </>
        )}
        {t === "image" && (
          <>
            <div><Label>Image</Label><Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "image_url")} />
              {form.content.image_url && <img src={form.content.image_url} alt="" className="mt-2 h-32 rounded object-cover" />}
            </div>
            <div><Label>Alt Text</Label><Input value={tr(form.content.alt, "")} onChange={(e) => setForm({ ...form, content: { ...form.content, alt: e.target.value } })} /></div>
          </>
        )}
        {t === "carousel" && (
          <div>
            <Label>Carousel Images</Label>
            <Input type="file" accept="image/*" multiple onChange={handleCarouselImageUpload} />
            <div className="mt-2 flex flex-wrap gap-2">
              {(form.content.images || []).map((img: string, i: number) => (
                <div key={i} className="relative">
                  <img src={img} alt="" className="h-16 w-16 rounded object-cover" />
                  <button className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
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
            <div><Label>Video URL (YouTube/Vimeo or MP4)</Label><Input value={tr(form.content.video_url, "")} onChange={(e) => setForm({ ...form, content: { ...form.content, video_url: e.target.value } })} /></div>
            <div><Label>Or Upload Video</Label><Input type="file" accept="video/*" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              const url = await uploadFile(file);
              if (url) setForm({ ...form, content: { ...form.content, video_url: url, video_type: "upload" } });
            }} /></div>
            <div><Label>Caption</Label><Input value={tr(form.content.caption, "")} onChange={(e) => setForm({ ...form, content: { ...form.content, caption: e.target.value } })} /></div>
          </>
        )}
        {t === "button" && (
          <>
            <div><Label>Button Text</Label><Input value={tr(form.content.button_text, "")} onChange={(e) => setForm({ ...form, content: { ...form.content, button_text: e.target.value } })} /></div>
            <div><Label>Button Link</Label><Input value={tr(form.content.button_link, "")} onChange={(e) => setForm({ ...form, content: { ...form.content, button_link: e.target.value } })} /></div>
            <div><Label>Style</Label>
              <Select value={form.content.style ?? "primary"} onValueChange={(v) => setForm({ ...form, content: { ...form.content, style: v } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="ghost">Ghost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        {t === "spacer" && (
          <div><Label>Height (px)</Label><Input type="number" value={form.content.height ?? 40} onChange={(e) => setForm({ ...form, content: { ...form.content, height: parseInt(e.target.value) || 40 } })} /></div>
        )}
        {t === "html" && (
          <div><Label>HTML Code</Label><Textarea value={tr(form.content.html, "")} onChange={(e) => setForm({ ...form, content: { ...form.content, html: e.target.value } })} rows={6} className="font-mono text-xs" /></div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase text-foreground">Blocks & Content</h1>
          <p className="text-sm text-muted-foreground">Manage page blocks, visibility, and ordering in one place.</p>
        </div>
      </div>

      {/* Page Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {pages.map((p) => (
          <Button key={p} variant={activePage === p ? "default" : "outline"} size="sm"
            onClick={() => { setActivePage(p); setSelectedBlockId(null); }}
            className="font-display text-xs uppercase tracking-wider capitalize">
            {p}
          </Button>
        ))}
      </div>

      {/* Quick Add Toolbar */}
      <div className="mb-6 rounded-lg border border-border bg-card p-3">
        <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add Section</p>
        <div className="flex flex-wrap gap-2">
          {blockTypes.map(({ value, label, icon: Icon }) => (
            <Button key={value} variant="outline" size="sm" onClick={() => quickAddBlock(value)}
              className="gap-1.5 font-display text-xs uppercase tracking-wider">
              <Icon className="h-3.5 w-3.5" /> {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Live Preview Canvas */}
      <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Live Preview — {activePage}
          </p>
          <p className="text-xs text-muted-foreground">{pageBlocks.length} block{pageBlocks.length !== 1 ? "s" : ""} • Drag to reorder</p>
        </div>

        {pageBlocks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card py-16">
            <Plus className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-display text-sm uppercase text-muted-foreground">No blocks on this page</p>
            <p className="mt-1 text-xs text-muted-foreground">Use the toolbar above to add content</p>
          </div>
        )}

        <div className="space-y-2">
          {pageBlocks.map((b, index) => (
            <div
              key={b.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => setSelectedBlockId(b.id === selectedBlockId ? null : b.id)}
              className={`group relative cursor-pointer rounded-lg border-2 transition-all ${
                dragOverIndex === index ? "border-primary bg-primary/5" :
                selectedBlockId === b.id ? "border-primary ring-2 ring-primary/20" :
                "border-transparent hover:border-border"
              } ${!b.is_active ? "opacity-40" : ""}`}
            >
              {/* Block overlay controls */}
              <div className={`absolute -top-3 left-3 z-10 flex items-center gap-1 rounded-md bg-sidebar px-2 py-1 shadow-md transition-opacity ${
                selectedBlockId === b.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}>
                <GripVertical className="h-3.5 w-3.5 cursor-grab text-sidebar-foreground" />
                <Badge variant="outline" className="border-sidebar-border bg-sidebar-accent font-display text-[10px] uppercase text-sidebar-foreground">{b.block_type}</Badge>
                <span className="text-[10px] text-sidebar-foreground opacity-70">{b.title || "Untitled"}</span>
                <div className="ml-2 flex gap-0.5">
                  <button onClick={(e) => { e.stopPropagation(); moveBlock(index, "up"); }} disabled={index === 0}
                    className="rounded p-0.5 text-sidebar-foreground hover:text-sidebar-primary disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); moveBlock(index, "down"); }} disabled={index === pageBlocks.length - 1}
                    className="rounded p-0.5 text-sidebar-foreground hover:text-sidebar-primary disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); toggleActive(b.id, !b.is_active); }}
                    className="rounded p-0.5 text-sidebar-foreground hover:text-sidebar-primary">{b.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</button>
                  <button onClick={(e) => { e.stopPropagation(); editBlock(b); }}
                    className="rounded p-0.5 text-sidebar-foreground hover:text-sidebar-primary"><Pencil className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); duplicateBlock(b); }}
                    className="rounded p-0.5 text-sidebar-foreground hover:text-sidebar-primary"><Plus className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteBlock(b.id); }}
                    className="rounded p-0.5 text-sidebar-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>

              {/* Live preview */}
              <div className="pointer-events-none pt-1">
                {renderBlockPreview(b)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Block Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setForm(emptyBlock); setEditingId(null); } }}>
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
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active
              </label>
            </div>
            <Button onClick={handleSubmit} disabled={uploading} className="w-full font-display uppercase tracking-wider">
              {uploading ? "Uploading..." : editingId ? "Update Block" : "Create Block"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminContent;
