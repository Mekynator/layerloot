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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useFeaturedProducts } from "@/hooks/use-storefront";
import { ProductGridSkeleton } from "@/components/shared/loading-states";
import { fadeUp } from "@/lib/motion";

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

export type BlockStyleSettings = {
  bg_image?: string;
  backgroundImage?: string;
  bg_color?: string;
  backgroundColor?: string;
  text_color?: string;
  textColor?: string;
  className?: string;
  customClassName?: string;
  paddingTop?: number;
  paddingBottom?: number;
  marginTop?: number;
  marginBottom?: number;
};

export type BlockLayoutSettings = {
  alignment?: "left" | "center" | "right";
  contentAlignment?: "left" | "center" | "right";
  buttonAlignment?: "left" | "center" | "right";
  verticalAlignment?: "top" | "center" | "bottom";
  columns?: number;
  imagePosition?: "left" | "right";
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
};

const iconForName = (name?: string, fallback = Box) => ICON_MAP[name || ""] || fallback;

const normalizeAction = (source: any): Required<BlockAction> => {
  const actionType = source?.actionType || source?.type || "none";
  const actionTarget = source?.actionTarget || source?.target || "";
  const openInNewTab = Boolean(source?.openInNewTab);

  if (!["none", "internal_link", "external_link"].includes(actionType)) {
    return { actionType: "none", actionTarget: "", openInNewTab: false };
  }

  return {
    actionType,
    actionTarget,
    openInNewTab,
  };
};

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

