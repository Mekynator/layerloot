import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, X, Trash2, ArrowLeft, FileText, Square, Type, Image, Columns,
  PlayCircle, MousePointer, Link2, Code, Globe, Mail, LayoutGrid, Eye, EyeOff,
  GripVertical, Monitor, Smartphone, Tablet, PanelLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";
import EditableBlockWrapper from "@/components/admin/EditableBlockWrapper";
import BlockEditorPanel from "@/components/admin/BlockEditorPanel";
import NavLinkEditor from "@/components/admin/NavLinkEditor";

const defaultPages = ["home", "products", "contact", "about", "faq", "shipping-info", "returns"];

const blockTypes = [
  { value: "hero", label: "Hero Banner", icon: Square },
  { value: "text", label: "Text Block", icon: Type },
  { value: "image", label: "Image Block", icon: Image },
  { value: "carousel", label: "Image Carousel", icon: Columns },
  { value: "video", label: "Video Section", icon: PlayCircle },
  { value: "banner", label: "Promo Banner", icon: Square },
  { value: "cta", label: "Call to Action", icon: MousePointer },
  { value: "button", label: "Button with Link", icon: Link2 },
  { value: "spacer", label: "Spacer", icon: Square },
  { value: "html", label: "Custom HTML", icon: Code },
  { value: "embed", label: "Embed / iFrame", icon: Globe },
  { value: "newsletter", label: "Newsletter Form", icon: Mail },
];

const BLOCK_COLORS: Record<string, string> = {
  hero: "bg-primary/15 border-primary/40",
  text: "bg-blue-500/10 border-blue-500/30",
  image: "bg-green-500/10 border-green-500/30",
  carousel: "bg-purple-500/10 border-purple-500/30",
  video: "bg-red-500/10 border-red-500/30",
  banner: "bg-amber-500/10 border-amber-500/30",
  cta: "bg-emerald-500/10 border-emerald-500/30",
  button: "bg-cyan-500/10 border-cyan-500/30",
  spacer: "bg-muted border-border",
  html: "bg-orange-500/10 border-orange-500/30",
  embed: "bg-indigo-500/10 border-indigo-500/30",
  newsletter: "bg-pink-500/10 border-pink-500/30",
};

const BLOCK_HEIGHTS: Record<string, string> = {
  hero: "h-20",
  text: "h-10",
  image: "h-14",
  carousel: "h-16",
  video: "h-16",
  banner: "h-6",
  cta: "h-14",
  button: "h-8",
  spacer: "h-4",
  html: "h-10",
  embed: "h-14",
  newsletter: "h-12",
};

