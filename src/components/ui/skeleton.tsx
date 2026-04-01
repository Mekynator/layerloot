import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-muted/40 backdrop-blur-sm",
        "bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 bg-[length:200%_100%]",
        "animate-[shimmer_2s_ease-in-out_infinite]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