const resolveButtons = (content: any, legacy: Array<{ text?: string; link?: string; icon?: string; variant?: string }>) => {
  if (Array.isArray(content?.buttons) && content.buttons.length > 0) {
    return content.buttons.map((button: any) => ({
      text: button?.text || "",
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
  ...(content?.backgroundColor || content?.bg_color ? { backgroundColor: content?.backgroundColor || content?.bg_color } : {}),
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
  if (action.actionType === "none" || !action.actionTarget) return;

  if (action.actionType === "external_link") {
    window.open(action.actionTarget, action.openInNewTab ? "_blank" : "_self", action.openInNewTab ? "noopener,noreferrer" : undefined);
    return;
  }

  const target = action.actionTarget.startsWith("/") ? action.actionTarget : `/${action.actionTarget}`;
  window.open(target, action.openInNewTab ? "_blank" : "_self", action.openInNewTab ? "noopener,noreferrer" : undefined);
};

const applySectionAction = (action: Required<BlockAction>) => ({
  onClick: (e: MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("a,button,input,textarea,select,label")) return;
    navigateWithAction(action);
  },
  className: action.actionType !== "none" ? "cursor-pointer" : "",
});

const ActionButton = ({ button, fallbackText, className }: { button: BlockButton; fallbackText?: string; className?: string }) => {
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
    <Button variant={(button.variant as any) || "default"} className={className} size="lg">
      {content}
    </Button>
  );

  if (action.actionType === "none" || !action.actionTarget) return buttonNode;

  if (action.actionType === "external_link") {
    return (
      <a href={action.actionTarget} target={action.openInNewTab ? "_blank" : "_self"} rel={action.openInNewTab ? "noopener noreferrer" : undefined}>
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
      return (
        <HeroBlock block={block} />
      );

    case "shipping_banner":
      return (
        withSection(block, "bg-primary py-3", <div className="container flex items-center justify-center gap-2 text-primary-foreground"><Truck className="h-5 w-5" /><span className="font-display text-sm uppercase tracking-widest">{c.text || "Free shipping on orders over 500 kr"}</span></div>)
      );

    case "entry_cards":
      return <EntryCardsBlock block={block} disableAnimations={disableAnimations} />;

    case "categories":
      return <CategoriesBlock block={block} />;

    case "featured_products":
      return <FeaturedProductsBlock block={block} />;

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
          {c.heading && <h2 className="mb-4 font-display text-3xl font-bold uppercase text-foreground">{c.heading}</h2>}
          <p className="whitespace-pre-wrap text-lg text-muted-foreground">{c.body || ""}</p>
        </div>,
      );

    case "image":
      return withSection(
        block,
        "py-16",
        <div className="container">
          {c.image_url ? (
            <img src={c.image_url} alt={c.alt || ""} className="mx-auto max-h-[600px] w-full rounded-lg object-contain" />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted text-muted-foreground">No image set</div>
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
          {c.badge && <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] uppercase tracking-wider">{c.badge}</span>}
          <span className="font-display text-sm uppercase tracking-widest">{c.heading || c.title || "Banner"}</span>
        </div>,
      );

    case "cta":
      return <CtaBlock block={block} />;

    case "button":
      return <SingleButtonBlock block={block} />;

    case "spacer":
      return <div style={{ height: `${c.height || 40}px` }} />;

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
          {c.heading && <h2 className="mb-4 text-center font-display text-2xl font-bold uppercase text-foreground">{c.heading}</h2>}
          {c.embed_url ? (
            <div className="overflow-hidden rounded-lg border border-border" style={{ height: `${c.height || 400}px` }}>
              <iframe src={c.embed_url} className="h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted text-muted-foreground">No embed URL set</div>
          )}
        </div>,
      );

    case "newsletter":
      return <NewsletterBlock block={block} />;

    default:
      return <div className="py-8 text-center text-muted-foreground">Unknown block: {block.block_type}</div>;
  }
};

const HeroBlock = ({ block }: { block: SiteBlock }) => {
  const c = block.content || {};
  const buttons = resolveButtons(c, [
    { text: c.button_text || "Shop Now", link: c.button_link || "/products", icon: "ArrowRight", variant: "default" },
    { text: c.secondary_button_text || "Custom Order", link: c.secondary_button_link || "/create", variant: "outline" },
  ]);

  const align = c.alignment || c.contentAlignment || "left";
  const buttonAlignment = c.buttonAlignment || align;

  return withSection(
    block,
    "relative overflow-hidden bg-secondary py-20 lg:py-32",
    <>
      {c.bg_image && (
        <div className="absolute inset-0">
          <img src={c.bg_image} alt="" className="h-full w-full object-contain opacity-30" />
        </div>
      )}

      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 35px, currentColor 35px, currentColor 36px)",
          }}
        />
      </div>

      <div className="container relative">
        <div className={`max-w-2xl ${align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : ""} ${alignmentClass(align)}`}>
          <div className={`mb-4 flex items-center gap-2 ${justifyClass(align)}`}>
            {c.icon && (() => {
              const Icon = iconForName(c.icon, Printer);
              return <Icon className="h-5 w-5 text-primary" />;
            })()}
            {!c.icon && <Printer className="h-5 w-5 text-primary" />}
            <span className="font-display text-sm uppercase tracking-widest text-primary">{c.eyebrow || c.badge || "3D Printing Essentials"}</span>
          </div>

          <h1 className="mb-6 font-display text-5xl font-bold uppercase leading-tight text-secondary-foreground lg:text-7xl">{c.heading || "Gear Up Your Print Lab"}</h1>
          <p className="mb-8 max-w-lg text-lg text-muted-foreground">{c.subheading || "Premium filaments, tools, miniatures, and custom prints. Everything a maker needs, delivered to your workshop."}</p>

          <div className={`flex flex-wrap gap-4 ${justifyClass(buttonAlignment)}`}>
            {buttons.map((button, index) => (
              <ActionButton
                key={`${button.text}-${index}`}
                button={button}
                className={`font-display uppercase tracking-wider ${button.variant === "outline" ? "border-muted-foreground/30 text-secondary hover:border-primary hover:text-primary" : ""}`}
              />
            ))}
          </div>
        </div>
      </div>
    </>,
  );
};

