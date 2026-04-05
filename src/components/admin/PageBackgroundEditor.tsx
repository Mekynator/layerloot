import { useEffect, useMemo, useState, useRef } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2, Play, Pause, Monitor, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { saveDraftSetting } from "@/hooks/use-draft-publish";

export type BackgroundSizeMode = "cover" | "contain" | "fill" | "repeat" | "auto";
export type TransitionType = "fade" | "slide" | "zoom" | "crossfade" | "kenBurns";
export type MotionEffect = "none" | "slowZoom" | "kenBurns" | "drift";
export type BlendMode = "normal" | "multiply" | "screen" | "overlay";
export type AttachmentMode = "fixed" | "scroll";
export type PageOverrideMode = "inherit" | "custom" | "disabled";

export type PageBackgroundSettings = {
  enabled: boolean;
  images: string[];
  opacity: number;
  blur: number;
  intervalMs: number;
  sizeMode: BackgroundSizeMode;
  position: string;
  overlayOpacity: number;
  brightness: number;
  contrast: number;
  saturation: number;
  transitionType: TransitionType;
  transitionDurationMs: number;
  attachment: AttachmentMode;
  autoplay: boolean;
  loop: boolean;
  randomOrder: boolean;
  colorOverlay: string;
  colorOverlayOpacity: number;
  gradientStart: string;
  gradientEnd: string;
  gradientOpacity: number;
  blendMode: BlendMode;
  motionEffect: MotionEffect;
  motionSpeed: number;
};

export type PageBackgroundOverride = {
  mode: PageOverrideMode;
} & PageBackgroundSettings;

export const SETTING_KEY = "page_background_global";

export const DEFAULT_SETTINGS: PageBackgroundSettings = {
  enabled: false,
  images: [],
  opacity: 0.22,
  blur: 10,
  intervalMs: 6000,
  sizeMode: "cover",
  position: "center",
  overlayOpacity: 0.15,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  transitionType: "fade",
  transitionDurationMs: 1200,
  attachment: "fixed",
  autoplay: true,
  loop: true,
  randomOrder: false,
  colorOverlay: "",
  colorOverlayOpacity: 0,
  gradientStart: "",
  gradientEnd: "",
  gradientOpacity: 0,
  blendMode: "normal",
  motionEffect: "slowZoom",
  motionSpeed: 12,
};

const num = (v: unknown, fallback: number) => typeof v === "number" ? v : fallback;
const str = (v: unknown, fallback: string) => typeof v === "string" && v ? v : fallback;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSettings(value: any): PageBackgroundSettings {
  return {
    enabled: Boolean(value?.enabled),
    images: Array.isArray(value?.images) ? (value.images as string[]).filter(Boolean) : [],
    opacity: num(value?.opacity, DEFAULT_SETTINGS.opacity),
    blur: num(value?.blur, DEFAULT_SETTINGS.blur),
    intervalMs: num(value?.intervalMs, DEFAULT_SETTINGS.intervalMs) >= 1000
      ? num(value?.intervalMs, DEFAULT_SETTINGS.intervalMs) : DEFAULT_SETTINGS.intervalMs,
    sizeMode: ["cover", "contain", "fill", "repeat", "auto"].includes(value?.sizeMode as string)
      ? value?.sizeMode as BackgroundSizeMode : DEFAULT_SETTINGS.sizeMode,
    position: str(value?.position, DEFAULT_SETTINGS.position),
    overlayOpacity: num(value?.overlayOpacity, DEFAULT_SETTINGS.overlayOpacity),
    brightness: num(value?.brightness, DEFAULT_SETTINGS.brightness),
    contrast: num(value?.contrast, DEFAULT_SETTINGS.contrast),
    saturation: num(value?.saturation, DEFAULT_SETTINGS.saturation),
    transitionType: ["fade","slide","zoom","crossfade","kenBurns"].includes(value?.transitionType as string)
      ? value?.transitionType as TransitionType : DEFAULT_SETTINGS.transitionType,
    transitionDurationMs: num(value?.transitionDurationMs, DEFAULT_SETTINGS.transitionDurationMs),
    attachment: value?.attachment === "scroll" ? "scroll" : "fixed",
    autoplay: value?.autoplay === false ? false : true,
    loop: value?.loop === false ? false : true,
    randomOrder: Boolean(value?.randomOrder),
    colorOverlay: str(value?.colorOverlay, ""),
    colorOverlayOpacity: num(value?.colorOverlayOpacity, 0),
    gradientStart: str(value?.gradientStart, ""),
    gradientEnd: str(value?.gradientEnd, ""),
    gradientOpacity: num(value?.gradientOpacity, 0),
    blendMode: ["normal","multiply","screen","overlay"].includes(value?.blendMode as string)
      ? value?.blendMode as BlendMode : "normal",
    motionEffect: ["none","slowZoom","kenBurns","drift"].includes(value?.motionEffect as string)
      ? value?.motionEffect as MotionEffect : "slowZoom",
    motionSpeed: num(value?.motionSpeed, 12),
  };
}

