import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-primary/30 bg-primary/15 text-primary shadow-[0_0_8px_hsl(217_91%_60%/0.15)]",
        secondary:
          "border border-border/40 bg-secondary/60 text-secondary-foreground backdrop-blur-sm",
        destructive:
          "border border-destructive/30 bg-destructive/15 text-destructive-foreground",
        outline:
          "border border-border/50 bg-card/40 text-foreground backdrop-blur-sm",
        success:
          "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
