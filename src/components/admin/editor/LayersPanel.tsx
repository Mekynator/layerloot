import { useCallback, useMemo, useState } from "react";
import { tr } from "@/lib/translate";
import {
  GripVertical, Eye, EyeOff, Trash2, Copy, Plus,
  LayoutGrid, ChevronUp, ChevronDown,
  Square, Type, Image, Columns, PlayCircle, MousePointer, Link2, Code, Globe, Mail,
  Truck, Star, HelpCircle, ShieldCheck, Layers, Package, FolderTree, Search,
  Box, BookmarkPlus, FileText, Lock, Settings2, Unlock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVisualEditor, pageDisplayTitle, pageToEditorKey } from "@/contexts/VisualEditorContext";
import { cn } from "@/lib/utils";
import { getBlockSchema } from "./editable-schema";
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

const QUICK_ELEMENTS = [
  { id: "text", label: "Text", desc: "Paragraph or content section", icon: Type, blockType: "text" },
  { id: "heading", label: "Heading", desc: "Headline-focused block", icon: Type, blockType: "text" },
  { id: "button", label: "Button", desc: "Standalone CTA", icon: Link2, blockType: "button" },
  { id: "image", label: "Image", desc: "Image grid or gallery item", icon: Image, blockType: "image" },
  { id: "icon", label: "Icon", desc: "Trust/icon-based section", icon: ShieldCheck, blockType: "trust_badges" },
  { id: "container", label: "Container", desc: "Flexible content wrapper", icon: Square, blockType: "banner" },
  { id: "grid", label: "Grid", desc: "Cards or category layout", icon: Columns, blockType: "entry_cards" },
  { id: "spacer", label: "Spacer", desc: "Vertical breathing room", icon: Square, blockType: "spacer" },
  { id: "divider", label: "Divider", desc: "Visual separator", icon: Minus, blockType: "divider" },
  { id: "video", label: "Video", desc: "Embedded media section", icon: PlayCircle, blockType: "video" },
  { id: "embed", label: "Embed", desc: "External frame or widget", icon: Globe, blockType: "embed" },
  { id: "shape", label: "Shape", desc: "Styled promo/banner block", icon: Square, blockType: "banner" },
] as const;

interface LayersPanelProps {
  onAddBlock: () => void;
}

