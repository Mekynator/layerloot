import { useMemo, useState } from "react";
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

const formatBlockLabel = (value: string) => value.replace(/_/g, " ").replace(/-/g, " ").replace(/\s+/g, " ").trim();

const getOverlayMetrics = (block: PreviewBlockRect) => {
  const safeWidth = Math.max(block.width, 120);
  const safeHeight = Math.max(block.height, 44);
  const tiny = safeHeight <= 72;
  const veryTiny = safeHeight <= 52;
  const narrow = safeWidth <= 220;

  return {
    width: safeWidth,
    height: safeHeight,
    tiny,
    veryTiny,
    narrow,
  };
};

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
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

  const orderedBlocks = useMemo(
    () =>
      [...blocks].sort((a, b) => {
        if (a.top !== b.top) return a.top - b.top;
        return a.left - b.left;
      }),
    [blocks],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {orderedBlocks.map((block) => {
        const selected = selectedBlockId === block.id;
        const hidden = hiddenBlockIds.includes(block.id);
        const dragging = draggingBlockId === block.id;
        const dragOver = dragOverBlockId === block.id && draggingBlockId !== block.id;
        const hovered = hoveredBlockId === block.id;
        const showToolbar = selected || hovered || dragging;
        const metrics = getOverlayMetrics(block);

        const containerClass = selected
          ? "border-primary bg-primary/12 shadow-lg ring-2 ring-primary/25"
          : hidden
            ? "border-amber-500/70 bg-amber-500/10"
            : hovered
              ? "border-primary/85 bg-primary/10 shadow-md"
              : "border-primary/50 bg-primary/[0.04]";

        const labelTopClass = metrics.tiny ? "-top-8" : "top-2";
        const labelLeftClass = metrics.narrow ? "left-1.5" : "left-2";
        const toolbarTopClass = metrics.tiny ? "-top-8" : "top-2";
        const toolbarRightClass = metrics.narrow ? "right-1.5" : "right-2";
        const toolbarWrapClass = metrics.narrow ? "max-w-[calc(100%-0.5rem)] flex-wrap justify-end" : "";
        const labelWidthClass = metrics.narrow ? "max-w-[70%]" : "max-w-[60%]";
        const toolbarButtonSize = metrics.veryTiny ? "h-6 w-6" : "h-7 w-7";
        const iconSize = metrics.veryTiny ? "h-3 w-3" : "h-3.5 w-3.5";

        return (
          <div
            key={block.id}
            className={`absolute rounded-md border-2 transition-all duration-150 ${containerClass} ${dragging ? "opacity-50" : ""}`}
            style={{
              top: block.top,
              left: block.left,
              width: metrics.width,
              height: metrics.height,
            }}
            onMouseEnter={() => setHoveredBlockId(block.id)}
            onMouseLeave={() => setHoveredBlockId((current) => (current === block.id ? null : current))}
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
              <div className="pointer-events-none absolute inset-x-0 -top-1 h-1 rounded bg-primary shadow-sm" />
            )}

            <button
              type="button"
              onClick={() => onSelectBlock(block.id)}
              onDoubleClick={() => onEditBlock(block.id)}
              className="pointer-events-auto absolute inset-0 h-full w-full rounded-md"
              title={`Select ${block.type}`}
            />

            <div
              className={`pointer-events-none absolute ${labelTopClass} ${labelLeftClass} ${labelWidthClass} flex items-center gap-2 rounded-md border border-border bg-background/95 px-2 py-1 shadow-sm backdrop-blur`}
            >
              <span className="truncate font-display text-[10px] font-semibold uppercase tracking-wider text-foreground">
                {formatBlockLabel(block.type)}
              </span>
              {hidden && <span className="shrink-0 text-[10px] uppercase tracking-wider text-amber-600">Hidden</span>}
            </div>

            <div
              className={`pointer-events-auto absolute ${toolbarTopClass} ${toolbarRightClass} flex gap-1 rounded-md border border-border bg-background/95 p-1 shadow-sm backdrop-blur transition-opacity duration-150 ${
                showToolbar ? "opacity-100" : "opacity-0"
              } ${toolbarWrapClass}`}
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={`${toolbarButtonSize} cursor-grab active:cursor-grabbing`}
                draggable
                onDragStart={() => onStartDrag?.(block.id)}
                onDragEnd={() => onEndDrag?.()}
                title="Drag to reorder"
              >
                <GripVertical className={iconSize} />
              </Button>

              {onAddBefore && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={toolbarButtonSize}
                  onClick={() => onAddBefore(block.id)}
                  title="Add section before"
                >
                  <Plus className={iconSize} />
                </Button>
              )}

              {onToggleActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={toolbarButtonSize}
                  onClick={() => onToggleActive(block.id)}
                  title="Toggle visibility"
                >
                  {hidden ? <EyeOff className={iconSize} /> : <Eye className={iconSize} />}
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="icon"
                className={toolbarButtonSize}
                onClick={() => onEditBlock(block.id)}
                title="Edit block"
              >
                <Pencil className={iconSize} />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
