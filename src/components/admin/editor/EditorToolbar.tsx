import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Undo2, Redo2, Plus, Monitor, Tablet, Smartphone,
  X, AlertCircle, Settings2, Trash2, ExternalLink, Eye, Upload, RotateCcw, CheckCircle2,
  History, Clock, ChevronDown, Globe, Paintbrush,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useVisualEditor, pageToEditorKey, pageDisplayTitle, pageToRealPath } from "@/contexts/VisualEditorContext";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import RevisionHistoryPanel from "@/components/admin/RevisionHistoryPanel";
import SchedulePublishDialog from "@/components/admin/SchedulePublishDialog";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type SupportedLanguage } from "@/lib/i18n";

interface EditorToolbarProps {
  onAddBlock: () => void;
  onPageSettings: () => void;
  onDeletePage: () => void;
  onBackgroundEditor?: () => void;
}

export default function EditorToolbar({ onAddBlock, onPageSettings, onDeletePage, onBackgroundEditor }: EditorToolbarProps) {
  const navigate = useNavigate();
  const {
    activePage, setActivePage, selectedPage,
    frontendPages, globalPages,
    isDirty, save, saving, discardChanges,
    publish, publishing, discardDraft, draftStatus,
    undo, redo, canUndo, canRedo,
    viewport, setViewport,
    schedulePublish, cancelSchedule, scheduledAt,
  } = useVisualEditor();

  const { hasPermission } = useAdminPermissions();
  const canPublish = hasPermission("content.publish");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const previewPath = selectedPage ? pageToRealPath(selectedPage) : "/";

  const statusBadge = () => {
    if (isDirty) {
      return (
        <Badge variant="outline" className="gap-1 border-amber-500/50 bg-amber-500/10 text-amber-400 text-[10px]">
          <AlertCircle className="h-3 w-3" /> Unsaved
        </Badge>
      );
    }
    if (draftStatus === "scheduled" && scheduledAt) {
      return (
        <Badge variant="outline" className="gap-1 border-blue-500/50 bg-blue-500/10 text-blue-400 text-[10px]">
          <Clock className="h-3 w-3" /> Scheduled {format(new Date(scheduledAt), "MMM d, HH:mm")}
        </Badge>
      );
    }
    if (draftStatus === "draft") {
      return (
        <Badge variant="outline" className="gap-1 border-blue-500/50 bg-blue-500/10 text-blue-400 text-[10px]">
          <Eye className="h-3 w-3" /> Draft
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-[10px]">
        <CheckCircle2 className="h-3 w-3" /> Published
      </Badge>
    );
  };

  return (
    <>
      <div className="flex h-12 items-center justify-between gap-2 border-b border-border/30 bg-card/95 px-3 backdrop-blur-xl">
        {/* Left section */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to Admin</TooltipContent>
          </Tooltip>

          <div className="h-5 w-px bg-border/30" />

          <Select
            value={activePage}
            onValueChange={(value) => {
              if (value === "__new__") { onPageSettings(); return; }
              if (value === "__header__") { setActivePage("global_header"); return; }
              if (value === "__footer__") { setActivePage("global_footer"); return; }
              setActivePage(value);
            }}
          >
            <SelectTrigger className="h-8 w-56 border-border/40 bg-background/50 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {frontendPages.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Pages</SelectLabel>
                  {frontendPages.map(p => (
                    <SelectItem key={p.id} value={pageToEditorKey(p)}>{pageDisplayTitle(p)}</SelectItem>
                  ))}
                </SelectGroup>
              )}
              {globalPages.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Global Sections</SelectLabel>
                  {globalPages.map(p => (
                    <SelectItem key={p.id} value={pageToEditorKey(p)}>{pageDisplayTitle(p)}</SelectItem>
                  ))}
                </SelectGroup>
              )}
              <SelectGroup>
                <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Global Slots</SelectLabel>
                {[
                  { key: "global_header_top", label: "Above Header" },
                  { key: "global_header_bottom", label: "Below Header" },
                  { key: "global_before_main", label: "Before Content" },
                  { key: "global_after_main", label: "After Content" },
                  { key: "global_footer_top", label: "Above Footer" },
                  { key: "global_footer_bottom", label: "Below Footer" },
                ].map(slot => (
                  <SelectItem key={slot.key} value={slot.key}>{slot.label}</SelectItem>
                ))}
              </SelectGroup>
              <SelectItem value="__new__" className="font-semibold text-primary">+ Create Page</SelectItem>
            </SelectContent>
          </Select>

          {selectedPage && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onPageSettings} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Page settings</TooltipContent>
              </Tooltip>
              {!selectedPage.is_home && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onDeletePage} className="h-8 w-8 text-destructive/70 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete page</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onBackgroundEditor} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Paintbrush className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Background settings</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Center section - viewport toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border/30 bg-background/50 p-0.5">
          {([
            { key: "desktop" as const, icon: Monitor, label: "Desktop" },
            { key: "tablet" as const, icon: Tablet, label: "Tablet" },
            { key: "mobile" as const, icon: Smartphone, label: "Mobile" },
          ]).map(({ key, icon: Icon, label }) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setViewport(key)}
                  className={`rounded-md p-1.5 transition-colors ${viewport === key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Locale preview switcher */}
        <Select defaultValue="en">
          <SelectTrigger className="h-8 w-32 border-border/30 bg-background/50 text-xs gap-1">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map(l => (
              <SelectItem key={l} value={l}>{LANGUAGE_LABELS[l]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Right section */}
        <div className="flex items-center gap-1.5">
          {statusBadge()}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} className="h-8 w-8">
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} className="h-8 w-8">
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>

          <div className="h-5 w-px bg-border/30" />

          <Button variant="outline" size="sm" onClick={onAddBlock} className="h-8 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Block
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setHistoryOpen(true)}>
                <History className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Revision History</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => window.open(previewPath, "_blank")}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open live page</TooltipContent>
          </Tooltip>

          {isDirty && (
            <Button variant="ghost" size="sm" onClick={discardChanges} className="h-8 text-xs text-muted-foreground">
              Discard
            </Button>
          )}

          {/* Save Draft */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void save()}
            disabled={!isDirty || saving}
            className="h-8 gap-1.5 text-xs"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Draft"}
          </Button>

          {/* Discard Draft (revert to published) */}
          {draftStatus === "draft" && !isDirty && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void discardDraft()}
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Revert
                </Button>
              </TooltipTrigger>
              <TooltipContent>Discard draft and revert to published version</TooltipContent>
            </Tooltip>
          )}

          {/* Publish dropdown */}
          {canPublish ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  disabled={publishing || (draftStatus === "published" && !isDirty)}
                  className="h-8 gap-1.5 text-xs font-display uppercase tracking-wider"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {publishing ? "Publishing..." : "Publish"}
                  <ChevronDown className="h-3 w-3 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void publish()}>
                  <Upload className="h-3.5 w-3.5 mr-2" /> Publish Now
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setScheduleOpen(true)}>
                  <Clock className="h-3.5 w-3.5 mr-2" /> Schedule Publish
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              disabled
              title="You don't have publishing permission"
              className="h-8 gap-1.5 text-xs font-display uppercase tracking-wider"
            >
              <Upload className="h-3.5 w-3.5" /> Publish
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="h-8 w-8 text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <RevisionHistoryPanel
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        contentType="site_block"
        page={activePage}
        onRevisionRestored={() => window.location.reload()}
      />

      <SchedulePublishDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSchedule={(date) => void schedulePublish(date)}
        onPublishNow={() => void publish()}
        currentSchedule={scheduledAt ? new Date(scheduledAt) : null}
        onCancelSchedule={() => void cancelSchedule()}
      />
    </>
  );
}
