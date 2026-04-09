import { useCallback, useMemo, useState } from "react";
import { tr } from "@/lib/translate";
import {
  GripVertical, Eye, EyeOff, Trash2, Copy, Plus,
  LayoutGrid, ChevronUp, ChevronDown,
  Square, Type, Image, Columns, PlayCircle, MousePointer, Link2, Code, Globe, Mail,
  Truck, Star, HelpCircle, ShieldCheck, Layers, Package, FolderTree, Search,
  Box, BookmarkPlus, Settings2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVisualEditor, pageDisplayTitle } from "@/contexts/VisualEditorContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import InsertReusableDialog from "@/components/admin/reusable/InsertReusableDialog";
import { buildPreviewList, previewListToLayout, type PreviewItem } from "@/lib/static-page-sections";

import {
  Award, Clock, MessageSquare as MessageSquareIcon, Eye as EyeIcon2, Gift, Minus, ThumbsUp,
} from "lucide-react";

const BLOCK_ICONS: Record<string, any> = {
  hero: Square, shipping_banner: Truck, entry_cards: Layers, categories: FolderTree,
  featured_products: Star, how_it_works: Package, faq: HelpCircle, trust_badges: ShieldCheck,
  text: Type, image: Image, carousel: Columns, video: PlayCircle,
  banner: Square, cta: MousePointer, button: Link2, spacer: Square,
  html: Code, embed: Globe, newsletter: Mail, instagram_auto_feed: Globe,
  social_proof: ThumbsUp, testimonials: MessageSquareIcon, gallery: Image,
  recently_viewed: EyeIcon2, gift_finder: Gift, countdown: Clock, divider: Minus,
};

const BLOCK_COLORS: Record<string, string> = {
  hero: "border-l-primary", shipping_banner: "border-l-amber-500", entry_cards: "border-l-cyan-500",
  categories: "border-l-violet-500", featured_products: "border-l-yellow-500", how_it_works: "border-l-teal-500",
  faq: "border-l-sky-500", trust_badges: "border-l-emerald-500", text: "border-l-blue-500",
  image: "border-l-green-500", carousel: "border-l-purple-500", video: "border-l-red-500",
  banner: "border-l-amber-500", cta: "border-l-emerald-500", button: "border-l-cyan-500",
  spacer: "border-l-muted-foreground", html: "border-l-orange-500", embed: "border-l-indigo-500",
  newsletter: "border-l-pink-500", instagram_auto_feed: "border-l-fuchsia-500",
  social_proof: "border-l-rose-500", testimonials: "border-l-orange-500", gallery: "border-l-lime-500",
  recently_viewed: "border-l-slate-500", gift_finder: "border-l-pink-500", countdown: "border-l-red-500",
  divider: "border-l-muted-foreground",
};

interface LayersPanelProps {
  onAddBlock: () => void;
}

