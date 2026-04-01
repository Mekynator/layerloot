import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2, Play, Pause } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type BackgroundSizeMode = "cover" | "contain" | "fill" | "repeat" | "auto";

export type PageBackgroundSettings = {
  enabled: boolean;
  images: string[];
  opacity: number;
  blur: number;
  intervalMs: number;
  sizeMode: BackgroundSizeMode;
  position: string;
  overlayOpacity: number;
};

const SETTING_KEY = "page_background_global";

const DEFAULT_SETTINGS: PageBackgroundSettings = {
  enabled: false,
  images: [],
  opacity: 0.22,
  blur: 10,
  intervalMs: 6000,
  sizeMode: "cover",
  position: "center",
  overlayOpacity: 0.15,
};

export function normalizeSettings(value: any): PageBackgroundSettings {
  return {
    enabled: Boolean(value?.enabled),
    images: Array.isArray(value?.images) ? value.images.filter(Boolean) : [],
    opacity: typeof value?.opacity === "number" ? value.opacity : DEFAULT_SETTINGS.opacity,
    blur: typeof value?.blur === "number" ? value.blur : DEFAULT_SETTINGS.blur,
    intervalMs:
      typeof value?.intervalMs === "number" && value.intervalMs >= 1000
        ? value.intervalMs
        : DEFAULT_SETTINGS.intervalMs,
    sizeMode: ["cover", "contain", "fill", "repeat", "auto"].includes(value?.sizeMode)
      ? value.sizeMode
      : DEFAULT_SETTINGS.sizeMode,
    position: typeof value?.position === "string" && value.position
      ? value.position
      : DEFAULT_SETTINGS.position,
    overlayOpacity:
      typeof value?.overlayOpacity === "number" ? value.overlayOpacity : DEFAULT_SETTINGS.overlayOpacity,
  };
}

const SIZE_MODE_OPTIONS: { value: BackgroundSizeMode; label: string; desc: string }[] = [
  { value: "cover", label: "Cover", desc: "Fill entire area, crop edges" },
  { value: "contain", label: "Fit", desc: "Show full image, may show gaps" },
  { value: "fill", label: "Stretch", desc: "Stretch to fill, may distort" },
  { value: "repeat", label: "Tile", desc: "Repeat the image as tiles" },
  { value: "auto", label: "Original", desc: "Use natural image size" },
];

const POSITION_OPTIONS = [
  "center", "top", "bottom", "left", "right",
  "top left", "top right", "bottom left", "bottom right",
];

function formatInterval(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  return s === Math.floor(s) ? `${s}s` : `${s.toFixed(1)}s`;
}

interface PageBackgroundEditorProps {
  page: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PageBackgroundEditor({
  page,
  open,
  onOpenChange,
}: PageBackgroundEditorProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<PageBackgroundSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Live preview cycling
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const previewTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    setLoading(true);

    async function load() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .maybeSingle();

      if (!isMounted) return;
      setLoading(false);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      setForm(normalizeSettings(data?.value));
      setPreviewIndex(0);
    }

