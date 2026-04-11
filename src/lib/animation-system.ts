/**
 * Shared animation system – single source of truth for all motion
 * values used in the visual editor, block renderer, and promotion popup.
 */
import type { Transition } from "framer-motion";

/* ── Option arrays (used by editor controls) ── */

export const ENTRANCE_ANIMATION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "fadeUp", label: "Fade Up" },
  { value: "fadeDown", label: "Fade Down" },
  { value: "fadeIn", label: "Fade In" },
  { value: "fadeLeft", label: "Fade from Left" },
  { value: "fadeRight", label: "Fade from Right" },
  { value: "slideUp", label: "Slide Up" },
  { value: "slideDown", label: "Slide Down" },
  { value: "slideLeft", label: "Slide Left" },
  { value: "slideRight", label: "Slide Right" },
  { value: "scaleIn", label: "Scale In" },
  { value: "scaleUp", label: "Scale Up" },
  { value: "rotateIn", label: "Rotate In" },
  { value: "blurIn", label: "Blur In" },
  { value: "flipIn", label: "Flip In" },
  { value: "bounceIn", label: "Bounce In" },
  { value: "popIn", label: "Pop In" },
] as const;

export const HOVER_EFFECT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "lift", label: "Lift Up" },
  { value: "scale", label: "Scale Up" },
  { value: "glow", label: "Glow" },
  { value: "shadowGrow", label: "Shadow Grow" },
  { value: "borderHighlight", label: "Border Highlight" },
  { value: "imageZoom", label: "Image Zoom" },
  { value: "tiltX", label: "Tilt" },
  { value: "colorShift", label: "Color Shift" },
  { value: "brighten", label: "Brighten" },
] as const;

export const PRESS_EFFECT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "shrink", label: "Shrink" },
  { value: "push", label: "Push Down" },
  { value: "squish", label: "Squish" },
  { value: "dimPress", label: "Dim" },
  { value: "pulse", label: "Pulse" },
] as const;

export const SCROLL_EFFECT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "parallax", label: "Parallax" },
  { value: "fadeOnScroll", label: "Fade on Scroll" },
  { value: "revealOnScroll", label: "Reveal on Scroll" },
  { value: "scaleOnScroll", label: "Scale on Scroll" },
] as const;

export const GROUP_TIMELINE_OPTIONS = [
  { value: "together", label: "All Together" },
  { value: "oneByOne", label: "One by One" },
  { value: "byRow", label: "By Row" },
  { value: "byColumn", label: "By Column" },
] as const;

export const MOTION_SCOPE_OPTIONS = [
  { value: "all", label: "All Viewports" },
  { value: "desktop", label: "Desktop Only" },
  { value: "mobile", label: "Mobile Only" },
] as const;

export const MOTION_EASING_OPTIONS = [
  { value: "ease", label: "Ease" },
  { value: "easeIn", label: "Ease In" },
  { value: "easeOut", label: "Ease Out" },
  { value: "easeInOut", label: "Ease In Out" },
  { value: "spring", label: "Spring" },
  { value: "bounce", label: "Bounce" },
] as const;

/* ── Built-in preset configs ── */

export const BUILT_IN_MOTION_PRESETS: Record<string, { label: string; values: Record<string, unknown> }> = {
  subtle_luxury: {
    label: "Subtle & Luxurious",
    values: { animation: "fadeIn", animationDuration: 0.5, hoverEffect: "lift", pressEffect: "shrink", groupReveal: "oneByOne", staggerDelay: 0.04 },
  },
  energetic_cta: {
    label: "Energetic CTA",
    values: { animation: "bounceIn", animationDuration: 0.4, hoverEffect: "scale", pressEffect: "squish", groupReveal: "together" },
  },
  soft_fade: {
    label: "Soft Fade System",
    values: { animation: "fadeUp", animationDuration: 0.45, hoverEffect: "none", pressEffect: "none", groupReveal: "oneByOne", staggerDelay: 0.06 },
  },
  premium_hover: {
    label: "Premium Hover",
    values: { animation: "blurIn", animationDuration: 0.6, hoverEffect: "glow", pressEffect: "dimPress", groupReveal: "byRow" },
  },
  product_spotlight: {
    label: "Product Spotlight",
    values: { animation: "scaleIn", animationDuration: 0.5, hoverEffect: "shadowGrow", pressEffect: "shrink", groupReveal: "oneByOne", staggerDelay: 0.05 },
  },
  trust_widget: {
    label: "Trust Widget Motion",
    values: { animation: "fadeUp", animationDuration: 0.35, hoverEffect: "lift", pressEffect: "push", groupReveal: "byColumn" },
  },
};

