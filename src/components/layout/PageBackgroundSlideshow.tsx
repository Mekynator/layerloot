import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSettings, type PageBackgroundSettings, type BackgroundSizeMode } from "@/components/admin/PageBackgroundEditor";

const SETTING_KEY = "page_background_global";

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

export default function PageBackgroundSlideshow() {
  const [settings, setSettings] = useState<PageBackgroundSettings | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Load global settings once
  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .maybeSingle();

      if (!isMounted) return;
      setSettings(normalizeSettings(data?.value));
      setCurrentIndex(0);
    }

    loadSettings();

    // Also listen for realtime updates so saving in editor applies immediately
    const channel = supabase
      .channel("page-bg-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: `key=eq.${SETTING_KEY}` },
        (payload: any) => {
          if (payload.new?.value) {
            setSettings(normalizeSettings(payload.new.value));
            setCurrentIndex(0);
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Cycle images
  useEffect(() => {
    if (!settings?.enabled || settings.images.length <= 1) return;

    const timer = window.setInterval(
      () => setCurrentIndex((prev) => (prev + 1) % settings.images.length),
      Math.max(1000, settings.intervalMs),
    );

    return () => window.clearInterval(timer);
  }, [settings?.enabled, settings?.images.length, settings?.intervalMs]);

  if (!settings?.enabled || settings.images.length === 0) return null;

  const sizeCSS = sizeToCSS(settings.sizeMode);

  return (
    <>
      <style>{`
        @keyframes page-bg-zoom {
          0% { transform: scale(1.02); }
          100% { transform: scale(1.08); }
        }
      `}</style>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {settings.images.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="absolute inset-0 transition-opacity duration-[1200ms]"
            style={{
              opacity: index === currentIndex ? settings.opacity : 0,
              filter: `blur(${settings.blur}px)`,
              backgroundImage: `url("${src}")`,
              backgroundPosition: settings.position || "center",
              ...sizeCSS,
              animation: "page-bg-zoom 12s ease-in-out infinite alternate",
              willChange: "transform, opacity",
            }}
          />
        ))}

        {/* Dark overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,${settings.overlayOpacity}), rgba(0,0,0,${settings.overlayOpacity + 0.05}))`,
          }}
        />
      </div>
    </>
  );
}
