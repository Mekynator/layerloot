export type DesignButtonVariant = "default" | "secondary" | "outline" | "ghost" | "link" | "luxury" | "pill";
export type DesignTypographyPresetKey = "hero" | "heading" | "body" | "eyebrow";
export type DesignAnimationPresetKey = "subtle" | "modern" | "premium" | "playful" | "cinematic";
export type DesignRadiusToken = "sm" | "md" | "lg" | "xl" | "pill";

export interface DesignTypographyPreset {
  label: string;
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
}

export interface DesignAnimationPreset {
  label: string;
  animation: string;
  animationDuration: number;
  hoverEffect: string;
  continuousEffect?: string;
}

export interface GlobalDesignSystem {
  colors: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    border: string;
  };
  typography: {
    displayFont: string;
    bodyFont: string;
    baseSize: number;
    scale: number;
    presets: Record<DesignTypographyPresetKey, DesignTypographyPreset>;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    section: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  shadows: {
    color: string;
    opacity: number;
    blur: number;
  };
  buttons: {
    defaultVariant: DesignButtonVariant;
    radiusToken: DesignRadiusToken;
    uppercase: boolean;
  };
  animations: {
    defaultPreset: DesignAnimationPresetKey;
    reducedMotion: boolean;
    presets: Record<DesignAnimationPresetKey, DesignAnimationPreset>;
  };
}

export const DESIGN_SYSTEM_COLOR_OPTIONS = [
  { key: "primary", label: "Brand / Primary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Page Background" },
  { key: "surface", label: "Card / Surface" },
  { key: "text", label: "Main Text" },
  { key: "mutedText", label: "Muted Text" },
  { key: "border", label: "Borders" },
] as const;

export const SPACING_TOKEN_OPTIONS = [
  { value: "xs", label: "Extra Tight" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Balanced" },
  { value: "lg", label: "Comfortable" },
  { value: "xl", label: "Spacious" },
  { value: "section", label: "Section" },
] as const;

export const RADIUS_TOKEN_OPTIONS = [
  { value: "sm", label: "Subtle" },
  { value: "md", label: "Soft" },
  { value: "lg", label: "Rounded" },
  { value: "xl", label: "Showcase" },
  { value: "pill", label: "Pill" },
] as const;

export const BUTTON_VARIANT_OPTIONS: Array<{ value: DesignButtonVariant; label: string; description?: string }> = [
  { value: "default", label: "Primary CTA", description: "Brand gradient" },
  { value: "secondary", label: "Soft Secondary", description: "Filled surface button" },
  { value: "outline", label: "Secondary Outline", description: "Light frame button" },
  { value: "ghost", label: "Ghost Minimal", description: "Subtle text action" },
  { value: "luxury", label: "Luxury Glow", description: "Premium highlighted CTA" },
  { value: "pill", label: "Pill CTA", description: "Rounded promotional button" },
  { value: "link", label: "Text Link", description: "Inline action" },
];

export const FONT_OPTIONS = [
  { value: '"Oswald", sans-serif', label: "Oswald" },
  { value: '"Source Sans 3", sans-serif', label: "Source Sans 3" },
  { value: 'system-ui, sans-serif', label: "System UI" },
  { value: '"Segoe UI", sans-serif', label: "Segoe UI" },
  { value: 'Georgia, serif', label: "Georgia" },
  { value: '"Courier New", monospace', label: "Courier New" },
] as const;

export const DEFAULT_GLOBAL_DESIGN_SYSTEM: GlobalDesignSystem = {
  colors: {
    primary: "#3b82f6",
    accent: "#22c1ff",
    background: "#080d14",
    surface: "#121926",
    text: "#f4f7fb",
    mutedText: "#9aa7bd",
    border: "#202b3a",
  },
  typography: {
    displayFont: '"Oswald", sans-serif',
    bodyFont: '"Source Sans 3", sans-serif',
    baseSize: 16,
    scale: 1,
    presets: {
      hero: {
        label: "Hero Headline",
        fontFamily: "var(--font-display)",
        fontWeight: "700",
        fontSize: 52,
        lineHeight: 1.05,
        letterSpacing: 0,
        textTransform: "uppercase",
      },
      heading: {
        label: "Section Heading",
        fontFamily: "var(--font-display)",
        fontWeight: "700",
        fontSize: 32,
        lineHeight: 1.1,
        letterSpacing: 0.4,
        textTransform: "uppercase",
      },
      body: {
        label: "Body Copy",
        fontFamily: "var(--font-sans)",
        fontWeight: "400",
        fontSize: 16,
        lineHeight: 1.6,
        letterSpacing: 0,
        textTransform: "none",
      },
      eyebrow: {
        label: "Eyebrow / Label",
        fontFamily: "var(--font-display)",
        fontWeight: "600",
        fontSize: 12,
        lineHeight: 1.2,
        letterSpacing: 1.6,
        textTransform: "uppercase",
      },
    },
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 20,
    lg: 32,
    xl: 48,
    section: 72,
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    pill: 999,
  },
  shadows: {
    color: "#05070c",
    opacity: 42,
    blur: 28,
  },
  buttons: {
    defaultVariant: "default",
    radiusToken: "lg",
    uppercase: true,
  },
  animations: {
    defaultPreset: "modern",
    reducedMotion: true,
    presets: {
      subtle: { label: "Subtle", animation: "fadeIn", animationDuration: 0.5, hoverEffect: "lift", continuousEffect: "none" },
      modern: { label: "Modern", animation: "fadeUp", animationDuration: 0.4, hoverEffect: "scale", continuousEffect: "none" },
      premium: { label: "Premium", animation: "blurIn", animationDuration: 0.6, hoverEffect: "glow", continuousEffect: "shimmer" },
      playful: { label: "Playful", animation: "bounceIn", animationDuration: 0.5, hoverEffect: "scale", continuousEffect: "float" },
      cinematic: { label: "Cinematic", animation: "scaleIn", animationDuration: 0.8, hoverEffect: "shadowGrow", continuousEffect: "breathe" },
    },
  },
};
