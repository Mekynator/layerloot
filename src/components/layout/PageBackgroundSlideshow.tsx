import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type PageBackgroundSettings = {
  enabled: boolean;
  images: string[];
  opacity: number;
  blur: number;
  intervalMs: number;
};

const DEFAULT_SETTINGS: PageBackgroundSettings = {
  enabled: false,
  images: [],
  opacity: 0.22,
  blur: 10,
  intervalMs: 2000,
};

function normalizeSettings(value: any): PageBackgroundSettings {
  return {
    enabled: Boolean(value?.enabled),
    images: Array.isArray(value?.images) ? value.images.filter(Boolean) : [],
    opacity: typeof value?.opacity === "number" ? value.opacity : DEFAULT_SETTINGS.opacity,
    blur: typeof value?.blur === "number" ? value.blur : DEFAULT_SETTINGS.blur,
    intervalMs:
      typeof value?.intervalMs === "number" && value.intervalMs > 0 ? value.intervalMs : DEFAULT_SETTINGS.intervalMs,
  };
}

function routeToPageKey(pathname: string): string {
  const clean = pathname.split("?")[0].split("#")[0];

  if (clean === "/" || clean === "") return "home";

  const firstSegment = clean.split("/").filter(Boolean)[0] ?? "home";

  const aliases: Record<string, string> = {
    create: "create-your-own",
  };

  return aliases[firstSegment] ?? firstSegment;
}

export default function PageBackgroundSlideshow() {
  const location = useLocation();
  const [settings, setSettings] = useState<PageBackgroundSettings>(DEFAULT_SETTINGS);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pageKey = useMemo(() => routeToPageKey(location.pathname), [location.pathname]);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const settingKey = `page_background_${pageKey}`;

      const { data } = await supabase.from("site_settings").select("value").eq("key", settingKey).maybeSingle();

      if (!isMounted) return;

      const nextSettings = normalizeSettings(data?.value);
      setSettings(nextSettings);
      setCurrentIndex(0);
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [pageKey]);

  useEffect(() => {
    if (!settings.enabled || settings.images.length <= 1) return;

    const timer = window.setInterval(
      () => {
        setCurrentIndex((prev) => (prev + 1) % settings.images.length);
      },
      Math.max(500, settings.intervalMs),
    );

    return () => window.clearInterval(timer);
  }, [settings.enabled, settings.images.length, settings.intervalMs]);

  if (!settings.enabled || settings.images.length === 0) return null;

  return (
    <>
      <style>
        {`
          @keyframes page-bg-zoom {
            0% { transform: scale(1.05); }
            100% { transform: scale(1.12); }
          }
        `}
      </style>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {settings.images.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{
              opacity: index === currentIndex ? settings.opacity : 0,
              filter: `blur(${settings.blur}px)`,
              backgroundImage: `url("${src}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              animation: "page-bg-zoom 8s ease-in-out infinite alternate",
              willChange: "transform, opacity, filter",
            }}
          />
        ))}

        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.10), rgba(0,0,0,0.18))",
          }}
        />
      </div>
    </>
  );
}
