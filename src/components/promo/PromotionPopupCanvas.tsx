import type { CSSProperties, MouseEvent } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PopupCanvasElement, PromotionPopupConfig } from "@/types/promotion-popup";
import { isVisibleOnDevice } from "@/types/device-overrides";
import type { DeviceMode, PopupElementDeviceOverrides } from "@/types/device-overrides";

interface PromotionPopupCanvasProps {
  config: PromotionPopupConfig;
  mode?: "runtime" | "editor";
  className?: string;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
  onPointerDownElement?: (id: string, event: MouseEvent<HTMLDivElement>) => void;
  onAction?: () => void;
  onClose?: () => void;
  /** Current device mode for responsive rendering */
  device?: DeviceMode;
}

const getAnimationProps = (element: PopupCanvasElement, mode: "runtime" | "editor") => {
  if (mode === "editor") {
    return { initial: false, animate: { opacity: 1, y: 0, scale: 1 } };
  }

  const duration = Math.max(0.15, Number(element.animation.duration) || 0.35);
  const delay = Math.max(0, Number(element.animation.delay) || 0);

  switch (element.animation.entrance) {
    case "fade":
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration, delay } };
    case "slide":
      return { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration, delay } };
    case "zoom":
      return { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 }, transition: { duration, delay } };
    case "bounce":
      return { initial: { opacity: 0, y: 20, scale: 0.94 }, animate: { opacity: 1, y: [20, -4, 0], scale: 1 }, transition: { duration: duration + 0.1, delay } };
    case "pulse":
      return { initial: { opacity: 0.6, scale: 0.97 }, animate: { opacity: 1, scale: [0.98, 1.02, 1] }, transition: { duration: duration + 0.5, delay } };
    case "floating":
      return { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: [0, -6, 0] }, transition: { duration: duration + 1.5, delay, repeat: Infinity, repeatType: "mirror" as const } };
    case "shimmer":
      return { initial: { opacity: 0 }, animate: { opacity: 1, backgroundPosition: ["0% 50%", "100% 50%"] }, transition: { duration: duration + 1.5, delay, repeat: Infinity, repeatType: "reverse" as const } };
    case "none":
    default:
      return { initial: { opacity: 1 }, animate: { opacity: 1 }, transition: { duration, delay } };
  }
};

