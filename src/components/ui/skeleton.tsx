import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border border-border/20 bg-card/40 backdrop-blur-sm",
        "bg-gradient-to-r from-card/40 via-card/20 to-card/40 bg-[length:200%_100%]",
        "animate-[shimmer_2s_ease-in-out_infinite]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
