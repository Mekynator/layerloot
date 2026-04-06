import { useState, useEffect, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const SWATCHES = [
  "#ffffff", "#000000", "#3b82f6", "#8b5cf6", "#ef4444",
  "#22c55e", "#f59e0b", "#06b6d4", "#ec4899", "#6366f1",
  "#14b8a6", "#f97316", "transparent",
];

interface AdminColorPickerProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export default function AdminColorPicker({ label, value, onChange, className }: AdminColorPickerProps) {
  const [hex, setHex] = useState(value || "");

  useEffect(() => { setHex(value || ""); }, [value]);

  const commit = useCallback((color: string) => {
    setHex(color);
    onChange(color);
  }, [onChange]);

  const displayColor = value && value !== "transparent" ? value : "#000000";

  return (
    <div className={cn("space-y-1", className)}>
      {label && <Label className="text-xs">{label}</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-full items-center gap-2 rounded-lg border border-border/40 bg-card/50 px-2 text-xs transition-colors hover:border-primary/30"
          >
            <span
              className={cn(
                "h-5 w-5 shrink-0 rounded border border-border/50",
                (!value || value === "transparent") && "bg-[repeating-conic-gradient(#ccc_0_25%,#fff_0_50%)] bg-[length:8px_8px]"
              )}
              style={value && value !== "transparent" ? { backgroundColor: value } : undefined}
            />
            <span className="flex-1 truncate text-left text-foreground font-mono text-[11px]">
              {value || "none"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 space-y-3 p-3" align="start">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={displayColor}
              onChange={(e) => commit(e.target.value)}
              className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border/30"
            />
            <Input
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              onBlur={() => commit(hex)}
              onKeyDown={(e) => e.key === "Enter" && commit(hex)}
              className="h-8 flex-1 font-mono text-xs"
              placeholder="#000000"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => commit(c)}
                className={cn(
                  "h-6 w-6 rounded-md border transition-transform hover:scale-110",
                  c === "transparent"
                    ? "bg-[repeating-conic-gradient(#ccc_0_25%,#fff_0_50%)] bg-[length:6px_6px] border-border/50"
                    : "border-border/30",
                  value === c && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                )}
                style={c !== "transparent" ? { backgroundColor: c } : undefined}
                title={c}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => commit("")}
            className="w-full rounded-md border border-border/30 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear color
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
