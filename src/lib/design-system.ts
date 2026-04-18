import {
  BUTTON_VARIANT_OPTIONS,
  DEFAULT_GLOBAL_DESIGN_SYSTEM,
  type DesignButtonVariant,
  type DesignRadiusToken,
  type GlobalDesignSystem,
} from "@/types/design-system";

const BUTTON_VARIANTS = new Set<DesignButtonVariant>(BUTTON_VARIANT_OPTIONS.map((option) => option.value));
const RADIUS_KEYS = new Set<DesignRadiusToken>(["sm", "md", "lg", "xl", "pill"]);

const asNumber = (value: unknown, fallback: number, min?: number, max?: number) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  if (typeof min === "number" && parsed < min) return min;
  if (typeof max === "number" && parsed > max) return max;
  return parsed;
};

const asString = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const toAlphaColor = (color: string, alpha: number) => {
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `color-mix(in srgb, ${color} ${Math.round(safeAlpha * 100)}%, transparent)`;
};

const rgbToHsl = (r: number, g: number, b: number) => {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rr:
        h = (gg - bb) / d + (gg < bb ? 6 : 0);
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      case bb:
        h = (rr - gg) / d + 4;
        break;
    }

    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const hexToHslString = (color: string) => {
  const trimmed = color.trim();

  if (/^hsla?\(/i.test(trimmed)) {
    const values = trimmed
      .replace(/^hsla?\(/i, "")
      .replace(/\)$/i, "")
      .split(",")
      .map((part) => part.trim());

    if (values.length >= 3) {
      return `${values[0].replace(/deg$/, "")} ${values[1]} ${values[2]}`;
    }
  }

  if (/^rgba?\(/i.test(trimmed)) {
    const values = trimmed
      .replace(/^rgba?\(/i, "")
      .replace(/\)$/i, "")
      .split(",")
      .map((part) => Number(part.trim()));

    if (values.length >= 3 && values.every((value, index) => index > 2 || !Number.isNaN(value))) {
      return rgbToHsl(values[0], values[1], values[2]);
    }
  }

  const normalized = trimmed.replace("#", "");
  const hex = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;

  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return rgbToHsl(r, g, b);
};

/**
 * Map Admin's flat theme payload (e.g. { primary, accent, background, card, border, foreground, ... })
 * into our nested GlobalDesignSystem.colors slot. Only used when the legacy nested
 * `colors` object isn't present (i.e. the row was published from the Admin theme editor).
 */
const mapFlatColors = (raw: Record<string, unknown>) => {
  const pick = (key: string): string | undefined => {
    const v = raw[key];
    return typeof v === "string" && v.trim() ? v : undefined;
  };
  const result: Partial<GlobalDesignSystem["colors"]> = {};
  const primary = pick("primary");
  const accent = pick("accent") ?? pick("secondary");
  const background = pick("background");
  const surface = pick("card") ?? pick("surface") ?? pick("muted");
  const text = pick("foreground") ?? pick("card_foreground") ?? pick("text");
  const mutedText = pick("muted_foreground") ?? pick("mutedText");
  const border = pick("border");
  if (primary) result.primary = primary;
  if (accent) result.accent = accent;
  if (background) result.background = background;
  if (surface) result.surface = surface;
  if (text) result.text = text;
  if (mutedText) result.mutedText = mutedText;
  if (border) result.border = border;
  return result;
};

export const normalizeGlobalDesignSystem = (value: unknown): GlobalDesignSystem => {
  const raw = value && typeof value === "object" ? (value as Partial<GlobalDesignSystem> & Record<string, unknown>) : {};
  const typographyPresets = (raw.typography?.presets ?? {}) as Record<string, any>;
  const animationPresets = (raw.animations?.presets ?? {}) as Record<string, any>;

  const defaultVariant = raw.buttons?.defaultVariant;
  const radiusToken = raw.buttons?.radiusToken;

  const flatColors = raw.colors ? {} : mapFlatColors(raw as Record<string, unknown>);

  return {
    ...DEFAULT_GLOBAL_DESIGN_SYSTEM,
    colors: {
      ...DEFAULT_GLOBAL_DESIGN_SYSTEM.colors,
      ...flatColors,
      ...(raw.colors ?? {}),
    },
    typography: {
      ...DEFAULT_GLOBAL_DESIGN_SYSTEM.typography,
      ...(raw.typography ?? {}),
      displayFont: asString(raw.typography?.displayFont, DEFAULT_GLOBAL_DESIGN_SYSTEM.typography.displayFont),
      bodyFont: asString(raw.typography?.bodyFont, DEFAULT_GLOBAL_DESIGN_SYSTEM.typography.bodyFont),
      baseSize: asNumber(raw.typography?.baseSize, DEFAULT_GLOBAL_DESIGN_SYSTEM.typography.baseSize, 12, 20),
      scale: asNumber(raw.typography?.scale, DEFAULT_GLOBAL_DESIGN_SYSTEM.typography.scale, 0.85, 1.4),
      presets: {
        hero: { ...DEFAULT_GLOBAL_DESIGN_SYSTEM.typography.presets.hero, ...(typographyPresets.hero ?? {}) },
        heading: { ...DEFAULT_GLOBAL_DESIGN_SYSTEM.typography.presets.heading, ...(typographyPresets.heading ?? {}) },
        body: { ...DEFAULT_GLOBAL_DESIGN_SYSTEM.typography.presets.body, ...(typographyPresets.body ?? {}) },
        eyebrow: { ...DEFAULT_GLOBAL_DESIGN_SYSTEM.typography.presets.eyebrow, ...(typographyPresets.eyebrow ?? {}) },
      },
    },
    spacing: {
      xs: asNumber(raw.spacing?.xs, DEFAULT_GLOBAL_DESIGN_SYSTEM.spacing.xs, 0, 40),
      sm: asNumber(raw.spacing?.sm, DEFAULT_GLOBAL_DESIGN_SYSTEM.spacing.sm, 0, 60),
      md: asNumber(raw.spacing?.md, DEFAULT_GLOBAL_DESIGN_SYSTEM.spacing.md, 0, 80),
      lg: asNumber(raw.spacing?.lg, DEFAULT_GLOBAL_DESIGN_SYSTEM.spacing.lg, 0, 120),
      xl: asNumber(raw.spacing?.xl, DEFAULT_GLOBAL_DESIGN_SYSTEM.spacing.xl, 0, 160),
      section: asNumber(raw.spacing?.section, DEFAULT_GLOBAL_DESIGN_SYSTEM.spacing.section, 0, 220),
    },
    radius: {
      sm: asNumber(raw.radius?.sm, DEFAULT_GLOBAL_DESIGN_SYSTEM.radius.sm, 0, 40),
      md: asNumber(raw.radius?.md, DEFAULT_GLOBAL_DESIGN_SYSTEM.radius.md, 0, 60),
      lg: asNumber(raw.radius?.lg, DEFAULT_GLOBAL_DESIGN_SYSTEM.radius.lg, 0, 80),
      xl: asNumber(raw.radius?.xl, DEFAULT_GLOBAL_DESIGN_SYSTEM.radius.xl, 0, 120),
      pill: asNumber(raw.radius?.pill, DEFAULT_GLOBAL_DESIGN_SYSTEM.radius.pill, 40, 999),
    },
    shadows: {
      color: asString(raw.shadows?.color, DEFAULT_GLOBAL_DESIGN_SYSTEM.shadows.color),
      opacity: asNumber(raw.shadows?.opacity, DEFAULT_GLOBAL_DESIGN_SYSTEM.shadows.opacity, 0, 100),
      blur: asNumber(raw.shadows?.blur, DEFAULT_GLOBAL_DESIGN_SYSTEM.shadows.blur, 8, 80),
    },
    buttons: {
      defaultVariant: BUTTON_VARIANTS.has(defaultVariant as DesignButtonVariant)
        ? (defaultVariant as DesignButtonVariant)
        : DEFAULT_GLOBAL_DESIGN_SYSTEM.buttons.defaultVariant,
      radiusToken: RADIUS_KEYS.has(radiusToken as DesignRadiusToken)
        ? (radiusToken as DesignRadiusToken)
        : DEFAULT_GLOBAL_DESIGN_SYSTEM.buttons.radiusToken,
      uppercase: raw.buttons?.uppercase ?? DEFAULT_GLOBAL_DESIGN_SYSTEM.buttons.uppercase,
    },
    animations: {
      ...DEFAULT_GLOBAL_DESIGN_SYSTEM.animations,
      ...(raw.animations ?? {}),
      defaultPreset: (raw.animations?.defaultPreset as any) || DEFAULT_GLOBAL_DESIGN_SYSTEM.animations.defaultPreset,
      reducedMotion: raw.animations?.reducedMotion ?? DEFAULT_GLOBAL_DESIGN_SYSTEM.animations.reducedMotion,
      presets: {
        subtle: { ...DEFAULT_GLOBAL_DESIGN_SYSTEM.animations.presets.subtle, ...(animationPresets.subtle ?? {}) },
        modern: { ...DEFAULT_GLOBAL_DESIGN_SYSTEM.animations.presets.modern, ...(animationPresets.modern ?? {}) },
        premium: { ...DEFAULT_GLOBAL_DESIGN_SYSTEM.animations.presets.premium, ...(animationPresets.premium ?? {}) },
        playful: { ...DEFAULT_GLOBAL_DESIGN_SYSTEM.animations.presets.playful, ...(animationPresets.playful ?? {}) },
        cinematic: { ...DEFAULT_GLOBAL_DESIGN_SYSTEM.animations.presets.cinematic, ...(animationPresets.cinematic ?? {}) },
      },
    },
  };
};

export const applyDesignSystemToRoot = (tokens: GlobalDesignSystem, root: HTMLElement = document.documentElement) => {
  const normalized = normalizeGlobalDesignSystem(tokens);
  const shadowOpacity = normalized.shadows.opacity / 100;
  const shadowBlur = normalized.shadows.blur;
  const shadowColor = normalized.shadows.color;
  const buttonRadius = normalized.radius[normalized.buttons.radiusToken] ?? normalized.radius.lg;
  const buttonPrimary = normalized.colors.primary;
  const buttonAccent = normalized.colors.accent;

  const setVar = (name: string, value: string) => root.style.setProperty(name, value);

  setVar("--ll-color-primary", normalized.colors.primary);
  setVar("--ll-color-accent", normalized.colors.accent);
  setVar("--ll-color-background", normalized.colors.background);
  setVar("--ll-color-surface", normalized.colors.surface);
  setVar("--ll-color-text", normalized.colors.text);
  setVar("--ll-color-muted", normalized.colors.mutedText);
  setVar("--ll-color-border", normalized.colors.border);

  setVar("--ll-primary-hsl", hexToHslString(normalized.colors.primary) || "217 91% 60%");
  setVar("--ll-accent-hsl", hexToHslString(normalized.colors.accent) || "200 80% 55%");
  setVar("--ll-background-hsl", hexToHslString(normalized.colors.background) || "228 33% 6%");
  setVar("--ll-surface-hsl", hexToHslString(normalized.colors.surface) || "224 30% 11%");
  setVar("--ll-text-hsl", hexToHslString(normalized.colors.text) || "215 25% 95%");
  setVar("--ll-muted-hsl", hexToHslString(normalized.colors.mutedText) || "215 15% 60%");
  setVar("--ll-border-hsl", hexToHslString(normalized.colors.border) || "224 20% 18%");

  setVar("--ll-font-display", normalized.typography.displayFont);
  setVar("--ll-font-sans", normalized.typography.bodyFont);
  setVar("--ll-font-base", `${normalized.typography.baseSize}px`);
  setVar("--ll-font-scale", `${normalized.typography.scale}`);

  Object.entries(normalized.spacing).forEach(([key, value]) => setVar(`--ll-spacing-${key}`, `${value}px`));
  Object.entries(normalized.radius).forEach(([key, value]) => setVar(`--ll-radius-${key}`, `${value}px`));
  setVar("--radius", `${normalized.radius.md}px`);

  const shadowMap = {
    sm: `0 2px 6px -2px ${toAlphaColor(shadowColor, shadowOpacity * 0.45)}`,
    md: `0 10px 18px -8px ${toAlphaColor(shadowColor, shadowOpacity * 0.7)}`,
    lg: `0 18px ${shadowBlur}px -10px ${toAlphaColor(shadowColor, shadowOpacity * 0.9)}`,
    xl: `0 24px ${shadowBlur + 10}px -12px ${toAlphaColor(shadowColor, Math.min(1, shadowOpacity + 0.1))}`,
    "2xl": `0 30px ${shadowBlur + 20}px -14px ${toAlphaColor(shadowColor, Math.min(1, shadowOpacity + 0.16))}`,
    soft: `0 14px ${shadowBlur + 6}px -12px ${toAlphaColor(shadowColor, shadowOpacity * 0.8)}`,
    hard: `4px 4px 0 ${toAlphaColor(shadowColor, Math.min(1, shadowOpacity + 0.12))}`,
    colored: `0 16px ${shadowBlur + 4}px -10px ${toAlphaColor(buttonPrimary, 0.35)}`,
    layered: `0 3px 8px ${toAlphaColor(shadowColor, shadowOpacity * 0.55)}, 0 14px ${shadowBlur}px ${toAlphaColor(shadowColor, shadowOpacity * 0.45)}`,
    inset: `inset 0 2px 12px ${toAlphaColor(shadowColor, shadowOpacity * 0.55)}`,
  } as const;

  Object.entries(shadowMap).forEach(([key, value]) => setVar(`--ll-shadow-${key}`, value));

  setVar("--ll-button-radius", `${buttonRadius}px`);
  setVar("--ll-button-letter-spacing", normalized.buttons.uppercase ? "0.12em" : "0.01em");
  setVar("--ll-button-text-transform", normalized.buttons.uppercase ? "uppercase" : "none");
  setVar("--ll-button-shadow", `0 12px ${shadowBlur + 4}px -12px ${toAlphaColor(buttonPrimary, 0.4)}`);
  setVar("--ll-button-shadow-strong", `0 18px ${shadowBlur + 18}px -12px ${toAlphaColor(buttonPrimary, 0.55)}`);
  setVar("--ll-button-glow", `0 0 32px ${toAlphaColor(buttonAccent, 0.3)}`);
};
