import { useState } from "react";
import {
  FlaskConical,
  Play,
  Pause,
  Trophy,
  Plus,
  Trash2,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  type Experiment,
  type ExperimentVariant,
  type ExperimentTargetType,
  EXPERIMENT_STATUS_LABELS,
  EXPERIMENT_STATUS_COLORS,
  createExperimentVariant,
} from "@/lib/ab-testing";
import { useExperimentAdmin } from "@/hooks/use-experiment-admin";

interface ABTestPanelProps {
  entityType: ExperimentTargetType;
  entityId: string;
  content: Record<string, unknown>;
  patchContent: (key: string, value: unknown) => void;
}

export default function ABTestPanel({ entityType, entityId, content, patchContent }: ABTestPanelProps) {
  const { experiments, create, update, updateVariant, addVariant, deleteVariant, applyWinner, isCreating, isUpdating } = useExperimentAdmin();

  const experiment = experiments.find((e) => e.targetType === entityType && e.targetId === entityId);

  const handleCreate = async () => {
    await create({ name: `Test: ${String(content.heading || content.title || entityId).slice(0, 40)}`, targetType: entityType, targetId: entityId });
  };

  if (!experiment) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">A/B Testing</span>
        </div>
        <p className="text-[10px] text-muted-foreground">No experiment is running on this block.</p>
        <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={handleCreate} disabled={isCreating}>
          <FlaskConical className="mr-1 h-3 w-3" />
          {isCreating ? "Creating..." : "Create experiment"}
        </Button>
      </div>
    );
  }

  return <ExperimentEditor experiment={experiment} content={content} patchContent={patchContent} />;
}

// ─── Experiment Editor ───

function ExperimentEditor({
  experiment,
  content,
  patchContent,
}: {
  experiment: Experiment;
  content: Record<string, unknown>;
  patchContent: (key: string, value: unknown) => void;
}) {
  const { update, updateVariant, addVariant, deleteVariant, applyWinner, isUpdating } = useExperimentAdmin();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(experiment.name);

  const totalWeight = experiment.variants.reduce((s, v) => s + v.weight, 0);
  const isRunning = experiment.status === "running";
  const isPaused = experiment.status === "paused";
  const isDraft = experiment.status === "draft";
  const isCompleted = experiment.status === "completed";

  const handleStatusToggle = async () => {
    if (isDraft || isPaused) {
      await update({ id: experiment.id, status: "running", startDate: new Date().toISOString() });
    } else if (isRunning) {
      await update({ id: experiment.id, status: "paused" });
    }
  };

  const handleAddVariant = async () => {
    const remainingWeight = Math.max(0, 100 - totalWeight);
    await addVariant({
      experimentId: experiment.id,
      name: `Variant ${String.fromCharCode(65 + experiment.variants.length)}`,
      weight: remainingWeight > 0 ? Math.min(remainingWeight, 25) : 10,
    });
  };

  const handleNameSave = async () => {
    if (name.trim() && name !== experiment.name) {
      await update({ id: experiment.id, name: name.trim() });
    }
    setEditingName(false);
  };

  const handleWeightChange = async (variantId: string, newWeight: number) => {
    await updateVariant({ id: variantId, weight: newWeight });
  };

  const handleDuplicateContent = (variant: ExperimentVariant) => {
    const overrides = { ...content };
    // Remove internal keys
    delete overrides._audienceRules;
    delete overrides._personalization;
    delete overrides._reusableId;
    delete overrides._reusableSyncMode;
    delete overrides._reusableKind;
    delete overrides._activeVariantId;
    delete overrides._abExperimentId;
    delete overrides._abVariantId;
    delete overrides._abVariantName;
    updateVariant({ id: variant.id, contentOverrides: overrides });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">A/B Test</span>
        <Badge className={`ml-auto text-[9px] ${EXPERIMENT_STATUS_COLORS[experiment.status]}`}>
          {EXPERIMENT_STATUS_LABELS[experiment.status]}
        </Badge>
      </div>

      {/* Name */}
      {editingName ? (
        <div className="flex gap-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 text-xs"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
          />
          <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={handleNameSave}>
            Save
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="w-full text-left text-xs font-medium text-foreground hover:text-primary transition-colors"
          onClick={() => setEditingName(true)}
        >
          {experiment.name}
        </button>
      )}

      {/* Status controls */}
      {!isCompleted && (
        <div className="flex gap-2">
          <Button
            variant={isRunning ? "outline" : "default"}
            size="sm"
            className="h-7 flex-1 text-[10px]"
            onClick={handleStatusToggle}
            disabled={isUpdating}
          >
            {isRunning ? (
              <><Pause className="mr-1 h-3 w-3" /> Pause</>
            ) : (
              <><Play className="mr-1 h-3 w-3" /> Start</>
            )}
          </Button>
        </div>
      )}

      <Separator />

      {/* Variants */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Variants</Label>
          {!isCompleted && (
            <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px]" onClick={handleAddVariant}>
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>

        {experiment.variants.map((variant) => (
          <VariantRow
            key={variant.id}
            variant={variant}
            isCompleted={isCompleted}
            isWinner={experiment.winnerId === variant.id}
            onWeightChange={handleWeightChange}
            onDelete={() => deleteVariant(variant.id)}
            onDuplicate={() => handleDuplicateContent(variant)}
            onApplyWinner={() => applyWinner(experiment.id, variant.id)}
          />
        ))}

        {totalWeight !== 100 && (
          <p className="text-[9px] text-amber-500">
            Weights sum to {totalWeight}% — should be 100%
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Variant Row ───

function VariantRow({
  variant,
  isCompleted,
  isWinner,
  onWeightChange,
  onDelete,
  onDuplicate,
  onApplyWinner,
}: {
  variant: ExperimentVariant;
  isCompleted: boolean;
  isWinner: boolean;
  onWeightChange: (id: string, weight: number) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onApplyWinner: () => void;
}) {
  return (
    <div className={`rounded-lg border p-2 space-y-1.5 ${isWinner ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/30"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isWinner && <Trophy className="h-3 w-3 text-emerald-500" />}
          <span className="text-[11px] font-medium text-foreground">{variant.name}</span>
          {variant.isControl && (
            <Badge variant="outline" className="text-[8px] px-1 py-0">Control</Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {!isCompleted && !variant.isControl && (
            <>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onDuplicate} title="Copy current content">
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive/60 hover:text-destructive" onClick={onDelete} title="Delete variant">
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Weight slider */}
      {!isCompleted && (
        <div className="flex items-center gap-2">
          <Slider
            value={[variant.weight]}
            onValueChange={([v]) => onWeightChange(variant.id, v)}
            min={0}
            max={100}
            step={5}
            className="flex-1"
          />
          <span className="text-[10px] font-mono w-8 text-right text-muted-foreground">{variant.weight}%</span>
        </div>
      )}

      {/* Content overrides info */}
      {Object.keys(variant.contentOverrides).length > 0 && (
        <p className="text-[9px] text-muted-foreground">
          {Object.keys(variant.contentOverrides).length} content overrides
        </p>
      )}

      {/* Apply as winner */}
      {!isCompleted && !variant.isControl && (
        <Button variant="outline" size="sm" className="h-6 w-full text-[9px]" onClick={onApplyWinner}>
          <Trophy className="mr-1 h-3 w-3" /> Select as winner
        </Button>
      )}
    </div>
  );
}
