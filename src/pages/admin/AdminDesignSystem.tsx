import { useEffect, useMemo, useState } from "react";
import { LayoutTemplate, Palette, RefreshCw, Save, Sparkles, Type, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDesignSystem } from "@/contexts/DesignSystemContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ColorPickerField from "@/components/admin/editor/controls/ColorPickerField";
import {
  BUTTON_VARIANT_OPTIONS,
  DEFAULT_GLOBAL_DESIGN_SYSTEM,
  DESIGN_SYSTEM_COLOR_OPTIONS,
  FONT_OPTIONS,
  RADIUS_TOKEN_OPTIONS,
  type DesignAnimationPresetKey,
  type DesignTypographyPresetKey,
  type GlobalDesignSystem,
} from "@/types/design-system";

const ENTRANCE_OPTIONS = [
  { value: "fadeIn", label: "Fade In" },
  { value: "fadeUp", label: "Fade Up" },
  { value: "slideUp", label: "Slide Up" },
  { value: "slideLeft", label: "Slide Left" },
  { value: "scaleIn", label: "Scale In" },
  { value: "blurIn", label: "Blur In" },
  { value: "bounceIn", label: "Bounce In" },
];

const HOVER_OPTIONS = [
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "scale", label: "Scale" },
  { value: "glow", label: "Glow" },
  { value: "shadowGrow", label: "Shadow Grow" },
  { value: "brighten", label: "Brighten" },
];

const CONTINUOUS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "float", label: "Float" },
  { value: "pulse", label: "Pulse" },
  { value: "breathe", label: "Breathe" },
  { value: "shimmer", label: "Shimmer" },
];

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit = "px",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <span className="text-[11px] font-medium text-foreground">{value}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([next]) => onChange(next)} />
    </div>
  );
}

