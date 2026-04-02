import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import SliderField from "./SliderField";
import ColorPickerField from "./ColorPickerField";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface VisualEffectsControlsProps {
  content: Record<string, any>;
  patchContent: (key: string, value: any) => void;
}

const SHADOW_PRESETS = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra Large" },
  { value: "2xl", label: "2XL" },
  { value: "soft", label: "Soft Diffused" },
  { value: "hard", label: "Hard" },
  { value: "colored", label: "Colored" },
  { value: "layered", label: "Layered" },
  { value: "inset", label: "Inner Shadow" },
];

const GRADIENT_DIRECTIONS = [
  { value: "to right", label: "→ Right" },
  { value: "to left", label: "← Left" },
  { value: "to bottom", label: "↓ Down" },
  { value: "to top", label: "↑ Up" },
  { value: "to bottom right", label: "↘ Diagonal" },
  { value: "to top left", label: "↖ Diagonal" },
  { value: "135deg", label: "135°" },
  { value: "45deg", label: "45°" },
];

export default function VisualEffectsControls({ content, patchContent }: VisualEffectsControlsProps) {
  return (
    <div className="space-y-3">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Visual Effects</Label>

      <Accordion type="multiple" className="space-y-1">
        {/* Glassmorphism */}
        <AccordionItem value="glass" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Glassmorphism</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Enable Glass</Label>
              <Switch checked={content.glassEnabled ?? false} onCheckedChange={(v) => patchContent("glassEnabled", v)} />
            </div>
            {content.glassEnabled && (
              <>
                <SliderField label="Blur Strength" value={content.glassBlur ?? 16} onChange={(v) => patchContent("glassBlur", v)} min={4} max={64} step={2} />
                <SliderField label="Transparency" value={content.glassOpacity ?? 70} onChange={(v) => patchContent("glassOpacity", v)} min={10} max={95} step={5} unit="%" />
                <ColorPickerField label="Glass Tint" value={content.glassTint || ""} onChange={(v) => patchContent("glassTint", v)} />
                <div className="flex items-center justify-between">
                  <Label className="text-[10px]">Border Glow</Label>
                  <Switch checked={content.glassBorderGlow ?? false} onCheckedChange={(v) => patchContent("glassBorderGlow", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[10px]">Noise Texture</Label>
                  <Switch checked={content.glassNoise ?? false} onCheckedChange={(v) => patchContent("glassNoise", v)} />
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Glow & Neon */}
        <AccordionItem value="glow" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Glow & Neon</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Enable Glow</Label>
              <Switch checked={content.glowEnabled ?? false} onCheckedChange={(v) => patchContent("glowEnabled", v)} />
            </div>
            {content.glowEnabled && (
              <>
                <ColorPickerField label="Glow Color" value={content.glowColor || "hsl(217, 91%, 60%)"} onChange={(v) => patchContent("glowColor", v)} />
                <SliderField label="Glow Intensity" value={content.glowIntensity ?? 20} onChange={(v) => patchContent("glowIntensity", v)} min={5} max={80} step={5} />
                <SliderField label="Glow Spread" value={content.glowSpread ?? 30} onChange={(v) => patchContent("glowSpread", v)} min={10} max={100} step={5} />
                <div className="flex items-center justify-between">
                  <Label className="text-[10px]">Inner Glow</Label>
                  <Switch checked={content.glowInner ?? false} onCheckedChange={(v) => patchContent("glowInner", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[10px]">Animated Pulse</Label>
                  <Switch checked={content.glowAnimated ?? false} onCheckedChange={(v) => patchContent("glowAnimated", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[10px]">Neon Border</Label>
                  <Switch checked={content.neonBorder ?? false} onCheckedChange={(v) => patchContent("neonBorder", v)} />
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Gradient System */}
        <AccordionItem value="gradient" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Gradients</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Enable Gradient BG</Label>
              <Switch checked={content.gradientEnabled ?? false} onCheckedChange={(v) => patchContent("gradientEnabled", v)} />
            </div>
            {content.gradientEnabled && (
              <>
                <ColorPickerField label="Color 1" value={content.gradientColor1 || ""} onChange={(v) => patchContent("gradientColor1", v)} />
                <ColorPickerField label="Color 2" value={content.gradientColor2 || ""} onChange={(v) => patchContent("gradientColor2", v)} />
                <ColorPickerField label="Color 3 (optional)" value={content.gradientColor3 || ""} onChange={(v) => patchContent("gradientColor3", v)} />
                <div>
                  <Label className="text-[10px]">Direction</Label>
                  <Select value={content.gradientDirection || "to right"} onValueChange={(v) => patchContent("gradientDirection", v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRADIENT_DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[10px]">Animated</Label>
                  <Switch checked={content.gradientAnimated ?? false} onCheckedChange={(v) => patchContent("gradientAnimated", v)} />
                </div>
                {content.gradientAnimated && (
                  <SliderField label="Animation Speed" value={content.gradientSpeed ?? 5} onChange={(v) => patchContent("gradientSpeed", v)} min={2} max={30} step={1} unit="s" />
                )}
                <div className="flex items-center justify-between">
                  <Label className="text-[10px]">Gradient Border</Label>
                  <Switch checked={content.gradientBorder ?? false} onCheckedChange={(v) => patchContent("gradientBorder", v)} />
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Enhanced Shadow */}
        <AccordionItem value="shadow" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Shadow</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div>
              <Label className="text-[10px]">Shadow Preset</Label>
              <Select value={content.shadow || "none"} onValueChange={(v) => patchContent("shadow", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHADOW_PRESETS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {content.shadow && content.shadow !== "none" && (
              <>
                <ColorPickerField label="Shadow Color" value={content.shadowColor || ""} onChange={(v) => patchContent("shadowColor", v)} />
                <div className="flex items-center justify-between">
                  <Label className="text-[10px]">Grow on Hover</Label>
                  <Switch checked={content.shadowGrowOnHover ?? false} onCheckedChange={(v) => patchContent("shadowGrowOnHover", v)} />
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Decorative Effects */}
        <AccordionItem value="decorative" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Decorative</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Noise Overlay</Label>
              <Switch checked={content.noiseOverlay ?? false} onCheckedChange={(v) => patchContent("noiseOverlay", v)} />
            </div>
            {content.noiseOverlay && (
              <SliderField label="Noise Opacity" value={content.noiseOpacity ?? 5} onChange={(v) => patchContent("noiseOpacity", v)} min={1} max={30} step={1} unit="%" />
            )}
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Vignette</Label>
              <Switch checked={content.vignetteEnabled ?? false} onCheckedChange={(v) => patchContent("vignetteEnabled", v)} />
            </div>
            {content.vignetteEnabled && (
              <SliderField label="Vignette Strength" value={content.vignetteStrength ?? 30} onChange={(v) => patchContent("vignetteStrength", v)} min={10} max={80} step={5} unit="%" />
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
