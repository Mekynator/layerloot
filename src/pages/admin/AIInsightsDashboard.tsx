import { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Play,
  Pause,
  Plus,
  Trash2,
  BarChart3,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAIInsights } from "@/hooks/use-ai-insights";
import { useAutomationRules } from "@/hooks/use-automation-rules";
import FunnelInsightsPanel from "@/components/admin/funnel/FunnelInsightsPanel";
import {
  SUGGESTION_TYPE_LABELS,
  SUGGESTION_PRIORITY_COLORS,
  INSIGHT_CATEGORY_LABELS,
  INSIGHT_CATEGORY_COLORS,
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_ACTION_LABELS,
  type AutomationTrigger,
  type AutomationAction,
  type AISuggestion,
  type AIInsight,
} from "@/lib/ai-engine";
import { cn } from "@/lib/utils";

export default function AIInsightsDashboard() {
  const { insights, pendingSuggestions, stats, isLoading } = useAIInsights();
  const { rules, create, toggleStatus, deleteRule, isCreating } = useAutomationRules();
  const [activeTab, setActiveTab] = useState("overview");
  const [newRuleOpen, setNewRuleOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-violet-500" />
            AI Insights & Automation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Data-driven suggestions and automated optimizations for your store
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Insights" value={stats.totalInsights} icon={<Lightbulb className="h-4 w-4 text-amber-500" />} />
        <StatCard title="Pending Suggestions" value={stats.totalSuggestions} icon={<AlertTriangle className="h-4 w-4 text-blue-500" />} />
        <StatCard title="Top Performers" value={stats.topPerformers} icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} />
        <StatCard title="Needs Attention" value={stats.needsAttention} icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Suggestions
            {pendingSuggestions.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[9px]">
                {pendingSuggestions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="funnel" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Funnel
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading insights...
            </div>
          ) : insights.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8 text-violet-400" />}
              title="No insights yet"
              description="Insights will appear as your store collects analytics data. Keep your pages active to get AI-powered recommendations."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          {pendingSuggestions.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8 text-emerald-400" />}
              title="All caught up"
              description="No pending suggestions. Your store is looking great!"
            />
          ) : (
            <div className="space-y-3">
              {pendingSuggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Set up automated rules that trigger actions based on store metrics
            </p>
            <Dialog open={newRuleOpen} onOpenChange={setNewRuleOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  New Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Automation Rule</DialogTitle>
                </DialogHeader>
                <NewRuleForm
                  onCreate={async (name, trigger, action) => {
                    await create({ name, trigger, action });
                    setNewRuleOpen(false);
                  }}
                  isCreating={isCreating}
                />
              </DialogContent>
            </Dialog>
          </div>

          {rules.length === 0 ? (
            <EmptyState
              icon={<Zap className="h-8 w-8 text-amber-400" />}
              title="No automation rules"
              description="Create rules to automatically optimize your store based on performance metrics."
            />
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <Card key={rule.id} className="overflow-hidden">
                  <div className="flex items-center justify-between border-b p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        rule.status === "active" ? "bg-emerald-500/15" : "bg-muted"
                      )}>
                        <Zap className={cn(
                          "h-4 w-4",
                          rule.status === "active" ? "text-emerald-600" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {AUTOMATION_TRIGGER_LABELS[rule.trigger]} → {AUTOMATION_ACTION_LABELS[rule.action]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={cn(
                        "text-[10px]",
                        rule.status === "active" ? "bg-emerald-500/15 text-emerald-600" : ""
                      )}>
                        {rule.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(rule.id)}
                        className="h-7 w-7 p-0"
                        title={rule.status === "active" ? "Pause" : "Activate"}
                      >
                        {rule.status === "active" ? (
                          <Pause className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRule(rule.id)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {rule.description && (
                    <div className="px-4 py-2">
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 border-t px-4 py-2 text-[10px] text-muted-foreground">
                    <span>Cooldown: {rule.cooldownMinutes}min</span>
                    <span>Conditions: {rule.conditions.length}</span>
                    {rule.lastTriggeredAt && (
                      <span>Last triggered: {new Date(rule.lastTriggeredAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="space-y-4">
          <FunnelInsightsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ───

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/80">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight }: { insight: AIInsight }) {
  const [expanded, setExpanded] = useState(false);
  const TrendIcon = insight.trend === "up" ? TrendingUp : insight.trend === "down" ? TrendingDown : Minus;
  const trendColor = insight.trend === "up" ? "text-emerald-600" : insight.trend === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={cn("text-[9px]", INSIGHT_CATEGORY_COLORS[insight.category])}>
                {INSIGHT_CATEGORY_LABELS[insight.category]}
              </Badge>
              <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} />
            </div>
            <CardTitle className="mt-1.5 text-sm">{insight.title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        <p className="text-xs text-muted-foreground">{insight.description}</p>

        {insight.dataPoints.length > 0 && (
          <div className="flex gap-4">
            {insight.dataPoints.map((dp) => (
              <div key={dp.label} className="text-center">
                <p className="text-lg font-bold">{typeof dp.value === "number" && dp.value < 1 ? `${(dp.value * 100).toFixed(1)}%` : dp.value.toFixed(1)}</p>
                <p className="text-[9px] text-muted-foreground">{dp.label}</p>
              </div>
            ))}
          </div>
        )}

        {insight.suggestion && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center gap-1 text-[10px] font-medium text-violet-600 hover:text-violet-700"
          >
            <Lightbulb className="h-3 w-3" />
            View Suggestion
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
        {expanded && insight.suggestion && (
          <div className="rounded-md border border-violet-500/20 bg-violet-500/5 p-2">
            <p className="text-xs font-medium">{insight.suggestion.title}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{insight.suggestion.description}</p>
            {insight.suggestion.estimatedImpact && (
              <p className="mt-1 text-[9px] font-medium text-emerald-600">Impact: {insight.suggestion.estimatedImpact}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionCard({ suggestion }: { suggestion: AISuggestion }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
          <Lightbulb className="h-4 w-4 text-violet-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn("text-[9px]", SUGGESTION_PRIORITY_COLORS[suggestion.priority])}>
              {suggestion.priority}
            </Badge>
            <Badge variant="outline" className="text-[9px]">
              {SUGGESTION_TYPE_LABELS[suggestion.type]}
            </Badge>
          </div>
          <p className="mt-1 text-sm font-medium">{suggestion.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{suggestion.description}</p>
          {suggestion.reasoning && (
            <p className="mt-1 text-[10px] italic text-muted-foreground">{suggestion.reasoning}</p>
          )}
          {suggestion.estimatedImpact && (
            <p className="mt-1 text-[10px] font-medium text-emerald-600">{suggestion.estimatedImpact}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
      {icon}
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function NewRuleForm({
  onCreate,
  isCreating,
}: {
  onCreate: (name: string, trigger: AutomationTrigger, action: AutomationAction) => Promise<void>;
  isCreating: boolean;
}) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<AutomationTrigger>("low_engagement");
  const [action, setAction] = useState<AutomationAction>("flag_for_review");

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Rule Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Flag low-performing sections"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Trigger</Label>
        <Select value={trigger} onValueChange={(v) => setTrigger(v as AutomationTrigger)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(AUTOMATION_TRIGGER_LABELS) as [AutomationTrigger, string][]).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Action</Label>
        <Select value={action} onValueChange={(v) => setAction(v as AutomationAction)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(AUTOMATION_ACTION_LABELS) as [AutomationAction, string][]).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={() => onCreate(name, trigger, action)}
        disabled={!name.trim() || isCreating}
        className="w-full"
      >
        {isCreating ? "Creating..." : "Create Rule"}
      </Button>
    </div>
  );
}
