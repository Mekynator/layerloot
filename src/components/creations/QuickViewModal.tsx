import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, RotateCcw, Star, Pencil, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Showcase, useShowcaseFavorites, useToggleFavorite } from "@/hooks/use-showcases";
import { formatPrice } from "@/lib/currency";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface QuickViewModalProps {
  showcase: Showcase | null;
  open: boolean;
  onClose: () => void;
}

export default function QuickViewModal({ showcase, open, onClose }: QuickViewModalProps) {
  const navigate = useNavigate();
  const { data: favIds = [] } = useShowcaseFavorites();
  const toggleFav = useToggleFavorite();
  const [imgIndex, setImgIndex] = useState(0);

  if (!showcase) return null;

  const allImages = [...(showcase.preview_image_urls || []), ...(showcase.finished_image_urls || [])];
  const price = showcase.final_price ?? showcase.quoted_price;
  const isFav = favIds.includes(showcase.id);
  const isLithophane = showcase.category?.toLowerCase().includes("lithophane") ||
    showcase.tags?.some((t) => t.toLowerCase().includes("lithophane"));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-2xl border-border/60 gap-0">
        <div className="grid md:grid-cols-2">
          {/* Left: Image */}
          <div className="relative aspect-square md:aspect-auto bg-muted overflow-hidden">
            <AnimatePresence mode="wait">
              {allImages[imgIndex] ? (
                <motion.img
                  key={imgIndex}
                  src={allImages[imgIndex]}
                  alt={showcase.title}
                  className="h-full w-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
              )}
            </AnimatePresence>

            {allImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={cn(
                      "h-2 w-2 rounded-full transition-all",
                      i === imgIndex ? "bg-primary w-5" : "bg-background/70 backdrop-blur-sm"
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="p-6 flex flex-col gap-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{showcase.title}</h2>

              <div className="flex items-center gap-3">
                {showcase.rating_count > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-medium">{showcase.rating_avg?.toFixed(1)}</span>
                    <span className="text-muted-foreground">({showcase.rating_count})</span>
                  </div>
                )}
                {showcase.reorder_count > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> {showcase.reorder_count}× reordered
                  </span>
                )}
              </div>
            </div>

            {price != null && (
              <p className="text-2xl font-bold text-foreground">{formatPrice(price)}</p>
            )}

            {showcase.description && (
              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                {showcase.description}
              </p>
            )}

            {/* Quick specs */}
            <div className="space-y-2 rounded-xl bg-muted/50 p-3 text-sm">
              {showcase.materials && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material</span>
                  <span className="font-medium text-foreground">{showcase.materials}</span>
                </div>
              )}
              {showcase.colors && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Color</span>
                  <span className="font-medium text-foreground">{showcase.colors}</span>
                </div>
              )}
              {showcase.dimensions && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-medium text-foreground">{showcase.dimensions}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {showcase.category && <Badge variant="outline" className="text-xs">{showcase.category}</Badge>}
              {showcase.tags?.slice(0, 3).map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-auto pt-2">
              {showcase.reorder_enabled && showcase.approved_by_admin && (
                <Button
                  className="w-full gap-2 font-semibold"
                  onClick={() => {
                    const param = isLithophane ? "reorderLithophane" : "reorderShowcase";
                    navigate(`/create-your-own?${param}=${showcase.id}`);
                    onClose();
                  }}
                >
                  <RotateCcw className="h-4 w-4" /> Order This Item
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => toggleFav.mutate({ showcaseId: showcase.id, isFav })}
                >
                  <Heart className={cn("h-4 w-4", isFav && "fill-destructive text-destructive")} />
                  {isFav ? "Saved" : "Save"}
                </Button>
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => {
                    navigate(`/creations/${showcase.slug}`);
                    onClose();
                  }}
                >
                  View Full <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