export default function LayersPanel({ onAddBlock }: LayersPanelProps) {
  const {
    draftBlocks, selectedBlockId, hoveredBlockId, activePage,
    selectBlock, hoverBlock, selectedPage, selectedBlock, selectedStatic, selectedElement, selectElement,
    deleteBlock, duplicateBlock, toggleBlockActive, moveBlock,
    addBlock, layoutOrder, setLayoutOrder,
    selectedStaticId, selectStaticSection, frontendPages, globalPages, setActivePage,
  } = useVisualEditor();
  const { user } = useAuth();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reusableOpen, setReusableOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("structure");
  const [lockedLayers, setLockedLayers] = useState<Record<string, boolean>>({});

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

  const selectedSchema = selectedBlock ? getBlockSchema(selectedBlock.block_type) : null;
  const selectedRepeaterItems = selectedSchema?.repeaterKey && selectedBlock?.content && Array.isArray((selectedBlock.content as any)[selectedSchema.repeaterKey])
    ? ((selectedBlock.content as any)[selectedSchema.repeaterKey] as Record<string, unknown>[])
    : [];

  const toggleLayerLock = (key: string) => {
    setLockedLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleElementDragStart = (blockType: string, event: React.DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData("application/x-layerloot-block", blockType);
    event.dataTransfer.effectAllowed = "copy";
  };

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
      <div className="flex items-center justify-between border-b border-border/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-3.5 w-3.5 text-primary" />
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-foreground">Editor Workspace</span>
        </div>
        <Badge variant="secondary" className="font-mono text-[10px]">{totalCount}</Badge>
      </div>

      <div className="border-b border-border/30 bg-background/30 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {selectedPage?.page_type === "global" ? "Global Section" : "Page"}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-foreground">
          {selectedPage ? pageDisplayTitle(selectedPage) : "Home"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border/30 px-2 py-1.5">
          <TabsList className="grid h-8 w-full grid-cols-4">
            <TabsTrigger value="structure" className="gap-1 px-1 text-[10px]"><LayoutGrid className="h-3 w-3" />Structure</TabsTrigger>
            <TabsTrigger value="elements" className="gap-1 px-1 text-[10px]"><Plus className="h-3 w-3" />Elements</TabsTrigger>
            <TabsTrigger value="layers" className="gap-1 px-1 text-[10px]"><Layers className="h-3 w-3" />Layers</TabsTrigger>
            <TabsTrigger value="pages" className="gap-1 px-1 text-[10px]"><FileText className="h-3 w-3" />Pages</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="structure" className="mt-0 flex min-h-0 flex-1 flex-col">
          {totalCount > 4 && (
            <div className="border-b border-border/30 px-2 py-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter blocks..."
                  className="h-7 pl-7 text-[10px]"
                />
              </div>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="space-y-0.5 p-1.5">
              {filteredItems.length === 0 && totalCount === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Layers className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No blocks yet</p>
                  <Button size="sm" className="mt-3" onClick={onAddBlock}>
                    <Plus className="mr-1 h-3 w-3" /> Add Section
                  </Button>
                </div>
              ) : filteredItems.length === 0 ? (
                <p className="py-4 text-center text-[10px] text-muted-foreground">No matching blocks</p>
              ) : (
                filteredItems.map((item) => {
                  const realIndex = previewItems.findIndex((p) => p.id === item.id);

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
                            className={cn("rounded p-0.5 text-muted-foreground hover:text-foreground", realIndex === 0 && "cursor-not-allowed opacity-30")}
                          >
                            <ChevronUp className="h-2.5 w-2.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveItem(realIndex, "down"); }}
                            disabled={realIndex === previewItems.length - 1}
                            className={cn("rounded p-0.5 text-muted-foreground hover:text-foreground", realIndex === previewItems.length - 1 && "cursor-not-allowed opacity-30")}
                          >
                            <ChevronDown className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

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

                        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={(e) => { e.stopPropagation(); handleMoveItem(realIndex, "up"); }} className={cn("rounded p-0.5 text-muted-foreground hover:text-foreground", realIndex === 0 && "cursor-not-allowed opacity-30")} title="Move up">
                            <ChevronUp className="h-2.5 w-2.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleMoveItem(realIndex, "down"); }} className={cn("rounded p-0.5 text-muted-foreground hover:text-foreground", realIndex === previewItems.length - 1 && "cursor-not-allowed opacity-30")} title="Move down">
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
            </div>
          </ScrollArea>

          <div className="border-t border-border/30 px-3 py-2">
            <div className="mb-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{draftBlocks.length + staticCount} sections</span>
              <span>{draftBlocks.filter((b) => b.is_active !== false).length} visible</span>
            </div>
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
          </div>
        </TabsContent>

        <TabsContent value="elements" className="mt-0 flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1">
            <div className="space-y-3 p-2">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Drag-in compatible blocks</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Drag into the canvas or click to add a compatible LayerLoot building block without changing the existing block system.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {QUICK_ELEMENTS.map(({ id, label, desc, icon: Icon, blockType }) => (
                  <button
                    key={id}
                    type="button"
                    draggable
                    onDragStart={(event) => handleElementDragStart(blockType, event)}
                    onClick={() => addBlock(blockType)}
                    className="rounded-xl border border-border/40 bg-background/70 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>

              <Button variant="outline" size="sm" onClick={onAddBlock} className="w-full gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Open full section library
              </Button>
              <Button variant="outline" size="sm" onClick={() => setReusableOpen(true)} className="w-full gap-1.5 text-xs">
                <Box className="h-3.5 w-3.5" /> Open reusable blocks
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="layers" className="mt-0 flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1">
            <div className="space-y-3 p-2">
              {!selectedBlock && !selectedStatic ? (
                <div className="rounded-xl border border-dashed border-border/40 p-4 text-center text-xs text-muted-foreground">
                  Select a block or static section on the canvas to inspect its internal layers.
                </div>
              ) : null}

              {selectedStatic && (
                <div className="rounded-xl border border-border/40 bg-background/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Static section</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{selectedStatic.label}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{selectedStatic.description}</p>
                </div>
              )}

              {selectedBlock && selectedSchema && (
                <>
                  <div className="rounded-xl border border-border/40 bg-background/60 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Selected block</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{(typeof selectedBlock.title === "string" ? selectedBlock.title : tr(selectedBlock.title, "")) || selectedBlock.block_type.replace(/_/g, " ")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => toggleBlockActive(selectedBlock.id)} className="h-8 gap-1 text-xs">
                        {selectedBlock.is_active === false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {selectedBlock.is_active === false ? "Show" : "Hide"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => duplicateBlock(selectedBlock.id)} className="h-8 gap-1 text-xs">
                        <Copy className="h-3.5 w-3.5" /> Duplicate
                      </Button>
                    </div>
                  </div>

                  {selectedSchema.nodes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Primary layers</p>
                      {selectedSchema.nodes.map((node) => {
                        const isActiveNode = selectedElement?.nodeKey === node.key && selectedElement?.repeaterIndex === undefined;
                        const lockKey = `${selectedBlock.id}:${node.key}`;
                        const isLocked = !!lockedLayers[lockKey];

                        return (
                          <div key={node.key} className={cn("flex items-center justify-between rounded-lg border px-2 py-2", isActiveNode ? "border-primary/40 bg-primary/5" : "border-border/40 bg-background/50")}>
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() => selectElement({ blockId: selectedBlock.id, nodeKey: node.key, nodeType: node.type })}
                              className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span className="block truncate text-xs font-medium text-foreground">{node.label}</span>
                              <span className="text-[10px] text-muted-foreground">{node.type}</span>
                            </button>
                            <div className="flex items-center gap-1">
                              <button type="button" className="rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => selectElement({ blockId: selectedBlock.id, nodeKey: node.key, nodeType: node.type })}>
                                {isActiveNode ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                              </button>
                              <button type="button" className="rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => toggleLayerLock(lockKey)}>
                                {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedSchema.repeaterItemNodes && selectedRepeaterItems.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Nested item layers</p>
                      {selectedRepeaterItems.map((item, index) => (
                        <div key={`${selectedSchema.repeaterKey}-${index}`} className="rounded-xl border border-border/40 bg-background/50 p-2">
                          <p className="mb-2 text-[10px] font-medium text-foreground">
                            {String(item.title || item.question || item.name || item.label || `${selectedSchema.repeaterKey} ${index + 1}`)}
                          </p>
                          <div className="space-y-1">
                            {selectedSchema.repeaterItemNodes?.map((node) => {
                              const isActiveNode = selectedElement?.nodeKey === node.key && selectedElement?.repeaterIndex === index;
                              const lockKey = `${selectedBlock.id}:${index}:${node.key}`;
                              const isLocked = !!lockedLayers[lockKey];

                              return (
                                <div key={`${lockKey}`} className={cn("flex items-center justify-between rounded-lg border px-2 py-1.5", isActiveNode ? "border-primary/40 bg-primary/5" : "border-border/30")}>
                                  <button
                                    type="button"
                                    disabled={isLocked}
                                    onClick={() => selectElement({ blockId: selectedBlock.id, nodeKey: node.key, nodeType: node.type, repeaterIndex: index })}
                                    className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <span className="block truncate text-[11px] text-foreground">{node.label}</span>
                                  </button>
                                  <button type="button" className="rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => toggleLayerLock(lockKey)}>
                                    {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="pages" className="mt-0 flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1">
            <div className="space-y-3 p-2">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Frontend pages</p>
                <div className="space-y-1">
                  {frontendPages.map((page) => {
                    const key = pageToEditorKey(page);
                    const active = key === activePage;
                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => setActivePage(key)}
                        className={cn("flex w-full items-center justify-between rounded-lg border px-2 py-2 text-left transition-colors", active ? "border-primary/40 bg-primary/10" : "border-border/40 bg-background/60 hover:border-primary/30")}
                      >
                        <span className="text-xs font-medium text-foreground">{pageDisplayTitle(page)}</span>
                        {active && <Badge variant="outline" className="text-[9px]">Open</Badge>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Global sections</p>
                <div className="space-y-1">
                  {globalPages.map((page) => {
                    const key = pageToEditorKey(page);
                    const active = key === activePage;
                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => setActivePage(key)}
                        className={cn("flex w-full items-center justify-between rounded-lg border px-2 py-2 text-left transition-colors", active ? "border-primary/40 bg-primary/10" : "border-border/40 bg-background/60 hover:border-primary/30")}
                      >
                        <span className="text-xs font-medium text-foreground">{pageDisplayTitle(page)}</span>
                        {active && <Badge variant="outline" className="text-[9px]">Open</Badge>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <InsertReusableDialog
        open={reusableOpen}
        onOpenChange={setReusableOpen}
        onInsert={handleInsertReusable}
      />
    </div>
  );
}
