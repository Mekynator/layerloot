import { useCallback, useMemo } from "react";
import type { DeviceMode, DeviceOverrideMap, ResponsiveOverrides } from "@/types/device-overrides";
import {
  clearDeviceOverrides,
  copyDeviceOverrides,
  countDeviceOverrides,
  resolveDeviceValue,
  setDeviceOverride,
} from "@/types/device-overrides";

interface UseDeviceOverrideOptions {
  /** Root content object (desktop = base values) */
  content: Record<string, unknown>;
  /** Current responsive overrides from content.responsive */
  responsive: ResponsiveOverrides | undefined;
  /** Currently active device in the editor */
  device: DeviceMode;
  /** Callback to persist changes to content */
  onUpdate: (patch: { responsive: ResponsiveOverrides }) => void;
  /** Optional: callback for root (desktop) value changes */
  onUpdateRoot?: (key: string, value: unknown) => void;
}

/**
 * Hook for working with device-specific property overrides.
 *
 * Provides resolved values, override/reset actions, and summary info
 * for the currently active device mode.
 */
export function useDeviceOverride({
  content,
  responsive,
  device,
  onUpdate,
  onUpdateRoot,
}: UseDeviceOverrideOptions) {
  /** Resolve a property for the current device, following inheritance */
  const resolve = useCallback(
    <T,>(key: string): { value: T | undefined; inherited: boolean; source: DeviceMode } => {
      return resolveDeviceValue<T>(content[key] as T | undefined, responsive, device, key);
    },
    [content, responsive, device],
  );

  /** Set a value for the current device */
  const setValue = useCallback(
    (key: string, value: unknown) => {
      if (device === "desktop") {
        onUpdateRoot?.(key, value);
        return;
      }
      const next = setDeviceOverride(responsive || {}, device, key, value);
      onUpdate({ responsive: next });
    },
    [device, responsive, onUpdate, onUpdateRoot],
  );

  /** Reset a property to inherited for the current device */
  const resetValue = useCallback(
    (key: string) => {
      if (device === "desktop") return;
      const next = setDeviceOverride(responsive || {}, device, key, undefined);
      onUpdate({ responsive: next });
    },
    [device, responsive, onUpdate],
  );

  /** Clear all overrides for the current device */
  const clearAll = useCallback(() => {
    const next = clearDeviceOverrides(responsive, device);
    onUpdate({ responsive: next });
  }, [device, responsive, onUpdate]);

  /** Copy overrides from another device */
  const copyFrom = useCallback(
    (from: DeviceMode) => {
      const next = copyDeviceOverrides(responsive, content, from, device);
      onUpdate({ responsive: next });
    },
    [device, content, responsive, onUpdate],
  );

  /** Count overrides for the current device */
  const overrideCount = useMemo(
    () => countDeviceOverrides(responsive, device),
    [responsive, device],
  );

  /** Check if a specific property is overridden for the current device */
  const isOverridden = useCallback(
    (key: string) => {
      if (device === "desktop") return false;
      return responsive?.[device]?.[key as keyof DeviceOverrideMap] !== undefined;
    },
    [device, responsive],
  );

  return {
    resolve,
    setValue,
    resetValue,
    clearAll,
    copyFrom,
    overrideCount,
    isOverridden,
    device,
  } as const;
}
