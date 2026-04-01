import { useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SliderField from "./SliderField";
import ColorPickerField from "./ColorPickerField";
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Type } from "lucide-react";
import { cn } from "@/lib/utils";

interface TypographyControlsProps {
  /** Current typography settings */
  typography: Record<string, any>;
  /** Called when any typography value changes */
  onChange: (key: string, value: any) => void;
  /** Show all controls or compact set */
  compact?: boolean;
}

const FONT_FAMILIES = [
  { value: "inherit", label: "Default (Theme)" },
  { value: "var(--font-display)", label: "Display" },
  { value: "var(--font-sans)", label: "Sans Serif" },
  { value: "'Georgia', serif", label: "Serif" },
  { value: "'Courier New', monospace", label: "Monospace" },
];

const FONT_WEIGHTS = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
];

const TEXT_TRANSFORMS = [
  { value: "none", label: "None" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "lowercase", label: "lowercase" },
  { value: "capitalize", label: "Capitalize" },
];

export default function TypographyControls({ typography, onChange, compact }: TypographyControlsProps) {
  const get = useCallback((key: string, fallback: any = "") => typography[key] ?? fallback, [typography]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Type className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Typography</span>
      </div>

      {/* Font Family */}
      <div>
        <Label className="text-[10px]">Font Family</Label>
        <Select value={get("fontFamily", "inherit")} onValueChange={(v) => onChange("fontFamily", v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size + Weight row */}
      <div className="grid grid-cols-2 gap-2">
        <SliderField
          label="Size"
          value={get("fontSize", 16)}
          onChange={(v) => onChange("fontSize", v)}
          min={10} max={96} step={1}
        />
        <div>
          <Label className="text-[10px]">Weight</Label>
          <Select value={get("fontWeight", "400")} onValueChange={(v) => onChange("fontWeight", v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Italic + Transform row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Style</Label>
          <div className="flex gap-1 mt-1">
            <button
              onClick={() => onChange("fontStyle", get("fontStyle") === "italic" ? "normal" : "italic")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded border transition-colors",
                get("fontStyle") === "italic"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/30 text-muted-foreground hover:text-foreground"
              )}
              title="Italic"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onChange("fontWeight", get("fontWeight") === "700" ? "400" : "700")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded border transition-colors",
                Number(get("fontWeight", "400")) >= 700
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/30 text-muted-foreground hover:text-foreground"
              )}
              title="Bold"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div>
          <Label className="text-[10px]">Transform</Label>
          <Select value={get("textTransform", "none")} onValueChange={(v) => onChange("textTransform", v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEXT_TRANSFORMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alignment */}
      <div>
        <Label className="text-[10px]">Alignment</Label>
        <div className="flex gap-1 mt-1">
          {[
            { val: "left", icon: AlignLeft },
            { val: "center", icon: AlignCenter },
            { val: "right", icon: AlignRight },
          ].map(({ val, icon: Icon }) => (
            <button
              key={val}
              onClick={() => onChange("textAlign", val)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded border transition-colors",
                get("textAlign", "left") === val
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/30 text-muted-foreground hover:text-foreground"
              )}
              title={val}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <ColorPickerField
        label="Text Color"
        value={get("color", "")}
        onChange={(v) => onChange("color", v)}
      />

      {!compact && (
        <>
          {/* Letter Spacing + Line Height */}
          <div className="grid grid-cols-2 gap-2">
            <SliderField
              label="Letter Spacing"
              value={get("letterSpacing", 0)}
              onChange={(v) => onChange("letterSpacing", v)}
              min={-2} max={10} step={0.5}
            />
            <SliderField
              label="Line Height"
              value={get("lineHeight", 1.5)}
              onChange={(v) => onChange("lineHeight", v)}
              min={0.8} max={3} step={0.1} unit=""
            />
          </div>

          {/* Max Width */}
          <SliderField
            label="Max Width"
            value={get("maxWidth", 0)}
            onChange={(v) => onChange("maxWidth", v)}
            min={0} max={1200} step={10}
          />

          {/* Spacing above/below */}
          <div className="grid grid-cols-2 gap-2">
            <SliderField
              label="Margin Top"
              value={get("marginTop", 0)}
              onChange={(v) => onChange("marginTop", v)}
              min={0} max={80} step={4}
            />
            <SliderField
              label="Margin Bottom"
              value={get("marginBottom", 0)}
              onChange={(v) => onChange("marginBottom", v)}
              min={0} max={80} step={4}
            />
          </div>

          {/* Text Shadow */}
          <div>
            <Label className="text-[10px]">Text Shadow</Label>
            <Select value={get("textShadow", "none")} onValueChange={(v) => onChange("textShadow", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="subtle">Subtle</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="strong">Strong</SelectItem>
                <SelectItem value="glow">Glow</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
