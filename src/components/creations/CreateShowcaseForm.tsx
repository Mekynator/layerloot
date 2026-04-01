import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShowcaseMutations } from "@/hooks/use-showcases";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Loader2, FileBox, X as XIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "Fantasy & Gaming",
  "Home & Decor",
  "Functional Parts",
  "Art & Sculpture",
  "Gifts & Accessories",
  "Custom Lithophanes",
  "Other",
];

export default function CreateShowcaseForm({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const { create } = useShowcaseMutations();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [materials, setMaterials] = useState("");
  const [colors, setColors] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [tags, setTags] = useState("");
  const [shared, setShared] = useState(false);
  const [reorderEnabled, setReorderEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [modelUploading, setModelUploading] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelFilename, setModelFilename] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 5)) {
      const ext = file.name.split(".").pop();
      const path = `showcases/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("gallery-images").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("gallery-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setImageUrls((prev) => [...prev, ...urls]);
    setUploading(false);
  };

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setModelUploading(true);
    const ext = file.name.split(".").pop();
    const path = `showcases/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("custom-order-files").upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from("custom-order-files").getPublicUrl(path);
      setModelUrl(data.publicUrl);
      setModelFilename(file.name);
    } else {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
    setModelUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    await create.mutateAsync({
      owner_user_id: user!.id,
      title: title.trim(),
      slug: "",
      description: description.trim() || null,
      visibility_status: shared ? "shared" : "private",
      approved_by_admin: false,
      reorder_enabled: reorderEnabled,
      featured: false,
      thumbnail_url: imageUrls[0] ?? null,
      preview_image_urls: imageUrls,
      finished_image_urls: [],
      source_model_url: modelUrl,
      source_model_filename: modelFilename,
      quoted_price: null,
      final_price: null,
      currency: "DKK",
      materials: materials || null,
      colors: colors || null,
      dimensions: dimensions || null,
      size_notes: null,
      production_settings_json: {},
      admin_notes_for_reproduction: null,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      category: category || null,
      custom_order_id: null,
    });
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My awesome creation" />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell the story behind your creation..." rows={4} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Materials</Label>
          <Input value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="PLA, PETG..." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Colors</Label>
          <Input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Black, Red..." />
        </div>
        <div className="space-y-2">
          <Label>Dimensions</Label>
          <Input value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="10×5×8 cm" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tags (comma-separated)</Label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="miniature, fantasy, gift" />
      </div>

      {/* images */}
      <div className="space-y-2">
        <Label>Images (up to 5)</Label>
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url, i) => (
            <img key={i} src={url} alt="" className="h-20 w-20 rounded-lg object-cover border" />
          ))}
          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* 3D model */}
      <div className="space-y-2">
        <Label>3D Model File (optional — STL, OBJ, 3MF)</Label>
        {modelUrl ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <FileBox className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm truncate flex-1">{modelFilename}</span>
            <button type="button" onClick={() => { setModelUrl(null); setModelFilename(null); }} className="text-muted-foreground hover:text-destructive">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors px-4 py-3">
            {modelUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBox className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm text-muted-foreground">{modelUploading ? "Uploading..." : "Click to upload model file"}</span>
            <input type="file" accept=".stl,.obj,.3mf,.step,.stp" className="hidden" onChange={handleModelUpload} disabled={modelUploading} />
          </label>
        )}
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={shared} onCheckedChange={setShared} />
          <Label className="cursor-pointer">Share with community</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={reorderEnabled} onCheckedChange={setReorderEnabled} />
          <Label className="cursor-pointer">Allow reorders</Label>
        </div>
      </div>

      {shared && (
        <p className="text-xs text-muted-foreground">
          Shared creations need admin approval before appearing in the community gallery.
        </p>
      )}

      <Button type="submit" disabled={create.isPending} className="w-full sm:w-auto">
        {create.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Creation
      </Button>
    </form>
  );
}