const EntryCardsBlock = ({ block }: { block: SiteBlock; disableAnimations: boolean }) => {
  const c = block.content || {};
  const cards = c.cards || [
    { icon: "ShoppingBag", title: "Shop Products", desc: "Browse our curated collection of 3D printed items, filaments, and accessories.", link: "/products", cta: "Browse Shop" },
    { icon: "Palette", title: "Customize", desc: "Choose your material, color, and finish. Make any product truly yours.", link: "/products", cta: "Start Customizing" },
    { icon: "Upload", title: "Upload Your Idea", desc: "Got a 3D model? Upload it and we'll print it for you with professional quality.", link: "/create", cta: "Upload Model" },
  ];

  const columns = Math.max(1, Math.min(4, Number(c.columns) || 3));
  const columnClass = columns === 1 ? "md:grid-cols-1" : columns === 2 ? "md:grid-cols-2" : columns === 4 ? "md:grid-cols-4" : "md:grid-cols-3";
  const align = c.alignment || "center";

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className="container">
      {(c.heading || c.subheading) && (
        <div className={`mb-10 ${alignmentClass(align)}`}>
          {c.heading && <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{c.heading}</h2>}
          {c.subheading && <p className="mt-2 text-muted-foreground">{c.subheading}</p>}
        </div>
      )}

      <div className={`grid gap-6 ${columnClass}`}>
        {cards
          .filter((card: any) => card?.visible !== false)
          .map((card: any, index: number) => {
            const Icon = iconForName(card.icon, ShoppingBag);
            const action = resolveItemAction(card, card.link);
            const hasImage = card.image && card.image !== "placeholder";
            const cardBody = (
              <div className={`group flex h-full flex-col rounded-lg border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-xl ${alignmentClass(card.alignment || align)}`}>
                <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-xl ${hasImage ? "overflow-hidden" : "bg-primary/10 transition-colors group-hover:bg-primary/20"} ${card.alignment === "center" || (!card.alignment && align === "center") ? "mx-auto" : ""}`}>
                  {hasImage ? (
                    <img src={card.image} alt={card.title || ""} className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-8 w-8 text-primary" />
                  )}
                </div>
                <h3 className="mb-2 font-display text-lg font-bold uppercase text-card-foreground">{card.title}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{card.desc}</p>
                {card.cta && (
                  <span className="font-display text-sm uppercase tracking-wider text-primary transition-all group-hover:tracking-[0.2em]">
                    {card.cta} <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            );

            if (action.actionType === "internal_link") {
              const target = action.actionTarget.startsWith("/") ? action.actionTarget : `/${action.actionTarget}`;
              return (
                <Link key={card.title || `card-${index}`} to={target} target={action.openInNewTab ? "_blank" : "_self"}>
                  {cardBody}
                </Link>
              );
            }

            if (action.actionType === "external_link") {
              return (
                <a key={card.title || `card-${index}`} href={action.actionTarget} target={action.openInNewTab ? "_blank" : "_self"} rel={action.openInNewTab ? "noopener noreferrer" : undefined}>
                  {cardBody}
                </a>
              );
            }

            return <div key={card.title || `card-${index}`}>{cardBody}</div>;
          })}
      </div>
    </div>,
  );
};

const CategoriesBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
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

  if (categories.length === 0) {
    return withSection(
      block,
      "bg-secondary py-16 lg:py-24",
      <div className="container text-center">
        <h2 className="font-display text-3xl font-bold uppercase text-secondary-foreground lg:text-4xl">{c.heading || "Shop by Category"}</h2>
        <p className="mt-2 text-muted-foreground">{c.subheading || "Find exactly what you need"}</p>
        <p className="mt-8 text-sm italic text-muted-foreground">No categories available.</p>
      </div>,
    );
  }

  return withSection(
    block,
    "bg-secondary py-16 lg:py-24",
    <div className="container">
      <div className={`mb-12 ${alignmentClass(align)}`}>
        <h2 className="font-display text-3xl font-bold uppercase text-secondary-foreground lg:text-4xl">{c.heading || "Shop by Category"}</h2>
        <p className="mt-2 text-muted-foreground">{c.subheading || "Find exactly what you need"}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div key={cat.id}>
            <Link to={`/products?category=${cat.slug}`} className="group relative flex h-40 items-end overflow-hidden rounded-lg border border-border p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary">
              {cat.image_url && (
                <img src={cat.image_url} alt={cat.name} className="absolute inset-0 h-full w-full object-cover opacity-30 transition-all duration-500 group-hover:scale-110 group-hover:opacity-40" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/60 to-transparent" />

              <h3 className="relative font-display text-xl font-bold uppercase text-secondary-foreground transition-colors group-hover:text-primary">{cat.name}</h3>
            </Link>
          </div>
        ))}
      </div>
    </div>,
  );
};

const FeaturedProductsBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
  const c = block.content || {};
  const { data: products = [], isLoading } = useFeaturedProducts(c.limit || 8);
  const align = c.alignment || "left";
  const headingAlignClass = alignmentClass(align);
  const viewAllAction = resolveItemAction(c.view_all_button || {}, c.view_all_link || "/products");

  if (!isLoading && products.length === 0) {
    return withSection(
      block,
      "py-16 lg:py-24",
      <div className="container text-center">
        <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{c.heading || "Best Sellers"}</h2>
        <p className="mt-2 text-muted-foreground">{c.subheading || "Our most popular 3D printed items"}</p>
        <p className="mt-8 text-sm italic text-muted-foreground">No featured products available.</p>
      </div>,
    );
  }

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className="container">
      <div className={`mb-12 flex flex-wrap items-end justify-between gap-4 ${headingAlignClass}`}>
        <div>
          <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{c.heading || "Best Sellers"}</h2>
          <p className="mt-2 text-muted-foreground">{c.subheading || "Our most popular 3D printed items"}</p>
        </div>

        <ActionButton
          button={{
            text: c.view_all_text || "View All",
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
            <motion.div key={product.id} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <ProductCard product={product} socialProof={socialProof} index={i} />
            </motion.div>
          ))}
        </div>
      )}
    </div>,
  );
};

const HowItWorksBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
  const c = block.content || {};
  const steps = c.steps || [
    { icon: "ShoppingBag", title: "Choose", desc: "Browse products or upload your own 3D model" },
    { icon: "Palette", title: "Customize", desc: "Select material, color, size, and finish" },
    { icon: "Printer", title: "We Print", desc: "Your item is 3D printed with precision" },
    { icon: "Package", title: "Delivered", desc: "Packed safely and shipped to your door" },
  ];

  const columns = Math.max(1, Math.min(4, Number(c.columns) || 4));
  const columnClass = columns === 1 ? "sm:grid-cols-1" : columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";
  const align = c.alignment || "center";

  return withSection(
    block,
    "bg-muted/50 py-16 lg:py-24",
    <div className="container">
      <div className={`mb-12 ${alignmentClass(align)}`}>
        <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{c.heading || "How It Works"}</h2>
        <p className="mt-2 text-muted-foreground">{c.subheading || "From idea to your doorstep in 4 simple steps"}</p>
      </div>

      <div className={`grid gap-8 ${columnClass}`}>
        {steps
          .filter((s: any) => s?.visible !== false)
          .map((s: any, index: number) => {
            const Icon = iconForName(s.icon, Package);
            const hasImage = s.image && s.image !== "placeholder";
            const action = resolveItemAction(s);
            const isClickable = action.actionType !== "none";

            const stepContent = (
              <div key={s.title || index} className={`${alignmentClass(s.alignment || align)} ${isClickable ? "cursor-pointer" : ""}`}>
                <div className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/20 bg-card transition-all hover:border-primary hover:shadow-lg ${hasImage ? "overflow-hidden" : ""}`}>
                  {hasImage ? (
                    <img src={s.image} alt={s.title || ""} className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-7 w-7 text-primary" />
                  )}
                </div>
                <h3 className="mb-1 font-display text-lg font-bold uppercase text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            );

            if (action.actionType === "internal_link" && action.actionTarget) {
              const target = action.actionTarget.startsWith("/") ? action.actionTarget : `/${action.actionTarget}`;
              return <Link key={s.title || index} to={target} target={action.openInNewTab ? "_blank" : "_self"}>{stepContent}</Link>;
            }
            if (action.actionType === "external_link" && action.actionTarget) {
              return <a key={s.title || index} href={action.actionTarget} target={action.openInNewTab ? "_blank" : "_self"} rel={action.openInNewTab ? "noopener noreferrer" : undefined}>{stepContent}</a>;
            }

            return <div key={s.title || index}>{stepContent}</div>;
          })}
      </div>
    </div>,
  );
};

const FaqBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
  const c = block.content || {};
  const items = c.items || [
    {
      q: "What materials do you offer?",
      a: "We offer PLA, PLA Silk, PETG, and Resin. Each material has unique properties suited for different applications — from decorative items to functional parts.",
    },
    {
      q: "How long does printing take?",
      a: "Depending on size and complexity, prints typically take 2-24 hours. Custom orders usually ship within 3-5 business days.",
    },
  ];

  const align = c.alignment || "center";

  return withSection(
    block,
    "py-16 lg:py-24",
    <div className="container max-w-3xl">
      <div className={`mb-12 ${alignmentClass(align)}`}>
        <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{c.heading || "Frequently Asked Questions"}</h2>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {items
          .filter((item: any) => item?.visible !== false)
          .map((item: any, i: number) => (
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-lg border border-border bg-card px-6">
              <AccordionTrigger className="font-display text-sm uppercase tracking-wider text-card-foreground hover:text-primary hover:no-underline">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
    </div>,
  );
};

const TrustBadgesBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
  const c = block.content || {};
  const badges = c.badges || [
    { icon: "Truck", title: "Free Shipping", desc: "On orders over 500 kr" },
    { icon: "Shield", title: "Secure Checkout", desc: "Stripe & PayPal protected" },
    { icon: "Star", title: "Loyalty Rewards", desc: "Earn points on every purchase" },
  ];

  const columns = Math.max(1, Math.min(4, Number(c.columns) || 3));
  const columnClass = columns === 1 ? "sm:grid-cols-1" : columns === 2 ? "sm:grid-cols-2" : columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3";

  return withSection(
    block,
    "py-16",
    <div className="container">
      {(c.heading || c.subheading) && (
        <div className={`mb-8 ${alignmentClass(c.alignment || "center")}`}>
          {c.heading && <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{c.heading}</h2>}
          {c.subheading && <p className="mt-2 text-muted-foreground">{c.subheading}</p>}
        </div>
      )}

      <div className={`grid gap-8 ${columnClass}`}>
        {badges
          .filter((badge: any) => badge?.visible !== false)
          .map((badge: any, index: number) => {
            const Icon = iconForName(badge.icon, Shield);
            const hasImage = badge.image && badge.image !== "placeholder";
            const action = resolveItemAction(badge);

            const badgeContent = (
              <div className={`flex gap-4 rounded-md border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-md ${verticalClass(c.verticalAlignment)} ${action.actionType !== "none" ? "cursor-pointer" : ""}`}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${hasImage ? "overflow-hidden" : "bg-primary/10"}`}>
                  {hasImage ? (
                    <img src={badge.image} alt={badge.title || ""} className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold uppercase text-card-foreground">{badge.title}</h3>
                  <p className="text-sm text-muted-foreground">{badge.desc}</p>
                </div>
              </div>
            );

            if (action.actionType === "internal_link" && action.actionTarget) {
              const target = action.actionTarget.startsWith("/") ? action.actionTarget : `/${action.actionTarget}`;
              return <Link key={badge.title || index} to={target} target={action.openInNewTab ? "_blank" : "_self"}>{badgeContent}</Link>;
            }
            if (action.actionType === "external_link" && action.actionTarget) {
              return <a key={badge.title || index} href={action.actionTarget} target={action.openInNewTab ? "_blank" : "_self"} rel={action.openInNewTab ? "noopener noreferrer" : undefined}>{badgeContent}</a>;
            }

            return <div key={badge.title || index}>{badgeContent}</div>;
          })}
      </div>
    </div>,
  );
};

const CarouselBlock = ({ block }: { block: SiteBlock }) => {
  const [current, setCurrent] = useState(0);
  const images: string[] = block.content?.images || [];
  if (images.length === 0) return null;

  return withSection(
    block,
    "py-16",
    <div className="container">
      {block.title && <h2 className="mb-8 text-center font-display text-3xl font-bold uppercase text-foreground">{block.title}</h2>}

      <div className="relative overflow-hidden rounded-lg">
        <div className="aspect-[21/9] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={current}
              src={images[current]}
              alt=""
              className="h-full w-full object-contain"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
            />
          </AnimatePresence>
        </div>

        {images.length > 1 && (
          <>
            <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background" onClick={() => setCurrent((p) => (p - 1 + images.length) % images.length)}>
              <ChevronLeft className="h-[45px] w-[45px] text-primary" />
            </Button>

            <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background" onClick={() => setCurrent((p) => (p + 1) % images.length)}>
              <ChevronRight className="h-[45px] w-[45px] text-primary" />
            </Button>

            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {images.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} className={`h-2 w-2 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "bg-background/60"}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
  );
};

const VideoBlock = ({ block }: { block: SiteBlock }) => {
  const url = block.content?.video_url;
  if (!url) return null;

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");
  const getYouTubeId = (u: string) => u.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^&?#]+)/)?.[1];
  const getVimeoId = (u: string) => u.match(/vimeo\.com\/(\d+)/)?.[1];

  return withSection(
    block,
    "bg-secondary py-16 lg:py-24",
    <div className="container max-w-4xl">
      {block.title && <h2 className="mb-8 text-center font-display text-3xl font-bold uppercase text-secondary-foreground">{block.title}</h2>}

      <div className="overflow-hidden rounded-lg border border-border shadow-xl">
        {isYouTube ? (
          <div className="aspect-video">
            <iframe src={`https://www.youtube.com/embed/${getYouTubeId(url)}`} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        ) : isVimeo ? (
          <div className="aspect-video">
            <iframe src={`https://player.vimeo.com/video/${getVimeoId(url)}`} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          </div>
        ) : (
          <div className="aspect-video">
            <video controls className="h-full w-full object-cover">
              <source src={url} type="video/mp4" />
            </video>
          </div>
        )}
      </div>

      {block.content?.caption && <p className="mt-4 text-center text-muted-foreground">{block.content.caption}</p>}
    </div>,
  );
};

const CtaBlock = ({ block }: { block: SiteBlock }) => {
  const c = block.content || {};
  const align = c.alignment || "center";
  const buttons = resolveButtons(c, [{ text: c.button_text || "Learn more", link: c.button_link || "/products", icon: "ArrowRight", variant: c.button_variant || "default" }]);

  return withSection(
    block,
    "bg-secondary py-16 lg:py-24",
    <div className={`container ${alignmentClass(align)}`}>
      <h2 className="mb-4 font-display text-3xl font-bold uppercase text-secondary-foreground lg:text-4xl">{c.heading || "Ready to get started?"}</h2>
      {c.subheading && <p className="mb-8 text-lg text-muted-foreground">{c.subheading}</p>}
      <div className={`flex flex-wrap gap-4 ${justifyClass(c.buttonAlignment || align)}`}>
        {buttons.map((button, index) => (
          <ActionButton key={`${button.text}-${index}`} button={button} className="font-display uppercase tracking-wider" />
        ))}
      </div>
    </div>,
  );
};

const SingleButtonBlock = ({ block }: { block: SiteBlock }) => {
  const c = block.content || {};
  const buttons = resolveButtons(c, [
    {
      text: c.button_text || "Click Me",
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
        <ActionButton key={`${button.text}-${index}`} button={button} className="font-display uppercase tracking-wider" />
      ))}
    </div>,
  );
};

const NewsletterBlock = ({ block }: { block: SiteBlock }) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const c = block.content || {};

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const { error } = await supabase.from("newsletter_subscribers").insert({ email } as any);
    setStatus(error ? "error" : "success");
    if (!error) setEmail("");
  };

  const align = c.alignment || "center";

  return withSection(
    block,
    "bg-secondary py-16",
    <div className={`container max-w-xl ${alignmentClass(align)}`}>
      <h2 className="mb-2 font-display text-2xl font-bold uppercase text-secondary-foreground">{c.heading || "Stay Updated"}</h2>
      <p className="mb-6 text-muted-foreground">{c.subheading || "Subscribe to our newsletter for the latest updates."}</p>

      {status === "success" ? (
        <p className="font-display text-primary">Thanks for subscribing!</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="submit" className="rounded-md bg-primary px-6 py-2 font-display text-sm uppercase tracking-wider text-primary-foreground hover:bg-primary/90">
            {c.submit_text || "Subscribe"}
          </button>
        </form>
      )}

      {status === "error" && <p className="mt-2 text-sm text-destructive">Already subscribed or error occurred.</p>}
    </div>,
  );
};

export default renderBlock;
