import { useState, useEffect, useRef, FormEvent, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { useVisualEditorSafe } from "@/contexts/VisualEditorContext";
import { useDesignSystemSafe } from "@/contexts/DesignSystemContext";
import { useAnalyticsSafe } from "@/contexts/AnalyticsContext";
import { isVisibleOnDevice } from "@/types/device-overrides";
import type { DeviceMode } from "@/types/device-overrides";
import { Link } from "react-router-dom";
import {
  ArrowRight, Truck, Shield, Star, Printer, ChevronLeft, ChevronRight,
  Upload, Palette, ShoppingBag, Package, Mail, ExternalLink, Box,
  Sparkles, CheckCircle2, HelpCircle, Gem, Wrench, Home, Gift,
  BadgeCheck, Instagram, Clock, CreditCard, DollarSign, MapPin, Phone,
  Globe, Camera, Image, Video, Play, Download, Share2, ThumbsUp, Award,
  Zap, Flame, Lock, Eye, Bell, MessageCircle, Send, Search, Filter,
  Settings, BarChart3, TrendingUp, Users, UserPlus, User, Layers,
  Bookmark, Tag, Calendar, FileText, Rocket, Target, Flag, Trophy,
  Medal, Crown, Diamond, Scissors, Ruler, Pencil, Copy, RefreshCw,
  Maximize, Move, Menu, Info, AlertCircle, AlertTriangle, XCircle,
  Heart, Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import SmartFunnelSection from "@/components/smart/SmartFunnelSection";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useFeaturedProducts, useStorefrontCatalog } from "@/hooks/use-storefront";
import { ProductGridSkeleton } from "@/components/shared/loading-states";
import { cn } from "@/lib/utils";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import BlockBackgroundSlideshow from "@/components/blocks/BlockBackgroundSlideshow";
import {
  buildEntranceAnimation,
  buildHoverAnimation,
  buildPressAnimation,
  buildChildRevealProps,
  isMotionEnabledForViewport,
} from "@/lib/animation-system";

type ActionType = "none" | "internal_link" | "external_link";

type ImageItem = {
  image: string;
  title?: string;
  subtitle?: string;
  alt?: string;
  actionType?: ActionType;
  actionTarget?: string;
  openInNewTab?: boolean;
  visible?: boolean;
  colSpan?: number;
  rowSpan?: number;
  order?: number;
  objectFit?: CSSProperties["objectFit"];
  opacity?: number;
  borderRadius?: number;
  shadow?: string;
  positionX?: string;
  positionY?: string;
};

type ImageCollectionContent = {
  heading?: string;
  columns?: number;
  items?: ImageItem[];
};

const tr = (key: string, fallback: string) => i18n.t(key, { defaultValue: fallback });

const getLocalizedValue = (value: any, fallback = "") => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;

  const resolved = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase().split("-")[0];
  return value[resolved] || value.en || fallback;
};

const ImageCollectionBlock = ({ content, className }: { content?: ImageCollectionContent; className?: string }) => {
  const items = (content?.items ?? [])
    .filter((item) => item?.visible !== false && item?.image)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const columns = Math.min(Math.max(content?.columns ?? 3, 1), 4);
  const heading = getLocalizedValue(content?.heading, "");

  const renderImage = (item: ImageItem) => (
    <>
      <img
        src={item.image}
        alt={getLocalizedValue(item.alt, getLocalizedValue(item.title, tr("blocks.imageCollection.alt", "Gallery image")))}
        className="h-full w-full rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]"
        style={{
          objectFit: item.objectFit || "cover",
          objectPosition: `${item.positionX || "center"} ${item.positionY || "center"}`,
          opacity: (item.opacity ?? 100) / 100,
          borderRadius: `${item.borderRadius ?? 16}px`,
        }}
      />
      {(item.title || item.subtitle) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/70 to-transparent p-4 text-white hidden md:block">
          {item.title && (
            <p className="text-sm font-semibold uppercase tracking-wide">{getLocalizedValue(item.title)}</p>
          )}
          {item.subtitle && <p className="mt-1 text-xs text-white/80">{getLocalizedValue(item.subtitle)}</p>}
        </div>
      )}
    </>
  );

  const renderCard = (item: ImageItem, index: number) => {
    const card = (
      <div
        className="group relative overflow-hidden rounded-2xl border border-border/30 bg-card/70 backdrop-blur-xl"
        style={{
          boxShadow: 'var(--ll-shadow-soft), inset 0 1px 0 0 hsl(215 25% 95% / 0.04)',
          gridColumn: `span ${Math.min(Math.max(item.colSpan ?? 1, 1), columns)}`,
          gridRow: `span ${Math.min(Math.max(item.rowSpan ?? 1, 1), 4)}`,
          minHeight: 220,
        }}
      >
        {renderImage(item)}
      </div>
    );

    if (item.actionType === "internal_link" && item.actionTarget) {
      const href = item.actionTarget.startsWith("/") ? item.actionTarget : `/${item.actionTarget}`;
      return (
        <Link key={`${item.image}-${index}`} to={href} className="block">
          {card}
        </Link>
      );
    }

    if (item.actionType === "external_link" && item.actionTarget) {
      return (
        <a
          key={`${item.image}-${index}`}
          href={item.actionTarget}
          target={item.openInNewTab ? "_blank" : "_self"}
          rel={item.openInNewTab ? "noreferrer noopener" : undefined}
          className="block"
        >
          {card}
        </a>
      );
    }

    return <div key={`${item.image}-${index}`}>{card}</div>;
  };

  if (items.length === 0) return null;

  return (
    <section className={cn("mx-auto w-full max-w-7xl px-4 py-10 md:px-6", className)}>
      {heading && <h2 className="mb-6 text-center text-3xl font-black uppercase tracking-wide">{heading}</h2>}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: "220px" }}
      >
        {items.map((item, index) => renderCard(item, index))}
      </div>
    </section>
  );
};

type InstagramMediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  username?: string;
  is_reel?: boolean;
  is_story?: boolean;
  timestamp?: string;
  expires_at?: string;
};

export interface SiteBlock {
  id: string;
  block_type: string;
  title: string | null;
  content: any;
  sort_order: number;
  is_active?: boolean;
  page?: string;
}

export type BlockAction = {
  // legacy: "internal_link" | "external_link"
  actionType?: "none" | "internal_link" | "external_link" | "anchor" | "page_anchor" | "product" | "product_anchor" | "category" | "email" | "phone";
  actionTarget?: string; // generic target (page path, url, slug, email, phone, or category slug)
  anchorId?: string; // explicit anchor id (without #)
  openInNewTab?: boolean;
};

export type BlockButton = {
  text?: string;
  icon?: string;
  iconPosition?: "left" | "right" | "top";
  variant?: "default" | "outline" | "ghost" | "secondary" | "link" | "luxury" | "pill";
  visible?: boolean;
  // allow extended action types; preserve legacy fields
  actionType?: BlockAction["actionType"];
  actionTarget?: string;
  anchorId?: string;
  openInNewTab?: boolean;
};

const ICON_MAP: Record<string, any> = {
  ShoppingBag, ArrowRight, Palette, Upload, Printer, Package, Truck, Shield,
  Star, Mail, ExternalLink, Box, Sparkles, CheckCircle2, HelpCircle, Gem,
  Wrench, Home, Gift, BadgeCheck, Instagram, Clock, CreditCard, DollarSign,
  MapPin, Phone, Globe, Camera, Image, Video, Play, Download, Share2,
  ThumbsUp, Award, Zap, Flame, Lock, Eye, Bell, MessageCircle, Send,
  Search, Filter, Settings, BarChart3, TrendingUp, Users, UserPlus, User,
  Layers, Bookmark, Tag, Calendar, FileText, Rocket, Target, Flag, Trophy,
  Medal, Crown, Diamond, Scissors, Ruler, Pencil, Copy, RefreshCw,
  Maximize, Move, Menu, Info, AlertCircle, AlertTriangle, XCircle, Heart, Coffee,
};

const iconForName = (name?: string, fallback = Box) => ICON_MAP[name || ""] || fallback;

const isEditorPreviewMode = () => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("editorPreview") === "1";
};

const normalizeAction = (source: any): Required<BlockAction> => {
  const rawType = source?.actionType || source?.type || "none";
  const actionTarget = source?.actionTarget || source?.target || source?.link || "";
  const anchorId = source?.anchorId || source?.actionAnchor || "";
  const openInNewTab = Boolean(source?.openInNewTab);

  // map legacy types
  let actionType: string = rawType;
  if (rawType === "internal_link") actionType = "page_anchor"; // treat legacy internal as page/path
  if (rawType === "external_link") actionType = "external_link";

  // allow anchors expressed via target containing '#'
  if (!actionType || actionType === "none") {
    if (typeof actionTarget === "string" && actionTarget.includes("#")) actionType = "page_anchor";
    if (typeof actionTarget === "string" && /^mailto:/i.test(actionTarget)) actionType = "email";
    if (typeof actionTarget === "string" && /^tel:/i.test(actionTarget)) actionType = "phone";
  }

  const allowed = ["none", "internal_link", "external_link", "anchor", "page_anchor", "product", "product_anchor", "category", "email", "phone"];
  if (!allowed.includes(actionType)) actionType = "none";

  return { actionType: actionType as any, actionTarget: String(actionTarget || ""), anchorId: String(anchorId || ""), openInNewTab };
};

const normalizeFaqItem = (item: any) => ({
  ...item,
  q: item?.q ?? item?.question ?? "",
  a: item?.a ?? item?.answer ?? "",
});

const resolveSectionAction = (content: any): Required<BlockAction> =>
  normalizeAction({
    actionType: content?.section_actionType || content?.actionType || content?.action?.actionType || "none",
    actionTarget: content?.section_actionTarget || content?.actionTarget || content?.action?.actionTarget || "",
    openInNewTab: content?.section_openInNewTab ?? content?.openInNewTab ?? content?.action?.openInNewTab ?? false,
  });

const resolveItemAction = (item: any, fallbackLink?: string): Required<BlockAction> => {
  const normalized = normalizeAction(item);
  if (normalized.actionType !== "none") return normalized;

  if (!fallbackLink) return normalized;
  const isExternal = /^https?:\/\//i.test(fallbackLink);
  return {
    actionType: isExternal ? "external_link" : "internal_link",
    actionTarget: fallbackLink,
    anchorId: "",
    openInNewTab: false,
  };
};

const resolveButtons = (
  content: any,
  legacy: Array<{ text?: string; link?: string; icon?: string; variant?: string }>,
) => {
  if (Array.isArray(content?.buttons) && content.buttons.length > 0) {
    return content.buttons.map((button: any) => ({
      text: getLocalizedValue(button?.text || "", ""),
      icon: button?.icon || "",
      iconPosition: button?.iconPosition || "left",
      variant: button?.variant || "default",
      visible: button?.visible !== false,
      ...resolveItemAction(button, button?.link),
    })) as BlockButton[];
  }

  return legacy
    .filter((button) => button.text)
    .map((button) => ({
      text: button.text,
      icon: button.icon || "",
      iconPosition: "left",
      variant: (button.variant || "default") as BlockButton["variant"],
      visible: true,
      ...resolveItemAction({}, button.link),
    })) as BlockButton[];
};

const alignmentClass = (alignment?: string) => {
  switch (alignment) {
    case "left":
      return "text-left";
    case "right":
      return "text-right";
    default:
      return "text-center";
  }
};

const justifyClass = (alignment?: string) => {
  switch (alignment) {
    case "left":
      return "justify-start";
    case "right":
      return "justify-end";
    default:
      return "justify-center";
  }
};

const verticalClass = (vertical?: string) => {
  switch (vertical) {
    case "top":
      return "items-start";
    case "bottom":
      return "items-end";
    default:
      return "items-center";
  }
};

