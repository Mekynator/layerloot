import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCommunityShowcases } from "@/hooks/use-showcases";
import ShowcaseCard from "./ShowcaseCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShowcaseGallery() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [category, setCategory] = useState<string>("");

  const { data: showcases = [], isLoading } = useCommunityShowcases({
    search: search || undefined,
    sortBy,
    category: category || undefined,
  });

  return (
    <div className="space-y-6">
      {/* filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search creations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most reordered</SelectItem>
            <SelectItem value="rating">Highest rated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : showcases.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <SlidersHorizontal className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">No community creations yet</p>
          <p className="text-sm">Be the first to share your custom creation!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {showcases.map((s) => (
            <ShowcaseCard key={s.id} item={s} />
          ))}
        </div>
      )}
    </div>
  );
}
