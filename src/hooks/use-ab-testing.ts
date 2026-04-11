import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserSignals } from "./use-user-signals";
import {
  type Experiment,
  type ExperimentVariant,
  type ExperimentTargetType,
  type ABUserContext,
  assignVariant,
  matchesTargeting,
  applyABVariantContent,
  getAssignment,
} from "@/lib/ab-testing";

// ─── Fetch running experiments from DB ───

function useRunningExperiments() {
  return useQuery({
    queryKey: ["ab-experiments-running"],
    queryFn: async () => {
      const { data: experiments, error: expError } = await supabase
        .from("ab_experiments" as any)
        .select("*")
        .eq("status", "running") as any;
      if (expError) {
        if (String(expError.code) === "PGRST205" || String(expError.message).includes("Could not find")) {
          return [] as Experiment[];
        }
        throw expError;
      }
      if (!experiments?.length) return [] as Experiment[];

      const expIds = experiments.map((e: any) => e.id);
      const { data: variants, error: varError } = await supabase
        .from("ab_experiment_variants" as any)
        .select("*")
        .in("experiment_id", expIds) as any;
      if (varError) throw varError;

      const variantMap = new Map<string, ExperimentVariant[]>();
      (variants ?? []).forEach((v: any) => {
        const list = variantMap.get(v.experiment_id) ?? [];
        list.push({
          id: v.id,
          experimentId: v.experiment_id,
          name: v.name,
          description: v.description ?? "",
          weight: v.weight,
          isControl: v.is_control,
          contentOverrides: v.content_overrides ?? {},
        });
        variantMap.set(v.experiment_id, list);
      });

      return experiments.map((e: any): Experiment => ({
        id: e.id,
        name: e.name,
        description: e.description ?? "",
        status: e.status,
        targetType: e.target_type,
        targetId: e.target_id,
        targeting: e.targeting ?? {},
        variants: variantMap.get(e.id) ?? [],
        startDate: e.start_date,
        endDate: e.end_date,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
        winnerId: e.winner_id,
      }));
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

// ─── Main Hook ───

export function useABTesting() {
  const { data: experiments = [], isLoading } = useRunningExperiments();
  const { signals } = useUserSignals();

  const userCtx = useMemo<ABUserContext>(() => ({
    device: signals.device,
    language: signals.language,
    isLoggedIn: signals.isLoggedIn,
    isReturningVisitor: signals.isReturningVisitor,
    activeCampaignId: signals.activeCampaignId,
    userSegment: signals.userSegment,
    currentPage: typeof window !== "undefined" ? window.location.pathname : "/",
  }), [signals]);

  /**
   * Get the active experiment and assigned variant for a specific entity.
   * Returns null if no experiment is running or targeting doesn't match.
   */
  const getExperimentForEntity = useCallback(
    (entityType: ExperimentTargetType, entityId: string) => {
      const experiment = experiments.find(
        (e) => e.targetType === entityType && e.targetId === entityId,
      );
      if (!experiment) return null;
      if (!matchesTargeting(experiment.targeting, userCtx)) return null;

      const variant = assignVariant(experiment);
      return variant ? { experiment, variant } : null;
    },
    [experiments, userCtx],
  );

  /**
   * Get content with A/B variant overrides applied for a block.
   * Should be called BEFORE personalization to establish evaluation order.
   */
  const getABContent = useCallback(
    (blockId: string, content: Record<string, unknown>): Record<string, unknown> => {
      const result = getExperimentForEntity("section", blockId);
      if (!result) return content;
      return applyABVariantContent(content, result.variant, result.experiment.id);
    },
    [getExperimentForEntity],
  );

  /**
   * Get experiment info for a popup.
   */
  const getPopupExperiment = useCallback(
    (popupId: string) => getExperimentForEntity("popup", popupId),
    [getExperimentForEntity],
  );

  /**
   * Check if a given entity has an active experiment.
   */
  const hasExperiment = useCallback(
    (entityType: ExperimentTargetType, entityId: string): boolean => {
      return experiments.some(
        (e) => e.targetType === entityType && e.targetId === entityId,
      );
    },
    [experiments],
  );

  /**
   * Get experiment details without assigning (for editor display).
   */
  const getExperimentInfo = useCallback(
    (entityType: ExperimentTargetType, entityId: string) => {
      const experiment = experiments.find(
        (e) => e.targetType === entityType && e.targetId === entityId,
      );
      if (!experiment) return null;

      const existing = getAssignment(experiment.id);
      const currentVariant = existing
        ? experiment.variants.find((v) => v.id === existing.variantId) ?? null
        : null;

      return { experiment, currentVariant };
    },
    [experiments],
  );

  return {
    experiments,
    isLoading,
    getExperimentForEntity,
    getABContent,
    getPopupExperiment,
    hasExperiment,
    getExperimentInfo,
  };
}
