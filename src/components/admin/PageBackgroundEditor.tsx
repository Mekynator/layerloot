import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type PageBackgroundSettings = {
  enabled: boolean;
  images: string[];
  opacity: number;
  blur: number;
  intervalMs: number;
};

const DEFAULT_SETTINGS: PageBackgroundSettings = {
  enabled: false,
  images: [],
  opacity: 0.22,
  blur: 10,
  intervalMs: 2000,
};

function normalizeSettings(value: any): PageBackgroundSettings {
  return {
    enabled: Boolean(value?.enabled),
    images: Array.isArray(value?.images) ? value.images.filter(Boolean) : [],
    opacity: typeof value?.opacity === "number" ? value.opacity : DEFAULT_SETTINGS.opacity,
    blur: typeof value?.blur === "number" ? value.blur : DEFAULT_SETTINGS.blur,
    intervalMs:
      typeof value?.intervalMs === "number" && value.intervalMs > 0 ? value.intervalMs : DEFAULT_SETTINGS.intervalMs,
  };
}

interface PageBackgroundEditorProps {
  page: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PageBackgroundEditor({ page, open, onOpenChange }: PageBackgroundEditorProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<PageBackgroundSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const settingKey = useMemo(() => `page_background_${page}`, [page]);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setLoading(true);

    async function load() {
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", settingKey).maybeSingle();

      if (!isMounted) return;

      setLoading(false);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      setForm(normalizeSettings(data?.value));
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [open, settingKey, toast]);

  const update = <K extends keyof PageBackgroundSettings>(key: K, value: PageBackgroundSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    setForm((prev) => {
      const next = [...prev.images];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, images: next };
    });
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const urls: string[] = [];

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Not authenticated",
          description: "You must be logged in to upload background images.",
          variant: "destructive",
        });
        return;
      }

      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-");
        const path = `page-backgrounds/${page}/${Date.now()}-${safeName}.${ext}`;

        const { error: uploadError } = await supabase.storage.from("site-assets").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

        if (uploadError) {
          toast({
            title: "Upload failed",
            description: uploadError.message,
            variant: "destructive",
          });
          continue;
        }

        const { data: publicUrlData } = supabase.storage.from("site-assets").getPublicUrl(path);

        if (publicUrlData?.publicUrl) {
          urls.push(publicUrlData.publicUrl);
        }
      }

      if (urls.length > 0) {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, ...urls],
        }));

        toast({
          title: "Upload complete",
          description: `${urls.length} image${urls.length > 1 ? "s" : ""} uploaded successfully.`,
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);

    const payload = {
      key: settingKey,
      value: {
        enabled: form.enabled,
        images: form.images,
        opacity: Number(form.opacity),
        blur: Number(form.blur),
        intervalMs: Math.max(500, Number(form.intervalMs) || 2000),
      } as any,
    };

    const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "key" });

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Page background saved" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display uppercase">Edit Page Background · {page}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-sm text-muted-foreground">Loading settings...</div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Enable slideshow background</p>
                <p className="text-xs text-muted-foreground">Show this page’s image slideshow behind the content</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(checked) => update("enabled", checked)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Opacity</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={form.opacity}
                  onChange={(e) => update("opacity", Math.min(1, Math.max(0, Number(e.target.value) || 0)))}
                />
              </div>

              <div>
                <Label>Blur (px)</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  value={form.blur}
                  onChange={(e) => update("blur", Math.min(30, Math.max(0, Number(e.target.value) || 0)))}
                />
              </div>

              <div>
                <Label>Timer (ms)</Label>
                <Input
                  type="number"
                  min="500"
                  step="100"
                  value={form.intervalMs}
                  onChange={(e) => update("intervalMs", Math.max(500, Number(e.target.value) || 2000))}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Background images</p>
                  <p className="text-xs text-muted-foreground">Upload, remove, and reorder slideshow images</p>
                </div>

                <Label
                  htmlFor="page-background-upload"
                  className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload"}
                </Label>
              </div>

              <Input
                id="page-background-upload"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => uploadFiles(e.target.files)}
              />

              {form.images.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No images added yet
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {form.images.map((src, index) => (
                    <div key={`${src}-${index}`} className="rounded-lg border border-border p-3">
                      <img src={src} alt={`Background ${index + 1}`} className="h-36 w-full rounded-md object-cover" />

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground">Slide {index + 1}</div>

                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => moveImage(index, "up")}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => moveImage(index, "down")}
                            disabled={index === form.images.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>

                          <Button type="button" variant="destructive" size="icon" onClick={() => removeImage(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Input
                        className="mt-2 text-xs"
                        value={src}
                        onChange={(e) => {
                          const next = [...form.images];
                          next[index] = e.target.value;
                          update("images", next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border p-4">
              <p className="mb-2 text-sm font-medium">Live preview values</p>
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                <div>Enabled: {form.enabled ? "Yes" : "No"}</div>
                <div>Images: {form.images.length}</div>
                <div>Opacity: {form.opacity}</div>
                <div>Blur: {form.blur}px</div>
              </div>
            </div>

            <Button
              onClick={save}
              disabled={saving || uploading}
              className="w-full font-display uppercase tracking-wider"
            >
              {saving ? "Saving..." : uploading ? "Uploading..." : "Save Background Settings"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
