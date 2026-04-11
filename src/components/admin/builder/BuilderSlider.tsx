import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

interface BuilderSliderProps
  extends Omit<ComponentPropsWithoutRef<typeof Slider>, "value" | "onValueChange"> {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  /**
   * Called with the raw numeric value to produce the display string shown
   * next to the label.  Defaults to `String(value)`.
   *
   * Example: `(v) => \`${Math.round(v)}%\``
   */
  formatValue?: (value: number) => string;
  className?: string;
}

/**
 * Shared builder primitive: a slider with a compact label that shows the
 * current value inline.  Used in both the Page Editor and the Popup
 * Campaign Builder property panels.
 *
 * Usage:
 *   <BuilderSlider
 *     label="Opacity"
 *     value={opacity * 100}
 *     onValueChange={(v) => setOpacity(v / 100)}
 *     min={0} max={100} step={5}
 *     formatValue={(v) => `${Math.round(v)}%`}
 *   />
 */
export function BuilderSlider({
  label,
  value,
  onValueChange,
  formatValue,
  className,
  ...sliderProps
}: BuilderSliderProps) {
  const display = formatValue ? formatValue(value) : String(value);
  return (
    <div className={cn(className)}>
      <Label className="text-xs">
        {label} ({display})
      </Label>
      <Slider
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
        {...sliderProps}
      />
    </div>
  );
}
