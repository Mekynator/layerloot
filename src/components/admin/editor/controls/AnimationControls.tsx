import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import SliderField from "./SliderField";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface AnimationControlsProps {
  content: Record<string, any>;
  patchContent: (key: string, value: any) => void;
}

const ENTRANCE_ANIMATIONS = [
  { value: "none", label: "None" },
  { value: "fadeUp", label: "Fade Up" },
  { value: "fadeDown", label: "Fade Down" },
  { value: "fadeIn", label: "Fade In" },
  { value: "fadeLeft", label: "Fade from Left" },
  { value: "fadeRight", label: "Fade from Right" },
  { value: "slideUp", label: "Slide Up" },
  { value: "slideDown", label: "Slide Down" },
  { value: "slideLeft", label: "Slide Left" },
  { value: "slideRight", label: "Slide Right" },
  { value: "scaleIn", label: "Scale In" },
  { value: "scaleUp", label: "Scale Up" },
  { value: "rotateIn", label: "Rotate In" },
  { value: "blurIn", label: "Blur In" },
  { value: "flipIn", label: "Flip In" },
  { value: "bounceIn", label: "Bounce In" },
];

const EASING_OPTIONS = [
  { value: "ease", label: "Ease" },
  { value: "easeIn", label: "Ease In" },
  { value: "easeOut", label: "Ease Out" },
  { value: "easeInOut", label: "Ease In Out" },
  { value: "spring", label: "Spring" },
  { value: "bounce", label: "Bounce" },
];

const TRIGGER_OPTIONS = [
  { value: "onView", label: "When Visible" },
  { value: "onLoad", label: "On Page Load" },
];

const HOVER_EFFECTS = [
  { value: "none", label: "None" },
  { value: "lift", label: "Lift Up" },
  { value: "scale", label: "Scale Up" },
  { value: "glow", label: "Glow" },
  { value: "shadowGrow", label: "Shadow Grow" },
  { value: "borderHighlight", label: "Border Highlight" },
  { value: "imageZoom", label: "Image Zoom" },
  { value: "tiltX", label: "Tilt" },
  { value: "colorShift", label: "Color Shift" },
  { value: "brighten", label: "Brighten" },
];

const CONTINUOUS_EFFECTS = [
  { value: "none", label: "None" },
  { value: "float", label: "Float" },
  { value: "pulse", label: "Pulse" },
  { value: "breathe", label: "Breathe" },
  { value: "rotate", label: "Slow Rotate" },
  { value: "shimmer", label: "Shimmer" },
  { value: "gradientMove", label: "Gradient Flow" },
];

const SCROLL_EFFECTS = [
  { value: "none", label: "None" },
  { value: "parallax", label: "Parallax" },
  { value: "fadeOnScroll", label: "Fade on Scroll" },
  { value: "revealOnScroll", label: "Reveal on Scroll" },
  { value: "scaleOnScroll", label: "Scale on Scroll" },
];

const PRESETS = [
  { value: "none", label: "Custom" },
  { value: "subtle", label: "Subtle" },
  { value: "modern", label: "Modern" },
  { value: "premium", label: "Premium" },
  { value: "playful", label: "Playful" },
  { value: "cinematic", label: "Cinematic" },
];

const PRESET_VALUES: Record<string, Partial<Record<string, any>>> = {
  subtle: { animation: "fadeIn", animationDuration: 0.5, hoverEffect: "lift" },
  modern: { animation: "fadeUp", animationDuration: 0.4, hoverEffect: "scale", continuousEffect: "none" },
  premium: { animation: "blurIn", animationDuration: 0.6, hoverEffect: "glow", continuousEffect: "shimmer" },
  playful: { animation: "bounceIn", animationDuration: 0.5, hoverEffect: "scale", continuousEffect: "float" },
  cinematic: { animation: "scaleIn", animationDuration: 0.8, hoverEffect: "shadowGrow", continuousEffect: "breathe" },
};

