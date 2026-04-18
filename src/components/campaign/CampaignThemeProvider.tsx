import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useActiveCampaign, type CampaignTheme } from "@/hooks/use-active-campaign";
import { hexToHslString } from "@/lib/design-system";

const CampaignContext = createContext<{ campaign: CampaignTheme | null }>({ campaign: null });

export const useCampaign = () => useContext(CampaignContext);

/**
 * Applies active campaign theme overrides as CSS custom properties on <html>.
 * Also renders particle effects and promotional banners.
 */
export function CampaignThemeProvider({ children }: { children: ReactNode }) {
  const { campaign } = useActiveCampaign();

  // Apply CSS variable overrides when campaign is active
  useEffect(() => {
    const root = document.documentElement;
    const overrides = campaign?.theme_overrides;

    const cleanup = () => {
      [
        "--campaign-primary-hsl",
        "--campaign-accent-hsl",
        "--campaign-border-hsl",
        "--campaign-font-display",
        "--glow-primary",
        "--glow-primary-strong",
      ].forEach((name) => root.style.removeProperty(name));
    };

    if (!overrides) {
      cleanup();
      return;
    }

    if (overrides.primaryColor) {
      const primaryHsl = hexToHslString(overrides.primaryColor);
      if (primaryHsl) root.style.setProperty("--campaign-primary-hsl", primaryHsl);
    }

    if (overrides.accentColor) {
      const accentHsl = hexToHslString(overrides.accentColor);
      if (accentHsl) root.style.setProperty("--campaign-accent-hsl", accentHsl);
    }

    if (overrides.borderColor) {
      const borderHsl = hexToHslString(overrides.borderColor);
      if (borderHsl) root.style.setProperty("--campaign-border-hsl", borderHsl);
    }

    if (overrides.fontAccent) {
      root.style.setProperty("--campaign-font-display", overrides.fontAccent);
    }

    if (overrides.buttonGlow && overrides.primaryColor) {
      root.style.setProperty("--glow-primary", `0 0 28px color-mix(in srgb, ${overrides.primaryColor} 32%, transparent)`);
      root.style.setProperty("--glow-primary-strong", `0 0 52px color-mix(in srgb, ${overrides.primaryColor} 48%, transparent)`);
    }

    return cleanup;
  }, [campaign]);

  return (
    <CampaignContext.Provider value={{ campaign }}>
      {children}
      {(campaign?.banner_config?.enabled || campaign?.banner_title || campaign?.banner_image_url) && (
        <CampaignBanner campaign={campaign} />
      )}
      {campaign?.effects?.particles && campaign.effects.particles !== "none" && (
        <CampaignParticles type={campaign.effects.particles} density={campaign.effects.particleDensity} />
      )}
    </CampaignContext.Provider>
  );
}

/* ─── Campaign promo banner ─── */
function CampaignBanner({ campaign }: { campaign: CampaignTheme }) {
  const config = campaign.banner_config ?? {};
  const title = campaign.banner_title?.trim();
  const subtitle = campaign.banner_subtitle?.trim();
  const text = config.text?.trim();
  const image = campaign.banner_image_url?.trim();

  if (!title && !text && !image) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[70] flex items-center justify-center gap-3 px-4 py-2 text-center text-sm font-medium"
      style={{
        background: config.bgColor || "hsl(var(--primary))",
        color: config.textColor || "hsl(var(--primary-foreground))",
      }}
    >
      {image && (
        <img src={image} alt="" className="h-6 w-6 rounded object-cover" loading="lazy" />
      )}
      {config.icon && !image && <span>{config.icon}</span>}
      <span className="flex flex-wrap items-baseline justify-center gap-x-2">
        {title && <span className="font-semibold">{title}</span>}
        {(subtitle || text) && <span className="opacity-90">{subtitle ?? text}</span>}
      </span>
      {config.link && (
        <a href={config.link} className="ml-2 underline underline-offset-2 opacity-90 hover:opacity-100">
          Learn more →
        </a>
      )}
    </div>
  );
}

/* ─── Particle effects ─── */
function CampaignParticles({ type, density = 30 }: { type: string; density?: number }) {
  const count = Math.min(density, 60);

  const particleChar = {
    snow: "❄",
    leaves: "🍂",
    sparkles: "✦",
    hearts: "♥",
    confetti: "●",
  }[type] || "✦";

  const particles = Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 8;
    const duration = 6 + Math.random() * 8;
    const size = type === "snow" ? 10 + Math.random() * 14 : 8 + Math.random() * 10;
    const opacity = 0.15 + Math.random() * 0.35;
    const drift = (Math.random() - 0.5) * 40;

    return (
      <span
        key={i}
        className="campaign-particle"
        style={{
          left: `${left}%`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          fontSize: `${size}px`,
          opacity,
          ["--drift" as any]: `${drift}px`,
          color:
            type === "confetti"
              ? `hsl(${Math.random() * 360} 70% 60%)`
              : type === "sparkles"
              ? "hsl(var(--primary))"
              : type === "hearts"
              ? "hsl(350 80% 60%)"
              : undefined,
        }}
      >
        {particleChar}
      </span>
    );
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden layer-decorative" aria-hidden="true">
      <style>{`
        @keyframes campaign-fall {
          0% { transform: translateY(-20px) translateX(0) rotate(0deg); }
          50% { transform: translateY(50vh) translateX(var(--drift, 0px)) rotate(180deg); }
          100% { transform: translateY(110vh) translateX(calc(var(--drift, 0px) * -1)) rotate(360deg); }
        }
        .campaign-particle {
          position: absolute;
          top: -20px;
          animation: campaign-fall linear infinite;
          pointer-events: none;
          user-select: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .campaign-particle { display: none; }
        }
      `}</style>
      {particles}
    </div>
  );
}
