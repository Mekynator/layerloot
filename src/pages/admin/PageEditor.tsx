import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Trash2, ArrowLeft, FileText, Square, Type, Image, Columns, PlayCircle, MousePointer, Link2, Code, Globe, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/");
  }, [isAdmin, loading, user, navigate]);

  // Fetch custom pages
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

    // If inserting at index, shift subsequent blocks
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

  // Drag & Drop
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

      {/* Page Canvas */}
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

        {/* Final insert zone */}
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
          <DialogHeader><DialogTitle className="font-display uppercase">Add Block</DialogTitle></DialogHeader>
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