    load();
    return () => { isMounted = false; };
  }, [open, toast]);

  // Preview auto-cycle
  useEffect(() => {
    if (previewTimerRef.current) window.clearInterval(previewTimerRef.current);
    if (!previewPlaying || form.images.length <= 1) return;

    previewTimerRef.current = window.setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % form.images.length);
    }, Math.max(1000, form.intervalMs));

    return () => {
      if (previewTimerRef.current) window.clearInterval(previewTimerRef.current);
    };
  }, [previewPlaying, form.intervalMs, form.images.length]);

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
    setPreviewIndex(0);
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const urls: string[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `page-backgrounds/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        continue;
      }
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      urls.push(data.publicUrl);
    }

    setUploading(false);
    if (urls.length > 0) {
      setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
    }
  };

  const save = async () => {
    setSaving(true);

    const payload = {
      key: SETTING_KEY,
      value: {
        enabled: form.enabled,
        images: form.images,
        opacity: form.opacity,
        blur: form.blur,
        intervalMs: Math.max(1000, form.intervalMs),
        sizeMode: form.sizeMode,
        position: form.position,
        overlayOpacity: form.overlayOpacity,
      } as any,
    };

    const { error } = await supabase
      .from("site_settings")
      .upsert(payload, { onConflict: "key" });

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Background saved — applies to all pages" });
    onOpenChange(false);
  };

  const sizeCSS = useMemo(() => {
    switch (form.sizeMode) {
      case "cover": return { backgroundSize: "cover", backgroundRepeat: "no-repeat" };
      case "contain": return { backgroundSize: "contain", backgroundRepeat: "no-repeat" };
      case "fill": return { backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" };
      case "repeat": return { backgroundSize: "auto", backgroundRepeat: "repeat" };
      case "auto": return { backgroundSize: "auto", backgroundRepeat: "no-repeat" };
      default: return { backgroundSize: "cover", backgroundRepeat: "no-repeat" };
    }
  }, [form.sizeMode]);

  const currentPreviewImage = form.images[previewIndex % Math.max(1, form.images.length)] || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wider">
            Page Background Settings
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            These settings apply to all pages globally, behind content only.
          </p>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading settings...</div>
        ) : (
          <div className="space-y-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border/30 bg-card/60 p-4 backdrop-blur-xl"
              style={{ boxShadow: '0 4px 20px -4px hsl(228 33% 2% / 0.3)' }}>
              <div>
                <p className="text-sm font-medium text-foreground">Enable background slideshow</p>
                <p className="text-xs text-muted-foreground">
                  Images cycle behind all page content (not header/footer/tiles)
                </p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(checked) => update("enabled", checked)} />
            </div>

            {/* Live Preview */}
            {form.images.length > 0 && (
              <div className="rounded-xl border border-border/30 bg-card/60 p-4 backdrop-blur-xl"
                style={{ boxShadow: '0 4px 20px -4px hsl(228 33% 2% / 0.3)' }}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Live Preview</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPreviewPlaying(!previewPlaying)}
                    >
                      {previewPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {previewIndex + 1}/{form.images.length} · {formatInterval(form.intervalMs)}
                    </span>
                  </div>
                </div>
                <div className="relative h-48 overflow-hidden rounded-lg border border-border/20 bg-background">
                  {/* Simulate actual page background */}
                  {form.images.map((src, index) => (
                    <div
                      key={`${src}-${index}`}
                      className="absolute inset-0 transition-opacity duration-1000"
                      style={{
                        opacity: index === (previewIndex % form.images.length) ? form.opacity : 0,
                        filter: `blur(${form.blur}px)`,
                        backgroundImage: `url("${src}")`,
                        backgroundPosition: form.position,
                        ...sizeCSS,
                      }}
                    />
                  ))}
                  {/* Dark overlay */}
                  <div className="absolute inset-0"
                    style={{ background: `linear-gradient(to bottom, rgba(0,0,0,${form.overlayOpacity}), rgba(0,0,0,${form.overlayOpacity + 0.05}))` }}
                  />
                  {/* Simulated content */}
                  <div className="relative flex h-full flex-col items-center justify-center text-center">
                    <div className="rounded-lg bg-card/70 px-6 py-3 text-sm font-medium text-foreground backdrop-blur-xl border border-border/30">
                      Content stays above the background
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex gap-1 justify-center">
                  {form.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setPreviewIndex(i); setPreviewPlaying(false); }}
                      className={`h-2 rounded-full transition-all ${i === (previewIndex % form.images.length) ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sliders */}
            <div className="rounded-xl border border-border/30 bg-card/60 p-4 space-y-5 backdrop-blur-xl"
              style={{ boxShadow: '0 4px 20px -4px hsl(228 33% 2% / 0.3)' }}>
              <p className="text-sm font-medium text-foreground">Visual Settings</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Opacity</Label>
                  <span className="text-xs font-mono text-muted-foreground">{Math.round(form.opacity * 100)}%</span>
                </div>
                <Slider
                  value={[form.opacity * 100]}
                  min={0} max={100} step={1}
                  onValueChange={([v]) => update("opacity", v / 100)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Blur</Label>
                  <span className="text-xs font-mono text-muted-foreground">{form.blur}px</span>
                </div>
                <Slider
                  value={[form.blur]}
                  min={0} max={40} step={1}
                  onValueChange={([v]) => update("blur", v)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Cycle Speed</Label>
                  <span className="text-xs font-mono text-muted-foreground">{formatInterval(form.intervalMs)}</span>
                </div>
                <Slider
                  value={[form.intervalMs / 1000]}
                  min={1} max={30} step={0.5}
                  onValueChange={([v]) => update("intervalMs", v * 1000)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Dark Overlay</Label>
                  <span className="text-xs font-mono text-muted-foreground">{Math.round(form.overlayOpacity * 100)}%</span>
                </div>
                <Slider
                  value={[form.overlayOpacity * 100]}
                  min={0} max={60} step={1}
                  onValueChange={([v]) => update("overlayOpacity", v / 100)}
                />
              </div>
            </div>

            {/* Size & Position */}
            <div className="rounded-xl border border-border/30 bg-card/60 p-4 space-y-4 backdrop-blur-xl"
              style={{ boxShadow: '0 4px 20px -4px hsl(228 33% 2% / 0.3)' }}>
              <p className="text-sm font-medium text-foreground">Size & Position</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Image Size Mode</Label>
                  <Select value={form.sizeMode} onValueChange={(v) => update("sizeMode", v as BackgroundSizeMode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SIZE_MODE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div>
                            <span className="font-medium">{opt.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">— {opt.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Position</Label>
                  <Select value={form.position} onValueChange={(v) => update("position", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POSITION_OPTIONS.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="rounded-xl border border-border/30 bg-card/60 p-4 backdrop-blur-xl"
              style={{ boxShadow: '0 4px 20px -4px hsl(228 33% 2% / 0.3)' }}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Background Images</p>
                  <p className="text-xs text-muted-foreground">
                    {form.images.length} image{form.images.length !== 1 ? "s" : ""} in rotation
                  </p>
                </div>

                <Label
                  htmlFor="page-background-upload"
                  className="inline-flex cursor-pointer items-center rounded-xl border border-border/40 bg-card/70 px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-card/90"
                >
                  <ImagePlus className="mr-2 h-4 w-4 text-primary" />
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
                <div className="rounded-xl border-2 border-dashed border-border/30 p-8 text-center text-sm text-muted-foreground">
                  No images added yet. Upload images to create a background slideshow.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {form.images.map((src, index) => (
                    <div key={`${src}-${index}`}
                      className={`group rounded-xl border p-2 transition-all ${
                        index === (previewIndex % form.images.length)
                          ? "border-primary/50 shadow-[0_0_16px_hsl(217_91%_60%/0.15)]"
                          : "border-border/30"
                      }`}
                      onClick={() => { setPreviewIndex(index); setPreviewPlaying(false); }}
                    >
                      <div className="relative overflow-hidden rounded-lg">
                        <img
                          src={src}
                          alt={`Background ${index + 1}`}
                          className="h-24 w-full cursor-pointer rounded-lg object-cover transition-transform group-hover:scale-105"
                        />
                        {index === (previewIndex % form.images.length) && (
                          <div className="absolute inset-0 rounded-lg ring-2 ring-primary/40 ring-inset" />
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Slide {index + 1}
                        </span>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); moveImage(index, "up"); }}
                            disabled={index === 0}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); moveImage(index, "down"); }}
                            disabled={index === form.images.length - 1}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); removeImage(index); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