const sectionStyle = (content: any, viewport: string): CSSProperties => {
  const style: CSSProperties = {};
  // apply responsive overrides if present
  const resp = content?.responsive || {};
  const overrides = (resp && resp[viewport]) || {};

  // Colors
  if (content?.backgroundColor || content?.bg_color) style.backgroundColor = content.backgroundColor || content.bg_color;
  if (content?.textColor || content?.text_color) style.color = content.textColor || content.text_color;

  // Spacing (apply responsive overrides)
  const paddingTop = overrides?.paddingTop ?? content?.paddingTop;
  const paddingBottom = overrides?.paddingBottom ?? content?.paddingBottom;
  const paddingLeft = overrides?.paddingLeft ?? content?.paddingLeft;
  const paddingRight = overrides?.paddingRight ?? content?.paddingRight;
  const marginTop = overrides?.marginTop ?? content?.marginTop;
  const marginBottom = overrides?.marginBottom ?? content?.marginBottom;
  if (paddingTop !== undefined) style.paddingTop = `${Number(paddingTop) || 0}px`;
  if (paddingBottom !== undefined) style.paddingBottom = `${Number(paddingBottom) || 0}px`;
  if (paddingLeft !== undefined) style.paddingLeft = `${Number(paddingLeft) || 0}px`;
  if (paddingRight !== undefined) style.paddingRight = `${Number(paddingRight) || 0}px`;
  if (marginTop !== undefined) style.marginTop = `${Number(marginTop) || 0}px`;
  if (marginBottom !== undefined) style.marginBottom = `${Number(marginBottom) || 0}px`;

  // Min height (responsive aware)
  const minH = overrides?.minHeight ?? content?.minHeight;
  if (minH) style.minHeight = `${Number(minH)}px`;

  // Opacity
  const opacityVal = overrides?.opacity ?? content?.opacity;
  if (opacityVal !== undefined && opacityVal !== 100) style.opacity = Number(opacityVal) / 100;

  // Gap
  const gapVal = overrides?.gap ?? content?.gap;
  if (gapVal) style.gap = `${Number(gapVal)}px`;

  // Border (uniform)
  if (content?.borderWidth && content.borderWidth > 0 && content?.borderStyle && content.borderStyle !== "none") {
    const bOpacity = content.borderOpacity !== undefined ? Number(content.borderOpacity) / 100 : 1;
    const bColor = content.borderColor || "hsl(var(--border))";
    style.borderWidth = `${content.borderWidth}px`;
    style.borderStyle = content.borderStyle;
    style.borderColor = bOpacity < 1 ? `color-mix(in srgb, ${bColor} ${Math.round(bOpacity * 100)}%, transparent)` : bColor;
  }

  // Per-side borders
  if (content?._borderPerSide) {
    for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
      const w = content[`border${side}Width`];
      const s = content[`border${side}Style`];
      const c2 = content[`border${side}Color`];
      if (w && w > 0 && s && s !== "none") {
        (style as any)[`border${side}Width`] = `${w}px`;
        (style as any)[`border${side}Style`] = s;
        if (c2) (style as any)[`border${side}Color`] = c2;
      }
    }
  }

  // Border radius
  const borderRadius = overrides?.borderRadius ?? content?.borderRadius;
  if (borderRadius) style.borderRadius = `${borderRadius}px`;

  // Max width (responsive)
  const maxW = overrides?.maxWidth ?? content?.maxWidth;
  if (maxW) style.maxWidth = `${Number(maxW)}px`;

  // Flex direction / stack (responsive)
  const stackDir = overrides?.stackDirection ?? content?.stackDirection;
  if (stackDir) style.flexDirection = stackDir;

  // Text alignment (responsive)
  const textAlignVal = overrides?.textAlign ?? content?.textAlign;
  if (textAlignVal) style.textAlign = textAlignVal;

  // Glassmorphism
  if (content?.glassEnabled) {
    style.backdropFilter = `blur(${content.glassBlur ?? 16}px)`;
    style.WebkitBackdropFilter = `blur(${content.glassBlur ?? 16}px)`;
    const opacity = (content.glassOpacity ?? 70) / 100;
    if (content.glassTint) {
      style.backgroundColor = `color-mix(in srgb, ${content.glassTint} ${Math.round(opacity * 100)}%, transparent)`;
    } else if (!style.backgroundColor) {
      style.backgroundColor = `hsla(var(--card), ${opacity})`;
    }
    if (content.glassBorderGlow) {
      style.borderColor = "hsl(var(--primary) / 0.3)";
      style.borderWidth = style.borderWidth || "1px";
      style.borderStyle = style.borderStyle || "solid";
    }
  }

  // Gradient background
  if (content?.gradientEnabled && content.gradientColor1 && content.gradientColor2) {
    const dir = content.gradientDirection || "to right";
    const colors = [content.gradientColor1, content.gradientColor2, content.gradientColor3].filter(Boolean);
    style.background = `linear-gradient(${dir}, ${colors.join(", ")})`;
    if (content.gradientAnimated) {
      style.backgroundSize = "200% 200%";
    }
  }

  // Shadow system
  if (content?.shadow && content.shadow !== "none") {
    const color = content.shadowColor || "hsl(228 33% 2% / 0.4)";
    const shadowMap: Record<string, string> = {
      sm: content.shadowColor ? `0 1px 2px 0 ${color}` : "var(--ll-shadow-sm)",
      md: content.shadowColor ? `0 4px 6px -1px ${color}` : "var(--ll-shadow-md)",
      lg: content.shadowColor ? `0 10px 15px -3px ${color}` : "var(--ll-shadow-lg)",
      xl: content.shadowColor ? `0 20px 25px -5px ${color}` : "var(--ll-shadow-xl)",
      "2xl": content.shadowColor ? `0 25px 50px -12px ${color}` : "var(--ll-shadow-2xl)",
      soft: content.shadowColor ? `0 8px 40px -8px ${color}` : "var(--ll-shadow-soft)",
      hard: content.shadowColor ? `4px 4px 0px ${color}` : "var(--ll-shadow-hard)",
      colored: content.shadowColor ? `0 10px 30px -5px ${color}` : "var(--ll-shadow-colored)",
      layered: content.shadowColor ? `0 2px 4px ${color}, 0 8px 20px ${color}` : "var(--ll-shadow-layered)",
      inset: content.shadowColor ? `inset 0 2px 12px ${color}` : "var(--ll-shadow-inset)",
    };
    if (shadowMap[content.shadow]) {
      style.boxShadow = shadowMap[content.shadow];
    }
  }

  // Glow
  if (content?.glowEnabled) {
    const glowColor = content.glowColor || "hsl(217, 91%, 60%)";
    const intensity = content.glowIntensity ?? 20;
    const spread = content.glowSpread ?? 30;
    const outerGlow = `0 0 ${spread}px ${intensity / 3}px ${glowColor}`;
    const innerGlow = content.glowInner ? `, inset 0 0 ${intensity}px ${glowColor}` : "";
    style.boxShadow = (style.boxShadow ? `${style.boxShadow}, ` : "") + outerGlow + innerGlow;
    if (content.neonBorder) {
      style.borderColor = glowColor;
      style.borderWidth = style.borderWidth || "1px";
      style.borderStyle = style.borderStyle || "solid";
    }
  }

  return style;
};

const sectionProps = (block: SiteBlock, defaults: string, viewport: string) => {
  const c = block.content || {};
  return {
    className: `${defaults} ${c?.customClassName || c?.className || ""}`.trim(),
    style: sectionStyle(c, viewport),
  };
};

