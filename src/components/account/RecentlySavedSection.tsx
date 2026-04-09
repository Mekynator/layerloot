import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSavedProducts, unsaveProduct } from "@/lib/savedItems";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { CompactSavedItemCard } from "@/components/account/CompactSavedItemCard";

export default function RecentlySavedSection() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getSavedProducts(user.id)
      .then(async ({ data, error }) => {
        if (!error && data && data.length > 0) {
          // Fetch product details for each saved item, include saved_at for sorting
          const ids = data.map((d: any) => d.product_id);
          const savedMap = Object.fromEntries(data.map((d: any) => [d.product_id, d]));
          const res = await fetch(`/api/products?ids=${ids.join(",")}`);
          let products = await res.json();
          // Attach saved_at to each product
          products = products.map((p: any) => ({ ...p, saved_at: savedMap[p.id]?.created_at }));
          // Sort by saved_at desc
          products.sort((a: any, b: any) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime());
          setItems(products.slice(0, 4)); // Limit to 4 most recent
        } else {
          setItems([]);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleMoveToCart = async (product: any) => {
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.images?.[0] || "/placeholder.svg",
      slug: product.slug,
    });
    if (user) {
      const { error } = await unsaveProduct(product.id, user.id);
      if (!error) {
        setItems((prev) => prev.filter((p) => p.id !== product.id));
        toast({ title: "Moved to cart", description: product.name });
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
            key={product.id}
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
