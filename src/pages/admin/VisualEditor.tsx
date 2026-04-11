import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { VisualEditorProvider, useVisualEditor, pageDisplayTitle } from "@/contexts/VisualEditorContext";
import EditorToolbar from "@/components/admin/editor/EditorToolbar";
import LayersPanel from "@/components/admin/editor/LayersPanel";
import type { PreviewPersona } from "@/lib/personalization";
import { useExperimentAdmin } from "@/hooks/use-experiment-admin";
import EditorCanvas from "@/components/admin/editor/EditorCanvas";
import SettingsPanel from "@/components/admin/editor/SettingsPanel";
import AddBlockDialog from "@/components/admin/editor/AddBlockDialog";
import PageManagerDialog from "@/components/admin/editor/PageManagerDialog";
import PageBackgroundEditor from "@/components/admin/PageBackgroundEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

function EditorInner() {
  const navigate = useNavigate();
  const { isAdmin, loading, user } = useAuth();
  const { selectedPage, loadPages, setActivePage, activePage, pages, isDirty, save, undo, redo, viewport } = useVisualEditor();

  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [pageDialogMode, setPageDialogMode] = useState<"create" | "edit">("create");
  const [deletePageOpen, setDeletePageOpen] = useState(false);
  const [bgEditorOpen, setBgEditorOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewPersona, setPreviewPersona] = useState<PreviewPersona | null>(null);
  const { experiments } = useExperimentAdmin();

  const activeExperimentCount = experiments.filter((e) => e.status === "running").length;

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/");
  }, [isAdmin, loading, user, navigate]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);


  

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void save();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save, undo, redo]);

  // Warn on unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleDeletePage = async () => {
    if (!selectedPage || selectedPage.is_home) return;
    const pageKey = selectedPage.slug;

    await supabase.from("site_blocks").delete().eq("page", pageKey);
    const { error } = await supabase.from("site_pages").delete().eq("id", selectedPage.id);
    if (error) { toast.error(error.message); return; }

    setDeletePageOpen(false);
    await loadPages();
    const next = pages.find(p => p.id !== selectedPage.id && p.is_home) || pages.find(p => p.id !== selectedPage.id);
    if (next) setActivePage(next.slug === "home" || next.is_home ? "home" : next.full_path.replace(/^\/+|\/+$/g, ""));
    toast.success("Page deleted");
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_40%),linear-gradient(180deg,rgba(2,6,23,0.04),transparent_40%)] bg-background">
      <EditorToolbar
        onAddBlock={() => setAddBlockOpen(true)}
        onPageSettings={() => {
          setPageDialogMode(selectedPage ? "edit" : "create");
          setPageDialogOpen(true);
        }}
        onDeletePage={() => setDeletePageOpen(true)}
        onBackgroundEditor={() => setBgEditorOpen(true)}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onToggleLeftPanel={() => setLeftPanelOpen((value) => !value)}
        onToggleRightPanel={() => setRightPanelOpen((value) => !value)}
        previewMode={previewMode}
        onTogglePreview={() => setPreviewMode((value) => !value)}
        zoom={canvasZoom}
        onZoomIn={() => setCanvasZoom((value) => Math.min(value + 10, 150))}
        onZoomOut={() => setCanvasZoom((value) => Math.max(value - 10, 50))}
        onResetZoom={() => setCanvasZoom(100)}
        onSetZoom={(value) => setCanvasZoom(Math.max(50, Math.min(value, 150)))}
        onFitZoom={() => setCanvasZoom(viewport === "desktop" ? 80 : viewport === "tablet" ? 95 : 110)}
        previewPersona={previewPersona}
        onSetPreviewPersona={setPreviewPersona}
        activeExperimentCount={activeExperimentCount}
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {leftPanelOpen && (
          <>
            <ResizablePanel defaultSize={18} minSize={12} maxSize={28} className="min-w-0">
              <LayersPanel onAddBlock={() => setAddBlockOpen(true)} />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        <ResizablePanel defaultSize={leftPanelOpen && rightPanelOpen ? 56 : 72} minSize={30} className="min-w-0">
          <EditorCanvas zoom={canvasZoom} previewMode={previewMode} />
        </ResizablePanel>

        {rightPanelOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={26} minSize={18} maxSize={40} className="min-w-0">
              <SettingsPanel />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <AddBlockDialog open={addBlockOpen} onOpenChange={setAddBlockOpen} />

      <PageManagerDialog
        open={pageDialogOpen}
        onOpenChange={setPageDialogOpen}
        mode={pageDialogMode}
      />

      <Dialog open={deletePageOpen} onOpenChange={setDeletePageOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Delete Page</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete "{selectedPage ? pageDisplayTitle(selectedPage) : ""}" and all its blocks.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeletePageOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={() => void handleDeletePage()} className="flex-1 font-display uppercase">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <PageBackgroundEditor
        page={activePage}
        open={bgEditorOpen}
        onOpenChange={setBgEditorOpen}
      />
    </div>
  );
}

export default function VisualEditor() {
  return (
    <VisualEditorProvider>
      <EditorInner />
    </VisualEditorProvider>
  );
}
