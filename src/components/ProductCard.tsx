import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShoppingBag, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCart } from "@/contexts/CartContext";
import RatingStars from "@/components/social/RatingStars";
import { formatPrice } from "@/lib/currency";
import type { ProductSocialProof } from "@/lib/social-proof";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compare_at_price?: number | null;
    images?: string[] | null;
    is_featured?: boolean;
    created_at?: string;
    model_url?: string | null;
  };
  socialProof?: ProductSocialProof;
  index?: number;
}

const AUTO_SLIDE_MS = 7000;

const ProductCard = ({ product, socialProof, index = 0 }: ProductCardProps) => {
  const { t } = useTranslation("common");
  const { addItem } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);

  const images = useMemo(() => {
    const valid = product.images && product.images.length > 0 ? product.images.filter(Boolean) : [];
    return valid.length > 0 ? valid : ["/placeholder.svg"];
  }, [product.images]);

  const currentImage = images[currentImageIndex] || "/placeholder.svg";
  const isNew = product.created_at ? Date.now() - new Date(product.created_at).getTime() < 14 * 86400000 : false;
  const hasSale = product.compare_at_price != null && Number(product.compare_at_price) > Number(product.price);
  const discountPct = hasSale
    ? Math.round(((Number(product.compare_at_price) - Number(product.price)) / Number(product.compare_at_price)) * 100)
    : 0;

  useEffect(() => {
    if (images.length <= 1 || isHovered) return;
    const timer = window.setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, AUTO_SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [images.length, isHovered]);

  useEffect(() => {
    if (!justAdded) return;
    const timer = window.setTimeout(() => setJustAdded(false), 1400);
    return () => window.clearTimeout(timer);
  }, [justAdded]);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = imageRef.current?.getBoundingClientRect();

    addItem(
      {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image: currentImage,
        slug: product.slug,
      },
      rect
        ? {
            sourceRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            sourceImage: currentImage,
          }
        : undefined,
    );

    setJustAdded(true);

    if (addButtonRef.current) {
      addButtonRef.current.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(0.96)" },
          { transform: "scale(1.05)" },
          { transform: "scale(1)" },
        ],
        { duration: 320, easing: "ease-out" },
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        to={`/products/${product.slug}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/30 bg-card/70 backdrop-blur-xl transition-all duration-500"
        style={{
          boxShadow: isHovered
            ? '0 24px 80px -12px hsl(217 91% 60% / 0.15), 0 0 0 1px hsl(217 91% 60% / 0.15), inset 0 1px 0 0 hsl(215 25% 95% / 0.06)'
            : '0 8px 40px -8px hsl(228 33% 2% / 0.5), inset 0 1px 0 0 hsl(215 25% 95% / 0.04)',
          transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
          borderColor: isHovered ? 'hsl(217 91% 60% / 0.2)' : undefined,
        }}
      >
        {/* Image area */}
        <div className="relative aspect-[4/5] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImage}
              ref={imageRef}
              src={currentImage}
              alt={product.name}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: isHovered ? 1.1 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          </AnimatePresence>

          {/* Soft bottom gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-70" />

          {/* Badges — floating, no background strips */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {hasSale && (
              <Badge className="border-0 bg-primary/90 font-display text-[10px] uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 backdrop-blur-sm">
                {discountPct > 0 ? `-${discountPct}%` : t("products.sale")}
              </Badge>
            )}
            {product.is_featured && (
              <Badge className="border-0 bg-accent/90 font-display text-[10px] uppercase tracking-wider text-accent-foreground shadow-lg shadow-accent/20 backdrop-blur-sm">
                {t("products.popular")}
              </Badge>
            )}
            {isNew && (
              <Badge className="border-0 bg-secondary font-display text-[10px] uppercase tracking-wider text-secondary-foreground shadow-lg backdrop-blur-sm">
                NEW
              </Badge>
            )}
          </div>

          {/* Image dots */}
          {images.length > 1 && (
            <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
              {images.map((_, idx) => (
                <span
                  key={`${product.id}-dot-${idx}`}
                  className={`rounded-full transition-all duration-300 ${
                    idx === currentImageIndex
                      ? "h-1.5 w-5 bg-primary shadow-lg shadow-primary/40"
                      : "h-1.5 w-1.5 bg-foreground/25"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Quick add — slides up on hover */}
          <motion.div
            initial={false}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute bottom-3 right-3 pointer-events-auto"
          >
            <Button
              ref={addButtonRef}
              type="button"
              size="sm"
              onClick={handleAddToCart}
              className="rounded-full border-0 bg-primary/90 px-4 shadow-xl shadow-primary/25 backdrop-blur-sm transition-all duration-300 hover:bg-primary hover:shadow-primary/40"
            >
              {justAdded ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  {t("products.added")}
                </>
              ) : (
                <>
                  <ShoppingBag className="mr-1 h-3.5 w-3.5" />
                  {t("products.addToCart")}
                </>
              )}
            </Button>
          </motion.div>
        </div>

        {/* Content — clean, no dividers */}
        <div className="flex flex-1 flex-col gap-1.5 p-3 md:gap-2 md:p-5">
          <h3 className="line-clamp-2 font-display text-xs font-semibold uppercase tracking-[0.1em] text-foreground/90 transition-colors duration-300 group-hover:text-primary md:text-sm md:tracking-[0.14em]">
            {product.name}
          </h3>

          <RatingStars rating={socialProof?.averageRating} count={socialProof?.reviewCount} className="min-h-5" />

          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-base font-bold text-foreground md:text-xl">{formatPrice(Number(product.price))}</span>
              {hasSale && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(Number(product.compare_at_price))}
                </span>
              )}
            </div>

            {/* Subtle "view" arrow on hover */}
            <motion.div
              initial={false}
              animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -8 }}
              transition={{ duration: 0.25 }}
            >
              <ArrowRight className="h-4 w-4 text-primary" />
            </motion.div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