export default function AdminDesignSystem() {
  const { toast } = useToast();
  const { tokens, loading, previewTokens, saveTokens, resetTokens } = useDesignSystem();
  const [draft, setDraft] = useState<GlobalDesignSystem>(tokens);
  const [activeTypographyPreset, setActiveTypographyPreset] = useState<DesignTypographyPresetKey>("heading");
  const [activeAnimationPreset, setActiveAnimationPreset] = useState<DesignAnimationPresetKey>("modern");
  const selectedTypePreset = draft.typography.presets[activeTypographyPreset];
  const selectedAnimationPreset = draft.animations.presets[activeAnimationPreset];

  useEffect(() => {
    setDraft(tokens);
  }, [tokens]);

  useEffect(() => {
    previewTokens(draft);
  }, [draft, previewTokens]);

  useEffect(() => () => previewTokens(tokens), [previewTokens, tokens]);

  const patchSection = (section: keyof GlobalDesignSystem, key: string, value: any) => {
    setDraft((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, unknown>),
        [key]: value,
      },
    }));
  };

  const patchTypographyPreset = (key: keyof typeof selectedTypePreset, value: any) => {
    setDraft((prev) => ({
      ...prev,
      typography: {
        ...prev.typography,
        presets: {
          ...prev.typography.presets,
          [activeTypographyPreset]: {
            ...prev.typography.presets[activeTypographyPreset],
            [key]: value,
          },
        },
      },
    }));
  };

  const patchAnimationPreset = (key: keyof typeof selectedAnimationPreset, value: any) => {
    setDraft((prev) => ({
      ...prev,
      animations: {
        ...prev.animations,
        presets: {
          ...prev.animations.presets,
          [activeAnimationPreset]: {
            ...prev.animations.presets[activeAnimationPreset],
            [key]: value,
          },
        },
      },
    }));
  };

  const handleSave = async () => {
    const { error } = await saveTokens(draft);
    if (error) {
      toast({ title: "Could not save design system", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Design system saved", description: "Global brand tokens are now live across the site and editor." });
  };

  const handleReset = async () => {
    if (!window.confirm("Reset the global design system back to LayerLoot defaults?")) return;
    setDraft(DEFAULT_GLOBAL_DESIGN_SYSTEM);
    const { error } = await resetTokens();
    if (error) {
      toast({ title: "Could not reset design system", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Design system reset", description: "Default brand tokens have been restored." });
  };

  const previewBadge = useMemo(
    () => BUTTON_VARIANT_OPTIONS.find((option) => option.value === draft.buttons.defaultVariant)?.label || "Primary CTA",
    [draft.buttons.defaultVariant],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/30 bg-card/40 p-4 backdrop-blur-xl md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[var(--ll-shadow-sm)]">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground">Global Design System</h1>
              <p className="text-sm text-muted-foreground">Manage the shared brand tokens that drive the editor, campaigns, and storefront styling.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">Live preview</Badge>
            <Badge variant="outline">Default CTA: {previewBadge}</Badge>
            <Badge variant="outline">Campaign overrides still win when active</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Reset defaults
          </Button>
          <Button onClick={handleSave} className="gap-1.5">
            <Save className="h-4 w-4" /> Save design system
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Tabs defaultValue="colors" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="type">Typography</TabsTrigger>
            <TabsTrigger value="layout">Spacing</TabsTrigger>
            <TabsTrigger value="motion">Buttons & Motion</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4 text-primary" /> Brand color roles</CardTitle>
                <CardDescription>These feed the editor swatches, CTA styling, cards, and shared surfaces.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {DESIGN_SYSTEM_COLOR_OPTIONS.map((option) => (
                  <ColorPickerField
                    key={option.key}
                    label={option.label}
                    value={draft.colors[option.key]}
                    onChange={(value) => patchSection("colors", option.key, value)}
                    showGlobalTokens={false}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="type" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Type className="h-4 w-4 text-primary" /> Brand typography</CardTitle>
                <CardDescription>Set the shared font pairing and editor text presets.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Display font</Label>
                    <Select value={draft.typography.displayFont} onValueChange={(value) => patchSection("typography", "displayFont", value)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Body font</Label>
                    <Select value={draft.typography.bodyFont} onValueChange={(value) => patchSection("typography", "bodyFont", value)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SliderControl label="Base text size" value={draft.typography.baseSize} min={12} max={20} step={1} onChange={(value) => patchSection("typography", "baseSize", value)} />
                  <SliderControl label="Type scale" value={Number(draft.typography.scale.toFixed(2))} min={0.85} max={1.4} step={0.05} unit="×" onChange={(value) => patchSection("typography", "scale", value)} />
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Editor text preset</Label>
                    <Select value={activeTypographyPreset} onValueChange={(value) => setActiveTypographyPreset(value as DesignTypographyPresetKey)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(draft.typography.presets).map(([key, preset]) => (
                          <SelectItem key={key} value={key}>{preset.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Transform</Label>
                    <Select value={selectedTypePreset.textTransform} onValueChange={(value) => patchTypographyPreset("textTransform", value)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="uppercase">Uppercase</SelectItem>
                        <SelectItem value="capitalize">Capitalize</SelectItem>
                        <SelectItem value="lowercase">Lowercase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SliderControl label="Preset size" value={selectedTypePreset.fontSize} min={10} max={72} step={1} onChange={(value) => patchTypographyPreset("fontSize", value)} />
                  <SliderControl label="Preset weight" value={Number(selectedTypePreset.fontWeight)} min={300} max={800} step={100} unit="" onChange={(value) => patchTypographyPreset("fontWeight", String(value))} />
                  <SliderControl label="Line height" value={Number(selectedTypePreset.lineHeight.toFixed(1))} min={0.9} max={2} step={0.1} unit="×" onChange={(value) => patchTypographyPreset("lineHeight", value)} />
                  <SliderControl label="Letter spacing" value={selectedTypePreset.letterSpacing} min={0} max={4} step={0.1} unit="px" onChange={(value) => patchTypographyPreset("letterSpacing", value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><LayoutTemplate className="h-4 w-4 text-primary" /> Spacing and shape scale</CardTitle>
                <CardDescription>Use one visual rhythm for sections, cards, and editor surfaces.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <SliderControl label="XS spacing" value={draft.spacing.xs} min={0} max={40} step={2} onChange={(value) => patchSection("spacing", "xs", value)} />
                  <SliderControl label="SM spacing" value={draft.spacing.sm} min={0} max={60} step={2} onChange={(value) => patchSection("spacing", "sm", value)} />
                  <SliderControl label="MD spacing" value={draft.spacing.md} min={0} max={80} step={2} onChange={(value) => patchSection("spacing", "md", value)} />
                  <SliderControl label="LG spacing" value={draft.spacing.lg} min={0} max={120} step={4} onChange={(value) => patchSection("spacing", "lg", value)} />
                  <SliderControl label="XL spacing" value={draft.spacing.xl} min={0} max={160} step={4} onChange={(value) => patchSection("spacing", "xl", value)} />
                  <SliderControl label="Section spacing" value={draft.spacing.section} min={0} max={220} step={4} onChange={(value) => patchSection("spacing", "section", value)} />
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <SliderControl label="Subtle roundness" value={draft.radius.sm} min={0} max={40} step={1} onChange={(value) => patchSection("radius", "sm", value)} />
                  <SliderControl label="Soft roundness" value={draft.radius.md} min={0} max={60} step={1} onChange={(value) => patchSection("radius", "md", value)} />
                  <SliderControl label="Rounded cards" value={draft.radius.lg} min={0} max={80} step={2} onChange={(value) => patchSection("radius", "lg", value)} />
                  <SliderControl label="Showcase cards" value={draft.radius.xl} min={0} max={120} step={2} onChange={(value) => patchSection("radius", "xl", value)} />
                  <SliderControl label="Pill roundness" value={draft.radius.pill} min={60} max={999} step={10} onChange={(value) => patchSection("radius", "pill", value)} />
                  <div className="space-y-2">
                    <Label className="text-[11px] text-muted-foreground">Shadow tone</Label>
                    <ColorPickerField label="Shadow tint" value={draft.shadows.color} onChange={(value) => patchSection("shadows", "color", value)} showGlobalTokens={false} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <SliderControl label="Shadow opacity" value={draft.shadows.opacity} min={0} max={100} step={5} unit="%" onChange={(value) => patchSection("shadows", "opacity", value)} />
                  <SliderControl label="Shadow blur" value={draft.shadows.blur} min={8} max={80} step={2} onChange={(value) => patchSection("shadows", "blur", value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="motion" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Button language</CardTitle>
                <CardDescription>Pick the default CTA look used across editor-generated actions.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Default CTA style</Label>
                  <Select value={draft.buttons.defaultVariant} onValueChange={(value) => patchSection("buttons", "defaultVariant", value)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUTTON_VARIANT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Button roundness</Label>
                  <Select value={draft.buttons.radiusToken} onValueChange={(value) => patchSection("buttons", "radiusToken", value)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RADIUS_TOKEN_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/10 px-3 py-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Uppercase CTAs</Label>
                    <p className="text-[11px] text-muted-foreground/80">Give buttons the signature LayerLoot punch.</p>
                  </div>
                  <Switch checked={draft.buttons.uppercase} onCheckedChange={(value) => patchSection("buttons", "uppercase", value)} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/10 px-3 py-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Respect reduced motion</Label>
                    <p className="text-[11px] text-muted-foreground/80">Keep animations accessible by default.</p>
                  </div>
                  <Switch checked={draft.animations.reducedMotion} onCheckedChange={(value) => patchSection("animations", "reducedMotion", value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Wand2 className="h-4 w-4 text-primary" /> Shared animation presets</CardTitle>
                <CardDescription>These appear in the page editor motion controls for quick, on-brand movement.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Default preset</Label>
                    <Select value={draft.animations.defaultPreset} onValueChange={(value) => patchSection("animations", "defaultPreset", value)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(draft.animations.presets).map(([key, preset]) => (
                          <SelectItem key={key} value={key}>{preset.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Preset to edit</Label>
                    <Select value={activeAnimationPreset} onValueChange={(value) => setActiveAnimationPreset(value as DesignAnimationPresetKey)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(draft.animations.presets).map(([key, preset]) => (
                          <SelectItem key={key} value={key}>{preset.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Entrance</Label>
                    <Select value={selectedAnimationPreset.animation} onValueChange={(value) => patchAnimationPreset("animation", value)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ENTRANCE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Hover effect</Label>
                    <Select value={selectedAnimationPreset.hoverEffect} onValueChange={(value) => patchAnimationPreset("hoverEffect", value)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HOVER_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Ambient motion</Label>
                    <Select value={selectedAnimationPreset.continuousEffect || "none"} onValueChange={(value) => patchAnimationPreset("continuousEffect", value)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTINUOUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <SliderControl label="Duration" value={Number(selectedAnimationPreset.animationDuration.toFixed(1))} min={0.1} max={2} step={0.1} unit="s" onChange={(value) => patchAnimationPreset("animationDuration", value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Live brand preview</CardTitle>
              <CardDescription>What your current global system feels like across headers, surfaces, and CTAs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[calc(var(--ll-radius-xl)+2px)] border border-border/40 bg-background-secondary/40 p-4 shadow-[var(--ll-shadow-soft)]">
                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-primary">LayerLoot design kit</p>
                <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-foreground">Premium builder styling</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">The editor, campaigns, and storefront now share the same token-driven visual language.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant={draft.buttons.defaultVariant}>Primary action</Button>
                  <Button variant="outline">Secondary outline</Button>
                  <Button variant="ghost">Ghost minimal</Button>
                  <Button variant="luxury">Luxury glow</Button>
                  <Button variant="pill">Pill CTA</Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {DESIGN_SYSTEM_COLOR_OPTIONS.slice(0, 4).map((option) => (
                  <div key={option.key} className="rounded-xl border border-border/30 p-3">
                    <div className="mb-2 h-12 rounded-lg border border-border/20" style={{ background: draft.colors[option.key] }} />
                    <p className="text-xs font-medium text-foreground">{option.label}</p>
                    <p className="text-[11px] text-muted-foreground">{draft.colors[option.key]}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">How it connects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Page editor color pickers now expose your saved brand swatches.</p>
              <p>• Section shadows, card surfaces, and CTA styling inherit the same system.</p>
              <p>• Campaign theme overrides can temporarily shift primary/accent styling during promotions.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading saved design tokens…</p>}
    </div>
  );
}
