import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export interface RecommendedProductCard {
  id: string;
  title: string;
  slug: string;
  image_url?: string | null;
  price: number;
  reason?: string | null;
}

interface RecommendedProductsProps {
  items: RecommendedProductCard[];
  onAddToCart?: (productId: string) => void;
}

export default function RecommendedProducts({ items, onAddToCart }: RecommendedProductsProps) {
  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold uppercase tracking-wide">You may also like</h2>
        <p className="text-sm text-muted-foreground">
          Manually linked in admin, so this section can pair prints, bases, mounts, lamps, or accessories.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
            <Link to={`/product/${item.slug}`} className="block">
              <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                ) : null}
              </div>
            </Link>
            <div className="mt-4 space-y-2">
              <Link to={`/product/${item.slug}`} className="block font-semibold uppercase tracking-wide hover:underline">
                {item.title}
              </Link>
              {item.reason ? <p className="text-sm text-muted-foreground">Pairs with {item.reason}</p> : null}
              <div className="text-lg font-bold">{item.price.toFixed(2)} DKK</div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={() => onAddToCart?.(item.id)}>
                Add to cart
              </Button>
              <Button asChild variant="outline">
                <Link to={`/product/${item.slug}`}>View</Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
