import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/currency";

interface CompactSavedItemCardProps {
  product: any;
  onMoveToCart: (product: any) => void;
  onRemove: (productId: string) => void;
  showDate?: boolean;
}

export function CompactSavedItemCard({ product, onMoveToCart, onRemove, showDate }: CompactSavedItemCardProps) {
  return (
    <Card className="flex items-center gap-3 p-3 shadow-none border border-border/20 bg-card/60">
      <Link to={`/products/${product.slug}`} className="block w-12 h-12 overflow-hidden rounded-lg bg-muted">
        <img src={product.images?.[0] || "/placeholder.svg"} alt={product.name} className="h-full w-full object-cover" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/products/${product.slug}`} className="block font-medium text-xs uppercase truncate hover:text-primary">
          {product.name}
        </Link>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          {formatPrice(Number(product.price))}
          {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
            <span className="line-through">{formatPrice(Number(product.compare_at_price))}</span>
          )}
        </div>
        {showDate && product.saved_at && (
          <div className="text-[10px] text-muted-foreground mt-0.5">Saved {new Date(product.saved_at).toLocaleString()}</div>
        )}
      </div>
      <div className="flex flex-col gap-1 ml-2">
        <Button size="sm" className="px-2 py-1 text-xs" onClick={() => onMoveToCart(product)}>
          Move to Cart
        </Button>
        <Button size="sm" variant="outline" className="px-2 py-1 text-xs" onClick={() => onRemove(product.id)}>
          Remove
        </Button>
      </div>
    </Card>
  );
}
