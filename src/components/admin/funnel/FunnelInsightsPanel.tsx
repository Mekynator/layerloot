import { useState } from "react";
import { TrendingUp, TrendingDown, ArrowRight, Zap, Users, AlertCircle, CheckCircle2, Loader2, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useFunnelAnalytics } from "@/hooks/use-funnel-analytics";
import type { FunnelStage, FunnelStageConfig } from "@/hooks/use-funnel-stage";

// ─── Stage display config ─────────────────────────────────────────────────────

const STAGE_LABELS: Record<FunnelStage, string> = {
  awareness: "Awareness",
  discovery: "Discovery",
  consideration: "Consideration",
  conversion: "Conversion",
  retention: "Retention",
};

const STAGE_COLORS: Record<FunnelStage, string> = {
  awareness: "bg-violet-500",
  discovery: "bg-blue-500",
  consideration: "bg-amber-500",
  conversion: "bg-emerald-500",
  retention: "bg-rose-500",
};

const STAGE_TEXT_COLORS: Record<FunnelStage, string> = {
  awareness: "text-violet-600",
  discovery: "text-blue-600",
  consideration: "text-amber-600",
  conversion: "text-emerald-600",
  retention: "text-rose-600",
};

const STAGE_BG_COLORS: Record<FunnelStage, string> = {
  awareness: "bg-violet-500/10",
  discovery: "bg-blue-500/10",
  consideration: "bg-amber-500/10",
  conversion: "bg-emerald-500/10",
  retention: "bg-rose-500/10",
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Admin panel showing funnel-stage analytics: per-stage session counts,
 * inter-stage conversion rates, drop-off detection, and section CTR.
 */
export default function FunnelInsightsPanel() {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const { analytics, isLoading } = useFunnelAnalytics(range);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading funnel data…
      </div>
    );
  }

  const { stageMetrics, topSections, weakSections, primaryDropOff, conversionRate } = analytics;
  const maxSessions = Math.max(...stageMetrics.map((m) => m.sessions), 1);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Conversion Funnel</h2>
          <p className="text-xs text-muted-foreground">
            Session flow from first visit to checkout over the selected period
          </p>
        </div>
        <Select
          value={String(range)}
          onValueChange={(v) => setRange(Number(v) as 7 | 30 | 90)}
        >
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overall conversion KPI */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Awareness → Checkout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{conversionRate}%</p>
            <p className="mt-1 text-xs text-muted-foreground">overall funnel conversion rate</p>
          </CardContent>
        </Card>

        {primaryDropOff && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-1 text-xs font-medium text-amber-600 uppercase tracking-wider">
                <AlertCircle className="h-3.5 w-3.5" />
                Primary Drop-off
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {STAGE_LABELS[primaryDropOff]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                highest session loss in the funnel
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Top Section CTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {topSections.length > 0 ? `${topSections[0].ctr}%` : "—"}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {topSections.length > 0 ? topSections[0].title : "No data yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stage funnel bars */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart2 className="h-4 w-4 text-primary" />
            Session flow by stage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stageMetrics.map((m, i) => {
            const widthPct = maxSessions > 0 ? Math.round((m.sessions / maxSessions) * 100) : 0;
            const isDropOff = m.stage === primaryDropOff;
            return (
              <div key={m.stage} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white",
                        STAGE_COLORS[m.stage],
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className={cn("font-medium", STAGE_TEXT_COLORS[m.stage])}>
                      {STAGE_LABELS[m.stage]}
                    </span>
                    {isDropOff && (
                      <Badge variant="outline" className="h-4 border-amber-400 px-1.5 text-[9px] text-amber-600">
                        ⚠ Drop-off hotspot
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-right text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {m.sessions.toLocaleString()}
                    </span>
                    {i > 0 && (
                      <span
                        className={cn(
                          "flex items-center gap-0.5 font-medium",
                          m.conversionRate >= 50
                            ? "text-emerald-600"
                            : m.conversionRate >= 25
                              ? "text-amber-600"
                              : "text-red-500",
                        )}
                      >
                        {m.conversionRate >= 50 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {m.conversionRate}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      STAGE_COLORS[m.stage],
                      isDropOff && "opacity-70",
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Section performance */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top sections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Top performing sections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSections.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No high-CTR sections yet — collect more traffic.
              </p>
            ) : (
              <div className="divide-y divide-border/40">
                {topSections.map((s) => (
                  <div key={s.entityId} className="flex items-center justify-between py-2">
                    <div className="mr-3 min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{s.title}</p>
                      <p className={cn("text-[10px]", STAGE_TEXT_COLORS[s.stage])}>
                        {STAGE_LABELS[s.stage]} · {s.views} views
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-emerald-400 text-emerald-700 dark:text-emerald-400"
                    >
                      {s.ctr}% CTR
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weak sections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-amber-500" />
              Sections to optimise
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weakSections.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No low-CTR sections detected. Keep collecting data.
              </p>
            ) : (
              <div className="divide-y divide-border/40">
                {weakSections.map((s) => (
                  <div key={s.entityId} className="flex items-center justify-between py-2">
                    <div className="mr-3 min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{s.title}</p>
                      <p className={cn("text-[10px]", STAGE_TEXT_COLORS[s.stage])}>
                        {STAGE_LABELS[s.stage]} · {s.views} views
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-amber-400 text-amber-700 dark:text-amber-400"
                      >
                        {s.ctr}% CTR
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">A/B test?</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
