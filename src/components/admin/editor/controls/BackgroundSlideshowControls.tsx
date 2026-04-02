import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import SliderField from "./SliderField";
import ColorPickerField from "./ColorPickerField";
import ImageUploadField from "./ImageUploadField";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Trash2, Plus } from "lucide-react";

interface BackgroundSlideshowControlsProps {
  content: Record<string, any>;
  patchContent: (key: string, value: any) => void;
}

const TRANSITION_STYLES = [
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
  { value: "crossfade", label: "Crossfade" },
];

const FIT_OPTIONS = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Fit" },
  { value: "fill", label: "Stretch" },
  { value: "center", label: "Center Crop" },
  { value: "repeat", label: "Repeat" },
];

const POSITION_OPTIONS = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

const MOTION_EFFECTS = [
  { value: "none", label: "None" },
  { value: "slowZoom", label: "Slow Zoom" },
  { value: "kenBurns", label: "Ken Burns" },
  { value: "parallax", label: "Parallax" },
  { value: "drift", label: "Subtle Drift" },
  { value: "float", label: "Floating" },
];

const BLEND_MODES = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
];

export default function BackgroundSlideshowControls({ content, patchContent }: BackgroundSlideshowControlsProps) {
  const slideshow = content._slideshow || {};
  const images: string[] = slideshow.images || [];

  const patchSlideshow = (key: string, value: any) => {
    patchContent("_slideshow", { ...slideshow, [key]: value });
  };

  const setImages = (newImages: string[]) => {
    patchSlideshow("images", newImages);
  };

  const addImage = (url: string) => {
    if (url) setImages([...images, url]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, dir: -1 | 1) => {
    const next = [...images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Background Slideshow</Label>
        <Switch
          checked={slideshow.enabled ?? false}
          onCheckedChange={(v) => patchSlideshow("enabled", v)}
        />
      </div>

      {slideshow.enabled && (
        <div className="space-y-3">
          {/* Images */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Images ({images.length})</Label>
            </div>

            {images.map((src, i) => (
              <div key={`${src}-${i}`} className="flex items-center gap-1.5 rounded-md border border-border/30 p-1">
                <img src={src} alt="" className="h-8 w-12 rounded object-cover" />
                <span className="flex-1 truncate text-[9px] text-muted-foreground">{src.split("/").pop()}</span>
                <button onClick={() => moveImage(i, -1)} disabled={i === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button onClick={() => removeImage(i)} className="p-0.5 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}

            <ImageUploadField
              label="Add Slideshow Image"
              value=""
              onChange={(url) => addImage(url)}
            />
          </div>

          {/* Slideshow Settings */}
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Autoplay</Label>
            <Switch checked={slideshow.autoplay !== false} onCheckedChange={(v) => patchSlideshow("autoplay", v)} />
          </div>

          <SliderField
            label="Timer Duration"
            value={slideshow.interval ?? 5}
            onChange={(v) => patchSlideshow("interval", v)}
            min={1} max={30} step={0.5} unit="s"
          />

          <SliderField
            label="Transition Duration"
            value={slideshow.transitionDuration ?? 800}
            onChange={(v) => patchSlideshow("transitionDuration", v)}
            min={200} max={3000} step={100} unit="ms"
          />

          <div>
            <Label className="text-[10px]">Transition Style</Label>
            <Select value={slideshow.transition || "fade"} onValueChange={(v) => patchSlideshow("transition", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRANSITION_STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Loop</Label>
            <Switch checked={slideshow.loop !== false} onCheckedChange={(v) => patchSlideshow("loop", v)} />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Random Order</Label>
            <Switch checked={slideshow.random ?? false} onCheckedChange={(v) => patchSlideshow("random", v)} />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Pause on Hover</Label>
            <Switch checked={slideshow.pauseOnHover ?? false} onCheckedChange={(v) => patchSlideshow("pauseOnHover", v)} />
          </div>

          {/* Image Fit */}
          <div>
            <Label className="text-[10px]">Image Fit</Label>
            <Select value={slideshow.fit || "cover"} onValueChange={(v) => patchSlideshow("fit", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div>
            <Label className="text-[10px]">Position</Label>
            <Select value={slideshow.position || "center"} onValueChange={(v) => patchSlideshow("position", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {POSITION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Background Effects */}
          <div className="space-y-2 pt-2 border-t border-border/20">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Effects</Label>

            <SliderField label="Blur" value={slideshow.blur ?? 0} onChange={(v) => patchSlideshow("blur", v)} min={0} max={40} step={1} />
            <SliderField label="Brightness" value={slideshow.brightness ?? 100} onChange={(v) => patchSlideshow("brightness", v)} min={0} max={200} step={5} unit="%" />
            <SliderField label="Contrast" value={slideshow.contrast ?? 100} onChange={(v) => patchSlideshow("contrast", v)} min={0} max={200} step={5} unit="%" />
            <SliderField label="Saturation" value={slideshow.saturation ?? 100} onChange={(v) => patchSlideshow("saturation", v)} min={0} max={200} step={5} unit="%" />
            <SliderField label="Opacity" value={slideshow.opacity ?? 100} onChange={(v) => patchSlideshow("opacity", v)} min={0} max={100} step={5} unit="%" />

            <div>
              <Label className="text-[10px]">Blend Mode</Label>
              <Select value={slideshow.blendMode || "normal"} onValueChange={(v) => patchSlideshow("blendMode", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLEND_MODES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <ColorPickerField label="Color Tint" value={slideshow.tintColor || ""} onChange={(v) => patchSlideshow("tintColor", v)} />
            <SliderField label="Tint Opacity" value={slideshow.tintOpacity ?? 0} onChange={(v) => patchSlideshow("tintOpacity", v)} min={0} max={80} step={5} unit="%" />

            <ColorPickerField label="Gradient Overlay Start" value={slideshow.gradientStart || ""} onChange={(v) => patchSlideshow("gradientStart", v)} />
            <ColorPickerField label="Gradient Overlay End" value={slideshow.gradientEnd || ""} onChange={(v) => patchSlideshow("gradientEnd", v)} />
            <SliderField label="Gradient Opacity" value={slideshow.gradientOpacity ?? 0} onChange={(v) => patchSlideshow("gradientOpacity", v)} min={0} max={100} step={5} unit="%" />
          </div>

          {/* Motion Effects */}
          <div className="space-y-2 pt-2 border-t border-border/20">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Motion</Label>
            <div>
              <Label className="text-[10px]">Motion Effect</Label>
              <Select value={slideshow.motionEffect || "none"} onValueChange={(v) => patchSlideshow("motionEffect", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOTION_EFFECTS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <SliderField label="Motion Speed" value={slideshow.motionSpeed ?? 12} onChange={(v) => patchSlideshow("motionSpeed", v)} min={2} max={60} step={2} unit="s" />
          </div>
        </div>
      )}
    </div>
  );
}
