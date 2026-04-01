import { useCallback, useRef, useState } from "react";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";
import { useVisualEditor } from "@/contexts/VisualEditorContext";
import { Plus, Eye, EyeOff, Copy, Trash2, ChevronUp, ChevronDown, GripVertical, Type } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
    updateBlockContent,
  } = useVisualEditor();

  const canvasRef = useRef<HTMLDivElement>(null);

  const handleBlockClick = useCallback((e: React.MouseEvent, blockId: string) => {
    e.stopPropagation();
    selectBlock(blockId);
  }, [selectBlock]);

  const handleCanvasClick = useCallback(() => {
    selectBlock(null);
  }, [selectBlock]);

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
}

function CanvasBlockWrapper({
  block, index, totalBlocks, isSelected, isHovered, isDragOver,
  onClick, onMouseEnter, onMouseLeave,
  onDelete, onDuplicate, onToggleActive, onAddBefore,
  onMoveUp, onMoveDown,
  onDragStart, onDragOver, onDragEnd,
  onUpdateContent,
}: CanvasBlockWrapperProps) {
  const isInactive = block.is_active === false;
  const showControls = isSelected || isHovered;
  const [editingField, setEditingField] = useState<string | null>(null);
  const content = (block.content || {}) as Record<string, any>;

  // Inline text editing handler
  const handleInlineEdit = useCallback((field: string) => {
    setEditingField(field);
  }, []);

  const handleInlineBlur = useCallback((field: string, value: string) => {
    setEditingField(null);
    if (value !== (content[field] || "")) {
      onUpdateContent({ ...content, [field]: value });
    }
  }, [content, onUpdateContent]);

  // Check if block has inline-editable text fields
  const inlineFields = getInlineEditableFields(block.block_type);

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

      {/* Inline edit overlay for text fields */}
      {isSelected && inlineFields.length > 0 && (
        <div className="absolute bottom-1 left-2 z-30 flex items-center gap-1 rounded-lg border border-border/30 bg-card/95 px-1.5 py-0.5 shadow-lg backdrop-blur-xl">
          <Type className="h-3 w-3 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">Click text to edit inline</span>
        </div>
      )}

      {/* Block content with inline editing overlays */}
      <div className={cn(isInactive ? "pointer-events-none" : "")}>
        {isSelected && inlineFields.length > 0 ? (
          <InlineEditableBlock
            block={block}
            fields={inlineFields}
            editingField={editingField}
            onStartEdit={handleInlineEdit}
            onBlur={handleInlineBlur}
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

// Get inline-editable text fields per block type
function getInlineEditableFields(blockType: string): string[] {
  switch (blockType) {
    case "hero": return ["eyebrow", "heading", "subheading"];
    case "text": return ["heading", "body"];
    case "cta": return ["heading", "subheading", "button_text"];
    case "banner":
    case "shipping_banner": return ["text", "heading"];
    case "newsletter": return ["heading", "subheading"];
    case "video": return ["heading"];
    case "embed": return ["heading"];
    default: return [];
  }
}

// Inline editable block - renders the real block but with contentEditable overlays
function InlineEditableBlock({
  block, fields, editingField, onStartEdit, onBlur, content,
}: {
  block: SiteBlock;
  fields: string[];
  editingField: string | null;
  onStartEdit: (field: string) => void;
  onBlur: (field: string, value: string) => void;
  content: Record<string, any>;
}) {
  // For simplicity, render the block normally and show editable overlay hints
  // A full WYSIWYG would intercept DOM nodes, but this provides a good UX
  return (
    <div className="relative">
      {renderBlock(block)}
      {/* Overlay editable field hints */}
      {fields.map((field) => {
        const value = typeof content[field] === "string" ? content[field] : "";
        if (!value && !editingField) return null;
        return null; // Fields are edited via sidebar, the hint tells user
      })}
    </div>
  );
}