export default function LayersPanel({ onAddBlock }: LayersPanelProps) {
  const {
    draftBlocks, selectedBlockId, hoveredBlockId, activePage,
    selectBlock, hoverBlock, selectedPage,
    deleteBlock, duplicateBlock, toggleBlockActive, moveBlock,
    addBlock, layoutOrder, setLayoutOrder,
    selectedStaticId, selectStaticSection,
  } = useVisualEditor();
  const { user } = useAuth();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reusableOpen, setReusableOpen] = useState(false);

  const previewItems = useMemo(
    () => buildPreviewList(activePage, draftBlocks, layoutOrder),
    [activePage, draftBlocks, layoutOrder],
  );

  const staticCount = useMemo(() => previewItems.filter(i => i.source === "static").length, [previewItems]);
  const totalCount = previewItems.length;

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const reordered = [...previewItems];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dragOverIndex, 0, moved);
      setLayoutOrder(previewListToLayout(reordered));

      // Sync dynamic blocks if both are dynamic
      const fromItem = previewItems[dragIndex];
      const toItem = previewItems[dragOverIndex];
      if (fromItem.source === "dynamic" && toItem.source === "dynamic") {
        const fromDynIdx = draftBlocks.findIndex(b => b.id === fromItem.id);
        const toDynIdx = draftBlocks.findIndex(b => b.id === toItem.id);
        if (fromDynIdx !== -1 && toDynIdx !== -1) moveBlock(fromDynIdx, toDynIdx);
      }
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, previewItems, draftBlocks, moveBlock, setLayoutOrder]);

  const handleMoveItem = useCallback((index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= previewItems.length) return;
    const reordered = [...previewItems];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setLayoutOrder(previewListToLayout(reordered));

    const item = previewItems[index];
    const target = previewItems[targetIndex];
    if (item.source === "dynamic" && target.source === "dynamic") {
      const fromIdx = draftBlocks.findIndex(b => b.id === item.id);
      const toIdx = draftBlocks.findIndex(b => b.id === target.id);
      if (fromIdx !== -1 && toIdx !== -1) moveBlock(fromIdx, toIdx);
    }
  }, [previewItems, draftBlocks, moveBlock, setLayoutOrder]);

  const filteredItems = searchQuery
    ? previewItems.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : previewItems;

  const saveAsReusable = async (blockId: string) => {
    const block = draftBlocks.find(b => b.id === blockId);
    if (!block) return;
    const { error } = await supabase.from("reusable_blocks").insert({
      name: (typeof block.title === "string" ? block.title : tr(block.title, "")) || block.block_type,
      block_type: block.block_type,
      content: block.content as any,
      created_by: user?.id || null,
      updated_by: user?.id || null,
    });
    if (error) toast.error("Failed to save");
    else toast.success("Saved as reusable block!");
  };

  const handleInsertReusable = (data: { block_type: string; content: any; title: string }) => {
    addBlock(data.block_type);
    toast.success("Reusable block inserted");
  };

  return (
    <div className="flex h-full flex-col border-r border-border/30 bg-card/80 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-3.5 w-3.5 text-primary" />
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-foreground">Layers</span>
        </div>
        <Badge variant="secondary" className="font-mono text-[10px]">{totalCount}</Badge>
      </div>

      {/* Page info */}
      <div className="border-b border-border/30 bg-background/30 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {selectedPage?.page_type === "global" ? "Global Section" : "Page"}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-foreground">
          {selectedPage ? pageDisplayTitle(selectedPage) : "Home"}
        </p>
      </div>

      {/* Search */}
      {totalCount > 4 && (
        <div className="border-b border-border/30 px-2 py-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter blocks..."
              className="h-7 pl-7 text-[10px]"
            />
          </div>
        </div>
      )}

      {/* Block list */}
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-1.5">
          {filteredItems.length === 0 && totalCount === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Layers className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No blocks yet</p>
              <Button size="sm" className="mt-3" onClick={onAddBlock}>
                <Plus className="mr-1 h-3 w-3" /> Add Block
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="py-4 text-center text-[10px] text-muted-foreground">No matching blocks</p>
          ) : (
            filteredItems.map((item, filteredIdx) => {
              // Get the real unified index for move operations
              const realIndex = previewItems.findIndex(p => p.id === item.id);

              if (item.source === "static") {
                const isStaticSelected = selectedStaticId === item.id;
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDragIndex(realIndex)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIndex(realIndex); }}
                    onDragEnd={handleDragEnd}
                    onClick={() => selectStaticSection(isStaticSelected ? null : item.id)}
                    className={cn(
                      "group flex cursor-pointer items-start gap-1.5 rounded-lg border-l-[3px] border-l-primary/60 px-2 py-1.5 text-xs transition-all",
                      isStaticSelected && "bg-primary/10 ring-1 ring-primary/40",
                      !isStaticSelected && "hover:bg-accent/20",
                      dragOverIndex === realIndex && dragIndex !== realIndex && "ring-1 ring-primary",
                    )}
                  >
                    <GripVertical className="mt-0.5 h-3 w-3 shrink-0 cursor-grab text-muted-foreground/50" />
                    <Settings2 className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[10px] font-semibold uppercase tracking-wider text-foreground">
                        {item.label}
                      </span>
                      <span className="block truncate text-[9px] text-muted-foreground">
                        {item.staticSection?.description}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveItem(realIndex, "up"); }}
                        disabled={realIndex === 0}
                        className={cn("rounded p-0.5 text-muted-foreground hover:text-foreground", realIndex === 0 && "opacity-30 cursor-not-allowed")}
                      >
                        <ChevronUp className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveItem(realIndex, "down"); }}
                        disabled={realIndex === previewItems.length - 1}
                        className={cn("rounded p-0.5 text-muted-foreground hover:text-foreground", realIndex === previewItems.length - 1 && "opacity-30 cursor-not-allowed")}
                      >
                        <ChevronDown className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                );
              }

              // Dynamic block
              const block = item.block;
              const Icon = BLOCK_ICONS[block.block_type] ?? Square;
              const colorClass = BLOCK_COLORS[block.block_type] ?? "border-l-muted-foreground";
              const isSelected = selectedBlockId === block.id;
              const isHovered = hoveredBlockId === block.id;
              const isInactive = block.is_active === false;

              return (
                <div key={block.id}>
                  {dragOverIndex === realIndex && dragIndex !== realIndex && (
                    <div className="mx-1 h-0.5 rounded bg-primary" />
                  )}
                  <div
                    draggable
                    onDragStart={() => setDragIndex(realIndex)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIndex(realIndex); }}
                    onDragEnd={handleDragEnd}
                    onClick={() => selectBlock(isSelected ? null : block.id)}
                    onMouseEnter={() => hoverBlock(block.id)}
                    onMouseLeave={() => hoverBlock(null)}
                    className={cn(
                      "group flex cursor-pointer items-start gap-1.5 rounded-lg border-l-[3px] px-2 py-1.5 text-xs transition-all",
                      colorClass,
                      isSelected && "bg-primary/10 ring-1 ring-primary/40",
                      isHovered && !isSelected && "bg-accent/10",
                      !isSelected && !isHovered && "hover:bg-accent/20",
                      isInactive && "opacity-40",
                    )}
                  >
                    <GripVertical className="mt-0.5 h-3 w-3 shrink-0 cursor-grab text-muted-foreground/50" />
                    <Icon className="mt-0.5 h-3 w-3 shrink-0 text-foreground/50" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[10px] font-semibold uppercase tracking-wider text-foreground">
                        {(typeof block.title === "string" ? block.title : tr(block.title, "")) || block.block_type.replace(/_/g, " ")}
                      </span>
                    </div>

                    {isInactive && <EyeOff className="h-3 w-3 shrink-0 text-muted-foreground" />}

                    {/* Quick actions */}
                    <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={(e) => { e.stopPropagation(); handleMoveItem(realIndex, "up"); }} className={cn("rounded p-0.5 text-muted-foreground hover:text-foreground", realIndex === 0 && "opacity-30 cursor-not-allowed")} title="Move up">
                        <ChevronUp className="h-2.5 w-2.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleMoveItem(realIndex, "down"); }} className={cn("rounded p-0.5 text-muted-foreground hover:text-foreground", realIndex === previewItems.length - 1 && "opacity-30 cursor-not-allowed")} title="Move down">
                        <ChevronDown className="h-2.5 w-2.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleBlockActive(block.id); }} className="rounded p-0.5 text-muted-foreground hover:text-foreground" title={isInactive ? "Show" : "Hide"}>
                        {isInactive ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }} className="rounded p-0.5 text-muted-foreground hover:text-foreground" title="Duplicate">
                        <Copy className="h-2.5 w-2.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); saveAsReusable(block.id); }} className="rounded p-0.5 text-muted-foreground hover:text-foreground" title="Save as reusable">
                        <BookmarkPlus className="h-2.5 w-2.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} className="rounded p-0.5 text-muted-foreground hover:text-destructive" title="Delete">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {totalCount > 0 && (
            <div className="space-y-1">
              <button
                onClick={onAddBlock}
                className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border/50 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-wider">Add Section</span>
              </button>
              <button
                onClick={() => setReusableOpen(true)}
                className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border/50 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Box className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-wider">From Library</span>
              </button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="border-t border-border/30 px-3 py-2">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{draftBlocks.length + staticCount} sections</span>
          <span>{draftBlocks.filter(b => b.is_active !== false).length} visible</span>
        </div>
      </div>

      <InsertReusableDialog
        open={reusableOpen}
        onOpenChange={setReusableOpen}
        onInsert={handleInsertReusable}
      />
    </div>
  );
}
