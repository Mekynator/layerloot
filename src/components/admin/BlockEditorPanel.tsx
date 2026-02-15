import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SiteBlock } from "./BlockRenderer";

interface BlockEditorPanelProps {
  block: SiteBlock | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  pages: string[];
}

const BlockEditorPanel = ({ block, open, onClose, onSave, pages }: BlockEditorPanelProps) => {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Sync form when block changes
  const prevBlockId = useState<string | null>(null);
  if (block && block.id !== prevBlockId[0]) {
    prevBlockId[1](block.id);
    setForm({
      title: block.title ?? "",
      page: block.page ?? "home",
      block_type: block.block_type,
      is_active: block.is_active ?? true,
      content: { ...(block.content || {}) },
    });
  }

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

  const handleCarouselUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadFile(file);
      if (url) urls.push(url);
    }
    setForm({ ...form, content: { ...form.content, images: [...(form.content.images || []), ...urls] } });
  };

  const handleSave = async () => {
    if (!block) return;
    setSaving(true);
    const { error } = await supabase.from("site_blocks").update({
      title: form.title || null,
      page: form.page,
      is_active: form.is_active,
      content: form.content,
    }).eq("id", block.id);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Block saved" });
    onSave();
  };

  const updateContent = (key: string, value: any) => {
    setForm({ ...form, content: { ...form.content, [key]: value } });
  };

  const t = form.block_type;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display uppercase">Edit Block</SheetTitle>
        </SheetHeader>

        {block && (
          <div className="mt-6 space-y-4">
            <div>
              <Label>Internal Title</Label>
              <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Page</Label>
                <Select value={form.page} onValueChange={(v) => setForm({ ...form, page: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pages.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active
                </label>
              </div>
            </div>

            <hr className="border-border" />

            {/* Content fields by type */}
            {(t === "hero" || t === "banner" || t === "cta") && (
              <div className="space-y-3">
                <div><Label>Heading</Label><Input value={form.content.heading ?? ""} onChange={(e) => updateContent("heading", e.target.value)} /></div>
                <div><Label>Subheading</Label><Input value={form.content.subheading ?? ""} onChange={(e) => updateContent("subheading", e.target.value)} /></div>
                <div><Label>Button Text</Label><Input value={form.content.button_text ?? ""} onChange={(e) => updateContent("button_text", e.target.value)} /></div>
                <div>
                  <Label>Button Link</Label>
                  <Select value={form.content.button_link || ""} onValueChange={(v) => updateContent("button_link", v)}>
                    <SelectTrigger><SelectValue placeholder="Select page or type URL" /></SelectTrigger>
                    <SelectContent>
                      {pages.map((p) => <SelectItem key={p} value={`/${p === "home" ? "" : p}`} className="capitalize">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="mt-1" placeholder="Or custom URL..." value={form.content.button_link ?? ""} onChange={(e) => updateContent("button_link", e.target.value)} />
                </div>
                {t === "hero" && (
                  <div>
                    <Label>Background Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "bg_image")} />
                    {form.content.bg_image && <img src={form.content.bg_image} alt="" className="mt-2 h-20 rounded object-cover" />}
                  </div>
                )}
              </div>
            )}
            {t === "text" && (
              <div className="space-y-3">
                <div><Label>Heading</Label><Input value={form.content.heading ?? ""} onChange={(e) => updateContent("heading", e.target.value)} /></div>
                <div><Label>Body</Label><Textarea value={form.content.body ?? ""} onChange={(e) => updateContent("body", e.target.value)} rows={6} /></div>
              </div>
            )}
            {t === "image" && (
              <div className="space-y-3">
                <div>
                  <Label>Image</Label>
                  <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "image_url")} />
                  {form.content.image_url && <img src={form.content.image_url} alt="" className="mt-2 h-32 rounded object-cover" />}
                </div>
                <div><Label>Alt Text</Label><Input value={form.content.alt ?? ""} onChange={(e) => updateContent("alt", e.target.value)} /></div>
              </div>
            )}
            {t === "carousel" && (
              <div className="space-y-3">
                <Label>Carousel Images</Label>
                <Input type="file" accept="image/*" multiple onChange={handleCarouselUpload} />
                <div className="flex flex-wrap gap-2">
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
              <div className="space-y-3">
                <div><Label>Video URL (YouTube/Vimeo/MP4)</Label><Input value={form.content.video_url ?? ""} onChange={(e) => updateContent("video_url", e.target.value)} /></div>
                <div>
                  <Label>Or Upload Video</Label>
                  <Input type="file" accept="video/*" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const url = await uploadFile(file);
                    if (url) setForm({ ...form, content: { ...form.content, video_url: url, video_type: "upload" } });
                  }} />
                </div>
                <div><Label>Caption</Label><Input value={form.content.caption ?? ""} onChange={(e) => updateContent("caption", e.target.value)} /></div>
              </div>
            )}
            {t === "button" && (
              <div className="space-y-3">
                <div><Label>Button Text</Label><Input value={form.content.button_text ?? ""} onChange={(e) => updateContent("button_text", e.target.value)} /></div>
                <div>
                  <Label>Button Link</Label>
                  <Select value={form.content.button_link || ""} onValueChange={(v) => updateContent("button_link", v)}>
                    <SelectTrigger><SelectValue placeholder="Select page" /></SelectTrigger>
                    <SelectContent>
                      {pages.map((p) => <SelectItem key={p} value={`/${p === "home" ? "" : p}`} className="capitalize">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="mt-1" placeholder="Or custom URL..." value={form.content.button_link ?? ""} onChange={(e) => updateContent("button_link", e.target.value)} />
                </div>
                <div>
                  <Label>Style</Label>
                  <Select value={form.content.style ?? "primary"} onValueChange={(v) => updateContent("style", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="ghost">Ghost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {t === "spacer" && (
              <div><Label>Height (px)</Label><Input type="number" value={form.content.height ?? 40} onChange={(e) => updateContent("height", parseInt(e.target.value) || 40)} /></div>
            )}
            {t === "html" && (
              <div><Label>HTML Code</Label><Textarea value={form.content.html ?? ""} onChange={(e) => updateContent("html", e.target.value)} rows={8} className="font-mono text-xs" /></div>
            )}
            {t === "embed" && (
              <div className="space-y-3">
                <div><Label>Heading (optional)</Label><Input value={form.content.heading ?? ""} onChange={(e) => updateContent("heading", e.target.value)} /></div>
                <div><Label>Embed URL</Label><Input value={form.content.embed_url ?? ""} onChange={(e) => updateContent("embed_url", e.target.value)} placeholder="https://..." /></div>
                <div><Label>Height (px)</Label><Input type="number" value={form.content.height ?? 400} onChange={(e) => updateContent("height", parseInt(e.target.value) || 400)} /></div>
              </div>
            )}
            {t === "newsletter" && (
              <div className="space-y-3">
                <div><Label>Heading</Label><Input value={form.content.heading ?? ""} onChange={(e) => updateContent("heading", e.target.value)} placeholder="Stay Updated" /></div>
                <div><Label>Subheading</Label><Input value={form.content.subheading ?? ""} onChange={(e) => updateContent("subheading", e.target.value)} placeholder="Subscribe to our newsletter..." /></div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving || uploading} className="w-full font-display uppercase tracking-wider">
              {saving ? "Saving..." : uploading ? "Uploading..." : "Save Changes"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default BlockEditorPanel;
