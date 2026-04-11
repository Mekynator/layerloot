import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SliderField from "./SliderField";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useDesignSystemSafe } from "@/contexts/DesignSystemContext";
import {
  ENTRANCE_ANIMATION_OPTIONS,
  HOVER_EFFECT_OPTIONS,
  PRESS_EFFECT_OPTIONS,
  SCROLL_EFFECT_OPTIONS,
  GROUP_TIMELINE_OPTIONS,
  MOTION_SCOPE_OPTIONS,
  MOTION_EASING_OPTIONS,
  BUILT_IN_MOTION_PRESETS,
  extractMotionPresetSnapshot,
} from "@/lib/animation-system";

interface AnimationControlsProps {
  content: Record<string, any>;
  patchContent: (key: string, value: any) => void;
  title?: string;
  storageScope?: string;
}

const TRIGGER_OPTIONS = [
  { value: "onView", label: "When Visible" },
  { value: "onLoad", label: "On Page Load" },
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

interface SavedMotionPreset { id: string; name: string; values: Record<string, unknown> }

function loadSavedPresets(scope: string): SavedMotionPreset[] {
  try { return JSON.parse(localStorage.getItem(`ll-motion-presets-${scope}`) || "[]"); } catch { return []; }
}
function saveSavedPresets(scope: string, presets: SavedMotionPreset[]) {
  localStorage.setItem(`ll-motion-presets-${scope}`, JSON.stringify(presets));
}

export default function AnimationControls({ content, patchContent, title, storageScope = "default" }: AnimationControlsProps) {
  const { tokens } = useDesignSystemSafe();
  const [savedPresets, setSavedPresets] = useState<SavedMotionPreset[]>(() => loadSavedPresets(storageScope));
  const [newPresetName, setNewPresetName] = useState("");

  const allPresets = [
    { value: "none", label: "Custom" },
    ...Object.entries(tokens.animations.presets).map(([key, preset]) => ({ value: key, label: preset.label })),
    ...Object.entries(BUILT_IN_MOTION_PRESETS).map(([key, p]) => ({ value: key, label: p.label })),
    ...savedPresets.map((p) => ({ value: `saved:${p.id}`, label: `★ ${p.name}` })),
  ];

  const applyPreset = (preset: string) => {
    patchContent("animationPreset", preset);
    if (preset === "none") return;

    if (preset.startsWith("saved:")) {
      const sp = savedPresets.find((p) => `saved:${p.id}` === preset);
      if (sp) Object.entries(sp.values).forEach(([k, v]) => patchContent(k, v));
      return;
    }

    const builtIn = BUILT_IN_MOTION_PRESETS[preset];
    if (builtIn) { Object.entries(builtIn.values).forEach(([k, v]) => patchContent(k, v)); return; }

    const tokenPreset = tokens.animations.presets[preset as keyof typeof tokens.animations.presets];
    if (tokenPreset) Object.entries(tokenPreset).forEach(([k, v]) => patchContent(k, v));
  };

  const saveCurrentAsPreset = () => {
    const name = newPresetName.trim();
    if (!name) return;
    const snapshot = extractMotionPresetSnapshot(content);
    const preset: SavedMotionPreset = { id: crypto.randomUUID(), name, values: snapshot };
    const next = [...savedPresets, preset];
    setSavedPresets(next);
    saveSavedPresets(storageScope, next);
    patchContent("animationPreset", `saved:${preset.id}`);
    setNewPresetName("");
  };

  const deletePreset = (id: string) => {
    const next = savedPresets.filter((p) => p.id !== id);
    setSavedPresets(next);
    saveSavedPresets(storageScope, next);
    if (content.animationPreset === `saved:${id}`) patchContent("animationPreset", "none");
  };

  return (
    <div className="space-y-3">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{title || "Animation & Interaction"}</Label>

      {/* Presets */}
      <div>
        <Label className="text-[10px]">Preset</Label>
        <Select value={content.animationPreset || tokens.animations.defaultPreset || "none"} onValueChange={applyPreset}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {allPresets.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Save preset */}
      <div className="flex gap-1">
        <Input className="h-7 text-xs" placeholder="Save as preset…" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} />
        <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={saveCurrentAsPreset} disabled={!newPresetName.trim()}>Save</Button>
      </div>

      {savedPresets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {savedPresets.map((p) => (
            <button key={p.id} onClick={() => deletePreset(p.id)} className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground hover:bg-destructive/20 hover:text-destructive" title={`Delete "${p.name}"`}>
              ✕ {p.name}
            </button>
          ))}
        </div>
      )}

      <Accordion type="multiple" className="space-y-1">
        {/* Entrance Animation */}
        <AccordionItem value="entrance" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Entrance & Reveal</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div>
              <Label className="text-[10px]">Animation</Label>
              <Select value={content.animation || "none"} onValueChange={(v) => patchContent("animation", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTRANCE_ANIMATION_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {content.animation && content.animation !== "none" && (
              <>
                <SliderField label="Duration" value={content.animationDuration ?? 0.4} onChange={(v) => patchContent("animationDuration", v)} min={0.1} max={2} step={0.1} unit="s" />
                <SliderField label="Delay" value={content.animationDelay ?? 0} onChange={(v) => patchContent("animationDelay", v)} min={0} max={2} step={0.1} unit="s" />
                <SliderField label="Distance" value={content.animationDistance ?? 20} onChange={(v) => patchContent("animationDistance", v)} min={5} max={100} step={5} />
                <SliderField label="Start Opacity" value={content.startOpacity ?? 0} onChange={(v) => patchContent("startOpacity", v)} min={0} max={1} step={0.05} />
                <SliderField label="Viewport Threshold" value={content.viewportThreshold ?? 0.12} onChange={(v) => patchContent("viewportThreshold", v)} min={0} max={1} step={0.05} />
                <div>
                  <Label className="text-[10px]">Easing</Label>
                  <Select value={content.animationEasing || "ease"} onValueChange={(v) => patchContent("animationEasing", v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MOTION_EASING_OPTIONS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
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
                <div className="flex items-center justify-between">
                  <Label className="text-[10px]">Animate Once</Label>
                  <Switch checked={content.animateOnce !== false} onCheckedChange={(v) => patchContent("animateOnce", v)} />
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Hover Effects */}
        <AccordionItem value="hover" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Hover Interaction</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div>
              <Label className="text-[10px]">Effect</Label>
              <Select value={content.hoverEffect || "none"} onValueChange={(v) => patchContent("hoverEffect", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOVER_EFFECT_OPTIONS.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {content.hoverEffect && content.hoverEffect !== "none" && (
              <SliderField label="Intensity" value={content.hoverIntensity ?? 50} onChange={(v) => patchContent("hoverIntensity", v)} min={10} max={100} step={10} unit="%" />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Press Effects */}
        <AccordionItem value="press" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Click / Press Feedback</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div>
              <Label className="text-[10px]">Effect</Label>
              <Select value={content.pressEffect || "none"} onValueChange={(v) => patchContent("pressEffect", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESS_EFFECT_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {content.pressEffect && content.pressEffect !== "none" && (
              <SliderField label="Intensity" value={content.pressIntensity ?? 50} onChange={(v) => patchContent("pressIntensity", v)} min={10} max={100} step={10} unit="%" />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Scroll & Group */}
        <AccordionItem value="scroll-group" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Scroll & Group Timing</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div>
              <Label className="text-[10px]">Scroll Effect</Label>
              <Select value={content.scrollEffect || "none"} onValueChange={(v) => patchContent("scrollEffect", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCROLL_EFFECT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {content.scrollEffect === "parallax" && (
              <SliderField label="Parallax Depth" value={content.parallaxDepth ?? 30} onChange={(v) => patchContent("parallaxDepth", v)} min={5} max={100} step={5} unit="%" />
            )}
            <div>
              <Label className="text-[10px]">Group Reveal</Label>
              <Select value={content.groupReveal || "oneByOne"} onValueChange={(v) => patchContent("groupReveal", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUP_TIMELINE_OPTIONS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <SliderField label="Stagger Delay" value={content.staggerDelay ?? 0.04} onChange={(v) => patchContent("staggerDelay", v)} min={0} max={0.3} step={0.01} unit="s" />
          </AccordionContent>
        </AccordionItem>

        {/* Continuous Effects */}
        <AccordionItem value="continuous" className="rounded-md border border-border/30 px-2">
          <AccordionTrigger className="py-2 text-[10px] uppercase tracking-wider">Ambient Motion</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-2">
            <div>
              <Label className="text-[10px]">Effect</Label>
              <Select value={content.continuousEffect || "none"} onValueChange={(v) => patchContent("continuousEffect", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTINUOUS_EFFECTS.map(ce => <SelectItem key={ce.value} value={ce.value}>{ce.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {content.continuousEffect && content.continuousEffect !== "none" && (
              <SliderField label="Speed" value={content.continuousSpeed ?? 3} onChange={(v) => patchContent("continuousSpeed", v)} min={1} max={20} step={1} unit="s" />
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Motion Scope */}
      <div className="border-t border-border/20 pt-2">
        <Label className="text-[10px]">Motion Scope</Label>
        <Select value={content.motionScope || "all"} onValueChange={(v) => patchContent("motionScope", v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MOTION_SCOPE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Responsive */}
      <div className="flex items-center justify-between">
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

      {/* Preview button */}
      <Button variant="outline" size="sm" className="w-full text-[10px]" onClick={() => patchContent("_motionPreviewKey", Date.now())}>
        Preview Animation
      </Button>
    </div>
  );
}
