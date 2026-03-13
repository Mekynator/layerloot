import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

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
  const images = product.images?.length ? product.images : ["/placeholder.svg"];
  const isNew = product.created_at
    ? Date.now() - new Date(product.created_at).getTime() < 14 * 86400000
    : false;
  const hasModel = !!product.model_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Link
        to={`/products/${product.slug}`}
        className="group relative block overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:border-primary hover:shadow-xl hover:-translate-y-1"
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          {/* Second image on hover */}
          {images.length > 1 && (
            <img
              src={images[1]}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              loading="lazy"
            />
          )}
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Tags */}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.compare_at_price && (
              <Badge className="bg-primary font-display text-xs uppercase tracking-wider text-primary-foreground">
                Sale
              </Badge>
            )}
            {product.is_featured && (
              <Badge className="bg-secondary font-display text-xs uppercase tracking-wider text-secondary-foreground">
                Bestseller
              </Badge>
            )}
            {isNew && (
              <Badge className="bg-accent font-display text-xs uppercase tracking-wider text-accent-foreground">
                New
              </Badge>
            )}
            {hasModel && (
              <Badge variant="outline" className="border-primary/50 bg-card/80 font-display text-xs uppercase tracking-wider text-primary backdrop-blur-sm">
                3D
              </Badge>
            )}
          </div>

          {/* Color preview dots (from first few images as proxy) */}
          {images.length > 2 && (
            <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {images.slice(0, 4).map((_, i) => (
                <span
                  key={i}
                  className="h-2.5 w-2.5 rounded-full border border-card/50 bg-muted-foreground/40"
                />
              ))}
              {images.length > 4 && (
                <span className="font-display text-[10px] text-card">+{images.length - 4}</span>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-card-foreground transition-colors group-hover:text-primary">
            {product.name}
          </h3>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-display text-lg font-bold text-primary">
              {Number(product.price).toFixed(2)} kr
            </span>
            {product.compare_at_price && (
              <span className="text-sm text-muted-foreground line-through">
                {Number(product.compare_at_price).toFixed(2)} kr
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
