import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  Experiment,
  ExperimentStatus,
  ExperimentTargetType,
  ExperimentTargeting,
  ExperimentVariant,
} from "@/lib/ab-testing";
import { createExperiment, createExperimentVariant } from "@/lib/ab-testing";

// ─── Shared query key ───

const ALL_EXPERIMENTS_KEY = ["ab-experiments-all"];

// ─── Parse DB row to Experiment ───

function parseExperiment(row: any, variants: any[]): Experiment {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    status: row.status,
    targetType: row.target_type,
    targetId: row.target_id,
    targeting: row.targeting ?? {},
    variants: variants
      .filter((v) => v.experiment_id === row.id)
      .map((v) => ({
        id: v.id,
        experimentId: v.experiment_id,
        name: v.name,
        description: v.description ?? "",
        weight: v.weight,
        isControl: v.is_control,
        contentOverrides: v.content_overrides ?? {},
      })),
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    winnerId: row.winner_id,
  };
}

// ─── Main Admin Hook ───

export function useExperimentAdmin() {
  const qc = useQueryClient();

  const { data: experiments = [], isLoading } = useQuery({
    queryKey: ALL_EXPERIMENTS_KEY,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("ab_experiments" as any)
        .select("*")
        .order("updated_at", { ascending: false }) as any;
      if (error) throw error;
      if (!rows?.length) return [] as Experiment[];

      const ids = rows.map((r: any) => r.id);
      const { data: variants, error: vErr } = await supabase
        .from("ab_experiment_variants" as any)
        .select("*")
        .in("experiment_id", ids) as any;
      if (vErr) throw vErr;

      return rows.map((r: any) => parseExperiment(r, variants ?? []));
    },
    staleTime: 30_000,
  });

  // ─── Create ───

  const createMutation = useMutation({
    mutationFn: async (params: { name: string; targetType: ExperimentTargetType; targetId: string }) => {
      const exp = createExperiment(params.name, params.targetType, params.targetId);

      const { error: expErr } = await supabase.from("ab_experiments" as any).insert({
        id: exp.id,
        name: exp.name,
        description: exp.description,
        status: exp.status,
        target_type: exp.targetType,
        target_id: exp.targetId,
        targeting: exp.targeting,
        start_date: exp.startDate,
        end_date: exp.endDate,
        winner_id: exp.winnerId,
      } as any) as any;
      if (expErr) throw expErr;

      const variantRows = exp.variants.map((v) => ({
        id: v.id,
        experiment_id: v.experimentId,
        name: v.name,
        description: v.description,
        weight: v.weight,
        is_control: v.isControl,
        content_overrides: v.contentOverrides,
      }));
      const { error: varErr } = await supabase
        .from("ab_experiment_variants" as any)
        .insert(variantRows as any) as any;
      if (varErr) throw varErr;

      return exp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALL_EXPERIMENTS_KEY });
      toast.success("Experiment created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Update experiment metadata ───

  const updateMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      description?: string;
      status?: ExperimentStatus;
      targeting?: ExperimentTargeting;
      startDate?: string | null;
      endDate?: string | null;
      winnerId?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (params.name !== undefined) patch.name = params.name;
      if (params.description !== undefined) patch.description = params.description;
      if (params.status !== undefined) patch.status = params.status;
      if (params.targeting !== undefined) patch.targeting = params.targeting;
      if (params.startDate !== undefined) patch.start_date = params.startDate;
      if (params.endDate !== undefined) patch.end_date = params.endDate;
      if (params.winnerId !== undefined) patch.winner_id = params.winnerId;

      const { error } = await supabase
        .from("ab_experiments" as any)
        .update(patch as any)
        .eq("id", params.id) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALL_EXPERIMENTS_KEY });
      qc.invalidateQueries({ queryKey: ["ab-experiments-running"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Update variant ───

  const updateVariantMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      description?: string;
      weight?: number;
      contentOverrides?: Record<string, unknown>;
    }) => {
      const patch: Record<string, unknown> = {};
      if (params.name !== undefined) patch.name = params.name;
      if (params.description !== undefined) patch.description = params.description;
      if (params.weight !== undefined) patch.weight = params.weight;
      if (params.contentOverrides !== undefined) patch.content_overrides = params.contentOverrides;

      const { error } = await supabase
        .from("ab_experiment_variants" as any)
        .update(patch as any)
        .eq("id", params.id) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALL_EXPERIMENTS_KEY });
      qc.invalidateQueries({ queryKey: ["ab-experiments-running"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Add variant ───

  const addVariantMutation = useMutation({
    mutationFn: async (params: { experimentId: string; name: string; weight: number }) => {
      const variant = createExperimentVariant(params.experimentId, params.name, params.weight, false);
      const { error } = await supabase.from("ab_experiment_variants" as any).insert({
        id: variant.id,
        experiment_id: variant.experimentId,
        name: variant.name,
        description: variant.description,
        weight: variant.weight,
        is_control: variant.isControl,
        content_overrides: variant.contentOverrides,
      } as any) as any;
      if (error) throw error;
      return variant;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALL_EXPERIMENTS_KEY });
      toast.success("Variant added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Delete variant ───

  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const { error } = await supabase
        .from("ab_experiment_variants" as any)
        .delete()
        .eq("id", variantId) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALL_EXPERIMENTS_KEY });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Delete experiment ───

  const deleteMutation = useMutation({
    mutationFn: async (experimentId: string) => {
      const { error } = await supabase
        .from("ab_experiments" as any)
        .delete()
        .eq("id", experimentId) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALL_EXPERIMENTS_KEY });
      qc.invalidateQueries({ queryKey: ["ab-experiments-running"] });
      toast.success("Experiment deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Apply winner ───

  const applyWinner = useCallback(
    async (experimentId: string, winnerId: string) => {
      await updateMutation.mutateAsync({
        id: experimentId,
        winnerId,
        status: "completed",
      });
      toast.success("Winner applied — experiment completed");
    },
    [updateMutation],
  );

  return {
    experiments,
    isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    updateVariant: updateVariantMutation.mutateAsync,
    addVariant: addVariantMutation.mutateAsync,
    deleteVariant: deleteVariantMutation.mutateAsync,
    deleteExperiment: deleteMutation.mutateAsync,
    applyWinner,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
