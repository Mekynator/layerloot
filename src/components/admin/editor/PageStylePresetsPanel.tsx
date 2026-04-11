import { useEffect, useMemo, useState } from "react";
import { Copy, Heart, Pencil, RefreshCw, Save, Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface PageStylePreset {
  id: string;
  name: string;
  isFavorite?: boolean;
  isDefault?: boolean;
  styles: Record<string, unknown>;
}

interface PageStylePresetsPanelProps {
  blockType: string;
  content: Record<string, unknown>;
  onApplyPatch: (patch: Record<string, unknown>) => void;
}

const STORAGE_KEY = "page_editor_style_presets";
const STYLE_KEYS = [
  "backgroundColor",
  "textColor",
  "backgroundImage",
  "overlayColor",
  "overlayOpacity",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "marginTop",
  "marginBottom",
  "gap",
  "sectionWidth",
  "minHeight",
  "opacity",
  "borderWidth",
  "borderStyle",
  "borderColor",
  "borderRadius",
  "shadow",
  "shadowColor",
  "gradientEnabled",
  "gradientColor1",
  "gradientColor2",
  "gradientColor3",
  "gradientDirection",
  "gradientAnimated",
  "glassEnabled",
  "glassBlur",
  "glassOpacity",
  "glowEnabled",
  "glowColor",
  "glowIntensity",
  "layoutMode",
  "columns",
  "alignment",
  "verticalAlignment",
  "tileLayoutMode",
  "tileGridColumns",
  "tileSpacing",
  "customClassName",
] as const;

const DEFAULT_PRESETS: PageStylePreset[] = [
  {
    id: "preset-soft-glass",
    name: "Soft Glass",
    isDefault: true,
    styles: {
      backgroundColor: "rgba(255,255,255,0.7)",
      borderRadius: 24,
      glassEnabled: true,
      glassBlur: 16,
      glassOpacity: 72,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "rgba(148,163,184,0.25)",
      shadow: "soft",
      paddingTop: 48,
      paddingBottom: 48,
    },
  },
  {
    id: "preset-gradient-hero",
    name: "Gradient Hero",
    isFavorite: true,
    styles: {
      gradientEnabled: true,
      gradientColor1: "#312e81",
      gradientColor2: "#7c3aed",
      gradientColor3: "#22d3ee",
      gradientDirection: "135deg",
      gradientAnimated: true,
      textColor: "#ffffff",
      paddingTop: 72,
      paddingBottom: 72,
      sectionWidth: "wide",
      shadow: "xl",
      borderRadius: 28,
    },
  },
  {
    id: "preset-minimal-section",
    name: "Minimal Section",
    styles: {
      backgroundColor: "transparent",
      textColor: "hsl(var(--foreground))",
      borderWidth: 0,
      borderRadius: 0,
      paddingTop: 32,
      paddingBottom: 32,
      shadow: "none",
      sectionWidth: "default",
    },
  },
];

const dedupePresets = (presets: PageStylePreset[]) => {
  const seen = new Set<string>();
  return presets.filter((preset) => {
    if (seen.has(preset.id)) return false;
    seen.add(preset.id);
    return true;
  });
};

const extractStylePayload = (content: Record<string, unknown>) => STYLE_KEYS.reduce<Record<string, unknown>>((acc, key) => {
  const value = content[key];
  if (value !== undefined && value !== "") {
    acc[key] = value;
  }
  return acc;
}, {});

export default function PageStylePresetsPanel({ blockType, content, onApplyPatch }: PageStylePresetsPanelProps) {
  const [presets, setPresets] = useState<PageStylePreset[]>(DEFAULT_PRESETS);
  const [loading, setLoading] = useState(true);
  const [activePresetId, setActivePresetId] = useState<string>(DEFAULT_PRESETS[0]?.id ?? "");
  const [newPresetName, setNewPresetName] = useState("");

  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === activePresetId) ?? presets[0] ?? null,
    [activePresetId, presets],
  );

  const persistPresets = async (nextPresets: PageStylePreset[]) => {
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", STORAGE_KEY).maybeSingle();
    if (existing) {
      await supabase.from("site_settings").update({ value: nextPresets as any }).eq("key", STORAGE_KEY);
    } else {
      await supabase.from("site_settings").insert({ key: STORAGE_KEY, value: nextPresets as any });
    }
  };

  useEffect(() => {
    const loadPresets = async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", STORAGE_KEY).maybeSingle();
      const stored = Array.isArray(data?.value) ? (data?.value as PageStylePreset[]) : [];
      const merged = dedupePresets([...DEFAULT_PRESETS, ...stored]);
      setPresets(merged);
      setActivePresetId(merged[0]?.id ?? "");
      setLoading(false);
    };

    loadPresets();
  }, []);

  const applyPreset = (presetId: string) => {
    setActivePresetId(presetId);
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    onApplyPatch({ ...preset.styles });
    toast.success(`Applied \"${preset.name}\" preset`);
  };

  const saveCurrentAsPreset = async () => {
    const name = (newPresetName || `${blockType.replace(/_/g, " ")} preset`).trim();
    const existingPreset = presets.find((preset) => preset.name.toLowerCase() === name.toLowerCase());

    if (existingPreset) {
      const shouldOverwrite = window.confirm(`A preset named "${name}" already exists. Overwrite it with the current styles?`);
      if (!shouldOverwrite) return;
      const next = presets.map((preset) => preset.id === existingPreset.id ? { ...preset, styles: extractStylePayload(content) } : preset);
      setPresets(next);
      setActivePresetId(existingPreset.id);
      setNewPresetName("");
      await persistPresets(next);
      toast.success(`Updated "${name}" preset`);
      return;
    }

    const preset: PageStylePreset = {
      id: `page-style-${Date.now()}`,
      name,
      styles: extractStylePayload(content),
    };
    const next = [...presets, preset];
    setPresets(next);
    setActivePresetId(preset.id);
    setNewPresetName("");
    await persistPresets(next);
    toast.success(`Saved "${name}" preset`);
  };

  const renamePreset = async () => {
    if (!activePreset) return;
    const nextName = window.prompt("Rename preset", activePreset.name)?.trim();
    if (!nextName) return;
    const next = presets.map((preset) => preset.id === activePreset.id ? { ...preset, name: nextName } : preset);
    setPresets(next);
    await persistPresets(next);
    toast.success(`Renamed preset to "${nextName}"`);
  };

  const duplicatePreset = async () => {
    if (!activePreset) return;
    const copyPreset = {
      ...activePreset,
      id: `page-style-${Date.now()}`,
      name: `${activePreset.name} Copy`,
      isDefault: false,
    };
    const next = [...presets, copyPreset];
    setPresets(next);
    setActivePresetId(copyPreset.id);
    await persistPresets(next);
    toast.success(`Duplicated "${activePreset.name}" preset`);
  };

  const deletePreset = async () => {
    if (!activePreset || DEFAULT_PRESETS.some((preset) => preset.id === activePreset.id)) return;
    const shouldDelete = window.confirm(`Delete the preset "${activePreset.name}"? This cannot be undone.`);
    if (!shouldDelete) return;
    const next = presets.filter((preset) => preset.id !== activePreset.id);
    setPresets(next);
    setActivePresetId(next[0]?.id ?? "");
    await persistPresets(next);
    toast.success(`Deleted "${activePreset.name}" preset`);
  };

  const toggleFavorite = async () => {
    if (!activePreset) return;
    const next = presets.map((preset) => preset.id === activePreset.id ? { ...preset, isFavorite: !preset.isFavorite } : preset);
    setPresets(next);
    await persistPresets(next);
    toast.success(activePreset.isFavorite ? "Removed from favorites" : "Marked as favorite");
  };

  const markDefault = async () => {
    if (!activePreset) return;
    const next = presets.map((preset) => ({ ...preset, isDefault: preset.id === activePreset.id }));
    setPresets(next);
    await persistPresets(next);
    toast.success(`Set "${activePreset.name}" as the default preset`);
  };

  if (loading) {
    return <div className="rounded-lg border border-border/30 p-3 text-xs text-muted-foreground animate-pulse">Loading style presets...</div>;
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/30 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Style presets</p>
          <p className="text-[11px] text-muted-foreground">Save and reuse layout + section style combinations across pages.</p>
        </div>
        {activePreset?.isFavorite && <Badge variant="outline" className="text-[10px] text-amber-500">Favorite</Badge>}
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Apply preset</Label>
        <Select value={activePresetId} onValueChange={applyPreset}>
          <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>{preset.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Input value={newPresetName} onChange={(event) => setNewPresetName(event.target.value)} placeholder="Preset name" className="h-8 text-xs" />
        <Button type="button" variant="outline" size="sm" onClick={() => void saveCurrentAsPreset()}>
          <Save className="mr-1 h-3.5 w-3.5" /> Save
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void duplicatePreset()} disabled={!activePreset}><Copy className="mr-1 h-3.5 w-3.5" /> Duplicate</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void saveCurrentAsPreset()} disabled={!activePreset}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Save / overwrite</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void renamePreset()} disabled={!activePreset}><Pencil className="mr-1 h-3.5 w-3.5" /> Rename</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void toggleFavorite()} disabled={!activePreset}><Heart className="mr-1 h-3.5 w-3.5" /> Favorite</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void markDefault()} disabled={!activePreset}><Star className="mr-1 h-3.5 w-3.5" /> Default</Button>
        <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => void deletePreset()} disabled={!activePreset || DEFAULT_PRESETS.some((preset) => preset.id === activePreset.id)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
      </div>
    </div>
  );
}