const navigateWithAction = (action: Required<BlockAction>) => {
  if (isEditorPreviewMode()) return;
  if (action.actionType === "none") return;

  const smoothScrollTo = (id: string) => {
    try {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", `#${id}`);
        return true;
      }
    } catch (err) {
      // ignore
    }
    return false;
  };

  // External URL
  if (action.actionType === "external_link") {
    window.open(action.actionTarget, action.openInNewTab ? "_blank" : "_self", action.openInNewTab ? "noopener,noreferrer" : undefined);
    return;
  }

  // Same-page anchor
  if (action.actionType === "anchor") {
    const anchor = (action.anchorId || action.actionTarget || "").replace(/^#/, "");
    if (!anchor) return;
    if (smoothScrollTo(anchor)) return;
    // if element not found, still update hash
    window.location.hash = `#${anchor}`;
    return;
  }

  // Page (possibly with anchor) or legacy internal
  if (action.actionType === "page_anchor" || action.actionType === "internal_link") {
    const target = String(action.actionTarget || "");
    if (!target) return;
    // if target already contains hash, navigate directly
    if (target.includes("#")) {
      window.location.href = target;
      return;
    }
    const anchor = (action.anchorId || "").replace(/^#/, "");
    const url = anchor ? `${target.replace(/\/$/, "")}#${anchor}` : target;
    window.location.href = url;
    return;
  }

  // Product links
  if (action.actionType === "product" || action.actionType === "product_anchor") {
    const slug = String(action.actionTarget || "");
    if (!slug) return;
    const base = slug.startsWith("/") ? slug : `/products/${slug}`;
    const anchor = (action.anchorId || "").replace(/^#/, "");
    const url = anchor ? `${base}#${anchor}` : base;
    window.location.href = url;
    return;
  }

  if (action.actionType === "category") {
    const slug = String(action.actionTarget || "").replace(/^\//, "");
    if (!slug) return;
    window.location.href = `/products?category=${encodeURIComponent(slug)}`;
    return;
  }

  if (action.actionType === "email") {
    const email = String(action.actionTarget || "").replace(/^mailto:/i, "");
    if (!email) return;
    window.location.href = `mailto:${email}`;
    return;
  }

  if (action.actionType === "phone") {
    const phone = String(action.actionTarget || "").replace(/^tel:/i, "");
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  }
};

const applySectionAction = (action: Required<BlockAction>) => ({
  onClick: (e: MouseEvent<HTMLElement>) => {
    if (isEditorPreviewMode()) return;
    const target = e.target as HTMLElement;
    if (target.closest("a,button,input,textarea,select,label")) return;
    navigateWithAction(action);
  },
  className: action.actionType !== "none" && !isEditorPreviewMode() ? "cursor-pointer" : "",
});

const ActionButton = ({
  button,
  fallbackText,
  className,
}: {
  button: BlockButton;
  fallbackText?: string;
  className?: string;
}) => {
  if (button.visible === false) return null;
  const text = getLocalizedValue(button.text, "") || fallbackText;
  if (!text) return null;

  const { tokens } = useDesignSystemSafe();
  const action = normalizeAction(button);
  const Icon = iconForName(button.icon, ArrowRight);
  const icon = <Icon className="h-4 w-4" />;
  const variant = (button.variant && button.variant !== "default"
    ? button.variant
    : tokens.buttons.defaultVariant || "default") as any;

  const content = (
    <span className={`inline-flex items-center gap-2 ${button.iconPosition === "top" ? "flex-col" : ""}`}>
      {button.icon && button.iconPosition !== "right" && icon}
      <span>{text}</span>
      {button.icon && button.iconPosition === "right" && icon}
    </span>
  );

  const buttonNode = (
    <motion.div
      whileHover={Object.keys(getHoverProps(button)).length > 0 ? getHoverProps(button) : { y: -2 }}
      whileTap={Object.keys(getPressProps(button)).length > 0 ? getPressProps(button) : { scale: 0.98 }}
    >
      <Button variant={variant} className={className} size="lg">
        {content}
      </Button>
    </motion.div>
  );

  if (isEditorPreviewMode()) return <span className="inline-flex">{buttonNode}</span>;
  if (action.actionType === "none" || (!action.actionTarget && !action.anchorId) || (action.actionTarget && typeof action.actionTarget !== "string")) return buttonNode;

  if (action.actionType === "external_link") {
    return (
      <a
        href={action.actionTarget}
        target={action.openInNewTab ? "_blank" : "_self"}
        rel={action.openInNewTab ? "noopener noreferrer" : undefined}
      >
        {buttonNode}
      </a>
    );
  }
  const smoothScrollTo = (id: string) => {
    try {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", `#${id}`);
        return true;
      }
    } catch (err) {}
    return false;
  };

  // Anchor on same page
  if (action.actionType === "anchor") {
    const anchor = (action.anchorId || action.actionTarget || "").replace(/^#/, "");
    if (!anchor) return buttonNode;
    return (
      <a href={`#${anchor}`} onClick={(e) => { e.preventDefault(); smoothScrollTo(anchor); }}>
        {buttonNode}
      </a>
    );
  }

  // Page / internal link (may include hash)
  if (action.actionType === "page_anchor" || action.actionType === "internal_link") {
    const target = String(action.actionTarget || "");
    if (!target) return buttonNode;
    const internalTarget = target.startsWith("/") ? target : `/${target}`;
    return (
      <Link to={internalTarget} target={action.openInNewTab ? "_blank" : "_self"}>
        {buttonNode}
      </Link>
    );
  }

  // Product link
  if (action.actionType === "product" || action.actionType === "product_anchor") {
    const slug = String(action.actionTarget || "");
    if (!slug) return buttonNode;
    const productPath = slug.startsWith("/") ? slug : `/products/${slug}`;
    return (
      <Link to={productPath} target={action.openInNewTab ? "_blank" : "_self"}>
        {buttonNode}
      </Link>
    );
  }

  if (action.actionType === "category") {
    const slug = String(action.actionTarget || "").replace(/^\//, "");
    if (!slug) return buttonNode;
    return (
      <Link to={`/products?category=${encodeURIComponent(slug)}`} target={action.openInNewTab ? "_blank" : "_self"}>
        {buttonNode}
      </Link>
    );
  }

  if (action.actionType === "email") {
    const email = String(action.actionTarget || "").replace(/^mailto:/i, "");
    if (!email) return buttonNode;
    return (
      <a href={`mailto:${email}`}>
        {buttonNode}
      </a>
    );
  }

  if (action.actionType === "phone") {
    const phone = String(action.actionTarget || "").replace(/^tel:/i, "");
    if (!phone) return buttonNode;
    return (
      <a href={`tel:${phone}`}>
        {buttonNode}
      </a>
    );
  }

  return buttonNode;
};

const getEntranceAnimation = (c: any) => buildEntranceAnimation(c);

const getHoverProps = (c: any) => buildHoverAnimation(c);

const getPressProps = (c: any) => buildPressAnimation(c);

const getGroupMotionProps = (c: any, index: number, columns = 1, disableAnimations = false) => {
  const viewport = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
  const enabled = !disableAnimations && isMotionEnabledForViewport(c, viewport, false);
  return buildChildRevealProps(c, index, { columns, enabled, disableAnimations: !enabled });
};

const getContinuousAnimation = (c: any): string => {
  const effect = c.continuousEffect || "none";
  const speed = c.continuousSpeed ?? 3;
  if (effect === "none") return "";

  const animations: Record<string, string> = {
    float: `sectionFloat ${speed}s ease-in-out infinite`,
    pulse: `sectionPulse ${speed}s ease-in-out infinite`,
    breathe: `sectionBreathe ${speed}s ease-in-out infinite`,
    rotate: `sectionRotate ${speed * 10}s linear infinite`,
    shimmer: `sectionShimmer ${speed}s ease-in-out infinite`,
    gradientMove: `sectionGradientMove ${speed}s ease infinite`,
  };
  return animations[effect] || "";
};

const CONTINUOUS_KEYFRAMES = `
@keyframes sectionFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes sectionPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.01)} }
@keyframes sectionBreathe { 0%,100%{opacity:1} 50%{opacity:0.92} }
@keyframes sectionRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes sectionShimmer { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.06)} }
@keyframes sectionGradientMove { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes glowPulse { 0%,100%{box-shadow:var(--glow-shadow)} 50%{box-shadow:var(--glow-shadow-bright)} }
`;

const sectionWidthClass = (width?: string) => {
  switch (width) {
    case "narrow": return "max-w-4xl mx-auto";
    case "wide": return "max-w-[1400px] mx-auto";
    case "full": return "w-full";
    default: return "";
  }
};

const Section = ({ block, defaultClasses, children }: { block: SiteBlock; defaultClasses: string; children: ReactNode }) => {
  const editorCtx = useVisualEditorSafe();
  const { track, trackAttribution } = useAnalyticsSafe();
  const viewport = editorCtx?.viewport ?? "desktop";
  const c = block.content || {};

  // Device visibility check — hide block on the current device if configured
  const deviceVisibility = c.deviceVisibility as { desktop?: boolean; tablet?: boolean; mobile?: boolean } | undefined;
  if (!isVisibleOnDevice(deviceVisibility, viewport as DeviceMode)) {
    // In editor, show a subtle placeholder; on storefront, skip entirely
    if (!editorCtx) return null;
    return (
      <div className="relative border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-2 text-center text-xs text-amber-500/70" data-editor-block-id={block.id}>
        Hidden on {viewport}
      </div>
    );
  }

  const vp = viewport;
  const props = sectionProps(block, defaultClasses, vp);
  const action = resolveSectionAction(c);
  const clickable = applySectionAction(action);
  const hasSlideshow = c._slideshow?.enabled && c._slideshow?.images?.length > 0;
  const sectionRef = useRef<HTMLElement | null>(null);

  const reusableKind = String(c._reusableKind || "section");
  const isTrackedComponent = reusableKind === "component" || String(c._reusableSyncMode || "") === "global";
  const entityType = isTrackedComponent ? "global_component" : (c._reusableId ? "reusable_section" : "section");
  const sectionEventName = isTrackedComponent ? "component_view" : "section_view";
  const sectionClickEventName = isTrackedComponent ? "component_click" : "section_click";
  const sectionLabel = getLocalizedValue(block.title, "") || getLocalizedValue(c.heading, "") || block.block_type.replace(/_/g, " ");

  // Hover border CSS
  const hoverBorderCSS = (c.borderHoverColor || c.borderHoverWidth || c.shadowGrowOnHover)
    ? `[data-editor-block-id="${block.id}"]:hover { ${c.borderHoverColor ? `border-color: ${c.borderHoverColor} !important;` : ""} ${c.borderHoverWidth ? `border-width: ${c.borderHoverWidth}px !important;` : ""} }`
    : "";

  const hasBgImage = !hasSlideshow && (c.backgroundImage || c.bg_image);
  const bgImageOpacity = (c.bgImageOpacity ?? 100) / 100;
  const needsRelative = hasSlideshow || hasBgImage || c.overlayColor || c.glassEnabled || c.glowEnabled || c.vignetteEnabled || c.noiseOverlay || c.bgImageTintColor;

  // Image filters
  const buildImageFilter = () => {
    const filters: string[] = [];
    if (c.bgImageBlur) filters.push(`blur(${c.bgImageBlur}px)`);
    if (c.bgImageBrightness !== undefined && c.bgImageBrightness !== 100) filters.push(`brightness(${c.bgImageBrightness / 100})`);
    if (c.bgImageContrast !== undefined && c.bgImageContrast !== 100) filters.push(`contrast(${c.bgImageContrast / 100})`);
    if (c.bgImageSaturation !== undefined && c.bgImageSaturation !== 100) filters.push(`saturate(${c.bgImageSaturation / 100})`);
    if (c.bgImageGrayscale) filters.push(`grayscale(${c.bgImageGrayscale / 100})`);
    if (c.bgImageSepia) filters.push(`sepia(${c.bgImageSepia / 100})`);
    return filters.length > 0 ? filters.join(" ") : undefined;
  };

  // Image fit/position
  const bgFit = c.bgImageFit || "cover";
  const bgPosX = c.bgImagePositionX || "center";
  const bgPosY = c.bgImagePositionY || "center";
  const bgSize = bgFit === "repeat" ? undefined : bgFit === "contain" ? "contain" : bgFit === "fill" ? "100% 100%" : "cover";
  const bgRepeat = bgFit === "repeat" ? "repeat" : "no-repeat";

  // Entrance animation
  const entranceAnim = getEntranceAnimation(c);
  const hoverProps = getHoverProps(c);
  const pressProps = getPressProps(c);
  const continuousAnim = getContinuousAnimation(c);

  // Glow animation
  const glowColor = c.glowColor || "hsl(217, 91%, 60%)";
  const glowIntensity = c.glowIntensity ?? 20;
  const glowSpread = c.glowSpread ?? 30;
  const glowAnimCSS = c.glowEnabled && c.glowAnimated
    ? `[data-editor-block-id="${block.id}"] { --glow-shadow: 0 0 ${glowSpread}px ${glowIntensity / 3}px ${glowColor}; --glow-shadow-bright: 0 0 ${glowSpread * 1.5}px ${glowIntensity / 2}px ${glowColor}; animation: glowPulse 2s ease-in-out infinite; }`
    : "";

  // Gradient animation
  const gradientAnimCSS = c.gradientEnabled && c.gradientAnimated
    ? `[data-editor-block-id="${block.id}"] { animation: sectionGradientMove ${c.gradientSpeed ?? 5}s ease infinite; background-size: 200% 200% !important; }`
    : "";

  const dynamicCSS = [CONTINUOUS_KEYFRAMES, hoverBorderCSS, glowAnimCSS, gradientAnimCSS].filter(Boolean).join("\n");

  const sectionStyleOverrides: CSSProperties = {};
  if (continuousAnim && !c.glowAnimated && !(c.gradientEnabled && c.gradientAnimated)) {
    sectionStyleOverrides.animation = continuousAnim;
  }

  const anchorAttr = c.anchorId || c.anchor || `section-${(block.page || "page").replace(/[^a-z0-9-_]/gi, "-")}-${block.id}`;

  useEffect(() => {
    if (isEditorPreviewMode() || typeof window === "undefined") return;
    const node = sectionRef.current;
    if (!node) return;

    let fired = false;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (fired || !entry.isIntersecting) return;
          fired = true;
          track({
            eventName: sectionEventName,
            entityType: entityType as any,
            entityId: block.id,
            reusableId: c._reusableId ? String(c._reusableId) : null,
            componentId: isTrackedComponent && c._reusableId ? String(c._reusableId) : null,
            source: "block_renderer",
            context: {
              entityLabel: sectionLabel,
              blockType: block.block_type,
              pageKey: block.page || null,
              anchorId: anchorAttr,
              reusableKind,
            },
          });
          observer.disconnect();
        });
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [anchorAttr, block.block_type, block.id, block.page, c._reusableId, entityType, isTrackedComponent, reusableKind, sectionEventName, sectionLabel, track]);

  // Track personalized variant display
  useEffect(() => {
    if (isEditorPreviewMode() || !c._activeVariantId) return;
    track({
      eventName: "personalized_variant_shown",
      entityType: entityType as any,
      entityId: block.id,
      source: "personalization",
      context: { variantId: c._activeVariantId, blockType: block.block_type, entityLabel: sectionLabel },
      allowDuplicates: false,
      dedupeKey: `pv-${block.id}-${c._activeVariantId}`,
    });
  }, [block.id, block.block_type, c._activeVariantId, entityType, sectionLabel, track]);

  // Track A/B test variant display
  useEffect(() => {
    if (isEditorPreviewMode() || !c._abVariantId || !c._abExperimentId) return;
    track({
      eventName: "ab_variant_shown",
      entityType: "experiment",
      entityId: String(c._abExperimentId),
      source: "ab_testing",
      context: {
        variantId: c._abVariantId,
        variantName: c._abVariantName,
        blockId: block.id,
        blockType: block.block_type,
        entityLabel: sectionLabel,
      },
      allowDuplicates: false,
      dedupeKey: `ab-${c._abExperimentId}-${c._abVariantId}`,
    });
  }, [block.id, block.block_type, c._abExperimentId, c._abVariantId, c._abVariantName, sectionLabel, track]);

  const handleSectionClick = (e: MouseEvent<HTMLElement>) => {
    if (!isEditorPreviewMode()) {
      const target = e.target as HTMLElement;
      const interactive = target.closest("a,button") as HTMLElement | null;
      const label = interactive?.innerText?.trim() || target.textContent?.trim() || sectionLabel;

      track({
        eventName: sectionClickEventName,
        entityType: entityType as any,
        entityId: block.id,
        reusableId: c._reusableId ? String(c._reusableId) : null,
        componentId: isTrackedComponent && c._reusableId ? String(c._reusableId) : null,
        source: interactive ? "cta" : "section",
        context: {
          entityLabel: sectionLabel,
          blockType: block.block_type,
          clickLabel: label || null,
          actionTarget: action.actionTarget || null,
          anchorId: anchorAttr,
        },
      });

      // Track A/B variant click
      if (c._abExperimentId && c._abVariantId) {
        track({
          eventName: "ab_variant_click",
          entityType: "experiment",
          entityId: String(c._abExperimentId),
          source: "ab_testing",
          context: {
            variantId: c._abVariantId,
            variantName: c._abVariantName,
            blockId: block.id,
            blockType: block.block_type,
            clickLabel: label || null,
          },
        });
      }

      if (interactive) {
        const buttonId = `${block.id}:${String(label || "button").toLowerCase().replace(/[^a-z0-9-_]+/gi, "-")}`;
        const ctaLike = /shop|buy|learn|discover|get|start|claim|order|subscribe|submit|contact/i.test(label || "");
        track({
          eventName: ctaLike ? "cta_click" : "button_click",
          entityType: "button",
          entityId: buttonId,
          parentEntityId: block.id,
          reusableId: c._reusableId ? String(c._reusableId) : null,
          componentId: isTrackedComponent && c._reusableId ? String(c._reusableId) : null,
          source: action.actionType || "button",
          context: {
            entityLabel: label || sectionLabel,
            blockType: block.block_type,
            buttonText: label || null,
            actionType: action.actionType || "none",
            actionTarget: action.actionTarget || null,
          },
        });

        trackAttribution({
          sourceType: ctaLike ? "cta" : (isTrackedComponent ? "component" : "section"),
          sourceId: c._reusableId ? String(c._reusableId) : block.id,
          label: label || sectionLabel,
          reusableId: c._reusableId ? String(c._reusableId) : null,
          pagePath: typeof window !== "undefined" ? window.location.pathname : undefined,
          metadata: {
            blockType: block.block_type,
            actionType: action.actionType || "none",
            actionTarget: action.actionTarget || null,
          },
        });
      }
    }

    clickable.onClick(e);
  };

  return (
    <>
      {dynamicCSS && <style>{dynamicCSS}</style>}
      <motion.section
        {...props}
        ref={sectionRef as any}
        id={anchorAttr}
        data-editor-anchor={anchorAttr}
        initial={entranceAnim.initial}
        whileInView={c.animationTrigger === "onLoad" ? undefined : (entranceAnim.animate || entranceAnim.initial)}
        animate={c.animationTrigger === "onLoad" ? entranceAnim.animate : undefined}
        viewport={{ once: c.animateOnce !== false, amount: (c.viewportThreshold as number) ?? 0.12 }}
        transition={entranceAnim.transition}
        whileHover={Object.keys(hoverProps).length > 0 ? hoverProps : undefined}
        whileTap={Object.keys(pressProps).length > 0 ? pressProps : undefined}
        className={`${needsRelative ? "relative overflow-hidden" : ""} ${props.className} ${clickable.className} ${sectionWidthClass(c.sectionWidth)}`.trim()}
        style={{ ...props.style, ...sectionStyleOverrides }}
        onClick={handleSectionClick}
        data-editor-block-id={block.id}
        data-editor-block-type={getLocalizedValue(block.title, "") || block.block_type}
      >
        {/* Background image layer */}
        {hasBgImage && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${c.backgroundImage || c.bg_image})`,
              backgroundSize: bgSize,
              backgroundPosition: `${bgPosX} ${bgPosY}`,
              backgroundRepeat: bgRepeat,
              opacity: bgImageOpacity,
              filter: buildImageFilter(),
              mixBlendMode: (c.bgImageBlendMode && c.bgImageBlendMode !== "normal") ? c.bgImageBlendMode as any : undefined,
            }}
            aria-hidden="true"
          />
        )}

        {/* Image tint overlay */}
        {hasBgImage && c.bgImageTintColor && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundColor: c.bgImageTintColor, opacity: (c.bgImageTintOpacity ?? 0) / 100 }}
            aria-hidden="true"
          />
        )}

        {hasSlideshow && <BlockBackgroundSlideshow slideshow={c._slideshow} />}

        {/* Overlay color */}
        {c.overlayColor && (
          <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: c.overlayColor, opacity: (c.overlayOpacity ?? 50) / 100 }} aria-hidden="true" />
        )}

        {/* Vignette */}
        {c.vignetteEnabled && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${(c.vignetteStrength ?? 30) / 100}) 100%)` }}
            aria-hidden="true"
          />
        )}

        {/* Noise overlay */}
        {c.noiseOverlay && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: (c.noiseOpacity ?? 5) / 100,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundSize: "128px 128px",
            }}
            aria-hidden="true"
          />
        )}

        {/* Glass noise */}
        {c.glassEnabled && c.glassNoise && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: 0.04,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundSize: "128px 128px",
            }}
            aria-hidden="true"
          />
        )}

        {/* Gradient border overlay */}
        {c.gradientBorder && c.gradientEnabled && c.gradientColor1 && c.gradientColor2 && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              border: "1px solid transparent",
              borderImage: `linear-gradient(${c.gradientDirection || "to right"}, ${c.gradientColor1}, ${c.gradientColor2}${c.gradientColor3 ? `, ${c.gradientColor3}` : ""}) 1`,
            }}
            aria-hidden="true"
          />
        )}

        {(needsRelative) ? <div className="relative">{children}</div> : children}
      </motion.section>
    </>
  );
};

