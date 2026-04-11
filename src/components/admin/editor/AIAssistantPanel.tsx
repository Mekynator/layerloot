import { useState, useCallback } from "react";
import {
  Sparkles,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAIContent } from "@/hooks/use-ai-content";
import {
  CONTENT_TONE_LABELS,
  CONTENT_PURPOSE_LABELS,
  type ContentTone,
  type ContentPurpose,
} from "@/lib/ai-engine";
import { cn } from "@/lib/utils";

interface AIAssistantPanelProps {
  content: Record<string, unknown>;
  patchContent: (key: string, value: unknown) => void;
  blockType?: string;
  blockTitle?: string;
}

/**
 * AI Assistant panel for the editor settings sidebar.
 * Provides content generation, improvements, and CTA optimization.
 * Does NOT auto-apply — user must confirm every suggestion.
 */
export default function AIAssistantPanel({
  content,
  patchContent,
  blockType,
  blockTitle,
}: AIAssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [purpose, setPurpose] = useState<ContentPurpose>("heading");
  const [targetField, setTargetField] = useState<string>("heading");
  const [customContext, setCustomContext] = useState("");
  const { generate, regenerate, pickAlternate, result, allVariations, tone, setTone, isGenerating } = useAIContent();

  // Detect editable text fields from content
  const textFields = getTextFields(content);

  const handleGenerate = useCallback(() => {
    const currentText = typeof content[targetField] === "string"
      ? (content[targetField] as string)
      : undefined;

    generate({
      purpose,
      tone,
      context: {
        productName: typeof content.productName === "string" ? content.productName : undefined,
        categoryName: typeof content.categoryName === "string" ? content.categoryName : undefined,
        currentText,
        targetAudience: customContext || undefined,
      },
    });
  }, [generate, purpose, tone, content, targetField, customContext]);

  const handleApply = useCallback((text: string) => {
    patchContent(targetField, text);
  }, [patchContent, targetField]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
            isOpen
              ? "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
              : "border-border/40 bg-background/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            AI Assistant
          </span>
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-3 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
        {/* Target Field */}
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Target Field</Label>
          <Select value={targetField} onValueChange={setTargetField}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {textFields.map((field) => (
                <SelectItem key={field.key} value={field.key} className="text-xs">
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content Purpose */}
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Content Type</Label>
          <Select value={purpose} onValueChange={(v) => setPurpose(v as ContentPurpose)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(CONTENT_PURPOSE_LABELS) as [ContentPurpose, string][]).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tone */}
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tone</Label>
          <Select value={tone} onValueChange={(v) => setTone(v as ContentTone)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(CONTENT_TONE_LABELS) as [ContentTone, string][]).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Extra Context */}
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Extra Context (optional)</Label>
          <Textarea
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            placeholder="e.g. target audience, product details..."
            className="h-14 resize-none text-xs"
          />
        </div>

        {/* Generate Button */}
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full gap-2 bg-violet-600 text-white hover:bg-violet-700"
        >
          {isGenerating ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Wand2 className="h-3 w-3" />
          )}
          {isGenerating ? "Generating..." : "Generate Content"}
        </Button>

        {/* Results */}
        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Suggestions</Label>
              <Button variant="ghost" size="sm" onClick={regenerate} className="h-5 gap-1 px-1.5 text-[10px]">
                <RefreshCw className="h-2.5 w-2.5" />
                Regenerate
              </Button>
            </div>

            {allVariations.map((text, idx) => (
              <div
                key={`${result.id}-${idx}`}
                className={cn(
                  "group relative rounded-md border p-2 text-xs transition-colors",
                  idx === 0
                    ? "border-violet-500/40 bg-violet-500/10"
                    : "border-border/40 bg-background/40 hover:border-violet-500/30"
                )}
              >
                <p className="pr-14 leading-relaxed">{text}</p>
                <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleApply(text)}
                    className="h-5 gap-1 px-1.5 text-[10px] text-emerald-600 hover:text-emerald-700"
                    title="Apply to field"
                  >
                    <Check className="h-2.5 w-2.5" />
                    Apply
                  </Button>
                </div>
                {idx === 0 && (
                  <Badge variant="secondary" className="absolute right-1.5 bottom-1.5 text-[8px]">
                    Primary
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Current field value preview */}
        {content[targetField] && typeof content[targetField] === "string" && (
          <div className="rounded-md border border-dashed border-border/40 p-2">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Current Value</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{String(content[targetField]).slice(0, 120)}{String(content[targetField]).length > 120 ? "..." : ""}</p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Helpers ───

interface TextField {
  key: string;
  label: string;
}

function getTextFields(content: Record<string, unknown>): TextField[] {
  const fields: TextField[] = [];
  const common = [
    { key: "heading", label: "Heading" },
    { key: "subheading", label: "Subheading" },
    { key: "title", label: "Title" },
    { key: "subtitle", label: "Subtitle" },
    { key: "description", label: "Description" },
    { key: "buttonText", label: "Button Text" },
    { key: "ctaText", label: "CTA Text" },
    { key: "ctaLabel", label: "CTA Label" },
    { key: "badge", label: "Badge" },
    { key: "badgeText", label: "Badge Text" },
    { key: "label", label: "Label" },
    { key: "caption", label: "Caption" },
    { key: "body", label: "Body" },
    { key: "text", label: "Text" },
  ];

  for (const field of common) {
    if (field.key in content) {
      fields.push(field);
    }
  }

  // If no common fields found, scan for string values
  if (fields.length === 0) {
    for (const [key, value] of Object.entries(content)) {
      if (typeof value === "string" && value.length > 0 && !key.startsWith("_") && key !== "anchorId" && key !== "customClassName") {
        fields.push({
          key,
          label: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        });
      }
    }
  }

  return fields.slice(0, 10); // Cap at 10 fields
}
