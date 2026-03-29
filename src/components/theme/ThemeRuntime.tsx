import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const defaultTheme: RuntimeThemeConfig = {
  preset: "default",
  primary: "24 95% 53%",
  secondary: "220 15% 16%",
  accent: "24 95% 53%",
  background: "220 20% 10%",
  foreground: "0 0% 95%",
  muted: "220 15% 20%",
  border: "220 15% 22%",
  card: "220 15% 14%",
  card_foreground: "0 0% 95%",
  background_image_url: "",
  background_pattern: "grid",
  background_effect: "none",
  enable_motion: true,
  image_fit: "cover",
  image_opacity: 0.28,
  pattern_opacity: 0.28,
  effect_opacity: 0.7,
  effect_speed: "normal",
  overlay_tint: "220 20% 10%",
  overlay_strength: 0.35,
  available_backgrounds: [],
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const normalize = (value?: Partial<RuntimeThemeConfig> | null): RuntimeThemeConfig => ({
  ...defaultTheme,
  ...(value ?? {}),
});

const applyThemeVariables = (theme: RuntimeThemeConfig) => {
  const root = document.documentElement;

  root.classList.add("dark");
  root.setAttribute("data-theme-preset", theme.preset || "default");
  root.setAttribute("data-pattern", theme.background_pattern || "none");
  root.setAttribute("data-effect", theme.background_effect || "none");
  root.setAttribute("data-motion", theme.enable_motion ? "on" : "off");

  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--secondary", theme.secondary);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--foreground", theme.foreground);
  root.style.setProperty("--muted", theme.muted);
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--card", theme.card);
  root.style.setProperty("--card-foreground", theme.card_foreground);

  root.style.setProperty("--theme-overlay-tint", theme.overlay_tint);
  root.style.setProperty("--theme-overlay-strength", String(clamp(theme.overlay_strength)));
  root.style.setProperty("--theme-image-opacity", String(clamp(theme.image_opacity)));
  root.style.setProperty("--theme-pattern-opacity", String(clamp(theme.pattern_opacity)));
  root.style.setProperty("--theme-effect-opacity", String(clamp(theme.effect_opacity)));
};

const EffectTiles = ({ type, count = 14 }: { type: string; count?: number }) => {
  const items = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  if (type === "none") return null;

  return (
    <>
      {items.map((i) => {
        const left = `${(i * 7.13) % 100}%`;
        const duration = `${10 + (i % 6) * 2}s`;
        const delay = `${(i % 5) * -1.3}s`;
        const size = `${12 + (i % 5) * 6}px`;

        return (
          <span
            key={`${type}-${i}`}
            className={`theme-particle theme-particle--${type}`}
            style={
              {
                left,
                animationDuration: duration,
                animationDelay: delay,
                width: size,
                height: size,
                ["--particle-size" as any]: size,
              } as React.CSSProperties
            }
          />
        );
      })}
    </>
  );
};

const ThemeRuntime = () => {
  const [theme, setTheme] = useState<RuntimeThemeConfig>(defaultTheme);

  useEffect(() => {
    let mounted = true;

    const loadTheme = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "theme")
        .maybeSingle();

      if (!mounted) return;
      setTheme(normalize((data?.value as Partial<RuntimeThemeConfig> | undefined) ?? null));
    };

    loadTheme();

    const channel = supabase
      .channel("site-theme-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "key=eq.theme" },
        (payload) => {
          const nextTheme = normalize((payload.new as { value?: Partial<RuntimeThemeConfig> } | null)?.value ?? null);
          setTheme(nextTheme);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyThemeVariables(theme);
  }, [theme]);

  const motionClass = theme.enable_motion ? `theme-speed-${theme.effect_speed}` : "theme-motion-off";
  const patternClass = theme.background_pattern ? `theme-pattern--${theme.background_pattern}` : "theme-pattern--none";
  const effectClass = theme.background_effect ? `theme-effect--${theme.background_effect}` : "theme-effect--none";

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-background" />
      {theme.background_image_url ? (
        <div
          className="theme-image-layer absolute inset-0"
          style={{
            backgroundImage: `url("${theme.background_image_url}")`,
            backgroundSize: theme.image_fit,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: clamp(theme.image_opacity),
          }}
        />
      ) : null}

      <div className={`theme-pattern-layer absolute inset-0 ${patternClass}`} style={{ opacity: clamp(theme.pattern_opacity) }} />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, hsl(${theme.overlay_tint} / ${clamp(theme.overlay_strength)}), hsl(${theme.overlay_tint} / ${clamp(theme.overlay_strength)}))`,
        }}
      />
      <div className={`theme-effect-layer absolute inset-0 ${effectClass} ${motionClass}`} style={{ opacity: clamp(theme.effect_opacity) }}>
        <EffectTiles type={theme.background_effect} count={18} />
      </div>
    </div>
  );
};

export default ThemeRuntime;
