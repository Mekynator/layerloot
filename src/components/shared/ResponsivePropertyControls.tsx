import { Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DeviceMode, OverridablePropertyMeta } from "@/types/device-overrides";

/* ── Single responsive property row ── */

interface ResponsivePropertyProps {
  meta: OverridablePropertyMeta;
  value: unknown;
  inherited: boolean;
  source: DeviceMode;
  device: DeviceMode;
  onChangeValue: (key: string, value: unknown) => void;
  onReset: (key: string) => void;
}

const DEVICE_ICONS: Record<DeviceMode, typeof Monitor> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

/**
 * A single property row that shows responsive state and allows override/reset.
 */
export function ResponsiveProperty({
  meta,
  value,
  inherited,
  source,
  device,
  onChangeValue,
  onReset,
}: ResponsivePropertyProps) {
  const SourceIcon = DEVICE_ICONS[source];
  const isDesktop = device === "desktop";

  return (
    <div className="group relative flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Label className="shrink-0 text-xs">{meta.label}</Label>
        {!isDesktop && inherited && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5 rounded bg-muted/40 px-1 py-0.5 text-[9px] text-muted-foreground">
                  <SourceIcon className="h-2.5 w-2.5" />
                  inherited
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Inherits from {source}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {!isDesktop && !inherited && (
          <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">
            overridden
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {meta.type === "number" && (
          <Input
            type="number"
            className="h-7 w-20 text-xs"
            min={meta.min}
            max={meta.max}
            step={meta.step ?? 1}
            value={value !== undefined ? Number(value) : ""}
            onChange={(e) => {
              const v = e.target.value === "" ? undefined : Number(e.target.value);
              onChangeValue(meta.key, v);
            }}
            placeholder={inherited ? "inherited" : undefined}
          />
        )}

        {meta.type === "select" && meta.options && (
          <Select
            value={value !== undefined ? String(value) : ""}
            onValueChange={(v) => onChangeValue(meta.key, v)}
          >
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue placeholder={inherited ? "inherited" : "select"} />
            </SelectTrigger>
            <SelectContent>
              {meta.options.map((opt) => (
                <SelectItem key={String(opt.value)} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {meta.type === "boolean" && (
          <Button
            type="button"
            variant={value ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChangeValue(meta.key, !value)}
          >
            {value ? "On" : "Off"}
          </Button>
        )}

        {!isDesktop && !inherited && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onReset(meta.key)}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Reset to inherited</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {meta.unit && value !== undefined && (
        <span className="text-[10px] text-muted-foreground">{meta.unit}</span>
      )}
    </div>
  );
}

/* ── Responsive property group ── */

interface ResponsivePropertyGroupProps {
  label: string;
  properties: OverridablePropertyMeta[];
  device: DeviceMode;
  resolve: <T>(key: string) => { value: T | undefined; inherited: boolean; source: DeviceMode };
  onChangeValue: (key: string, value: unknown) => void;
  onReset: (key: string) => void;
  isOverridden: (key: string) => boolean;
  className?: string;
}

/**
 * A categorized group of responsive properties.
 */
export function ResponsivePropertyGroup({
  label,
  properties,
  device,
  resolve,
  onChangeValue,
  onReset,
  isOverridden,
  className,
}: ResponsivePropertyGroupProps) {
  const overriddenCount = device !== "desktop" ? properties.filter((p) => isOverridden(p.key)).length : 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {overriddenCount > 0 && (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
            {overriddenCount} override{overriddenCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {properties.map((meta) => {
          const resolved = resolve(meta.key);
          return (
            <ResponsiveProperty
              key={meta.key}
              meta={meta}
              value={resolved.value}
              inherited={resolved.inherited}
              source={resolved.source}
              device={device}
              onChangeValue={onChangeValue}
              onReset={onReset}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── Device mode indicator bar ── */

interface DeviceModeBarProps {
  device: DeviceMode;
  overrideCount: number;
}

/**
 * Shows which device mode is active and how many overrides exist.
 */
export function DeviceModeBar({ device, overrideCount }: DeviceModeBarProps) {
  const Icon = DEVICE_ICONS[device];

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border/30 bg-muted/20 px-2 py-1">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs font-medium capitalize">{device}</span>
      {device !== "desktop" && overrideCount > 0 && (
        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary">
          {overrideCount} override{overrideCount !== 1 ? "s" : ""}
        </span>
      )}
      {device === "desktop" && (
        <span className="text-[9px] text-muted-foreground">base</span>
      )}
    </div>
  );
}
