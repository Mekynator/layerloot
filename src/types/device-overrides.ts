/**
 * Device override types for responsive editing.
 *
 * Inheritance model:
 *   desktop → base/default (always stored in root content)
 *   tablet  → inherits from desktop, can override
 *   mobile  → inherits from tablet → desktop, can override
 *
 * Overrides are stored in `content.responsive.tablet` and `content.responsive.mobile`.
 * Desktop values are always the root content values (no separate override needed).
 */

/* ── Device types ── */

export type DeviceMode = "desktop" | "tablet" | "mobile";

export const DEVICE_MODES: DeviceMode[] = ["desktop", "tablet", "mobile"];

export const DEVICE_LABELS: Record<DeviceMode, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

/* ── Overridable property categories ── */

/** Layout properties that can vary by device */
export interface DeviceLayoutOverrides {
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  marginTop?: number;
  marginBottom?: number;
  gap?: number;
  minHeight?: number;
  maxWidth?: number;
  columns?: number;
  stackDirection?: "row" | "column";
  alignment?: "left" | "center" | "right";
  borderRadius?: number;
  opacity?: number;
}

/** Typography properties that can vary by device */
export interface DeviceTypographyOverrides {
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: "left" | "center" | "right";
  maxWidth?: number;
}

/** Visual properties that can vary by device */
export interface DeviceVisualOverrides {
  imageFit?: "cover" | "contain" | "auto";
  imagePosition?: string;
  imageWidth?: number;
  imageHeight?: number;
  shadowIntensity?: number;
  borderRadius?: number;
  opacity?: number;
}

/** Button properties that can vary by device */
export interface DeviceButtonOverrides {
  buttonSize?: "sm" | "md" | "lg";
  buttonPadding?: number;
  buttonFontSize?: number;
  buttonWidth?: "auto" | "full";
  buttonAlignment?: "left" | "center" | "right";
}

/** Animation properties that can vary by device */
export interface DeviceAnimationOverrides {
  animationEnabled?: boolean;
  animationIntensity?: "full" | "reduced" | "none";
}

/** Visibility per device */
export interface DeviceVisibility {
  desktop?: boolean;
  tablet?: boolean;
  mobile?: boolean;
}

/** Combined device override map stored in content.responsive */
export type DeviceOverrideMap = DeviceLayoutOverrides
  & DeviceTypographyOverrides
  & DeviceVisualOverrides
  & DeviceButtonOverrides
  & DeviceAnimationOverrides;

/** What gets stored in content.responsive */
export interface ResponsiveOverrides {
  tablet?: Partial<DeviceOverrideMap>;
  mobile?: Partial<DeviceOverrideMap>;
}

/* ── Popup element device overrides ── */

/** Properties overridable per device for popup canvas elements */
export interface PopupElementDeviceOverrides {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  paddingX?: number;
  paddingY?: number;
  opacity?: number;
  visible?: boolean;
}

/** Stored in popupElement.responsive */
export interface PopupElementResponsiveOverrides {
  tablet?: Partial<PopupElementDeviceOverrides>;
  mobile?: Partial<PopupElementDeviceOverrides>;
}

/* ── Property metadata for UI ── */

export type OverridablePropertyCategory = "layout" | "typography" | "visual" | "button" | "animation";

export interface OverridablePropertyMeta {
  key: string;
  label: string;
  category: OverridablePropertyCategory;
  type: "number" | "select" | "boolean";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: Array<{ value: string | number | boolean; label: string }>;
}

