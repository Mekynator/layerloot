import { Link } from "react-router-dom";
import { Heart, RotateCcw, Star, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Showcase, useShowcaseFavorites, useToggleFavorite } from "@/hooks/use-showcases";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/currency";

export default function ShowcaseCard({ item }: { item: Showcase }) {
  const { data: favIds = [] } = useShowcaseFavorites();
  const toggle = useToggleFavorite();
  const isFav = favIds.includes(item.id);

  const price = item.final_price ?? item.quoted_price;
  const img = item.thumbnail_url || item.preview_image_urls?.[0] || item.finished_image_urls?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* image */}
      <Link to={`/creations/${item.slug}`} className="block aspect-square overflow-hidden bg-muted">
        {img ? (
          <img
            src={img}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
      </Link>

      {/* badges */}
      <div className="absolute left-2 top-2 flex flex-col gap-1">
        {item.featured && (
          <Badge className="bg-primary text-primary-foreground text-[10px]">Featured</Badge>
        )}
        {item.reorder_enabled && (
          <Badge variant="outline" className="bg-background/80 backdrop-blur text-[10px] gap-1">
            <RotateCcw className="h-3 w-3" /> Reorder
          </Badge>
        )}
        {!item.approved_by_admin && item.visibility_status === "shared" && (
          <Badge variant="secondary" className="text-[10px]">Pending</Badge>
        )}
      </div>

      {/* favorite button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur"
        onClick={(e) => {
          e.preventDefault();
          toggle.mutate({ showcaseId: item.id, isFav });
        }}
      >
        <Heart className={cn("h-4 w-4", isFav && "fill-destructive text-destructive")} />
      </Button>

      {/* body */}
      <Link to={`/creations/${item.slug}`} className="block p-3 space-y-1.5">
        <h3 className="font-semibold text-sm line-clamp-1">{item.title}</h3>

        {item.rating_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span>{item.rating_avg?.toFixed(1)}</span>
            <span>({item.rating_count})</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          {price != null ? (
            <span className="font-bold text-sm">{formatPrice(price)}</span>
          ) : (
            <span className="text-xs text-muted-foreground">Price on request</span>
          )}
          {item.reorder_count > 0 && (
            <span className="text-[10px] text-muted-foreground">
              Reordered {item.reorder_count}×
            </span>
          )}
        </div>

        {item.category && (
          <Badge variant="outline" className="text-[10px] mt-1">{item.category}</Badge>
        )}
      </Link>
    </motion.div>
  );
}
