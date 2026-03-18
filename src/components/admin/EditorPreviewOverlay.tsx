import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";

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
  onSelectBlock: (id: string) => void;
  onEditBlock: (id: string) => void;
  onToggleActive?: (id: string) => void;
  onAddBefore?: (id: string) => void;
}

export default function EditorPreviewOverlay({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onEditBlock,
  onToggleActive,
  onAddBefore,
}: EditorPreviewOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {blocks.map((block) => {
        const selected = selectedBlockId === block.id;

        return (
          <div
            key={block.id}
            className={`absolute rounded-md border-2 transition-all ${
              selected
                ? "border-primary bg-primary/10 shadow-lg"
                : "border-primary/60 bg-primary/5 hover:bg-primary/10"
            }`}
            style={{
              top: block.top,
              left: block.left,
              width: block.width,
              height: Math.max(block.height, 44),
            }}
          >
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
            </div>

            <div className="pointer-events-auto absolute right-2 top-2 flex gap-1 rounded-md bg-background/95 p-1 shadow-sm">
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
                  {selected ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
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