/** Registry of all overridable properties with UI metadata */
export const OVERRIDABLE_PROPERTIES: OverridablePropertyMeta[] = [
  // Layout
  { key: "paddingTop", label: "Padding top", category: "layout", type: "number", min: 0, max: 200, unit: "px" },
  { key: "paddingBottom", label: "Padding bottom", category: "layout", type: "number", min: 0, max: 200, unit: "px" },
  { key: "paddingLeft", label: "Padding left", category: "layout", type: "number", min: 0, max: 200, unit: "px" },
  { key: "paddingRight", label: "Padding right", category: "layout", type: "number", min: 0, max: 200, unit: "px" },
  { key: "marginTop", label: "Margin top", category: "layout", type: "number", min: -100, max: 200, unit: "px" },
  { key: "marginBottom", label: "Margin bottom", category: "layout", type: "number", min: -100, max: 200, unit: "px" },
  { key: "gap", label: "Gap", category: "layout", type: "number", min: 0, max: 120, unit: "px" },
  { key: "minHeight", label: "Min height", category: "layout", type: "number", min: 0, max: 1200, unit: "px" },
  { key: "maxWidth", label: "Max width", category: "layout", type: "number", min: 0, max: 2000, unit: "px" },
  { key: "columns", label: "Columns", category: "layout", type: "number", min: 1, max: 12 },
  { key: "stackDirection", label: "Direction", category: "layout", type: "select", options: [{ value: "row", label: "Row" }, { value: "column", label: "Stack" }] },
  { key: "alignment", label: "Alignment", category: "layout", type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
  { key: "borderRadius", label: "Border radius", category: "layout", type: "number", min: 0, max: 100, unit: "px" },
  { key: "opacity", label: "Opacity", category: "layout", type: "number", min: 0, max: 100, unit: "%" },

  // Typography
  { key: "fontSize", label: "Font size", category: "typography", type: "number", min: 8, max: 120, unit: "px" },
  { key: "lineHeight", label: "Line height", category: "typography", type: "number", min: 0.8, max: 3, step: 0.1 },
  { key: "letterSpacing", label: "Letter spacing", category: "typography", type: "number", min: -2, max: 10, step: 0.1, unit: "px" },
  { key: "textAlign", label: "Text align", category: "typography", type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },

  // Visual
  { key: "imageFit", label: "Image fit", category: "visual", type: "select", options: [{ value: "cover", label: "Cover" }, { value: "contain", label: "Contain" }, { value: "auto", label: "Auto" }] },
  { key: "imagePosition", label: "Image position", category: "visual", type: "select", options: [{ value: "center", label: "Center" }, { value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }] },
  { key: "shadowIntensity", label: "Shadow intensity", category: "visual", type: "number", min: 0, max: 100, unit: "%" },

  // Button
  { key: "buttonSize", label: "Button size", category: "button", type: "select", options: [{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }] },
  { key: "buttonWidth", label: "Button width", category: "button", type: "select", options: [{ value: "auto", label: "Auto" }, { value: "full", label: "Full width" }] },
  { key: "buttonAlignment", label: "Button alignment", category: "button", type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
  { key: "buttonFontSize", label: "Button font size", category: "button", type: "number", min: 10, max: 32, unit: "px" },

  // Animation
  { key: "animationEnabled", label: "Animations enabled", category: "animation", type: "boolean" },
  { key: "animationIntensity", label: "Animation intensity", category: "animation", type: "select", options: [{ value: "full", label: "Full" }, { value: "reduced", label: "Reduced" }, { value: "none", label: "None" }] },
];

/* ── Resolver helpers ── */

/**
 * Resolve a property value for a given device, following the inheritance chain:
 *   mobile → tablet → desktop (root content)
 *
 * Returns the resolved value and whether it's inherited or overridden.
 */
export function resolveDeviceValue<T>(
  rootValue: T | undefined,
  responsive: ResponsiveOverrides | undefined,
  device: DeviceMode,
  key: string,
): { value: T | undefined; inherited: boolean; source: DeviceMode } {
  if (device === "desktop") {
    return { value: rootValue, inherited: false, source: "desktop" };
  }

  const overrides = responsive?.[device];
  const overrideValue = overrides?.[key as keyof DeviceOverrideMap] as T | undefined;

  if (overrideValue !== undefined) {
    return { value: overrideValue, inherited: false, source: device };
  }

  // mobile inherits from tablet, then desktop
  if (device === "mobile") {
    const tabletValue = responsive?.tablet?.[key as keyof DeviceOverrideMap] as T | undefined;
    if (tabletValue !== undefined) {
      return { value: tabletValue, inherited: true, source: "tablet" };
    }
  }

  return { value: rootValue, inherited: true, source: "desktop" };
}

/**
 * Set or clear a device override value.
 *
 * Mutates and returns the responsive overrides object.
 * Pass `undefined` to clear an override (reset to inherited).
 */
export function setDeviceOverride(
  responsive: ResponsiveOverrides,
  device: DeviceMode,
  key: string,
  value: unknown,
): ResponsiveOverrides {
  if (device === "desktop") return responsive; // desktop values live in root content

  const copy = { ...responsive };
  if (!copy[device]) copy[device] = {};
  const overrides = { ...copy[device] };

  if (value === undefined) {
    delete (overrides as Record<string, unknown>)[key];
  } else {
    (overrides as Record<string, unknown>)[key] = value;
  }

  // Clean up empty override objects
  if (Object.keys(overrides).length === 0) {
    delete copy[device];
  } else {
    copy[device] = overrides;
  }

  return copy;
}

/**
 * Count how many overrides exist for a given device (for summary indicators).
 */
export function countDeviceOverrides(responsive: ResponsiveOverrides | undefined, device: DeviceMode): number {
  if (device === "desktop" || !responsive) return 0;
  return Object.keys(responsive[device] || {}).length;
}

/**
 * Check whether an element/block should be visible on a given device.
 */
export function isVisibleOnDevice(
  visibility: DeviceVisibility | undefined,
  device: DeviceMode,
): boolean {
  if (!visibility) return true; // default: visible on all
  return visibility[device] !== false;
}

/**
 * Get a summary of which devices have overrides.
 */
export function getOverrideSummary(responsive: ResponsiveOverrides | undefined): string[] {
  const summary: string[] = [];
  if (responsive?.tablet && Object.keys(responsive.tablet).length > 0) {
    summary.push(`Tablet (${Object.keys(responsive.tablet).length})`);
  }
  if (responsive?.mobile && Object.keys(responsive.mobile).length > 0) {
    summary.push(`Mobile (${Object.keys(responsive.mobile).length})`);
  }
  return summary;
}

/**
 * Clear all overrides for a given device.
 */
export function clearDeviceOverrides(
  responsive: ResponsiveOverrides | undefined,
  device: DeviceMode,
): ResponsiveOverrides {
  if (device === "desktop" || !responsive) return responsive || {};
  const copy = { ...responsive };
  delete copy[device];
  return copy;
}

/**
 * Copy overrides from one device to another.
 */
export function copyDeviceOverrides(
  responsive: ResponsiveOverrides | undefined,
  rootContent: Record<string, unknown>,
  from: DeviceMode,
  to: DeviceMode,
): ResponsiveOverrides {
  if (to === "desktop") return responsive || {}; // can't override desktop

  const result = { ...(responsive || {}) };

  if (from === "desktop") {
    // Copy relevant root properties as overrides
    const overrides: Partial<DeviceOverrideMap> = {};
    for (const prop of OVERRIDABLE_PROPERTIES) {
      const val = rootContent[prop.key];
      if (val !== undefined) {
        (overrides as Record<string, unknown>)[prop.key] = val;
      }
    }
    if (Object.keys(overrides).length > 0) result[to] = overrides;
  } else {
    // Copy from tablet/mobile
    const source = responsive?.[from];
    if (source && Object.keys(source).length > 0) {
      result[to] = { ...source };
    }
  }

  return result;
}