/* ── Content keys tracked by the motion system ── */

export const MOTION_PRESET_KEYS = [
  "animationPreset", "animation", "animationDuration", "animationDelay",
  "animationDistance", "animationEasing", "animationTrigger",
  "hoverEffect", "hoverIntensity", "pressEffect", "pressIntensity",
  "scrollEffect", "parallaxDepth",
  "groupReveal", "staggerDelay", "motionScope",
  "disableAnimOnMobile", "respectReducedMotion",
  "continuousEffect", "continuousSpeed",
  "startOpacity", "endOpacity", "viewportThreshold", "animateOnce",
  "motionAnalyticsLabel",
] as const;

/* ── Resolve motion ease ── */

export function resolveMotionEase(easing?: string): Transition["ease"] {
  switch (easing) {
    case "easeIn": return [0.42, 0, 1, 1];
    case "easeOut": return [0, 0, 0.58, 1];
    case "easeInOut": return [0.42, 0, 0.58, 1];
    case "spring": return [0.22, 1.2, 0.36, 1];
    case "bounce": return [0.34, 1.56, 0.64, 1];
    default: return [0.22, 1, 0.36, 1];
  }
}

/* ── Viewport-aware motion toggle ── */

export function isMotionEnabledForViewport(
  content: Record<string, unknown>,
  viewport: "mobile" | "desktop",
  prefersReduced: boolean,
): boolean {
  if (content.respectReducedMotion !== false && prefersReduced) return false;

  const scope = (content.motionScope as string) || "all";
  if (scope === "desktop" && viewport === "mobile") return false;
  if (scope === "mobile" && viewport === "desktop") return false;

  if (content.disableAnimOnMobile && viewport === "mobile") return false;
  return true;
}

/* ── Entrance animation builder ── */

export function buildEntranceAnimation(content: Record<string, unknown>) {
  const anim = (content.animation as string) || "none";
  const dist = (content.animationDistance as number) ?? 20;
  const dur = (content.animationDuration as number) ?? 0.4;
  const delay = (content.animationDelay as number) ?? 0;
  const startOpacity = (content.startOpacity as number) ?? 0;

  const map: Record<string, { initial: Record<string, number | string>; animate: Record<string, number | string> }> = {
    none: { initial: { opacity: startOpacity, y: 18 }, animate: { opacity: 1, y: 0 } },
    fadeUp: { initial: { opacity: startOpacity, y: dist }, animate: { opacity: 1, y: 0 } },
    fadeDown: { initial: { opacity: startOpacity, y: -dist }, animate: { opacity: 1, y: 0 } },
    fadeIn: { initial: { opacity: startOpacity }, animate: { opacity: 1 } },
    fadeLeft: { initial: { opacity: startOpacity, x: -dist }, animate: { opacity: 1, x: 0 } },
    fadeRight: { initial: { opacity: startOpacity, x: dist }, animate: { opacity: 1, x: 0 } },
    slideUp: { initial: { y: dist, opacity: startOpacity }, animate: { y: 0, opacity: 1 } },
    slideDown: { initial: { y: -dist, opacity: startOpacity }, animate: { y: 0, opacity: 1 } },
    slideLeft: { initial: { x: -dist, opacity: startOpacity }, animate: { x: 0, opacity: 1 } },
    slideRight: { initial: { x: dist, opacity: startOpacity }, animate: { x: 0, opacity: 1 } },
    scaleIn: { initial: { scale: 0.9, opacity: startOpacity }, animate: { scale: 1, opacity: 1 } },
    scaleUp: { initial: { scale: 0.8, opacity: startOpacity }, animate: { scale: 1, opacity: 1 } },
    rotateIn: { initial: { rotate: -5, opacity: startOpacity, scale: 0.95 }, animate: { rotate: 0, opacity: 1, scale: 1 } },
    blurIn: { initial: { opacity: startOpacity, filter: "blur(10px)" }, animate: { opacity: 1, filter: "blur(0px)" } },
    flipIn: { initial: { rotateX: 90, opacity: startOpacity }, animate: { rotateX: 0, opacity: 1 } },
    bounceIn: { initial: { scale: 0.5, opacity: startOpacity }, animate: { scale: 1, opacity: 1 } },
    popIn: { initial: { scale: 0.6, opacity: startOpacity, y: 10 }, animate: { scale: 1, opacity: 1, y: 0 } },
  };

  const entry = map[anim] || map.none;
  return {
    initial: entry.initial,
    animate: entry.animate,
    transition: {
      duration: dur,
      delay,
      ease: resolveMotionEase(content.animationEasing as string),
    },
  };
}

