import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export default function SliderField({ label, value, onChange, min = 0, max = 100, step = 1, unit = "px" }: SliderFieldProps) {
  const [manualMode, setManualMode] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-muted-foreground">{label}</Label>
        <button
          type="button"
          onClick={() => setManualMode(!manualMode)}
          className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-foreground tabular-nums transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-muted active:scale-[0.98]"
        >
          {value}{unit}
        </button>
      </div>
      {manualMode ? (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="h-7 text-xs"
          autoFocus
          onBlur={() => setManualMode(false)}
          onKeyDown={(e) => e.key === "Enter" && setManualMode(false)}
        />
      ) : (
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={min}
          max={max}
          step={step}
        />
      )}
    </div>
  );
}
