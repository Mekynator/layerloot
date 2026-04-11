import { useEffect, useMemo, useId } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, History, TrendingUp, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFunnelStage } from "@/hooks/use-funnel-stage";
import { usePersonalizedRecommendations } from "@/hooks/use-personalized-recommendations";
import { useABTesting } from "@/hooks/use-ab-testing";
import { useBehaviorTracking } from "@/hooks/use-behavior-tracking";
import { useAnalyticsSafe } from "@/contexts/AnalyticsContext";
import ProductCard from "@/components/ProductCard";
import type { StorefrontCatalogData } from "@/hooks/use-storefront";

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  /**
   * Pre-fetched storefront catalog. Pass this if the parent already has the
   * catalog loaded to avoid redundant network requests.
   * The section renders nothing while `catalog` is undefined.
   */
  catalog: StorefrontCatalogData | null | undefined;
  /** Used by A/B testing to look up experiments tied to this element. */
  sectionId?: string;
  /** Exclude a specific product (e.g. the currently viewed product). */
  excludeProductId?: string;
  /** Optional builder-controlled overrides from the page editor / reusable blocks. */
  content?: {
    heading?: string;
    subtitle?: string;
    limit?: number;
    ctaLabel?: string;
    ctaHref?: string;
  } | null;
  className?: string;
}

// ─── Stage metadata ───────────────────────────────────────────────────────────

const STAGE_META = {
  awareness: {
    icon: Sparkles,
    headingNew: "Handpicked for you",
    headingReturning: "Welcome back — your picks",
    sub: "Personalised products based on your interests",
    ctaLabel: "See all products",
    ctaHref: "/products",
  },
  discovery: {
    icon: TrendingUp,
    headingNew: "Trending right now",
    headingReturning: "More you might like",
    sub: "Top picks matched to your browsing",
    ctaLabel: "Browse all",
    ctaHref: "/products",
  },
  consideration: {
    icon: Star,
    headingNew: "You might also like",
    headingReturning: "Pairs well with this",
    sub: "Products that complement your selection",
    ctaLabel: "Explore more",
    ctaHref: "/products",
  },
  conversion: {
    icon: TrendingUp,
    headingNew: "Add one more",
    headingReturning: "Complete your order",
    sub: "Handpicked additions before you check out",
    ctaLabel: "View all",
    ctaHref: "/products",
  },
  retention: {
    icon: History,
    headingNew: "Back in stock picks",
    headingReturning: "Pick up where you left off",
    sub: "Products you recently explored",
    ctaLabel: "See everything",
    ctaHref: "/products",
  },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * A smart, personalized product section driven by the current funnel stage.
 *
 * - **Awareness** — featured / category-interest products (different for new vs returning)
 * - **Discovery** — category-interest ranked by personalization engine
 * - **Consideration** — cart-based "you might also like" grid
 * - **Conversion** — personalized upsell before checkout
 * - **Retention** — recently viewed / recommended for return visitors
 *
 * Also respects active A/B experiments on `sectionId` for heading/count overrides.
 */
export default function SmartFunnelSection({
  catalog,
  sectionId,
  excludeProductId,
  content: contentOverrides,
  className,
}: Props) {
  const stableId = useId();
  const resolvedId = sectionId ?? `smart-funnel-${stableId}`;

  const { stage, personalizationMode, fallbackMode } = useFunnelStage();
  const { behavior } = useBehaviorTracking();
  const { getABContent } = useABTesting();
  const { track } = useAnalyticsSafe();

  const isReturning = behavior.totalSessions >= 3;
  const meta = STAGE_META[stage];

  // Default content — may be overridden by A/B testing below
  const baseContent = useMemo(
    () => ({
      heading: contentOverrides?.heading || (isReturning ? meta.headingReturning : meta.headingNew),
      subtitle: contentOverrides?.subtitle || meta.sub,
      limit: contentOverrides?.limit ?? 4,
      ctaLabel: contentOverrides?.ctaLabel || meta.ctaLabel,
      ctaHref: contentOverrides?.ctaHref || meta.ctaHref,
    }),
    [contentOverrides, isReturning, meta],
  );

  // Apply A/B content overrides (heading, limit, etc.) if an experiment is running
  const content = useMemo(
    () =>
      getABContent(resolvedId, baseContent) as {
        heading: string;
        subtitle: string;
        limit: number;
        ctaLabel: string;
        ctaHref: string;
      },
    [getABContent, resolvedId, baseContent],
  );

  const recommendationConfig = useMemo(
    () => ({
      mode: personalizationMode,
      fallbackMode,
      limit: Math.max(1, Math.min(8, content.limit)),
    }),
    [personalizationMode, fallbackMode, content.limit],
  );

  const allProducts = catalog?.products ?? [];
  const socialProofMap = catalog?.socialProofMap ?? new Map();

  const { products } = usePersonalizedRecommendations(
    allProducts,
    socialProofMap,
    recommendationConfig,
    excludeProductId,
  );

  // Track section impression
  useEffect(() => {
    if (!products.length) return;
    track({
      eventName: "section_view",
      entityType: "section",
      entityId: resolvedId,
      source: "smart_funnel",
      context: {
        sectionLabel: content.heading,
        stage,
        blockType: "smart_funnel",
        mode: personalizationMode,
      },
      allowDuplicates: false,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId, products.length]);

  const handleSectionClick = () => {
    track({
      eventName: "section_click",
      entityType: "section",
      entityId: resolvedId,
      source: "smart_funnel",
      context: { sectionLabel: content.heading, stage },
      allowDuplicates: true,
    });
  };

  if (!catalog || products.length === 0) return null;

  const Icon = meta.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={handleSectionClick}
      className={cn("py-12 md:py-16", className)}
    >
      <div className="container">
        {/* Heading */}
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Personalised
              </p>
            </div>
            <h2 className="font-display text-2xl font-bold uppercase text-foreground md:text-3xl">
              {content.heading}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{content.subtitle}</p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to={content.ctaHref}>
              {content.ctaLabel} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              socialProof={socialProofMap.get(product.id)}
              index={index}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}
