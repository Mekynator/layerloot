import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgePlus,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  LayoutTemplate,
  Lock,
  Monitor,
  Redo2,
  Save,
  Shapes,
  Smartphone,
  Sparkles,
  Star,
  TabletSmartphone,
  TimerReset,
  Trash2,
  Type,
  Undo2,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  clonePromotionPopupConfig,
  createPopupElement,
  DEFAULT_PROMOTION_POPUP_CONFIG,
  normalizePromotionPopupConfig,
  syncPromotionPopupSummary,
} from "@/lib/promotion-popup";
import type {
  PopupCanvasElement,
  PopupElementType,
  PopupHoverAnimation,
  PopupRecurrenceFrequency,
  PromotionPopupConfig,
} from "@/types/promotion-popup";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import AdminColorPicker from "@/components/admin/AdminColorPicker";
import PageLinkSelect from "@/components/admin/PageLinkSelect";
import PromotionPopupCanvas from "@/components/promo/PromotionPopupCanvas";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const presetId = () => `popup-preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type DevicePreview = "desktop" | "tablet" | "mobile";

const ELEMENT_OPTIONS: Array<{ type: PopupElementType; label: string; icon: typeof Type }> = [
  { type: "title", label: "Title", icon: Type },
  { type: "subtitle", label: "Subtitle", icon: Type },
  { type: "description", label: "Description", icon: Type },
  { type: "button", label: "Button", icon: LayoutTemplate },
  { type: "badge", label: "Badge", icon: BadgePlus },
  { type: "countdown", label: "Countdown", icon: TimerReset },
  { type: "image", label: "Image", icon: ImagePlus },
  { type: "icon", label: "Icon", icon: Sparkles },
  { type: "shape", label: "Shape", icon: Shapes },
];

const RECURRENCE_OPTIONS: Array<{ value: PopupRecurrenceFrequency; label: string }> = [
  { value: "none", label: "No recurrence" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom rule" },
];

const HOVER_OPTIONS: Array<{ value: PopupHoverAnimation; label: string }> = [
  { value: "none", label: "None" },
  { value: "scale", label: "Scale" },
  { value: "pulse", label: "Pulse" },
  { value: "shimmer", label: "Shimmer" },
  { value: "float", label: "Float" },
];

const DEVICE_FRAME_CLASS: Record<DevicePreview, string> = {
  desktop: "max-w-[780px] min-h-[520px]",
  tablet: "max-w-[620px] min-h-[520px]",
  mobile: "max-w-[400px] min-h-[640px]",
};

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export default function PromotionPopupBuilder() {
  const [config, setConfig] = useState<PromotionPopupConfig>(DEFAULT_PROMOTION_POPUP_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(DEFAULT_PROMOTION_POPUP_CONFIG.elements[0]?.id ?? null);
  const [devicePreview, setDevicePreview] = useState<DevicePreview>("desktop");
  const [history, setHistory] = useState<PromotionPopupConfig[]>([]);
  const [future, setFuture] = useState<PromotionPopupConfig[]>([]);
  const [presetName, setPresetName] = useState(DEFAULT_PROMOTION_POPUP_CONFIG.metadata.name);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const selectedElement = useMemo(
    () => config.elements.find((element) => element.id === selectedElementId) ?? null,
    [config.elements, selectedElementId],
  );

  const activePreset = useMemo(
    () => config.presets.find((preset) => preset.id === config.metadata.activePresetId) ?? null,
    [config.metadata.activePresetId, config.presets],
  );

  const applyConfigChange = useCallback((updater: (draft: PromotionPopupConfig) => PromotionPopupConfig, pushHistory = true) => {
    setConfig((previous) => {
      const draft = clonePromotionPopupConfig(previous);
      const next = syncPromotionPopupSummary(updater(draft));

      if (pushHistory) {
        setHistory((items) => [...items.slice(-24), clonePromotionPopupConfig(previous)]);
        setFuture([]);
      }

      return next;
    });
  }, []);

  const updateSelectedElement = useCallback((updater: (element: PopupCanvasElement) => PopupCanvasElement) => {
    if (!selectedElementId) return;

    applyConfigChange((draft) => {
      draft.elements = draft.elements.map((element) => (
        element.id === selectedElementId ? updater({ ...element }) : element
      ));
      return draft;
    });
  }, [applyConfigChange, selectedElementId]);

  useEffect(() => {
    const loadPopupConfig = async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "promotion_popup")
        .maybeSingle();

      if (error) {
        toast.error("Failed to load promotion popup settings");
        setLoading(false);
        return;
      }

      const nextConfig = normalizePromotionPopupConfig(data?.value);
      setConfig(nextConfig);
      setPresetName(nextConfig.metadata.name);
      setSelectedElementId(nextConfig.elements[0]?.id ?? null);
      setLoading(false);
    };

    loadPopupConfig();
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (event: MouseEvent) => {
      const frame = previewRef.current;
      if (!frame) return;

      const rect = frame.getBoundingClientRect();
      const selected = config.elements.find((element) => element.id === dragging.id);
      if (!selected || selected.locked) return;

      const x = ((event.clientX - rect.left - dragging.offsetX) / rect.width) * 100;
      const y = ((event.clientY - rect.top - dragging.offsetY) / rect.height) * 100;

      applyConfigChange((draft) => {
        draft.elements = draft.elements.map((element) => {
          if (element.id !== dragging.id) return element;
          return {
            ...element,
            x: clamp(x, 0, 100 - element.width),
            y: clamp(y, 0, 100 - element.height),
          };
        });
        return draft;
      }, false);
    };

    const handleUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [applyConfigChange, config.elements, dragging]);

  const handleSave = async () => {
    setSaving(true);
    const valueToSave = syncPromotionPopupSummary({
      ...config,
      metadata: {
        ...config.metadata,
        name: presetName.trim() || config.metadata.name,
      },
    });

    const { data: existing, error: existingError } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "promotion_popup")
      .maybeSingle();

    if (existingError) {
      setSaving(false);
      toast.error("Failed to save popup builder");
      return;
    }

    const operation = existing
      ? supabase.from("site_settings").update({ value: valueToSave as any }).eq("key", "promotion_popup")
      : supabase.from("site_settings").insert({ key: "promotion_popup", value: valueToSave as any });

    const { error } = await operation;
    setSaving(false);

    if (error) {
      toast.error("Failed to save popup builder");
      return;
    }

    setConfig(valueToSave);
    toast.success("Promotion popup saved");
  };

  const resetBuilder = () => {
    applyConfigChange(() => normalizePromotionPopupConfig({ ...DEFAULT_PROMOTION_POPUP_CONFIG, presets: config.presets }));
    setPresetName(DEFAULT_PROMOTION_POPUP_CONFIG.metadata.name);
    setSelectedElementId(DEFAULT_PROMOTION_POPUP_CONFIG.elements[0]?.id ?? null);
  };

  const addElement = (type: PopupElementType) => {
    const element = createPopupElement(type, config.elements.length);

    if (type === "title") element.content = config.title || element.content;
    if (type === "description") element.content = config.message || element.content;
    if (type === "button") {
      element.action.label = config.button_text || element.action.label;
      element.action.link = config.button_link || element.action.link;
      element.content = element.action.label;
    }
    if (type === "image") {
      element.asset.url = config.image_url || "";
    }

    applyConfigChange((draft) => {
      draft.elements.push({ ...element, zIndex: draft.elements.length + 1 });
      return draft;
    });
    setSelectedElementId(element.id);
  };

  const duplicateSelected = () => {
    if (!selectedElement) return;
    const clone = {
      ...selectedElement,
      id: `${selectedElement.id}-copy-${Date.now()}`,
      name: `${selectedElement.name} Copy`,
      x: clamp(selectedElement.x + 3, 0, 100 - selectedElement.width),
      y: clamp(selectedElement.y + 3, 0, 100 - selectedElement.height),
      zIndex: config.elements.length + 1,
    };

    applyConfigChange((draft) => {
      draft.elements.push(clone);
      return draft;
    });
    setSelectedElementId(clone.id);
  };

  const deleteSelected = () => {
    if (!selectedElement) return;
    applyConfigChange((draft) => {
      draft.elements = draft.elements.filter((element) => element.id !== selectedElement.id);
      return draft;
    });
    setSelectedElementId(config.elements.find((element) => element.id !== selectedElement.id)?.id ?? null);
  };

  const moveSelectedLayer = (direction: "forward" | "backward") => {
    if (!selectedElement) return;

    applyConfigChange((draft) => {
      const ordered = [...draft.elements].sort((a, b) => a.zIndex - b.zIndex);
      const index = ordered.findIndex((element) => element.id === selectedElement.id);
      const targetIndex = direction === "forward" ? index + 1 : index - 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return draft;

      [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
      draft.elements = ordered.map((element, idx) => ({ ...element, zIndex: idx + 1 }));
      return draft;
    });
  };

  const saveCurrentAsPreset = () => {
    const name = presetName.trim() || `Preset ${config.presets.length + 1}`;
    const now = new Date().toISOString();
    const snapshot = syncPromotionPopupSummary({ ...config, presets: [] });

    applyConfigChange((draft) => {
      const preset = {
        id: presetId(),
        name,
        isFavorite: false,
        isDefault: draft.presets.length === 0,
        createdAt: now,
        updatedAt: now,
        config: { ...snapshot, presets: [] },
      };
      draft.presets = [...draft.presets, preset];
      draft.metadata.activePresetId = preset.id;
      draft.metadata.name = name;
      return draft;
    });

    toast.success(`Saved \"${name}\" preset`);
  };

  const loadPreset = (presetIdValue: string) => {
    const preset = config.presets.find((item) => item.id === presetIdValue);
    if (!preset) return;

    applyConfigChange(() => normalizePromotionPopupConfig({
      ...preset.config,
      presets: config.presets,
      metadata: {
        ...preset.config.metadata,
        activePresetId: preset.id,
        name: preset.name,
      },
    }));
    setPresetName(preset.name);
    setSelectedElementId(preset.config.elements[0]?.id ?? null);
  };

  const duplicatePreset = () => {
    if (!activePreset) return;
    const now = new Date().toISOString();

    applyConfigChange((draft) => {
      draft.presets = [
        ...draft.presets,
        {
          ...activePreset,
          id: presetId(),
          name: `${activePreset.name} Copy`,
          isDefault: false,
          createdAt: now,
          updatedAt: now,
        },
      ];
      return draft;
    });
  };

  const renamePreset = () => {
    if (!activePreset) return;
    const nextName = window.prompt("Rename preset", activePreset.name)?.trim();
    if (!nextName) return;

    applyConfigChange((draft) => {
      draft.presets = draft.presets.map((preset) => (
        preset.id === activePreset.id ? { ...preset, name: nextName, updatedAt: new Date().toISOString() } : preset
      ));
      if (draft.metadata.activePresetId === activePreset.id) {
        draft.metadata.name = nextName;
      }
      return draft;
    });
    setPresetName(nextName);
  };

  const deletePreset = () => {
    if (!activePreset) return;
    applyConfigChange((draft) => {
      draft.presets = draft.presets.filter((preset) => preset.id !== activePreset.id);
      if (draft.metadata.activePresetId === activePreset.id) {
        draft.metadata.activePresetId = draft.presets[0]?.id ?? null;
      }
      return draft;
    });
  };

  const markPresetFavorite = (presetIdValue: string) => {
    applyConfigChange((draft) => {
      draft.presets = draft.presets.map((preset) => ({
        ...preset,
        isFavorite: preset.id === presetIdValue ? !preset.isFavorite : preset.isFavorite,
      }));
      return draft;
    });
  };

  const markPresetDefault = (presetIdValue: string) => {
    applyConfigChange((draft) => {
      draft.presets = draft.presets.map((preset) => ({
        ...preset,
        isDefault: preset.id === presetIdValue,
      }));
      return draft;
    });
  };

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((items) => items.slice(0, -1));
    setFuture((items) => [clonePromotionPopupConfig(config), ...items.slice(0, 24)]);
    setConfig(previous);
  };

  const redo = () => {
    if (future.length === 0) return;
    const [next, ...rest] = future;
    setFuture(rest);
    setHistory((items) => [...items.slice(-24), clonePromotionPopupConfig(config)]);
    setConfig(next);
  };

  const beginDrag = (id: string, event: React.MouseEvent<HTMLDivElement>) => {
    const element = config.elements.find((item) => item.id === id);
    const frame = previewRef.current;
    if (!element || !frame || element.locked) return;

    setSelectedElementId(id);
    setHistory((items) => [...items.slice(-24), clonePromotionPopupConfig(config)]);
    setFuture([]);

    const rect = event.currentTarget.getBoundingClientRect();
    setDragging({
      id,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  };

  const targetPathsValue = config.schedule.pageTargets.join(", ");

  if (loading) {
    return (
      <Card className="mb-6 border-border/40">
        <CardContent className="py-10 text-sm text-muted-foreground">Loading promotion popup builder...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 overflow-hidden border-border/40 bg-card/70 backdrop-blur-sm">
      <CardHeader className="border-b border-border/30 bg-muted/10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">Promotion Popup</Badge>
              <Badge variant="outline" className="text-[10px]">Home-first modal</Badge>
            </div>
            <CardTitle className="font-display text-xl uppercase tracking-wide">Popup Campaign Builder</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              Build a first-visit homepage popup with presets, scheduling, layered elements, and live preview while keeping existing campaign logic untouched.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={undo} disabled={history.length === 0}>
              <Undo2 className="mr-1 h-4 w-4" /> Undo
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={future.length === 0}>
              <Redo2 className="mr-1 h-4 w-4" /> Redo
            </Button>
            <Button variant="outline" size="sm" onClick={resetBuilder}>
              Reset defaults
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="font-display uppercase tracking-wider">
              <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save popup"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 lg:p-6">
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border/30 bg-background/40 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div>
              <Label className="text-xs">Popup name</Label>
              <Input value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Homepage Promotion Popup" />
            </div>
            <div>
              <Label className="text-xs">Display behavior</Label>
              <Select value={config.schedule.behavior} onValueChange={(value) => applyConfigChange((draft) => {
                draft.schedule.behavior = value as PromotionPopupConfig["schedule"]["behavior"];
                return draft;
              })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="session">Show once per session</SelectItem>
                  <SelectItem value="day">Show once per day</SelectItem>
                  <SelectItem value="interval">Show once per X days</SelectItem>
                  <SelectItem value="always">Always show when active</SelectItem>
                  <SelectItem value="first-visit">First visit ever</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.schedule.behavior === "interval" && (
              <div>
                <Label className="text-xs">X days</Label>
                <Input
                  type="number"
                  min={1}
                  value={config.schedule.intervalDays}
                  onChange={(event) => applyConfigChange((draft) => {
                    draft.schedule.intervalDays = Math.max(1, Number(event.target.value) || 1);
                    return draft;
                  })}
                />
              </div>
            )}
            <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
              <Switch checked={config.enabled} onCheckedChange={(checked) => applyConfigChange((draft) => {
                draft.enabled = checked;
                return draft;
              })} />
              <div>
                <p className="text-xs font-medium">Popup active</p>
                <p className="text-[10px] text-muted-foreground">Stores in `site_settings.key = promotion_popup`</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border/30 bg-background/60 p-1">
            <Button type="button" variant={devicePreview === "desktop" ? "default" : "ghost"} size="sm" onClick={() => setDevicePreview("desktop")}>
              <Monitor className="mr-1 h-4 w-4" /> Desktop
            </Button>
            <Button type="button" variant={devicePreview === "tablet" ? "default" : "ghost"} size="sm" onClick={() => setDevicePreview("tablet")}>
              <TabletSmartphone className="mr-1 h-4 w-4" /> Tablet
            </Button>
            <Button type="button" variant={devicePreview === "mobile" ? "default" : "ghost"} size="sm" onClick={() => setDevicePreview("mobile")}>
              <Smartphone className="mr-1 h-4 w-4" /> Mobile
            </Button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Accordion type="multiple" defaultValue={["presets", "layout", "schedule", "layers"]} className="rounded-xl border border-border/30 bg-background/40 px-3">
              <AccordionItem value="presets">
                <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider">Presets</AccordionTrigger>
                <AccordionContent className="space-y-3 pb-3">
                  <div>
                    <Label className="text-xs">Load preset</Label>
                    <Select value={config.metadata.activePresetId ?? "none"} onValueChange={(value) => value !== "none" && loadPreset(value)}>
                      <SelectTrigger><SelectValue placeholder="Select preset" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Current working draft</SelectItem>
                        {config.presets.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>{preset.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={saveCurrentAsPreset}>Save preset</Button>
                    <Button type="button" variant="outline" size="sm" onClick={duplicatePreset} disabled={!activePreset}>Duplicate</Button>
                    <Button type="button" variant="outline" size="sm" onClick={renamePreset} disabled={!activePreset}>Rename</Button>
                    <Button type="button" variant="outline" size="sm" onClick={deletePreset} disabled={!activePreset} className="text-destructive">Delete</Button>
                  </div>
                  {config.presets.length > 0 && (
                    <div className="space-y-2">
                      {config.presets.map((preset) => (
                        <div key={preset.id} className={cn("rounded-lg border px-2.5 py-2", preset.id === config.metadata.activePresetId ? "border-primary/40 bg-primary/5" : "border-border/30") }>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-medium">{preset.name}</p>
                              <p className="text-[10px] text-muted-foreground">{preset.updatedAt ? new Date(preset.updatedAt).toLocaleDateString() : "Saved"}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => markPresetFavorite(preset.id)}>
                                <Star className={cn("h-3.5 w-3.5", preset.isFavorite && "fill-current text-amber-400")} />
                              </Button>
                              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => markPresetDefault(preset.id)}>
                                {preset.isDefault ? "Default" : "Set default"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="layout">
                <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider">Layout & Backdrop</AccordionTrigger>
                <AccordionContent className="space-y-3 pb-3">
                  <AdminColorPicker
                    label="Overlay color"
                    value={config.overlay.color}
                    onChange={(value) => applyConfigChange((draft) => { draft.overlay.color = value; return draft; })}
                    defaultValue="#020617"
                  />
                  <div>
                    <Label className="text-xs">Overlay opacity ({Math.round(config.overlay.opacity * 100)}%)</Label>
                    <Slider value={[config.overlay.opacity * 100]} onValueChange={([value]) => applyConfigChange((draft) => { draft.overlay.opacity = value / 100; return draft; })} min={10} max={90} step={5} />
                  </div>
                  <div>
                    <Label className="text-xs">Blur amount ({config.overlay.blur}px)</Label>
                    <Slider value={[config.overlay.blur]} onValueChange={([value]) => applyConfigChange((draft) => { draft.overlay.blur = value; return draft; })} min={0} max={20} step={1} />
                  </div>
                  <AdminColorPicker
                    label="Popup background"
                    value={config.container.backgroundColor}
                    onChange={(value) => applyConfigChange((draft) => { draft.container.backgroundColor = value; return draft; })}
                    defaultValue="#ffffff"
                  />
                  <AdminColorPicker
                    label="Border color"
                    value={config.container.borderColor}
                    onChange={(value) => applyConfigChange((draft) => { draft.container.borderColor = value; return draft; })}
                    defaultValue="rgba(255, 255, 255, 0.2)"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Width</Label>
                      <Input type="number" value={config.container.width} onChange={(event) => applyConfigChange((draft) => { draft.container.width = Math.max(280, Number(event.target.value) || 560); return draft; })} />
                    </div>
                    <div>
                      <Label className="text-xs">Min height</Label>
                      <Input type="number" value={config.container.minHeight} onChange={(event) => applyConfigChange((draft) => { draft.container.minHeight = Math.max(220, Number(event.target.value) || 320); return draft; })} />
                    </div>
                    <div>
                      <Label className="text-xs">Radius</Label>
                      <Input type="number" value={config.container.borderRadius} onChange={(event) => applyConfigChange((draft) => { draft.container.borderRadius = Math.max(0, Number(event.target.value) || 0); return draft; })} />
                    </div>
                    <div>
                      <Label className="text-xs">Padding</Label>
                      <Input type="number" value={config.container.padding} onChange={(event) => applyConfigChange((draft) => { draft.container.padding = Math.max(0, Number(event.target.value) || 0); return draft; })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Shadow</Label>
                    <Input value={config.container.shadow} onChange={(event) => applyConfigChange((draft) => { draft.container.shadow = event.target.value; return draft; })} />
                  </div>
                  <div>
                    <Label className="text-xs">Background image URL</Label>
                    <Input value={config.container.backgroundImage} onChange={(event) => applyConfigChange((draft) => { draft.container.backgroundImage = event.target.value; return draft; })} placeholder="https://..." />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Background fit</Label>
                      <Select value={config.container.backgroundSize} onValueChange={(value) => applyConfigChange((draft) => { draft.container.backgroundSize = value as PromotionPopupConfig["container"]["backgroundSize"]; return draft; })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cover">Cover</SelectItem>
                          <SelectItem value="contain">Contain</SelectItem>
                          <SelectItem value="auto">Auto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Image position</Label>
                      <Input value={config.container.backgroundPosition} onChange={(event) => applyConfigChange((draft) => { draft.container.backgroundPosition = event.target.value; return draft; })} placeholder="center center" />
                    </div>
                  </div>
                  <div className="space-y-2 rounded-lg border border-border/30 bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium">Dismiss behavior</p>
                        <p className="text-[10px] text-muted-foreground">Close button, click-outside, focus lock, and escape handling.</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3"><Label className="text-xs">Show close button</Label><Switch checked={config.container.showCloseButton} onCheckedChange={(checked) => applyConfigChange((draft) => { draft.container.showCloseButton = checked; return draft; })} /></div>
                    {config.container.showCloseButton && (
                      <div className="grid gap-3 lg:grid-cols-2">
                        <AdminColorPicker label="Close icon" value={config.container.closeButtonColor} onChange={(value) => applyConfigChange((draft) => { draft.container.closeButtonColor = value; return draft; })} defaultValue="#0f172a" />
                        <AdminColorPicker label="Close background" value={config.container.closeButtonBackground} onChange={(value) => applyConfigChange((draft) => { draft.container.closeButtonBackground = value; return draft; })} defaultValue="rgba(255,255,255,0.86)" />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3"><Label className="text-xs">Close on outside click</Label><Switch checked={config.overlay.clickOutsideToClose} onCheckedChange={(checked) => applyConfigChange((draft) => { draft.overlay.clickOutsideToClose = checked; return draft; })} /></div>
                    <div className="flex items-center justify-between gap-3"><Label className="text-xs">Close on Escape</Label><Switch checked={config.overlay.closeOnEscape} onCheckedChange={(checked) => applyConfigChange((draft) => { draft.overlay.closeOnEscape = checked; return draft; })} /></div>
                    <div className="flex items-center justify-between gap-3"><Label className="text-xs">Lock focus in modal</Label><Switch checked={config.overlay.modal} onCheckedChange={(checked) => applyConfigChange((draft) => { draft.overlay.modal = checked; return draft; })} /></div>
                    <div className="flex items-center justify-between gap-3"><Label className="text-xs">Allow “do not show again”</Label><Switch checked={config.schedule.allowDoNotShowAgain} onCheckedChange={(checked) => applyConfigChange((draft) => { draft.schedule.allowDoNotShowAgain = checked; return draft; })} /></div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="schedule">
                <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider">Scheduling & Display Rules</AccordionTrigger>
                <AccordionContent className="space-y-3 pb-3">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">Schedule active</p>
                      <p className="text-[10px] text-muted-foreground">Use this to pause the popup without deleting its design.</p>
                    </div>
                    <Switch checked={config.schedule.active} onCheckedChange={(checked) => applyConfigChange((draft) => { draft.schedule.active = checked; return draft; })} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Start date</Label>
                      <Input type="date" value={config.schedule.startDate} onChange={(event) => applyConfigChange((draft) => { draft.schedule.startDate = event.target.value; return draft; })} />
                    </div>
                    <div>
                      <Label className="text-xs">End date</Label>
                      <Input type="date" value={config.schedule.endDate} onChange={(event) => applyConfigChange((draft) => { draft.schedule.endDate = event.target.value; return draft; })} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Dismiss key</Label>
                      <Input value={config.dismiss_key} onChange={(event) => applyConfigChange((draft) => { draft.dismiss_key = event.target.value; return draft; })} placeholder="promo-v2" />
                    </div>
                    <div>
                      <Label className="text-xs">Analytics ID</Label>
                      <Input value={config.metadata.analyticsId} onChange={(event) => applyConfigChange((draft) => { draft.metadata.analyticsId = event.target.value; return draft; })} placeholder="promo-home-hero" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">Homepage only</p>
                      <p className="text-[10px] text-muted-foreground">Future-safe page targets are kept in the same config.</p>
                    </div>
                    <Switch checked={config.schedule.homepageOnly} onCheckedChange={(checked) => applyConfigChange((draft) => {
                      draft.schedule.homepageOnly = checked;
                      draft.schedule.pageTargets = checked ? ["/"] : draft.schedule.pageTargets;
                      return draft;
                    })} />
                  </div>

                  {!config.schedule.homepageOnly && (
                    <div>
                      <Label className="text-xs">Target paths (comma-separated)</Label>
                      <Input
                        value={targetPathsValue}
                        onChange={(event) => applyConfigChange((draft) => {
                          draft.schedule.pageTargets = event.target.value.split(",").map((item) => item.trim()).filter(Boolean);
                          return draft;
                        })}
                        placeholder="/, /products, /gallery"
                      />
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Priority</Label>
                      <Input type="number" value={config.schedule.priority} onChange={(event) => applyConfigChange((draft) => { draft.schedule.priority = Number(event.target.value) || 0; return draft; })} />
                    </div>
                    <div>
                      <Label className="text-xs">Show delay (ms)</Label>
                      <Input type="number" value={config.schedule.showDelayMs} onChange={(event) => applyConfigChange((draft) => { draft.schedule.showDelayMs = Math.max(0, Number(event.target.value) || 0); return draft; })} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">Enable recurrence</p>
                      <p className="text-[10px] text-muted-foreground">Daily, weekly, monthly, or custom recurring rule support.</p>
                    </div>
                    <Switch checked={config.schedule.recurrenceEnabled} onCheckedChange={(checked) => applyConfigChange((draft) => { draft.schedule.recurrenceEnabled = checked; return draft; })} />
                  </div>

                  {config.schedule.recurrenceEnabled && (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs">Recurrence</Label>
                          <Select value={config.schedule.recurrence} onValueChange={(value) => applyConfigChange((draft) => {
                            draft.schedule.recurrence = value as PopupRecurrenceFrequency;
                            return draft;
                          })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {RECURRENCE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Repeat every</Label>
                          <Input type="number" min={1} value={config.schedule.interval} onChange={(event) => applyConfigChange((draft) => { draft.schedule.interval = Math.max(1, Number(event.target.value) || 1); return draft; })} />
                        </div>
                      </div>

                      {config.schedule.recurrence === "weekly" && (
                        <div>
                          <Label className="mb-2 block text-xs">Active weekdays</Label>
                          <div className="flex flex-wrap gap-2">
                            {WEEKDAY_OPTIONS.map((day) => {
                              const active = config.schedule.daysOfWeek.includes(day.value);
                              return (
                                <Button
                                  key={day.value}
                                  type="button"
                                  variant={active ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => applyConfigChange((draft) => {
                                    draft.schedule.daysOfWeek = active
                                      ? draft.schedule.daysOfWeek.filter((value) => value !== day.value)
                                      : [...draft.schedule.daysOfWeek, day.value].sort((a, b) => a - b);
                                    return draft;
                                  })}
                                >
                                  {day.label}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {config.schedule.recurrence === "monthly" && (
                        <div>
                          <Label className="text-xs">Day of month</Label>
                          <Input type="number" min={1} max={31} value={config.schedule.dayOfMonth} onChange={(event) => applyConfigChange((draft) => { draft.schedule.dayOfMonth = clamp(Number(event.target.value) || 1, 1, 31); return draft; })} />
                        </div>
                      )}

                      {config.schedule.recurrence === "custom" && (
                        <div>
                          <Label className="text-xs">Custom rule</Label>
                          <Textarea value={config.schedule.customRule} onChange={(event) => applyConfigChange((draft) => { draft.schedule.customRule = event.target.value; return draft; })} rows={2} placeholder="Example: weekdays only" />
                        </div>
                      )}
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="layers">
                <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider">Elements & Layers</AccordionTrigger>
                <AccordionContent className="space-y-3 pb-3">
                  <div className="grid grid-cols-2 gap-2">
                    {ELEMENT_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <Button key={option.type} type="button" variant="outline" size="sm" className="justify-start" onClick={() => addElement(option.type)}>
                          <Icon className="mr-1 h-3.5 w-3.5" /> {option.label}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    {config.elements
                      .slice()
                      .sort((a, b) => b.zIndex - a.zIndex)
                      .map((element) => (
                        <div
                          key={element.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedElementId(element.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedElementId(element.id);
                            }
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition-colors",
                            selectedElementId === element.id ? "border-primary/40 bg-primary/5" : "border-border/30 hover:border-primary/20",
                          )}
                        >
                          <div>
                            <p className="text-xs font-medium">{element.name}</p>
                            <p className="text-[10px] uppercase text-muted-foreground">{element.type}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(event) => { event.stopPropagation(); applyConfigChange((draft) => { draft.elements = draft.elements.map((item) => item.id === element.id ? { ...item, visible: !item.visible } : item); return draft; }); }}>
                              {element.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(event) => { event.stopPropagation(); applyConfigChange((draft) => { draft.elements = draft.elements.map((item) => item.id === element.id ? { ...item, locked: !item.locked } : item); return draft; }); }}>
                              {element.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="xl:sticky xl:top-24 xl:self-start">
            <div className={cn("relative overflow-hidden rounded-[28px] border border-border/40 bg-slate-950 px-3 py-4 shadow-2xl", DEVICE_FRAME_CLASS[devicePreview])}>
              <div className="absolute inset-0 opacity-70" style={{ background: `linear-gradient(160deg, ${config.overlay.color} ${Math.round(config.overlay.opacity * 100)}%, rgba(15,23,42,0.75))` }} />
              <div className="absolute inset-0 backdrop-blur-sm" style={{ backdropFilter: `blur(${config.overlay.blur}px)` }} />
              <div className="absolute inset-5 rounded-[24px] border border-white/10 bg-white/10" />

              <div className="relative z-10 flex min-h-[460px] items-center justify-center p-4">
                <div ref={previewRef} className="max-w-full">
                  <PromotionPopupCanvas
                    config={config}
                    mode="editor"
                    selectedElementId={selectedElementId}
                    onSelectElement={setSelectedElementId}
                    onPointerDownElement={beginDrag}
                    onClose={() => undefined}
                    className="max-w-full"
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Drag elements directly on the canvas to change their x/y position. Saved popup renders from the same config on the storefront.
            </p>
          </div>

          <div>
            <Card className="border-border/30 bg-background/40">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm uppercase tracking-wider">Selected Element Properties</CardTitle>
                <CardDescription>
                  {selectedElement ? `Editing ${selectedElement.name}` : "Pick an element on the canvas to customize it."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedElement ? (
                  <p className="text-sm text-muted-foreground">No element selected yet.</p>
                ) : (
                  <Accordion type="multiple" defaultValue={["content", "layout", "style", "animation"]} className="space-y-1">
                    <AccordionItem value="content">
                      <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider">Content</AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <div>
                          <Label className="text-xs">Layer name</Label>
                          <Input value={selectedElement.name} onChange={(event) => updateSelectedElement((element) => ({ ...element, name: event.target.value }))} />
                        </div>
                        {selectedElement.type !== "image" && selectedElement.type !== "shape" && (
                          <div>
                            <Label className="text-xs">Content</Label>
                            <Textarea value={selectedElement.content} onChange={(event) => updateSelectedElement((element) => ({ ...element, content: event.target.value, action: element.type === "button" ? { ...element.action, label: event.target.value } : element.action }))} rows={selectedElement.type === "description" ? 4 : 2} />
                          </div>
                        )}
                        {selectedElement.type === "image" && (
                          <div>
                            <Label className="text-xs">Image URL</Label>
                            <Input value={selectedElement.asset.url} onChange={(event) => updateSelectedElement((element) => ({ ...element, asset: { ...element.asset, url: event.target.value } }))} placeholder="https://..." />
                          </div>
                        )}
                        {selectedElement.type === "button" && (
                          <>
                            <div>
                              <Label className="text-xs">Button label</Label>
                              <Input value={selectedElement.action.label} onChange={(event) => updateSelectedElement((element) => ({ ...element, content: event.target.value, action: { ...element.action, label: event.target.value } }))} />
                            </div>
                            <PageLinkSelect label="Button link" value={selectedElement.action.link} onChange={(value) => updateSelectedElement((element) => ({ ...element, action: { ...element.action, link: value, target: /^https?:\/\//i.test(value) ? "external" : "internal" } }))} />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <Label className="text-xs">Variant</Label>
                                <Select value={selectedElement.action.variant} onValueChange={(value) => updateSelectedElement((element) => ({ ...element, action: { ...element.action, variant: value as PopupCanvasElement["action"]["variant"] } }))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="default">Default</SelectItem>
                                    <SelectItem value="secondary">Secondary</SelectItem>
                                    <SelectItem value="outline">Outline</SelectItem>
                                    <SelectItem value="ghost">Ghost</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Icon</Label>
                                <Input value={selectedElement.action.icon} onChange={(event) => updateSelectedElement((element) => ({ ...element, action: { ...element.action, icon: event.target.value } }))} placeholder="→" />
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <Label className="text-xs">Radius</Label>
                                <Input type="number" value={selectedElement.action.radius} onChange={(event) => updateSelectedElement((element) => ({ ...element, action: { ...element.action, radius: Math.max(0, Number(event.target.value) || 0) } }))} />
                              </div>
                              <div>
                                <Label className="text-xs">Size</Label>
                                <Select value={selectedElement.action.size} onValueChange={(value) => updateSelectedElement((element) => ({ ...element, action: { ...element.action, size: value as PopupCanvasElement["action"]["size"] } }))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sm">Small</SelectItem>
                                    <SelectItem value="md">Medium</SelectItem>
                                    <SelectItem value="lg">Large</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </>
                        )}
                        {selectedElement.type === "countdown" && (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs">Countdown end date</Label>
                              <Input type="date" value={selectedElement.countdown.endDate} onChange={(event) => updateSelectedElement((element) => ({ ...element, countdown: { ...element.countdown, endDate: event.target.value } }))} />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <Label className="text-xs">Prefix</Label>
                                <Input value={selectedElement.countdown.prefix} onChange={(event) => updateSelectedElement((element) => ({ ...element, countdown: { ...element.countdown, prefix: event.target.value } }))} />
                              </div>
                              <div>
                                <Label className="text-xs">Suffix</Label>
                                <Input value={selectedElement.countdown.suffix} onChange={(event) => updateSelectedElement((element) => ({ ...element, countdown: { ...element.countdown, suffix: event.target.value } }))} />
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button type="button" variant="outline" size="sm" onClick={duplicateSelected}><Copy className="mr-1 h-3.5 w-3.5" /> Duplicate</Button>
                          <Button type="button" variant="outline" size="sm" onClick={deleteSelected} className="text-destructive"><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="layout">
                      <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider">Layout</AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label className="text-xs">X position</Label>
                            <Input type="number" value={Math.round(selectedElement.x)} onChange={(event) => updateSelectedElement((element) => ({ ...element, x: clamp(Number(event.target.value) || 0, 0, 100 - element.width) }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Y position</Label>
                            <Input type="number" value={Math.round(selectedElement.y)} onChange={(event) => updateSelectedElement((element) => ({ ...element, y: clamp(Number(event.target.value) || 0, 0, 100 - element.height) }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Width (%)</Label>
                            <Input type="number" value={Math.round(selectedElement.width)} onChange={(event) => updateSelectedElement((element) => ({ ...element, width: clamp(Number(event.target.value) || 0, 6, 100) }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Height (%)</Label>
                            <Input type="number" value={Math.round(selectedElement.height)} onChange={(event) => updateSelectedElement((element) => ({ ...element, height: clamp(Number(event.target.value) || 0, 6, 90) }))} />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Layer order</Label>
                          <div className="mt-1 flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => moveSelectedLayer("backward")}>Send backward</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => moveSelectedLayer("forward")}>Bring forward</Button>
                          </div>
                        </div>
                        <div>
                          <Label className="mb-2 block text-xs">Alignment tools</Label>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => updateSelectedElement((element) => ({ ...element, x: 6, style: { ...element.style, textAlign: "left" } }))}>Left</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => updateSelectedElement((element) => ({ ...element, x: clamp(50 - element.width / 2, 0, 100 - element.width), style: { ...element.style, textAlign: "center" } }))}>Center</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => updateSelectedElement((element) => ({ ...element, x: clamp(94 - element.width, 0, 100 - element.width), style: { ...element.style, textAlign: "right" } }))}>Right</Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
                          <div>
                            <p className="text-xs font-medium">Visibility & locking</p>
                            <p className="text-[10px] text-muted-foreground">Use these to hide or freeze a layer.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => updateSelectedElement((element) => ({ ...element, visible: !element.visible }))}>{selectedElement.visible ? "Hide" : "Show"}</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => updateSelectedElement((element) => ({ ...element, locked: !element.locked }))}>{selectedElement.locked ? "Unlock" : "Lock"}</Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="style">
                      <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider">Style</AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <AdminColorPicker label="Text color" value={selectedElement.style.color} onChange={(value) => updateSelectedElement((element) => ({ ...element, style: { ...element.style, color: value } }))} defaultValue="#0f172a" />
                        <AdminColorPicker label="Background color" value={selectedElement.style.backgroundColor} onChange={(value) => updateSelectedElement((element) => ({ ...element, style: { ...element.style, backgroundColor: value } }))} defaultValue="transparent" />
                        <AdminColorPicker label="Border color" value={selectedElement.style.borderColor} onChange={(value) => updateSelectedElement((element) => ({ ...element, style: { ...element.style, borderColor: value } }))} defaultValue="rgba(15,23,42,0.12)" />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label className="text-xs">Font size</Label>
                            <Input type="number" value={selectedElement.style.fontSize} onChange={(event) => updateSelectedElement((element) => ({ ...element, style: { ...element.style, fontSize: Math.max(10, Number(event.target.value) || 10) } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Font weight</Label>
                            <Input type="number" value={selectedElement.style.fontWeight} onChange={(event) => updateSelectedElement((element) => ({ ...element, style: { ...element.style, fontWeight: Math.max(300, Number(event.target.value) || 400) } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Line height</Label>
                            <Input type="number" step="0.05" value={selectedElement.style.lineHeight} onChange={(event) => updateSelectedElement((element) => ({ ...element, style: { ...element.style, lineHeight: Math.max(0.8, Number(event.target.value) || 1) } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Letter spacing</Label>
                            <Input type="number" step="0.1" value={selectedElement.style.letterSpacing} onChange={(event) => updateSelectedElement((element) => ({ ...element, style: { ...element.style, letterSpacing: Number(event.target.value) || 0 } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Border width</Label>
                            <Input type="number" value={selectedElement.style.borderWidth} onChange={(event) => updateSelectedElement((element) => ({ ...element, style: { ...element.style, borderWidth: Math.max(0, Number(event.target.value) || 0) } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Radius</Label>
                            <Input type="number" value={selectedElement.style.borderRadius} onChange={(event) => updateSelectedElement((element) => ({ ...element, style: { ...element.style, borderRadius: Math.max(0, Number(event.target.value) || 0) } }))} />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Text shadow</Label>
                          <Input value={selectedElement.style.textShadow} onChange={(event) => updateSelectedElement((element) => ({ ...element, style: { ...element.style, textShadow: event.target.value } }))} placeholder="0 1px 2px rgba(0,0,0,0.25)" />
                        </div>
                        <div>
                          <Label className="text-xs">Box shadow</Label>
                          <Input value={selectedElement.style.shadow} onChange={(event) => updateSelectedElement((element) => ({ ...element, style: { ...element.style, shadow: event.target.value } }))} placeholder="0 12px 32px rgba(15,23,42,0.18)" />
                        </div>
                        <div>
                          <Label className="text-xs">Font family</Label>
                          <Input value={selectedElement.style.fontFamily} onChange={(event) => updateSelectedElement((element) => ({ ...element, style: { ...element.style, fontFamily: event.target.value || "inherit" } }))} placeholder="inherit" />
                        </div>
                        <div>
                          <Label className="text-xs">Opacity ({Math.round(selectedElement.style.opacity * 100)}%)</Label>
                          <Slider value={[selectedElement.style.opacity * 100]} onValueChange={([value]) => updateSelectedElement((element) => ({ ...element, style: { ...element.style, opacity: value / 100 } }))} min={10} max={100} step={5} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="animation">
                      <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider">Animation</AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <div>
                          <Label className="text-xs">Entrance animation</Label>
                          <Select value={selectedElement.animation.entrance} onValueChange={(value) => updateSelectedElement((element) => ({ ...element, animation: { ...element.animation, entrance: value as PopupCanvasElement["animation"]["entrance"] } }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="fade">Fade</SelectItem>
                              <SelectItem value="slide">Slide</SelectItem>
                              <SelectItem value="zoom">Zoom</SelectItem>
                              <SelectItem value="bounce">Bounce</SelectItem>
                              <SelectItem value="pulse">Pulse</SelectItem>
                              <SelectItem value="shimmer">Shimmer</SelectItem>
                              <SelectItem value="floating">Floating</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Hover animation</Label>
                          <Select value={selectedElement.animation.hover} onValueChange={(value) => updateSelectedElement((element) => ({ ...element, animation: { ...element.animation, hover: value as PopupHoverAnimation } }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {HOVER_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label className="text-xs">Delay (s)</Label>
                            <Input type="number" step="0.05" value={selectedElement.animation.delay} onChange={(event) => updateSelectedElement((element) => ({ ...element, animation: { ...element.animation, delay: Math.max(0, Number(event.target.value) || 0) } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Duration (s)</Label>
                            <Input type="number" step="0.05" value={selectedElement.animation.duration} onChange={(event) => updateSelectedElement((element) => ({ ...element, animation: { ...element.animation, duration: Math.max(0.1, Number(event.target.value) || 0.1) } }))} />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Easing</Label>
                          <Input value={selectedElement.animation.easing} onChange={(event) => updateSelectedElement((element) => ({ ...element, animation: { ...element.animation, easing: event.target.value } }))} placeholder="easeOut" />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
