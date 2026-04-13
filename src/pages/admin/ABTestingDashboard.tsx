import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  FlaskConical,
  MousePointerClick,
  Eye,
  Plus,
  Play,
  Pause,
  Trophy,
  Trash2,
  Archive,
  TrendingUp,
  Target,
  ShoppingCart,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  type Experiment,
  type ExperimentStatus,
  EXPERIMENT_STATUS_LABELS,
  EXPERIMENT_STATUS_COLORS,
  TARGET_TYPE_LABELS,
  type ExperimentTargetType,
} from "@/lib/ab-testing";
import { useExperimentAdmin } from "@/hooks/use-experiment-admin";

// ─── Metrics query ───

interface VariantMetrics {
  variantId: string;
  impressions: number;
  clicks: number;
  addToCarts: number;
  checkouts: number;
  purchases: number;
}

function useExperimentMetrics(experimentId: string | null) {
  return useQuery({
    queryKey: ["ab-metrics", experimentId],
    queryFn: async () => {
      if (!experimentId) return [] as VariantMetrics[];

      const { data, error }: { data: any; error: any } = await (supabase
        .from("analytics_events" as any) as any)
        .select("event_name, context")
        .in("event_name", ["ab_variant_shown", "ab_variant_click", "add_to_cart", "checkout_started", "purchase_completed"])
        .eq("context->>abExperimentId", experimentId);

      // Fallback: also check entity_id for ab_ events
      const { data: abData } = await (supabase
        .from("analytics_events" as any)
        .select("event_name, context")
        .in("event_name", ["ab_variant_shown", "ab_variant_click"])
        .eq("entity_id", experimentId) as any);

      const allEvents = [...(data ?? []), ...(abData ?? [])];

      // Deduplicate by parsing context
      const metricsMap = new Map<string, VariantMetrics>();

      allEvents.forEach((ev: any) => {
        const ctx = ev.context ?? {};
        const variantId = ctx.variantId ?? ctx.abVariantId;
        if (!variantId) return;

        if (!metricsMap.has(variantId)) {
          metricsMap.set(variantId, {
            variantId,
            impressions: 0,
            clicks: 0,
            addToCarts: 0,
            checkouts: 0,
            purchases: 0,
          });
        }
        const m = metricsMap.get(variantId)!;

        switch (ev.event_name) {
          case "ab_variant_shown":
            m.impressions++;
            break;
          case "ab_variant_click":
            m.clicks++;
            break;
          case "add_to_cart":
            m.addToCarts++;
            break;
          case "checkout_started":
            m.checkouts++;
            break;
          case "purchase_completed":
            m.purchases++;
            break;
        }
      });

      return Array.from(metricsMap.values());
    },
    enabled: !!experimentId,
    staleTime: 30_000,
  });
}

// ─── Main Page ───

