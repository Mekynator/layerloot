import { useState, useEffect, FormEvent, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Truck,
  Shield,
  Star,
  Printer,
  ChevronLeft,
  ChevronRight,
  Upload,
  Palette,
  ShoppingBag,
  Package,
  Mail,
  ExternalLink,
  Box,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Gem,
  Wrench,
  Home,
  Gift,
  BadgeCheck,
  Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useFeaturedProducts } from "@/hooks/use-storefront";
import { ProductGridSkeleton } from "@/components/shared/loading-states";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";

type ActionType = "none" | "internal_link" | "external_link";

type ImageItem = {
  image: string;
  title?: string;
  subtitle?: string;
  actionType?: ActionType;
  actionTarget?: string;
  openInNewTab?: boolean;
  visible?: boolean;
  colSpan?: number;
  rowSpan?: number;
  order?: number;
  objectFit?: CSSProperties["objectFit"];
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
        alt={getLocalizedValue(item.title, tr("blocks.imageCollection.alt", "Gallery image"))}
        className="h-full w-full rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]"
        style={{ objectFit: item.objectFit || "cover" }}
      />
      {(item.title || item.subtitle) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
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
          boxShadow: '0 8px 40px -8px hsl(228 33% 2% / 0.5), inset 0 1px 0 0 hsl(215 25% 95% / 0.04)',
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
  actionType?: "none" | "internal_link" | "external_link";
  actionTarget?: string;
  openInNewTab?: boolean;
};

export type BlockButton = {
  text?: string;
  icon?: string;
  iconPosition?: "left" | "right" | "top";
  variant?: "default" | "outline" | "ghost" | "secondary" | "link";
  visible?: boolean;
  actionType?: "none" | "internal_link" | "external_link";
  actionTarget?: string;
  openInNewTab?: boolean;
};

const ICON_MAP: Record<string, any> = {
  ShoppingBag,
  ArrowRight,
  Palette,
  Upload,
  Printer,
  Package,
  Truck,
  Shield,
  Star,
  Mail,
  ExternalLink,
  Box,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Gem,
  Wrench,
  Home,
  Gift,
  BadgeCheck,
  Instagram,
};

const iconForName = (name?: string, fallback = Box) => ICON_MAP[name || ""] || fallback;

const isEditorPreviewMode = () => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("editorPreview") === "1";
};

