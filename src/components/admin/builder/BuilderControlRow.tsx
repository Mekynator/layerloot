import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface BuilderControlRowProps {
  label: string;
  /** Optional small hint text rendered below the label. */
  hint?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Shared builder primitive: a labelled property row used in both the
 * Page Editor and the Popup Campaign Builder property panels.
 *
 * Usage:
 *   <BuilderControlRow label="Font size">
 *     <Input type="number" value={...} onChange={...} />
 *   </BuilderControlRow>
 */
export function BuilderControlRow({ label, hint, className, children }: BuilderControlRowProps) {
  return (
    <div className={cn(className)}>
      <Label className="text-xs">{label}</Label>
      {hint && <p className="text-[10px] leading-snug text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
