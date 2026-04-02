import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2, Play, Pause, Copy, RotateCcw, Save, Upload, CheckCircle2, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  type PageBackgroundSettings, type PageBackgroundOverride, type PageOverrideMode,
  type BackgroundSizeMode, type TransitionType, type MotionEffect, type BlendMode, type AttachmentMode,
  normalizeSettings, DEFAULT_SETTINGS, SETTING_KEY, pageKeyFromPath,
} from "@/components/admin/PageBackgroundEditor";
import { Badge } from "@/components/ui/badge";
import {
  saveDraftSetting, loadDraftSetting, discardDraftSetting, publishDraftSetting,
  type DraftStatus,
} from "@/hooks/use-draft-publish";

const PAGES = [
  { key: "__global__", label: "Global (All Pages)" },
  { key: "home", label: "Home" },
  { key: "products", label: "Products" },
  { key: "about", label: "About" },
  { key: "contact", label: "Contact" },
  { key: "gallery", label: "Gallery" },
  { key: "create", label: "Create Your Own" },
  { key: "submit-design", label: "Submit Design" },
  { key: "creations", label: "Creations" },
  { key: "account", label: "Account" },
  { key: "cart", label: "Cart" },
  { key: "policies", label: "Policies" },
  { key: "auth", label: "Auth" },
];

const SIZE_MODE_OPTIONS: { value: BackgroundSizeMode; label: string }[] = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Fit" },
  { value: "fill", label: "Stretch" },
  { value: "repeat", label: "Tile" },
  { value: "auto", label: "Original" },
];

const POSITION_OPTIONS = [
  "center", "top", "bottom", "left", "right",
  "top left", "top right", "bottom left", "bottom right",
];

const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
  { value: "crossfade", label: "Crossfade" },
  { value: "kenBurns", label: "Ken Burns" },
];

const MOTION_OPTIONS: { value: MotionEffect; label: string }[] = [
  { value: "none", label: "None" },
  { value: "slowZoom", label: "Slow Zoom" },
  { value: "kenBurns", label: "Ken Burns" },
  { value: "drift", label: "Drift" },
];

const BLEND_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
];

function settingKeyForPage(pageKey: string) {
  return pageKey === "__global__" ? SETTING_KEY : `page_background_override_${pageKey}`;
}

function formatInterval(ms: number) {
  const s = ms / 1000;
  return s === Math.floor(s) ? `${s}s` : `${s.toFixed(1)}s`;
}

const CARD = "rounded-xl border border-border/30 bg-card/60 p-4 backdrop-blur-xl";
const CARD_SHADOW = { boxShadow: "0 4px 20px -4px hsl(228 33% 2% / 0.3)" };

