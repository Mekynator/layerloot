import { useState, useMemo } from "react";
import { Search, Flame, TrendingUp, Clock, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCommunityShowcases, Showcase } from "@/hooks/use-showcases";
import ShowcaseCard from "./ShowcaseCard";
import QuickViewModal from "./QuickViewModal";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

function DiscoverySection({
  title,
  icon,
  items,
  onQuickView,
}: {
  title: string;
  icon: React.ReactNode;
  items: Showcase[];
  onQuickView: (item: Showcase) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((s) => (
          <ShowcaseCard key={s.id} item={s} onQuickView={onQuickView} />
        ))}
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-[4/5] rounded-2xl" />
      <Skeleton className="h-4 w-3/4 rounded-lg" />
      <Skeleton className="h-3 w-1/2 rounded-lg" />
      <Skeleton className="h-5 w-1/3 rounded-lg" />
    </div>
  );
}

export default function ShowcaseGallery() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [category, setCategory] = useState<string>("");
  const [quickViewItem, setQuickViewItem] = useState<Showcase | null>(null);

  const { data: showcases = [], isLoading } = useCommunityShowcases({
    search: search || undefined,
    sortBy,
    category: category || undefined,
  });

  // Compute discovery sections
  const { trending, mostReordered, recentlyAdded } = useMemo(() => {
    const trending = showcases
      .filter((s) => s.rating_count >= 2 && (s.rating_avg ?? 0) >= 3.5)
      .sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0))
      .slice(0, 4);

    const mostReordered = showcases
      .filter((s) => s.reorder_count > 0)
      .sort((a, b) => b.reorder_count - a.reorder_count)
      .slice(0, 4);

    const recentlyAdded = [...showcases]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);

    return { trending, mostReordered, recentlyAdded };
  }, [showcases]);

  const showDiscoverySections = !search && !category && sortBy === "newest" && showcases.length >= 4;

  return (
    <div className="space-y-8">
      <QuickViewModal
        showcase={quickViewItem}
        open={!!quickViewItem}
        onClose={() => setQuickViewItem(null)}
      />

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search creations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-border/60"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[170px] rounded-xl border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="popular">Most reordered</SelectItem>
            <SelectItem value="rating">Highest rated</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : showcases.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-20 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Be the first to share</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            No community creations yet. Upload your custom creation and inspire others!
          </p>
        </motion.div>
      ) : (
        <div className="space-y-10">
          {/* Discovery sections (only when not filtering) */}
          {showDiscoverySections && (
            <>
              <DiscoverySection
                title="Trending Creations"
                icon={<Flame className="h-5 w-5 text-primary" />}
                items={trending}
                onQuickView={setQuickViewItem}
              />
              <DiscoverySection
                title="Most Reordered"
                icon={<TrendingUp className="h-5 w-5 text-primary" />}
                items={mostReordered}
                onQuickView={setQuickViewItem}
              />
              {(trending.length > 0 || mostReordered.length > 0) && (
                <div className="border-t border-border/40 pt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">All Creations</h3>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Main grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {showcases.map((s) => (
              <ShowcaseCard key={s.id} item={s} onQuickView={setQuickViewItem} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
