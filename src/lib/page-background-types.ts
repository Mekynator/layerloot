export type BackgroundSizeMode = "cover" | "contain" | "fill" | "repeat" | "auto";
export type TransitionType = "fade" | "slide" | "zoom" | "crossfade" | "kenBurns";
export type MotionEffect = "none" | "slowZoom" | "kenBurns" | "drift";
export type BlendMode = "normal" | "multiply" | "screen" | "overlay";
export type AttachmentMode = "fixed" | "scroll";
export type PageOverrideMode = "inherit" | "custom" | "disabled";

export type PageBackgroundSettings = {
  enabled: boolean;
  images: string[];
  opacity: number;
  blur: number;
  intervalMs: number;
  sizeMode: BackgroundSizeMode;
  position: string;
  overlayOpacity: number;
  brightness: number;
  contrast: number;
  saturation: number;
  transitionType: TransitionType;
  transitionDurationMs: number;
  attachment: AttachmentMode;
  autoplay: boolean;
  loop: boolean;
  randomOrder: boolean;
  colorOverlay: string;
  colorOverlayOpacity: number;
  gradientStart: string;
  gradientEnd: string;
  gradientOpacity: number;
  blendMode: BlendMode;
  motionEffect: MotionEffect;
  motionSpeed: number;
};

export type PageBackgroundOverride = {
  mode: PageOverrideMode;
} & PageBackgroundSettings;

export const SETTING_KEY = "page_background_global";

export const DEFAULT_SETTINGS: PageBackgroundSettings = {
  enabled: false,
  images: [],
  opacity: 0.22,
  blur: 10,
  intervalMs: 6000,
  sizeMode: "cover",
  position: "center",
  overlayOpacity: 0.15,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  transitionType: "fade",
  transitionDurationMs: 1200,
  attachment: "fixed",
  autoplay: true,
  loop: true,
  randomOrder: false,
  colorOverlay: "",
  colorOverlayOpacity: 0,
  gradientStart: "",
  gradientEnd: "",
  gradientOpacity: 0,
  blendMode: "normal",
  motionEffect: "slowZoom",
  motionSpeed: 12,
};

const num = (v: unknown, fallback: number) => typeof v === "number" ? v : fallback;
const str = (v: unknown, fallback: string) => typeof v === "string" && v ? v : fallback;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSettings(value: any): PageBackgroundSettings {
  return {
    enabled: Boolean(value?.enabled),
    images: Array.isArray(value?.images) ? (value.images as string[]).filter(Boolean) : [],
    opacity: num(value?.opacity, DEFAULT_SETTINGS.opacity),
    blur: num(value?.blur, DEFAULT_SETTINGS.blur),
    intervalMs: num(value?.intervalMs, DEFAULT_SETTINGS.intervalMs) >= 1000
      ? num(value?.intervalMs, DEFAULT_SETTINGS.intervalMs) : DEFAULT_SETTINGS.intervalMs,
    sizeMode: ["cover", "contain", "fill", "repeat", "auto"].includes(value?.sizeMode as string)
      ? value?.sizeMode as BackgroundSizeMode : DEFAULT_SETTINGS.sizeMode,
    position: str(value?.position, DEFAULT_SETTINGS.position),
    overlayOpacity: num(value?.overlayOpacity, DEFAULT_SETTINGS.overlayOpacity),
    brightness: num(value?.brightness, DEFAULT_SETTINGS.brightness),
    contrast: num(value?.contrast, DEFAULT_SETTINGS.contrast),
    saturation: num(value?.saturation, DEFAULT_SETTINGS.saturation),
    transitionType: ["fade","slide","zoom","crossfade","kenBurns"].includes(value?.transitionType as string)
      ? value?.transitionType as TransitionType : DEFAULT_SETTINGS.transitionType,
    transitionDurationMs: num(value?.transitionDurationMs, DEFAULT_SETTINGS.transitionDurationMs),
    attachment: value?.attachment === "scroll" ? "scroll" : "fixed",
    autoplay: value?.autoplay === false ? false : true,
    loop: value?.loop === false ? false : true,
    randomOrder: Boolean(value?.randomOrder),
    colorOverlay: str(value?.colorOverlay, ""),
    colorOverlayOpacity: num(value?.colorOverlayOpacity, 0),
    gradientStart: str(value?.gradientStart, ""),
    gradientEnd: str(value?.gradientEnd, ""),
    gradientOpacity: num(value?.gradientOpacity, 0),
    blendMode: ["normal","multiply","screen","overlay"].includes(value?.blendMode as string)
      ? value?.blendMode as BlendMode : "normal",
    motionEffect: ["none","slowZoom","kenBurns","drift"].includes(value?.motionEffect as string)
      ? value?.motionEffect as MotionEffect : "slowZoom",
    motionSpeed: num(value?.motionSpeed, 12),
  };
}

export function pageKeyFromPath(pathname: string): string {
  const clean = pathname.replace(/^\//, "").split("/")[0] || "home";
  return clean;
}
