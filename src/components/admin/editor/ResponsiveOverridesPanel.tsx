import { useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { useVisualEditor } from "@/contexts/VisualEditorContext";
import { DeviceVisibilityControl } from "@/components/shared/DeviceVisibilityControl";
import { DeviceModeBar, ResponsivePropertyGroup } from "@/components/shared/ResponsivePropertyControls";
import { OverrideSummaryPanel } from "@/components/shared/OverrideSummary";
import { ResponsiveBulkActions, ResponsiveShortcuts } from "@/components/shared/ResponsiveShortcuts";
import { useDeviceOverride } from "@/hooks/use-device-override";
import type { DeviceVisibility, ResponsiveOverrides } from "@/types/device-overrides";
import { OVERRIDABLE_PROPERTIES } from "@/types/device-overrides";

/**
 * Responsive overrides panel for the Page Editor's right sidebar.
 *
 * Shows device-aware property controls, visibility toggles, shortcuts,
 * and override summaries for the currently selected block.
 */
export function ResponsiveOverridesPanel() {
  const { selectedBlock, updateBlockContent, viewport } = useVisualEditor();

  const content = useMemo(
    () => (selectedBlock?.content || {}) as Record<string, unknown>,
    [selectedBlock?.content],
  );

  const responsive = content.responsive as ResponsiveOverrides | undefined;
  const visibility = content.deviceVisibility as DeviceVisibility | undefined;

  const handleUpdate = useCallback(
    (patch: { responsive: ResponsiveOverrides }) => {
      if (!selectedBlock) return;
      updateBlockContent(selectedBlock.id, { ...content, ...patch });
    },
    [selectedBlock, content, updateBlockContent],
  );

  const handleUpdateRoot = useCallback(
    (key: string, value: unknown) => {
      if (!selectedBlock) return;
      updateBlockContent(selectedBlock.id, { ...content, [key]: value });
    },
    [selectedBlock, content, updateBlockContent],
  );

  const handleVisibilityChange = useCallback(
    (vis: DeviceVisibility) => {
      if (!selectedBlock) return;
      updateBlockContent(selectedBlock.id, { ...content, deviceVisibility: vis });
    },
    [selectedBlock, content, updateBlockContent],
  );

  const {
    resolve,
    setValue,
    resetValue,
    overrideCount,
    isOverridden,
  } = useDeviceOverride({
    content,
    responsive,
    device: viewport,
    onUpdate: handleUpdate,
    onUpdateRoot: handleUpdateRoot,
  });

  if (!selectedBlock) {
    return (
      <div className="flex items-center justify-center py-8 text-center text-xs text-muted-foreground">
        Select a block to edit responsive properties.
      </div>
    );
  }

  const layoutProps = OVERRIDABLE_PROPERTIES.filter((p) => p.category === "layout");
  const typographyProps = OVERRIDABLE_PROPERTIES.filter((p) => p.category === "typography");
  const buttonProps = OVERRIDABLE_PROPERTIES.filter((p) => p.category === "button");
  const animationProps = OVERRIDABLE_PROPERTIES.filter((p) => p.category === "animation");

  return (
    <div className="space-y-4 p-3">
      <DeviceModeBar device={viewport} overrideCount={overrideCount} />

      <DeviceVisibilityControl
        visibility={visibility}
        onChange={handleVisibilityChange}
      />

      <ResponsivePropertyGroup
        label="Layout"
        properties={layoutProps}
        device={viewport}
        resolve={resolve}
        onChangeValue={setValue}
        onReset={resetValue}
        isOverridden={isOverridden}
      />

      <ResponsivePropertyGroup
        label="Typography"
        properties={typographyProps}
        device={viewport}
        resolve={resolve}
        onChangeValue={setValue}
        onReset={resetValue}
        isOverridden={isOverridden}
      />

      <ResponsivePropertyGroup
        label="Buttons"
        properties={buttonProps}
        device={viewport}
        resolve={resolve}
        onChangeValue={setValue}
        onReset={resetValue}
        isOverridden={isOverridden}
      />

      <ResponsivePropertyGroup
        label="Animation"
        properties={animationProps}
        device={viewport}
        resolve={resolve}
        onChangeValue={setValue}
        onReset={resetValue}
        isOverridden={isOverridden}
      />

      <ResponsiveShortcuts
        device={viewport}
        responsive={responsive}
        content={content}
        onUpdate={handleUpdate}
      />

      <ResponsiveBulkActions
        device={viewport}
        responsive={responsive}
        content={content}
        onUpdate={handleUpdate}
      />

      <OverrideSummaryPanel
        responsive={responsive}
        visibility={visibility}
      />
    </div>
  );
}
