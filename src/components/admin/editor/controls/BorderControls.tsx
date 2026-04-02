import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SliderField from "./SliderField";
import ColorPickerField from "./ColorPickerField";

interface BorderControlsProps {
  content: Record<string, any>;
  patchContent: (key: string, value: any) => void;
}

const BORDER_STYLES = [
  { value: "none", label: "None" },
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
  { value: "double", label: "Double" },
];

const SIDES = ["Top", "Right", "Bottom", "Left"] as const;

export default function BorderControls({ content, patchContent }: BorderControlsProps) {
  const isPerSide = content._borderPerSide === true;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Border</Label>
        <button
          type="button"
          onClick={() => patchContent("_borderPerSide", !isPerSide)}
          className="text-[9px] text-primary hover:underline"
        >
          {isPerSide ? "Uniform" : "Per Side"}
        </button>
      </div>

      {isPerSide ? (
        <Tabs defaultValue="Top" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-7">
            {SIDES.map(s => (
              <TabsTrigger key={s} value={s} className="text-[9px] px-1">{s}</TabsTrigger>
            ))}
          </TabsList>
          {SIDES.map(side => (
            <TabsContent key={side} value={side} className="space-y-2 mt-2">
              <SliderField
                label={`${side} Width`}
                value={content[`border${side}Width`] ?? 0}
                onChange={(v) => patchContent(`border${side}Width`, v)}
                min={0} max={12} step={1}
              />
              <div>
                <Label className="text-[10px]">{side} Style</Label>
                <Select
                  value={content[`border${side}Style`] || "none"}
                  onValueChange={(v) => patchContent(`border${side}Style`, v)}
                >
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BORDER_STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <ColorPickerField
                label={`${side} Color`}
                value={content[`border${side}Color`] || ""}
                onChange={(v) => patchContent(`border${side}Color`, v)}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-2">
          <SliderField
            label="Width"
            value={content.borderWidth ?? 0}
            onChange={(v) => patchContent("borderWidth", v)}
            min={0} max={12} step={1}
          />
          <div>
            <Label className="text-[10px]">Style</Label>
            <Select
              value={content.borderStyle || "none"}
              onValueChange={(v) => patchContent("borderStyle", v)}
            >
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BORDER_STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <ColorPickerField
            label="Color"
            value={content.borderColor || ""}
            onChange={(v) => patchContent("borderColor", v)}
          />
        </div>
      )}

      {/* Border Radius - always shown */}
      <SliderField
        label="Border Radius"
        value={content.borderRadius ?? 0}
        onChange={(v) => patchContent("borderRadius", v)}
        min={0} max={48} step={2}
      />

      {/* Border Opacity */}
      <SliderField
        label="Border Opacity"
        value={content.borderOpacity ?? 100}
        onChange={(v) => patchContent("borderOpacity", v)}
        min={0} max={100} step={5} unit="%"
      />

      {/* Outline / Hover border */}
      <div className="space-y-2 pt-2 border-t border-border/20">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Hover Border</Label>
        <ColorPickerField
          label="Hover Color"
          value={content.borderHoverColor || ""}
          onChange={(v) => patchContent("borderHoverColor", v)}
        />
        <SliderField
          label="Hover Width"
          value={content.borderHoverWidth ?? 0}
          onChange={(v) => patchContent("borderHoverWidth", v)}
          min={0} max={6} step={1}
        />
      </div>
    </div>
  );
}
