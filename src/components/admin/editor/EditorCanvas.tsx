import { useCallback, useMemo, useRef, useState } from "react";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";
import { useVisualEditor } from "@/contexts/VisualEditorContext";
import { Plus, Eye, EyeOff, Copy, Trash2, ChevronUp, ChevronDown, GripVertical, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBlockSchema, getInlineTextKeys } from "./editable-schema";
import { buildPreviewList, previewListToLayout, type PreviewItem } from "@/lib/static-page-sections";
import StaticSectionPreview from "./StaticSectionPreview";

const VIEWPORT_WIDTHS = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export default function EditorCanvas() {
  const {
    draftBlocks, selectedBlockId, hoveredBlockId,
    selectBlock, hoverBlock, viewport, activePage,
    deleteBlock, duplicateBlock, toggleBlockActive, addBlock, moveBlock,
    updateBlockContent, selectElement, inlineEditingKey, setInlineEditingKey,
  } = useVisualEditor();

  const canvasRef = useRef<HTMLDivElement>(null);

  const previewItems = useMemo(
    () => buildPreviewList(activePage, draftBlocks),
    [activePage, draftBlocks],
  );

  const handleBlockClick = useCallback((e: React.MouseEvent, blockId: string) => {
    e.stopPropagation();
    selectBlock(blockId);
  }, [selectBlock]);

  const handleCanvasClick = useCallback(() => {
    selectBlock(null);
    selectElement(null);
    setInlineEditingKey(null);
  }, [selectBlock, selectElement, setInlineEditingKey]);

  const viewportWidth = VIEWPORT_WIDTHS[viewport];

  // Unified drag reorder state (works for both static and dynamic)
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const handleUnifiedDragStart = useCallback((index: number) => setDragIdx(index), []);
  const handleUnifiedDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDropIdx(index);
  }, []);
  const handleUnifiedDragEnd = useCallback(() => {
    if (dragIdx !== null && dropIdx !== null && dragIdx !== dropIdx) {
      // Reorder the unified list, then sync back to draftBlocks
      const reordered = [...previewItems];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(dropIdx, 0, moved);

      // Extract the new dynamic block order
      const dynamicOrder = reordered.filter(i => i.source === "dynamic").map(i => i.block as SiteBlock);
      dynamicOrder.forEach((block, i) => {
        if (block.sort_order !== i) {
          // Use moveBlock to reorder dynamic blocks to match unified order
        }
      });

      // For now, if both items are dynamic, use moveBlock directly
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
  }, [dragIdx, dropIdx, previewItems, draftBlocks, moveBlock]);

  const getDynamicIndex = useCallback((blockId: string) => {
    return draftBlocks.findIndex(b => b.id === blockId);
  }, [draftBlocks]);

  return (
    <div className="flex h-full flex-col bg-muted/20" onClick={handleCanvasClick}>
      <div className="flex-1 overflow-y-auto">
        <div className="flex justify-center p-4">
          <div
            ref={canvasRef}
            className={cn(
              "min-h-[calc(100vh-8rem)] bg-background transition-all duration-300",
              viewport !== "desktop" && "rounded-xl border border-border/40 shadow-2xl",
            )}
            style={{ width: viewportWidth, maxWidth: "100%" }}
          >
            {previewItems.length === 0 ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-2xl bg-card/60 p-6 backdrop-blur-xl" style={{ boxShadow: '0 8px 40px -8px hsl(228 33% 2% / 0.5)' }}>
                  <Plus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Empty page</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">Add blocks to start building</p>
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
                      isDragOver={dropIdx === index && dragIdx !== index}
                      onDragStart={() => handleUnifiedDragStart(index)}
                      onDragOver={(e) => handleUnifiedDragOver(e, index)}
                      onDragEnd={handleUnifiedDragEnd}
                      onAddAfter={() => {
                        const dynamicInsertIdx = previewItems
                          .slice(0, index + 1)
                          .filter(i => i.source === "dynamic").length;
                        addBlock("text", dynamicInsertIdx);
                      }}
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
                    onMoveUp={() => dynamicIndex > 0 && moveBlock(dynamicIndex, dynamicIndex - 1)}
                    onMoveDown={() => dynamicIndex < draftBlocks.length - 1 && moveBlock(dynamicIndex, dynamicIndex + 1)}
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
                      selectBlock(block.id);
                      selectElement({ blockId: block.id, nodeKey, nodeType });
                    }}
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

/* ─── Static Section Shell — now renders real content ─── */

function StaticSectionShell({ item, index, isDragOver, onDragStart, onDragOver, onDragEnd, onAddAfter }: {
  item: PreviewItem;
  index: number;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onAddAfter: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const section = item.staticSection!;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={cn(
        "relative transition-all duration-150",
        isDragOver && "border-t-2 border-t-primary",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Locked badge + drag handle */}
      <div className="absolute top-2 left-3 z-20 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-card/95 px-2 py-1 shadow-lg backdrop-blur-xl">
        <GripVertical className="h-3 w-3 text-amber-500/60 cursor-grab" />
        <Lock className="h-3 w-3 text-amber-500" />
        <span className="font-display text-[9px] font-semibold uppercase tracking-wider text-amber-600">
          {section.label}
        </span>
      </div>

      {/* Reorder controls on hover */}
      {hovered && (
        <div className="absolute top-2 right-3 z-20 flex items-center gap-0.5 rounded-lg border border-amber-500/30 bg-card/95 px-1 py-0.5 shadow-lg backdrop-blur-xl">
          <button className="rounded p-1 text-amber-600 hover:text-amber-500" title="Move up (drag to reorder)">
            <ChevronUp className="h-3 w-3" />
          </button>
          <button className="rounded p-1 text-amber-600 hover:text-amber-500" title="Move down (drag to reorder)">
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Real content preview — pointer-events disabled */}
      <div className="pointer-events-none border-y border-dashed border-amber-500/20">
        <StaticSectionPreview section={section} />
      </div>

      {/* Insert-after control */}
      {hovered && (
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
}

function CanvasBlockWrapper({
  block, index, unifiedIndex, totalBlocks, isSelected, isHovered, isDragOver,
  onClick, onMouseEnter, onMouseLeave,
  onDelete, onDuplicate, onToggleActive, onAddBefore,
  onMoveUp, onMoveDown,
  onDragStart, onDragOver, onDragEnd,
  onUpdateContent,
  inlineEditingKey, onStartInlineEdit, onEndInlineEdit, onSelectElement,
}: CanvasBlockWrapperProps) {
  const isInactive = block.is_active === false;
  const showControls = isSelected || isHovered;
  const content = (block.content || {}) as Record<string, any>;
  const inlineTextKeys = getInlineTextKeys(block.block_type);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
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
  }, [inlineTextKeys, onStartInlineEdit]);

  const handleInlineSave = useCallback((key: string, value: string) => {
    onEndInlineEdit();
    if (value !== (content[key] || "")) {
      onUpdateContent({ ...content, [key]: value });
    }
  }, [content, onUpdateContent, onEndInlineEdit]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={cn(
        "relative transition-all duration-150 group/block",
        isSelected && "ring-2 ring-primary/60 ring-inset z-10",
        isHovered && !isSelected && "ring-1 ring-primary/30 ring-inset",
        isInactive && "opacity-30",
        isDragOver && "border-t-2 border-t-primary",
      )}
      onClick={(e) => onClick(e, block.id)}
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

      {/* Floating label toolbar (left) */}
      {showControls && (
        <div className="absolute top-1 left-2 z-30 flex items-center gap-1 rounded-lg border border-border/30 bg-card/95 px-1.5 py-0.5 shadow-lg backdrop-blur-xl">
          <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
          <span className="font-display text-[9px] font-semibold uppercase tracking-wider text-primary">
            {block.block_type.replace(/_/g, " ")}
          </span>
          {block.title && block.title !== block.block_type && (
            <span className="max-w-[80px] truncate text-[9px] text-muted-foreground">· {block.title}</span>
          )}
        </div>
      )}

      {/* Floating action toolbar (right) */}
      {showControls && (
        <div className="absolute top-1 right-2 z-30 flex items-center gap-0.5 rounded-lg border border-border/30 bg-card/95 px-1 py-0.5 shadow-lg backdrop-blur-xl">
          <ToolButton onClick={onMoveUp} title="Move up" disabled={index === 0}>
            <ChevronUp className="h-3 w-3" />
          </ToolButton>
          <ToolButton onClick={onMoveDown} title="Move down" disabled={index === totalBlocks - 1}>
            <ChevronDown className="h-3 w-3" />
          </ToolButton>
          <div className="w-px h-3 bg-border/30 mx-0.5" />
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
      {isSelected && inlineTextKeys.length > 0 && !inlineEditingKey && (
        <div className="absolute bottom-1 left-2 z-30 flex items-center gap-1 rounded-lg border border-border/30 bg-card/95 px-1.5 py-0.5 shadow-lg backdrop-blur-xl">
          <span className="text-[9px] text-muted-foreground">Double-click text to edit inline</span>
        </div>
      )}

      {/* Block content */}
      <div className={cn(isInactive ? "pointer-events-none" : "")}>
        {isSelected && inlineEditingKey ? (
          <InlineEditableBlock
            block={block}
            editingKey={inlineEditingKey}
            onSave={handleInlineSave}
            onCancel={onEndInlineEdit}
            content={content}
          />
        ) : (
          renderBlock(block)
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
      className={cn(
        "rounded p-1 transition-colors",
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
          className="pointer-events-auto min-w-[100px] max-w-[80%] rounded border-2 border-primary bg-background/90 px-3 py-2 text-foreground shadow-lg outline-none backdrop-blur-xl"
          style={{ fontSize: "inherit" }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          dangerouslySetInnerHTML={{ __html: currentValue }}
        />
      </div>
    </div>
  );
}
