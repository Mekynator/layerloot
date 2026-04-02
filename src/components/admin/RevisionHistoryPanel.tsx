import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { History, RotateCcw, Upload, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { revertToRevision } from "@/hooks/use-draft-publish";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { toast } from "sonner";

export interface RevisionRecord {
  id: string;
  content_type: string;
  content_id: string;
  page: string | null;
  revision_data: any;
  revision_number: number;
  action: string;
  created_by: string | null;
  created_at: string;
  change_summary: string | null;
  restored_from_revision_id: string | null;
}

interface RevisionHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: string;
  contentId?: string;
  page?: string;
  onRevisionRestored?: () => void;
}

export async function loadRevisions(contentType: string, contentId: string): Promise<RevisionRecord[]> {
  const { data, error } = await supabase
    .from("content_revisions")
    .select("*")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .order("revision_number", { ascending: false })
    .limit(50);
  if (error) { toast.error(`Failed to load revisions: ${error.message}`); return []; }
  return (data ?? []) as any as RevisionRecord[];
}

export async function loadPageRevisions(page: string): Promise<RevisionRecord[]> {
  const { data, error } = await supabase
    .from("content_revisions")
    .select("*")
    .eq("page", page)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) { toast.error(`Failed to load revisions: ${error.message}`); return []; }
  return (data ?? []) as any as RevisionRecord[];
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  publish: { label: "Published", color: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" },
  revert: { label: "Reverted", color: "border-amber-500/50 bg-amber-500/10 text-amber-400" },
  delete: { label: "Deleted", color: "border-destructive/50 bg-destructive/10 text-destructive" },
  schedule: { label: "Scheduled", color: "border-blue-500/50 bg-blue-500/10 text-blue-400" },
  auto_publish: { label: "Auto-Published", color: "border-purple-500/50 bg-purple-500/10 text-purple-400" },
};

export default function RevisionHistoryPanel({
  open, onOpenChange, contentType, contentId, page, onRevisionRestored,
}: RevisionHistoryPanelProps) {
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<string>("all");
  const { hasPermission } = useAdminPermissions();
  const canPublish = hasPermission("content.publish");

  const load = useCallback(async () => {
    setLoading(true);
    let result: RevisionRecord[];
    if (contentId) {
      result = await loadRevisions(contentType, contentId);
    } else if (page) {
      result = await loadPageRevisions(page);
    } else {
      result = [];
    }
    setRevisions(result);
    setLoading(false);
  }, [contentType, contentId, page]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleRestoreAsDraft = async (rev: RevisionRecord) => {
    const ok = await revertToRevision(rev.content_type, rev.content_id, rev.revision_number, undefined, true);
    if (ok) {
      toast.success(`Revision #${rev.revision_number} restored as draft`);
      onRevisionRestored?.();
      void load();
    }
  };

  const handleRestoreAndPublish = async (rev: RevisionRecord) => {
    const ok = await revertToRevision(rev.content_type, rev.content_id, rev.revision_number);
    if (ok) {
      toast.success(`Revision #${rev.revision_number} restored and published`);
      onRevisionRestored?.();
      void load();
    }
  };

  const filtered = filterAction === "all" ? revisions : revisions.filter(r => r.action === filterAction);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] bg-card border-border/30">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display uppercase tracking-wider text-sm">
            <History className="h-4 w-4" /> Revision History
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="publish">Published</SelectItem>
              <SelectItem value="revert">Reverted</SelectItem>
              <SelectItem value="delete">Deleted</SelectItem>
              <SelectItem value="schedule">Scheduled</SelectItem>
              <SelectItem value="auto_publish">Auto-Published</SelectItem>
            </SelectContent>
          </Select>

          <ScrollArea className="h-[calc(100vh-180px)]">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No revisions found</div>
            ) : (
              <div className="space-y-2 pr-3">
                {filtered.map((rev, idx) => {
                  const actionInfo = ACTION_LABELS[rev.action] ?? { label: rev.action, color: "border-muted" };
                  return (
                    <div key={rev.id} className="rounded-lg border border-border/30 bg-background/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">#{rev.revision_number}</span>
                          <Badge variant="outline" className={`text-[10px] ${actionInfo.color}`}>
                            {actionInfo.label}
                          </Badge>
                          {idx === 0 && rev.action === "publish" && (
                            <Badge variant="outline" className="text-[10px] border-primary/50 bg-primary/10 text-primary">
                              Current
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(rev.created_at), "MMM d, yyyy HH:mm")}
                      </div>

                      {rev.change_summary && (
                        <p className="text-xs text-muted-foreground">{rev.change_summary}</p>
                      )}

                      {rev.restored_from_revision_id && (
                        <p className="text-[10px] text-amber-400">Restored from earlier revision</p>
                      )}

                      <div className="flex gap-1.5 pt-1">
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1"
                          onClick={() => handleRestoreAsDraft(rev)}>
                          <RotateCcw className="h-3 w-3" /> Restore as Draft
                        </Button>
                        {canPublish && (
                          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1"
                            onClick={() => handleRestoreAndPublish(rev)}>
                            <Upload className="h-3 w-3" /> Restore & Publish
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
