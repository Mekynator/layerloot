import { useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AudienceCondition,
  type AudienceConditionType,
  type AudienceRules,
  type PersonalizationConfig,
  type PersonalizationVariant,
  AUDIENCE_CONDITION_LABELS,
  CONDITION_VALUE_OPTIONS,
  createDefaultPersonalizationConfig,
  createDefaultVariant,
} from "@/lib/personalization";

// ─── Props ───

interface PersonalizationPanelProps {
  content: Record<string, unknown>;
  patchContent: (key: string, value: unknown) => void;
}

// ─── Main Component ───

export default function PersonalizationPanel({ content, patchContent }: PersonalizationPanelProps) {
  const audienceRules = (content._audienceRules as AudienceRules) ?? [];
  const personalization = (content._personalization as PersonalizationConfig) ?? createDefaultPersonalizationConfig();
  const hasAudienceRules = audienceRules.length > 0;
  const hasVariants = personalization.enabled && personalization.variants.length > 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Personalization
        </span>
        {(hasAudienceRules || hasVariants) && (
          <Badge variant="secondary" className="ml-auto text-[9px]">
            Active
          </Badge>
        )}
      </div>

      {/* Audience Targeting */}
      <AudienceRulesEditor
        rules={audienceRules}
        onChange={(next) => patchContent("_audienceRules", next)}
      />

      {/* Content Variants */}
      <VariantsEditor
        config={personalization}
        onChange={(next) => patchContent("_personalization", next)}
      />
    </div>
  );
}

// ─── Audience Rules Editor ───

