import { Link } from "react-router-dom";
import { Heart, RotateCcw, Star, Eye, ShoppingCart, TrendingUp, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Showcase, useShowcaseFavorites, useToggleFavorite } from "@/hooks/use-showcases";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/currency";
import { useState } from "react";

interface ShowcaseCardProps {
  item: Showcase;
  onQuickView?: (item: Showcase) => void;
}

export default function ShowcaseCard({ item, onQuickView }: ShowcaseCardProps) {
  const { data: favIds = [] } = useShowcaseFavorites();
  const toggle = useToggleFavorite();
  const isFav = favIds.includes(item.id);
  const [imageLoaded, setImageLoaded] = useState(false);

  const price = item.final_price ?? item.quoted_price;
  const img = item.thumbnail_url || item.preview_image_urls?.[0] || item.finished_image_urls?.[0];
  const isPopular = item.reorder_count >= 3;
  const isTrending = item.rating_count >= 5 && (item.rating_avg ?? 0) >= 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="group relative rounded-2xl bg-card/60 overflow-hidden backdrop-blur-md transition-all duration-500"
      style={{ boxShadow: '0 8px 40px -8px hsl(225 44% 4% / 0.5)' }}
    >
      {/* Image area */}
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <Link to={`/creations/${item.slug}`} className="block h-full">
          {img ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 animate-pulse bg-muted" />
              )}
              <img
                src={img}
                alt={item.title}
                className={cn(
                  "h-full w-full object-cover transition-transform duration-500 group-hover:scale-110",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              No image
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Bottom gradient always visible for text readability */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
        </Link>

        {/* Top-left badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5 z-10">
          {item.featured && (
            <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold shadow-lg gap-1">
              <Flame className="h-3 w-3" /> Featured
            </Badge>
          )}
          {isPopular && (
            <Badge className="bg-secondary text-secondary-foreground text-[10px] font-semibold shadow-lg gap-1">
              <TrendingUp className="h-3 w-3" /> Popular
            </Badge>
          )}
          {!item.approved_by_admin && item.visibility_status === "shared" && (
            <Badge variant="secondary" className="text-[10px] backdrop-blur-sm bg-background/80">Pending</Badge>
          )}
        </div>

        {/* Favorite button - always visible */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2.5 top-2.5 z-10 h-9 w-9 rounded-full bg-background/70 backdrop-blur-md border border-border/40 shadow-sm hover:bg-background/90 transition-all"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle.mutate({ showcaseId: item.id, isFav });
          }}
        >
          <Heart className={cn("h-4 w-4 transition-all", isFav ? "fill-destructive text-destructive scale-110" : "text-foreground")} />
        </Button>

        {/* Quick actions - visible on hover */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-2 pb-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          {onQuickView && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 rounded-full bg-background/90 backdrop-blur-md text-xs font-medium shadow-lg border border-border/40 gap-1.5 hover:bg-background"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(item);
              }}
            >
              <Eye className="h-3.5 w-3.5" /> Quick View
            </Button>
          )}
          {item.reorder_enabled && item.approved_by_admin && (
            <Button
              size="sm"
              className="h-8 rounded-full text-xs font-medium shadow-lg gap-1.5"
              asChild
            >
              <Link
                to={`/create?reorderShowcase=${item.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ShoppingCart className="h-3.5 w-3.5" /> Order
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <Link to={`/creations/${item.slug}`} className="block p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm line-clamp-1 text-foreground group-hover:text-primary transition-colors">
            {item.title}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {item.rating_count > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span className="font-medium text-foreground">{item.rating_avg?.toFixed(1)}</span>
              <span className="text-muted-foreground">({item.rating_count})</span>
            </div>
          )}
          {item.reorder_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCcw className="h-3 w-3" />
              <span>{item.reorder_count}× ordered</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-0.5">
          {price != null ? (
            <span className="font-bold text-base text-foreground">{formatPrice(price)}</span>
          ) : (
            <span className="text-xs text-muted-foreground italic">Price on request</span>
          )}
          {item.reorder_enabled && (
            <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary">
              <RotateCcw className="h-2.5 w-2.5" /> Reorder
            </Badge>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
