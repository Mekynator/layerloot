import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SliderField from "./SliderField";
import ColorPickerField from "./ColorPickerField";

interface ImageEffectsControlsProps {
  content: Record<string, any>;
  patchContent: (key: string, value: any) => void;
}

const FIT_OPTIONS = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Fill" },
  { value: "none", label: "None" },
  { value: "repeat", label: "Repeat / Tile" },
];

const SHADOW_OPTIONS = [
  { value: "none", label: "None" },
  { value: "sm", label: "Soft" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Strong" },
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
  const hasBackgroundImage = Boolean(content.backgroundImage || content.bg_image);
  const hasDirectImage = Boolean(content.image_url || content.poster_image);
  if (!hasBackgroundImage && !hasDirectImage) return null;

  const fitKey = hasBackgroundImage ? "bgImageFit" : "imageFit";
  const posXKey = hasBackgroundImage ? "bgImagePositionX" : "imagePositionX";
  const posYKey = hasBackgroundImage ? "bgImagePositionY" : "imagePositionY";
  const opacityKey = hasBackgroundImage ? "bgImageOpacity" : "imageOpacity";
  const shadowKey = hasBackgroundImage ? "shadow" : "imageShadow";

  return (
    <div className="space-y-3 border-t border-border/20 pt-3">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Image controls</Label>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Fit</Label>
          <Select value={String(content[fitKey] || (hasBackgroundImage ? "cover" : "contain"))} onValueChange={(v) => patchContent(fitKey, v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Shadow strength</Label>
          <Select value={String(content[shadowKey] || "none")} onValueChange={(v) => patchContent(shadowKey, v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SHADOW_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Horizontal</Label>
          <Select value={String(content[posXKey] || "center")} onValueChange={(v) => patchContent(posXKey, v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {POSITION_X.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Vertical</Label>
          <Select value={String(content[posYKey] || "center")} onValueChange={(v) => patchContent(posYKey, v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {POSITION_Y.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <SliderField label="Opacity" value={Number(content[opacityKey] ?? 100)} onChange={(v) => patchContent(opacityKey, v)} min={0} max={100} step={5} unit="%" />

      {!hasBackgroundImage && (
        <>
          <SliderField label="Roundness" value={Number(content.imageBorderRadius ?? 16)} onChange={(v) => patchContent("imageBorderRadius", v)} min={0} max={48} step={2} unit="px" />
          <div>
            <Label className="text-[10px]">Alt text</Label>
            <Input
              value={String(content.alt || "")}
              onChange={(e) => patchContent("alt", e.target.value)}
              className="h-7 text-xs"
              placeholder="Describe the image for accessibility"
            />
          </div>
        </>
      )}

      {hasBackgroundImage && (
        <>
          <div>
            <Label className="text-[10px]">Blend mode</Label>
            <Select value={String(content.bgImageBlendMode || "normal")} onValueChange={(v) => patchContent("bgImageBlendMode", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BLEND_MODES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 border-t border-border/20 pt-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Image filters</Label>
            <SliderField label="Blur" value={content.bgImageBlur ?? 0} onChange={(v) => patchContent("bgImageBlur", v)} min={0} max={40} step={1} />
            <SliderField label="Brightness" value={content.bgImageBrightness ?? 100} onChange={(v) => patchContent("bgImageBrightness", v)} min={0} max={200} step={5} unit="%" />
            <SliderField label="Contrast" value={content.bgImageContrast ?? 100} onChange={(v) => patchContent("bgImageContrast", v)} min={0} max={200} step={5} unit="%" />
            <SliderField label="Saturation" value={content.bgImageSaturation ?? 100} onChange={(v) => patchContent("bgImageSaturation", v)} min={0} max={200} step={5} unit="%" />
            <SliderField label="Grayscale" value={content.bgImageGrayscale ?? 0} onChange={(v) => patchContent("bgImageGrayscale", v)} min={0} max={100} step={5} unit="%" />
            <SliderField label="Sepia" value={content.bgImageSepia ?? 0} onChange={(v) => patchContent("bgImageSepia", v)} min={0} max={100} step={5} unit="%" />
          </div>

          <div className="space-y-2 border-t border-border/20 pt-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Color tint</Label>
            <ColorPickerField label="Tint color" value={String(content.bgImageTintColor || "")} onChange={(v) => patchContent("bgImageTintColor", v)} />
            {content.bgImageTintColor && (
              <SliderField label="Tint strength" value={content.bgImageTintOpacity ?? 0} onChange={(v) => patchContent("bgImageTintOpacity", v)} min={0} max={80} step={5} unit="%" />
            )}
          </div>
        </>
      )}
    </div>
  );
}
