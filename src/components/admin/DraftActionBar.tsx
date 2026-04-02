import { Save, Upload, Undo2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DraftStatus } from "@/hooks/use-draft-publish";

interface DraftActionBarProps {
  status: DraftStatus;
  dirty?: boolean;
  saving?: boolean;
  publishing?: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onDiscard: () => void;
  onPreview?: () => void;
  disabled?: boolean;
  canPublish?: boolean;
  className?: string;
}

export default function DraftActionBar({
  status,
  dirty,
  saving,
  publishing,
  onSaveDraft,
  onPublish,
  onDiscard,
  onPreview,
  disabled,
  className = "",
}: DraftActionBarProps) {
  const hasDraft = status === "draft" || status === "unpublished_changes";
  const statusLabel = dirty ? "Unsaved changes" : hasDraft ? "Draft" : "Published";
  const statusVariant = dirty ? "destructive" : hasDraft ? "secondary" : "outline";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Badge variant={statusVariant as any} className="text-[10px] uppercase tracking-wider">
        {statusLabel}
      </Badge>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {hasDraft && (
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={disabled || saving || publishing}
            className="text-xs text-muted-foreground hover:text-destructive">
            <Undo2 className="mr-1 h-3.5 w-3.5" /> Discard Draft
          </Button>
        )}

        {onPreview && (
          <Button variant="outline" size="sm" onClick={onPreview} disabled={disabled}
            className="text-xs">
            <Eye className="mr-1 h-3.5 w-3.5" /> Preview
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onSaveDraft}
          disabled={disabled || saving || publishing || (!dirty && !hasDraft)}
          className="font-display text-xs uppercase tracking-wider">
          <Save className="mr-1 h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save Draft"}
        </Button>

        <Button size="sm" onClick={onPublish}
          disabled={disabled || publishing || (!dirty && !hasDraft)}
          className="font-display text-xs uppercase tracking-wider">
          <Upload className="mr-1 h-3.5 w-3.5" />
          {publishing ? "Publishing..." : "Publish"}
        </Button>
      </div>
    </div>
  );
}