export default function ABTestingDashboard() {
  const { experiments, isLoading, create, update, deleteExperiment, applyWinner, isCreating } = useExperimentAdmin();
  const [statusFilter, setStatusFilter] = useState<ExperimentStatus | "all">("all");
  const [selectedExpId, setSelectedExpId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return experiments;
    return experiments.filter((e) => e.status === statusFilter);
  }, [experiments, statusFilter]);

  const selectedExp = experiments.find((e) => e.id === selectedExpId) ?? null;

  return (
    
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold uppercase flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" /> A/B Testing
            </h1>
            <p className="text-sm text-muted-foreground">Run experiments to optimize conversions</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="font-display uppercase tracking-wider">
                <Plus className="mr-1 h-4 w-4" /> New Experiment
              </Button>
            </DialogTrigger>
            <CreateExperimentDialog
              onCreated={() => setCreateOpen(false)}
              onCreate={create}
              isCreating={isCreating}
            />
          </Dialog>
        </div>

        {/* Overview stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FlaskConical} label="Total Experiments" value={experiments.length} />
          <StatCard icon={Play} label="Running" value={experiments.filter((e) => e.status === "running").length} color="text-emerald-500" />
          <StatCard icon={Pause} label="Paused" value={experiments.filter((e) => e.status === "paused").length} color="text-amber-500" />
          <StatCard icon={Trophy} label="Completed" value={experiments.filter((e) => e.status === "completed").length} color="text-blue-500" />
        </div>

        {/* Tabs layout */}
        <Tabs defaultValue="list" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="list" className="gap-1 text-xs">
                <FlaskConical className="h-3 w-3" /> Experiments
              </TabsTrigger>
              <TabsTrigger value="results" className="gap-1 text-xs">
                <BarChart3 className="h-3 w-3" /> Results
              </TabsTrigger>
            </TabsList>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ExperimentStatus | "all")}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="list" className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading experiments...</p>
            ) : filtered.length === 0 ? (
              <Card className="p-8 text-center">
                <FlaskConical className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No experiments yet</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Create one from here or from the Page Editor</p>
              </Card>
            ) : (
              filtered.map((exp) => (
                <ExperimentCard
                  key={exp.id}
                  experiment={exp}
                  onSelect={() => setSelectedExpId(exp.id)}
                  onStatusChange={(status) => update({ id: exp.id, status })}
                  onDelete={() => deleteExperiment(exp.id)}
                  onArchive={() => update({ id: exp.id, status: "archived" })}
                  isSelected={selectedExpId === exp.id}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="results">
            {selectedExp ? (
              <ExperimentResults experiment={selectedExp} onApplyWinner={applyWinner} />
            ) : (
              <Card className="p-8 text-center">
                <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Select an experiment to view results</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    
  );
}

// ─── Stat Card ───

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color?: string }) {
  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className={`h-5 w-5 ${color || "text-primary"}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-display text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Experiment Card ───

function ExperimentCard({
  experiment,
  onSelect,
  onStatusChange,
  onDelete,
  onArchive,
  isSelected,
}: {
  experiment: Experiment;
  onSelect: () => void;
  onStatusChange: (status: ExperimentStatus) => void;
  onDelete: () => void;
  onArchive: () => void;
  isSelected: boolean;
}) {
  const isRunning = experiment.status === "running";
  const isDraft = experiment.status === "draft";
  const isPaused = experiment.status === "paused";
  const isCompleted = experiment.status === "completed";

  return (
    <Card
      className={`cursor-pointer transition-colors hover:border-primary/30 ${isSelected ? "border-primary/40 ring-1 ring-primary/20" : ""}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-sm font-bold uppercase truncate">{experiment.name}</h3>
              <Badge className={`text-[9px] ${EXPERIMENT_STATUS_COLORS[experiment.status]}`}>
                {EXPERIMENT_STATUS_LABELS[experiment.status]}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {TARGET_TYPE_LABELS[experiment.targetType]}
              </span>
              <span>{experiment.variants.length} variants</span>
              {experiment.startDate && <span>Started {new Date(experiment.startDate).toLocaleDateString()}</span>}
              {experiment.winnerId && (
                <span className="flex items-center gap-1 text-emerald-500">
                  <Trophy className="h-3 w-3" /> Winner selected
                </span>
              )}
            </div>

            {/* Variant weights bar */}
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted">
              {experiment.variants.map((v, i) => {
                const colors = ["bg-primary", "bg-emerald-500", "bg-amber-500", "bg-blue-500", "bg-purple-500"];
                return (
                  <div
                    key={v.id}
                    className={`h-full ${colors[i % colors.length]} transition-all`}
                    style={{ width: `${v.weight}%` }}
                    title={`${v.name}: ${v.weight}%`}
                  />
                );
              })}
            </div>
            <div className="mt-1 flex gap-3 text-[9px] text-muted-foreground">
              {experiment.variants.map((v, i) => {
                const dotColors = ["bg-primary", "bg-emerald-500", "bg-amber-500", "bg-blue-500", "bg-purple-500"];
                return (
                  <span key={v.id} className="flex items-center gap-1">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColors[i % dotColors.length]}`} />
                    {v.name} ({v.weight}%)
                  </span>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {(isDraft || isPaused) && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px]"
                onClick={() => onStatusChange("running")}
              >
                <Play className="mr-1 h-3 w-3" /> Start
              </Button>
            )}
            {isRunning && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px]"
                onClick={() => onStatusChange("paused")}
              >
                <Pause className="mr-1 h-3 w-3" /> Pause
              </Button>
            )}
            {isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px]"
                onClick={onArchive}
              >
                <Archive className="mr-1 h-3 w-3" /> Archive
              </Button>
            )}
            {(isDraft || experiment.status === "archived") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-destructive/60 hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Experiment Results ───

function ExperimentResults({
  experiment,
  onApplyWinner,
}: {
  experiment: Experiment;
  onApplyWinner: (experimentId: string, winnerId: string) => void;
}) {
  const { data: metrics = [], isLoading } = useExperimentMetrics(experiment.id);

  const getMetrics = (variantId: string): VariantMetrics =>
    metrics.find((m) => m.variantId === variantId) ?? {
      variantId,
      impressions: 0,
      clicks: 0,
      addToCarts: 0,
      checkouts: 0,
      purchases: 0,
    };

  const maxImpressions = Math.max(1, ...metrics.map((m) => m.impressions));

  // Determine leader
  const leader = metrics.length > 0
    ? metrics.reduce((best, cur) => {
        const bestCR = best.impressions ? (best.purchases / best.impressions) * 100 : 0;
        const curCR = cur.impressions ? (cur.purchases / cur.impressions) * 100 : 0;
        return curCR > bestCR ? cur : best;
      })
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-sm uppercase">
            <BarChart3 className="h-4 w-4 text-primary" /> {experiment.name}
          </CardTitle>
          <CardDescription className="text-xs">
            {TARGET_TYPE_LABELS[experiment.targetType]} · {experiment.variants.length} variants ·{" "}
            {experiment.startDate ? `Since ${new Date(experiment.startDate).toLocaleDateString()}` : "Not started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading metrics...</p>
          ) : (
            <div className="space-y-4">
              {/* Variant comparison table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2 pr-4">Variant</th>
                      <th className="pb-2 pr-4 text-right">Weight</th>
                      <th className="pb-2 pr-4 text-right">Impressions</th>
                      <th className="pb-2 pr-4 text-right">Clicks</th>
                      <th className="pb-2 pr-4 text-right">CTR</th>
                      <th className="pb-2 pr-4 text-right">Add to Cart</th>
                      <th className="pb-2 pr-4 text-right">Purchases</th>
                      <th className="pb-2 text-right">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {experiment.variants.map((variant) => {
                      const m = getMetrics(variant.id);
                      const ctr = m.impressions ? ((m.clicks / m.impressions) * 100).toFixed(1) : "0.0";
                      const convRate = m.impressions ? ((m.purchases / m.impressions) * 100).toFixed(2) : "0.00";
                      const isLeader = leader?.variantId === variant.id && m.impressions > 0;
                      const isWinner = experiment.winnerId === variant.id;

                      return (
                        <tr key={variant.id} className={`border-b border-border/20 ${isWinner ? "bg-emerald-500/5" : ""}`}>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-1.5">
                              {isWinner && <Trophy className="h-3 w-3 text-emerald-500" />}
                              {isLeader && !isWinner && <TrendingUp className="h-3 w-3 text-primary" />}
                              <span className="font-medium">{variant.name}</span>
                              {variant.isControl && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0">Control</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">{variant.weight}%</td>
                          <td className="py-2 pr-4 text-right font-mono">{m.impressions}</td>
                          <td className="py-2 pr-4 text-right font-mono">{m.clicks}</td>
                          <td className="py-2 pr-4 text-right font-mono">{ctr}%</td>
                          <td className="py-2 pr-4 text-right font-mono">{m.addToCarts}</td>
                          <td className="py-2 pr-4 text-right font-mono">{m.purchases}</td>
                          <td className="py-2 text-right font-mono font-semibold">{convRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Visual performance bars */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Impression Distribution</p>
                {experiment.variants.map((variant, i) => {
                  const m = getMetrics(variant.id);
                  const pct = maxImpressions ? (m.impressions / maxImpressions) * 100 : 0;
                  const barColors = ["bg-primary", "bg-emerald-500", "bg-amber-500", "bg-blue-500", "bg-purple-500"];

                  return (
                    <div key={variant.id} className="flex items-center gap-3">
                      <span className="w-24 text-[11px] text-muted-foreground truncate">{variant.name}</span>
                      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColors[i % barColors.length]} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono w-16 text-right text-muted-foreground">
                        {m.impressions}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Winner indicator */}
              {leader && leader.impressions > 0 && !experiment.winnerId && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">
                        <strong>{experiment.variants.find((v) => v.id === leader.variantId)?.name}</strong> is leading
                        with {leader.impressions ? ((leader.purchases / leader.impressions) * 100).toFixed(2) : 0}% conversion rate
                      </span>
                    </div>
                    {experiment.status !== "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px]"
                        onClick={() => onApplyWinner(experiment.id, leader.variantId)}
                      >
                        <Trophy className="mr-1 h-3 w-3" /> Apply as winner
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {experiment.winnerId && (
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="flex items-center gap-2 p-3">
                    <Trophy className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600">
                      Winner: <strong>{experiment.variants.find((v) => v.id === experiment.winnerId)?.name}</strong> — all traffic now serves this variant
                    </span>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Create Dialog ───

function CreateExperimentDialog({
  onCreated,
  onCreate,
  isCreating,
}: {
  onCreated: () => void;
  onCreate: (params: { name: string; targetType: ExperimentTargetType; targetId: string }) => Promise<any>;
  isCreating: boolean;
}) {
  const [name, setName] = useState("");
  const [targetType, setTargetType] = useState<ExperimentTargetType>("section");
  const [targetId, setTargetId] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !targetId.trim()) return;
    await onCreate({ name: name.trim(), targetType, targetId: targetId.trim() });
    setName("");
    setTargetId("");
    onCreated();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display uppercase">Create Experiment</DialogTitle>
        <DialogDescription className="text-xs">
          Define what you want to test. You can also create experiments from the Page Editor.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Experiment Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hero CTA Test"
            className="mt-1 h-8 text-xs"
          />
        </div>

        <div>
          <Label className="text-xs">Target Type</Label>
          <Select value={targetType} onValueChange={(v) => setTargetType(v as ExperimentTargetType)}>
            <SelectTrigger className="mt-1 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="section">Section / Block</SelectItem>
              <SelectItem value="page">Page</SelectItem>
              <SelectItem value="popup">Popup</SelectItem>
              <SelectItem value="component">Component</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Target ID</Label>
          <Input
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="Block ID, page slug, or popup ID"
            className="mt-1 h-8 text-xs"
          />
          <p className="mt-0.5 text-[9px] text-muted-foreground">
            Copy the block ID from the Page Editor, or use the page slug
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isCreating || !name.trim() || !targetId.trim()} className="font-display uppercase tracking-wider">
          {isCreating ? "Creating..." : "Create Experiment"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
