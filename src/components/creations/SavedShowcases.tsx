import { useSavedShowcases, useShowcaseFavorites, Showcase } from "@/hooks/use-showcases";
import ShowcaseCard from "./ShowcaseCard";
import QuickViewModal from "./QuickViewModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";

export default function SavedShowcases() {
  const { data: favIds = [] } = useShowcaseFavorites();
  const { data: showcases = [], isLoading } = useSavedShowcases();
  const [quickViewItem, setQuickViewItem] = useState<Showcase | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[4/5] rounded-2xl" />
            <Skeleton className="h-4 w-3/4 rounded-lg" />
            <Skeleton className="h-3 w-1/2 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!favIds.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-20 text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <Heart className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Save creations you love</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          Tap the heart icon on any creation to save it here for quick access later.
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <QuickViewModal showcase={quickViewItem} open={!!quickViewItem} onClose={() => setQuickViewItem(null)} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {showcases.map((s) => (
          <ShowcaseCard key={s.id} item={s} onQuickView={setQuickViewItem} />
        ))}
      </div>
    </>
  );
}