export function pageKeyFromPath(pathname: string): string {
  const clean = pathname.replace(/^\//, "").split("/")[0] || "home";
  return clean;
}

const SIZE_MODE_OPTIONS: { value: BackgroundSizeMode; label: string; desc: string }[] = [
  { value: "cover", label: "Cover", desc: "Fill area, crop edges" },
  { value: "contain", label: "Fit", desc: "Show full image" },
  { value: "fill", label: "Stretch", desc: "Stretch to fill" },
  { value: "repeat", label: "Tile", desc: "Repeat as tiles" },
  { value: "auto", label: "Original", desc: "Natural size" },
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

const MOTION_KEYFRAMES: Record<MotionEffect, string> = {
  none: "",
  slowZoom: "bg-motion-slow-zoom",
  kenBurns: "bg-motion-ken-burns",
  drift: "bg-motion-drift",
};

interface PageBackgroundEditorProps {
  page: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ─── Sub-components ─── */

function SliderField({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-[10px] font-mono text-muted-foreground">{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function StickyPreview({ form, previewIndex, previewPlaying, setPreviewIndex, setPreviewPlaying, sizeCSS, previewMode }: {
  form: PageBackgroundSettings;
  previewIndex: number;
  previewPlaying: boolean;
  setPreviewIndex: (i: number) => void;
  setPreviewPlaying: (p: boolean) => void;
  sizeCSS: React.CSSProperties;
  previewMode: "desktop" | "mobile";
}) {
  const filterStr = `blur(${form.blur}px) brightness(${form.brightness}%) contrast(${form.contrast}%) saturate(${form.saturation}%)`;
  const motionClass = MOTION_KEYFRAMES[form.motionEffect] || "";
  const containerWidth = previewMode === "mobile" ? "max-w-[280px]" : "w-full";

  return (
    <div className="sticky top-0 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Live Preview</p>
        <div className="flex items-center gap-1.5">
          {form.images.length > 1 && (
            <Button variant="outline" size="icon" className="h-7 w-7"
              onClick={() => setPreviewPlaying(!previewPlaying)}>
              {previewPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
          )}
          <span className="text-[10px] font-medium text-muted-foreground">
            {form.images.length > 0 && `${previewIndex + 1}/${form.images.length}`}
          </span>
        </div>
      </div>

      {/* Preview container */}
      <div className={`relative mx-auto overflow-hidden rounded-xl border border-border/30 bg-background ${containerWidth}`}
        style={{ height: "min(60vh, 500px)", minHeight: 280 }}>
        {form.images.length > 0 ? (
          <>
            {/* Background images */}
            {form.images.map((src, index) => (
              <div key={`${src}-${index}`}
                className={`absolute inset-0 ${motionClass}`}
                style={{
                  opacity: index === (previewIndex % form.images.length) ? form.opacity : 0,
                  filter: filterStr,
                  backgroundImage: `url("${src}")`,
                  backgroundPosition: form.position,
                  mixBlendMode: form.blendMode as React.CSSProperties["mixBlendMode"],
                  transition: `opacity ${form.transitionDurationMs}ms ease-in-out`,
                  animationDuration: form.motionEffect !== "none" ? `${form.motionSpeed}s` : undefined,
                  ...sizeCSS,
                }}
              />
            ))}

            {/* Dark overlay */}
            {form.overlayOpacity > 0 && (
              <div className="absolute inset-0"
                style={{ background: `rgba(0,0,0,${form.overlayOpacity})` }} />
            )}

            {/* Color overlay */}
            {form.colorOverlay && form.colorOverlayOpacity > 0 && (
              <div className="absolute inset-0"
                style={{ background: form.colorOverlay, opacity: form.colorOverlayOpacity }} />
            )}

            {/* Gradient overlay */}
            {form.gradientStart && form.gradientEnd && form.gradientOpacity > 0 && (
              <div className="absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom, ${form.gradientStart}, ${form.gradientEnd})`,
                  opacity: form.gradientOpacity,
                }} />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No images added
          </div>
        )}

        {/* Simulated content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
          <div className="rounded-lg bg-card/80 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur-xl border border-border/30">
            Content Layer
          </div>
          <div className="rounded bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm border border-border/20">
            Background renders behind all content
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      {form.images.length > 1 && (
        <div className="flex gap-1 justify-center">
          {form.images.map((_, i) => (
            <button key={i}
              onClick={() => { setPreviewIndex(i); setPreviewPlaying(false); }}
              className={`h-1.5 rounded-full transition-all ${i === (previewIndex % form.images.length) ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
            />
          ))}
        </div>
      )}

      {/* Device toggle */}
      <div className="flex items-center justify-center gap-1 rounded-lg border border-border/20 bg-card/40 p-1">
        <span className="text-[10px] text-muted-foreground mr-1">Preview:</span>
        {/* buttons rendered by parent */}
      </div>
    </div>
  );
}

/* ─── Main component ─── */

export default function PageBackgroundEditor({ page, open, onOpenChange }: PageBackgroundEditorProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<PageBackgroundSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const previewTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("site_settings").select("value").eq("key", SETTING_KEY).maybeSingle();
      if (!mounted) return;
      setLoading(false);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setForm(normalizeSettings(data?.value as Record<string, unknown> | null));
      setPreviewIndex(0);
    })();
    return () => { mounted = false; };
  }, [open, toast]);

  useEffect(() => {
    if (previewTimerRef.current) window.clearInterval(previewTimerRef.current);
    if (!previewPlaying || form.images.length <= 1) return;
    previewTimerRef.current = window.setInterval(() => {
      setPreviewIndex(prev => (prev + 1) % form.images.length);
    }, Math.max(1000, form.intervalMs));
    return () => { if (previewTimerRef.current) window.clearInterval(previewTimerRef.current); };
  }, [previewPlaying, form.intervalMs, form.images.length]);

  const update = <K extends keyof PageBackgroundSettings>(key: K, value: PageBackgroundSettings[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const moveImage = (index: number, direction: "up" | "down") => {
    setForm(prev => {
      const next = [...prev.images];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, images: next };
    });
  };

  const removeImage = (index: number) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
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
      if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); continue; }
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setUploading(false);
    if (urls.length > 0) setForm(prev => ({ ...prev, images: [...prev.images, ...urls] }));
  };

  const save = async () => {
    setSaving(true);
    const ok = await saveDraftSetting(SETTING_KEY, { ...form, intervalMs: Math.max(1000, form.intervalMs) });
    setSaving(false);
    if (!ok) return;
    toast({ title: "Background draft saved — publish to make live" });
    onOpenChange(false);
  };

  const sizeCSS = useMemo((): React.CSSProperties => {
    switch (form.sizeMode) {
      case "cover": return { backgroundSize: "cover", backgroundRepeat: "no-repeat" };
      case "contain": return { backgroundSize: "contain", backgroundRepeat: "no-repeat" };
      case "fill": return { backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" };
      case "repeat": return { backgroundSize: "auto", backgroundRepeat: "repeat" };
      case "auto": return { backgroundSize: "auto", backgroundRepeat: "no-repeat" };
      default: return { backgroundSize: "cover", backgroundRepeat: "no-repeat" };
    }
  }, [form.sizeMode]);

  const filterStr = `blur(${form.blur}px) brightness(${form.brightness}%) contrast(${form.contrast}%) saturate(${form.saturation}%)`;
  const motionClass = MOTION_KEYFRAMES[form.motionEffect] || "";
  const previewContainerWidth = previewMode === "mobile" ? "max-w-[280px]" : "w-full";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-6xl p-0">
        <div className="flex flex-col h-[85vh]">
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/20 shrink-0">
            <DialogTitle className="font-display uppercase tracking-wider text-sm">
              Page Background Settings
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Global background — applies behind all page content.
            </p>
          </DialogHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="flex flex-1 min-h-0">
              {/* ── Left: Settings (scrollable) ── */}
              <div className="w-[55%] overflow-y-auto p-5 space-y-4 border-r border-border/20">
                {/* Enable toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border/30 bg-card/60 p-3.5 backdrop-blur-xl">
                  <div>
                    <p className="text-sm font-medium text-foreground">Enable slideshow</p>
                    <p className="text-[11px] text-muted-foreground">Images cycle behind all content</p>
                  </div>
                  <Switch checked={form.enabled} onCheckedChange={v => update("enabled", v)} />
                </div>

                {/* Images */}
                <div className="rounded-xl border border-border/30 bg-card/60 p-3.5 backdrop-blur-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Images</p>
                      <p className="text-[11px] text-muted-foreground">
                        {form.images.length} image{form.images.length !== 1 ? "s" : ""} in rotation
                      </p>
                    </div>
                    <Label htmlFor="page-background-upload"
                      className="inline-flex cursor-pointer items-center rounded-lg border border-border/40 bg-card/70 px-2.5 py-1.5 text-xs transition-colors hover:border-primary/30 hover:bg-card/90">
                      <ImagePlus className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      {uploading ? "Uploading…" : "Upload"}
                    </Label>
                  </div>
                  <Input id="page-background-upload" type="file" multiple accept="image/*" className="hidden"
                    onChange={e => uploadFiles(e.target.files)} />

                  {form.images.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-border/30 p-6 text-center text-xs text-muted-foreground">
                      Upload images to create a background slideshow.
                    </div>
                  ) : (
                    <div className="grid gap-2 grid-cols-3">
                      {form.images.map((src, index) => (
                        <div key={`${src}-${index}`}
                          className={`group rounded-lg border p-1.5 transition-all cursor-pointer ${
                            index === (previewIndex % form.images.length)
                              ? "border-primary/50 shadow-[0_0_12px_hsl(217_91%_60%/0.12)]" : "border-border/30"
                          }`}
                          onClick={() => { setPreviewIndex(index); setPreviewPlaying(false); }}>
                          <img src={src} alt={`Slide ${index + 1}`}
                            className="h-16 w-full rounded object-cover transition-transform group-hover:scale-105" />
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-[9px] font-medium text-muted-foreground">#{index + 1}</span>
                            <div className="flex gap-0.5">
                              <Button variant="ghost" size="icon" className="h-5 w-5"
                                onClick={e => { e.stopPropagation(); moveImage(index, "up"); }} disabled={index === 0}>
                                <ArrowUp className="h-2.5 w-2.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5"
                                onClick={e => { e.stopPropagation(); moveImage(index, "down"); }}
                                disabled={index === form.images.length - 1}>
                                <ArrowDown className="h-2.5 w-2.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive"
                                onClick={e => { e.stopPropagation(); removeImage(index); }}>
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Visual Settings */}
                <div className="rounded-xl border border-border/30 bg-card/60 p-3.5 space-y-3 backdrop-blur-xl">
                  <p className="text-sm font-medium text-foreground">Visual</p>
                  <SliderField label="Opacity" value={form.opacity * 100} min={0} max={100} step={1}
                    unit={`${Math.round(form.opacity * 100)}%`} onChange={v => update("opacity", v / 100)} />
                  <SliderField label="Blur" value={form.blur} min={0} max={40} step={1}
                    unit={`${form.blur}px`} onChange={v => update("blur", v)} />
                  <SliderField label="Brightness" value={form.brightness} min={20} max={200} step={1}
                    unit={`${form.brightness}%`} onChange={v => update("brightness", v)} />
                  <SliderField label="Contrast" value={form.contrast} min={20} max={200} step={1}
                    unit={`${form.contrast}%`} onChange={v => update("contrast", v)} />
                  <SliderField label="Saturation" value={form.saturation} min={0} max={200} step={1}
                    unit={`${form.saturation}%`} onChange={v => update("saturation", v)} />
                  <SliderField label="Dark Overlay" value={form.overlayOpacity * 100} min={0} max={80} step={1}
                    unit={`${Math.round(form.overlayOpacity * 100)}%`} onChange={v => update("overlayOpacity", v / 100)} />
                </div>

                {/* Slideshow */}
                <div className="rounded-xl border border-border/30 bg-card/60 p-3.5 space-y-3 backdrop-blur-xl">
                  <p className="text-sm font-medium text-foreground">Slideshow</p>
                  <SliderField label="Cycle Speed" value={form.intervalMs / 1000} min={1} max={30} step={0.5}
                    unit={formatInterval(form.intervalMs)} onChange={v => update("intervalMs", v * 1000)} />
                  <SliderField label="Transition Duration" value={form.transitionDurationMs / 1000} min={0.2} max={5} step={0.1}
                    unit={`${(form.transitionDurationMs / 1000).toFixed(1)}s`} onChange={v => update("transitionDurationMs", v * 1000)} />

                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Transition</Label>
                      <Select value={form.transitionType} onValueChange={v => update("transitionType", v as TransitionType)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["fade","slide","zoom","crossfade","kenBurns"] as TransitionType[]).map(t => (
                            <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Motion Effect</Label>
                      <Select value={form.motionEffect} onValueChange={v => update("motionEffect", v as MotionEffect)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="slowZoom">Slow Zoom</SelectItem>
                          <SelectItem value="kenBurns">Ken Burns</SelectItem>
                          <SelectItem value="drift">Drift</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {form.motionEffect !== "none" && (
                    <SliderField label="Motion Speed" value={form.motionSpeed} min={4} max={40} step={1}
                      unit={`${form.motionSpeed}s`} onChange={v => update("motionSpeed", v)} />
                  )}

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={form.autoplay} onCheckedChange={v => update("autoplay", v)} className="scale-75" />
                      Autoplay
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={form.loop} onCheckedChange={v => update("loop", v)} className="scale-75" />
                      Loop
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={form.randomOrder} onCheckedChange={v => update("randomOrder", v)} className="scale-75" />
                      Shuffle
                    </label>
                  </div>
                </div>

                {/* Size & Position */}
                <div className="rounded-xl border border-border/30 bg-card/60 p-3.5 space-y-3 backdrop-blur-xl">
                  <p className="text-sm font-medium text-foreground">Size & Position</p>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Size Mode</Label>
                      <Select value={form.sizeMode} onValueChange={v => update("sizeMode", v as BackgroundSizeMode)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SIZE_MODE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label} — {opt.desc}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Position</Label>
                      <Select value={form.position} onValueChange={v => update("position", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {POSITION_OPTIONS.map(pos => (
                            <SelectItem key={pos} value={pos}>
                              {pos.charAt(0).toUpperCase() + pos.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Attachment</Label>
                      <Select value={form.attachment} onValueChange={v => update("attachment", v as AttachmentMode)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="scroll">Scroll</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Blend Mode</Label>
                      <Select value={form.blendMode} onValueChange={v => update("blendMode", v as BlendMode)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["normal","multiply","screen","overlay"] as BlendMode[]).map(b => (
                            <SelectItem key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Overlays */}
                <div className="rounded-xl border border-border/30 bg-card/60 p-3.5 space-y-3 backdrop-blur-xl">
                  <p className="text-sm font-medium text-foreground">Color & Gradient Overlays</p>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Color Overlay</Label>
                      <Input type="color" value={form.colorOverlay || "#000000"} className="h-8 w-full"
                        onChange={e => update("colorOverlay", e.target.value)} />
                    </div>
                    <SliderField label="Color Opacity" value={form.colorOverlayOpacity * 100} min={0} max={100} step={1}
                      unit={`${Math.round(form.colorOverlayOpacity * 100)}%`} onChange={v => update("colorOverlayOpacity", v / 100)} />
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Gradient Start</Label>
                      <Input type="color" value={form.gradientStart || "#000000"} className="h-8 w-full"
                        onChange={e => update("gradientStart", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Gradient End</Label>
                      <Input type="color" value={form.gradientEnd || "#000000"} className="h-8 w-full"
                        onChange={e => update("gradientEnd", e.target.value)} />
                    </div>
                  </div>
                  <SliderField label="Gradient Opacity" value={form.gradientOpacity * 100} min={0} max={100} step={1}
                    unit={`${Math.round(form.gradientOpacity * 100)}%`} onChange={v => update("gradientOpacity", v / 100)} />
                </div>

                {/* Save */}
                <Button onClick={save} disabled={saving || uploading}
                  className="w-full font-display uppercase tracking-wider">
                  {saving ? "Saving…" : uploading ? "Uploading…" : "Save Background Settings"}
                </Button>
              </div>

              {/* ── Right: Sticky Preview ── */}
              <div className="w-[45%] p-5 flex flex-col">
                <div className="sticky top-0 flex flex-col gap-3">
                  {/* Preview header */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Live Preview</p>
                    <div className="flex items-center gap-1.5">
                      {form.images.length > 1 && (
                        <>
                          <Button variant="outline" size="icon" className="h-7 w-7"
                            onClick={() => setPreviewPlaying(!previewPlaying)}>
                            {previewPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          </Button>
                          <span className="text-[10px] text-muted-foreground">
                            {previewIndex + 1}/{form.images.length} · {formatInterval(form.intervalMs)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Device toggle */}
                  <div className="flex items-center gap-1 rounded-lg border border-border/20 bg-card/40 p-0.5 self-center">
                    <Button variant={previewMode === "desktop" ? "secondary" : "ghost"} size="sm"
                      className="h-7 gap-1.5 text-xs px-2.5"
                      onClick={() => setPreviewMode("desktop")}>
                      <Monitor className="h-3 w-3" /> Desktop
                    </Button>
                    <Button variant={previewMode === "mobile" ? "secondary" : "ghost"} size="sm"
                      className="h-7 gap-1.5 text-xs px-2.5"
                      onClick={() => setPreviewMode("mobile")}>
                      <Smartphone className="h-3 w-3" /> Mobile
                    </Button>
                  </div>

                  {/* Preview area */}
                  <div className={`relative mx-auto overflow-hidden rounded-xl border border-border/30 bg-background transition-all duration-300 ${previewContainerWidth}`}
                    style={{ height: "min(58vh, 480px)", minHeight: 260, width: previewMode === "mobile" ? 280 : "100%" }}>
                    {form.images.length > 0 ? (
                      <>
                        {form.images.map((src, index) => (
                          <div key={`${src}-${index}`}
                            className={`absolute inset-0 ${motionClass}`}
                            style={{
                              opacity: index === (previewIndex % form.images.length) ? form.opacity : 0,
                              filter: filterStr,
                              backgroundImage: `url("${src}")`,
                              backgroundPosition: form.position,
                              mixBlendMode: form.blendMode as React.CSSProperties["mixBlendMode"],
                              transition: `opacity ${form.transitionDurationMs}ms ease-in-out`,
                              animationDuration: form.motionEffect !== "none" ? `${form.motionSpeed}s` : undefined,
                              ...sizeCSS,
                            }}
                          />
                        ))}

                        {form.overlayOpacity > 0 && (
                          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${form.overlayOpacity})` }} />
                        )}

                        {form.colorOverlay && form.colorOverlayOpacity > 0 && (
                          <div className="absolute inset-0" style={{ background: form.colorOverlay, opacity: form.colorOverlayOpacity }} />
                        )}

                        {form.gradientStart && form.gradientEnd && form.gradientOpacity > 0 && (
                          <div className="absolute inset-0"
                            style={{
                              background: `linear-gradient(to bottom, ${form.gradientStart}, ${form.gradientEnd})`,
                              opacity: form.gradientOpacity,
                            }} />
                        )}
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Upload images to preview
                      </div>
                    )}

                    {/* Simulated content */}
                    <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2.5 p-4 text-center">
                      <div className="rounded-lg bg-card/80 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur-xl border border-border/30 shadow-sm">
                        Content Layer
                      </div>
                      <div className="rounded bg-card/60 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-sm border border-border/20">
                        Background renders behind all content
                      </div>
                    </div>
                  </div>

                  {/* Slide dots */}
                  {form.images.length > 1 && (
                    <div className="flex gap-1 justify-center">
                      {form.images.map((_, i) => (
                        <button key={i}
                          onClick={() => { setPreviewIndex(i); setPreviewPlaying(false); }}
                          className={`h-1.5 rounded-full transition-all ${i === (previewIndex % form.images.length) ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
