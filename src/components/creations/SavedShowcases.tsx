import { useSavedShowcases, useShowcaseFavorites } from "@/hooks/use-showcases";
import ShowcaseCard from "./ShowcaseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";

export default function SavedShowcases() {
  const { data: favIds = [] } = useShowcaseFavorites();
  const { data: showcases = [], isLoading } = useSavedShowcases();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!favIds.length) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <Heart className="h-10 w-10 mb-3 opacity-40" />
        <p className="font-medium">No saved creations</p>
        <p className="text-sm">Heart any creation to save it here!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {showcases.map((s) => (
        <ShowcaseCard key={s.id} item={s} />
      ))}
    </div>
  );
}
