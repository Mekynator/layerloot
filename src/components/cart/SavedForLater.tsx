import { Button } from "@/components/ui/button";
import type { SavedItem } from "@/types/cart";

interface SavedForLaterProps {
  items: SavedItem[];
  onMoveToCart: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function SavedForLater({ items, onMoveToCart, onRemove }: SavedForLaterProps) {
  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold uppercase tracking-wide">Saved for later</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-xl bg-muted">
                {item.image_url ? (
                  <ProductImage src={item.image_url} alt={item.title} className="h-full w-full" fit="contain" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold uppercase tracking-wide">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[item.variant_label, item.material, item.color].filter(Boolean).join(" • ") || "Standard setup"}
                </p>
                <div className="mt-3 text-sm font-semibold">{item.price.toFixed(2)} DKK</div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => onMoveToCart(item.id)}>Move to cart</Button>
                  <Button size="sm" variant="outline" onClick={() => onRemove(item.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
