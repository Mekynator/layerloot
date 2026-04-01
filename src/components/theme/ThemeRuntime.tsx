import { useEffect } from "react";

export interface ThemeGalleryImage {
  id: string;
  label: string;
  url: string;
  category?: string;
}

export interface RuntimeThemeConfig {
  preset: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  card: string;
  card_foreground: string;
  background_image_url: string;
  background_pattern: string;
  background_effect: string;
  enable_motion: boolean;
  image_fit: "cover" | "contain";
  image_opacity: number;
  pattern_opacity: number;
  effect_opacity: number;
  effect_speed: "slow" | "normal" | "fast";
  overlay_tint: string;
  overlay_strength: number;
  available_backgrounds?: ThemeGalleryImage[];
}

/** Theme is now baked into CSS. This component only ensures dark mode class. */
const ThemeRuntime = () => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return null;
};

export default ThemeRuntime;
