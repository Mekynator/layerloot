import { Info, Monitor, Smartphone, Tablet } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DeviceMode, DeviceVisibility, ResponsiveOverrides } from "@/types/device-overrides";
import { countDeviceOverrides, DEVICE_LABELS, getOverrideSummary, isVisibleOnDevice } from "@/types/device-overrides";

/* ── Inline override badge ── */

interface OverrideBadgeProps {
  responsive: ResponsiveOverrides | undefined;
  className?: string;
}

/**
 * Small badge showing which devices have overrides.
 * Designed to sit next to a block/element label.
 */
export function OverrideBadge({ responsive, className }: OverrideBadgeProps) {
  const summary = getOverrideSummary(responsive);
  if (summary.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-500",
              className,
            )}
          >
            <Info className="h-2.5 w-2.5" />
            {summary.length} device override{summary.length !== 1 ? "s" : ""}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{summary.join(" · ")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ── Visibility indicator ── */

interface VisibilityIndicatorProps {
  visibility: DeviceVisibility | undefined;
  device: DeviceMode;
  className?: string;
}

/**
 * Shows a warning indicator when the current element is hidden on the active device.
 */
export function VisibilityIndicator({ visibility, device, className }: VisibilityIndicatorProps) {
  if (isVisibleOnDevice(visibility, device)) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-500",
        className,
      )}
    >
      Hidden on {DEVICE_LABELS[device]}
    </span>
  );
}

/* ── Full override summary panel ── */

interface OverrideSummaryPanelProps {
  responsive: ResponsiveOverrides | undefined;
  visibility: DeviceVisibility | undefined;
  className?: string;
}

const DEVICE_ICON_MAP: Record<DeviceMode, typeof Monitor> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

/**
 * Panel showing a detailed summary of all responsive overrides and visibility state.
 */
export function OverrideSummaryPanel({ responsive, visibility, className }: OverrideSummaryPanelProps) {
  const tabletCount = countDeviceOverrides(responsive, "tablet");
  const mobileCount = countDeviceOverrides(responsive, "mobile");
  const hasVisibilityChanges = visibility && Object.values(visibility).some((v) => v === false);

  if (tabletCount === 0 && mobileCount === 0 && !hasVisibilityChanges) {
    return (
      <div className={cn("rounded-lg border border-border/20 bg-muted/10 px-3 py-2 text-center", className)}>
        <p className="text-[10px] text-muted-foreground">No device overrides — all devices use desktop values.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5 rounded-lg border border-border/20 bg-muted/10 p-3", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Responsive state</p>

      {(["desktop", "tablet", "mobile"] as DeviceMode[]).map((device) => {
        const Icon = DEVICE_ICON_MAP[device];
        const count = countDeviceOverrides(responsive, device);
        const visible = isVisibleOnDevice(visibility, device);

        return (
          <div key={device} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Icon className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] capitalize">{device}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {!visible && (
                <span className="rounded bg-amber-500/10 px-1 py-0.5 text-[9px] text-amber-500">hidden</span>
              )}
              {count > 0 && (
                <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] text-primary">
                  {count} override{count !== 1 ? "s" : ""}
                </span>
              )}
              {device === "desktop" && <span className="text-[9px] text-muted-foreground">base</span>}
              {count === 0 && device !== "desktop" && visible && (
                <span className="text-[9px] text-muted-foreground">inherited</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