const PageEditor = () => {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activePage, setActivePage] = useState("home");
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [allPages, setAllPages] = useState<string[]>(defaultPages);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [newPageSlug, setNewPageSlug] = useState("");
  const [deletePageOpen, setDeletePageOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "layout">("preview");
  const [layoutDragIndex, setLayoutDragIndex] = useState<number | null>(null);
  const [layoutDragOverIndex, setLayoutDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/");
  }, [isAdmin, loading, user, navigate]);

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "custom_pages").single()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          const customSlugs = (data.value as any[]).map((p: any) => p.slug);
          setAllPages([...defaultPages, ...customSlugs.filter((s: string) => !defaultPages.includes(s))]);
        }
      });
  }, []);

  const fetchBlocks = async () => {
    const { data } = await supabase.from("site_blocks").select("*").eq("page", activePage).order("sort_order");
    setBlocks((data as SiteBlock[]) ?? []);
  };

  useEffect(() => { fetchBlocks(); }, [activePage]);

  const pageBlocks = blocks.filter(b => b.page === activePage).sort((a, b) => a.sort_order - b.sort_order);
  const selectedBlock = pageBlocks.find(b => b.id === selectedBlockId) || null;

  // CRUD
  const addBlock = async (type: string) => {
    const sortOrder = insertAtIndex !== null
      ? insertAtIndex
      : pageBlocks.length > 0 ? Math.max(...pageBlocks.map(b => b.sort_order)) + 1 : 0;

    if (insertAtIndex !== null) {
      const toShift = pageBlocks.filter(b => b.sort_order >= sortOrder);
      await Promise.all(toShift.map(b =>
        supabase.from("site_blocks").update({ sort_order: b.sort_order + 1 }).eq("id", b.id)
      ));
    }

    const { error } = await supabase.from("site_blocks").insert({
      page: activePage,
      block_type: type,
      title: type.charAt(0).toUpperCase() + type.slice(1),
      content: {},
      sort_order: sortOrder,
      is_active: true,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Block added" });
    setAddBlockOpen(false);
    setInsertAtIndex(null);
    fetchBlocks();
  };

  const deleteBlock = async (id: string) => {
    await supabase.from("site_blocks").delete().eq("id", id);
    setSelectedBlockId(null);
    setEditPanelOpen(false);
    toast({ title: "Block deleted" });
    fetchBlocks();
  };

  const duplicateBlock = async (b: SiteBlock) => {
    const maxOrder = pageBlocks.length > 0 ? Math.max(...pageBlocks.map(bl => bl.sort_order)) + 1 : 0;
    await supabase.from("site_blocks").insert({
      page: b.page, block_type: b.block_type, title: (b.title ?? "") + " (copy)",
      content: b.content, sort_order: maxOrder, is_active: b.is_active ?? true,
    });
    toast({ title: "Block duplicated" });
    fetchBlocks();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("site_blocks").update({ is_active: active }).eq("id", id);
    fetchBlocks();
  };

  const moveBlock = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= pageBlocks.length) return;
    const a = pageBlocks[index];
    const b = pageBlocks[swapIndex];
    await Promise.all([
      supabase.from("site_blocks").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("site_blocks").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    fetchBlocks();
  };

  // Drag & Drop for live preview
  const handleDragEnd = async () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const reordered = [...pageBlocks];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dragOverIndex, 0, moved);
      await Promise.all(reordered.map((b, i) =>
        supabase.from("site_blocks").update({ sort_order: i }).eq("id", b.id)
      ));
      fetchBlocks();
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Drag & Drop for layout panel
  const handleLayoutDragEnd = async () => {
    if (layoutDragIndex !== null && layoutDragOverIndex !== null && layoutDragIndex !== layoutDragOverIndex) {
      const reordered = [...pageBlocks];
      const [moved] = reordered.splice(layoutDragIndex, 1);
      reordered.splice(layoutDragOverIndex, 0, moved);
      await Promise.all(reordered.map((b, i) =>
        supabase.from("site_blocks").update({ sort_order: i }).eq("id", b.id)
      ));
      toast({ title: "Layout updated" });
      fetchBlocks();
    }
    setLayoutDragIndex(null);
    setLayoutDragOverIndex(null);
  };

  // Page management
  const createPage = async () => {
    const slug = newPageSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    if (!slug) return;
    const updated = [...allPages.filter(p => !defaultPages.includes(p)).map(s => ({ slug: s, title: s })), { slug, title: newPageSlug }];
    await supabase.from("site_settings").upsert({ key: "custom_pages", value: updated as any }, { onConflict: "key" });
    setAllPages([...defaultPages, ...updated.map(p => p.slug)]);
    setActivePage(slug);
    setNewPageOpen(false);
    setNewPageSlug("");
    toast({ title: "Page created" });
  };

  const deletePage = async () => {
    await supabase.from("site_blocks").delete().eq("page", activePage);
    const customPages = allPages.filter(p => !defaultPages.includes(p) && p !== activePage);
    await supabase.from("site_settings").upsert({ key: "custom_pages", value: customPages.map(s => ({ slug: s, title: s })) as any }, { onConflict: "key" });
    setAllPages([...defaultPages, ...customPages]);
    setActivePage("home");
    setDeletePageOpen(false);
    toast({ title: "Page deleted" });
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen">
      {/* Admin Toolbar */}
      <div className="sticky top-16 z-40 border-b border-border bg-foreground text-background">
        <div className="container flex h-12 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-background/70 hover:text-background hover:bg-background/10">
              <ArrowLeft className="mr-1 h-4 w-4" /> Admin
            </Button>
            <div className="h-5 w-px bg-background/20" />
            <Select value={activePage} onValueChange={(v) => { if (v === "__new__") { setNewPageOpen(true); } else { setActivePage(v); setSelectedBlockId(null); } }}>
              <SelectTrigger className="w-40 border-background/20 bg-background/10 text-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allPages.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                <SelectItem value="__new__" className="text-primary font-semibold">+ Create Page</SelectItem>
              </SelectContent>
            </Select>
            {!defaultPages.includes(activePage) && (
              <Button variant="ghost" size="sm" onClick={() => setDeletePageOpen(true)} className="text-destructive hover:text-destructive/80 hover:bg-destructive/10">
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete Page
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-md border border-background/20 overflow-hidden">
              <button
                onClick={() => setViewMode("preview")}
                className={`px-2.5 py-1 text-xs font-display uppercase tracking-wider transition-colors ${
                  viewMode === "preview" ? "bg-primary text-primary-foreground" : "text-background/60 hover:text-background"
                }`}
              >
                <Monitor className="inline mr-1 h-3.5 w-3.5" /> Preview
              </button>
              <button
                onClick={() => setViewMode("layout")}
                className={`px-2.5 py-1 text-xs font-display uppercase tracking-wider transition-colors ${
                  viewMode === "layout" ? "bg-primary text-primary-foreground" : "text-background/60 hover:text-background"
                }`}
              >
                <LayoutGrid className="inline mr-1 h-3.5 w-3.5" /> Layout
              </button>
            </div>
            <NavLinkEditor />
            <Button size="sm" onClick={() => { setInsertAtIndex(null); setAddBlockOpen(true); }} className="font-display text-xs uppercase tracking-wider">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Block
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-background/70 hover:text-background hover:bg-background/10">
              <X className="mr-1 h-4 w-4" /> Exit
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === "preview" ? (
        /* ─── Live Preview Mode ─── */
        <div className="pb-16">
          {pageBlocks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32">
              <FileText className="mb-4 h-16 w-16 text-muted-foreground/30" />
              <p className="font-display text-lg uppercase text-muted-foreground">Empty Page</p>
              <p className="mt-1 text-sm text-muted-foreground">Click "Add Block" to start building</p>
              <Button className="mt-4" onClick={() => { setInsertAtIndex(null); setAddBlockOpen(true); }}>
                <Plus className="mr-1 h-4 w-4" /> Add First Block
              </Button>
            </div>
          )}

          {pageBlocks.map((block, index) => (
            <EditableBlockWrapper
              key={block.id}
              block={block}
              index={index}
              total={pageBlocks.length}
              isSelected={selectedBlockId === block.id}
              isDragOver={dragOverIndex === index}
              onSelect={() => setSelectedBlockId(block.id === selectedBlockId ? null : block.id)}
              onEdit={() => { setSelectedBlockId(block.id); setEditPanelOpen(true); }}
              onDelete={() => deleteBlock(block.id)}
              onDuplicate={() => duplicateBlock(block)}
              onToggleActive={() => toggleActive(block.id, !(block.is_active ?? true))}
              onMoveUp={() => moveBlock(index, "up")}
              onMoveDown={() => moveBlock(index, "down")}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
              onDragEnd={handleDragEnd}
              onInsertBefore={() => { setInsertAtIndex(index > 0 ? pageBlocks[index - 1].sort_order + 1 : 0); setAddBlockOpen(true); }}
            >
              {renderBlock(block, true)}
            </EditableBlockWrapper>
          ))}

          {pageBlocks.length > 0 && (
            <div
              className="flex h-12 items-center justify-center opacity-0 transition-opacity hover:opacity-100"
              onClick={() => { setInsertAtIndex(null); setAddBlockOpen(true); }}
            >
              <div className="flex h-0.5 flex-1 bg-primary/30" />
              <button className="mx-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Plus className="h-4 w-4" />
              </button>
              <div className="flex h-0.5 flex-1 bg-primary/30" />
            </div>
          )}
        </div>
      ) : (
        /* ─── Layout Overview Mode ─── */
        <div className="container max-w-4xl py-8">
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold uppercase text-foreground">
              Page Layout — <span className="text-primary capitalize">{activePage}</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Drag sections to reorder. Toggle visibility. Changes save automatically.
            </p>
          </div>

          {pageBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-lg border-2 border-dashed border-border">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="font-display text-sm uppercase text-muted-foreground">No sections on this page</p>
              <Button className="mt-4" onClick={() => { setInsertAtIndex(null); setAddBlockOpen(true); }}>
                <Plus className="mr-1 h-4 w-4" /> Add First Section
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {pageBlocks.map((block, index) => {
                const blockType = blockTypes.find(bt => bt.value === block.block_type);
                const Icon = blockType?.icon ?? Square;
                const colorClass = BLOCK_COLORS[block.block_type] ?? "bg-muted border-border";
                const heightClass = BLOCK_HEIGHTS[block.block_type] ?? "h-10";

                return (
                  <div key={block.id}>
                    {/* Drop zone indicator */}
                    {layoutDragOverIndex === index && layoutDragIndex !== index && (
                      <div className="h-1 rounded bg-primary mb-1" />
                    )}

                    <div
                      draggable
                      onDragStart={() => setLayoutDragIndex(index)}
                      onDragOver={(e) => { e.preventDefault(); setLayoutDragOverIndex(index); }}
                      onDragEnd={handleLayoutDragEnd}
                      onClick={() => setSelectedBlockId(block.id === selectedBlockId ? null : block.id)}
                      className={`group flex items-stretch gap-0 rounded-lg border overflow-hidden transition-all cursor-pointer ${
                        selectedBlockId === block.id ? "ring-2 ring-primary ring-offset-1" : "hover:ring-1 hover:ring-border"
                      } ${!block.is_active ? "opacity-50" : ""}`}
                    >
                      {/* Drag Handle */}
                      <div className="flex w-10 shrink-0 items-center justify-center bg-muted/50 border-r border-border cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>

                      {/* Visual Preview Bar */}
                      <div className={`flex-1 ${colorClass} ${heightClass} flex items-center px-4 gap-3`}>
                        <Icon className="h-4 w-4 shrink-0 text-foreground/60" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-xs font-semibold uppercase tracking-wider text-foreground">
                              {blockType?.label ?? block.block_type}
                            </span>
                            {block.title && block.title !== block.block_type.charAt(0).toUpperCase() + block.block_type.slice(1) && (
                              <span className="text-xs text-muted-foreground truncate">— {block.title}</span>
                            )}
                          </div>
                        </div>
                        {!block.is_active && (
                          <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
                            Hidden
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono">#{index + 1}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex shrink-0 items-center gap-1 bg-card px-2 border-l border-border">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleActive(block.id, !(block.is_active ?? true)); }}
                          className="rounded p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          title={block.is_active ? "Hide section" : "Show section"}
                        >
                          {block.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); setEditPanelOpen(true); }}
                          className="rounded p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit content"
                        >
                          <PanelLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                          className="rounded p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete section"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Final drop zone */}
              {layoutDragOverIndex === pageBlocks.length && (
                <div className="h-1 rounded bg-primary" />
              )}
              <div
                onDragOver={(e) => { e.preventDefault(); setLayoutDragOverIndex(pageBlocks.length); }}
                className="h-4"
              />

              {/* Add section button */}
              <button
                onClick={() => { setInsertAtIndex(null); setAddBlockOpen(true); }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-4 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                <span className="font-display text-xs uppercase tracking-wider">Add Section</span>
              </button>
            </div>
          )}

          {/* Page Summary */}
          {pageBlocks.length > 0 && (
            <div className="mt-8 rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Page Summary
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-display text-2xl font-bold text-foreground">{pageBlocks.length}</p>
                  <p className="text-xs text-muted-foreground">Total Sections</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-primary">
                    {pageBlocks.filter(b => b.is_active).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Visible</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-muted-foreground">
                    {pageBlocks.filter(b => !b.is_active).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Hidden</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Block Editor Side Panel */}
      <BlockEditorPanel
        block={selectedBlock}
        open={editPanelOpen}
        onClose={() => setEditPanelOpen(false)}
        onSave={() => { setEditPanelOpen(false); fetchBlocks(); }}
        pages={allPages}
      />

      {/* Add Block Dialog */}
      <Dialog open={addBlockOpen} onOpenChange={setAddBlockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display uppercase">Add Section</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {blockTypes.map(({ value, label, icon: Icon }) => (
              <Button key={value} variant="outline" onClick={() => addBlock(value)}
                className="h-auto flex-col gap-2 py-4 font-display text-xs uppercase tracking-wider">
                <Icon className="h-6 w-6" />
                {label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Page Dialog */}
      <Dialog open={newPageOpen} onOpenChange={setNewPageOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display uppercase">Create Page</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Page Name</Label><Input value={newPageSlug} onChange={(e) => setNewPageSlug(e.target.value)} placeholder="e.g. about-us" /></div>
            <Button onClick={createPage} disabled={!newPageSlug.trim()} className="w-full font-display uppercase tracking-wider">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Page Dialog */}
      <Dialog open={deletePageOpen} onOpenChange={setDeletePageOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display uppercase">Delete Page</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete all blocks on the "{activePage}" page.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeletePageOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={deletePage} className="flex-1 font-display uppercase">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PageEditor;
