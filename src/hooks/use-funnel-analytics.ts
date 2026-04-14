import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FunnelStage } from "./use-funnel-stage";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FunnelStageMetrics {
  stage: FunnelStage;
  /** Unique sessions that visited at least one page in this stage. */
  sessions: number;
  /** Percentage of sessions from the previous stage that reached this stage. */
  conversionRate: number;
  /** Percentage of sessions that left the funnel at this stage. */
  dropOffRate: number;
}

export interface SectionPerformance {
  entityId: string;
  title: string;
  stage: FunnelStage;
  views: number;
  clicks: number;
  /** Click-through rate as a whole percentage (0–100). */
  ctr: number;
}

export interface FunnelAnalyticsData {
  stageMetrics: FunnelStageMetrics[];
  /** Sections with CTR ≥ 10 % — strongest conversion drivers. */
  topSections: SectionPerformance[];
  /** Sections with ≥ 10 views but CTR < 5 % — candidates for A/B testing or replacement. */
  weakSections: SectionPerformance[];
  /** The stage with the biggest percentage of sessions dropping off. */
  primaryDropOff: FunnelStage | null;
  /** Overall awareness → conversion rate as a whole percentage. */
  conversionRate: number;
}

// ─── Path → Stage mapping ────────────────────────────────────────────────────

function classifyPath(path: string | null | undefined): FunnelStage {
  const p = path ?? "/";
  if (p.startsWith("/cart") || p.startsWith("/checkout")) return "conversion";
  if (p.startsWith("/account") || p.startsWith("/order")) return "retention";
  if (/^\/products\/[^/]+/.test(p) || /^\/product\/[^/]+/.test(p)) return "consideration";
  if (
    p.startsWith("/products") ||
    p.startsWith("/categories") ||
    p.startsWith("/gift-finder") ||
    p.startsWith("/create-your-own")
  )
    return "discovery";
  return "awareness";
}

const FUNNEL_STAGES: FunnelStage[] = [
  "awareness",
  "discovery",
  "consideration",
  "conversion",
  "retention",
];

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Aggregates analytics events into funnel-stage metrics and section performance.
 * Designed for the admin analytics / AI Insights panel.
 *
 * @param rangeDays - Number of days to look back (default 30).
 */
export function useFunnelAnalytics(rangeDays = 30) {
  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - rangeDays);
    return d.toISOString();
  }, [rangeDays]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["funnel-analytics", rangeDays],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events" as any)
        .select(
          "session_id, event_name, page_path, entity_id, context, created_at",
        )
        .gte("created_at", since)
        .in("event_name", ["page_view", "section_view", "section_click"])
        .limit(10000) as any;

      if (error) throw error;
      return (data ?? []) as Array<{
        session_id: string;
        event_name: string;
        page_path: string | null;
        entity_id: string | null;
        context: Record<string, unknown> | null;
        created_at: string;
      }>;
    },
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const analytics = useMemo<FunnelAnalyticsData>(() => {
    // session → set of stages visited
    const sessionStages = new Map<string, Set<FunnelStage>>();
    // entityId → section performance accumulator
    const sectionMap = new Map<
      string,
      { title: string; stage: FunnelStage; views: number; clicks: number }
    >();

    for (const event of events) {
      const { session_id, event_name, page_path, entity_id, context } = event;

      if (event_name === "page_view" && session_id) {
        const stage = classifyPath(page_path);
        if (!sessionStages.has(session_id)) sessionStages.set(session_id, new Set());
        sessionStages.get(session_id)!.add(stage);
      }

      if (
        (event_name === "section_view" || event_name === "section_click") &&
        entity_id
      ) {
        const stage = classifyPath(page_path);
        const title =
          (context?.sectionLabel as string | undefined) ??
          (context?.blockType as string | undefined) ??
          entity_id;

        if (!sectionMap.has(entity_id)) {
          sectionMap.set(entity_id, { title, stage, views: 0, clicks: 0 });
        }
        const s = sectionMap.get(entity_id)!;
        if (event_name === "section_view") s.views += 1;
        else s.clicks += 1;
      }
    }

    // Per-stage session counts
    const stageCounts = Object.fromEntries(
      FUNNEL_STAGES.map((s) => [s, 0]),
    ) as Record<FunnelStage, number>;

    for (const stageSet of sessionStages.values()) {
      for (const stage of stageSet) stageCounts[stage] += 1;
    }

    // Build stage metrics with inter-stage conversion rates
    const stageMetrics: FunnelStageMetrics[] = FUNNEL_STAGES.map((stage, i) => {
      const sessions = stageCounts[stage];
      const prevSessions = i === 0 ? sessions : stageCounts[FUNNEL_STAGES[i - 1]];
      const conversionRate =
        prevSessions > 0 ? Math.round((sessions / prevSessions) * 100) : 0;
      return {
        stage,
        sessions,
        conversionRate,
        dropOffRate: Math.max(0, 100 - conversionRate),
      };
    });

    // Primary drop-off: largest drop-off in early/mid funnel stages (skip retention)
    let primaryDropOff: FunnelStage | null = null;
    let maxDrop = 0;
    for (const m of stageMetrics.slice(0, 4)) {
      if (m.dropOffRate > maxDrop) {
        maxDrop = m.dropOffRate;
        primaryDropOff = m.stage;
      }
    }

    // Section performance
    const sections: SectionPerformance[] = [];
    for (const [entityId, s] of sectionMap.entries()) {
      const ctr = s.views > 0 ? Math.round((s.clicks / s.views) * 100) : 0;
      sections.push({
        entityId,
        title: s.title,
        stage: s.stage,
        views: s.views,
        clicks: s.clicks,
        ctr,
      });
    }
    sections.sort((a, b) => b.views - a.views);

    const topSections = sections.filter((s) => s.ctr >= 10).slice(0, 6);
    const weakSections = sections
      .filter((s) => s.views >= 10 && s.ctr < 5)
      .slice(0, 6);

    const awarenessTotal = Math.max(stageCounts.awareness, 1);
    const conversionTotal = stageCounts.conversion;
    const conversionRate = Math.round((conversionTotal / awarenessTotal) * 100);

    return {
      stageMetrics,
      topSections,
      weakSections,
      primaryDropOff,
      conversionRate,
    };
  }, [events]);

  return { analytics, isLoading };
}
