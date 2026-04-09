import { Badge } from "@/components/ui/badge";

interface CountBadgeProps {
  count: number;
  className?: string;
}

export function CountBadge({ count, className }: CountBadgeProps) {
  if (!count) return null;
  return (
    <Badge
      variant="default"
      className={`absolute -right-1.5 -top-1.5 min-w-[18px] h-5 px-1.5 py-0.5 text-[11px] font-bold flex items-center justify-center shadow-[0_0_8px_hsl(var(--primary)/0.18)] border border-primary/30 bg-primary/90 text-primary-foreground ${className || ""}`}
      style={{ pointerEvents: "none", zIndex: 2 }}
    >
      {count}
    </Badge>
  );
}