const getCountdownText = (element: PopupCanvasElement) => {
  if (!element.countdown.endDate) {
    return `${element.countdown.prefix || "Ends in"} 05d 12h ${element.countdown.suffix || "left"}`.trim();
  }

  const target = new Date(element.countdown.endDate);
  if (Number.isNaN(target.getTime())) {
    return `${element.countdown.prefix || "Ends in"} 05d 12h ${element.countdown.suffix || "left"}`.trim();
  }

  const diffMs = Math.max(0, target.getTime() - Date.now());
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${element.countdown.prefix || "Ends in"} ${days}d ${hours}h ${element.countdown.suffix || "left"}`.trim();
};

const getButtonClasses = (variant: string) => {
  switch (variant) {
    case "secondary":
      return "ll-btn ll-btn-secondary";
    case "outline":
      return "ll-btn ll-btn-outline";
    case "ghost":
      return "ll-btn ll-btn-ghost";
    case "luxury":
      return "ll-btn ll-btn-luxury";
    case "pill":
      return "ll-btn ll-btn-default ll-btn-pill";
    default:
      return "ll-btn ll-btn-default";
  }
};

const getHoverAnimation = (element: PopupCanvasElement, mode: "runtime" | "editor") => {
  if (mode !== "runtime") return undefined;

  switch (element.animation.hover) {
    case "scale":
      return { scale: 1.03 };
    case "pulse":
      return { scale: [1, 1.03, 1] };
    case "float":
      return { y: -4 };
    case "shimmer":
      return { opacity: [0.92, 1, 0.92] };
    default:
      return undefined;
  }
};

const renderElementContent = (
  element: PopupCanvasElement,
  mode: "runtime" | "editor",
  onAction?: () => void,
) => {
  switch (element.type) {
    case "badge":
      return <span className="inline-flex w-full items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">{element.content || "Badge"}</span>;

    case "button": {
      const label = element.action.label || element.content || "Learn more";
      const isExternal = element.action.target === "external" || /^https?:\/\//i.test(element.action.link);
      const inner = (
        <span className={cn("inline-flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-transform", getButtonClasses(element.action.variant))}>
          <span>{label}</span>
          {element.action.icon && <span aria-hidden="true">{element.action.icon}</span>}
        </span>
      );

      if (mode === "editor") {
        return inner;
      }

      if (isExternal) {
        return (
          <a href={element.action.link || "#"} target="_blank" rel="noreferrer" onClick={onAction} className="block w-full">
            {inner}
          </a>
        );
      }

      return (
        <Link to={element.action.link || "/"} onClick={onAction} className="block w-full">
          {inner}
        </Link>
      );
    }

    case "countdown":
      return <span className="inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold">{getCountdownText(element)}</span>;

    case "image":
      return element.asset.url ? (
        <img src={element.asset.url} alt="" className="h-full w-full rounded-[inherit] object-cover" style={{ objectFit: element.asset.fit as React.CSSProperties["objectFit"], objectPosition: element.asset.position }} />
      ) : (
        <div className="flex h-full min-h-20 w-full items-center justify-center rounded-[inherit] border border-dashed border-border/50 bg-muted/40 text-[11px] text-muted-foreground">
          Image placeholder
        </div>
      );

    case "icon":
      return <span className="inline-flex w-full items-center justify-center">{element.content || element.action.icon || "✨"}</span>;

    case "shape":
      return <div className="h-full w-full rounded-[inherit]" aria-hidden="true" />;

    case "subtitle":
    case "description":
    case "title":
    default:
      return <div className="whitespace-pre-wrap break-words">{element.content}</div>;
  }
};

export default function PromotionPopupCanvas({
  config,
  mode = "runtime",
  className,
  selectedElementId,
  onSelectElement,
  onPointerDownElement,
  onAction,
  onClose,
  device = "desktop",
}: PromotionPopupCanvasProps) {
  return (
    <motion.div
      initial={mode === "runtime" ? { opacity: 0, scale: 0.96, y: 12 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={mode === "runtime" ? { opacity: 0, scale: 0.96, y: 10 } : undefined}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn("relative mx-auto overflow-hidden border bg-card text-card-foreground", className)}
      style={{
        width: `min(${Math.max(280, config.container.width)}px, calc(100vw - 2rem))`,
        minHeight: config.container.minHeight,
        padding: config.container.padding,
        borderRadius: config.container.borderRadius,
        borderColor: config.container.borderColor,
        borderWidth: config.container.borderWidth,
        borderStyle: config.container.borderWidth > 0 ? "solid" : "none",
        backgroundColor: config.container.backgroundColor,
        backgroundImage: config.container.backgroundImage
          ? `linear-gradient(rgba(255,255,255,${1 - config.container.opacity}), rgba(255,255,255,${1 - config.container.opacity})), url(${config.container.backgroundImage})`
          : undefined,
        backgroundSize: config.container.backgroundSize,
        backgroundPosition: config.container.backgroundPosition,
        boxShadow: config.container.shadow,
        opacity: config.container.opacity,
      }}
    >
      {config.container.showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close promotion popup"
          className="absolute right-3 top-3 z-[120] inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/30 transition-colors hover:opacity-90"
          style={{
            color: config.container.closeButtonColor,
            background: config.container.closeButtonBackground,
          }}
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {config.elements
        .filter((element) => {
          if (!element.visible) return false;
          // Check device visibility
          if (!isVisibleOnDevice(element.deviceVisibility, device)) {
            return mode !== "editor"; // In editor, we show a placeholder instead of filtering
          }
          return true;
        })
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((element) => {
          // Resolve device-specific property overrides
          const dOverrides: Partial<PopupElementDeviceOverrides> = {};
          if (device !== "desktop" && element.responsive) {
            // mobile inherits from tablet, then base
            if (device === "mobile") {
              Object.assign(dOverrides, element.responsive.tablet || {}, element.responsive.mobile || {});
            } else {
              Object.assign(dOverrides, element.responsive[device] || {});
            }
          }

          const elX = dOverrides.x ?? element.x;
          const elY = dOverrides.y ?? element.y;
          const elWidth = dOverrides.width ?? element.width;
          const elHeight = dOverrides.height ?? element.height;
          const elFontSize = dOverrides.fontSize ?? element.style.fontSize;
          const elLineHeight = dOverrides.lineHeight ?? element.style.lineHeight;
          const elLetterSpacing = dOverrides.letterSpacing ?? element.style.letterSpacing;
          const elPaddingX = dOverrides.paddingX ?? element.style.paddingX;
          const elPaddingY = dOverrides.paddingY ?? element.style.paddingY;
          const elOpacity = dOverrides.opacity ?? element.style.opacity;

          const isHiddenOnDevice = !isVisibleOnDevice(element.deviceVisibility, device);

          const boxStyle: CSSProperties = {
            position: "absolute",
            left: `${elX}%`,
            top: `${elY}%`,
            width: `${elWidth}%`,
            zIndex: element.zIndex,
            color: element.style.color,
            backgroundColor: element.style.backgroundColor,
            borderColor: element.style.borderColor,
            borderWidth: element.style.borderWidth,
            borderStyle: element.style.borderWidth > 0 ? "solid" : "none",
            borderRadius: element.type === "button" ? element.action.radius : element.style.borderRadius,
            boxShadow: element.style.shadow === "none" ? undefined : element.style.shadow,
            padding: `${elPaddingY}px ${elPaddingX}px`,
            textAlign: element.style.textAlign,
            fontSize: `${elFontSize}px`,
            fontWeight: element.style.fontWeight,
            lineHeight: String(elLineHeight),
            letterSpacing: `${elLetterSpacing}px`,
            textShadow: element.style.textShadow === "none" ? undefined : element.style.textShadow,
            fontFamily: element.style.fontFamily === "inherit" ? undefined : element.style.fontFamily,
            opacity: elOpacity,
            transform: `rotate(${element.style.rotation}deg)`,
            cursor: mode === "editor" && !element.locked ? "move" : mode === "editor" ? "not-allowed" : undefined,
            minHeight: element.type === "shape" || element.type === "image" ? undefined : `${elHeight}%`,
            height: element.type === "shape" || element.type === "image" ? `${elHeight}%` : undefined,
          };

          const selected = selectedElementId === element.id;

          return (
            <motion.div
              key={element.id}
              {...getAnimationProps(element, mode)}
              whileHover={getHoverAnimation(element, mode)}
              id={mode === "runtime" && element.type === "title" ? "promotion-popup-title" : undefined}
              className={cn(
                "group rounded-[inherit] transition-shadow",
                mode === "editor" && "outline-none",
                selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                isHiddenOnDevice && mode === "editor" && "border border-dashed border-amber-500/30 opacity-30",
              )}
              style={boxStyle}
              onMouseDown={mode === "editor" ? (event) => onPointerDownElement?.(element.id, event) : undefined}
              onClick={mode === "editor" ? () => onSelectElement?.(element.id) : undefined}
            >
              {isHiddenOnDevice && mode === "editor" ? (
                <div className="flex items-center justify-center py-1 text-[9px] text-amber-500">Hidden on {device}</div>
              ) : (
                renderElementContent(element, mode, onAction)
              )}
            </motion.div>
          );
        })}
    </motion.div>
  );
}
