import { useState } from "react";
import { Save, Upload, Undo2, Eye, Clock, History, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { DraftStatus } from "@/hooks/use-draft-publish";
import RevisionHistoryPanel from "@/components/admin/RevisionHistoryPanel";
import SchedulePublishDialog from "@/components/admin/SchedulePublishDialog";

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
  // Scheduling
  scheduledAt?: Date | null;
  onSchedule?: (date: Date) => void;
  onCancelSchedule?: () => void;
  // History
  historyContentType?: string;
  historyContentId?: string;
  historyPage?: string;
  onRevisionRestored?: () => void;
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
  canPublish = true,
  className = "",
  scheduledAt,
  onSchedule,
  onCancelSchedule,
  historyContentType,
  historyContentId,
  historyPage,
  onRevisionRestored,
}: DraftActionBarProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const hasDraft = status === "draft" || status === "unpublished_changes" || status === "scheduled";
  const statusLabel = dirty ? "Unsaved changes"
    : status === "scheduled" && scheduledAt ? `Scheduled ${format(scheduledAt, "MMM d, HH:mm")}`
    : hasDraft ? "Draft" : "Published";
  const statusVariant = dirty ? "destructive" : status === "scheduled" ? "secondary" : hasDraft ? "secondary" : "outline";

  const showHistory = historyContentType && (historyContentId || historyPage);

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <Badge variant={statusVariant as any} className="text-[10px] uppercase tracking-wider">
          {status === "scheduled" && <Clock className="mr-1 h-3 w-3" />}
          {statusLabel}
        </Badge>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {hasDraft && (
            <Button variant="ghost" size="sm" onClick={onDiscard} disabled={disabled || saving || publishing}
              className="text-xs text-muted-foreground hover:text-destructive">
              <Undo2 className="mr-1 h-3.5 w-3.5" /> Discard Draft
            </Button>
          )}

          {showHistory && (
            <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)} disabled={disabled}
              className="text-xs text-muted-foreground">
              <History className="mr-1 h-3.5 w-3.5" /> History
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

          {canPublish && onSchedule ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm"
                  disabled={disabled || publishing || (!dirty && !hasDraft)}
                  className="font-display text-xs uppercase tracking-wider">
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  {publishing ? "Publishing..." : "Publish"}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onPublish}>
                  <Upload className="h-3.5 w-3.5 mr-2" /> Publish Now
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setScheduleOpen(true)}>
                  <Clock className="h-3.5 w-3.5 mr-2" /> Schedule Publish
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={onPublish}
              disabled={disabled || publishing || !canPublish || (!dirty && !hasDraft)}
              title={!canPublish ? "You don't have publishing permission" : undefined}
              className="font-display text-xs uppercase tracking-wider">
              <Upload className="mr-1 h-3.5 w-3.5" />
              {publishing ? "Publishing..." : "Publish"}
            </Button>
          )}
        </div>
      </div>

      {showHistory && (
        <RevisionHistoryPanel
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          contentType={historyContentType!}
          contentId={historyContentId}
          page={historyPage}
          onRevisionRestored={onRevisionRestored}
        />
      )}

      {onSchedule && (
        <SchedulePublishDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          onSchedule={onSchedule}
          onPublishNow={onPublish}
          currentSchedule={scheduledAt}
          onCancelSchedule={onCancelSchedule}
        />
      )}
    </>
  );
}
