import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tr } from "@/lib/translate";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";
import { supabase } from "@/integrations/supabase/client";
import { buildReusableInstanceContent, getReusableKind } from "@/lib/reusable-blocks";
import EditorErrorBoundary from "@/components/admin/EditorErrorBoundary";
import { useVisualEditor } from "@/contexts/VisualEditorContext";
import { AlignCenter, AlignLeft, AlignRight, ChevronDown, ChevronUp, Copy, Eye, EyeOff, GripVertical, Link2, Minus, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBlockSchema, getInlineTextKeys } from "./editable-schema";
import { buildPreviewList, previewListToLayout, type PreviewItem } from "@/lib/static-page-sections";
import StaticSectionPreview from "./StaticSectionPreview";

const VIEWPORT_WIDTHS = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export default function EditorCanvas({ zoom = 100, previewMode = false }: { zoom?: number; previewMode?: boolean }) {
  const {
    draftBlocks, selectedBlockId, hoveredBlockId,
    selectBlock, hoverBlock, viewport, activePage,
    deleteBlock, duplicateBlock, toggleBlockActive, addBlock, moveBlock,
    updateBlockContent, selectElement, inlineEditingKey, setInlineEditingKey,
    layoutOrder, setLayoutOrder,
    selectedStaticId, selectStaticSection,
  } = useVisualEditor();

  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isExternalDragOver, setIsExternalDragOver] = useState(false);

  // Scroll selected block into view
  useEffect(() => {
    if (!selectedBlockId || !canvasRef.current) return;
    const el = canvasRef.current.querySelector(`[data-preview-id="${selectedBlockId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedBlockId]);

  const previewItems = useMemo(
    () => buildPreviewList(activePage, draftBlocks, layoutOrder),
    [activePage, draftBlocks, layoutOrder],
  );

  useEffect(() => {
    if (!previewMode) return;
    selectBlock(null);
    selectElement(null);
    selectStaticSection(null);
    setInlineEditingKey(null);
  }, [previewMode, selectBlock, selectElement, selectStaticSection, setInlineEditingKey]);

  const handleBlockClick = useCallback((e: React.MouseEvent, blockId: string) => {
    if (previewMode) return;
    e.stopPropagation();
    selectBlock(blockId);
  }, [previewMode, selectBlock]);

  const handleCanvasClick = useCallback(() => {
    if (previewMode) return;
    selectBlock(null);
    selectElement(null);
    setInlineEditingKey(null);
  }, [previewMode, selectBlock, selectElement, setInlineEditingKey]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const hasSupportedPayload = e.dataTransfer.types.includes("application/x-layerloot-block") || e.dataTransfer.types.includes("application/x-layerloot-reusable-block");
    if (!hasSupportedPayload) return;

    e.preventDefault();
    setIsExternalDragOver(true);

    if (scrollRef.current) {
      const bounds = scrollRef.current.getBoundingClientRect();
      const edge = 72;
      if (e.clientY < bounds.top + edge) scrollRef.current.scrollTop -= 18;
      if (e.clientY > bounds.bottom - edge) scrollRef.current.scrollTop += 18;
    }
  }, []);

  const handleCanvasDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsExternalDragOver(false);

    const currentPageBlocks = draftBlocks.filter((block) => block.page === activePage).sort((a, b) => a.sort_order - b.sort_order);
    const selectedIndex = selectedBlockId ? currentPageBlocks.findIndex((block) => block.id === selectedBlockId) : -1;
    const insertAt = selectedIndex === -1 ? currentPageBlocks.length : selectedIndex + 1;

    const reusablePayload = e.dataTransfer.getData("application/x-layerloot-reusable-block");
    if (reusablePayload) {
      try {
        const payload = JSON.parse(reusablePayload) as { id: string; title: string; block_type: string; syncMode?: "copy" | "global" | "override" };
        const { data } = await supabase.from("reusable_blocks").select("*").eq("id", payload.id).maybeSingle();
        if (data) {
          const kind = getReusableKind(data as any);
          const syncMode = payload.syncMode || (kind === "component" ? "global" : "copy");
          addBlock(payload.block_type, insertAt, { title: payload.title, content: buildReusableInstanceContent(data as any, syncMode, kind) });
          return;
        }
      } catch {
        // ignore malformed payloads and continue to normal blocks
      }
    }

    const blockType = e.dataTransfer.getData("application/x-layerloot-block");
    if (!blockType) return;
    addBlock(blockType, insertAt);
  }, [activePage, addBlock, draftBlocks, selectedBlockId]);

  const handlePanStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-preview-id], [data-editor-toolbar], input, textarea, button, a, select")) return;
    if (!scrollRef.current) return;

    panState.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop,
    };
    setIsPanning(true);
  }, []);

  const handlePanMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!panState.current || !scrollRef.current) return;
    scrollRef.current.scrollLeft = panState.current.scrollLeft - (e.clientX - panState.current.startX);
    scrollRef.current.scrollTop = panState.current.scrollTop - (e.clientY - panState.current.startY);
  }, []);

  const stopPan = useCallback(() => {
    panState.current = null;
    setIsPanning(false);
  }, []);

  const viewportWidth = VIEWPORT_WIDTHS[viewport];

  // Unified drag reorder state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const handleUnifiedDragStart = useCallback((index: number) => {
    setDragIdx(index);
    setDropIdx(index);
  }, []);
  const handleUnifiedDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDropIdx(index);
  }, []);

  const handleUnifiedDragEnd = useCallback(() => {
    if (dragIdx !== null && dropIdx !== null && dragIdx !== dropIdx) {
      const reordered = [...previewItems];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(dropIdx, 0, moved);

      // Persist the new layout order
      setLayoutOrder(previewListToLayout(reordered));

      // If dynamic order changed, reorder via moveBlock
      const fromItem = previewItems[dragIdx];
      const toItem = previewItems[dropIdx];
      if (fromItem.source === "dynamic" && toItem.source === "dynamic") {
        const fromDynIdx = draftBlocks.findIndex(b => b.id === fromItem.id);
        const toDynIdx = draftBlocks.findIndex(b => b.id === toItem.id);
        if (fromDynIdx !== -1 && toDynIdx !== -1) {
          moveBlock(fromDynIdx, toDynIdx);
        }
      }
    }
    setDragIdx(null);
    setDropIdx(null);
  }, [dragIdx, dropIdx, previewItems, draftBlocks, moveBlock, setLayoutOrder]);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    const reordered = [...previewItems];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    setLayoutOrder(previewListToLayout(reordered));
    
    // If moving dynamic blocks relative to each other, sync
    const item = previewItems[index];
    const target = previewItems[index - 1];
    if (item.source === "dynamic" && target.source === "dynamic") {
      const fromIdx = draftBlocks.findIndex(b => b.id === item.id);
      const toIdx = draftBlocks.findIndex(b => b.id === target.id);
      if (fromIdx !== -1 && toIdx !== -1) moveBlock(fromIdx, toIdx);
    }
  }, [previewItems, setLayoutOrder, draftBlocks, moveBlock]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= previewItems.length - 1) return;
    const reordered = [...previewItems];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    setLayoutOrder(previewListToLayout(reordered));
    
    const item = previewItems[index];
    const target = previewItems[index + 1];
    if (item.source === "dynamic" && target.source === "dynamic") {
      const fromIdx = draftBlocks.findIndex(b => b.id === item.id);
      const toIdx = draftBlocks.findIndex(b => b.id === target.id);
      if (fromIdx !== -1 && toIdx !== -1) moveBlock(fromIdx, toIdx);
    }
  }, [previewItems, setLayoutOrder, draftBlocks, moveBlock]);

  const getDynamicIndex = useCallback((blockId: string) => {
    return draftBlocks.findIndex(b => b.id === blockId);
  }, [draftBlocks]);

  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(148,163,184,0.08),transparent)]" onClick={handleCanvasClick}>
      <div className="border-b border-border/30 bg-background/70 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
        {previewMode ? "Preview" : "Edit"} canvas · {viewport} preview · {Math.round(zoom)}% · drag background to pan
      </div>
      <div
        ref={scrollRef}
        className={cn("flex-1 overflow-auto transition-colors duration-200", previewMode ? "cursor-default" : isPanning ? "cursor-grabbing" : "cursor-grab")}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={stopPan}
        onMouseLeave={() => {
          stopPan();
          setIsExternalDragOver(false);
        }}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
      >
        <div className="flex justify-center p-5 lg:p-7">
          <div
            ref={canvasRef}
            className={cn(
              "relative min-h-0 overflow-hidden rounded-[28px] border border-border/40 bg-background shadow-[0_20px_90px_-35px_rgba(15,23,42,0.85)] transition-all duration-300 ease-out",
              viewport === "desktop" && "rounded-[20px]",
              isExternalDragOver && "border-primary/60 shadow-[0_24px_100px_-40px_rgba(99,102,241,0.8)]",
            )}
            style={{ width: viewportWidth, maxWidth: "100%", transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          >
            <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            {isExternalDragOver && !previewMode && (
              <div className="pointer-events-none absolute inset-4 z-30 flex items-center justify-center rounded-2xl border border-dashed border-primary/50 bg-primary/5 backdrop-blur-sm">
                <div className="rounded-full border border-primary/30 bg-background/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-lg">
                  Drop section here
                </div>
              </div>
            )}

            {previewItems.length === 0 ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-2xl bg-card/60 p-6 backdrop-blur-xl transition-all duration-200" style={{ boxShadow: '0 8px 40px -8px hsl(228 33% 2% / 0.5)' }}>
                  <Plus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Start building this page</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">Drag elements here or use “Add Section” to begin.</p>
                </div>
              </div>
            ) : (
              previewItems.map((item, index) => {
                if (item.source === "static") {
                  return (
                    <StaticSectionShell
                      key={item.id}
                      item={item}
                      index={index}
                      totalItems={previewItems.length}
                      isSelected={selectedStaticId === item.id}
                      isDragOver={dropIdx === index && dragIdx !== index}
                      onSelect={() => selectStaticSection(item.id)}
                      onDragStart={() => handleUnifiedDragStart(index)}
                      onDragOver={(e) => handleUnifiedDragOver(e, index)}
                      onDragEnd={handleUnifiedDragEnd}
                      onMoveUp={() => handleMoveUp(index)}
                      onMoveDown={() => handleMoveDown(index)}
                      onAddAfter={() => {
                        const dynamicInsertIdx = previewItems
                          .slice(0, index + 1)
                          .filter(i => i.source === "dynamic").length;
                        addBlock("text", dynamicInsertIdx);
                      }}
                      isDragging={dragIdx === index}
                      previewMode={previewMode}
                    />
                  );
                }

                const block = item.block as SiteBlock;
                const dynamicIndex = getDynamicIndex(block.id);

                return (
                  <CanvasBlockWrapper
                    key={block.id}
                    block={block}
                    index={dynamicIndex}
                    unifiedIndex={index}
                    totalBlocks={draftBlocks.length}
                    totalItems={previewItems.length}
                    isSelected={selectedBlockId === block.id}
                    isHovered={hoveredBlockId === block.id}
                    isDragOver={dropIdx === index && dragIdx !== index}
                    onClick={handleBlockClick}
                    onMouseEnter={() => hoverBlock(block.id)}
                    onMouseLeave={() => hoverBlock(null)}
                    onDelete={() => deleteBlock(block.id)}
                    onDuplicate={() => duplicateBlock(block.id)}
                    onToggleActive={() => toggleBlockActive(block.id)}
                    onAddBefore={() => addBlock("text", dynamicIndex)}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    onDragStart={() => handleUnifiedDragStart(index)}
                    onDragOver={(e) => handleUnifiedDragOver(e, index)}
                    onDragEnd={handleUnifiedDragEnd}
                    onUpdateContent={(content) => updateBlockContent(block.id, content)}
                    inlineEditingKey={selectedBlockId === block.id ? inlineEditingKey : null}
                    onStartInlineEdit={(key) => {
                      selectBlock(block.id);
                      setInlineEditingKey(key);
                      selectElement({ blockId: block.id, nodeKey: key, nodeType: "text" });
                    }}
                    onEndInlineEdit={() => setInlineEditingKey(null)}
                    onSelectElement={(nodeKey, nodeType) => {
                      if (previewMode) return;
                      selectBlock(block.id);
                      selectElement({ blockId: block.id, nodeKey, nodeType });
                    }}
                    isDragging={dragIdx === index}
                    previewMode={previewMode}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Static Section Shell — renders real content, now selectable ─── */

function StaticSectionShell({ item, index, totalItems, isSelected, isDragOver, onSelect, onDragStart, onDragOver, onDragEnd, onMoveUp, onMoveDown, onAddAfter, isDragging = false, previewMode = false }: {
  item: PreviewItem;
  index: number;
  totalItems: number;
  isSelected?: boolean;
  isDragOver: boolean;
  onSelect?: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddAfter: () => void;
  isDragging?: boolean;
  previewMode?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const section = item.staticSection!;
  const showControls = !previewMode && (hovered || isSelected);

  return (
    <div
      data-preview-id={item.id}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onClick={(e) => { e.stopPropagation(); if (previewMode) return; onSelect?.(); }}
      className={cn(
        "relative cursor-pointer transition-all duration-200 ease-out",
        isSelected && "z-10 ring-2 ring-primary/70 ring-inset shadow-[0_0_0_1px_rgba(99,102,241,0.2),0_18px_36px_-24px_rgba(99,102,241,0.55)]",
        hovered && !isSelected && "ring-1 ring-primary/35 ring-inset shadow-[0_12px_30px_-26px_rgba(99,102,241,0.45)]",
        isDragOver && "border-t-2 border-t-primary",
        isDragging && "scale-[1.01] shadow-[0_24px_50px_-26px_rgba(15,23,42,0.65)]",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Label badge + drag handle */}
      {showControls && (
        <div className="absolute top-1 left-2 z-20 flex items-center gap-1.5 rounded-lg border border-border/30 bg-card/95 px-2 py-0.5 shadow-lg backdrop-blur-xl">
          <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
          <Settings2 className="h-3 w-3 text-primary" />
          <span className="font-display text-[9px] font-semibold uppercase tracking-wider text-primary">
            {section.label}
          </span>
        </div>
      )}

      {isDragOver && !isDragging && (
        <div className="absolute right-2 top-2 z-30 rounded-full border border-primary/30 bg-background/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary shadow-lg backdrop-blur-xl">
          Drop here
        </div>
      )}

      {/* Reorder controls on hover */}
      {showControls && (
        <div className="absolute top-1 right-2 z-20 flex items-center gap-0.5 rounded-lg border border-border/30 bg-card/95 px-1 py-0.5 shadow-lg backdrop-blur-xl transition-all duration-200 ease-out">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={index === 0}
            className={cn("rounded p-1 text-muted-foreground hover:text-foreground", index === 0 && "opacity-30 cursor-not-allowed")}
            title="Move up"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={index === totalItems - 1}
            className={cn("rounded p-1 text-muted-foreground hover:text-foreground", index === totalItems - 1 && "opacity-30 cursor-not-allowed")}
            title="Move down"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Real content preview — pointer-events disabled */}
      <div className="pointer-events-none">
        <StaticSectionPreview section={section} />
      </div>

      {/* Insert-after control */}
      {showControls && hovered && (
        <div
          className="absolute -bottom-px inset-x-0 z-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity h-4 translate-y-1/2 cursor-pointer pointer-events-auto"
          onClick={(e) => { e.stopPropagation(); onAddAfter(); }}
        >
          <div className="h-0.5 flex-1 bg-primary/40" />
          <div className="mx-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Plus className="h-3 w-3" />
          </div>
          <div className="h-0.5 flex-1 bg-primary/40" />
        </div>
      )}
    </div>
  );
}

/* ─── Dynamic Block Wrapper ─── */

interface CanvasBlockWrapperProps {
  block: SiteBlock;
  index: number;
  unifiedIndex: number;
  totalBlocks: number;
  totalItems: number;
  isSelected: boolean;
  isHovered: boolean;
  isDragOver: boolean;
  onClick: (e: React.MouseEvent, id: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onAddBefore: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onUpdateContent: (content: Record<string, any>) => void;
  inlineEditingKey: string | null;
  onStartInlineEdit: (key: string) => void;
  onEndInlineEdit: () => void;
  onSelectElement: (nodeKey: string, nodeType: "text" | "icon" | "button" | "media" | "layout") => void;
  isDragging?: boolean;
  previewMode?: boolean;
}

function CanvasBlockWrapper({
  block, index, unifiedIndex, totalBlocks, totalItems, isSelected, isHovered, isDragOver,
  onClick, onMouseEnter, onMouseLeave,
  onDelete, onDuplicate, onToggleActive, onAddBefore,
  onMoveUp, onMoveDown,
  onDragStart, onDragOver, onDragEnd,
  onUpdateContent,
  inlineEditingKey, onStartInlineEdit, onEndInlineEdit, onSelectElement,
  isDragging = false,
  previewMode = false,
}: CanvasBlockWrapperProps) {
  const isInactive = block.is_active === false;
  const showControls = !previewMode && (isSelected || isHovered);
  const content = (block.content || {}) as Record<string, any>;
  const inlineTextKeys = getInlineTextKeys(block.block_type);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (previewMode) return;
    e.stopPropagation();
    e.preventDefault();
    const target = e.target as HTMLElement;
    const editableEl = target.closest("[data-editable-key]");
    if (editableEl) {
      const key = editableEl.getAttribute("data-editable-key")!;
      onStartInlineEdit(key);
      return;
    }
    if (inlineTextKeys.length > 0) {
      onStartInlineEdit(inlineTextKeys[0]);
    }
  }, [inlineTextKeys, onStartInlineEdit, previewMode]);

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (previewMode) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-editor-toolbar]")) return;
    if (target.closest("a, button, input, textarea, select")) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [previewMode]);

  const hasAlignmentControls = typeof content.alignment === "string";
  const hasSpacingControls = content.paddingTop !== undefined || content.paddingBottom !== undefined || content.gap !== undefined;
  const reusableStatus = content._reusableId ? {
    kind: getReusableKind(undefined, content),
    syncMode: String(content._reusableSyncMode || "global"),
  } : null;

  const setAlignment = useCallback((alignment: "left" | "center" | "right") => {
    onUpdateContent({ ...content, alignment });
  }, [content, onUpdateContent]);

  const nudgeSpacing = useCallback((delta: number) => {
    if (content.paddingTop !== undefined || content.paddingBottom !== undefined) {
      onUpdateContent({
        ...content,
        paddingTop: Math.max(0, Number(content.paddingTop ?? 0) + delta),
        paddingBottom: Math.max(0, Number(content.paddingBottom ?? 0) + delta),
      });
      return;
    }
    onUpdateContent({ ...content, gap: Math.max(0, Number(content.gap ?? 0) + delta) });
  }, [content, onUpdateContent]);

  const handleInlineSave = useCallback((key: string, value: string) => {
    onEndInlineEdit();
    if (value !== (content[key] || "")) {
      onUpdateContent({ ...content, [key]: value });
    }
  }, [content, onUpdateContent, onEndInlineEdit]);

  return (
    <div
      data-preview-id={block.id}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={cn(
        "group/block relative transition-all duration-200 ease-out",
        isSelected && "z-10 scale-[1.002] ring-2 ring-primary/70 ring-inset shadow-[0_0_0_1px_rgba(99,102,241,0.2),0_22px_44px_-28px_rgba(99,102,241,0.6)]",
        isHovered && !isSelected && "ring-1 ring-primary/35 ring-inset shadow-[0_12px_28px_-24px_rgba(99,102,241,0.4)]",
        isInactive && "opacity-30",
        isDragOver && "border-t-2 border-t-primary",
        isDragging && "scale-[1.01] -rotate-[0.2deg] shadow-[0_28px_56px_-26px_rgba(15,23,42,0.65)] cursor-grabbing",
        !isDragging && !previewMode && "cursor-pointer",
      )}
      onClick={(e) => onClick(e, block.id)}
      onClickCapture={handleClickCapture}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDoubleClick={handleDoubleClick}
    >
      {/* Top insert line */}
      {isHovered && (
        <div
          className="absolute -top-px inset-x-0 z-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity h-4 -translate-y-1/2 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onAddBefore(); }}
        >
          <div className="h-0.5 flex-1 bg-primary/40" />
          <div className="mx-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Plus className="h-2.5 w-2.5" />
          </div>
          <div className="h-0.5 flex-1 bg-primary/40" />
        </div>
      )}

      {isSelected && !previewMode && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 border-l border-dashed border-primary/25" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 border-t border-dashed border-primary/20" />
        </>
      )}

      {isDragOver && !isDragging && (
        <div className="absolute right-2 top-12 z-30 rounded-full border border-primary/30 bg-background/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary shadow-lg backdrop-blur-xl">
          Drop position
        </div>
      )}

      {/* Floating label toolbar (left) */}
      {showControls && (
        <div data-editor-toolbar className="absolute top-1 left-2 z-30 flex items-center gap-1 rounded-lg border border-border/30 bg-card/95 px-1.5 py-0.5 shadow-[0_12px_30px_-16px_rgba(15,23,42,0.65)] backdrop-blur-xl transition-all duration-200 ease-out">
          <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
          <span className="font-display text-[9px] font-semibold uppercase tracking-wider text-primary">
            {block.block_type.replace(/_/g, " ")}
          </span>
          {block.title && block.title !== block.block_type && (
            <span className="max-w-[80px] truncate text-[9px] text-muted-foreground">· {typeof block.title === "string" ? block.title : tr(block.title, "")}</span>
          )}
          {reusableStatus && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.16em] text-primary">
              <Link2 className="h-2.5 w-2.5" />
              {reusableStatus.kind === "component" ? (reusableStatus.syncMode === "override" ? "Override" : "Global") : "Reusable"}
            </span>
          )}
        </div>
      )}

      {/* Floating action toolbar (right) */}
      {showControls && (
        <div data-editor-toolbar className="absolute top-1 right-2 z-30 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-0.5 rounded-lg border border-border/30 bg-card/95 px-1 py-0.5 shadow-[0_14px_32px_-18px_rgba(15,23,42,0.7)] backdrop-blur-xl transition-all duration-200 ease-out">
          <ToolButton onClick={onMoveUp} title="Move forward" disabled={unifiedIndex === 0}>
            <ChevronUp className="h-3 w-3" />
          </ToolButton>
          <ToolButton onClick={onMoveDown} title="Move backward" disabled={unifiedIndex === totalItems - 1}>
            <ChevronDown className="h-3 w-3" />
          </ToolButton>
          {inlineTextKeys.length > 0 && (
            <ToolButton onClick={() => onStartInlineEdit(inlineTextKeys[0])} title="Quick text edit">
              <Pencil className="h-3 w-3" />
            </ToolButton>
          )}
          {hasAlignmentControls && (
            <>
              <ToolButton onClick={() => setAlignment("left")} title="Align left"><AlignLeft className="h-3 w-3" /></ToolButton>
              <ToolButton onClick={() => setAlignment("center")} title="Align center"><AlignCenter className="h-3 w-3" /></ToolButton>
              <ToolButton onClick={() => setAlignment("right")} title="Align right"><AlignRight className="h-3 w-3" /></ToolButton>
            </>
          )}
          {hasSpacingControls && (
            <>
              <ToolButton onClick={() => nudgeSpacing(-4)} title="Tighter spacing"><Minus className="h-3 w-3" /></ToolButton>
              <ToolButton onClick={() => nudgeSpacing(4)} title="More spacing"><Plus className="h-3 w-3" /></ToolButton>
            </>
          )}
          <div className="mx-0.5 h-3 w-px bg-border/30" />
          <ToolButton onClick={onToggleActive} title={isInactive ? "Show" : "Hide"}>
            {isInactive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </ToolButton>
          <ToolButton onClick={onDuplicate} title="Duplicate">
            <Copy className="h-3 w-3" />
          </ToolButton>
          <ToolButton onClick={onDelete} title="Delete" destructive>
            <Trash2 className="h-3 w-3" />
          </ToolButton>
        </div>
      )}

      {/* Inline editing hint */}
      {isSelected && !previewMode && inlineTextKeys.length > 0 && !inlineEditingKey && (
        <div data-editor-toolbar className="absolute bottom-1 left-2 z-30 flex items-center gap-1 rounded-lg border border-border/30 bg-card/95 px-1.5 py-0.5 shadow-lg backdrop-blur-xl">
          <span className="text-[9px] text-muted-foreground">Double-click text to edit inline</span>
        </div>
      )}

      {isSelected && !previewMode && (content.paddingTop !== undefined || content.paddingBottom !== undefined || content.gap !== undefined) && (
        <div data-editor-toolbar className="absolute bottom-1 right-2 z-30 rounded-lg border border-border/30 bg-card/95 px-1.5 py-0.5 text-[9px] text-muted-foreground shadow-lg backdrop-blur-xl">
          spacing · pt {Number(content.paddingTop ?? 0)} · pb {Number(content.paddingBottom ?? 0)} · gap {Number(content.gap ?? 0)}
        </div>
      )}

      {/* Block content */}
      <div className={cn(isInactive ? "pointer-events-none" : "", previewMode ? "select-none" : "")}>
        {isSelected && inlineEditingKey ? (
          <InlineEditableBlock
            block={block}
            editingKey={inlineEditingKey}
            onSave={handleInlineSave}
            onCancel={onEndInlineEdit}
            content={content}
          />
        ) : (
          <EditorErrorBoundary>{renderBlock(block)}</EditorErrorBoundary>
        )}
      </div>
    </div>
  );
}

function ToolButton({ children, onClick, title, destructive, disabled }: {
  children: React.ReactNode; onClick: () => void; title: string; destructive?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      disabled={disabled}
      data-editor-toolbar
      className={cn(
        "rounded p-1 transition-all duration-150 ease-out hover:scale-105 active:scale-95",
        disabled && "opacity-30 cursor-not-allowed",
        destructive ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function InlineEditableBlock({
  block, editingKey, onSave, onCancel, content,
}: {
  block: SiteBlock;
  editingKey: string;
  onSave: (key: string, value: string) => void;
  onCancel: () => void;
  content: Record<string, any>;
}) {
  const currentValue = typeof content[editingKey] === "string" ? content[editingKey] : "";

  const editCallbackRef = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = (e.target as HTMLDivElement).textContent || "";
      onSave(editingKey, text);
    }
    if (e.key === "Escape") {
      onCancel();
    }
  }, [editingKey, onSave, onCancel]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || "";
    onSave(editingKey, text);
  }, [editingKey, onSave]);

  return (
    <div className="relative">
      {renderBlock(block)}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div
          ref={editCallbackRef}
          contentEditable
          suppressContentEditableWarning
          className="pointer-events-auto min-w-[100px] max-w-[80%] rounded border-2 border-primary bg-background/90 px-3 py-2 text-foreground shadow-lg outline-none backdrop-blur-xl transition-all duration-150 caret-primary selection:bg-primary/20"
          style={{ fontSize: "inherit" }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          dangerouslySetInnerHTML={{ __html: currentValue }}
        />
      </div>
    </div>
  );
}
