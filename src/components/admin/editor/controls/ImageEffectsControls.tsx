import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SliderField from "./SliderField";
import ColorPickerField from "./ColorPickerField";

interface ImageEffectsControlsProps {
  content: Record<string, any>;
  patchContent: (key: string, value: any) => void;
}

const FIT_OPTIONS = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain (Fit)" },
  { value: "fill", label: "Stretch" },
  { value: "repeat", label: "Repeat / Tile" },
];

const POSITION_X = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const POSITION_Y = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
];

const BLEND_MODES = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "color-dodge", label: "Color Dodge" },
  { value: "color-burn", label: "Color Burn" },
  { value: "soft-light", label: "Soft Light" },
  { value: "hard-light", label: "Hard Light" },
  { value: "luminosity", label: "Luminosity" },
];

export default function ImageEffectsControls({ content, patchContent }: ImageEffectsControlsProps) {
  const hasImage = content.backgroundImage || content.bg_image;
  if (!hasImage) return null;

  return (
    <div className="space-y-3 border-t border-border/20 pt-3">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Image Controls</Label>

      {/* Fit Mode */}
      <div>
        <Label className="text-[10px]">Image Fit</Label>
        <Select value={content.bgImageFit || "cover"} onValueChange={(v) => patchContent("bgImageFit", v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FIT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Horizontal</Label>
          <Select value={content.bgImagePositionX || "center"} onValueChange={(v) => patchContent("bgImagePositionX", v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {POSITION_X.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Vertical</Label>
          <Select value={content.bgImagePositionY || "center"} onValueChange={(v) => patchContent("bgImagePositionY", v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {POSITION_Y.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Blend Mode */}
      <div>
        <Label className="text-[10px]">Blend Mode</Label>
        <Select value={content.bgImageBlendMode || "normal"} onValueChange={(v) => patchContent("bgImageBlendMode", v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {BLEND_MODES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Opacity */}
      <SliderField label="Image Opacity" value={content.bgImageOpacity ?? 100} onChange={(v) => patchContent("bgImageOpacity", v)} min={0} max={100} step={5} unit="%" />

      {/* Filters */}
      <div className="space-y-2 border-t border-border/20 pt-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Image Filters</Label>
        <SliderField label="Blur" value={content.bgImageBlur ?? 0} onChange={(v) => patchContent("bgImageBlur", v)} min={0} max={40} step={1} />
        <SliderField label="Brightness" value={content.bgImageBrightness ?? 100} onChange={(v) => patchContent("bgImageBrightness", v)} min={0} max={200} step={5} unit="%" />
        <SliderField label="Contrast" value={content.bgImageContrast ?? 100} onChange={(v) => patchContent("bgImageContrast", v)} min={0} max={200} step={5} unit="%" />
        <SliderField label="Saturation" value={content.bgImageSaturation ?? 100} onChange={(v) => patchContent("bgImageSaturation", v)} min={0} max={200} step={5} unit="%" />
        <SliderField label="Grayscale" value={content.bgImageGrayscale ?? 0} onChange={(v) => patchContent("bgImageGrayscale", v)} min={0} max={100} step={5} unit="%" />
        <SliderField label="Sepia" value={content.bgImageSepia ?? 0} onChange={(v) => patchContent("bgImageSepia", v)} min={0} max={100} step={5} unit="%" />
      </div>

      {/* Tint */}
      <div className="space-y-2 border-t border-border/20 pt-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Color Tint</Label>
        <ColorPickerField label="Tint Color" value={content.bgImageTintColor || ""} onChange={(v) => patchContent("bgImageTintColor", v)} />
        {content.bgImageTintColor && (
          <SliderField label="Tint Strength" value={content.bgImageTintOpacity ?? 0} onChange={(v) => patchContent("bgImageTintOpacity", v)} min={0} max={80} step={5} unit="%" />
        )}
      </div>
    </div>
  );
}
