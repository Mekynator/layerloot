import { useMyShowcases } from "@/hooks/use-showcases";
import ShowcaseCard from "./ShowcaseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Paintbrush, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function MyShowcases({ onCreateClick }: { onCreateClick?: () => void }) {
  const { data: showcases = [], isLoading } = useMyShowcases();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[4/5] rounded-2xl" />
            <Skeleton className="h-4 w-3/4 rounded-lg" />
            <Skeleton className="h-3 w-1/2 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!showcases.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-20 text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Paintbrush className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No creations yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          Upload your first custom creation to showcase your work and inspire others!
        </p>
        {onCreateClick && (
          <Button onClick={onCreateClick} className="mt-4 gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> Create Your First
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {showcases.map((s) => (
        <ShowcaseCard key={s.id} item={s} />
      ))}
    </div>
  );
}