const normalizeAction = (source: any): Required<BlockAction> => {
  const actionType = source?.actionType || source?.type || "none";
  const actionTarget = source?.actionTarget || source?.target || "";
  const openInNewTab = Boolean(source?.openInNewTab);

  if (!["none", "internal_link", "external_link"].includes(actionType)) {
    return { actionType: "none", actionTarget: "", openInNewTab: false };
  }

  return { actionType, actionTarget, openInNewTab };
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
      ...resolveItemAction(button),
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

const sectionStyle = (content: any): CSSProperties => ({
  ...(content?.backgroundColor || content?.bg_color
    ? { backgroundColor: content?.backgroundColor || content?.bg_color }
    : {}),
  ...(content?.textColor || content?.text_color ? { color: content?.textColor || content?.text_color } : {}),
  ...(content?.paddingTop !== undefined ? { paddingTop: `${Number(content.paddingTop) || 0}px` } : {}),
  ...(content?.paddingBottom !== undefined ? { paddingBottom: `${Number(content.paddingBottom) || 0}px` } : {}),
  ...(content?.marginTop !== undefined ? { marginTop: `${Number(content.marginTop) || 0}px` } : {}),
  ...(content?.marginBottom !== undefined ? { marginBottom: `${Number(content.marginBottom) || 0}px` } : {}),
  ...(content?.backgroundImage || content?.bg_image
    ? {
        backgroundImage: `url(${content?.backgroundImage || content?.bg_image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {}),
});

const sectionProps = (block: SiteBlock, defaults: string) => {
  const c = block.content || {};
  return {
    className: `${defaults} ${c?.customClassName || c?.className || ""}`.trim(),
    style: sectionStyle(c),
  };
};

const navigateWithAction = (action: Required<BlockAction>) => {
  if (isEditorPreviewMode()) return;
  if (action.actionType === "none" || !action.actionTarget) return;

  if (action.actionType === "external_link") {
    window.open(
      action.actionTarget,
      action.openInNewTab ? "_blank" : "_self",
      action.openInNewTab ? "noopener,noreferrer" : undefined,
    );
    return;
  }

  const target = action.actionTarget.startsWith("/") ? action.actionTarget : `/${action.actionTarget}`;
  window.open(
    target,
    action.openInNewTab ? "_blank" : "_self",
    action.openInNewTab ? "noopener,noreferrer" : undefined,
  );
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
  const text = button.text || fallbackText;
  if (!text) return null;

  const action = normalizeAction(button);
  const Icon = iconForName(button.icon, ArrowRight);
  const icon = <Icon className="h-4 w-4" />;

  const content = (
    <span className={`inline-flex items-center gap-2 ${button.iconPosition === "top" ? "flex-col" : ""}`}>
      {button.icon && button.iconPosition !== "right" && icon}
      <span>{text}</span>
      {button.icon && button.iconPosition === "right" && icon}
    </span>
  );

  const buttonNode = (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
      <Button variant={(button.variant as any) || "default"} className={className} size="lg">
        {content}
      </Button>
    </motion.div>
  );

  if (isEditorPreviewMode()) return <span className="inline-flex">{buttonNode}</span>;
  if (action.actionType === "none" || !action.actionTarget) return buttonNode;

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

  const internalTarget = action.actionTarget.startsWith("/") ? action.actionTarget : `/${action.actionTarget}`;
  return (
    <Link to={internalTarget} target={action.openInNewTab ? "_blank" : "_self"}>
      {buttonNode}
    </Link>
  );
};

const withSection = (block: SiteBlock, defaultClasses: string, children: ReactNode) => {
  const c = block.content || {};
  const props = sectionProps(block, defaultClasses);
  const action = resolveSectionAction(c);
  const clickable = applySectionAction(action);

  return (
    <motion.section
      {...props}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.36 }}
      className={`${props.className} ${clickable.className}`.trim()}
      onClick={clickable.onClick}
      data-editor-block-id={block.id}
      data-editor-block-type={block.title || block.block_type}
    >
      {children}
    </motion.section>
  );
};

export const renderBlock = (block: SiteBlock, disableAnimations = false) => {
  const c = block.content || {};
  if (block.is_active === false || c.visibility === false) return null;

  switch (block.block_type) {
    case "hero":
      return <HeroBlock block={block} />;
    case "shipping_banner":
      return withSection(
        block,
        "bg-primary py-3",
        <div className="container flex items-center justify-center gap-2 text-primary-foreground">
          <Truck className="h-5 w-5" />
          <span className="font-display text-sm uppercase tracking-widest">
            {getLocalizedValue(c.text, tr("blocks.shippingBanner.text", "Free shipping on orders over 500 kr"))}
          </span>
        </div>,
      );
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
              whileHover={{ scale: 1.01 }}
              src={c.image_url}
              alt={getLocalizedValue(c.alt, "")}
              className="mx-auto max-h-[600px] w-full rounded-lg object-contain"
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
    case "banner":
      return withSection(
        block,
        "bg-accent py-3",
        <div className="container flex items-center justify-center gap-2 text-accent-foreground">
          {c.badge && (
            <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] uppercase tracking-wider">
              {getLocalizedValue(c.badge)}
            </span>
          )}
          <span className="font-display text-sm uppercase tracking-widest">
            {getLocalizedValue(c.heading || c.title, tr("blocks.banner.title", "Banner"))}
          </span>
        </div>,
      );
    case "cta":
      return <CtaBlock block={block} />;
    case "button":
      return <SingleButtonBlock block={block} />;
    case "spacer":
      return (
        <div
          data-editor-block-id={block.id}
          data-editor-block-type={block.title || block.block_type}
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
            <div className="overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md shadow-[0_4px_24px_-4px_hsl(225_44%_4%/0.4)]" style={{ height: `${c.height || 400}px` }}>
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
    default:
      return (
        <div
          data-editor-block-id={block.id}
          data-editor-block-type={block.title || block.block_type}
          className="py-8 text-center text-muted-foreground"
        >
          {tr("blocks.unknown", "Unknown block")}: {block.block_type}
        </div>
      );
  }
};

const HeroBlock = ({ block }: { block: SiteBlock }) => {
  useTranslation();
  const c = block.content || {};
  const buttons = resolveButtons(c, [
    {
      text: getLocalizedValue(c.button_text, tr("blocks.hero.buttonPrimary", "Shop Now")),
      link: c.button_link || "/products",
      icon: "ArrowRight",
      variant: "default",
    },
    {
      text: getLocalizedValue(c.secondary_button_text, tr("blocks.hero.buttonSecondary", "Custom Order")),
      link: c.secondary_button_link || "/create",
      variant: "outline",
    },
  ]);

  const align = c.alignment || c.contentAlignment || "left";
  const buttonAlignment = c.buttonAlignment || align;

  return withSection(
    block,
    "relative overflow-hidden py-20 lg:py-32",
    <>
      {c.bg_image && (
        <motion.div
          initial={{ scale: 1.04, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <img src={c.bg_image} alt="" className="h-full w-full object-contain opacity-30" />
        </motion.div>
      )}

      {/* Ambient glow behind hero */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-accent/8 blur-[100px]" />
      </div>

      <div className="container relative">
        <div
          className={`max-w-2xl ${align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : ""} ${alignmentClass(align)}`}
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`mb-4 flex items-center gap-2 ${justifyClass(align)}`}
          >
            {c.icon ? (
              (() => {
                const Icon = iconForName(c.icon, Printer);
                return <Icon className="h-5 w-5 text-primary" />;
              })()
            ) : (
              <Printer className="h-5 w-5 text-primary" />
            )}
            <span className="font-display text-sm uppercase tracking-widest text-primary">
              {getLocalizedValue(c.eyebrow || c.badge, tr("blocks.hero.eyebrow", "3D Printing Essentials"))}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.04 }}
            className="mb-6 font-display text-5xl font-bold uppercase leading-tight text-foreground lg:text-7xl"
          >
            {getLocalizedValue(c.heading, tr("blocks.hero.heading", "Gear Up Your Print Lab"))}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="mb-8 max-w-lg text-lg text-muted-foreground"
          >
            {getLocalizedValue(
              c.subheading,
              tr(
                "blocks.hero.subheading",
                "Premium filaments, tools, miniatures, and custom prints. Everything a maker needs, delivered to your workshop.",
              ),
            )}
          </motion.p>

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
                whileHover={{ y: -4 }}
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

const CategoriesBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
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
      .then(({ data }) => setCategories(data ?? []));
  }, [c.limit]);

  const align = c.alignment || "center";
  const heading = getLocalizedValue(c.heading, tr("blocks.categories.heading", "Shop by Category"));
  const subheading = getLocalizedValue(c.subheading, tr("blocks.categories.subheading", "Find exactly what you need"));

  if (categories.length === 0) {
    return withSection(
      block,
      "py-16 lg:py-24",
      <div className="container text-center">
        <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{heading}</h2>
        <p className="mt-2 text-muted-foreground">{subheading}</p>
        <p className="mt-8 text-sm italic text-muted-foreground">
          {tr("blocks.categories.empty", "No categories available.")}
        </p>
      </div>,
    );
  }

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className="container">
      <div className={`mb-12 ${alignmentClass(align)}`}>
        <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{heading}</h2>
        <p className="mt-2 text-muted-foreground">{subheading}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, index) => {
          const catName = getLocalizedValue(cat.name, cat.name || "");
          const content = (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ y: -6 }}
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

          if (isEditorPreviewMode()) return <div key={cat.id}>{content}</div>;
          return (
            <div key={cat.id}>
              <Link to={`/products?category=${cat.slug}`} className="block">
                {content}
              </Link>
            </div>
          );
        })}
      </div>
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
  const heading = getLocalizedValue(c.heading, tr("blocks.featuredProducts.heading", "Best Sellers"));
  const subheading = getLocalizedValue(
    c.subheading,
    tr("blocks.featuredProducts.subheading", "Our most popular 3D printed items"),
  );

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

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className="container">
      <div className={`mb-12 flex flex-wrap items-end justify-between gap-4 ${headingAlignClass}`}>
        <div>
          <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{heading}</h2>
          <p className="mt-2 text-muted-foreground">{subheading}</p>
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

      {isLoading ? (
        <ProductGridSkeleton count={4} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map(({ product, socialProof }, i) => (
            <motion.div
              key={product.id}
              variants={fadeUp}
              initial={disableAnimations ? false : "hidden"}
              whileInView={disableAnimations ? undefined : "visible"}
              animate={disableAnimations ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
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
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -3 }}
                className={`${alignmentClass(s.alignment || align)} ${isClickable && !isEditorPreviewMode() ? "cursor-pointer" : ""}`}
              >
                <div
                  className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-card/60 backdrop-blur-md transition-all hover:shadow-[0_0_24px_hsl(217_91%_60%/0.2)] ${hasImage ? "overflow-hidden" : ""}`}
                  style={{ boxShadow: '0 4px 24px -4px hsl(225 44% 4% / 0.4)' }}
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
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-2xl bg-card/60 px-6 backdrop-blur-md" style={{ boxShadow: '0 4px 24px -4px hsl(225 44% 4% / 0.3)' }}>
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
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -3 }}
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
    if (!hasSlides || !currentAction.actionTarget || isEditorPreviewMode()) return imageNode;

    if (currentAction.actionType === "internal_link") {
      const target = currentAction.actionTarget.startsWith("/")
        ? currentAction.actionTarget
        : `/${currentAction.actionTarget}`;
      return (
        <Link to={target} target={currentAction.openInNewTab ? "_blank" : "_self"} className="block h-full w-full">
          {imageNode}
        </Link>
      );
    }

    if (currentAction.actionType === "external_link") {
      return (
        <a
          href={currentAction.actionTarget}
          target={currentAction.openInNewTab ? "_blank" : "_self"}
          rel={currentAction.openInNewTab ? "noopener noreferrer" : undefined}
          className="block h-full w-full"
        >
          {imageNode}
        </a>
      );
    }

    return imageNode;
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

      <div className="relative overflow-hidden rounded-lg">
        <div className="aspect-[21/9] overflow-hidden">
          <AnimatePresence mode="wait">{wrappedImage}</AnimatePresence>
        </div>

        {currentSlide && (currentSlide.title || currentSlide.subtitle) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white">
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

      <motion.div whileHover={{ y: -4 }} className="overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md" style={{ boxShadow: '0 8px 40px -8px hsl(225 44% 4% / 0.5)' }}>
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
  const buttons = resolveButtons(c, [
    {
      text: getLocalizedValue(c.button_text, tr("blocks.cta.button", "Learn more")),
      link: c.button_link || "/products",
      icon: "ArrowRight",
      variant: c.button_variant || "default",
    },
  ]);

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className={`container ${alignmentClass(align)}`}>
      <h2 className="mb-4 font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
        {getLocalizedValue(c.heading, tr("blocks.cta.heading", "Ready to get started?"))}
      </h2>
      {c.subheading && <p className="mb-8 text-lg text-muted-foreground">{getLocalizedValue(c.subheading)}</p>}
      <div className={`flex flex-wrap gap-4 ${justifyClass(c.buttonAlignment || align)}`}>
        {buttons.map((button, index) => (
          <ActionButton
            key={`${button.text}-${index}`}
            button={button}
            className="font-display uppercase tracking-wider"
          />
        ))}
      </div>
    </div>,
  );
};

const SingleButtonBlock = ({ block }: { block: SiteBlock }) => {
  useTranslation();
  const c = block.content || {};
  const buttons = resolveButtons(c, [
    {
      text: getLocalizedValue(c.button_text, tr("blocks.button.default", "Click Me")),
      link: c.button_link || "#",
      variant: c.style === "outline" ? "outline" : c.style === "ghost" ? "ghost" : "default",
      icon: c.button_icon || "",
    },
  ]);

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
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const c = block.content || {};

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isEditorPreviewMode()) return;
    if (!email) return;
    const { error } = await supabase.from("newsletter_subscribers").insert({ email } as any);
    setStatus(error ? "error" : "success");
    if (!error) setEmail("");
  };

  const align = c.alignment || "center";

  return withSection(
    block,
    "py-16",
    <div className={`container max-w-xl ${alignmentClass(align)}`}>
      <h2 className="mb-2 font-display text-2xl font-bold uppercase text-foreground">
        {getLocalizedValue(c.heading, tr("blocks.newsletter.heading", "Stay Updated"))}
      </h2>
      <p className="mb-6 text-muted-foreground">
        {getLocalizedValue(
          c.subheading,
          tr("blocks.newsletter.subheading", "Subscribe to our newsletter for the latest updates."),
        )}
      </p>

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

  const rawInstagramInput = String(c.instagramUsername || "").trim();
  const username = rawInstagramInput
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "")
    .replace(/^\/+|\/+$/g, "");
  const itemsToShow = Math.max(1, Math.min(20, Number(c.itemsToShow) || 10));
  const layout = c.layout === "grid" ? "grid" : "slider";
  const autoplay = c.autoplay !== false;
  const showCaptions = Boolean(c.showCaptions);
  const showProfileButton = c.showProfileButton !== false;
  const intervalMs = Math.max(1500, Number(c.intervalMs) || 3000);
  const functionName = String(c.functionName || "instagram-feed").trim() || "instagram-feed";
  const profileUrl = "https://www.instagram.com/layerloot3d?igsh=cmhjMHc4NjVjMmdk";

  useEffect(() => {
    let mounted = true;

    const loadFeed = async () => {
      if (!username) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}?username=${encodeURIComponent(username)}&limit=${itemsToShow}`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
          headers.apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
        }

        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`Instagram feed request failed: ${res.status}`);

        const data = await res.json();
        if (!mounted) return;

        const nextItems = Array.isArray(data?.items) ? data.items : [];
        setItems(nextItems.slice(0, itemsToShow));
        setCurrent(0);
      } catch (error) {
        console.error("Failed to load Instagram feed", error);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadFeed();

    return () => {
      mounted = false;
    };
  }, [username, itemsToShow, functionName]);

  useEffect(() => {
    if (!autoplay || layout !== "slider" || items.length <= 1) return;
    const timer = window.setInterval(() => setCurrent((prev) => (prev + 1) % items.length), intervalMs);
    return () => window.clearInterval(timer);
  }, [autoplay, intervalMs, items.length, layout]);

  if (!username) {
    return withSection(
      block,
      "py-16 lg:py-24",
      <div className="container">
        <div className="rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
          {tr("blocks.instagram.usernameMissing", "Add an Instagram username to show the auto feed.")}
        </div>
      </div>,
    );
  }

  const activeItem = items[current];

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className="container">
      <div className="rounded-3xl bg-card/60 p-5 backdrop-blur-md md:p-6" style={{ boxShadow: '0 8px 40px -8px hsl(225 44% 4% / 0.5)' }}>
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
                  <Instagram className="mr-2 h-4 w-4" />@{username}
                </span>
              ) : (
                <a href={profileUrl} target="_blank" rel="noreferrer">
                  <Instagram className="mr-2 h-4 w-4" />@{username}
                </a>
              )}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">
            {tr("blocks.instagram.loading", "Loading Instagram feed...")}
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {tr("blocks.instagram.empty", "No Instagram posts found.")}
          </div>
        ) : layout === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item, index) => {
              const imageSrc = item.media_type === "VIDEO" ? item.thumbnail_url || item.media_url : item.media_url;
              const card = (
                <>
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={item.caption || tr("blocks.instagram.postAlt", "Instagram post")}
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-muted text-sm text-muted-foreground">
                      {tr("blocks.instagram.noImage", "No image")}
                    </div>
                  )}
                  {showCaptions && item.caption && (
                    <div className="line-clamp-3 p-3 text-sm text-muted-foreground">{item.caption}</div>
                  )}
                </>
              );

              if (isEditorPreviewMode()) {
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.04 }}
                    className="overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md" style={{ boxShadow: '0 4px 24px -4px hsl(225 44% 4% / 0.4)' }}
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
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04 }}
                  whileHover={{ y: -3 }}
                  className="overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md transition-all duration-500 hover:shadow-[0_24px_80px_-12px_hsl(217_91%_60%/0.18)]"
                  style={{ boxShadow: '0 4px 24px -4px hsl(225 44% 4% / 0.4)' }}
                >
                  {card}
                </motion.a>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border bg-background">
              {activeItem ? (
                isEditorPreviewMode() ? (
                  (() => {
                    const activeSrc =
                      activeItem.media_type === "VIDEO"
                        ? activeItem.thumbnail_url || activeItem.media_url
                        : activeItem.media_url;
                    return activeSrc ? (
                      <img
                        src={activeSrc}
                        alt={activeItem.caption || tr("blocks.instagram.postAlt", "Instagram post")}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-muted text-sm text-muted-foreground">
                        {tr("blocks.instagram.noImage", "No image")}
                      </div>
                    );
                  })()
                ) : (
                  <a href={activeItem.permalink || profileUrl} target="_blank" rel="noreferrer">
                    {(() => {
                      const activeSrc =
                        activeItem.media_type === "VIDEO"
                          ? activeItem.thumbnail_url || activeItem.media_url
                          : activeItem.media_url;
                      return activeSrc ? (
                        <img
                          src={activeSrc}
                          alt={activeItem.caption || tr("blocks.instagram.postAlt", "Instagram post")}
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-square items-center justify-center bg-muted text-sm text-muted-foreground">
                          {tr("blocks.instagram.noImage", "No image")}
                        </div>
                      );
                    })()}
                  </a>
                )
              ) : null}
            </div>

            {showCaptions && activeItem?.caption && (
              <p className="text-sm text-muted-foreground">{activeItem.caption}</p>
            )}

            {items.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {items.map((item, index) => (
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

export default renderBlock;
