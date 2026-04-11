import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone, TabletSmartphone } from "lucide-react";

export type BuilderDevice = "desktop" | "tablet" | "mobile";

interface BuilderDevicePickerProps {
  value: BuilderDevice;
  onChange: (device: BuilderDevice) => void;
  className?: string;
}

const DEVICES: { key: BuilderDevice; icon: React.ElementType; label: string }[] = [
  { key: "desktop", icon: Monitor, label: "Desktop" },
  { key: "tablet", icon: TabletSmartphone, label: "Tablet" },
  { key: "mobile", icon: Smartphone, label: "Mobile" },
];

/**
 * Shared builder primitive: Desktop / Tablet / Mobile preview switcher.
 * Used in both the Page Editor toolbar and the Popup Campaign Builder header.
 *
 * Usage:
 *   <BuilderDevicePicker value={device} onChange={setDevice} />
 */
export function BuilderDevicePicker({ value, onChange, className }: BuilderDevicePickerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-border/30 bg-background/60 p-1",
        className,
      )}
    >
      {DEVICES.map(({ key, icon: Icon, label }) => (
        <Button
          key={key}
          type="button"
          variant={value === key ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(key)}
        >
          <Icon className="mr-1 h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  );
}