// compatibility wrapper: keep calling sites working
const withSection = (block: SiteBlock, defaultClasses: string, children: ReactNode) => (
  <Section block={block} defaultClasses={defaultClasses}>{children}</Section>
);

const renderBlockInner = (block: SiteBlock, disableAnimations = false) => {
  const c = block.content || {};
  if (block.is_active === false || c.visibility === false) return null;

  switch (block.block_type) {
    case "hero":
      return <HeroBlock block={block} />;
    case "shipping_banner": {
      const bannerText = (getLocalizedValue(c.text, "") || "").trim();
      if (!bannerText) return null;
      const BannerIcon = iconForName(c.icon, Truck);
      const bannerIconSize = c.iconSize ? `h-[${c.iconSize}px] w-[${c.iconSize}px]` : "h-4 w-4";
      return withSection(
        block,
        "py-3 border-y border-border/20",
        <div className="container flex items-center justify-center gap-2 text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <BannerIcon className={`${bannerIconSize} text-primary`} style={c.iconColor ? { color: c.iconColor } : undefined} />
          </div>
          <span className="font-display text-sm uppercase tracking-widest text-foreground/90">
            {bannerText}
          </span>
        </div>,
      );
    }
    case "entry_cards":
      return <EntryCardsBlock block={block} disableAnimations={disableAnimations} />;
    case "categories":
      return <CategoriesBlock block={block} />;
    case "featured_products":
      return <FeaturedProductsBlock block={block} disableAnimations={disableAnimations} />;
    case "how_it_works":
      return <HowItWorksBlock block={block} />;
    case "faq":
      return <FaqBlock block={block} />;
    case "trust_badges":
      return <TrustBadgesBlock block={block} />;
    case "text":
      return withSection(
        block,
        "py-16",
        <div className="container">
          {c.heading && (
            <h2 className="mb-4 font-display text-3xl font-bold uppercase text-foreground">
              {getLocalizedValue(c.heading)}
            </h2>
          )}
          <p className="whitespace-pre-wrap text-lg text-muted-foreground">{getLocalizedValue(c.body, "")}</p>
        </div>,
      );
    case "image":
      if (Array.isArray(c.items) && c.items.length > 0) {
        return withSection(block, "py-6 md:py-10", <ImageCollectionBlock content={c} className="px-0 py-0 md:px-0" />);
      }

      return withSection(
        block,
        "py-16",
        <div className="container">
          {c.image_url ? (
            <motion.img
              {...getGroupMotionProps(c, 0)}
              src={c.image_url}
              alt={getLocalizedValue(c.alt, "")}
              className={cn(
                "mx-auto max-h-[600px] w-full",
                c.imageShadow === "sm" && "shadow-md",
                c.imageShadow === "md" && "shadow-xl",
                c.imageShadow === "lg" && "shadow-2xl",
              )}
              style={{
                objectFit: c.imageFit || "contain",
                objectPosition: `${c.imagePositionX || "center"} ${c.imagePositionY || "center"}`,
                opacity: ((c.imageOpacity ?? 100) as number) / 100,
                borderRadius: `${(c.imageBorderRadius ?? 16) as number}px`,
              }}
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/10 text-muted-foreground">
              {tr("blocks.image.noImage", "No image set")}
            </div>
          )}
        </div>,
      );
    case "carousel":
      return <CarouselBlock block={block} />;
    case "video":
      return <VideoBlock block={block} />;
    case "banner": {
      const BnrIcon = c.icon ? iconForName(c.icon, null) : null;
      const bannerHeading = (getLocalizedValue(c.heading || c.title, "") || "").trim();
      const bannerBadge = (getLocalizedValue(c.badge, "") || "").trim();
      const bannerButtons = resolveButtons(c, [
        ...(c.button_text ? [{ text: getLocalizedValue(c.button_text), link: c.button_link || "", icon: "", variant: "outline" }] : []),
      ]);

      // If admin gave us nothing visible, render nothing
      if (!bannerHeading && !bannerBadge && !BnrIcon && bannerButtons.length === 0) return null;

      return withSection(
        block,
        "py-3 border-y border-border/20",
        <div className="container flex items-center justify-center gap-3 text-foreground">
          {BnrIcon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <BnrIcon className="h-4 w-4 text-primary" style={c.iconColor ? { color: c.iconColor } : undefined} />
            </div>
          )}
          {bannerBadge && (
            <span className="rounded-lg bg-primary/15 px-2.5 py-0.5 font-display text-[10px] uppercase tracking-wider text-primary">
              {bannerBadge}
            </span>
          )}
          {bannerHeading && (
            <span className="font-display text-sm uppercase tracking-widest text-foreground/90">
              {bannerHeading}
            </span>
          )}
          {bannerButtons.map((button, index) => (
            <ActionButton
              key={`banner-btn-${index}`}
              button={button}
              className="ml-2 h-7 text-[10px] font-display uppercase"
            />
          ))}
        </div>,
      );
    }
    case "cta":
      return <CtaBlock block={block} />;
    case "button":
      return <SingleButtonBlock block={block} />;
    case "spacer":
      return (
        <div
          data-editor-block-id={block.id}
          data-editor-block-type={getLocalizedValue(block.title, "") || block.block_type}
          style={{ height: `${c.height || 40}px` }}
        />
      );
    case "html":
      return withSection(
        block,
        "py-8",
        <div className="container" dangerouslySetInnerHTML={{ __html: c.html || "" }} />,
      );
    case "embed":
      return withSection(
        block,
        "py-8",
        <div className="container">
          {c.heading && (
            <h2 className="mb-4 text-center font-display text-2xl font-bold uppercase text-foreground">
              {getLocalizedValue(c.heading)}
            </h2>
          )}
          {c.embed_url ? (
            <div className="overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md" style={{ height: `${c.height || 400}px`, boxShadow: "var(--ll-shadow-md)" }}>
              <iframe
                src={c.embed_url}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/10 text-muted-foreground">
              {tr("blocks.embed.noUrl", "No embed URL set")}
            </div>
          )}
        </div>,
      );
    case "newsletter":
      return <NewsletterBlock block={block} />;
    case "instagram_auto_feed":
      return <InstagramAutoFeedBlock block={block} />;
    case "social_proof":
      return <SocialProofBlock block={block} />;
    case "testimonials":
      return <TestimonialsBlock block={block} />;
    case "gallery":
      return <GalleryBlock block={block} />;
    case "recently_viewed":
      return <RecentlyViewedBlock block={block} />;
    case "gift_finder":
      return <GiftFinderBlock block={block} />;
    case "countdown":
      return <CountdownBlock block={block} />;
    case "smart_funnel":
      return <SmartFunnelBlock block={block} />;
    case "divider":
      return <DividerBlock block={block} />;
    default:
      diag("blocks", `unknown block_type "${block.block_type}" — no renderer registered`, { id: block.id, page: block.page });
      return (
        <div
          data-editor-block-id={block.id}
          data-editor-block-type={getLocalizedValue(block.title, "") || block.block_type}
          className="py-8 text-center text-muted-foreground"
        >
          {tr("blocks.unknown", "Unknown block")}: {block.block_type}
        </div>
      );
  }
};

const SmartFunnelBlock = ({ block }: { block: SiteBlock }) => {
  const { data: catalog } = useStorefrontCatalog();
  const content = (block.content || {}) as {
    heading?: string;
    subtitle?: string;
    limit?: number;
    ctaLabel?: string;
    ctaHref?: string;
    excludeProductId?: string;
  };

  return (
    <SmartFunnelSection
      catalog={catalog}
      sectionId={block.id}
      excludeProductId={content.excludeProductId}
      content={content}
      className="py-6 md:py-10"
    />
  );
};

