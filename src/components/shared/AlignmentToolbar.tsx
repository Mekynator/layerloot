import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  Columns3,
  Rows3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AlignAction } from "@/lib/snap-engine";

interface AlignmentToolbarProps {
  onAction: (action: AlignAction) => void;
  /** Multiple elements selected – show distribute actions */
  multiSelect?: boolean;
}

const ACTIONS: { action: AlignAction; icon: typeof AlignStartHorizontal; label: string; multi?: boolean }[] = [
  { action: "left", icon: AlignStartHorizontal, label: "Align left" },
  { action: "center-x", icon: AlignCenterHorizontal, label: "Center horizontally" },
  { action: "right", icon: AlignEndHorizontal, label: "Align right" },
  { action: "top", icon: AlignStartVertical, label: "Align top" },
  { action: "center-y", icon: AlignCenterVertical, label: "Center vertically" },
  { action: "bottom", icon: AlignEndVertical, label: "Align bottom" },
  { action: "distribute-x", icon: Columns3, label: "Distribute horizontally", multi: true },
  { action: "distribute-y", icon: Rows3, label: "Distribute vertically", multi: true },
];

export function AlignmentToolbar({ onAction, multiSelect }: AlignmentToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap gap-1">
        {ACTIONS.map(({ action, icon: Icon, label, multi }) => {
          if (multi && !multiSelect) return null;
          return (
            <Tooltip key={action}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onAction(action)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="sr-only">{label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">{label}</p></TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
