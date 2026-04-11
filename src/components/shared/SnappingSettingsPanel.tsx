import { Grid3X3, Magnet, Ruler, Shield } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { SnapSettings } from "@/lib/snap-engine";

interface SnappingSettingsPanelProps {
  settings: SnapSettings;
  onToggle: (key: keyof SnapSettings) => void;
  onChangeGridSize: (size: number) => void;
  onChangeThreshold: (threshold: number) => void;
}

export function SnappingSettingsPanel({ settings, onToggle, onChangeGridSize, onChangeThreshold }: SnappingSettingsPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Magnet className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs">Snapping</Label>
        </div>
        <Switch checked={settings.enabled} onCheckedChange={() => onToggle("enabled")} />
      </div>

      {settings.enabled && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs">Show guides</Label>
            </div>
            <Switch checked={settings.showGuides} onCheckedChange={() => onToggle("showGuides")} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Grid3X3 className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs">Show grid</Label>
            </div>
            <Switch checked={settings.showGrid} onCheckedChange={() => onToggle("showGrid")} />
          </div>

          {settings.showGrid && (
            <>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Snap to grid</Label>
                <Switch checked={settings.snapToGrid} onCheckedChange={() => onToggle("snapToGrid")} />
              </div>

              <div>
                <Label className="text-xs">Grid density ({settings.gridSize}%)</Label>
                <Slider
                  className="mt-1"
                  min={2}
                  max={25}
                  step={1}
                  value={[settings.gridSize]}
                  onValueChange={([v]) => onChangeGridSize(v)}
                />
              </div>
            </>
          )}

          <div>
            <Label className="text-xs">Snap threshold ({settings.snapThreshold.toFixed(1)}%)</Label>
            <Slider
              className="mt-1"
              min={0.5}
              max={5}
              step={0.5}
              value={[settings.snapThreshold]}
              onValueChange={([v]) => onChangeThreshold(v)}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs">Safe area</Label>
            </div>
            <Switch checked={settings.showSafeArea} onCheckedChange={() => onToggle("showSafeArea")} />
          </div>
        </>
      )}
    </div>
  );
}
