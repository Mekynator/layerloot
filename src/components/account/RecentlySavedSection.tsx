import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSavedProducts, unsaveProduct } from "@/lib/savedItems";
import { fetchProductsByIds } from "@/api/products";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { CompactSavedItemCard } from "@/components/account/CompactSavedItemCard";

export default function RecentlySavedSection() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getSavedProducts(user.id)
      .then(async ({ data, error }) => {
        if (!error && data && data.length > 0) {
          const ids = data.map((d) => d.product_id);
          const savedMap = Object.fromEntries(data.map((d) => [d.product_id, d]));
          try {
            const products = await fetchProductsByIds(ids);
            const enriched = products.map((p: Record<string, unknown>) => ({
              ...p,
              saved_at: savedMap[p.id as string]?.created_at,
            }));
            enriched.sort(
              (a: Record<string, unknown>, b: Record<string, unknown>) =>
                new Date(b.saved_at as string).getTime() - new Date(a.saved_at as string).getTime()
            );
            setItems(enriched.slice(0, 4));
          } catch {
            setItems([]);
          }
        } else {
          setItems([]);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleMoveToCart = async (product: Record<string, unknown>) => {
    addItem({
      id: product.id as string,
      name: product.name as string,
      price: Number(product.price),
      image: ((product.images as string[]) ?? [])[0] || "/placeholder.svg",
      slug: product.slug as string,
    });
    if (user) {
      const { error } = await unsaveProduct(product.id as string, user.id);
      if (!error) {
        setItems((prev) => prev.filter((p) => p.id !== product.id));
        toast({ title: "Moved to cart", description: product.name as string });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
  };

  const handleRemove = async (productId: string) => {
    if (!user) return;
    const { error } = await unsaveProduct(productId, user.id);
    if (!error) {
      setItems((prev) => prev.filter((p) => p.id !== productId));
      toast({ title: "Removed from saved" });
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading || !user) return null;
  if (!items.length) return null;

  return (
    <section className="mt-8">
      <h3 className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        Recently Saved
      </h3>
      <div className="flex flex-col gap-2">
        {items.map((product) => (
          <CompactSavedItemCard
            key={product.id as string}
            product={product}
            onMoveToCart={handleMoveToCart}
            onRemove={handleRemove}
            showDate
          />
        ))}
      </div>
    </section>
  );
}
