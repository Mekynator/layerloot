import { useCallback, useState } from "react";
import {
  GripVertical, Eye, EyeOff, Pencil, Trash2, Copy, Plus,
  LayoutGrid, ChevronDown, ChevronRight,
  Square, Type, Image, Columns, PlayCircle, MousePointer, Link2, Code, Globe, Mail,
  Truck, Star, HelpCircle, ShieldCheck, Layers, Package, FolderTree,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVisualEditor, pageDisplayTitle } from "@/contexts/VisualEditorContext";

const BLOCK_ICONS: Record<string, any> = {
  hero: Square, shipping_banner: Truck, entry_cards: Layers, categories: FolderTree,
  featured_products: Star, how_it_works: Package, faq: HelpCircle, trust_badges: ShieldCheck,
  text: Type, image: Image, carousel: Columns, video: PlayCircle,
  banner: Square, cta: MousePointer, button: Link2, spacer: Square,
  html: Code, embed: Globe, newsletter: Mail, instagram_auto_feed: Globe,
};

const BLOCK_COLORS: Record<string, string> = {
  hero: "border-l-primary", shipping_banner: "border-l-amber-500", entry_cards: "border-l-cyan-500",
  categories: "border-l-violet-500", featured_products: "border-l-yellow-500", how_it_works: "border-l-teal-500",
  faq: "border-l-sky-500", trust_badges: "border-l-emerald-500", text: "border-l-blue-500",
  image: "border-l-green-500", carousel: "border-l-purple-500", video: "border-l-red-500",
  banner: "border-l-amber-500", cta: "border-l-emerald-500", button: "border-l-cyan-500",
  spacer: "border-l-muted-foreground", html: "border-l-orange-500", embed: "border-l-indigo-500",
  newsletter: "border-l-pink-500", instagram_auto_feed: "border-l-fuchsia-500",
};

interface LayersPanelProps {
  onAddBlock: () => void;
}

export default function LayersPanel({ onAddBlock }: LayersPanelProps) {
  const {
    draftBlocks, selectedBlockId, selectBlock, selectedPage,
    deleteBlock, duplicateBlock, toggleBlockActive, moveBlock,
  } = useVisualEditor();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      moveBlock(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, moveBlock]);

  return (
    <div className="flex h-full flex-col border-r border-border/30 bg-card/80 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-3.5 w-3.5 text-primary" />
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-foreground">Layers</span>
        </div>
        <Badge variant="secondary" className="font-mono text-[10px]">{draftBlocks.length}</Badge>
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

      {/* Block list */}
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-1.5">
          {draftBlocks.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Layers className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No blocks yet</p>
              <Button size="sm" className="mt-3" onClick={onAddBlock}>
                <Plus className="mr-1 h-3 w-3" /> Add Block
              </Button>
            </div>
          ) : (
            draftBlocks.map((block, index) => {
              const Icon = BLOCK_ICONS[block.block_type] ?? Square;
              const colorClass = BLOCK_COLORS[block.block_type] ?? "border-l-muted-foreground";
              const isSelected = selectedBlockId === block.id;
              const isInactive = block.is_active === false;

              return (
                <div key={block.id}>
                  {dragOverIndex === index && dragIndex !== index && (
                    <div className="mx-1 h-0.5 rounded bg-primary" />
                  )}
                  <div
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                    onDragEnd={handleDragEnd}
                    onClick={() => selectBlock(isSelected ? null : block.id)}
                    className={`group flex cursor-pointer items-start gap-1.5 rounded-lg border-l-[3px] px-2 py-1.5 text-xs transition-all ${colorClass} ${
                      isSelected
                        ? "bg-primary/10 ring-1 ring-primary/40"
                        : "hover:bg-accent/20"
                    } ${isInactive ? "opacity-40" : ""}`}
                  >
                    <GripVertical className="mt-0.5 h-3 w-3 shrink-0 cursor-grab text-muted-foreground/50" />
                    <Icon className="mt-0.5 h-3 w-3 shrink-0 text-foreground/50" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[10px] font-semibold uppercase tracking-wider text-foreground">
                        {block.title || block.block_type.replace(/_/g, " ")}
                      </span>
                    </div>

                    {isInactive && <EyeOff className="h-3 w-3 shrink-0 text-muted-foreground" />}

                    {/* Quick actions */}
                    <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={(e) => { e.stopPropagation(); toggleBlockActive(block.id); }} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
                        {isInactive ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
                        <Copy className="h-2.5 w-2.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} className="rounded p-0.5 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {dragOverIndex === draftBlocks.length && (
            <div className="mx-1 h-0.5 rounded bg-primary" />
          )}

          {draftBlocks.length > 0 && (
            <button
              onClick={onAddBlock}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(draftBlocks.length); }}
              className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border/50 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wider">Add Section</span>
            </button>
          )}
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="border-t border-border/30 px-3 py-2">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{draftBlocks.length} blocks</span>
          <span>{draftBlocks.filter(b => b.is_active !== false).length} visible</span>
        </div>
      </div>
    </div>
  );
}
