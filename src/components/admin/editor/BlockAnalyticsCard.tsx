import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, MousePointerClick, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { percentage } from "@/lib/analytics";

interface BlockAnalyticsCardProps {
  entityId: string;
  pagePath: string;
  reusableId?: string | null;
  label?: string;
}

export default function BlockAnalyticsCard({ entityId, pagePath, reusableId, label }: BlockAnalyticsCardProps) {
  const query = useQuery({
    queryKey: ["editor-block-analytics", entityId, pagePath, reusableId],
    enabled: Boolean(entityId),
    queryFn: async () => {
      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("analytics_events" as any)
        .select("event_name, entity_type, entity_id, reusable_id, component_id, page_path, context, created_at")
        .eq("page_path", pagePath)
        .gte("created_at", since30)
        .or(`entity_id.eq.${entityId}${reusableId ? `,reusable_id.eq.${reusableId},component_id.eq.${reusableId}` : ""}`)
        .limit(2000);

      if (error) throw error;

      const rows = (data ?? []) as Array<Record<string, any>>;
      const now = Date.now();
      const days7 = now - 7 * 24 * 60 * 60 * 1000;
      const relevant = rows.filter((row) => ["section_view", "section_click", "component_view", "component_click"].includes(String(row.event_name || "")));
      const views30 = relevant.filter((row) => row.event_name === "section_view" || row.event_name === "component_view").length;
      const clicks30 = relevant.filter((row) => row.event_name === "section_click" || row.event_name === "component_click").length;
      const views7 = relevant.filter((row) => (row.event_name === "section_view" || row.event_name === "component_view") && new Date(row.created_at).getTime() >= days7).length;
      const clicks7 = relevant.filter((row) => (row.event_name === "section_click" || row.event_name === "component_click") && new Date(row.created_at).getTime() >= days7).length;

      const bySection = new Map<string, { views: number; clicks: number }>();
      rows.forEach((row) => {
        const key = String(row.entity_id || row.reusable_id || row.component_id || "");
        if (!key) return;
        const entry = bySection.get(key) || { views: 0, clicks: 0 };
        if (row.event_name === "section_view" || row.event_name === "component_view") entry.views += 1;
        if (row.event_name === "section_click" || row.event_name === "component_click") entry.clicks += 1;
        bySection.set(key, entry);
      });

      const averageCtr = bySection.size
        ? Array.from(bySection.values()).reduce((sum, entry) => sum + percentage(entry.clicks, entry.views), 0) / bySection.size
        : 0;

      return {
        views30,
        clicks30,
        views7,
        clicks7,
        ctr30: percentage(clicks30, views30),
        avgPageCtr: averageCtr,
      };
    },
  });

  if (query.isLoading) {
    return <div className="rounded-xl border border-border/30 bg-card/40 p-3 text-xs text-muted-foreground">Loading analytics…</div>;
  }

  const data = query.data;
  if (!data || (!data.views30 && !data.clicks30)) {
    return (
      <div className="rounded-xl border border-dashed border-border/40 bg-card/30 p-3 text-xs text-muted-foreground">
        Analytics will appear here after this section starts receiving storefront traffic.
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4 text-primary" /> Performance insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{label || "Selected section"}</Badge>
          <Badge variant="outline">30d CTR {data.ctr30.toFixed(1)}%</Badge>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-border/30 bg-background/60 p-2">
            <p className="flex items-center gap-1 text-muted-foreground"><Activity className="h-3 w-3" /> Views</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{data.views30}</p>
            <p className="text-[10px] text-muted-foreground">{data.views7} in the last 7d</p>
          </div>
          <div className="rounded-lg border border-border/30 bg-background/60 p-2">
            <p className="flex items-center gap-1 text-muted-foreground"><MousePointerClick className="h-3 w-3" /> Clicks</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{data.clicks30}</p>
            <p className="text-[10px] text-muted-foreground">{data.clicks7} in the last 7d</p>
          </div>
          <div className="rounded-lg border border-border/30 bg-background/60 p-2">
            <p className="flex items-center gap-1 text-muted-foreground"><TrendingUp className="h-3 w-3" /> Compared to page</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {data.ctr30 >= data.avgPageCtr ? "+" : ""}{(data.ctr30 - data.avgPageCtr).toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground">Page avg CTR {data.avgPageCtr.toFixed(1)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
