import { useCallback, useRef, useState } from "react";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";
import { useVisualEditor } from "@/contexts/VisualEditorContext";
import { Plus, Eye, EyeOff, Copy, Trash2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getBlockSchema, getInlineTextKeys } from "./editable-schema";

const VIEWPORT_WIDTHS = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export default function EditorCanvas() {
  const {
    draftBlocks, selectedBlockId, hoveredBlockId,
    selectBlock, hoverBlock, viewport,
    deleteBlock, duplicateBlock, toggleBlockActive, addBlock, moveBlock,
    updateBlockContent, selectElement, inlineEditingKey, setInlineEditingKey,
  } = useVisualEditor();

  const canvasRef = useRef<HTMLDivElement>(null);

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

  // Drag reorder state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => setDragIdx(index), []);
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDropIdx(index);
  }, []);
  const handleDragEnd = useCallback(() => {
    if (dragIdx !== null && dropIdx !== null && dragIdx !== dropIdx) {
      moveBlock(dragIdx, dropIdx);
    }
    setDragIdx(null);
    setDropIdx(null);
  }, [dragIdx, dropIdx, moveBlock]);

  return (
    <div className="flex h-full flex-col bg-muted/20" onClick={handleCanvasClick}>
      <ScrollArea className="flex-1">
        <div className="flex justify-center p-4">
          <div
            ref={canvasRef}
            className={cn(
              "min-h-[calc(100vh-8rem)] bg-background transition-all duration-300",
              viewport !== "desktop" && "rounded-xl border border-border/40 shadow-2xl",
            )}
            style={{ width: viewportWidth, maxWidth: "100%" }}
          >
            {draftBlocks.length === 0 ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-2xl bg-card/60 p-6 backdrop-blur-xl" style={{ boxShadow: '0 8px 40px -8px hsl(228 33% 2% / 0.5)' }}>
                  <Plus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Empty page</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">Add blocks to start building</p>
                </div>
              </div>
            ) : (
              draftBlocks.map((block, index) => (
                <CanvasBlockWrapper
                  key={block.id}
                  block={block}
                  index={index}
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
                  onAddBefore={() => addBlock("text", index)}
                  onMoveUp={() => index > 0 && moveBlock(index, index - 1)}
                  onMoveDown={() => index < draftBlocks.length - 1 && moveBlock(index, index + 1)}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
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
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

interface CanvasBlockWrapperProps {
  block: SiteBlock;
  index: number;
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
  block, index, totalBlocks, isSelected, isHovered, isDragOver,
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
  const schema = getBlockSchema(block.block_type);
  const inlineTextKeys = getInlineTextKeys(block.block_type);

  // Handle double-click for inline text editing
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Find the closest editable text element
    const target = e.target as HTMLElement;
    const editableEl = target.closest("[data-editable-key]");
    if (editableEl) {
      const key = editableEl.getAttribute("data-editable-key")!;
      onStartInlineEdit(key);
      return;
    }
    // Fallback: try first inline text key
    if (inlineTextKeys.length > 0) {
      onStartInlineEdit(inlineTextKeys[0]);
    }
  }, [inlineTextKeys, onStartInlineEdit]);

  // Handle inline edit save
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

/** Renders the block with the currently editing text field replaced by a contentEditable element */
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
      {/* Overlay editable field */}
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
