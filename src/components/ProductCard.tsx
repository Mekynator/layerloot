import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import RatingStars from "@/components/social/RatingStars";
import ProductTrustBadges from "@/components/social/ProductTrustBadges";
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

const ProductCard = ({ product, socialProof, index = 0 }: ProductCardProps) => {
  const { addItem } = useCart();

  const images = product.images && product.images.length > 0 ? product.images.filter(Boolean) : ["/placeholder.svg"];
  const primaryImage = images[0] || "/placeholder.svg";
  const secondaryImage = images[1] || null;
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

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: primaryImage,
      slug: product.slug,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Link
        to={`/products/${product.slug}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-border/80 bg-card/95 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-[0_20px_60px_-32px_hsl(var(--foreground)/0.45)]"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={primaryImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
            loading="lazy"
          />

          {secondaryImage && (
            <img
              src={secondaryImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 group-hover:opacity-100"
              loading="lazy"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-foreground/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {hasSale && (
              <Badge className="bg-primary font-display text-[10px] uppercase tracking-wider text-primary-foreground">
                Sale {discountPct > 0 ? `-${discountPct}%` : ""}
              </Badge>
            )}
            {product.is_featured && (
              <Badge className="bg-secondary font-display text-[10px] uppercase tracking-wider text-secondary-foreground">
                Popular
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 pt-3">
          <div className="space-y-2">
            <h3 className="line-clamp-2 font-display text-sm font-semibold uppercase tracking-[0.16em] text-card-foreground transition-colors duration-300 group-hover:text-primary">
              {product.name}
            </h3>
            <RatingStars rating={socialProof?.averageRating} count={socialProof?.reviewCount} className="min-h-5" />
            <ProductTrustBadges badges={trustBadges} />
          </div>

          <div className="mt-auto space-y-3">
            <div className="flex items-end gap-2">
              <span className="font-display text-xl font-bold text-primary">{Number(product.price).toFixed(2)} kr</span>
              {hasSale && (
                <span className="pb-0.5 text-sm text-muted-foreground line-through">
                  {Number(product.compare_at_price).toFixed(2)} kr
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
              <p className="text-xs text-muted-foreground">
                {socialProof?.reviewCount ? `${socialProof.reviewCount} verified opinions` : "Premium print-ready finish"}
              </p>
              <Button type="button" size="sm" onClick={handleAddToCart} className="shrink-0 rounded-xl px-3">
                <ShoppingBag className="mr-1.5 h-4 w-4" />
                Add to cart
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
