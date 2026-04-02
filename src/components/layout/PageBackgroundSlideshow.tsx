import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  normalizeSettings, pageKeyFromPath,
  type PageBackgroundSettings, type BackgroundSizeMode, type PageOverrideMode,
  SETTING_KEY,
} from "@/components/admin/PageBackgroundEditor";

function sizeToCSS(mode: BackgroundSizeMode) {
  switch (mode) {
    case "cover": return { backgroundSize: "cover", backgroundRepeat: "no-repeat" };
    case "contain": return { backgroundSize: "contain", backgroundRepeat: "no-repeat" };
    case "fill": return { backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" };
    case "repeat": return { backgroundSize: "auto", backgroundRepeat: "repeat" };
    case "auto": return { backgroundSize: "auto", backgroundRepeat: "no-repeat" };
    default: return { backgroundSize: "cover", backgroundRepeat: "no-repeat" };
  }
}

function motionAnimation(effect: string, speed: number) {
  switch (effect) {
    case "slowZoom":
      return `page-bg-zoom ${speed}s ease-in-out infinite alternate`;
    case "kenBurns":
      return `page-bg-kenburns ${speed}s ease-in-out infinite alternate`;
    case "drift":
      return `page-bg-drift ${speed}s ease-in-out infinite alternate`;
    default:
      return "none";
  }
}

export default function PageBackgroundSlideshow() {
  const location = useLocation();
  const [globalSettings, setGlobalSettings] = useState<PageBackgroundSettings | null>(null);
  const [overrideSettings, setOverrideSettings] = useState<{ mode: PageOverrideMode; settings: PageBackgroundSettings } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pageKey = useMemo(() => pageKeyFromPath(location.pathname), [location.pathname]);

  // Load global + page override
  useEffect(() => {
    let isMounted = true;

    async function load() {
      const overrideKey = `page_background_override_${pageKey}`;
      const [globalRes, overrideRes] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", SETTING_KEY).maybeSingle(),
        supabase.from("site_settings").select("value").eq("key", overrideKey).maybeSingle(),
      ]);

      if (!isMounted) return;
      setGlobalSettings(normalizeSettings(globalRes.data?.value));

      const ov = overrideRes.data?.value as any;
      if (ov?.mode) {
        setOverrideSettings({
          mode: ov.mode,
          settings: ov.mode === "custom" ? normalizeSettings(ov) : normalizeSettings(null),
        });
      } else {
        setOverrideSettings(null);
      }
      setCurrentIndex(0);
    }

    load();

    const channel = supabase
      .channel(`page-bg-${pageKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings", filter: `key=eq.${SETTING_KEY}` },
        (payload: any) => { if (payload.new?.value) { setGlobalSettings(normalizeSettings(payload.new.value)); setCurrentIndex(0); } })
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings", filter: `key=eq.page_background_override_${pageKey}` },
        (payload: any) => {
          const v = payload.new?.value;
          if (v?.mode) {
            setOverrideSettings({ mode: v.mode, settings: v.mode === "custom" ? normalizeSettings(v) : normalizeSettings(null) });
          } else {
            setOverrideSettings(null);
          }
          setCurrentIndex(0);
        })
      .subscribe();

    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, [pageKey]);

  // Resolve effective settings
  const settings = useMemo(() => {
    if (overrideSettings?.mode === "disabled") return null;
    if (overrideSettings?.mode === "custom") return overrideSettings.settings;
    return globalSettings;
  }, [globalSettings, overrideSettings]);

  // Cycle images
  useEffect(() => {
    if (!settings?.enabled || settings.images.length <= 1 || !settings.autoplay) return;

    const timer = window.setInterval(
      () => setCurrentIndex(prev => {
        if (settings.randomOrder) return Math.floor(Math.random() * settings.images.length);
        const next = (prev + 1) % settings.images.length;
        if (!settings.loop && next === 0) return prev;
        return next;
      }),
      Math.max(1000, settings.intervalMs),
    );

    return () => window.clearInterval(timer);
  }, [settings?.enabled, settings?.images.length, settings?.intervalMs, settings?.autoplay, settings?.loop, settings?.randomOrder]);

  if (!settings?.enabled || settings.images.length === 0) return null;

  const sizeCSS = sizeToCSS(settings.sizeMode);
  const filterStr = `blur(${settings.blur}px) brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`;
  const positionType = settings.attachment === "scroll" ? "absolute" : "fixed";

  return (
    <>
      <style>{`
        @keyframes page-bg-zoom {
          0% { transform: scale(1.02); }
          100% { transform: scale(1.08); }
        }
        @keyframes page-bg-kenburns {
          0% { transform: scale(1.0) translate(0, 0); }
          100% { transform: scale(1.12) translate(-1%, -1%); }
        }
        @keyframes page-bg-drift {
          0% { transform: translateX(0) scale(1.03); }
          100% { transform: translateX(-1%) scale(1.03); }
        }
      `}</style>

      <div aria-hidden="true" className="pointer-events-none inset-0 z-0 overflow-hidden" style={{ position: positionType }}>
        {settings.images.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="absolute inset-0"
            style={{
              opacity: index === currentIndex ? settings.opacity : 0,
              transition: `opacity ${settings.transitionDurationMs}ms ease-in-out`,
              filter: filterStr,
              backgroundImage: `url("${src}")`,
              backgroundPosition: settings.position || "center",
              ...sizeCSS,
              animation: motionAnimation(settings.motionEffect, settings.motionSpeed),
              willChange: "transform, opacity",
              mixBlendMode: settings.blendMode as any,
            }}
          />
        ))}

        {/* Dark overlay */}
        <div className="absolute inset-0"
          style={{ background: `linear-gradient(to bottom, rgba(0,0,0,${settings.overlayOpacity}), rgba(0,0,0,${settings.overlayOpacity + 0.05}))` }}
        />

        {/* Color overlay */}
        {settings.colorOverlay && settings.colorOverlayOpacity > 0 && (
          <div className="absolute inset-0" style={{ backgroundColor: settings.colorOverlay, opacity: settings.colorOverlayOpacity }} />
        )}

        {/* Gradient overlay */}
        {settings.gradientStart && settings.gradientEnd && settings.gradientOpacity > 0 && (
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, ${settings.gradientStart}, ${settings.gradientEnd})`, opacity: settings.gradientOpacity }}
          />
        )}
      </div>
    </>
  );
}
