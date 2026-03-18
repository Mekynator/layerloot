import { Button } from "@/components/ui/button";
import { Eye, EyeOff, GripVertical, Pencil, Plus } from "lucide-react";

export interface PreviewBlockRect {
  id: string;
  type: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

interface EditorPreviewOverlayProps {
  blocks: PreviewBlockRect[];
  selectedBlockId: string | null;
  hiddenBlockIds?: string[];
  draggingBlockId?: string | null;
  dragOverBlockId?: string | null;
  onSelectBlock: (id: string) => void;
  onEditBlock: (id: string) => void;
  onToggleActive?: (id: string) => void;
  onAddBefore?: (id: string) => void;
  onStartDrag?: (id: string) => void;
  onDragOverBlock?: (id: string) => void;
  onDropBlock?: (targetId: string) => void;
  onEndDrag?: () => void;
}

export default function EditorPreviewOverlay({
  blocks,
  selectedBlockId,
  hiddenBlockIds = [],
  draggingBlockId = null,
  dragOverBlockId = null,
  onSelectBlock,
  onEditBlock,
  onToggleActive,
  onAddBefore,
  onStartDrag,
  onDragOverBlock,
  onDropBlock,
  onEndDrag,
}: EditorPreviewOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {blocks.map((block) => {
        const selected = selectedBlockId === block.id;
        const hidden = hiddenBlockIds.includes(block.id);
        const dragging = draggingBlockId === block.id;
        const dragOver = dragOverBlockId === block.id && draggingBlockId !== block.id;

        return (
          <div
            key={block.id}
            className={`absolute rounded-md border-2 transition-all ${
              selected
                ? "border-primary bg-primary/10 shadow-lg"
                : hidden
                  ? "border-amber-500/70 bg-amber-500/10"
                  : "border-primary/60 bg-primary/5 hover:bg-primary/10"
            } ${dragging ? "opacity-50" : ""}`}
            style={{
              top: block.top,
              left: block.left,
              width: block.width,
              height: Math.max(block.height, 44),
            }}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOverBlock?.(block.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              onDropBlock?.(block.id);
            }}
          >
            {dragOver && (
              <div className="pointer-events-none absolute inset-x-0 -top-1 h-1 rounded bg-primary" />
            )}

            <button
              type="button"
              onClick={() => onSelectBlock(block.id)}
              className="pointer-events-auto absolute inset-0 h-full w-full rounded-md"
              title={`Select ${block.type}`}
            />

            <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-2 rounded-md bg-background/95 px-2 py-1 shadow-sm">
              <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-foreground">
                {block.type}
              </span>
              {hidden && (
                <span className="text-[10px] uppercase tracking-wider text-amber-600">Hidden</span>
              )}
            </div>

            <div className="pointer-events-auto absolute right-2 top-2 flex gap-1 rounded-md bg-background/95 p-1 shadow-sm">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={() => onStartDrag?.(block.id)}
                onDragEnd={() => onEndDrag?.()}
                title="Drag to reorder"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </Button>

              {onAddBefore && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onAddBefore(block.id)}
                  title="Add section before"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}

              {onToggleActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onToggleActive(block.id)}
                  title="Toggle visibility"
                >
                  {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEditBlock(block.id)}
                title="Edit block"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
