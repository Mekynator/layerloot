import { useEffect, useState, useMemo } from "react";

interface SlideshowConfig {
  enabled?: boolean;
  images?: string[];
  autoplay?: boolean;
  interval?: number;
  transitionDuration?: number;
  transition?: "fade" | "slide" | "zoom" | "crossfade";
  loop?: boolean;
  random?: boolean;
  pauseOnHover?: boolean;
  fit?: string;
  position?: string;
  blur?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  opacity?: number;
  blendMode?: string;
  tintColor?: string;
  tintOpacity?: number;
  gradientStart?: string;
  gradientEnd?: string;
  gradientOpacity?: number;
  motionEffect?: string;
  motionSpeed?: number;
}

interface Props {
  slideshow?: SlideshowConfig;
  className?: string;
}

const fitToCSS = (fit?: string) => {
  switch (fit) {
    case "contain": return "contain";
    case "fill": return "100% 100%";
    case "center": return "auto";
    case "repeat": return "auto";
    default: return "cover";
  }
};

const repeatCSS = (fit?: string) => (fit === "repeat" ? "repeat" : "no-repeat");

const motionKeyframes = (effect?: string) => {
  switch (effect) {
    case "slowZoom":
      return "block-bg-slow-zoom 12s ease-in-out infinite alternate";
    case "kenBurns":
      return "block-bg-ken-burns 20s ease-in-out infinite alternate";
    case "parallax":
      return "none";
    case "drift":
      return "block-bg-drift 18s ease-in-out infinite alternate";
    case "float":
      return "block-bg-float 10s ease-in-out infinite alternate";
    default:
      return "none";
  }
};

const MOTION_CSS = `
@keyframes block-bg-slow-zoom {
  0% { transform: scale(1); }
  100% { transform: scale(1.06); }
}
@keyframes block-bg-ken-burns {
  0% { transform: scale(1) translate(0, 0); }
  50% { transform: scale(1.08) translate(-1%, -1%); }
  100% { transform: scale(1.04) translate(1%, 0.5%); }
}
@keyframes block-bg-drift {
  0% { transform: translate(0, 0); }
  100% { transform: translate(-1.5%, -0.5%); }
}
@keyframes block-bg-float {
  0% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
  100% { transform: translateY(0); }
}
`;

export default function BlockBackgroundSlideshow({ slideshow, className }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const images = useMemo(() => {
    if (!slideshow?.images?.length) return [];
    if (slideshow.random) return [...slideshow.images].sort(() => Math.random() - 0.5);
    return slideshow.images;
  }, [slideshow?.images, slideshow?.random]);

  const interval = (slideshow?.interval ?? 5) * 1000;
  const transitionDuration = slideshow?.transitionDuration ?? 800;

  useEffect(() => {
    if (!slideshow?.enabled || images.length <= 1) return;
    if (slideshow.autoplay === false) return;
    if (paused) return;

    const timer = window.setInterval(
      () => setCurrentIndex(prev => {
        const next = prev + 1;
        if (next >= images.length) return slideshow.loop !== false ? 0 : prev;
        return next;
      }),
      Math.max(1000, interval),
    );
    return () => window.clearInterval(timer);
  }, [slideshow?.enabled, slideshow?.autoplay, slideshow?.loop, images.length, interval, paused]);

  if (!slideshow?.enabled || images.length === 0) return null;

  const blur = slideshow.blur ?? 0;
  const brightness = slideshow.brightness ?? 100;
  const contrast = slideshow.contrast ?? 100;
  const saturation = slideshow.saturation ?? 100;
  const opacity = (slideshow.opacity ?? 100) / 100;
  const blendMode = slideshow.blendMode || "normal";
  const fit = fitToCSS(slideshow.fit);
  const repeat = repeatCSS(slideshow.fit);
  const position = slideshow.position || "center";
  const animation = motionKeyframes(slideshow.motionEffect);
  const motionSpeed = slideshow.motionSpeed ?? 12;

  const filterStr = [
    blur > 0 ? `blur(${blur}px)` : "",
    brightness !== 100 ? `brightness(${brightness}%)` : "",
    contrast !== 100 ? `contrast(${contrast}%)` : "",
    saturation !== 100 ? `saturate(${saturation}%)` : "",
  ].filter(Boolean).join(" ") || "none";

  const tintOpacity = (slideshow.tintOpacity ?? 0) / 100;
  const gradientOpacity = (slideshow.gradientOpacity ?? 0) / 100;

  return (
    <>
      <style>{MOTION_CSS}</style>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className || ""}`}
        onMouseEnter={() => slideshow.pauseOnHover && setPaused(true)}
        onMouseLeave={() => slideshow.pauseOnHover && setPaused(false)}
        style={{ mixBlendMode: blendMode as any }}
      >
        {images.map((src, index) => {
          const isActive = index === currentIndex;
          const animationStr = animation !== "none"
            ? animation.replace(/\d+s/, `${motionSpeed}s`)
            : "none";

          return (
            <div
              key={`${src}-${index}`}
              className="absolute inset-0"
              style={{
                opacity: isActive ? opacity : 0,
                transition: `opacity ${transitionDuration}ms ease-in-out`,
                filter: filterStr,
                backgroundImage: `url("${src}")`,
                backgroundSize: fit,
                backgroundRepeat: repeat,
                backgroundPosition: position,
                animation: isActive ? animationStr : "none",
                willChange: "transform, opacity",
              }}
            />
          );
        })}

        {/* Tint overlay */}
        {slideshow.tintColor && tintOpacity > 0 && (
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: slideshow.tintColor,
              opacity: tintOpacity,
            }}
          />
        )}

        {/* Gradient overlay */}
        {gradientOpacity > 0 && slideshow.gradientStart && slideshow.gradientEnd && (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, ${slideshow.gradientStart}, ${slideshow.gradientEnd})`,
              opacity: gradientOpacity,
            }}
          />
        )}
      </div>
    </>
  );
}
