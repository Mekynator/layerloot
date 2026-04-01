import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, ImagePlus, Palette, Save, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface PromoConfig {
  enabled: boolean;
  title: string;
  message: string;
  button_text: string;
  button_link: string;
  image_url: string;
  dismiss_key: string;
}

interface FooterConfig {
  description: string;
  quick_links_title: string;
  account_title: string;
  contact_title: string;
  copyright_text: string;
  show_quick_links: boolean;
  show_account_links: boolean;
  show_contact_block: boolean;
  show_logo_icon: boolean;
  show_logo_text: boolean;
  logo_height_px: number;
  auth_link_label: string;
  account_link_label: string;
  orders_link_label: string;
}

interface FooterContactConfig {
  email: string;
  phone: string;
  address: string;
  contact_description: string;
  email_label: string;
  phone_label: string;
  address_label: string;
  instagram_url: string;
  facebook_url: string;
  social_title: string;
}

interface BrandingConfig {
  logo_text_left: string;
  logo_text_right: string;
  logo_image_url: string;
  logo_link: string;
  logo_alt: string;
}

export interface ThemeGalleryImage {
  id: string;
  label: string;
  url: string;
  category?: string;
}

interface ThemeConfig {
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

const defaultPromo: PromoConfig = {
  enabled: false,
  title: "Welcome!",
  message: "Check out our latest 3D printed items.",
  button_text: "Shop Now",
  button_link: "/products",
  image_url: "",
  dismiss_key: "v1",
};

const defaultFooter: FooterConfig = {
  description: "Premium 3D printing supplies and custom prints for makers, hobbyists, and professionals.",
  quick_links_title: "Quick Links",
  account_title: "Account",
  contact_title: "Contact",
  copyright_text: "All rights reserved.",
  show_quick_links: true,
  show_account_links: true,
  show_contact_block: true,
  show_logo_icon: true,
  show_logo_text: true,
  logo_height_px: 32,
  auth_link_label: "Login / Register",
  account_link_label: "My Account",
  orders_link_label: "Order History",
};

const defaultFooterContact: FooterContactConfig = {
  email: "support@layerloot.lovable.app",
  phone: "+45 00 00 00 00",
  address: "Denmark",
  contact_description: "Questions, custom requests, or order help? Reach out anytime.",
  email_label: "Email",
  phone_label: "Phone",
  address_label: "Address",
  instagram_url: "",
  facebook_url: "",
  social_title: "Follow us",
};

const defaultBranding: BrandingConfig = {
  logo_text_left: "Layer",
  logo_text_right: "Loot",
  logo_image_url: "",
  logo_link: "/",
  logo_alt: "LayerLoot",
};

const DEFAULT_BACKGROUND_LIBRARY: ThemeGalleryImage[] = [
  {
    id: "midnight-blue",
    label: "Midnight Blue",
    category: "Core",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0a0f1a"/>
            <stop offset="50%" stop-color="#111b2e"/>
            <stop offset="100%" stop-color="#0d1929"/>
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="0%" r="70%">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#bg)"/>
        <rect width="1600" height="900" fill="url(#glow)"/>
      </svg>
    `),
  },
  {
    id: "deep-ocean",
    label: "Deep Ocean",
    category: "Core",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stop-color="#020617"/>
            <stop offset="50%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#1e1b4b"/>
          </linearGradient>
          <radialGradient id="glow" cx="70%" cy="30%" r="50%">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#bg)"/>
        <rect width="1600" height="900" fill="url(#glow)"/>
      </svg>
    `),
  },
  {
    id: "classic-forge",
    label: "Classic Forge",
    category: "Core",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0c1017"/>
            <stop offset="50%" stop-color="#111827"/>
            <stop offset="100%" stop-color="#1d0f08"/>
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="0%" r="70%">
            <stop offset="0%" stop-color="#f97316" stop-opacity="0.42"/>
            <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#bg)"/>
        <rect width="1600" height="900" fill="url(#glow)"/>
      </svg>
    `),
  },
  {
    id: "aurora-night",
    label: "Aurora Night",
    category: "Premium",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <rect width="1600" height="900" fill="#020617"/>
        <ellipse cx="400" cy="200" rx="600" ry="200" fill="#22d3ee" opacity="0.08"/>
        <ellipse cx="900" cy="300" rx="500" ry="180" fill="#818cf8" opacity="0.1"/>
        <ellipse cx="1200" cy="150" rx="400" ry="150" fill="#34d399" opacity="0.06"/>
      </svg>
    `),
  },
  {
    id: "ember-glow",
    label: "Ember Glow",
    category: "Premium",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <rect width="1600" height="900" fill="#1a0a00"/>
        <ellipse cx="800" cy="700" rx="800" ry="400" fill="#f97316" opacity="0.08"/>
        <ellipse cx="600" cy="400" rx="300" ry="200" fill="#ef4444" opacity="0.05"/>
      </svg>
    `),
  },
  {
    id: "christmas-lights",
    label: "Christmas Lights",
    category: "Festive",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <rect width="1600" height="900" fill="#07180f"/>
        <path d="M0 120 C180 220 300 40 520 140 S900 230 1120 120 S1420 30 1600 130" stroke="#2e4734" stroke-width="6" fill="none"/>
        <g>
          <circle cx="150" cy="150" r="16" fill="#ff4d6d"/>
          <circle cx="310" cy="104" r="16" fill="#ffe066"/>
          <circle cx="470" cy="142" r="16" fill="#80ed99"/>
          <circle cx="680" cy="186" r="16" fill="#4cc9f0"/>
        </g>
      </svg>
    `),
  },
  {
    id: "halloween-moon",
    label: "Halloween Moon",
    category: "Festive",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <rect width="1600" height="900" fill="#100615"/>
        <circle cx="1200" cy="190" r="100" fill="#ffb703" opacity="0.9"/>
        <path d="M0 760 C220 620 380 840 620 720 S1030 840 1280 730 S1500 700 1600 760V900H0Z" fill="#1a0f24"/>
      </svg>
    `),
  },
];

const defaultTheme: ThemeConfig = {
  preset: "default",
  primary: "217 91% 60%",
  secondary: "222 40% 14%",
  accent: "217 91% 60%",
  background: "222 47% 6%",
  foreground: "215 20% 93%",
  muted: "222 30% 15%",
  border: "222 30% 18%",
  card: "222 40% 10%",
  card_foreground: "215 20% 93%",
  background_image_url: DEFAULT_BACKGROUND_LIBRARY[0].url,
  background_pattern: "grid",
  background_effect: "none",
  enable_motion: true,
  image_fit: "cover",
  image_opacity: 0.28,
  pattern_opacity: 0.28,
  effect_opacity: 0.7,
  effect_speed: "normal",
  overlay_tint: "222 47% 6%",
  overlay_strength: 0.35,
  available_backgrounds: DEFAULT_BACKGROUND_LIBRARY,
};

const SEASONAL_PRESETS: Record<string, Partial<ThemeConfig> & { label: string; imageId?: string }> = {
  default: {
    label: "Midnight Blue",
    primary: "217 91% 60%",
    secondary: "222 40% 14%",
    accent: "217 91% 60%",
    background: "222 47% 6%",
    foreground: "215 20% 93%",
    muted: "222 30% 15%",
    border: "222 30% 18%",
    card: "222 40% 10%",
    card_foreground: "215 20% 93%",
    background_pattern: "grid",
    background_effect: "none",
    overlay_tint: "222 47% 6%",
    overlay_strength: 0.35,
    imageId: "midnight-blue",
  },
  "deep-ocean": {
    label: "Deep Ocean",
    primary: "239 84% 67%",
    secondary: "222 47% 11%",
    accent: "199 89% 48%",
    background: "222 47% 4%",
    foreground: "210 40% 96%",
    muted: "217 33% 17%",
    border: "215 20% 20%",
    card: "224 71% 8%",
    card_foreground: "210 40% 96%",
    background_pattern: "waves",
    background_effect: "particles",
    overlay_tint: "222 47% 4%",
    overlay_strength: 0.3,
    imageId: "deep-ocean",
  },
  "classic-orange": {
    label: "Classic Orange",
    primary: "24 95% 53%",
    secondary: "220 15% 16%",
    accent: "24 95% 53%",
    background: "220 20% 10%",
    foreground: "0 0% 95%",
    muted: "220 15% 20%",
    border: "220 15% 22%",
    card: "220 15% 14%",
    card_foreground: "0 0% 95%",
    background_pattern: "grid",
    background_effect: "none",
    overlay_tint: "220 20% 10%",
    overlay_strength: 0.35,
    imageId: "classic-forge",
  },
  aurora: {
    label: "Aurora",
    primary: "174 72% 56%",
    secondary: "222 47% 11%",
    accent: "262 83% 68%",
    background: "222 47% 5%",
    foreground: "180 20% 95%",
    muted: "220 20% 16%",
    border: "220 20% 20%",
    card: "222 40% 9%",
    card_foreground: "180 20% 95%",
    background_pattern: "none",
    background_effect: "aurora",
    overlay_tint: "222 47% 5%",
    overlay_strength: 0.2,
    imageId: "aurora-night",
  },
  emerald: {
    label: "Emerald",
    primary: "160 84% 39%",
    secondary: "160 30% 12%",
    accent: "142 71% 45%",
    background: "160 40% 5%",
    foreground: "150 20% 95%",
    muted: "160 20% 14%",
    border: "160 20% 18%",
    card: "160 30% 8%",
    card_foreground: "150 20% 95%",
    background_pattern: "dots",
    background_effect: "fireflies",
    overlay_tint: "160 40% 5%",
    overlay_strength: 0.3,
  },
  crimson: {
    label: "Crimson",
    primary: "0 72% 56%",
    secondary: "0 20% 12%",
    accent: "350 80% 60%",
    background: "0 30% 5%",
    foreground: "0 20% 95%",
    muted: "0 15% 15%",
    border: "0 15% 20%",
    card: "0 20% 9%",
    card_foreground: "0 20% 95%",
    background_pattern: "grain",
    background_effect: "shimmer",
    overlay_tint: "0 30% 5%",
    overlay_strength: 0.3,
    imageId: "ember-glow",
  },
  halloween: {
    label: "Halloween",
    primary: "28 100% 56%",
    secondary: "270 24% 16%",
    accent: "45 100% 58%",
    background: "280 30% 7%",
    foreground: "35 30% 94%",
    muted: "278 20% 16%",
    border: "278 20% 24%",
    card: "278 20% 12%",
    card_foreground: "35 30% 94%",
    background_pattern: "spiderweb",
    background_effect: "bats",
    overlay_tint: "280 30% 7%",
    overlay_strength: 0.25,
    imageId: "halloween-moon",
  },
  christmas: {
    label: "Christmas",
    primary: "0 72% 56%",
    secondary: "145 45% 18%",
    accent: "48 92% 60%",
    background: "145 55% 8%",
    foreground: "45 40% 96%",
    muted: "145 20% 16%",
    border: "145 20% 24%",
    card: "145 24% 12%",
    card_foreground: "45 40% 96%",
    background_pattern: "stars",
    background_effect: "twinkle",
    overlay_tint: "145 55% 8%",
    overlay_strength: 0.2,
    imageId: "christmas-lights",
  },
};

const PATTERN_OPTIONS = [
  { value: "none", label: "None" },
  { value: "dots", label: "Dots" },
  { value: "grid", label: "Grid" },
  { value: "waves", label: "Waves" },
  { value: "grain", label: "Grain / Noise" },
  { value: "snowflakes", label: "Snowflakes" },
  { value: "diagonal", label: "Diagonal Lines" },
  { value: "hex", label: "Hex" },
  { value: "confetti", label: "Confetti" },
  { value: "stars", label: "Stars" },
  { value: "spiderweb", label: "Spiderweb" },
  { value: "hearts", label: "Hearts" },
];

const EFFECT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "particles", label: "Floating Particles" },
  { value: "shimmer", label: "Shimmer / Glow" },
  { value: "snow", label: "Snowfall" },
  { value: "falling-leaves", label: "Falling Leaves" },
  { value: "fireflies", label: "Fireflies" },
  { value: "petals", label: "Petals" },
  { value: "twinkle", label: "Twinkle Lights" },
  { value: "aurora", label: "Aurora Sweep" },
  { value: "bats", label: "Night Bats" },
];

const COLOR_FIELDS: { key: keyof ThemeConfig; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "foreground", label: "Foreground" },
  { key: "muted", label: "Muted" },
  { key: "border", label: "Border" },
  { key: "card", label: "Card" },
  { key: "card_foreground", label: "Card Foreground" },
  { key: "overlay_tint", label: "Overlay Tint" },
];

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const normalizeTheme = (value?: Partial<ThemeConfig> | null): ThemeConfig => ({
  ...defaultTheme,
  ...(value ?? {}),
  available_backgrounds:
    value?.available_backgrounds && value.available_backgrounds.length > 0
      ? value.available_backgrounds
      : DEFAULT_BACKGROUND_LIBRARY,
});

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function hslToHex(hsl: string): string {
  const cleaned = hsl.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) return "#ffffff";

  let h = Number(match[1]) / 360;
  let s = Number(match[2]) / 100;
  let l = Number(match[3]) / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.substring(0, 2), 16) / 255;
  const g = parseInt(full.substring(2, 4), 16) / 255;
  const b = parseInt(full.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const MiniEffectPreview = ({ theme }: { theme: ThemeConfig }) => {
  const particles = useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
      {theme.background_image_url ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("${theme.background_image_url}")`,
            backgroundSize: theme.image_fit,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: clamp(theme.image_opacity),
          }}
        />
      ) : null}

      <div
        className="absolute inset-0"
        style={{
          background:
            theme.background_pattern === "grid"
              ? `linear-gradient(hsl(${theme.foreground} / ${clamp(theme.pattern_opacity * 0.35)}) 1px, transparent 1px), linear-gradient(90deg, hsl(${theme.foreground} / ${clamp(theme.pattern_opacity * 0.35)}) 1px, transparent 1px)`
              : theme.background_pattern === "dots"
                ? `radial-gradient(circle, hsl(${theme.foreground} / ${clamp(theme.pattern_opacity * 0.45)}) 1px, transparent 1px)`
                : theme.background_pattern === "confetti"
                  ? `radial-gradient(circle at 10% 20%, hsl(${theme.accent} / ${clamp(theme.pattern_opacity * 0.7)}) 0 4px, transparent 4px),
                 radial-gradient(circle at 40% 70%, hsl(${theme.primary} / ${clamp(theme.pattern_opacity * 0.7)}) 0 5px, transparent 5px),
                 radial-gradient(circle at 70% 35%, hsl(${theme.secondary} / ${clamp(theme.pattern_opacity * 0.6)}) 0 3px, transparent 3px)`
                  : theme.background_pattern === "stars"
                    ? `radial-gradient(circle, hsl(${theme.foreground} / ${clamp(theme.pattern_opacity * 0.7)}) 1px, transparent 1px)`
                    : theme.background_pattern === "spiderweb"
                      ? `repeating-linear-gradient(-20deg, transparent 0 22px, hsl(${theme.foreground} / ${clamp(theme.pattern_opacity * 0.25)}) 22px 23px),
                 repeating-linear-gradient(35deg, transparent 0 28px, hsl(${theme.foreground} / ${clamp(theme.pattern_opacity * 0.22)}) 28px 29px)`
                      : theme.background_pattern === "diagonal"
                        ? `repeating-linear-gradient(-45deg, hsl(${theme.foreground} / ${clamp(theme.pattern_opacity * 0.24)}) 0 2px, transparent 2px 14px)`
                        : `radial-gradient(circle, hsl(${theme.foreground} / ${clamp(theme.pattern_opacity * 0.35)}) 1px, transparent 1px)`,
          backgroundSize:
            theme.background_pattern === "grid"
              ? "24px 24px"
              : theme.background_pattern === "dots"
                ? "18px 18px"
                : theme.background_pattern === "confetti"
                  ? "180px 140px"
                  : theme.background_pattern === "stars"
                    ? "48px 48px"
                    : "100px 100px",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          backgroundColor: `hsl(${theme.overlay_tint} / ${clamp(theme.overlay_strength)})`,
        }}
      />

      {theme.background_effect !== "none" && (
        <div className="absolute inset-0" style={{ opacity: clamp(theme.effect_opacity) }}>
          {theme.background_effect === "shimmer" && (
            <div
              className="absolute inset-y-0 -left-1/2 w-1/2"
              style={{
                background: `linear-gradient(110deg, transparent, hsl(${theme.accent} / 0.25), transparent)`,
                animation: theme.enable_motion ? "miniShimmer 4s linear infinite" : "none",
              }}
            />
          )}

          {(theme.background_effect === "particles" ||
            theme.background_effect === "snow" ||
            theme.background_effect === "petals" ||
            theme.background_effect === "fireflies" ||
            theme.background_effect === "falling-leaves" ||
            theme.background_effect === "bats") &&
            particles.map((i) => (
              <span
                key={i}
                className="absolute"
                style={{
                  left: `${8 + i * 9}%`,
                  top: `${(i * 13) % 90}%`,
                  width: theme.background_effect === "bats" ? 14 : 8,
                  height: theme.background_effect === "petals" ? 10 : theme.background_effect === "bats" ? 6 : 8,
                  borderRadius:
                    theme.background_effect === "petals"
                      ? "70% 0 70% 0"
                      : theme.background_effect === "bats"
                        ? "0"
                        : "999px",
                  background:
                    theme.background_effect === "snow"
                      ? `hsl(${theme.foreground} / 0.9)`
                      : theme.background_effect === "petals"
                        ? `linear-gradient(135deg, hsl(${theme.accent} / 0.8), hsl(${theme.foreground} / 0.5))`
                        : theme.background_effect === "falling-leaves"
                          ? `linear-gradient(135deg, hsl(${theme.primary} / 0.8), hsl(${theme.accent} / 0.7))`
                          : theme.background_effect === "fireflies"
                            ? `hsl(${theme.accent} / 0.95)`
                            : theme.background_effect === "bats"
                              ? `hsl(${theme.foreground} / 0.8)`
                              : `hsl(${theme.accent} / 0.75)`,
                  clipPath:
                    theme.background_effect === "bats"
                      ? "polygon(0 65%, 20% 20%, 38% 62%, 50% 32%, 62% 62%, 80% 20%, 100% 65%, 80% 56%, 62% 78%, 50% 48%, 38% 78%, 20% 56%)"
                      : "none",
                  boxShadow: theme.background_effect === "fireflies" ? `0 0 10px hsl(${theme.accent} / 0.5)` : "none",
                  transform: `rotate(${i * 17}deg)`,
                  animation: theme.enable_motion ? `miniFloat ${4 + (i % 4)}s linear infinite` : "none",
                }}
              />
            ))}

          {theme.background_effect === "twinkle" && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle, hsl(${theme.foreground} / 0.55) 1px, transparent 1px)`,
                backgroundSize: "36px 36px",
                animation: theme.enable_motion ? "miniPulse 2.4s ease-in-out infinite" : "none",
              }}
            />
          )}
        </div>
      )}

      <style>{`
        @keyframes miniShimmer {
          0% { transform: translateX(0); }
          100% { transform: translateX(320%); }
        }
        @keyframes miniFloat {
          0% { transform: translateY(-8px) rotate(0deg); opacity: .4; }
          50% { opacity: 1; }
          100% { transform: translateY(130px) rotate(180deg); opacity: .2; }
        }
        @keyframes miniPulse {
          0%,100% { opacity: .4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const ThemeLivePreview = ({ theme }: { theme: ThemeConfig }) => {
  return (
    <div
      className="relative overflow-hidden rounded-[24px] border shadow-sm"
      style={{
        borderColor: `hsl(${theme.border})`,
        backgroundColor: `hsl(${theme.background})`,
        color: `hsl(${theme.foreground})`,
      }}
    >
      <MiniEffectPreview theme={theme} />
      <div className="relative z-10 space-y-4 p-4">
        <div
          className="rounded-2xl border p-4 backdrop-blur-sm"
          style={{
            borderColor: `hsl(${theme.border})`,
            backgroundColor: `hsl(${theme.card} / 0.86)`,
            color: `hsl(${theme.card_foreground})`,
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: `hsl(${theme.muted})` }}>
                Theme Preview
              </p>
              <h3 className="text-lg font-bold">LayerLoot Storefront</h3>
            </div>
            <button
              type="button"
              className="rounded-xl px-3 py-2 text-sm font-semibold"
              style={{
                backgroundColor: `hsl(${theme.primary})`,
                color: "white",
              }}
            >
              Shop Now
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3">
              <div
                className="rounded-2xl border p-4"
                style={{
                  borderColor: `hsl(${theme.border})`,
                  backgroundColor: `hsl(${theme.background} / 0.45)`,
                }}
              >
                <div
                  className="mb-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: `hsl(${theme.accent})`,
                    color: "white",
                  }}
                >
                  Limited Edition
                </div>
                <p className="text-sm">
                  Custom 3D printed collectibles, gifts and accessories with your current colors, pattern and effect.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border p-3"
                    style={{
                      borderColor: `hsl(${theme.border})`,
                      backgroundColor: `hsl(${theme.card} / 0.92)`,
                      color: `hsl(${theme.card_foreground})`,
                    }}
                  >
                    <div
                      className="mb-3 h-20 rounded-xl"
                      style={{
                        background: `linear-gradient(135deg, hsl(${theme.primary} / 0.95), hsl(${theme.accent} / 0.82))`,
                      }}
                    />
                    <p className="text-sm font-semibold">Product card</p>
                    <p className="text-xs" style={{ color: `hsl(${theme.muted})` }}>
                      Card, border and text preview
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl border p-4"
              style={{
                borderColor: `hsl(${theme.border})`,
                backgroundColor: `hsl(${theme.card} / 0.92)`,
                color: `hsl(${theme.card_foreground})`,
              }}
            >
              <p className="mb-3 text-sm font-semibold">Cart summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span style={{ color: `hsl(${theme.muted})` }}>Miniature</span>
                  <span>249 kr</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: `hsl(${theme.muted})` }}>Shipping</span>
                  <span>39 kr</span>
                </div>
                <div className="mt-3 border-t pt-3" style={{ borderColor: `hsl(${theme.border})` }}>
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span style={{ color: `hsl(${theme.primary})` }}>288 kr</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-xl px-3 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: `hsl(${theme.secondary})`,
                  color: `hsl(${theme.foreground})`,
                }}
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FooterPreview = ({
  branding,
  footer,
  footerContact,
}: {
  branding: BrandingConfig;
  footer: FooterConfig;
  footerContact: FooterContactConfig;
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid gap-6 bg-secondary p-5 md:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {footer.show_logo_icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">✦</div>
            )}
            {footer.show_logo_text && (
              <div className="font-display text-lg font-bold uppercase tracking-wider text-secondary-foreground">
                {branding.logo_text_left || "Layer"}
                <span className="text-primary">{branding.logo_text_right || "Loot"}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{footer.description}</p>
        </div>

        {footer.show_quick_links && (
          <div>
            <p className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
              {footer.quick_links_title}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Products</p>
              <p>Gallery</p>
              <p>Create Your Own</p>
            </div>
          </div>
        )}

        {footer.show_account_links && (
          <div>
            <p className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
              {footer.account_title}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{footer.auth_link_label}</p>
              <p>{footer.account_link_label}</p>
              <p>{footer.orders_link_label}</p>
            </div>
          </div>
        )}

        {footer.show_contact_block && (
          <div>
            <p className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">
              {footer.contact_title}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{footerContact.contact_description}</p>
              <p>
                {footerContact.email_label}: {footerContact.email}
              </p>
              <p>
                {footerContact.phone_label}: {footerContact.phone}
              </p>
              <p>
                {footerContact.address_label}: {footerContact.address}
              </p>
              <p className="pt-1 text-[11px] uppercase tracking-wider">{footerContact.social_title}</p>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border bg-secondary px-5 py-3 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {branding.logo_text_left || "Layer"}
        {branding.logo_text_right || "Loot"}. {footer.copyright_text}
      </div>
    </div>
  );
};

const AdminSettings = () => {
  const { toast } = useToast();
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const [contact, setContact] = useState({
    email: "",
    phone: "",
    address: "",
    social: { instagram: "", facebook: "", youtube: "" },
  });
  const [store, setStore] = useState({ name: "LayerLoot", currency: "DKK", currency_symbol: "kr" });
  const [promo, setPromo] = useState<PromoConfig>(defaultPromo);
  const [footer, setFooter] = useState<FooterConfig>(defaultFooter);
  const [footerContact, setFooterContact] = useState<FooterContactConfig>(defaultFooterContact);
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [saving, setSaving] = useState(false);

  const galleryImages = useMemo(
    () => (theme.available_backgrounds?.length ? theme.available_backgrounds : DEFAULT_BACKGROUND_LIBRARY),
    [theme.available_backgrounds],
  );

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("site_settings").select("*");
      if (data) {
        data.forEach((s: any) => {
          if (s.key === "contact") {
            setContact((prev) => ({ ...prev, ...(s.value as any) }));
            setFooterContact((prev) => ({ ...prev, ...(s.value as any) }));
          }
          if (s.key === "store") setStore(s.value as any);
          if (s.key === "promotion_popup") setPromo({ ...defaultPromo, ...(s.value as any) });
          if (s.key === "footer_settings") setFooter({ ...defaultFooter, ...(s.value as any) });
          if (s.key === "branding") setBranding({ ...defaultBranding, ...(s.value as any) });
          if (s.key === "theme") setTheme(normalizeTheme(s.value as any));
        });
      }
    };
    fetch();
  }, []);

  const upsertSetting = async (key: string, value: any) => {
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
    if (existing) {
      await supabase
        .from("site_settings")
        .update({ value: value as any })
        .eq("key", key);
    } else {
      await supabase.from("site_settings").insert({ key, value: value as any });
    }
  };

  const save = async () => {
    setSaving(true);

    const mergedContact = {
      ...contact,
      email: footerContact.email,
      phone: footerContact.phone,
      address: footerContact.address,
      contact_description: footerContact.contact_description,
      email_label: footerContact.email_label,
      phone_label: footerContact.phone_label,
      address_label: footerContact.address_label,
      instagram_url: footerContact.instagram_url,
      facebook_url: footerContact.facebook_url,
      social_title: footerContact.social_title,
      social: {
        ...(contact as any).social,
        instagram: footerContact.instagram_url,
        facebook: footerContact.facebook_url,
      },
    };

    await Promise.all([
      upsertSetting("contact", mergedContact),
      upsertSetting("store", store),
      upsertSetting("promotion_popup", promo),
      upsertSetting("footer_settings", footer),
      upsertSetting("branding", branding),
      upsertSetting("theme", theme),
    ]);
    setSaving(false);
    toast({ title: "Settings saved!" });
  };

  const applyPreset = (presetKey: string) => {
    const preset = SEASONAL_PRESETS[presetKey];
    if (!preset) return;

    const presetImage = preset.imageId
      ? (galleryImages.find((img) => img.id === preset.imageId)?.url ?? theme.background_image_url)
      : theme.background_image_url;

    setTheme((prev) => ({
      ...prev,
      preset: presetKey,
      primary: preset.primary ?? prev.primary,
      secondary: preset.secondary ?? prev.secondary,
      accent: preset.accent ?? prev.accent,
      background: preset.background ?? prev.background,
      foreground: preset.foreground ?? prev.foreground,
      muted: preset.muted ?? prev.muted,
      border: preset.border ?? prev.border,
      card: preset.card ?? prev.card,
      card_foreground: preset.card_foreground ?? prev.card_foreground,
      background_pattern: preset.background_pattern ?? prev.background_pattern,
      background_effect: preset.background_effect ?? prev.background_effect,
      overlay_tint: preset.overlay_tint ?? prev.overlay_tint,
      overlay_strength: preset.overlay_strength ?? prev.overlay_strength,
      background_image_url: presetImage,
    }));
  };

  const onUploadBackground = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image file." });
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const id = `upload-${Date.now()}`;
    const newImage: ThemeGalleryImage = {
      id,
      label: file.name.replace(/\.[^/.]+$/, ""),
      category: "Uploads",
      url: dataUrl,
    };

    setTheme((prev) => ({
      ...prev,
      background_image_url: dataUrl,
      available_backgrounds: [newImage, ...(prev.available_backgrounds ?? DEFAULT_BACKGROUND_LIBRARY)],
    }));

    toast({ title: "Background uploaded", description: "Image added to the theme gallery." });
  };

  const removeUploadedImage = (id: string) => {
    setTheme((prev) => {
      const target = (prev.available_backgrounds ?? DEFAULT_BACKGROUND_LIBRARY).find((img) => img.id === id);
      const remaining = (prev.available_backgrounds ?? DEFAULT_BACKGROUND_LIBRARY).filter((img) => img.id !== id);
      const fallbackUrl = remaining[0]?.url ?? "";
      return {
        ...prev,
        available_backgrounds: remaining.length ? remaining : DEFAULT_BACKGROUND_LIBRARY,
        background_image_url: prev.background_image_url === target?.url ? fallbackUrl : prev.background_image_url,
      };
    });
  };

  const groupedImages = galleryImages.reduce<Record<string, ThemeGalleryImage[]>>((acc, img) => {
    const key = img.category || "Other";
    acc[key] = [...(acc[key] ?? []), img];
    return acc;
  }, {});

  const setColorField = (key: keyof ThemeConfig, hex: string) => {
    setTheme((prev) => ({
      ...prev,
      [key]: hexToHsl(hex),
    }));
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Friendlier theme editing with live preview, presets, color pickers, and full footer controls.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="font-display uppercase tracking-wider">
          <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={contact.address}
                    onChange={(e) => setContact({ ...contact, address: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Social Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Instagram URL</Label>
                  <Input
                    value={contact.social?.instagram ?? ""}
                    onChange={(e) =>
                      setContact({ ...contact, social: { ...contact.social, instagram: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <Label>Facebook URL</Label>
                  <Input
                    value={contact.social?.facebook ?? ""}
                    onChange={(e) =>
                      setContact({ ...contact, social: { ...contact.social, facebook: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <Label>YouTube URL</Label>
                  <Input
                    value={contact.social?.youtube ?? ""}
                    onChange={(e) => setContact({ ...contact, social: { ...contact.social, youtube: e.target.value } })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Store Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Store Name</Label>
                  <Input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input value={store.currency} onChange={(e) => setStore({ ...store, currency: e.target.value })} />
                </div>
                <div>
                  <Label>Currency Symbol</Label>
                  <Input
                    value={store.currency_symbol}
                    onChange={(e) => setStore({ ...store, currency_symbol: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Promotion Popup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch checked={promo.enabled} onCheckedChange={(v) => setPromo({ ...promo, enabled: v })} />
                  <Label>Enable promotion popup</Label>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={promo.title} onChange={(e) => setPromo({ ...promo, title: e.target.value })} />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={promo.message}
                    onChange={(e) => setPromo({ ...promo, message: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Button Text</Label>
                    <Input
                      value={promo.button_text}
                      onChange={(e) => setPromo({ ...promo, button_text: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Button Link</Label>
                    <Input
                      value={promo.button_link}
                      onChange={(e) => setPromo({ ...promo, button_link: e.target.value })}
                      placeholder="/products"
                    />
                  </div>
                </div>
                <div>
                  <Label>Image URL (optional)</Label>
                  <Input
                    value={promo.image_url}
                    onChange={(e) => setPromo({ ...promo, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Dismiss Key</Label>
                  <Input
                    value={promo.dismiss_key}
                    onChange={(e) => setPromo({ ...promo, dismiss_key: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="footer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display uppercase">Footer Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <FooterPreview branding={branding} footer={footer} footerContact={footerContact} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Footer Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={footer.description}
                    onChange={(e) => setFooter({ ...footer, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Quick Links Title</Label>
                    <Input
                      value={footer.quick_links_title}
                      onChange={(e) => setFooter({ ...footer, quick_links_title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Account Title</Label>
                    <Input
                      value={footer.account_title}
                      onChange={(e) => setFooter({ ...footer, account_title: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Contact Title</Label>
                  <Input
                    value={footer.contact_title}
                    onChange={(e) => setFooter({ ...footer, contact_title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Copyright Text</Label>
                  <Input
                    value={footer.copyright_text}
                    onChange={(e) => setFooter({ ...footer, copyright_text: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Logo Height (px)</Label>
                  <Input
                    type="number"
                    value={footer.logo_height_px}
                    onChange={(e) => setFooter({ ...footer, logo_height_px: parseInt(e.target.value, 10) || 32 })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Logo & Branding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Logo Text Left</Label>
                    <Input
                      value={branding.logo_text_left}
                      onChange={(e) => setBranding({ ...branding, logo_text_left: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Logo Text Right</Label>
                    <Input
                      value={branding.logo_text_right}
                      onChange={(e) => setBranding({ ...branding, logo_text_right: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Logo Image URL</Label>
                  <Input
                    value={branding.logo_image_url}
                    onChange={(e) => setBranding({ ...branding, logo_image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Logo Link</Label>
                    <Input
                      value={branding.logo_link}
                      onChange={(e) => setBranding({ ...branding, logo_link: e.target.value })}
                      placeholder="/"
                    />
                  </div>
                  <div>
                    <Label>Logo Alt</Label>
                    <Input
                      value={branding.logo_alt}
                      onChange={(e) => setBranding({ ...branding, logo_alt: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Footer Links & Labels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Login / Register Label</Label>
                  <Input
                    value={footer.auth_link_label}
                    onChange={(e) => setFooter({ ...footer, auth_link_label: e.target.value })}
                  />
                </div>
                <div>
                  <Label>My Account Label</Label>
                  <Input
                    value={footer.account_link_label}
                    onChange={(e) => setFooter({ ...footer, account_link_label: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Order History Label</Label>
                  <Input
                    value={footer.orders_link_label}
                    onChange={(e) => setFooter({ ...footer, orders_link_label: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Contact Block</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Contact Description</Label>
                  <Textarea
                    value={footerContact.contact_description}
                    onChange={(e) => setFooterContact({ ...footerContact, contact_description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Email Label</Label>
                    <Input
                      value={footerContact.email_label}
                      onChange={(e) => setFooterContact({ ...footerContact, email_label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={footerContact.email}
                      onChange={(e) => setFooterContact({ ...footerContact, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Phone Label</Label>
                    <Input
                      value={footerContact.phone_label}
                      onChange={(e) => setFooterContact({ ...footerContact, phone_label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={footerContact.phone}
                      onChange={(e) => setFooterContact({ ...footerContact, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Address Label</Label>
                    <Input
                      value={footerContact.address_label}
                      onChange={(e) => setFooterContact({ ...footerContact, address_label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={footerContact.address}
                      onChange={(e) => setFooterContact({ ...footerContact, address: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Social Title</Label>
                  <Input
                    value={footerContact.social_title}
                    onChange={(e) => setFooterContact({ ...footerContact, social_title: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Instagram URL</Label>
                    <Input
                      value={footerContact.instagram_url}
                      onChange={(e) => setFooterContact({ ...footerContact, instagram_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Facebook URL</Label>
                    <Input
                      value={footerContact.facebook_url}
                      onChange={(e) => setFooterContact({ ...footerContact, facebook_url: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Section Visibility</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={footer.show_logo_icon}
                    onCheckedChange={(v) => setFooter({ ...footer, show_logo_icon: v })}
                  />
                  <Label>Show Logo Icon</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={footer.show_logo_text}
                    onCheckedChange={(v) => setFooter({ ...footer, show_logo_text: v })}
                  />
                  <Label>Show Logo Text</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={footer.show_quick_links}
                    onCheckedChange={(v) => setFooter({ ...footer, show_quick_links: v })}
                  />
                  <Label>Show Quick Links</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={footer.show_account_links}
                    onCheckedChange={(v) => setFooter({ ...footer, show_account_links: v })}
                  />
                  <Label>Show Account Links</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={footer.show_contact_block}
                    onCheckedChange={(v) => setFooter({ ...footer, show_contact_block: v })}
                  />
                  <Label>Show Contact Block</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display uppercase">Live Theme Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                Changes are previewed here before saving.
              </div>
              <ThemeLivePreview theme={theme} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display uppercase">Preset Themes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {Object.entries(SEASONAL_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      theme.preset === key
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-display text-sm font-semibold uppercase text-foreground">{preset.label}</p>
                    <div className="mt-2 flex gap-1">
                      {[preset.primary, preset.accent, preset.background].filter(Boolean).map((color, i) => (
                        <div
                          key={i}
                          className="h-4 w-4 rounded-full border border-border"
                          style={{ backgroundColor: `hsl(${color})` }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Color Pickers</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {COLOR_FIELDS.map(({ key, label }) => (
                  <div key={String(key)} className="rounded-2xl border border-border bg-card/50 p-4">
                    <Label className="mb-3 block text-sm">{label}</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={hslToHex(String(theme[key]))}
                        onChange={(e) => setColorField(key, e.target.value)}
                        className="h-12 w-16 cursor-pointer rounded-xl border border-border bg-transparent p-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className="mb-2 h-6 rounded-lg border border-border"
                          style={{ backgroundColor: `hsl(${theme[key] as string})` }}
                        />
                        <p className="truncate text-xs text-muted-foreground">{theme[key] as string}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display uppercase">Background & Effects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Background Image</Label>
                  <div className="flex gap-2">
                    <Input
                      value={theme.background_image_url}
                      onChange={(e) => setTheme({ ...theme, background_image_url: e.target.value })}
                      placeholder="https://... or uploaded image"
                    />
                    <Button type="button" variant="outline" onClick={() => uploadRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                  </div>
                  <input
                    ref={uploadRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onUploadBackground(e.target.files?.[0] ?? null)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Pattern</Label>
                    <Select
                      value={theme.background_pattern}
                      onValueChange={(v) => setTheme({ ...theme, background_pattern: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PATTERN_OPTIONS.map((pattern) => (
                          <SelectItem key={pattern.value} value={pattern.value}>
                            {pattern.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Effect</Label>
                    <Select
                      value={theme.background_effect}
                      onValueChange={(v) => setTheme({ ...theme, background_effect: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EFFECT_OPTIONS.map((effect) => (
                          <SelectItem key={effect.value} value={effect.value}>
                            {effect.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Image Fit</Label>
                    <Select
                      value={theme.image_fit}
                      onValueChange={(v: "cover" | "contain") => setTheme({ ...theme, image_fit: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cover</SelectItem>
                        <SelectItem value="contain">Contain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Effect Speed</Label>
                    <Select
                      value={theme.effect_speed}
                      onValueChange={(v: "slow" | "normal" | "fast") => setTheme({ ...theme, effect_speed: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slow">Slow</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="fast">Fast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Image Opacity</Label>
                    <Input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={theme.image_opacity}
                      onChange={(e) => setTheme({ ...theme, image_opacity: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">{theme.image_opacity.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label>Pattern Opacity</Label>
                    <Input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={theme.pattern_opacity}
                      onChange={(e) => setTheme({ ...theme, pattern_opacity: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">{theme.pattern_opacity.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label>Effect Opacity</Label>
                    <Input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={theme.effect_opacity}
                      onChange={(e) => setTheme({ ...theme, effect_opacity: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">{theme.effect_opacity.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label>Overlay Strength</Label>
                    <Input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={theme.overlay_strength}
                      onChange={(e) => setTheme({ ...theme, overlay_strength: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">{theme.overlay_strength.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={theme.enable_motion}
                    onCheckedChange={(v) => setTheme({ ...theme, enable_motion: v })}
                  />
                  <Label>Enable Motion & Animations</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-display uppercase">Background Library</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(groupedImages).map(([group, images]) => (
                <div key={group} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Palette className="h-4 w-4" />
                    {group}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {images.map((image) => {
                      const isSelected = theme.background_image_url === image.url;
                      const isUpload = image.category === "Uploads";

                      return (
                        <div
                          key={image.id}
                          className={`overflow-hidden rounded-2xl border ${isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                        >
                          <button
                            type="button"
                            onClick={() => setTheme({ ...theme, background_image_url: image.url })}
                            className="block w-full text-left"
                          >
                            <div
                              className="h-36 w-full bg-cover bg-center"
                              style={{ backgroundImage: `url("${image.url}")` }}
                            />
                            <div className="flex items-center justify-between gap-2 p-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{image.label}</p>
                                <p className="text-xs text-muted-foreground">{image.category}</p>
                              </div>
                              {isSelected && <Sparkles className="h-4 w-4 text-primary" />}
                            </div>
                          </button>

                          {isUpload && (
                            <div className="border-t border-border px-3 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={() => removeUploadedImage(image.id)}
                              >
                                Remove upload
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => uploadRef.current?.click()}
                      className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
                    >
                      <ImagePlus className="mb-3 h-8 w-8 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Upload your own image</p>
                      <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP, SVG</p>
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminSettings;
