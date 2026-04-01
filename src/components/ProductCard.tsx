import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCart } from "@/contexts/CartContext";
import RatingStars from "@/components/social/RatingStars";
import ProductTrustBadges from "@/components/social/ProductTrustBadges";
import SocialProofBadges from "@/components/social/SocialProofBadges";
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
  const secondaryImage = images.length > 1 ? images[(currentImageIndex + 1) % images.length] : null;
  const isNew = product.created_at ? Date.now() - new Date(product.created_at).getTime() < 14 * 86400000 : false;
  const hasSale = product.compare_at_price != null && Number(product.compare_at_price) > Number(product.price);
  const discountPct = hasSale
    ? Math.round(((Number(product.compare_at_price) - Number(product.price)) / Number(product.compare_at_price)) * 100)
    : 0;

  const trustBadges = [
    ...(product.is_featured ? ["best seller"] : []),
    ...(isNew ? ["recently added"] : []),
    ...(socialProof?.badges ?? []),
  ].slice(0, 3);

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -6 }}
      className="h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        to={`/products/${product.slug}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/15 bg-card/40 shadow-[0_4px_32px_hsl(217_91%_60%/0.04)] backdrop-blur-xl transition-all duration-500 hover:border-primary/25 hover:shadow-[0_20px_64px_hsl(217_91%_60%/0.12)] shine-sweep"
      >
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-muted/20">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImage}
              ref={imageRef}
              src={currentImage}
              alt={product.name}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: isHovered ? 1.08 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          </AnimatePresence>

          {secondaryImage && isHovered && (
            <img src={secondaryImage} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0" loading="lazy" />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-80" />

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {hasSale && (
              <Badge className="bg-gradient-to-r from-primary to-accent font-display text-[10px] uppercase tracking-wider text-primary-foreground shadow-lg">
                {t("products.sale")} {discountPct > 0 ? `-${discountPct}%` : ""}
              </Badge>
            )}
            {product.is_featured && (
              <Badge className="border border-primary/30 bg-background/70 font-display text-[10px] uppercase tracking-wider text-primary backdrop-blur-sm">
                {t("products.popular")}
              </Badge>
            )}
          </div>

          {/* Image dots */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/50 px-2.5 py-1 backdrop-blur-md">
              {images.map((_, idx) => (
                <span
                  key={`${product.id}-dot-${idx}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentImageIndex ? "w-5 bg-primary" : "w-1.5 bg-foreground/30"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Quick add button - appears on hover */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-3 right-3"
          >
            <Button
              ref={addButtonRef}
              type="button"
              size="sm"
              onClick={handleAddToCart}
              className={`rounded-full px-4 shadow-xl backdrop-blur-sm transition-all duration-300 ${
                justAdded ? "animate-glow-pulse" : ""
              }`}
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

        {/* Content */}
        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <div className="space-y-2">
            <h3 className="line-clamp-2 font-display text-sm font-semibold uppercase tracking-[0.16em] text-foreground transition-colors duration-300 group-hover:text-primary">
              {product.name}
            </h3>
            <RatingStars rating={socialProof?.averageRating} count={socialProof?.reviewCount} className="min-h-5" />
            <ProductTrustBadges badges={trustBadges} />
            <SocialProofBadges productId={product.id} variant="compact" />
          </div>

          <div className="mt-auto pt-3">
            <div className="flex items-end justify-between gap-2">
              <div className="flex items-end gap-2">
                <span className="font-display text-xl font-bold gradient-text">{formatPrice(Number(product.price))}</span>
                {hasSale && (
                  <span className="pb-0.5 text-sm text-muted-foreground line-through">
                    {formatPrice(Number(product.compare_at_price))}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {socialProof?.reviewCount
                  ? t("products.verifiedOpinions", { count: socialProof.reviewCount })
                  : t("products.premiumFinish")}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