const HeroBlock = ({ block }: { block: SiteBlock }) => {
  useTranslation();
  const c = block.content || {};
  // Only build legacy buttons if admin actually provided text — never inject default fallback labels
  const legacyButtons = [
    ...(getLocalizedValue(c.button_text, "")
      ? [{
          text: getLocalizedValue(c.button_text, ""),
          link: c.button_link || "",
          icon: "ArrowRight",
          variant: "default",
        }]
      : []),
    ...(getLocalizedValue(c.secondary_button_text, "")
      ? [{
          text: getLocalizedValue(c.secondary_button_text, ""),
          link: c.secondary_button_link || "",
          variant: "outline",
        }]
      : []),
  ];
  const buttons = resolveButtons(c, legacyButtons);

  const align = c.alignment || c.contentAlignment || "left";
  const buttonAlignment = c.buttonAlignment || align;

  const eyebrowText = (getLocalizedValue(c.eyebrow || c.badge, "") || "").trim();
  const headingText = (getLocalizedValue(c.heading, "") || "").trim();
  const subheadingText = (getLocalizedValue(c.subheading, "") || "").trim();
  const hasContent = Boolean(eyebrowText || headingText || subheadingText || buttons.length > 0);

  // If admin produced no content at all, render nothing (no ghost wrapper)
  if (!hasContent) return null;

  return withSection(
    block,
    "relative overflow-hidden py-20 lg:py-32",
    <>
      {/* Ambient glow behind hero (decorative only) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-accent/8 blur-[100px]" />
      </div>

      <div className="container relative">
        <div
          className={`max-w-2xl ${align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : ""} ${alignmentClass(align)}`}
        >
          {eyebrowText && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`mb-4 flex items-center gap-2 ${justifyClass(align)}`}
            >
              {(() => {
                const Icon = iconForName(c.icon || "Printer", Printer);
                const iconSizePx = c.iconSize || 20;
                return <Icon style={{ width: iconSizePx, height: iconSizePx, color: c.iconColor || undefined }} className="text-primary" />;
              })()}
              <span className="font-display text-sm uppercase tracking-widest text-primary">
                {eyebrowText}
              </span>
            </motion.div>
          )}

          {headingText && (
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.04 }}
              className="mb-6 font-display text-3xl font-bold uppercase leading-tight text-foreground md:text-5xl lg:text-7xl"
            >
              {headingText}
            </motion.h1>
          )}

          {subheadingText && (
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="mb-8 max-w-lg text-lg text-muted-foreground"
            >
              {subheadingText}
            </motion.p>
          )}

          {buttons.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 }}
              className={`flex flex-wrap gap-4 ${justifyClass(buttonAlignment)}`}
            >
              {buttons.map((button, index) => (
                <ActionButton
                  key={`${button.text}-${index}`}
                  button={button}
                  className={`font-display uppercase tracking-wider ${button.variant === "outline" ? "border-foreground/20 text-foreground hover:border-primary hover:text-primary" : ""}`}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </>,
  );
};

const EntryCardsBlock = ({ block }: { block: SiteBlock; disableAnimations: boolean }) => {
  useTranslation();
  const c = block.content || {};
  const cards = c.cards || [
    {
      icon: "ShoppingBag",
      title: tr("blocks.entryCards.default.shop.title", "Shop Products"),
      desc: tr(
        "blocks.entryCards.default.shop.desc",
        "Browse our curated collection of 3D printed items, filaments, and accessories.",
      ),
      link: "/products",
      cta: tr("blocks.entryCards.default.shop.cta", "Browse Shop"),
    },
    {
      icon: "Palette",
      title: tr("blocks.entryCards.default.customize.title", "Customize"),
      desc: tr(
        "blocks.entryCards.default.customize.desc",
        "Choose your material, color, and finish. Make any product truly yours.",
      ),
      link: "/products",
      cta: tr("blocks.entryCards.default.customize.cta", "Start Customizing"),
    },
    {
      icon: "Upload",
      title: tr("blocks.entryCards.default.upload.title", "Upload Your Idea"),
      desc: tr(
        "blocks.entryCards.default.upload.desc",
        "Got a 3D model? Upload it and we'll print it for you with professional quality.",
      ),
      link: "/create",
      cta: tr("blocks.entryCards.default.upload.cta", "Upload Model"),
    },
  ];

  const columns = Math.max(1, Math.min(4, Number(c.columns) || 3));
  const columnClass =
    columns === 1
      ? "md:grid-cols-1"
      : columns === 2
        ? "md:grid-cols-2"
        : columns === 4
          ? "md:grid-cols-4"
          : "md:grid-cols-3";
  const align = c.alignment || "center";

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className="container">
      {(c.heading || c.subheading) && (
        <div className={`mb-10 ${alignmentClass(align)}`}>
          {c.heading && (
            <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
              {getLocalizedValue(c.heading)}
            </h2>
          )}
          {c.subheading && <p className="mt-2 text-muted-foreground">{getLocalizedValue(c.subheading)}</p>}
        </div>
      )}

      <div className={`grid gap-6 ${columnClass}`}>
        {cards
          .filter((card: any) => card?.visible !== false)
          .map((card: any, index: number) => {
            const Icon = iconForName(card.icon, ShoppingBag);
            const action = resolveItemAction(card, card.link);
            const hasImage = card.image && card.image !== "placeholder";
            const title = getLocalizedValue(card.title, "");
            const desc = getLocalizedValue(card.desc, "");
            const cta = getLocalizedValue(card.cta, "");
            const cardBody = (
              <motion.div
                {...getGroupMotionProps(c, index, columns)}
                className={`group flex h-full flex-col rounded-2xl border border-border/30 bg-card/70 p-8 backdrop-blur-xl transition-all duration-500 hover:border-primary/20 hover:shadow-[0_24px_80px_-12px_hsl(217_91%_60%/0.15)] ${alignmentClass(card.alignment || align)}`}
                style={{ boxShadow: '0 8px 40px -8px hsl(228 33% 2% / 0.5), inset 0 1px 0 0 hsl(215 25% 95% / 0.04)' }}
              >
                <div
                  className={`mb-5 flex h-16 w-16 items-center justify-center rounded-xl ${hasImage ? "overflow-hidden" : "bg-primary/10 transition-colors group-hover:bg-primary/20"} ${card.alignment === "center" || (!card.alignment && align === "center") ? "mx-auto" : ""}`}
                >
                  {hasImage ? (
                    <img src={card.image} alt={title || ""} className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-8 w-8 text-primary" />
                  )}
                </div>
                <h3 className="mb-2 font-display text-lg font-bold uppercase text-card-foreground">{title}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{desc}</p>
                {cta && (
                  <span className="font-display text-sm uppercase tracking-wider text-primary transition-all group-hover:tracking-[0.2em]">
                    {cta} <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                  </span>
                )}
              </motion.div>
            );

            if (isEditorPreviewMode()) return <div key={title || `card-${index}`}>{cardBody}</div>;
            if (action.actionType === "internal_link") {
              const target = action.actionTarget.startsWith("/") ? action.actionTarget : `/${action.actionTarget}`;
              return (
                <Link key={title || `card-${index}`} to={target} target={action.openInNewTab ? "_blank" : "_self"}>
                  {cardBody}
                </Link>
              );
            }
            if (action.actionType === "external_link") {
              return (
                <a
                  key={title || `card-${index}`}
                  href={action.actionTarget}
                  target={action.openInNewTab ? "_blank" : "_self"}
                  rel={action.openInNewTab ? "noopener noreferrer" : undefined}
                >
                  {cardBody}
                </a>
              );
            }
            return <div key={title || `card-${index}`}>{cardBody}</div>;
          })}
      </div>
    </div>,
  );
};

const CategoriesBlock = ({ block, disableAnimations = false }: { block: SiteBlock; disableAnimations?: boolean }) => {
  useTranslation();
  const [categories, setCategories] = useState<any[]>([]);
  const c = block.content || {};

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name, slug, image_url")
      .is("parent_id", null)
      .order("sort_order")
      .limit(c.limit || 6)
      .then(({ data }) => {
        let cats = data ?? [];
        // Manual selection & ordering
        if (c.categorySource === "manual" && Array.isArray(c.selectedCategories) && c.selectedCategories.length > 0) {
          const order = c.selectedCategories as string[];
          cats = order.map(id => cats.find(cat => cat.id === id)).filter(Boolean) as typeof cats;
        }
        setCategories(cats);
      });
  }, [c.limit, c.categorySource, c.selectedCategories]);

  const align = c.alignment || "center";
  const heading = (getLocalizedValue(c.heading, "") || "").trim();
  const subheading = (getLocalizedValue(c.subheading, "") || "").trim();
  const showTitle = c.tileShowTitle !== false && Boolean(heading);
  const showSubtitle = c.tileShowSubtitle !== false && Boolean(subheading);

  const layoutMode = (c.tileLayoutMode as string) || "grid";
  const gridColumns = Math.max(1, Math.min(6, Number(c.tileGridColumns) || 3));
  const spacing = (c.tileSpacing as number) ?? 16;
  const showArrows = c.tileShowArrows !== false;
  const cardMinWidth = (c.tileCardMinWidth as number) ?? 260;

  const colClass =
    gridColumns === 1 ? "grid-cols-1"
    : gridColumns === 2 ? "sm:grid-cols-2"
    : gridColumns === 4 ? "sm:grid-cols-2 lg:grid-cols-4"
    : gridColumns === 5 ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    : gridColumns === 6 ? "sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
    : "sm:grid-cols-2 lg:grid-cols-3";

  const scrollRef = useRef<HTMLDivElement>(null);

  if (categories.length === 0) {
    return withSection(
      block,
      "py-16 lg:py-24",
      <div className="container text-center">
        {showTitle && <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{heading}</h2>}
        {showSubtitle && <p className="mt-2 text-muted-foreground">{subheading}</p>}
        <p className="mt-8 text-sm italic text-muted-foreground">
          {tr("blocks.categories.empty", "No categories available.")}
        </p>
      </div>,
    );
  }

  const scrollCarousel = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  const renderCategoryCard = (cat: { id: string; name: string; slug: string; image_url?: string }, index: number) => {
    const catName = getLocalizedValue(cat.name, cat.name || "");
    const cardContent = (
      <motion.div
        {...getGroupMotionProps(c, index, gridColumns, disableAnimations)}
        className="group relative flex h-40 items-end overflow-hidden rounded-2xl border border-border/30 bg-card/70 p-6 backdrop-blur-xl transition-all duration-500 hover:border-primary/20"
        style={{ boxShadow: '0 8px 40px -8px hsl(228 33% 2% / 0.5), inset 0 1px 0 0 hsl(215 25% 95% / 0.04)' }}
      >
        {cat.image_url && (
          <img
            src={cat.image_url}
            alt={catName}
            className="absolute inset-0 h-full w-full object-cover opacity-30 transition-all duration-500 group-hover:scale-110 group-hover:opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
        <h3 className="relative font-display text-xl font-bold uppercase text-foreground transition-colors group-hover:text-primary">
          {catName}
        </h3>
      </motion.div>
    );

    if (isEditorPreviewMode()) return <div key={cat.id}>{cardContent}</div>;
    return (
      <div key={cat.id}>
        <Link to={`/products?category=${cat.slug}`} className="block">{cardContent}</Link>
      </div>
    );
  };

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className="container">
      {(showTitle || showSubtitle) && (
        <div className={`mb-12 ${alignmentClass(align)}`}>
          {showTitle && <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{heading}</h2>}
          {showSubtitle && <p className="mt-2 text-muted-foreground">{subheading}</p>}
        </div>
      )}

      {layoutMode === "carousel" ? (
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2"
            style={{ gap: `${spacing}px` }}
          >
            {categories.map((cat, i) => (
              <div key={cat.id} className="shrink-0 snap-start" style={{ minWidth: `${cardMinWidth}px`, width: `${cardMinWidth}px` }}>
                {renderCategoryCard(cat, i)}
              </div>
            ))}
          </div>
          {showArrows && (
            <>
              <Button variant="ghost" size="icon" className="absolute -left-2 top-1/2 -translate-y-1/2 bg-background/80 shadow-md hover:bg-background" onClick={() => scrollCarousel(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="absolute -right-2 top-1/2 -translate-y-1/2 bg-background/80 shadow-md hover:bg-background" onClick={() => scrollCarousel(1)}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className={`grid ${colClass}`} style={{ gap: `${spacing}px` }}>
          {categories.map((cat, i) => renderCategoryCard(cat, i))}
        </div>
      )}
    </div>,
  );
};

const FeaturedProductsBlock = ({
  block,
  disableAnimations = false,
}: {
  block: SiteBlock;
  disableAnimations?: boolean;
}) => {
  useTranslation();
  const c = block.content || {};
  const { data: products = [], isLoading } = useFeaturedProducts(c.limit || 8);
  const align = c.alignment || "left";
  const headingAlignClass = alignmentClass(align);
  const viewAllAction = resolveItemAction(c.view_all_button || {}, c.view_all_link || "/products");
  const heading = (getLocalizedValue(c.heading, "") || "").trim();
  const subheading = (getLocalizedValue(c.subheading, "") || "").trim();

  const layoutMode = c.tileLayoutMode || "grid";
  const gridColumns = Math.max(1, Math.min(6, Number(c.tileGridColumns) || 4));
  const spacing = c.tileSpacing ?? 16;
  const showTitle = c.tileShowTitle !== false && Boolean(heading);
  const showSubtitle = c.tileShowSubtitle !== false && Boolean(subheading);
  const showArrows = c.tileShowArrows !== false;
  const cardMinWidth = c.tileCardMinWidth ?? 260;
  const showArrows = c.tileShowArrows !== false;
  const cardMinWidth = c.tileCardMinWidth ?? 260;

  const colClass =
    gridColumns === 1 ? "grid-cols-1"
    : gridColumns === 2 ? "sm:grid-cols-2"
    : gridColumns === 3 ? "sm:grid-cols-2 lg:grid-cols-3"
    : gridColumns === 5 ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    : gridColumns === 6 ? "sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
    : "sm:grid-cols-2 lg:grid-cols-4";

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (layoutMode !== "carousel" || products.length <= 1) return;
    const AUTO_CYCLE_MS = 4500;
    const timer = window.setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 24;
      if (isAtEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: el.clientWidth * 0.7, behavior: "smooth" });
      }
    }, AUTO_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [layoutMode, products.length]);

  if (!isLoading && products.length === 0) {
    return withSection(
      block,
      "py-16 lg:py-24",
      <div className="container text-center">
        <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{heading}</h2>
        <p className="mt-2 text-muted-foreground">{subheading}</p>
        <p className="mt-8 text-sm italic text-muted-foreground">
          {tr("blocks.featuredProducts.empty", "No featured products available.")}
        </p>
      </div>,
    );
  }

  const scrollCarousel = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className="container">
      {(showTitle || showSubtitle) && (
        <div className={`mb-12 flex flex-wrap items-end justify-between gap-4 ${headingAlignClass}`}>
          <div>
            {showTitle && <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{heading}</h2>}
            {showSubtitle && <p className="mt-2 text-muted-foreground">{subheading}</p>}
          </div>

          <ActionButton
            button={{
              text: getLocalizedValue(c.view_all_text, tr("blocks.featuredProducts.viewAll", "View All")),
              icon: "ArrowRight",
              iconPosition: "right",
              variant: "ghost",
              visible: c.show_view_all !== false,
              ...viewAllAction,
            }}
            className="font-display uppercase tracking-wider text-primary hover:text-primary/80"
          />
        </div>
      )}

      {isLoading ? (
        <ProductGridSkeleton count={gridColumns} />
      ) : layoutMode === "carousel" ? (
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2"
            style={{ gap: `${spacing}px` }}
          >
            {products.map(({ product, socialProof }, i) => (
              <motion.div
                key={product.id}
                {...getGroupMotionProps(c, i, 1, disableAnimations)}
                className="shrink-0 snap-start"
                style={{ minWidth: `${cardMinWidth}px`, width: `${cardMinWidth}px` }}
              >
                <ProductCard product={product} socialProof={socialProof} index={i} />
              </motion.div>
            ))}
          </div>
          {showArrows && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute -left-2 top-1/2 -translate-y-1/2 bg-background/80 shadow-md hover:bg-background"
                onClick={() => scrollCarousel(-1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute -right-2 top-1/2 -translate-y-1/2 bg-background/80 shadow-md hover:bg-background"
                onClick={() => scrollCarousel(1)}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className={`grid ${colClass}`} style={{ gap: `${spacing}px` }}>
          {products.map(({ product, socialProof }, i) => (
            <motion.div
              key={product.id}
              {...getGroupMotionProps(c, i, gridColumns, disableAnimations)}
            >
              <ProductCard product={product} socialProof={socialProof} index={i} />
            </motion.div>
          ))}
        </div>
      )}
    </div>,
  );
};

const HowItWorksBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
  useTranslation();
  const c = block.content || {};
  const steps = c.steps || [
    {
      icon: "ShoppingBag",
      title: tr("blocks.howItWorks.step1.title", "Choose"),
      desc: tr("blocks.howItWorks.step1.desc", "Browse products or upload your own 3D model"),
    },
    {
      icon: "Palette",
      title: tr("blocks.howItWorks.step2.title", "Customize"),
      desc: tr("blocks.howItWorks.step2.desc", "Select material, color, size, and finish"),
    },
    {
      icon: "Printer",
      title: tr("blocks.howItWorks.step3.title", "We Print"),
      desc: tr("blocks.howItWorks.step3.desc", "Your item is 3D printed with precision"),
    },
    {
      icon: "Package",
      title: tr("blocks.howItWorks.step4.title", "Delivered"),
      desc: tr("blocks.howItWorks.step4.desc", "Packed safely and shipped to your door"),
    },
  ];

  const columns = Math.max(1, Math.min(4, Number(c.columns) || 4));
  const columnClass =
    columns === 1
      ? "sm:grid-cols-1"
      : columns === 2
        ? "sm:grid-cols-2"
        : columns === 3
          ? "sm:grid-cols-2 lg:grid-cols-3"
          : "sm:grid-cols-2 lg:grid-cols-4";
  const align = c.alignment || "center";

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className="container">
      <div className={`mb-12 ${alignmentClass(align)}`}>
        <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
          {getLocalizedValue(c.heading, tr("blocks.howItWorks.heading", "How It Works"))}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {getLocalizedValue(
            c.subheading,
            tr("blocks.howItWorks.subheading", "From idea to your doorstep in 4 simple steps"),
          )}
        </p>
      </div>

      <div className={`grid gap-8 ${columnClass}`}>
        {steps
          .filter((s: any) => s?.visible !== false)
          .map((s: any, index: number) => {
            const Icon = iconForName(s.icon, Package);
            const hasImage = s.image && s.image !== "placeholder";
            const action = resolveItemAction(s);
            const isClickable = action.actionType !== "none";
            const title = getLocalizedValue(s.title, "");
            const desc = getLocalizedValue(s.desc, "");

            const stepContent = (
              <motion.div
                {...getGroupMotionProps(c, index, columns)}
                className={`${alignmentClass(s.alignment || align)} ${isClickable && !isEditorPreviewMode() ? "cursor-pointer" : ""}`}
              >
                <div
                  className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border/30 bg-card/70 backdrop-blur-xl transition-all hover:border-primary/20 hover:shadow-[0_0_24px_hsl(217_91%_60%/0.15)] ${hasImage ? "overflow-hidden" : ""}`}
                  style={{ boxShadow: '0 4px 24px -4px hsl(228 33% 2% / 0.4)' }}
                >
                  {hasImage ? (
                    <img src={s.image} alt={title || ""} className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-7 w-7 text-primary" />
                  )}
                </div>
                <h3 className="mb-1 font-display text-lg font-bold uppercase text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </motion.div>
            );

            if (isEditorPreviewMode()) return <div key={title || index}>{stepContent}</div>;
            if (action.actionType === "internal_link" && action.actionTarget) {
              const target = action.actionTarget.startsWith("/") ? action.actionTarget : `/${action.actionTarget}`;
              return (
                <Link key={title || index} to={target} target={action.openInNewTab ? "_blank" : "_self"}>
                  {stepContent}
                </Link>
              );
            }
            if (action.actionType === "external_link" && action.actionTarget) {
              return (
                <a
                  key={title || index}
                  href={action.actionTarget}
                  target={action.openInNewTab ? "_blank" : "_self"}
                  rel={action.openInNewTab ? "noopener noreferrer" : undefined}
                >
                  {stepContent}
                </a>
              );
            }

            return <div key={title || index}>{stepContent}</div>;
          })}
      </div>
    </div>,
  );
};

const FaqBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
  useTranslation();
  const c = block.content || {};
  const items = (
    c.items || [
      {
        q: tr("blocks.faq.default1.q", "What materials do you offer?"),
        a: tr(
          "blocks.faq.default1.a",
          "We offer PLA, PLA Silk, PETG, and Resin. Each material has unique properties suited for different applications — from decorative items to functional parts.",
        ),
      },
      {
        q: tr("blocks.faq.default2.q", "How long does printing take?"),
        a: tr(
          "blocks.faq.default2.a",
          "Depending on size and complexity, prints typically take 2-24 hours. Custom orders usually ship within 3-5 business days.",
        ),
      },
    ]
  ).map(normalizeFaqItem);

  const align = c.alignment || "center";

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className="container max-w-3xl">
      <div className={`mb-12 ${alignmentClass(align)}`}>
        <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
          {getLocalizedValue(c.heading, tr("blocks.faq.heading", "Frequently Asked Questions"))}
        </h2>
        {c.subheading && <p className="mt-2 text-muted-foreground">{getLocalizedValue(c.subheading)}</p>}
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {items
          .filter((item: any) => item?.visible !== false)
          .map((item: any, i: number) => (
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-2xl border border-border/30 bg-card/70 px-6 backdrop-blur-xl" style={{ boxShadow: '0 4px 24px -4px hsl(228 33% 2% / 0.4)' }}>
              <AccordionTrigger className="font-display text-sm uppercase tracking-wider text-card-foreground hover:text-primary hover:no-underline">
                {getLocalizedValue(item.q)}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{getLocalizedValue(item.a)}</AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
    </div>,
  );
};

const TrustBadgesBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
  useTranslation();
  const c = block.content || {};
  const badges = c.badges || [
    {
      icon: "Truck",
      title: tr("blocks.trustBadges.default1.title", "Free Shipping"),
      desc: tr("blocks.trustBadges.default1.desc", "On orders over 500 kr"),
    },
    {
      icon: "Shield",
      title: tr("blocks.trustBadges.default2.title", "Secure Checkout"),
      desc: tr("blocks.trustBadges.default2.desc", "Stripe & PayPal protected"),
    },
    {
      icon: "Star",
      title: tr("blocks.trustBadges.default3.title", "Loyalty Rewards"),
      desc: tr("blocks.trustBadges.default3.desc", "Earn points on every purchase"),
    },
  ];

  const columns = Math.max(1, Math.min(4, Number(c.columns) || 3));
  const columnClass =
    columns === 1
      ? "sm:grid-cols-1"
      : columns === 2
        ? "sm:grid-cols-2"
        : columns === 4
          ? "sm:grid-cols-2 lg:grid-cols-4"
          : "sm:grid-cols-3";

  return withSection(
    block,
    "py-16",
    <div className="container">
      {(c.heading || c.subheading) && (
        <div className={`mb-8 ${alignmentClass(c.alignment || "center")}`}>
          {c.heading && (
            <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
              {getLocalizedValue(c.heading)}
            </h2>
          )}
          {c.subheading && <p className="mt-2 text-muted-foreground">{getLocalizedValue(c.subheading)}</p>}
        </div>
      )}

      <div className={`grid gap-8 ${columnClass}`}>
        {badges
          .filter((badge: any) => badge?.visible !== false)
          .map((badge: any, index: number) => {
            const Icon = iconForName(badge.icon, Shield);
            const hasImage = badge.image && badge.image !== "placeholder";
            const action = resolveItemAction(badge);
            const title = getLocalizedValue(badge.title, "");
            const desc = getLocalizedValue(badge.desc, "");

            const badgeContent = (
              <motion.div
                {...getGroupMotionProps(c, index, columns)}
                className={`flex gap-4 rounded-2xl border border-border/30 bg-card/70 p-6 backdrop-blur-xl transition-all duration-500 hover:border-primary/20 hover:shadow-[0_24px_80px_-12px_hsl(217_91%_60%/0.15)] ${verticalClass(c.verticalAlignment)} ${action.actionType !== "none" && !isEditorPreviewMode() ? "cursor-pointer" : ""}`}
                style={{ boxShadow: '0 8px 40px -8px hsl(228 33% 2% / 0.5), inset 0 1px 0 0 hsl(215 25% 95% / 0.04)' }}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${hasImage ? "overflow-hidden" : "bg-primary/10"}`}
                >
                  {hasImage ? (
                    <img src={badge.image} alt={title || ""} className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold uppercase text-card-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </motion.div>
            );

            if (isEditorPreviewMode()) return <div key={title || index}>{badgeContent}</div>;
            if (action.actionType === "internal_link" && action.actionTarget) {
              const target = action.actionTarget.startsWith("/") ? action.actionTarget : `/${action.actionTarget}`;
              return (
                <Link key={title || index} to={target} target={action.openInNewTab ? "_blank" : "_self"}>
                  {badgeContent}
                </Link>
              );
            }
            if (action.actionType === "external_link" && action.actionTarget) {
              return (
                <a
                  key={title || index}
                  href={action.actionTarget}
                  target={action.openInNewTab ? "_blank" : "_self"}
                  rel={action.openInNewTab ? "noopener noreferrer" : undefined}
                >
                  {badgeContent}
                </a>
              );
            }

            return <div key={title || index}>{badgeContent}</div>;
          })}
      </div>
    </div>,
  );
};

const CarouselBlock = ({ block }: { block: SiteBlock }) => {
  useTranslation();
  const [current, setCurrent] = useState(0);
  const slides = Array.isArray(block.content?.slides)
    ? block.content.slides.filter((slide: any) => slide?.visible !== false && slide?.image)
    : [];
  const legacyImages: string[] = Array.isArray(block.content?.images) ? block.content.images : [];
  const hasSlides = slides.length > 0;
  const imageCount = hasSlides ? slides.length : legacyImages.length;

  useEffect(() => {
    if (imageCount <= 1) return;
    const timer = window.setInterval(() => setCurrent((p) => (p + 1) % imageCount), 6500);
    return () => window.clearInterval(timer);
  }, [imageCount]);

  if (imageCount === 0) return null;

  const currentSlide = hasSlides ? slides[current] : null;
  const currentImage = hasSlides ? currentSlide?.image : legacyImages[current];
  const currentAction = currentSlide ? resolveItemAction(currentSlide) : normalizeAction({ actionType: "none" });

  const imageNode = (
    <motion.img
      key={`${current}-${currentImage}`}
      src={currentImage}
      alt={getLocalizedValue(currentSlide?.title, "")}
      className="h-full w-full object-contain"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
    />
  );

  const wrappedImage = (() => {
    if (!hasSlides || currentAction.actionType === "none" || isEditorPreviewMode()) return imageNode;

    // External link — native <a> for best browser/touch behaviour
    if (currentAction.actionType === "external_link") {
      return (
        <a
          href={currentAction.actionTarget}
          target={currentAction.openInNewTab ? "_blank" : "_self"}
          rel={currentAction.openInNewTab ? "noopener noreferrer" : undefined}
          className="block h-full w-full cursor-pointer"
        >
          {imageNode}
        </a>
      );
    }

    // For all internal navigation types (page, anchor, product) resolve the href
    // so the link is natively tappable on mobile without depending on JS click handlers.
    const resolveHref = (): string => {
      const { actionType, actionTarget, anchorId } = currentAction;
      if (actionType === "product" || actionType === "product_anchor") {
        const slug = String(actionTarget || "");
        if (!slug) return "";
        const base = slug.startsWith("/") ? slug : `/products/${slug}`;
        const anchor = (anchorId || "").replace(/^#/, "");
        return anchor ? `${base}#${anchor}` : base;
      }
      if (actionType === "anchor") {
        const anchor = (anchorId || actionTarget || "").replace(/^#/, "");
        return anchor ? `#${anchor}` : "";
      }
      // page_anchor / internal_link
      const target = String(actionTarget || "");
      if (!target) return "";
      const anchor = (anchorId || "").replace(/^#/, "");
      return anchor ? `${target.replace(/\/$/, "")}#${anchor}` : target;
    };

    const href = resolveHref();
    if (!href) return imageNode;

    return (
      <a
        href={href}
        target={currentAction.openInNewTab ? "_blank" : "_self"}
        rel={currentAction.openInNewTab ? "noopener noreferrer" : undefined}
        className="block h-full w-full cursor-pointer"
        onClick={(e) => {
          if (currentAction.actionType === "anchor") {
            e.preventDefault();
            const anchor = (currentAction.anchorId || currentAction.actionTarget || "").replace(/^#/, "");
            if (anchor) {
              const el = document.getElementById(anchor);
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
              } else {
                window.location.hash = `#${anchor}`;
              }
            }
          }
        }}
      >
        {imageNode}
      </a>
    );
  })();

  return withSection(
    block,
    "py-16",
    <div className="container">
      {(block.title || block.content?.heading) && (
        <h2 className="mb-8 text-center font-display text-3xl font-bold uppercase text-foreground">
          {getLocalizedValue(block.content?.heading || block.title, "")}
        </h2>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-border/30" style={{ boxShadow: '0 8px 40px -8px hsl(228 33% 2% / 0.5)' }}>
        <div className="aspect-[21/9] overflow-hidden bg-card/40">
          <AnimatePresence mode="wait">{wrappedImage}</AnimatePresence>
        </div>

        {currentSlide && (currentSlide.title || currentSlide.subtitle) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white hidden md:block">
            {currentSlide.title && (
              <h3 className="font-display text-lg font-bold uppercase">{getLocalizedValue(currentSlide.title)}</h3>
            )}
            {currentSlide.subtitle && (
              <p className="mt-1 text-sm text-white/80">{getLocalizedValue(currentSlide.subtitle)}</p>
            )}
          </div>
        )}

        {imageCount > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
              onClick={() => setCurrent((p) => (p - 1 + imageCount) % imageCount)}
            >
              <ChevronLeft className="h-[45px] w-[45px] text-primary" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
              onClick={() => setCurrent((p) => (p + 1) % imageCount)}
            >
              <ChevronRight className="h-[45px] w-[45px] text-primary" />
            </Button>

            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {Array.from({ length: imageCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 w-2 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "bg-background/60"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
  );
};

const VideoBlock = ({ block }: { block: SiteBlock }) => {
  useTranslation();
  const url = block.content?.video_url;
  if (!url) return null;

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");
  const getYouTubeId = (u: string) => u.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^&?#]+)/)?.[1];
  const getVimeoId = (u: string) => u.match(/vimeo\.com\/(\d+)/)?.[1];

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className="container max-w-4xl">
      {block.title && (
        <h2 className="mb-8 text-center font-display text-3xl font-bold uppercase text-foreground">
          {getLocalizedValue(block.title)}
        </h2>
      )}

      <motion.div {...getGroupMotionProps(block.content || {}, 0)} className="overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md" style={{ boxShadow: '0 8px 40px -8px hsl(225 44% 4% / 0.5)' }}>
        {isYouTube ? (
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${getYouTubeId(url)}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : isVimeo ? (
          <div className="aspect-video">
            <iframe
              src={`https://player.vimeo.com/video/${getVimeoId(url)}`}
              className="h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="aspect-video">
            <video controls className="h-full w-full object-cover">
              <source src={url} type="video/mp4" />
            </video>
          </div>
        )}
      </motion.div>

      {block.content?.caption && (
        <p className="mt-4 text-center text-muted-foreground">{getLocalizedValue(block.content.caption)}</p>
      )}
    </div>,
  );
};

const CtaBlock = ({ block }: { block: SiteBlock }) => {
  useTranslation();
  const c = block.content || {};
  const align = c.alignment || "center";

  const headingText = (getLocalizedValue(c.heading, "") || "").trim();
  const subheadingText = (getLocalizedValue(c.subheading, "") || "").trim();
  const legacyButtonText = (getLocalizedValue(c.button_text, "") || "").trim();

  const buttons = resolveButtons(
    c,
    legacyButtonText
      ? [{
          text: legacyButtonText,
          link: c.button_link || "",
          icon: "ArrowRight",
          variant: c.button_variant || "default",
        }]
      : [],
  );

  if (!headingText && !subheadingText && buttons.length === 0) return null;

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className={`container ${alignmentClass(align)}`}>
      {headingText && (
        <h2 className="mb-4 font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
          {headingText}
        </h2>
      )}
      {subheadingText && <p className="mb-8 text-lg text-muted-foreground">{subheadingText}</p>}
      {buttons.length > 0 && (
        <div className={`flex flex-wrap gap-4 ${justifyClass(c.buttonAlignment || align)}`}>
          {buttons.map((button, index) => (
            <ActionButton
              key={`${button.text}-${index}`}
              button={button}
              className="font-display uppercase tracking-wider"
            />
          ))}
        </div>
      )}
    </div>,
  );
};

const SingleButtonBlock = ({ block }: { block: SiteBlock }) => {
  useTranslation();
  const c = block.content || {};
  const legacyText = (getLocalizedValue(c.button_text, "") || "").trim();
  const buttons = resolveButtons(
    c,
    legacyText
      ? [{
          text: legacyText,
          link: c.button_link || "",
          variant: c.style === "outline" ? "outline" : c.style === "ghost" ? "ghost" : "default",
          icon: c.button_icon || "",
        }]
      : [],
  );

  if (buttons.length === 0) return null;

  return withSection(
    block,
    "py-8",
    <div className={`container flex ${justifyClass(c.buttonAlignment || c.alignment || "center")}`}>
      {buttons.map((button, index) => (
        <ActionButton
          key={`${button.text}-${index}`}
          button={button}
          className="font-display uppercase tracking-wider"
        />
      ))}
    </div>,
  );
};

const NewsletterBlock = ({ block }: { block: SiteBlock }) => {
  useTranslation();
  const { track } = useAnalyticsSafe();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const c = block.content || {};

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isEditorPreviewMode()) return;
    if (!email) return;
    const submittedEmail = email;
    const { error } = await supabase.from("newsletter_subscribers").insert({ email } as any);
    setStatus(error ? "error" : "success");
    if (!error) {
      track({
        eventName: "newsletter_signup",
        entityType: "section",
        entityId: block.id,
        source: "newsletter_block",
        context: {
          entityLabel: getLocalizedValue(block.title, "") || getLocalizedValue(c.heading, "Newsletter"),
          emailDomain: submittedEmail.includes("@") ? submittedEmail.split("@").pop() : null,
          blockType: block.block_type,
        },
      });
      setEmail("");
    }
  };

  const align = c.alignment || "center";
  const headingText = (getLocalizedValue(c.heading, "") || "").trim();
  const subheadingText = (getLocalizedValue(c.subheading, "") || "").trim();

  return withSection(
    block,
    "py-16",
    <div className={`container max-w-xl ${alignmentClass(align)}`}>
      {headingText && (
        <h2 className="mb-2 font-display text-2xl font-bold uppercase text-foreground">
          {headingText}
        </h2>
      )}
      {subheadingText && (
        <p className="mb-6 text-muted-foreground">
          {subheadingText}
        </p>
      )}

      {status === "success" ? (
        <p className="font-display text-primary">{tr("blocks.newsletter.success", "Thanks for subscribing!")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tr("blocks.newsletter.placeholder", "your@email.com")}
            className="flex-1 rounded-xl border-0 bg-card/60 px-4 py-2 text-sm text-foreground shadow-[0_4px_24px_-4px_hsl(225_44%_4%/0.3)] backdrop-blur-md placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-6 py-2 font-display text-sm uppercase tracking-wider text-primary-foreground shadow-[0_4px_24px_hsl(217_91%_60%/0.3)] hover:bg-primary/90 hover:shadow-[0_8px_36px_hsl(217_91%_60%/0.45)]"
          >
            {getLocalizedValue(c.submit_text, tr("blocks.newsletter.submit", "Subscribe"))}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="mt-2 text-sm text-destructive">
          {tr("blocks.newsletter.error", "Already subscribed or error occurred.")}
        </p>
      )}
    </div>,
  );
};

const InstagramAutoFeedBlock = ({ block }: { block: SiteBlock }) => {
  useTranslation();
  const c = block.content || {};
  const [items, setItems] = useState<InstagramMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [displayCfg, setDisplayCfg] = useState<Record<string, any>>({});

  const rawInstagramInput = String(c.instagramUsername || "").trim();
  const username = rawInstagramInput
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "")
    .replace(/^\/+|\/+$/g, "");

  const profileUrl = "https://www.instagram.com/layerloot3d?igsh=cmhjMHc4NjVjMmdk";

  useEffect(() => {
    let mounted = true;
    const loadFeed = async () => {
      try {
        setLoading(true);
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-feed?limit=24`;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
          headers.apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
        }
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`Instagram feed request failed: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        if (data?.settings?.display_config) setDisplayCfg(data.settings.display_config);
        setCurrent(0);
      } catch (error) {
        console.error("Failed to load Instagram feed", error);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadFeed();
    return () => { mounted = false; };
  }, []);

  // Use display config from DB, allow block content overrides
  const itemsToShow = Math.max(1, Math.min(24, Number(c.itemsToShow) || displayCfg.items_to_show || 12));
  const layout = c.layout || displayCfg.layout || "grid";
  const showCaptions = c.showCaptions ?? displayCfg.show_captions ?? false;
  const showProfileButton = c.showProfileButton ?? displayCfg.show_cta ?? true;
  const showReelBadge = displayCfg.show_reel_badge ?? true;
  const showDates = displayCfg.show_dates ?? false;
  const autoplay = c.autoplay !== false;
  const intervalMs = Math.max(1500, Number(c.intervalMs) || 3000);
  const displayUsername = username || displayCfg.username || items[0]?.username || "layerloot3d";

  const visibleItems = items.slice(0, itemsToShow);

  useEffect(() => {
    if (!autoplay || layout !== "slider" || visibleItems.length <= 1) return;
    const timer = window.setInterval(() => setCurrent((prev) => (prev + 1) % visibleItems.length), intervalMs);
    return () => window.clearInterval(timer);
  }, [autoplay, intervalMs, visibleItems.length, layout]);

  if (visibleItems.length === 0 && !loading) {
    return withSection(
      block,
      "py-16 lg:py-24",
      <div className="container">
        <div className="rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
          {tr("blocks.instagram.usernameMissing", "No Instagram content available. Connect your account in admin settings.")}
        </div>
      </div>,
    );
  }

  const activeItem = visibleItems[current >= visibleItems.length ? 0 : current];

  const aspectClass = displayCfg.aspect_ratio === "portrait"
    ? "aspect-[4/5]"
    : displayCfg.aspect_ratio === "landscape"
      ? "aspect-video"
      : "aspect-square";

  const renderMediaCard = (item: InstagramMediaItem, index: number) => {
    const imageSrc = item.media_type === "VIDEO" ? item.thumbnail_url || item.media_url : item.media_url;
    const card = (
      <>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.caption || tr("blocks.instagram.postAlt", "Instagram post")}
            className={`${aspectClass} w-full object-cover`}
            loading="lazy"
          />
        ) : (
          <div className={`flex ${aspectClass} items-center justify-center bg-muted text-sm text-muted-foreground`}>
            {tr("blocks.instagram.noImage", "No image")}
          </div>
        )}
        {/* Reel badge */}
        {showReelBadge && item.is_reel && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-background/80 px-1.5 py-0.5 text-xs font-medium backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            Reel
          </div>
        )}
        {/* Caption & date */}
        {(showCaptions || showDates) && (
          <div className="p-3">
            {showCaptions && item.caption && <p className="line-clamp-2 text-sm text-muted-foreground">{item.caption}</p>}
            {showDates && item.timestamp && <p className="mt-1 text-xs text-muted-foreground/60">{new Date(item.timestamp).toLocaleDateString()}</p>}
          </div>
        )}
      </>
    );

    if (isEditorPreviewMode()) {
      return (
        <motion.div
          key={item.id}
          {...getGroupMotionProps(c, index)}
          className="relative overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md"
          style={{ boxShadow: '0 4px 24px -4px hsl(var(--primary) / 0.15)' }}
        >
          {card}
        </motion.div>
      );
    }

    return (
      <motion.a
        key={item.id}
        href={item.permalink || profileUrl}
        target="_blank"
        rel="noreferrer"
        {...getGroupMotionProps(c, index)}
        className="relative overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md transition-all duration-500 hover:shadow-lg"
        style={{ boxShadow: '0 4px 24px -4px hsl(var(--primary) / 0.15)' }}
      >
        {card}
      </motion.a>
    );
  };

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className="container">
      <div className="rounded-3xl bg-card/60 p-5 backdrop-blur-md md:p-6" style={{ boxShadow: '0 8px 40px -8px hsl(var(--primary) / 0.1)' }}>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {getLocalizedValue(c.title, tr("blocks.instagram.title", "Follow us on Instagram"))}
            </h2>
            <p className="text-sm text-muted-foreground">
              {getLocalizedValue(c.subtitle, tr("blocks.instagram.subtitle", "Latest posts and reels"))}
            </p>
          </div>

          {showProfileButton && (
            <Button asChild={!isEditorPreviewMode()}>
              {isEditorPreviewMode() ? (
                <span>
                  <Instagram className="mr-2 h-4 w-4" />@{displayUsername}
                </span>
              ) : (
                <a href={profileUrl} target="_blank" rel="noreferrer">
                  <Instagram className="mr-2 h-4 w-4" />@{displayUsername}
                </a>
              )}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`${aspectClass} animate-pulse rounded-2xl bg-muted`} />
            ))}
          </div>
        ) : layout === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((item, index) => renderMediaCard(item, index))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border bg-background">
              {activeItem ? (
                (() => {
                  const activeSrc = activeItem.media_type === "VIDEO"
                    ? activeItem.thumbnail_url || activeItem.media_url
                    : activeItem.media_url;
                  const img = activeSrc ? (
                    <img src={activeSrc} alt={activeItem.caption || "Instagram post"} className={`${aspectClass} w-full object-cover`} />
                  ) : (
                    <div className={`flex ${aspectClass} items-center justify-center bg-muted text-sm text-muted-foreground`}>No image</div>
                  );
                  return isEditorPreviewMode() ? img : <a href={activeItem.permalink || profileUrl} target="_blank" rel="noreferrer">{img}</a>;
                })()
              ) : null}
            </div>

            {showCaptions && activeItem?.caption && <p className="text-sm text-muted-foreground">{activeItem.caption}</p>}

            {visibleItems.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {visibleItems.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrent(index)}
                    className={`h-2.5 w-2.5 rounded-full ${index === current ? "bg-primary" : "bg-muted"}`}
                    aria-label={`${tr("blocks.instagram.goToItem", "Go to Instagram item")} ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
  );
};

const SocialProofBlock = ({ block }: { block: SiteBlock }) => {
  const c = block.content || {};
  const items = (c.items || []) as Record<string, string>[];
  const cols = parseInt(c.columns || "3", 10);
  return withSection(block, "py-10", (
    <div className="container mx-auto space-y-6">
      {c.heading && <h2 className="text-2xl font-bold text-center">{getLocalizedValue(c.heading)}</h2>}
      {c.subheading && <p className="text-center text-muted-foreground">{getLocalizedValue(c.subheading)}</p>}
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((item, i) => {
          const Icon = iconForName(item.icon);
          return (
            <div key={i} className="rounded-xl border border-border bg-card p-6 text-center space-y-2">
              {item.icon && <Icon className="mx-auto h-8 w-8 text-primary" />}
              {item.value && <p className="text-3xl font-bold">{item.value}</p>}
              {item.label && <p className="text-sm text-muted-foreground">{item.label}</p>}
            </div>
          );
        })}
      </div>
    </div>
  ));
};

const TestimonialsBlock = ({ block }: { block: SiteBlock }) => {
  const c = block.content || {};
  const items = (c.items || []) as Record<string, string>[];
  const cols = parseInt(c.columns || "2", 10);
  return withSection(block, "py-10", (
    <div className="container mx-auto space-y-6">
      {c.heading && <h2 className="text-2xl font-bold text-center">{getLocalizedValue(c.heading)}</h2>}
      {c.subheading && <p className="text-center text-muted-foreground">{getLocalizedValue(c.subheading)}</p>}
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-3">
            {item.quote && <p className="italic text-foreground">&ldquo;{item.quote}&rdquo;</p>}
            <div className="flex items-center gap-3">
              {item.avatar && <img src={item.avatar} alt={item.name || ""} className="h-10 w-10 rounded-full object-cover" />}
              <div>
                {item.name && <p className="font-semibold text-sm">{item.name}</p>}
                {item.rating && <p className="text-xs text-muted-foreground">{"★".repeat(parseInt(item.rating, 10) || 5)}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ));
};

const GalleryBlock = ({ block }: { block: SiteBlock }) => {
  const c = block.content || {};
  const images = (c.images || []) as Record<string, string>[];
  const cols = parseInt(c.columns || "3", 10);
  return withSection(block, "py-10", (
    <div className="container mx-auto space-y-6">
      {c.heading && <h2 className="text-2xl font-bold text-center">{getLocalizedValue(c.heading)}</h2>}
      {c.subheading && <p className="text-center text-muted-foreground">{getLocalizedValue(c.subheading)}</p>}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {images.map((img, i) => (
          <div key={i} className="overflow-hidden rounded-xl">
            {img.url ? (
              <img src={img.url} alt={img.alt || img.caption || ""} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground text-sm">No image</div>
            )}
            {img.caption && <p className="mt-2 text-center text-sm text-muted-foreground">{img.caption}</p>}
          </div>
        ))}
      </div>
    </div>
  ));
};

const RecentlyViewedBlock = ({ block }: { block: SiteBlock }) => {
  const c = block.content || {};
  return withSection(block, "py-10", (
    <div className="container mx-auto space-y-4">
      {c.heading && <h2 className="text-2xl font-bold text-center">{getLocalizedValue(c.heading)}</h2>}
      {c.subheading && <p className="text-center text-muted-foreground">{getLocalizedValue(c.subheading)}</p>}
      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/10 p-12 text-muted-foreground">
        Recently viewed products appear here at runtime
      </div>
    </div>
  ));
};

const GiftFinderBlock = ({ block }: { block: SiteBlock }) => {
  const c = block.content || {};
  return withSection(block, "py-10", (
    <div className="container mx-auto space-y-4 text-center">
      {c.heading && <h2 className="text-2xl font-bold">{getLocalizedValue(c.heading)}</h2>}
      {c.subheading && <p className="text-muted-foreground">{getLocalizedValue(c.subheading)}</p>}
      {c.button_text && (
        <Button className="mt-2">{getLocalizedValue(c.button_text)}</Button>
      )}
    </div>
  ));
};

const CountdownBlock = ({ block }: { block: SiteBlock }) => {
  const c = block.content || {};
  return withSection(block, "py-10", (
    <div className="container mx-auto space-y-4 text-center">
      {c.heading && <h2 className="text-2xl font-bold">{getLocalizedValue(c.heading)}</h2>}
      {c.subheading && <p className="text-muted-foreground">{getLocalizedValue(c.subheading)}</p>}
      <div className="flex justify-center gap-4">
        {["Days", "Hours", "Min", "Sec"].map((label) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-2xl font-bold">00</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      {c.button_text && (
        <Button className="mt-2">{getLocalizedValue(c.button_text)}</Button>
      )}
    </div>
  ));
};

const DividerBlock = ({ block }: { block: SiteBlock }) => {
  const c = block.content || {};
  const style = c.style || "line";
  return withSection(block, "py-4", (
    <>
      {style === "line" && <hr className="border-border" />}
      {style === "dots" && <p className="text-center text-muted-foreground tracking-[1em]">•••</p>}
      {style === "gradient" && <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />}
      {style === "space" && <div className="h-8" />}
    </>
  ));
};

import { diag, diagError } from "@/lib/storefront-diagnostics";

/**
 * Public renderBlock — wraps the inner renderer with per-block error isolation
 * so a single malformed block can't crash the whole page tree.
 */
export const renderBlock = (block: SiteBlock, disableAnimations = false) => {
  try {
    return renderBlockInner(block, disableAnimations);
  } catch (err) {
    diagError("blocks", `block ${block?.id} (${block?.block_type}) render failed`, err);
    return null;
  }
};

export default renderBlock;
