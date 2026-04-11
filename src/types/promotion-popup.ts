import type { DeviceVisibility, PopupElementResponsiveOverrides } from "@/types/device-overrides";

export type PopupDisplayBehavior = "session" | "day" | "interval" | "always" | "first-visit";
export type PopupRecurrenceFrequency = "none" | "daily" | "weekly" | "monthly" | "custom";
export type PopupElementType = "title" | "subtitle" | "description" | "button" | "badge" | "countdown" | "image" | "icon" | "shape";
export type PopupAnimationType = "none" | "fade" | "slide" | "zoom" | "bounce" | "pulse" | "shimmer" | "floating";
export type PopupHoverAnimation = "none" | "scale" | "pulse" | "shimmer" | "float";
export type PopupTextAlign = "left" | "center" | "right";
export type PopupButtonVariant = "default" | "secondary" | "outline" | "ghost" | "luxury" | "pill";
export type PopupButtonSize = "sm" | "md" | "lg";
export type PopupLinkTarget = "internal" | "external";
export type PopupShapeType = "circle" | "pill" | "square";
export type PopupBackgroundFit = "cover" | "contain" | "auto";

export interface PopupElementStyle {
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  fontSize: number;
  fontWeight: number;
  textAlign: PopupTextAlign;
  lineHeight: number;
  letterSpacing: number;
  textShadow: string;
  fontFamily: string;
  opacity: number;
  shadow: string;
  paddingX: number;
  paddingY: number;
  rotation: number;
}

export interface PopupElementAction {
  label: string;
  link: string;
  target: PopupLinkTarget;
  variant: PopupButtonVariant;
  radius: number;
  size: PopupButtonSize;
  icon: string;
}

export interface PopupElementAnimation {
  entrance: PopupAnimationType;
  hover: PopupHoverAnimation;
  delay: number;
  duration: number;
  easing: string;
}

export interface PopupElementAsset {
  url: string;
  fit: PopupBackgroundFit;
  position: string;
  shape: PopupShapeType;
}

export interface PopupCountdownConfig {
  endDate: string;
  prefix: string;
  suffix: string;
}

export interface PopupCanvasElement {
  id: string;
  type: PopupElementType;
  name: string;
  content: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  style: PopupElementStyle;
  action: PopupElementAction;
  animation: PopupElementAnimation;
  asset: PopupElementAsset;
  countdown: PopupCountdownConfig;
  /** Optional per-device layout/style overrides */
  responsive?: PopupElementResponsiveOverrides;
  /** Optional per-device visibility */
  deviceVisibility?: DeviceVisibility;
}

export interface PopupOverlayConfig {
  color: string;
  opacity: number;
  blur: number;
  clickOutsideToClose: boolean;
  closeOnEscape: boolean;
  modal: boolean;
  zIndex: number;
}

export interface PopupContainerConfig {
  width: number;
  minHeight: number;
  borderRadius: number;
  shadow: string;
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: PopupBackgroundFit;
  backgroundPosition: string;
  opacity: number;
  padding: number;
  showCloseButton: boolean;
  closeButtonColor: string;
  closeButtonBackground: string;
}

export interface PopupScheduleConfig {
  active: boolean;
  startDate: string;
  endDate: string;
  recurrenceEnabled: boolean;
  recurrence: PopupRecurrenceFrequency;
  interval: number;
  daysOfWeek: number[];
  dayOfMonth: number;
  customRule: string;
  homepageOnly: boolean;
  pageTargets: string[];
  priority: number;
  showDelayMs: number;
  behavior: PopupDisplayBehavior;
  intervalDays: number;
  allowDoNotShowAgain: boolean;
}

export interface PopupMetadata {
  name: string;
  analyticsId: string;
  audience: "all";
  activePresetId: string | null;
}

export interface PromotionPopupPreset {
  id: string;
  name: string;
  isFavorite: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  config: Omit<PromotionPopupConfig, "presets">;
}

export interface PromotionPopupConfig {
  version: number;
  enabled: boolean;
  title: string;
  message: string;
  button_text: string;
  button_link: string;
  image_url: string;
  dismiss_key: string;
  metadata: PopupMetadata;
  overlay: PopupOverlayConfig;
  container: PopupContainerConfig;
  schedule: PopupScheduleConfig;
  elements: PopupCanvasElement[];
  presets: PromotionPopupPreset[];
}
