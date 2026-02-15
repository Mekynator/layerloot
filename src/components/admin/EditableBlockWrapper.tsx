import { GripVertical, Pencil, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Copy, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SiteBlock } from "./BlockRenderer";

interface EditableBlockWrapperProps {
  block: SiteBlock;
  index: number;
  total: number;
  isSelected: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onInsertBefore: () => void;
  children: React.ReactNode;
}

const EditableBlockWrapper = ({
  block, index, total, isSelected, isDragOver,
  onSelect, onEdit, onDelete, onDuplicate, onToggleActive,
  onMoveUp, onMoveDown, onDragStart, onDragOver, onDragEnd,
  onInsertBefore, children,
}: EditableBlockWrapperProps) => {
  return (
    <>
      {/* Insert zone before block */}
      <div
        className="group/insert flex h-6 items-center justify-center opacity-0 transition-opacity hover:opacity-100"
        onClick={(e) => { e.stopPropagation(); onInsertBefore(); }}
      >
        <div className="flex h-0.5 flex-1 bg-primary/30" />
        <button className="mx-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-110">
          <Plus className="h-3 w-3" />
        </button>
        <div className="flex h-0.5 flex-1 bg-primary/30" />
      </div>

      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onClick={onSelect}
        className={`group relative cursor-pointer transition-all ${
          isDragOver ? "ring-2 ring-primary ring-offset-2" :
          isSelected ? "ring-2 ring-primary/60 ring-offset-1" :
          "hover:ring-2 hover:ring-border hover:ring-offset-1"
        } ${!block.is_active ? "opacity-40" : ""}`}
      >
        {/* Floating toolbar */}
        <div className={`absolute -top-4 left-4 z-20 flex items-center gap-1 rounded-lg bg-foreground px-2 py-1 shadow-lg transition-opacity ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}>
          <GripVertical className="h-3.5 w-3.5 cursor-grab text-background" />
          <Badge className="border-none bg-primary/20 font-display text-[10px] uppercase text-background">{block.block_type}</Badge>
          <span className="max-w-[100px] truncate text-[10px] text-background/70">{block.title || ""}</span>
          <div className="ml-1 flex gap-0.5">
            <ToolBtn onClick={onMoveUp} disabled={index === 0}><ArrowUp className="h-3 w-3" /></ToolBtn>
            <ToolBtn onClick={onMoveDown} disabled={index === total - 1}><ArrowDown className="h-3 w-3" /></ToolBtn>
            <ToolBtn onClick={onToggleActive}>{block.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</ToolBtn>
            <ToolBtn onClick={onEdit}><Pencil className="h-3 w-3" /></ToolBtn>
            <ToolBtn onClick={onDuplicate}><Copy className="h-3 w-3" /></ToolBtn>
            <ToolBtn onClick={onDelete} destructive><Trash2 className="h-3 w-3" /></ToolBtn>
          </div>
        </div>

        {/* Actual rendered block */}
        <div className="pointer-events-none">
          {children}
        </div>
      </div>
    </>
  );
};

const ToolBtn = ({ children, onClick, disabled, destructive }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; destructive?: boolean;
}) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    disabled={disabled}
    className={`rounded p-0.5 transition-colors ${
      destructive ? "text-background/70 hover:text-red-400" : "text-background/70 hover:text-background"
    } disabled:opacity-30`}
  >
    {children}
  </button>
);

export default EditableBlockWrapper;