export default function AdminBackgrounds() {
  const { toast } = useToast();
  const [selectedPage, setSelectedPage] = useState("__global__");
  const [form, setForm] = useState<PageBackgroundSettings>(DEFAULT_SETTINGS);
  const [overrideMode, setOverrideMode] = useState<PageOverrideMode>("inherit");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishingBg, setPublishingBg] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const previewTimerRef = useRef<number | null>(null);
  const [bgDraftStatus, setBgDraftStatus] = useState<DraftStatus>("published");

  const isGlobal = selectedPage === "__global__";

  // Load settings for selected page (check draft first, then live)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const key = settingKeyForPage(selectedPage);

    (async () => {
      const result = await loadDraftSetting(key);
      if (cancelled) return;

      if (result && result.hasDraft) {
        // Load from draft
        setBgDraftStatus("draft");
        const draftVal = result.draft;
        if (isGlobal) {
          setForm(normalizeSettings(draftVal));
          setOverrideMode("custom");
        } else {
          const mode: PageOverrideMode = draftVal?.mode || "inherit";
          setOverrideMode(mode);
          setForm(mode === "custom" ? normalizeSettings(draftVal) : DEFAULT_SETTINGS);
        }
      } else {
        // No draft, load live
        setBgDraftStatus("published");
        const liveVal = result?.live;
        if (isGlobal) {
          setForm(normalizeSettings(liveVal));
          setOverrideMode("custom");
        } else {
          const val = liveVal as any;
          const mode: PageOverrideMode = val?.mode || "inherit";
          setOverrideMode(mode);
          setForm(mode === "custom" ? normalizeSettings(val) : DEFAULT_SETTINGS);
        }
      }
      setPreviewIndex(0);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [selectedPage]);

  // Preview timer
  useEffect(() => {
    if (previewTimerRef.current) window.clearInterval(previewTimerRef.current);
    if (!previewPlaying || form.images.length <= 1) return;
    previewTimerRef.current = window.setInterval(
      () => setPreviewIndex(p => (p + 1) % form.images.length),
      Math.max(1000, form.intervalMs),
    );
    return () => { if (previewTimerRef.current) window.clearInterval(previewTimerRef.current); };
  }, [previewPlaying, form.intervalMs, form.images.length]);

  const update = <K extends keyof PageBackgroundSettings>(key: K, value: PageBackgroundSettings[K]) =>
    setForm(p => ({ ...p, [key]: value }));

  const moveImage = (index: number, dir: "up" | "down") => {
    setForm(p => {
      const next = [...p.images];
      const t = dir === "up" ? index - 1 : index + 1;
      if (t < 0 || t >= next.length) return p;
      [next[index], next[t]] = [next[t], next[index]];
      return { ...p, images: next };
    });
  };

  const removeImage = (index: number) => {
    setForm(p => ({ ...p, images: p.images.filter((_, i) => i !== index) }));
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
    if (urls.length > 0) setForm(p => ({ ...p, images: [...p.images, ...urls] }));
  };

  // Save as draft
  const save = async () => {
    setSaving(true);
    const key = settingKeyForPage(selectedPage);

    let draftValue: any;
    if (isGlobal) {
      draftValue = { ...form, intervalMs: Math.max(1000, form.intervalMs) };
    } else {
      draftValue = overrideMode === "custom"
        ? { mode: "custom", ...form, intervalMs: Math.max(1000, form.intervalMs) }
        : { mode: overrideMode };
    }

    const ok = await saveDraftSetting(key, draftValue);
    setSaving(false);
    if (!ok) return;
    setBgDraftStatus("draft");
    toast({ title: "Draft saved" });
  };

  // Publish draft to live
  const publishBg = async () => {
    setPublishingBg(true);
    const key = settingKeyForPage(selectedPage);

    let draftValue: any;
    if (isGlobal) {
      draftValue = { ...form, intervalMs: Math.max(1000, form.intervalMs) };
    } else {
      draftValue = overrideMode === "custom"
        ? { mode: "custom", ...form, intervalMs: Math.max(1000, form.intervalMs) }
        : { mode: overrideMode };
    }

    const ok = await publishDraftSetting(key, draftValue);
    setPublishingBg(false);
    if (!ok) return;
    setBgDraftStatus("published");
    toast({ title: "Background published" });
  };

  // Discard draft
  const discardBgDraft = async () => {
    const key = settingKeyForPage(selectedPage);
    await discardDraftSetting(key);
    // Reload live settings
    const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
    if (isGlobal) {
      setForm(normalizeSettings(data?.value));
    } else {
      const val = data?.value as any;
      const mode: PageOverrideMode = val?.mode || "inherit";
      setOverrideMode(mode);
      setForm(mode === "custom" ? normalizeSettings(val) : DEFAULT_SETTINGS);
    }
    setBgDraftStatus("published");
    toast({ title: "Draft discarded — reverted to published" });
  };

  const copyGlobalToPage = async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", SETTING_KEY).maybeSingle();
    if (data?.value) {
      setForm(normalizeSettings(data.value));
      setOverrideMode("custom");
      toast({ title: "Copied global settings" });
    }
  };

  const resetToInherit = () => {
    setOverrideMode("inherit");
    setForm(DEFAULT_SETTINGS);
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

  const showEditor = isGlobal || overrideMode === "custom";
  const currentPreviewImage = form.images[previewIndex % Math.max(1, form.images.length)] || "";

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-foreground">Website Backgrounds</h1>
          <p className="text-sm text-muted-foreground">Manage background images and effects globally or per page.</p>
        </div>

        {/* Page Selector */}
        <div className={CARD} style={CARD_SHADOW}>
          <Label className="text-xs mb-2 block">Select Page</Label>
          <Select value={selectedPage} onValueChange={setSelectedPage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGES.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Per-page mode */}
        {!isGlobal && (
          <div className={CARD} style={CARD_SHADOW}>
            <Label className="text-xs mb-2 block">Background Mode</Label>
            <div className="flex gap-2">
              {(["inherit", "custom", "disabled"] as PageOverrideMode[]).map(m => (
                <Button
                  key={m}
                  variant={overrideMode === m ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setOverrideMode(m); if (m !== "custom") setForm(DEFAULT_SETTINGS); }}
                  className="capitalize"
                >
                  {m === "inherit" ? "Inherit Global" : m}
                </Button>
              ))}
            </div>
            {!isGlobal && (
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={copyGlobalToPage} className="text-xs">
                  <Copy className="mr-1.5 h-3 w-3" /> Copy Global Here
                </Button>
                <Button variant="outline" size="sm" onClick={resetToInherit} className="text-xs">
                  <RotateCcw className="mr-1.5 h-3 w-3" /> Reset to Inherit
                </Button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : showEditor ? (
          <div className="space-y-5">
            {/* Enable */}
            <div className={`flex items-center justify-between ${CARD}`} style={CARD_SHADOW}>
              <div>
                <p className="text-sm font-medium">Enable background</p>
                <p className="text-xs text-muted-foreground">Images behind all page content</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={v => update("enabled", v)} />
            </div>

            {/* Live Preview */}
            {form.images.length > 0 && (
              <div className={CARD} style={CARD_SHADOW}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Live Preview</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => setPreviewPlaying(!previewPlaying)}>
                      {previewPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {previewIndex + 1}/{form.images.length} · {formatInterval(form.intervalMs)}
                    </span>
                  </div>
                </div>
                <div className="relative h-48 overflow-hidden rounded-lg border border-border/20 bg-background">
                  {form.images.map((src, index) => (
                    <div key={`${src}-${index}`}
                      className="absolute inset-0"
                      style={{
                        opacity: index === (previewIndex % form.images.length) ? form.opacity : 0,
                        transition: `opacity ${form.transitionDurationMs}ms ease-in-out`,
                        filter: `blur(${form.blur}px) brightness(${form.brightness}%) contrast(${form.contrast}%) saturate(${form.saturation}%)`,
                        backgroundImage: `url("${src}")`,
                        backgroundPosition: form.position,
                        ...sizeCSS,
                        mixBlendMode: form.blendMode as any,
                      }}
                    />
                  ))}
                  <div className="absolute inset-0"
                    style={{ background: `linear-gradient(to bottom, rgba(0,0,0,${form.overlayOpacity}), rgba(0,0,0,${form.overlayOpacity + 0.05}))` }}
                  />
                  {form.colorOverlay && form.colorOverlayOpacity > 0 && (
                    <div className="absolute inset-0" style={{ backgroundColor: form.colorOverlay, opacity: form.colorOverlayOpacity }} />
                  )}
                  {form.gradientStart && form.gradientEnd && form.gradientOpacity > 0 && (
                    <div className="absolute inset-0"
                      style={{ background: `linear-gradient(to bottom, ${form.gradientStart}, ${form.gradientEnd})`, opacity: form.gradientOpacity }}
                    />
                  )}
                  <div className="relative flex h-full flex-col items-center justify-center text-center">
                    <div className="rounded-lg bg-card/70 px-6 py-3 text-sm font-medium text-foreground backdrop-blur-xl border border-border/30">
                      Content stays above
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex gap-1 justify-center">
                  {form.images.map((_, i) => (
                    <button key={i}
                      onClick={() => { setPreviewIndex(i); setPreviewPlaying(false); }}
                      className={`h-2 rounded-full transition-all ${i === (previewIndex % form.images.length) ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Visual Settings */}
            <div className={`${CARD} space-y-5`} style={CARD_SHADOW}>
              <p className="text-sm font-medium">Visual Settings</p>
              <SliderRow label="Opacity" value={form.opacity * 100} max={100} suffix="%" onChange={v => update("opacity", v / 100)} />
              <SliderRow label="Blur" value={form.blur} max={40} suffix="px" onChange={v => update("blur", v)} />
              <SliderRow label="Brightness" value={form.brightness} min={0} max={200} suffix="%" onChange={v => update("brightness", v)} />
              <SliderRow label="Contrast" value={form.contrast} min={0} max={200} suffix="%" onChange={v => update("contrast", v)} />
              <SliderRow label="Saturation" value={form.saturation} min={0} max={200} suffix="%" onChange={v => update("saturation", v)} />
            </div>

            {/* Overlay */}
            <div className={`${CARD} space-y-5`} style={CARD_SHADOW}>
              <p className="text-sm font-medium">Overlays</p>
              <SliderRow label="Dark Overlay" value={form.overlayOpacity * 100} max={80} suffix="%" onChange={v => update("overlayOpacity", v / 100)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Color Overlay</Label>
                  <Input type="color" value={form.colorOverlay || "#000000"} onChange={e => update("colorOverlay", e.target.value)} className="h-8 w-16 p-0.5" />
                </div>
                <SliderRow label="Color Opacity" value={form.colorOverlayOpacity * 100} max={100} suffix="%" onChange={v => update("colorOverlayOpacity", v / 100)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Gradient Start</Label>
                  <Input type="color" value={form.gradientStart || "#000000"} onChange={e => update("gradientStart", e.target.value)} className="h-8 w-16 p-0.5" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gradient End</Label>
                  <Input type="color" value={form.gradientEnd || "#000000"} onChange={e => update("gradientEnd", e.target.value)} className="h-8 w-16 p-0.5" />
                </div>
              </div>
              <SliderRow label="Gradient Opacity" value={form.gradientOpacity * 100} max={100} suffix="%" onChange={v => update("gradientOpacity", v / 100)} />
              <div className="space-y-1.5">
                <Label className="text-xs">Blend Mode</Label>
                <Select value={form.blendMode} onValueChange={v => update("blendMode", v as BlendMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLEND_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timing */}
            <div className={`${CARD} space-y-5`} style={CARD_SHADOW}>
              <p className="text-sm font-medium">Timing & Transitions</p>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Autoplay</Label>
                <Switch checked={form.autoplay} onCheckedChange={v => update("autoplay", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Loop</Label>
                <Switch checked={form.loop} onCheckedChange={v => update("loop", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Random Order</Label>
                <Switch checked={form.randomOrder} onCheckedChange={v => update("randomOrder", v)} />
              </div>
              <SliderRow label="Cycle Speed" value={form.intervalMs / 1000} min={1} max={30} step={0.5} suffix="s" onChange={v => update("intervalMs", v * 1000)} />
              <div className="space-y-1.5">
                <Label className="text-xs">Transition Type</Label>
                <Select value={form.transitionType} onValueChange={v => update("transitionType", v as TransitionType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSITION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <SliderRow label="Transition Duration" value={form.transitionDurationMs} min={200} max={3000} step={100} suffix="ms" onChange={v => update("transitionDurationMs", v)} />
            </div>

            {/* Size & Position */}
            <div className={`${CARD} space-y-4`} style={CARD_SHADOW}>
              <p className="text-sm font-medium">Size & Position</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Image Size Mode</Label>
                  <Select value={form.sizeMode} onValueChange={v => update("sizeMode", v as BackgroundSizeMode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SIZE_MODE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Position</Label>
                  <Select value={form.position} onValueChange={v => update("position", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POSITION_OPTIONS.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Attachment</Label>
                <Select value={form.attachment} onValueChange={v => update("attachment", v as AttachmentMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="scroll">Scroll</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Motion */}
            <div className={`${CARD} space-y-4`} style={CARD_SHADOW}>
              <p className="text-sm font-medium">Motion</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Motion Effect</Label>
                <Select value={form.motionEffect} onValueChange={v => update("motionEffect", v as MotionEffect)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <SliderRow label="Motion Speed" value={form.motionSpeed} min={2} max={60} suffix="s" onChange={v => update("motionSpeed", v)} />
            </div>

            {/* Images */}
            <div className={CARD} style={CARD_SHADOW}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Background Images</p>
                  <p className="text-xs text-muted-foreground">{form.images.length} image{form.images.length !== 1 ? "s" : ""}</p>
                </div>
                <Label htmlFor="bg-upload" className="inline-flex cursor-pointer items-center rounded-xl border border-border/40 bg-card/70 px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-card/90">
                  <ImagePlus className="mr-2 h-4 w-4 text-primary" />
                  {uploading ? "Uploading..." : "Upload"}
                </Label>
              </div>
              <Input id="bg-upload" type="file" multiple accept="image/*" className="hidden" onChange={e => uploadFiles(e.target.files)} />

              {form.images.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border/30 p-8 text-center text-sm text-muted-foreground">
                  No images yet. Upload to create a slideshow.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {form.images.map((src, index) => (
                    <div key={`${src}-${index}`}
                      className={`group rounded-xl border p-2 transition-all cursor-pointer ${
                        index === (previewIndex % form.images.length) ? "border-primary/50 shadow-[0_0_16px_hsl(217_91%_60%/0.15)]" : "border-border/30"
                      }`}
                      onClick={() => { setPreviewIndex(index); setPreviewPlaying(false); }}
                    >
                      <div className="relative overflow-hidden rounded-lg">
                        <img src={src} alt={`BG ${index + 1}`} className="h-24 w-full rounded-lg object-cover transition-transform group-hover:scale-105" />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-muted-foreground">Slide {index + 1}</span>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0}
                            onClick={e => { e.stopPropagation(); moveImage(index, "up"); }}><ArrowUp className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === form.images.length - 1}
                            onClick={e => { e.stopPropagation(); moveImage(index, "down"); }}><ArrowDown className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={e => { e.stopPropagation(); removeImage(index); }}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DraftActionButtons
              bgDraftStatus={bgDraftStatus}
              saving={saving}
              publishingBg={publishingBg}
              uploading={uploading}
              onSave={save}
              onPublish={publishBg}
              onDiscard={discardBgDraft}
            />
          </div>
        ) : overrideMode === "disabled" ? (
          <div className="space-y-4">
            <div className={CARD} style={CARD_SHADOW}>
              <p className="text-sm text-muted-foreground">Background is disabled for this page.</p>
            </div>
            <DraftActionButtons bgDraftStatus={bgDraftStatus} saving={saving} publishingBg={publishingBg} onSave={save} onPublish={publishBg} onDiscard={discardBgDraft} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className={CARD} style={CARD_SHADOW}>
              <p className="text-sm text-muted-foreground">This page inherits the global background.</p>
            </div>
            <DraftActionButtons bgDraftStatus={bgDraftStatus} saving={saving} publishingBg={publishingBg} onSave={save} onPublish={publishBg} onDiscard={discardBgDraft} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function DraftActionButtons({ bgDraftStatus, saving, publishingBg, uploading, onSave, onPublish, onDiscard }: {
  bgDraftStatus: DraftStatus; saving: boolean; publishingBg: boolean; uploading?: boolean;
  onSave: () => void; onPublish: () => void; onDiscard: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {bgDraftStatus === "draft" && (
          <Badge variant="outline" className="gap-1 border-blue-500/50 bg-blue-500/10 text-blue-400 text-[10px]">
            <Eye className="h-3 w-3" /> Draft
          </Badge>
        )}
        {bgDraftStatus === "published" && (
          <Badge variant="outline" className="gap-1 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-[10px]">
            <CheckCircle2 className="h-3 w-3" /> Published
          </Badge>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onSave} disabled={saving || uploading} className="flex-1 gap-1.5 font-display uppercase tracking-wider">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Draft"}
        </Button>
        <Button onClick={onPublish} disabled={publishingBg || saving} className="flex-1 gap-1.5 font-display uppercase tracking-wider">
          <Upload className="h-4 w-4" />
          {publishingBg ? "Publishing..." : "Publish"}
        </Button>
      </div>
      {bgDraftStatus === "draft" && (
        <Button variant="ghost" onClick={onDiscard} className="w-full gap-1.5 text-xs text-muted-foreground hover:text-destructive">
          <RotateCcw className="h-3.5 w-3.5" /> Discard Draft & Revert to Published
        </Button>
      )}
    </div>
  );
}


function SliderRow({ label, value, min = 0, max = 100, step = 1, suffix = "", onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number; suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-mono text-muted-foreground">{Math.round(value)}{suffix}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
