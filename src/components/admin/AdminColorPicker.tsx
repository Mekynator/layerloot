import { useEffect, useMemo, useState } from "react";
import { Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ColorFormat = "auto" | "css" | "hsl" | "hsl-function";

interface AdminColorPickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  placeholder?: string;
  format?: ColorFormat;
  description?: string;
}

const FALLBACK_COLOR = "#6366f1";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isHex = (value: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());

const normalizeHex = (value: string) => {
  const trimmed = value.trim();
  if (!isHex(trimmed)) return null;
  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }
  return trimmed.toLowerCase();
};

const parseHslComponents = (value: string) => {
  const source = value.trim().replace(/^hsl\(/i, "").replace(/\)$/g, "").replace(/,/g, " ");
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;

  const hue = Number(parts[0]);
  const saturation = Number(parts[1].replace("%", ""));
  const lightness = Number(parts[2].replace("%", ""));

  if ([hue, saturation, lightness].some((part) => Number.isNaN(part))) {
    return null;
  }

  return {
    h: ((hue % 360) + 360) % 360,
    s: clamp(saturation, 0, 100),
    l: clamp(lightness, 0, 100),
  };
};

const hexToRgb = (value: string) => {
  const normalized = normalizeHex(value);
  if (!normalized) return null;
  const numeric = normalized.slice(1);
  return {
    r: parseInt(numeric.slice(0, 2), 16),
    g: parseInt(numeric.slice(2, 4), 16),
    b: parseInt(numeric.slice(4, 6), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0")).join("")}`;

const hslToHex = (h: number, s: number, l: number) => {
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = h / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = lightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) [red, green, blue] = [chroma, secondary, 0];
  else if (segment >= 1 && segment < 2) [red, green, blue] = [secondary, chroma, 0];
  else if (segment >= 2 && segment < 3) [red, green, blue] = [0, chroma, secondary];
  else if (segment >= 3 && segment < 4) [red, green, blue] = [0, secondary, chroma];
  else if (segment >= 4 && segment < 5) [red, green, blue] = [secondary, 0, chroma];
  else [red, green, blue] = [chroma, 0, secondary];

  return rgbToHex((red + match) * 255, (green + match) * 255, (blue + match) * 255);
};

const hexToHslComponents = (value: string) => {
  const rgb = hexToRgb(value);
  if (!rgb) return null;

  const red = rgb.r / 255;
  const green = rgb.g / 255;
  const blue = rgb.b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  if (delta !== 0) {
    switch (max) {
      case red:
        hue = ((green - blue) / delta) % 6;
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }
  }

  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  const normalizedHue = Math.round((hue * 60 + 360) % 360);
  const normalizedSaturation = Math.round(saturation * 100);
  const normalizedLightness = Math.round(lightness * 100);
  return `${normalizedHue} ${normalizedSaturation}% ${normalizedLightness}%`;
};

const resolvePickerHex = (value: string, format: ColorFormat) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "transparent") return FALLBACK_COLOR;

  if (isHex(trimmed)) return normalizeHex(trimmed) ?? FALLBACK_COLOR;

  if (format === "hsl" || format === "hsl-function" || trimmed.includes("%") || trimmed.startsWith("hsl(")) {
    const parsed = parseHslComponents(trimmed);
    if (parsed) return hslToHex(parsed.h, parsed.s, parsed.l);
  }

  return FALLBACK_COLOR;
};

const serializePickedColor = (hex: string, format: ColorFormat, currentValue: string, defaultValue?: string) => {
  const normalizedHex = normalizeHex(hex) ?? FALLBACK_COLOR;
  const activeFormat = format === "auto"
    ? currentValue.trim().startsWith("hsl(") || defaultValue?.trim().startsWith("hsl(")
      ? "hsl-function"
      : currentValue.includes("%") || defaultValue?.includes("%")
        ? "hsl"
        : "css"
    : format;

  if (activeFormat === "hsl") {
    return hexToHslComponents(normalizedHex) ?? normalizedHex;
  }
  if (activeFormat === "hsl-function") {
    return `hsl(${hexToHslComponents(normalizedHex) ?? "0 0% 0%"})`;
  }
  return normalizedHex;
};

export default function AdminColorPicker({
  label,
  value,
  onChange,
  className,
  defaultValue = "",
  placeholder,
  format = "auto",
  description,
}: AdminColorPickerProps) {
  const [draftValue, setDraftValue] = useState(value || "");

  useEffect(() => {
    setDraftValue(value || "");
  }, [value]);

  const pickerValue = useMemo(() => resolvePickerHex(value || defaultValue || FALLBACK_COLOR, format), [defaultValue, format, value]);
  const showTransparent = !value || value === "transparent";

  const commitManualValue = () => onChange(draftValue.trim());
  const commitPickerValue = (nextHex: string) => onChange(serializePickedColor(nextHex, format, value, defaultValue));

  const copyValue = async () => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Ignore clipboard errors in admin color controls.
    }
  };

  return (
    <div className={cn("rounded-xl border border-border/30 bg-background/40 p-3", className)}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          {label && <Label className="text-xs font-semibold uppercase tracking-wider">{label}</Label>}
          {description && <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>}
        </div>
        <span
          className={cn(
            "h-7 w-7 shrink-0 rounded-md border border-border/40 shadow-sm",
            showTransparent && "bg-[repeating-conic-gradient(#cbd5e1_0_25%,#fff_0_50%)] bg-[length:8px_8px]",
          )}
          style={!showTransparent ? { backgroundColor: value } : undefined}
          aria-hidden="true"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="color"
          value={pickerValue}
          onChange={(event) => commitPickerValue(event.target.value)}
          className="h-10 w-full cursor-pointer rounded-lg border border-border/30 bg-transparent p-1 sm:w-14"
        />
        <Input
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commitManualValue}
          onKeyDown={(event) => event.key === "Enter" && commitManualValue()}
          className="font-mono text-xs"
          placeholder={placeholder ?? defaultValue ?? "#000000"}
        />
        <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={copyValue} title="Copy color value" disabled={!value}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => onChange(defaultValue)} title="Reset to default">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
