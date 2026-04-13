import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain, BarChart3, Users, Settings, TrendingUp, Eye, ShoppingCart,
  Sparkles, RefreshCw, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PersonalizationDashboard from "@/components/admin/dashboard/PersonalizationDashboard";

type EventStat = { event_type: string; count: number };

function useEventStats() {
  return useQuery({
    queryKey: ["admin-event-stats"],
    queryFn: async () => {
      // Get event counts by type for last 30 days
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("user_events")
        .select("event_type")
        .gte("created_at", since) as any;

      if (error) throw error;
      const counts = new Map<string, number>();
      (data ?? []).forEach((e: any) => {
        counts.set(e.event_type, (counts.get(e.event_type) || 0) + 1);
      });
      const stats: EventStat[] = [...counts.entries()]
        .map(([event_type, count]) => ({ event_type, count }))
        .sort((a, b) => b.count - a.count);

      const totalEvents = stats.reduce((s, e) => s + e.count, 0);
      const uniqueUsers = new Set((data ?? []).map((e: any) => e.user_id).filter(Boolean)).size;

      return { stats, totalEvents, uniqueUsers };
    },
    staleTime: 60000,
  });
}

function usePersonalizationSettings() {
  return useQuery({
    queryKey: ["personalization-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personalization_settings")
        .select("*") as any;
      if (error) throw error;
      const map: Record<string, any> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = r.value; });
      return map;
    },
  });
}

function useProfileStats() {
  return useQuery({
    queryKey: ["admin-profile-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_personalization_profiles")
        .select("engagement_score, custom_interest_score, reorder_score, rewards_interest_score") as any;
      if (error) throw error;
      const profiles = data ?? [];
      const total = profiles.length;
      const segments = { new: 0, casual: 0, engaged: 0, loyal: 0 };
      profiles.forEach((p: any) => {
        const score = Number(p.engagement_score) || 0;
        if (score >= 70) segments.loyal++;
        else if (score >= 40) segments.engaged++;
        else if (score >= 15) segments.casual++;
        else segments.new++;
      });
      return { total, segments };
    },
    staleTime: 60000,
  });
}

const EVENT_LABELS: Record<string, string> = {
  product_view: "Product Views",
  category_view: "Category Views",
  add_to_cart: "Add to Cart",
  search: "Searches",
  purchase_completed: "Purchases",
  custom_request_started: "Custom Request Started",
  custom_request_submitted: "Custom Request Submitted",
  quote_viewed: "Quote Viewed",
  quote_accepted: "Quote Accepted",
  invoice_downloaded: "Invoice Downloaded",
  reward_viewed: "Reward Viewed",
  reward_redeemed: "Reward Redeemed",
  reorder_clicked: "Reorder Clicked",
  page_visit: "Page Visits",
  dashboard_section_opened: "Dashboard Sections",
};

const AdminPersonalization = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: eventData, isLoading: eventsLoading } = useEventStats();
  const { data: settings, isLoading: settingsLoading } = usePersonalizationSettings();
  const { data: profileData } = useProfileStats();

  const [weights, setWeights] = useState<{ behavior: number; preference: number; popularity: number; recency: number }>({
    behavior: 1, preference: 1, popularity: 1, recency: 1,
  });
  const [engineEnabled, setEngineEnabled] = useState(true);

  // Sync settings to local state on load
  useState(() => {
    if (settings?.weights) {
      const w = typeof settings.weights === "object" ? settings.weights : {};
      setWeights({ behavior: w.behavior ?? 1, preference: w.preference ?? 1, popularity: w.popularity ?? 1, recency: w.recency ?? 1 });
    }
    if (settings?.engine_enabled !== undefined) {
      setEngineEnabled(settings.engine_enabled === true || settings.engine_enabled === "true");
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        supabase.from("personalization_settings" as any).upsert({ key: "weights", value: weights, updated_at: new Date().toISOString() } as any),
        supabase.from("personalization_settings" as any).upsert({ key: "engine_enabled", value: engineEnabled, updated_at: new Date().toISOString() } as any),
      ]);
    },
    onSuccess: () => {
      toast({ title: "Settings saved" });
      queryClient.invalidateQueries({ queryKey: ["personalization-settings"] });
    },
  });

  const segments = profileData?.segments ?? { new: 0, casual: 0, engaged: 0, loyal: 0 };

  return (
    
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold uppercase flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" /> AI Personalization
            </h1>
            <p className="text-sm text-muted-foreground">Monitor and configure the personalization engine</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="mr-1 h-3 w-3" /> Refresh
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Events (30d)</p>
                  <p className="font-display text-2xl font-bold">{eventData?.totalEvents ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tracked Users</p>
                  <p className="font-display text-2xl font-bold">{eventData?.uniqueUsers ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profiles Built</p>
                  <p className="font-display text-2xl font-bold">{profileData?.total ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  {engineEnabled ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Engine Status</p>
                  <p className="font-display text-lg font-bold">{engineEnabled ? "Active" : "Disabled"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* User Segments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-sm uppercase">
                <Users className="h-4 w-4 text-primary" /> User Segments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["loyal", "engaged", "casual", "new"] as const).map((seg) => {
                const total = Math.max(1, segments.new + segments.casual + segments.engaged + segments.loyal);
                const pct = Math.round((segments[seg] / total) * 100);
                const colors = { loyal: "bg-primary", engaged: "bg-blue-500", casual: "bg-amber-500", new: "bg-muted-foreground" };
                return (
                  <div key={seg} className="flex items-center gap-3">
                    <Badge variant="outline" className="w-20 justify-center capitalize text-xs">{seg}</Badge>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${colors[seg]} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">{segments[seg]} ({pct}%)</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Event Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-sm uppercase">
                <TrendingUp className="h-4 w-4 text-primary" /> Event Types (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (eventData?.stats ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No events tracked yet. Events will appear as users browse the store.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {(eventData?.stats ?? []).map((stat) => {
                    const maxCount = eventData?.stats?.[0]?.count ?? 1;
                    const pct = Math.round((stat.count / maxCount) * 100);
                    return (
                      <div key={stat.event_type} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-40 truncate">
                          {EVENT_LABELS[stat.event_type] ?? stat.event_type}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium w-10 text-right">{stat.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-sm uppercase">
              <Settings className="h-4 w-4 text-primary" /> Engine Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Enable Personalization Engine</Label>
                <p className="text-xs text-muted-foreground">When disabled, all users see default content ordering</p>
              </div>
              <Switch checked={engineEnabled} onCheckedChange={setEngineEnabled} />
            </div>

            <Separator />

            <div className="space-y-4">
              <p className="text-sm font-medium">Scoring Weights</p>
              <p className="text-xs text-muted-foreground">Adjust how much each factor influences recommendations (0 = ignore, 2 = double weight)</p>
              
              {(["behavior", "preference", "popularity", "recency"] as const).map((key) => (
                <div key={key} className="flex items-center gap-4">
                  <Label className="w-24 capitalize text-xs">{key}</Label>
                  <Slider
                    value={[weights[key]]}
                    onValueChange={([v]) => setWeights((p) => ({ ...p, [key]: v }))}
                    min={0}
                    max={2}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-8 text-right">{weights[key].toFixed(1)}</span>
                </div>
              ))}
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="font-display uppercase tracking-wider">
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Block-level personalization performance */}
        <PersonalizationDashboard />
      </div>
    
  );
};

export default AdminPersonalization;
