import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  generateSectionInsights,
  sortSuggestionsByScore,
  type AIInsight,
  type AISuggestion,
  type SectionAnalytics,
} from "@/lib/ai-engine";

/**
 * Hook that analyzes analytics data and generates AI-powered insights.
 * Fetches section-level analytics from Supabase and runs the insight engine.
 */
export function useAIInsights(pageId?: string) {
  // Fetch section analytics events
  const { data: rawEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["ai-insights-events", pageId],
    queryFn: async () => {
      let query = supabase
        .from("analytics_events" as any)
        .select("*")
        .in("event_name", ["section_view", "section_click", "page_view"])
        .order("created_at", { ascending: false })
        .limit(5000) as any;

      if (pageId) {
        query = query.eq("page_path", pageId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 120_000,
  });

  // Fetch stored suggestions
  const { data: storedSuggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ["ai-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_suggestions" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100) as any;
      if (error) throw error;
      return (data ?? []).map((row: any): AISuggestion => ({
        id: row.id,
        type: row.type,
        title: row.title,
        description: row.description ?? "",
        priority: row.priority,
        status: row.status,
        targetEntityType: row.target_entity_type,
        targetEntityId: row.target_entity_id,
        suggestedChanges: row.suggested_changes ?? {},
        reasoning: row.reasoning ?? "",
        estimatedImpact: row.estimated_impact ?? "",
        createdAt: row.created_at,
      }));
    },
    staleTime: 60_000,
  });

  // Aggregate section-level analytics from raw events
  const sectionAnalytics = useMemo<SectionAnalytics[]>(() => {
    const sectionMap = new Map<string, {
      views: number;
      clicks: number;
      totalVisible: number;
      type: string;
      title: string;
    }>();

    for (const event of rawEvents) {
      if (event.event_name === "section_view" && event.entity_id) {
        const existing = sectionMap.get(event.entity_id) ?? {
          views: 0, clicks: 0, totalVisible: 0,
          type: event.metadata?.sectionType ?? "unknown",
          title: event.metadata?.sectionTitle ?? event.entity_id,
        };
        existing.views += 1;
        existing.totalVisible += (event.metadata?.timeVisible as number) ?? 0;
        sectionMap.set(event.entity_id, existing);
      }

      if (event.event_name === "section_click" && event.entity_id) {
        const existing = sectionMap.get(event.entity_id) ?? {
          views: 0, clicks: 0, totalVisible: 0, type: "unknown", title: event.entity_id,
        };
        existing.clicks += 1;
        sectionMap.set(event.entity_id, existing);
      }
    }

    const totalPageViews = rawEvents.filter((e: any) => e.event_name === "page_view").length || 1;

    return Array.from(sectionMap.entries()).map(([id, data]): SectionAnalytics => ({
      sectionId: id,
      sectionType: data.type,
      sectionTitle: data.title,
      views: data.views,
      clicks: data.clicks,
      avgTimeVisible: data.views > 0 ? data.totalVisible / data.views : 0,
      bounceAfter: data.views > 0 ? Math.max(0, 1 - (data.views / totalPageViews)) : 0,
    }));
  }, [rawEvents]);

  // Generate insights from section analytics
  const generatedInsights = useMemo<AIInsight[]>(() => {
    if (!sectionAnalytics.length) return [];
    return generateSectionInsights(sectionAnalytics);
  }, [sectionAnalytics]);

  // Extract and sort all suggestions
  const allSuggestions = useMemo<AISuggestion[]>(() => {
    const fromInsights = generatedInsights
      .map((i) => i.suggestion)
      .filter((s): s is AISuggestion => s !== null);
    const combined = [...storedSuggestions, ...fromInsights];
    // Deduplicate by ID
    const seen = new Set<string>();
    const unique = combined.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    return sortSuggestionsByScore(unique);
  }, [generatedInsights, storedSuggestions]);

  // Get pending suggestions only
  const pendingSuggestions = useMemo(
    () => allSuggestions.filter((s) => s.status === "pending"),
    [allSuggestions],
  );

  // Summary stats
  const stats = useMemo(() => {
    const topPerformers = generatedInsights.filter((i) => i.trend === "up");
    const needsAttention = generatedInsights.filter((i) => i.trend === "down");
    return {
      totalInsights: generatedInsights.length,
      totalSuggestions: pendingSuggestions.length,
      topPerformers: topPerformers.length,
      needsAttention: needsAttention.length,
      sectionCount: sectionAnalytics.length,
    };
  }, [generatedInsights, pendingSuggestions, sectionAnalytics]);

  return {
    insights: generatedInsights,
    suggestions: allSuggestions,
    pendingSuggestions,
    sectionAnalytics,
    stats,
    isLoading: eventsLoading || suggestionsLoading,
  };
}
