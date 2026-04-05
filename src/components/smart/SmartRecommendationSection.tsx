import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import type { RecommendationSection } from "@/hooks/use-smart-recommendations";
import { staggerContainer, fadeUp } from "@/lib/motion";
import type { ProductSocialProof } from "@/lib/social-proof";
import type { ProductTileSectionSettings } from "@/lib/product-tile-section-settings";

interface Props {
  section: RecommendationSection;
  socialProofMap?: Map<string, ProductSocialProof>;
  settings?: Partial<ProductTileSectionSettings>;
}

export default function SmartRecommendationSection({ section, socialProofMap, settings }: Props) {
  const s = settings ?? {};
  const showTitle = s.showTitle !== false;
  const showSubtitle = s.showSubtitle === true; // default OFF now
  const showBadge = s.showBadge === true; // default OFF now
  const layoutMode = s.layoutMode || "grid";
  const columns = s.gridColumns || 4;
  const maxItems = s.maxItems || section.products.length;
  const showArrows = s.showArrows !== false;
  const gap = s.spacing || 16;

  const displayedProducts = section.products.slice(0, maxItems);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    if (layoutMode !== "carousel") return;
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [layoutMode]);

  const scroll = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  const colClass =
    columns === 1 ? "grid-cols-1"
    : columns === 2 ? "grid-cols-2"
    : columns === 3 ? "grid-cols-2 xl:grid-cols-3"
    : "grid-cols-2 xl:grid-cols-4";

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={staggerContainer}
      className="space-y-5"
    >
      {(showTitle || showSubtitle || showBadge) && (
        <div className="space-y-1.5">
          {showTitle && (
            <h2 className="font-display text-2xl font-bold uppercase text-foreground">{section.title}</h2>
          )}
          {showSubtitle && (
            <p className="max-w-2xl text-sm text-muted-foreground">{section.subtitle}</p>
          )}
        </div>
      )}

      {layoutMode === "carousel" ? (
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2"
            style={{ gap: `${gap}px` }}
          >
            {displayedProducts.map((product, index) => (
              <motion.div
                key={product.id}
                variants={fadeUp}
                className="w-[260px] shrink-0 snap-start md:w-[280px]"
              >
                <ProductCard
                  product={product}
                  socialProof={socialProofMap?.get(product.id)}
                  index={index}
                />
              </motion.div>
            ))}
          </div>
          {showArrows && canScrollLeft && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute -left-2 top-1/2 -translate-y-1/2 bg-background/80 shadow-md hover:bg-background"
              onClick={() => scroll(-1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          {showArrows && canScrollRight && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-2 top-1/2 -translate-y-1/2 bg-background/80 shadow-md hover:bg-background"
              onClick={() => scroll(1)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      ) : (
        <div className={`grid ${colClass}`} style={{ gap: `${gap}px` }}>
          {displayedProducts.map((product, index) => (
            <motion.div key={product.id} variants={fadeUp}>
              <ProductCard
                product={product}
                socialProof={socialProofMap?.get(product.id)}
                index={index}
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  );
}
