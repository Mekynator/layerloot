import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Undo2, Redo2, Plus, Monitor, Tablet, Smartphone,
  X, AlertCircle, Settings2, Trash2, ExternalLink, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVisualEditor, pageToEditorKey, pageDisplayTitle, pageToRealPath } from "@/contexts/VisualEditorContext";

interface EditorToolbarProps {
  onAddBlock: () => void;
  onPageSettings: () => void;
  onDeletePage: () => void;
}

export default function EditorToolbar({ onAddBlock, onPageSettings, onDeletePage }: EditorToolbarProps) {
  const navigate = useNavigate();
  const {
    activePage, setActivePage, selectedPage,
    frontendPages, globalPages,
    isDirty, save, saving, discardChanges,
    undo, redo, canUndo, canRedo,
    viewport, setViewport,
  } = useVisualEditor();

  const previewPath = selectedPage ? pageToRealPath(selectedPage) : "/";

  return (
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
            {/* Header & Footer editing reserved for future release */}
            {globalPages.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Global Sections</SelectLabel>
                {globalPages.map(p => (
                  <SelectItem key={p.id} value={pageToEditorKey(p)}>{pageDisplayTitle(p)}</SelectItem>
                ))}
              </SelectGroup>
            )}
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

      {/* Right section */}
      <div className="flex items-center gap-1.5">
        {isDirty && (
          <Badge variant="outline" className="gap-1 border-amber-500/50 bg-amber-500/10 text-amber-400 text-[10px]">
            <AlertCircle className="h-3 w-3" />
            Unsaved
          </Badge>
        )}

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

        <Button
          size="sm"
          onClick={() => void save()}
          disabled={!isDirty || saving}
          className="h-8 gap-1.5 text-xs font-display uppercase tracking-wider"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save"}
        </Button>

        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="h-8 w-8 text-muted-foreground">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
