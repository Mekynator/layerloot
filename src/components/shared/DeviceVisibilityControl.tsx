import { Eye, EyeOff, Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DeviceMode, DeviceVisibility } from "@/types/device-overrides";
import { DEVICE_LABELS, DEVICE_MODES } from "@/types/device-overrides";

interface DeviceVisibilityControlProps {
  visibility: DeviceVisibility | undefined;
  onChange: (visibility: DeviceVisibility) => void;
  className?: string;
}

const DEVICE_ICONS: Record<DeviceMode, typeof Monitor> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

/**
 * Toggles per-device visibility for a block, element, or section.
 *
 * Shows three device buttons — filled when visible, outlined when hidden.
 */
export function DeviceVisibilityControl({ visibility, onChange, className }: DeviceVisibilityControlProps) {
  const vis = visibility ?? { desktop: true, tablet: true, mobile: true };

  const toggle = (device: DeviceMode) => {
    onChange({ ...vis, [device]: !(vis[device] ?? true) });
  };

  const allVisible = DEVICE_MODES.every((d) => vis[d] !== false);
  const hiddenDevices = DEVICE_MODES.filter((d) => vis[d] === false);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Device visibility</Label>
        {hiddenDevices.length > 0 && (
          <span className="text-[9px] text-amber-500">
            Hidden on {hiddenDevices.map((d) => DEVICE_LABELS[d].toLowerCase()).join(", ")}
          </span>
        )}
      </div>
      <TooltipProvider delayDuration={200}>
        <div className="flex gap-1">
          {DEVICE_MODES.map((device) => {
            const Icon = DEVICE_ICONS[device];
            const visible = vis[device] !== false;

            return (
              <Tooltip key={device}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={visible ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 gap-1 text-[10px]",
                      !visible && "opacity-50",
                    )}
                    onClick={() => toggle(device)}
                  >
                    <Icon className="h-3 w-3" />
                    {visible ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">
                    {visible ? `Visible on ${DEVICE_LABELS[device]}` : `Hidden on ${DEVICE_LABELS[device]}`}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {!allVisible && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] text-muted-foreground"
              onClick={() => onChange({ desktop: true, tablet: true, mobile: true })}
            >
              Show all
            </Button>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}

/* ── Preset shortcuts ── */

interface DeviceVisibilityPresetsProps {
  onChange: (visibility: DeviceVisibility) => void;
  className?: string;
}

const PRESETS: Array<{ label: string; visibility: DeviceVisibility }> = [
  { label: "All devices", visibility: { desktop: true, tablet: true, mobile: true } },
  { label: "Desktop only", visibility: { desktop: true, tablet: false, mobile: false } },
  { label: "Mobile only", visibility: { desktop: false, tablet: false, mobile: true } },
  { label: "Hide on mobile", visibility: { desktop: true, tablet: true, mobile: false } },
  { label: "Hide on desktop", visibility: { desktop: false, tablet: true, mobile: true } },
];

export function DeviceVisibilityPresets({ onChange, className }: DeviceVisibilityPresetsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {PRESETS.map((preset) => (
        <Button
          key={preset.label}
          type="button"
          variant="outline"
          size="sm"
          className="h-6 text-[10px]"
          onClick={() => onChange(preset.visibility)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