function AudienceRulesEditor({
  rules,
  onChange,
}: {
  rules: AudienceRules;
  onChange: (rules: AudienceRules) => void;
}) {
  const [expanded, setExpanded] = useState(rules.length > 0);

  const addGroup = useCallback(() => {
    onChange([...rules, [{ type: "auth_status", value: "logged_in" }]]);
    setExpanded(true);
  }, [rules, onChange]);

  const removeGroup = useCallback(
    (groupIndex: number) => {
      onChange(rules.filter((_, i) => i !== groupIndex));
    },
    [rules, onChange],
  );

  const addCondition = useCallback(
    (groupIndex: number) => {
      const next = rules.map((g, i) =>
        i === groupIndex ? [...g, { type: "visitor_type" as AudienceConditionType, value: "returning" }] : g,
      );
      onChange(next);
    },
    [rules, onChange],
  );

  const removeCondition = useCallback(
    (groupIndex: number, condIndex: number) => {
      const next = rules.map((g, i) =>
        i === groupIndex ? g.filter((_, ci) => ci !== condIndex) : g,
      );
      onChange(next.filter((g) => g.length > 0));
    },
    [rules, onChange],
  );

  const updateCondition = useCallback(
    (groupIndex: number, condIndex: number, patch: Partial<AudienceCondition>) => {
      const next = rules.map((g, gi) =>
        gi === groupIndex
          ? g.map((c, ci) => (ci === condIndex ? { ...c, ...patch } : c))
          : g,
      );
      onChange(next);
    },
    [rules, onChange],
  );

  const summary = useMemo(() => {
    if (rules.length === 0) return "Shown to everyone";
    return rules
      .map((group) =>
        group
          .map((c) => {
            const label = AUDIENCE_CONDITION_LABELS[c.type] || c.type;
            const opts = CONDITION_VALUE_OPTIONS[c.type];
            const valLabel = opts?.find((o) => o.value === c.value)?.label ?? c.value;
            return `${label}: ${valLabel}`;
          })
          .join(" AND "),
      )
      .join(" OR ");
  }, [rules]);

  return (
    <div className="rounded-xl border border-border/30 bg-background/40 p-3 space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-xs font-medium text-foreground">Audience targeting</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">{summary}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2 pt-1">
          {rules.map((group, gi) => (
            <div
              key={gi}
              className="rounded-lg border border-border/20 bg-card/30 p-2 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-primary">
                  {gi === 0 ? "Show when" : "Or when"}
                </span>
                <button
                  type="button"
                  onClick={() => removeGroup(gi)}
                  className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {group.map((cond, ci) => (
                <ConditionRow
                  key={ci}
                  condition={cond}
                  showAnd={ci > 0}
                  onChange={(patch) => updateCondition(gi, ci, patch)}
                  onRemove={() => removeCondition(gi, ci)}
                />
              ))}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-[10px] text-muted-foreground"
                onClick={() => addCondition(gi)}
              >
                <Plus className="h-3 w-3" /> Add AND condition
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-full gap-1 text-[10px]"
            onClick={addGroup}
          >
            <Plus className="h-3 w-3" /> {rules.length === 0 ? "Add audience rule" : "Add OR rule"}
          </Button>

          {rules.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-full text-[10px] text-muted-foreground"
              onClick={() => onChange([])}
            >
              Clear all rules (show to everyone)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Single Condition Row ───

function ConditionRow({
  condition,
  showAnd,
  onChange,
  onRemove,
}: {
  condition: AudienceCondition;
  showAnd: boolean;
  onChange: (patch: Partial<AudienceCondition>) => void;
  onRemove: () => void;
}) {
  const condTypes = Object.keys(AUDIENCE_CONDITION_LABELS) as AudienceConditionType[];
  const valueOptions = CONDITION_VALUE_OPTIONS[condition.type];

  return (
    <div className="flex items-center gap-1.5">
      {showAnd && (
        <span className="text-[9px] font-medium text-muted-foreground w-6 text-center">AND</span>
      )}
      <Select
        value={condition.type}
        onValueChange={(val) => {
          const defaults = CONDITION_VALUE_OPTIONS[val as AudienceConditionType];
          onChange({ type: val as AudienceConditionType, value: defaults?.[0]?.value ?? "true" });
        }}
      >
        <SelectTrigger className="h-7 text-[10px] flex-1 min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {condTypes.map((type) => (
            <SelectItem key={type} value={type} className="text-xs">
              {AUDIENCE_CONDITION_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {valueOptions ? (
        <Select
          value={condition.value}
          onValueChange={(val) => onChange({ value: val })}
        >
          <SelectTrigger className="h-7 text-[10px] w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {valueOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={condition.value}
          onChange={(e) => onChange({ value: e.target.value })}
          className="h-7 w-28 text-[10px]"
          placeholder="Value"
        />
      )}

      <button
        type="button"
        onClick={onRemove}
        className="rounded p-0.5 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Variants Editor ───

function VariantsEditor({
  config,
  onChange,
}: {
  config: PersonalizationConfig;
  onChange: (config: PersonalizationConfig) => void;
}) {
  const [expanded, setExpanded] = useState(config.enabled && config.variants.length > 0);

  const toggleEnabled = useCallback(
    (enabled: boolean) => {
      onChange({ ...config, enabled });
      if (enabled) setExpanded(true);
    },
    [config, onChange],
  );

  const addVariant = useCallback(() => {
    const label = `Variant ${config.variants.length + 1}`;
    onChange({
      ...config,
      enabled: true,
      variants: [...config.variants, createDefaultVariant(label)],
    });
    setExpanded(true);
  }, [config, onChange]);

  const removeVariant = useCallback(
    (index: number) => {
      const next = config.variants.filter((_, i) => i !== index);
      onChange({ ...config, variants: next, enabled: next.length > 0 });
    },
    [config, onChange],
  );

  const updateVariant = useCallback(
    (index: number, patch: Partial<PersonalizationVariant>) => {
      const next = config.variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
      onChange({ ...config, variants: next });
    },
    [config, onChange],
  );

  const duplicateVariant = useCallback(
    (index: number) => {
      const source = config.variants[index];
      if (!source) return;
      const copy: PersonalizationVariant = {
        ...source,
        id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        label: `${source.label} (copy)`,
        priority: source.priority + 1,
      };
      const next = [...config.variants];
      next.splice(index + 1, 0, copy);
      onChange({ ...config, variants: next });
    },
    [config, onChange],
  );

  return (
    <div className="rounded-xl border border-border/30 bg-background/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <div>
            <p className="text-xs font-medium text-foreground">Content variants</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {config.variants.length === 0
                ? "No variants — default content shown"
                : `${config.variants.length} variant${config.variants.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </button>
        <Switch checked={config.enabled} onCheckedChange={toggleEnabled} />
      </div>

      {expanded && config.enabled && (
        <div className="space-y-2 pt-1">
          {config.variants.map((variant, vi) => (
            <div
              key={variant.id}
              className="rounded-lg border border-border/20 bg-card/30 p-2 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <Input
                  value={variant.label}
                  onChange={(e) => updateVariant(vi, { label: e.target.value })}
                  className="h-6 text-[10px] font-medium flex-1"
                />
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => duplicateVariant(vi)}
                    className="rounded p-0.5 text-muted-foreground hover:text-primary"
                    title="Duplicate"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeVariant(vi)}
                    className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-[9px] text-muted-foreground">Priority</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={variant.priority}
                  onChange={(e) => updateVariant(vi, { priority: parseInt(e.target.value) || 10 })}
                  className="h-6 w-14 text-[10px]"
                />
              </div>

              <AudienceRulesEditor
                rules={variant.audienceRules}
                onChange={(next) => updateVariant(vi, { audienceRules: next })}
              />

              <div className="rounded-lg bg-primary/5 border border-primary/15 px-2 py-1.5">
                <p className="text-[9px] text-muted-foreground">
                  <Eye className="inline h-3 w-3 mr-1" />
                  Content overrides for this variant can be set in the Content tab after saving rules.
                </p>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-full gap-1 text-[10px]"
            onClick={addVariant}
          >
            <Plus className="h-3 w-3" /> Add variant
          </Button>
        </div>
      )}
    </div>
  );
}