/* ── Hover animation builder ── */

export function buildHoverAnimation(content: Record<string, unknown>): Record<string, number | string> {
  const effect = (content.hoverEffect as string) || "none";
  const intensity = ((content.hoverIntensity as number) ?? 50) / 100;
  const map: Record<string, Record<string, number | string>> = {
    lift: { y: -6 * intensity },
    scale: { scale: 1 + 0.05 * intensity },
    glow: { boxShadow: `0 0 ${30 * intensity}px hsl(217 91% 60% / ${0.3 * intensity})` },
    shadowGrow: { boxShadow: `0 ${20 * intensity}px ${40 * intensity}px -10px hsl(228 33% 2% / 0.5)` },
    brighten: { filter: `brightness(${1 + 0.2 * intensity})` },
    tiltX: { rotateY: 3 * intensity, rotateX: -2 * intensity },
  };
  return map[effect] || {};
}

/* ── Press animation builder ── */

export function buildPressAnimation(content: Record<string, unknown>): Record<string, number | string> {
  const effect = (content.pressEffect as string) || "none";
  const intensity = ((content.pressIntensity as number) ?? 50) / 100;
  const map: Record<string, Record<string, number | string>> = {
    shrink: { scale: 1 - 0.04 * intensity },
    push: { y: 3 * intensity },
    squish: { scaleY: 1 - 0.03 * intensity, scaleX: 1 + 0.01 * intensity },
    dimPress: { opacity: 1 - 0.15 * intensity },
    pulse: { scale: 1 + 0.03 * intensity },
  };
  return map[effect] || {};
}

/* ── Group / stagger helpers ── */

export function getMotionGroupDelayIndex(
  mode: string,
  index: number,
  columns: number,
): number {
  switch (mode) {
    case "together": return 0;
    case "byRow": return Math.floor(index / columns);
    case "byColumn": return index % columns;
    case "oneByOne":
    default: return index;
  }
}

export function buildChildRevealProps(
  content: Record<string, unknown>,
  index: number,
  opts: { columns?: number; enabled?: boolean; disableAnimations?: boolean } = {},
) {
  const { columns = 1, enabled = true, disableAnimations = false } = opts;
  if (disableAnimations || !enabled) {
    return { initial: false as const, animate: { opacity: 1, y: 0 } };
  }

  const entrance = buildEntranceAnimation(content);
  const hover = buildHoverAnimation(content);
  const press = buildPressAnimation(content);
  const groupMode = (content.groupReveal as string) || "oneByOne";
  const staggerDelay = (content.staggerDelay as number) ?? 0.04;
  const delayIdx = getMotionGroupDelayIndex(groupMode, index, columns);

  return {
    initial: entrance.initial,
    whileInView: entrance.animate,
    viewport: { once: content.animateOnce !== false, amount: (content.viewportThreshold as number) ?? 0.12 },
    transition: { ...entrance.transition, delay: (entrance.transition.delay ?? 0) + delayIdx * staggerDelay },
    whileHover: Object.keys(hover).length > 0 ? hover : undefined,
    whileTap: Object.keys(press).length > 0 ? press : undefined,
  };
}

/* ── Preset snapshot (for saving) ── */

export function extractMotionPresetSnapshot(content: Record<string, unknown>): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const key of MOTION_PRESET_KEYS) {
    if (content[key] !== undefined) snapshot[key] = content[key];
  }
  return snapshot;
}
