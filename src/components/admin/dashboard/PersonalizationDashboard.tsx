import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Eye,
  Layers,
  MousePointerClick,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AUDIENCE_CONDITION_LABELS,
  CONDITION_VALUE_OPTIONS,
  type AudienceConditionType,
  type AudienceRules,
  type PersonalizationConfig,
} from "@/lib/personalization";

// ─── Types ───

interface PersonalizedBlockStat {
  blockId: string;
  blockType: string;
  page: string;
  title: string;
  audienceRules: AudienceRules;
  hasVariants: boolean;
  variantCount: number;
}

interface VariantPerformance {
  variantId: string;
  label: string;
  blockId: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

// ─── Main Dashboard ───

export default function PersonalizationDashboard() {
  const { data: personalizedBlocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ["personalization-dashboard-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_blocks")
        .select("id, block_type, page, title, content")
        .order("page")
        .order("sort_order");
      if (error) throw error;

      const results: PersonalizedBlockStat[] = [];
      for (const block of data ?? []) {
        const content = block.content as Record<string, unknown> | null;
        if (!content) continue;
        const rules = content._audienceRules as AudienceRules | undefined;
        const pConfig = content._personalization as PersonalizationConfig | undefined;
        const hasRules = Array.isArray(rules) && rules.length > 0;
        const hasVariants = pConfig?.enabled && (pConfig.variants?.length ?? 0) > 0;
        if (!hasRules && !hasVariants) continue;

        results.push({
          blockId: block.id,
          blockType: block.block_type,
          page: block.page ?? "home",
          title: typeof block.title === "string" ? block.title : block.block_type.replace(/_/g, " "),
          audienceRules: rules ?? [],
          hasVariants: !!hasVariants,
          variantCount: pConfig?.variants?.length ?? 0,
        });
      }
      return results;
    },
    staleTime: 60_000,
  });

  const { data: variantStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ["personalization-dashboard-variant-stats"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: impressions, error: impErr } = await (supabase
        .from("analytics_events" as any)
        .select("entity_id, context")
        .eq("event_name", "personalized_variant_shown")
        .gte("created_at", thirtyDaysAgo) as any);
      if (impErr) throw impErr;

      const { data: clicks, error: clickErr } = await (supabase
        .from("analytics_events" as any)
        .select("entity_id, context")
        .in("event_name", ["section_click", "component_click", "cta_click", "button_click"])
        .gte("created_at", thirtyDaysAgo) as any);
      if (clickErr) throw clickErr;

      // Aggregate by variantId
      const impMap = new Map<string, number>();
      const blockMap = new Map<string, string>();
      const labelMap = new Map<string, string>();

      for (const row of impressions ?? []) {
        const ctx = row.context as Record<string, unknown> | null;
        const vid = ctx?.variantId as string | undefined;
        if (!vid) continue;
        impMap.set(vid, (impMap.get(vid) ?? 0) + 1);
        if (row.entity_id) blockMap.set(vid, row.entity_id);
      }

      // Count section clicks that have an active variant
      const clickMap = new Map<string, number>();
      for (const row of clicks ?? []) {
        const blockId = row.entity_id;
        if (!blockId) continue;
        // Map to all variant IDs for this block
        for (const [vid, bid] of blockMap.entries()) {
          if (bid === blockId) {
            clickMap.set(vid, (clickMap.get(vid) ?? 0) + 1);
          }
        }
      }

      const results: VariantPerformance[] = [];
      for (const [vid, impressionCount] of impMap.entries()) {
        const clickCount = clickMap.get(vid) ?? 0;
        results.push({
          variantId: vid,
          label: labelMap.get(vid) ?? vid,
          blockId: blockMap.get(vid) ?? "",
          impressions: impressionCount,
          clicks: clickCount,
          ctr: impressionCount > 0 ? (clickCount / impressionCount) * 100 : 0,
        });
      }

      return results.sort((a, b) => b.impressions - a.impressions);
    },
    staleTime: 60_000,
  });

  // Summary stats
  const totalPersonalized = personalizedBlocks.length;
  const withVariants = personalizedBlocks.filter((b) => b.hasVariants).length;
  const totalVariants = personalizedBlocks.reduce((s, b) => s + b.variantCount, 0);
  const totalImpressions = variantStats.reduce((s, v) => s + v.impressions, 0);
  const totalClicks = variantStats.reduce((s, v) => s + v.clicks, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // By-page grouping
  const byPage = useMemo(() => {
    const map = new Map<string, PersonalizedBlockStat[]>();
    for (const block of personalizedBlocks) {
      const list = map.get(block.page) ?? [];
      list.push(block);
      map.set(block.page, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [personalizedBlocks]);

  const formatRuleSummary = (rules: AudienceRules): string => {
    if (rules.length === 0) return "Everyone";
    return rules
      .map((group) =>
        group
          .map((c) => {
            const label = AUDIENCE_CONDITION_LABELS[c.type] || c.type;
            const opts = CONDITION_VALUE_OPTIONS[c.type as AudienceConditionType];
            const valLabel = opts?.find((o) => o.value === c.value)?.label ?? c.value;
            return `${label}: ${valLabel}`;
          })
          .join(" + "),
      )
      .join(" | ");
  };

  const isLoading = blocksLoading || statsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Personalization insights
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of audience targeting, content variants, and performance.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label="Personalized blocks"
          value={totalPersonalized}
          sub={`${withVariants} with variants`}
          loading={isLoading}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Active variants"
          value={totalVariants}
          sub="across all blocks"
          loading={isLoading}
        />
        <StatCard
          icon={<Eye className="h-4 w-4" />}
          label="Variant impressions"
          value={totalImpressions}
          sub="last 30 days"
          loading={isLoading}
        />
        <StatCard
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Average CTR"
          value={`${avgCtr.toFixed(1)}%`}
          sub={`${totalClicks} clicks`}
          loading={isLoading}
        />
      </div>

      {/* Variant Performance */}
      {variantStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Variant performance (30 days)
            </CardTitle>
            <CardDescription className="text-xs">
              Click-through rates for personalized content variants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {variantStats.slice(0, 10).map((v) => (
              <div key={v.variantId} className="flex items-center gap-3 text-xs">
                <span className="w-28 truncate font-medium text-foreground" title={v.variantId}>
                  {v.label}
                </span>
                <div className="flex-1">
                  <Progress value={Math.min(v.ctr, 100)} className="h-2" />
                </div>
                <span className="w-20 text-right text-muted-foreground">
                  {v.impressions} views
                </span>
                <span className="w-16 text-right font-medium text-foreground">
                  {v.ctr.toFixed(1)}% CTR
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Personalized Blocks by Page */}
      {byPage.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Active personalization rules
            </CardTitle>
            <CardDescription className="text-xs">
              Blocks with audience targeting or content variants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {byPage.map(([page, blocks]) => (
              <div key={page} className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  /{page}
                </p>
                {blocks.map((block) => (
                  <div
                    key={block.blockId}
                    className="rounded-lg border border-border/30 bg-card/50 px-3 py-2 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {block.title}
                      </span>
                      <Badge variant="outline" className="text-[9px]">
                        {block.blockType.replace(/_/g, " ")}
                      </Badge>
                      {block.hasVariants && (
                        <Badge variant="secondary" className="text-[9px]">
                          {block.variantCount} variant{block.variantCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {formatRuleSummary(block.audienceRules)}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Fallback usage */}
      {!isLoading && totalPersonalized === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">
              No personalized blocks yet. Add audience rules or content variants to any block in the Page Editor.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Stat Card ───

function StatCard({
  icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-primary">{icon}</div>
        <p className="mt-2 text-xl font-bold text-foreground">
          {loading ? "…" : value}
        </p>
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mt-1">
          {label}
        </p>
        <p className="text-[10px] text-muted-foreground/60">{sub}</p>
      </CardContent>
    </Card>
  );
}
