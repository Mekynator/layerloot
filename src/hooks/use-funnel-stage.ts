import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useBehaviorTracking } from "./use-behavior-tracking";
import type { RecommendationMode } from "@/lib/personalization";

/** The five stages of the LayerLoot conversion funnel. */
export type FunnelStage =
  | "awareness"     // Homepage / campaign landing
  | "discovery"     // Category / gift-finder / product list
  | "consideration" // Single product page
  | "conversion"    // Cart / checkout
  | "retention";    // Account / order history

/** The AI chat mode tuned for the current stage. */
export type AIChatMode = "explore" | "recommend" | "convert" | "retain";

/** Per-stage configuration used to coordinate personalization, urgency, and AI. */
export interface FunnelStageConfig {
  stage: FunnelStage;
  /** How prominently urgency signals (countdown, low-stock) should be shown. */
  urgencyLevel: "none" | "low" | "high";
  /**
   * Primary recommendation mode for personalized sections on this page.
   * Falls back to `fallbackMode` if not enough results.
   */
  personalizationMode: RecommendationMode;
  fallbackMode: RecommendationMode;
  /** Default CTA label for the primary action at this stage. */
  primaryCTA: string;
  /** Controls the AI chat assistant's behaviour pattern. */
  aiMode: AIChatMode;
}

function classifyPathname(pathname: string): FunnelStage {
  if (pathname.startsWith("/cart") || pathname.startsWith("/checkout")) return "conversion";
  if (pathname.startsWith("/account") || pathname.startsWith("/order")) return "retention";
  // Single product — must check before generic /products to handle /products/:slug
  if (/^\/products\/[^/]+/.test(pathname) || /^\/product\/[^/]+/.test(pathname)) return "consideration";
  if (
    pathname.startsWith("/products") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/gift-finder") ||
    pathname.startsWith("/create")
  )
    return "discovery";
  return "awareness";
}

/**
 * Detects the current funnel stage from the URL and user behaviour, then returns
 * a config object that drives personalization mode, urgency level, and AI chat tone.
 *
 * Usage:
 *   const { stage, personalizationMode, aiMode } = useFunnelStage();
 */
export function useFunnelStage(): FunnelStageConfig {
  const { pathname } = useLocation();
  const { behavior } = useBehaviorTracking();

  const stage = useMemo(() => classifyPathname(pathname), [pathname]);
  const isReturning = behavior.totalSessions >= 3;

  return useMemo<FunnelStageConfig>(() => {
    switch (stage) {
      case "awareness":
        return {
          stage,
          urgencyLevel: "none",
          personalizationMode: isReturning ? "category_interest" : "featured",
          fallbackMode: "bestsellers",
          primaryCTA: isReturning ? "Continue shopping" : "Explore products",
          aiMode: isReturning ? "recommend" : "explore",
        };

      case "discovery":
        return {
          stage,
          urgencyLevel: "low",
          personalizationMode: "category_interest",
          fallbackMode: "bestsellers",
          primaryCTA: "View details",
          aiMode: "recommend",
        };

      case "consideration":
        return {
          stage,
          urgencyLevel: "high",
          personalizationMode: "cart_based",
          fallbackMode: "category_interest",
          primaryCTA: "Add to cart",
          aiMode: "convert",
        };

      case "conversion":
        return {
          stage,
          urgencyLevel: "high",
          personalizationMode: "cart_based",
          fallbackMode: "bestsellers",
          primaryCTA: "Proceed to checkout",
          aiMode: "convert",
        };

      case "retention":
        return {
          stage,
          urgencyLevel: "none",
          personalizationMode: isReturning ? "recently_viewed" : "bestsellers",
          fallbackMode: "featured",
          primaryCTA: "Shop again",
          aiMode: "retain",
        };
    }
  }, [stage, isReturning]);
}
