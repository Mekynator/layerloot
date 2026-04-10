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
  onAddAtIndex?: (index: number) => void;
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
    () => {
      // Deduplicate blocks by id to avoid React duplicate key warnings
      const uniqueById = Array.from(new Map(blocks.map((b) => [b.id, b])).values());
      return uniqueById.sort((a, b) => {
        if (a.top !== b.top) return a.top - b.top;
        return a.left - b.left;
      });
    },
    [blocks],
  );

  // Debug: log ordered block ids to help trace duplicate-key warnings
  // (left as debug during investigation; remove once resolved)
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("EditorPreviewOverlay orderedBlockIds:", orderedBlocks.map((b) => b.id));
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Inline add controls between sections */}
      {orderedBlocks.length === 0 ? (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={() => onAddAtIndex?.(0)}
            className="rounded-md bg-primary/95 px-3 py-2 text-xs font-semibold text-white shadow-md"
          >
            + Add Section
          </button>
        </div>
      ) : (
        // top insertion
        orderedBlocks.map((b, i) => null)
      )}

      {
        const keyCounts = new Map<string, number>();
        // ensure unique keys even if duplicate ids slip through
      }

      {orderedBlocks.map((block) => {
        const prev = keyCounts.get(block.id) ?? 0;
        const count = prev + 1;
        keyCounts.set(block.id, count);
        const renderKey = count === 1 ? block.id : `${block.id}-${count}`;
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
            key={renderKey}
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
              className={`pointer-events-none absolute ${labelTopClass} ${labelLeftClass} ${labelWidthClass} flex items-center gap-2 rounded-lg border border-border/30 bg-card/95 px-2 py-1 shadow-[0_2px_12px_-2px_hsl(228_33%_2%/0.4)] backdrop-blur-xl`}
            >
              <span className="truncate font-display text-[10px] font-semibold uppercase tracking-wider text-foreground">
                {formatBlockLabel(block.type)}
              </span>
              {hidden && <span className="shrink-0 text-[10px] uppercase tracking-wider text-amber-600">Hidden</span>}
            </div>

            <div
              className={`pointer-events-auto absolute ${toolbarTopClass} ${toolbarRightClass} flex gap-1 rounded-lg border border-border/30 bg-card/95 p-1 shadow-[0_4px_20px_-4px_hsl(228_33%_2%/0.5)] backdrop-blur-xl transition-opacity duration-150 ${
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

        {/* Render inline add buttons between blocks and after last */}
        {orderedBlocks.map((block, idx) => {
          const nextTop = block.top + block.height + 8;
          const centerX = block.left + block.width / 2 - 80;
          return (
            <div key={`add-${block.id}`} style={{ top: nextTop, left: centerX }} className="pointer-events-auto absolute z-30">
              <button
                type="button"
                onClick={() => onAddAtIndex?.(idx + 1)}
                className="rounded-full bg-card/95 px-3 py-1 text-[12px] font-medium shadow-md border border-border/30"
              >
                + Add Section
              </button>
            </div>
          );
        })}

        {orderedBlocks.length > 0 && (
          <div style={{ top: orderedBlocks[orderedBlocks.length - 1].top + orderedBlocks[orderedBlocks.length - 1].height + 28, left: orderedBlocks[orderedBlocks.length - 1].left }} className="pointer-events-auto absolute z-30">
            <button
              type="button"
              onClick={() => onAddAtIndex?.(orderedBlocks.length)}
              className="rounded-md bg-card/95 px-3 py-1 text-sm font-medium shadow-md border border-border/30"
            >
              + Add Section
            </button>
          </div>
        )}
    </div>
  );
}
