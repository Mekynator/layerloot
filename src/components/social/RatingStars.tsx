import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RatingStars({
  rating,
  count,
  className,
}: {
  rating: number | null | undefined;
  count?: number;
  className?: string;
}) {
  if (!rating) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-4 w-4",
              star <= Math.round(rating) ? "fill-primary text-primary" : "text-muted-foreground/50",
            )}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {rating.toFixed(1)}{typeof count === "number" ? ` (${count})` : ""}
      </span>
    </div>
  );
}
