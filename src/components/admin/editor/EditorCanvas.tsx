import { useCallback, useRef } from "react";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";
import { useVisualEditor } from "@/contexts/VisualEditorContext";
import { Plus, Pencil, GripVertical, Eye, EyeOff, Copy, Trash2 } from "lucide-react";
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
    deleteBlock, duplicateBlock, toggleBlockActive, addBlock,
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

  return (
    <div className="flex h-full flex-col bg-muted/20" onClick={handleCanvasClick}>
      {/* Canvas viewport */}
      <ScrollArea className="flex-1">
        <div className="flex justify-center p-4">
          <div
            ref={canvasRef}
            className={cn(
              "min-h-[calc(100vh-8rem)] bg-background transition-all duration-300",
              viewport !== "desktop" && "rounded-xl border border-border/40 shadow-2xl",
            )}
            style={{
              width: viewportWidth,
              maxWidth: "100%",
            }}
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
                  isSelected={selectedBlockId === block.id}
                  isHovered={hoveredBlockId === block.id}
                  onClick={handleBlockClick}
                  onMouseEnter={() => hoverBlock(block.id)}
                  onMouseLeave={() => hoverBlock(null)}
                  onDelete={() => deleteBlock(block.id)}
                  onDuplicate={() => duplicateBlock(block.id)}
                  onToggleActive={() => toggleBlockActive(block.id)}
                  onAddBefore={() => addBlock("text", index)}
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
  isSelected: boolean;
  isHovered: boolean;
  onClick: (e: React.MouseEvent, id: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onAddBefore: () => void;
}

function CanvasBlockWrapper({
  block, index, isSelected, isHovered,
  onClick, onMouseEnter, onMouseLeave,
  onDelete, onDuplicate, onToggleActive, onAddBefore,
}: CanvasBlockWrapperProps) {
  const isInactive = block.is_active === false;
  const showControls = isSelected || isHovered;

  return (
    <div
      className={cn(
        "relative transition-all duration-150",
        isSelected && "ring-2 ring-primary/60 ring-inset",
        isHovered && !isSelected && "ring-1 ring-primary/30 ring-inset",
        isInactive && "opacity-30",
      )}
      onClick={(e) => onClick(e, block.id)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Top insert line */}
      {isHovered && (
        <div className="absolute -top-px inset-x-0 z-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity h-4 -translate-y-1/2 cursor-pointer group/insert" onClick={(e) => { e.stopPropagation(); onAddBefore(); }}>
          <div className="h-0.5 flex-1 bg-primary/40" />
          <div className="mx-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm text-[10px]">
            <Plus className="h-2.5 w-2.5" />
          </div>
          <div className="h-0.5 flex-1 bg-primary/40" />
        </div>
      )}

      {/* Floating toolbar */}
      {showControls && (
        <div className="absolute top-1 left-2 z-30 flex items-center gap-1 rounded-lg border border-border/30 bg-card/95 px-1.5 py-0.5 shadow-lg backdrop-blur-xl">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          <span className="font-display text-[9px] font-semibold uppercase tracking-wider text-primary">
            {block.block_type.replace(/_/g, " ")}
          </span>
          {block.title && block.title !== block.block_type && (
            <span className="max-w-[80px] truncate text-[9px] text-muted-foreground">· {block.title}</span>
          )}
        </div>
      )}

      {showControls && (
        <div className="absolute top-1 right-2 z-30 flex items-center gap-0.5 rounded-lg border border-border/30 bg-card/95 px-1 py-0.5 shadow-lg backdrop-blur-xl">
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

      {/* Block content */}
      <div className={cn(isInactive ? "pointer-events-none" : "")}>
        {renderBlock(block)}
      </div>
    </div>
  );
}

function ToolButton({ children, onClick, title, destructive }: {
  children: React.ReactNode; onClick: () => void; title: string; destructive?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      className={cn(
        "rounded p-1 transition-colors",
        destructive ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
