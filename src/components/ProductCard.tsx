import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

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
  index?: number;
}

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const { addItem } = useCart();
  const images = product.images?.length ? product.images : ["/placeholder.svg"];
  const isNew = product.created_at ? Date.now() - new Date(product.created_at).getTime() < 14 * 86400000 : false;
  const hasModel = !!product.model_url;
  const hasSale = !!product.compare_at_price && Number(product.compare_at_price) > Number(product.price);

  const discountPct = hasSale
    ? Math.round(((Number(product.compare_at_price) - Number(product.price)) / Number(product.compare_at_price)) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: images[0],
      slug: product.slug,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -6 }}
      className="h-full"
    >
      <Link
        to={`/products/${product.slug}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-primary/60 hover:shadow-2xl"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />

          {images.length > 1 && (
            <img
              src={images[1]}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 group-hover:opacity-100"
              loading="lazy"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {hasSale && (
              <Badge className="bg-primary font-display text-[10px] uppercase tracking-wider text-primary-foreground">
                Sale {discountPct > 0 ? `-${discountPct}%` : ""}
              </Badge>
            )}

            {product.is_featured && (
              <Badge className="bg-secondary font-display text-[10px] uppercase tracking-wider text-secondary-foreground">
                Bestseller
              </Badge>
            )}

            {isNew && (
              <Badge className="bg-accent font-display text-[10px] uppercase tracking-wider text-accent-foreground">
                New
              </Badge>
            )}
          </div>

          {images.length > 2 && (
            <div className="absolute right-3 top-3 flex gap-1 rounded-full bg-card/80 px-2 py-1 opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
              {images.slice(0, 3).map((_, i) => (
                <span key={i} className="h-2.5 w-2.5 rounded-full border border-card/50 bg-muted-foreground/40" />
              ))}
              {images.length > 3 && (
                <span className="font-display text-[10px] text-foreground">+{images.length - 3}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2">
            <h3 className="line-clamp-2 font-display text-sm font-semibold uppercase tracking-wide text-card-foreground transition-colors duration-300 group-hover:text-primary">
              {product.name}
            </h3>
          </div>

          <div className="mt-auto">
            <div className="flex items-end gap-2">
              <span className="font-display text-xl font-bold text-primary">{Number(product.price).toFixed(2)} kr</span>
              {product.compare_at_price && (
                <span className="pb-0.5 text-sm text-muted-foreground line-through">
                  {Number(product.compare_at_price).toFixed(2)} kr
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-[11px] text-muted-foreground">
                {hasModel ? "Interactive model available" : "Ready to order"}
              </div>

              <Button type="button" size="sm" onClick={handleAddToCart} className="shrink-0 rounded-xl px-3">
                <ShoppingBag className="mr-1.5 h-4 w-4" />
                Add to cart
              </Button>
            </div>

            <div className="mt-3 inline-flex items-center text-xs font-medium text-primary transition-all duration-300 group-hover:gap-1">
              View
              <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
