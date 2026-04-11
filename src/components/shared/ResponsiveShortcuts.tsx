import { ArrowDown, ArrowRight, Columns3, Copy, Maximize2, RotateCcw, Shrink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DeviceMode, ResponsiveOverrides } from "@/types/device-overrides";
import { clearDeviceOverrides, copyDeviceOverrides, DEVICE_LABELS, OVERRIDABLE_PROPERTIES } from "@/types/device-overrides";

/* ── Quick adaptation shortcuts ── */

interface ResponsiveShortcutsProps {
  device: DeviceMode;
  responsive: ResponsiveOverrides | undefined;
  content: Record<string, unknown>;
  onUpdate: (patch: { responsive: ResponsiveOverrides }) => void;
  className?: string;
}

interface ShortcutDef {
  label: string;
  icon: typeof ArrowDown;
  tooltip: string;
  devices: DeviceMode[];
  action: (responsive: ResponsiveOverrides | undefined, content: Record<string, unknown>, device: DeviceMode) => ResponsiveOverrides;
}

const SHORTCUTS: ShortcutDef[] = [
  {
    label: "Stack on mobile",
    icon: ArrowDown,
    tooltip: "Switch layout direction to vertical stack",
    devices: ["mobile", "tablet"],
    action: (r) => ({
      ...(r || {}),
      mobile: { ...(r?.mobile || {}), stackDirection: "column" as const },
    }),
  },
  {
    label: "Full width buttons",
    icon: Maximize2,
    tooltip: "Make buttons full width on this device",
    devices: ["mobile"],
    action: (r, _c, device) => ({
      ...(r || {}),
      [device]: { ...(r?.[device as "tablet" | "mobile"] || {}), buttonWidth: "full" },
    }),
  },
  {
    label: "Reduce columns",
    icon: Columns3,
    tooltip: "Set columns to 1 for stacked layout",
    devices: ["mobile"],
    action: (r, _c, device) => ({
      ...(r || {}),
      [device]: { ...(r?.[device as "tablet" | "mobile"] || {}), columns: 1 },
    }),
  },
  {
    label: "Shrink spacing",
    icon: Shrink,
    tooltip: "Reduce padding and gap for compact mobile layout",
    devices: ["mobile", "tablet"],
    action: (r, content, device) => {
      const pt = Number(content.paddingTop || 40);
      const pb = Number(content.paddingBottom || 40);
      const gap = Number(content.gap || 24);
      const factor = device === "mobile" ? 0.5 : 0.7;
      return {
        ...(r || {}),
        [device]: {
          ...(r?.[device as "tablet" | "mobile"] || {}),
          paddingTop: Math.round(pt * factor),
          paddingBottom: Math.round(pb * factor),
          gap: Math.round(gap * factor),
        },
      };
    },
  },
  {
    label: "Center on mobile",
    icon: ArrowRight,
    tooltip: "Center-align content and text",
    devices: ["mobile"],
    action: (r, _c, device) => ({
      ...(r || {}),
      [device]: { ...(r?.[device as "tablet" | "mobile"] || {}), alignment: "center", textAlign: "center" },
    }),
  },
  {
    label: "Reduce motion",
    icon: Shrink,
    tooltip: "Reduce animation intensity on this device",
    devices: ["mobile", "tablet"],
    action: (r, _c, device) => ({
      ...(r || {}),
      [device]: { ...(r?.[device as "tablet" | "mobile"] || {}), animationIntensity: "reduced" },
    }),
  },
];

export function ResponsiveShortcuts({ device, responsive, content, onUpdate, className }: ResponsiveShortcutsProps) {
  if (device === "desktop") return null;

  const available = SHORTCUTS.filter((s) => s.devices.includes(device));

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-xs">Quick adaptations</Label>
      <TooltipProvider delayDuration={200}>
        <div className="flex flex-wrap gap-1">
          {available.map((shortcut) => (
            <Tooltip key={shortcut.label}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[10px]"
                  onClick={() => {
                    const next = shortcut.action(responsive, content, device);
                    onUpdate({ responsive: next });
                  }}
                >
                  <shortcut.icon className="h-3 w-3" />
                  {shortcut.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{shortcut.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}

/* ── Bulk actions ── */

interface ResponsiveBulkActionsProps {
  device: DeviceMode;
  responsive: ResponsiveOverrides | undefined;
  content: Record<string, unknown>;
  onUpdate: (patch: { responsive: ResponsiveOverrides }) => void;
  className?: string;
}

export function ResponsiveBulkActions({ device, responsive, content, onUpdate, className }: ResponsiveBulkActionsProps) {
  if (device === "desktop") return null;

  const overrideCount = Object.keys(responsive?.[device] || {}).length;

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-xs">Bulk actions</Label>
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-[10px]"
          disabled={overrideCount === 0}
          onClick={() => {
            const next = clearDeviceOverrides(responsive, device);
            onUpdate({ responsive: next });
          }}
        >
          <RotateCcw className="h-3 w-3" />
          Reset all {DEVICE_LABELS[device]} overrides
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-[10px]"
          onClick={() => {
            const from = device === "mobile" ? "tablet" : "desktop";
            const next = copyDeviceOverrides(responsive, content, from, device);
            onUpdate({ responsive: next });
          }}
        >
          <Copy className="h-3 w-3" />
          Copy from {device === "mobile" ? "tablet" : "desktop"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-[10px]"
          onClick={() => {
            const next = copyDeviceOverrides(responsive, content, "desktop", device);
            onUpdate({ responsive: next });
          }}
        >
          <Copy className="h-3 w-3" />
          Copy from desktop
        </Button>
      </div>
    </div>
  );
}