export default function AnimationControls({ content, patchContent }: AnimationControlsProps) {
  const applyPreset = (preset: string) => {
    patchContent("animationPreset", preset);
    const values = PRESET_VALUES[preset];
    if (values) {
      Object.entries(values).forEach(([k, v]) => patchContent(k, v));
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Animation & Motion</Label>

      {/* Presets */}
      <div>
        <Label className="text-[10px]">Preset</Label>
        <Select value={content.animationPreset || "none"} onValueChange={applyPreset}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Accordion type="multiple" className="space-y-1">
        {/* Entrance Animation */}
        <AccordionItem value="entrance" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Entrance</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div>
              <Label className="text-[10px]">Animation</Label>
              <Select value={content.animation || "none"} onValueChange={(v) => patchContent("animation", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTRANCE_ANIMATIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {content.animation && content.animation !== "none" && (
              <>
                <SliderField label="Duration" value={content.animationDuration ?? 0.4} onChange={(v) => patchContent("animationDuration", v)} min={0.1} max={2} step={0.1} unit="s" />
                <SliderField label="Delay" value={content.animationDelay ?? 0} onChange={(v) => patchContent("animationDelay", v)} min={0} max={2} step={0.1} unit="s" />
                <div>
                  <Label className="text-[10px]">Easing</Label>
                  <Select value={content.animationEasing || "ease"} onValueChange={(v) => patchContent("animationEasing", v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EASING_OPTIONS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Trigger</Label>
                  <Select value={content.animationTrigger || "onView"} onValueChange={(v) => patchContent("animationTrigger", v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIGGER_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <SliderField label="Distance" value={content.animationDistance ?? 20} onChange={(v) => patchContent("animationDistance", v)} min={5} max={100} step={5} />
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Hover Effects */}
        <AccordionItem value="hover" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Hover Effect</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div>
              <Label className="text-[10px]">Effect</Label>
              <Select value={content.hoverEffect || "none"} onValueChange={(v) => patchContent("hoverEffect", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOVER_EFFECTS.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {content.hoverEffect && content.hoverEffect !== "none" && (
              <SliderField label="Intensity" value={content.hoverIntensity ?? 50} onChange={(v) => patchContent("hoverIntensity", v)} min={10} max={100} step={10} unit="%" />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Continuous Effects */}
        <AccordionItem value="continuous" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Continuous Motion</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div>
              <Label className="text-[10px]">Effect</Label>
              <Select value={content.continuousEffect || "none"} onValueChange={(v) => patchContent("continuousEffect", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTINUOUS_EFFECTS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {content.continuousEffect && content.continuousEffect !== "none" && (
              <SliderField label="Speed" value={content.continuousSpeed ?? 3} onChange={(v) => patchContent("continuousSpeed", v)} min={1} max={20} step={1} unit="s" />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Scroll Effects */}
        <AccordionItem value="scroll" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Scroll Effect</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div>
              <Label className="text-[10px]">Effect</Label>
              <Select value={content.scrollEffect || "none"} onValueChange={(v) => patchContent("scrollEffect", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCROLL_EFFECTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {content.scrollEffect === "parallax" && (
              <SliderField label="Parallax Depth" value={content.parallaxDepth ?? 30} onChange={(v) => patchContent("parallaxDepth", v)} min={5} max={100} step={5} unit="%" />
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Responsive */}
      <div className="flex items-center justify-between border-t border-border/20 pt-2">
        <div>
          <Label className="text-[10px]">Disable on Mobile</Label>
          <p className="text-[9px] text-muted-foreground">Better performance</p>
        </div>
        <Switch checked={content.disableAnimOnMobile ?? false} onCheckedChange={(v) => patchContent("disableAnimOnMobile", v)} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-[10px]">Reduced Motion</Label>
        <Switch checked={content.respectReducedMotion ?? true} onCheckedChange={(v) => patchContent("respectReducedMotion", v)} />
      </div>
    </div>
  );
}
