import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  type AutomationRule,
  type AutomationRuleStatus,
  type AutomationTrigger,
  type AutomationAction,
  type AutomationMetrics,
  createAutomationRule,
  evaluateRules,
} from "@/lib/ai-engine";

const RULES_KEY = ["automation-rules"];

function parseRule(row: any): AutomationRule {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    trigger: row.trigger,
    conditions: row.conditions ?? [],
    action: row.action,
    actionConfig: row.action_config ?? {},
    status: row.status,
    cooldownMinutes: row.cooldown_minutes ?? 60,
    lastTriggeredAt: row.last_triggered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Hook for managing automation rules (CRUD + evaluation).
 * Rules are stored in Supabase and evaluated against real-time metrics.
 */
export function useAutomationRules() {
  const qc = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: RULES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules" as any)
        .select("*")
        .order("updated_at", { ascending: false }) as any;
      if (error) throw error;
      return (data ?? []).map(parseRule);
    },
    staleTime: 30_000,
  });

  // Create
  const createMutation = useMutation({
    mutationFn: async (params: { name: string; trigger: AutomationTrigger; action: AutomationAction }) => {
      const rule = createAutomationRule(params.name, params.trigger, params.action);
      const { error } = await supabase.from("automation_rules" as any).insert({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        conditions: rule.conditions,
        action: rule.action,
        action_config: rule.actionConfig,
        status: rule.status,
        cooldown_minutes: rule.cooldownMinutes,
        last_triggered_at: rule.lastTriggeredAt,
      } as any) as any;
      if (error) throw error;
      return rule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RULES_KEY });
      toast.success("Automation rule created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Update
  const updateMutation = useMutation({
    mutationFn: async (params: Partial<AutomationRule> & { id: string }) => {
      const patch: Record<string, unknown> = {};
      if (params.name !== undefined) patch.name = params.name;
      if (params.description !== undefined) patch.description = params.description;
      if (params.trigger !== undefined) patch.trigger = params.trigger;
      if (params.conditions !== undefined) patch.conditions = params.conditions;
      if (params.action !== undefined) patch.action = params.action;
      if (params.actionConfig !== undefined) patch.action_config = params.actionConfig;
      if (params.status !== undefined) patch.status = params.status;
      if (params.cooldownMinutes !== undefined) patch.cooldown_minutes = params.cooldownMinutes;
      if (params.lastTriggeredAt !== undefined) patch.last_triggered_at = params.lastTriggeredAt;
      patch.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from("automation_rules" as any)
        .update(patch as any)
        .eq("id", params.id) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RULES_KEY });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from("automation_rules" as any)
        .delete()
        .eq("id", ruleId) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RULES_KEY });
      toast.success("Automation rule deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Evaluate rules against current metrics
  const evaluate = useCallback(
    (metrics: AutomationMetrics) => evaluateRules(rules, metrics),
    [rules],
  );

  // Toggle rule status
  const toggleStatus = useCallback(
    async (ruleId: string) => {
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) return;
      const newStatus: AutomationRuleStatus = rule.status === "active" ? "paused" : "active";
      await updateMutation.mutateAsync({ id: ruleId, status: newStatus });
      toast.success(`Rule ${newStatus === "active" ? "activated" : "paused"}`);
    },
    [rules, updateMutation],
  );

  return {
    rules,
    isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    deleteRule: deleteMutation.mutateAsync,
    evaluate,
    toggleStatus,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
