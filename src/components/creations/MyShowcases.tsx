import { useMyShowcases } from "@/hooks/use-showcases";
import ShowcaseCard from "./ShowcaseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Paintbrush } from "lucide-react";

export default function MyShowcases() {
  const { data: showcases = [], isLoading } = useMyShowcases();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!showcases.length) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <Paintbrush className="h-10 w-10 mb-3 opacity-40" />
        <p className="font-medium">No creations yet</p>
        <p className="text-sm">Upload your first custom creation to get started!</p>
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
