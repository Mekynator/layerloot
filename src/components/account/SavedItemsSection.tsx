import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSavedProducts, unsaveProduct } from "@/lib/savedItems";
import { fetchProductsByIds } from "@/api/products";
import { ProductImage } from "@/components/product/ProductImage";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/currency";

export default function SavedItemsSection() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getSavedProducts(user.id)
      .then(async ({ data, error: fetchErr }) => {
        if (fetchErr) {
          setError("Could not load saved items");
          setItems([]);
        } else if (data && data.length > 0) {
          const ids = data.map((d) => d.product_id);
          try {
            const products = await fetchProductsByIds(ids);
            setItems(products);
          } catch {
            setError("Could not load saved items");
          }
        } else {
          setItems([]);
        }
      })
      .catch(() => setError("Could not load saved items"))
      .finally(() => setLoading(false));
  }, [user]);

  const handleRemove = async (productId: string) => {
    if (!user) return;
    const { error: err } = await unsaveProduct(productId, user.id);
    if (!err) {
      setItems((prev) => prev.filter((p) => (p as Record<string, unknown>).id !== productId));
      toast({ title: "Removed from saved" });
    } else {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleMoveToCart = async (product: Record<string, unknown>) => {
    addItem({
      id: product.id as string,
      name: product.name as string,
      price: Number(product.price),
      image: ((product.images as string[]) ?? [])[0] || "/placeholder.svg",
      slug: product.slug as string,
    });
    if (user) {
      const { error: err } = await unsaveProduct(product.id as string, user.id);
      if (!err) {
        setItems((prev) => prev.filter((p) => (p as Record<string, unknown>).id !== product.id));
        toast({ title: "Moved to cart", description: product.name as string });
      } else {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  };

  if (loading) return <div className="py-6 text-center text-muted-foreground">Loading saved items...</div>;
  if (error) return <div className="py-6 text-center text-destructive">{error}</div>;
  if (!items.length) return <div className="py-6 text-center text-muted-foreground">No saved items yet</div>;

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold uppercase mb-4">Saved for Later</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((product) => (
          <Card key={product.id as string} className="flex flex-col md:flex-row items-center gap-4 p-4">
            <Link to={`/products/${product.slug}`} className="block w-24 h-24 overflow-hidden rounded-xl bg-muted">
              <ProductImage src={((product.images as string[]) ?? [])[0] || "/placeholder.svg"} alt={product.name as string} className="h-full w-full" fit="contain" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/products/${product.slug}`} className="font-semibold uppercase tracking-wide hover:text-primary">
                {product.name as string}
              </Link>
              <div className="mt-1 text-sm text-muted-foreground">
                {formatPrice(Number(product.price))}
                {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                  <span className="ml-2 line-through">{formatPrice(Number(product.compare_at_price))}</span>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => handleMoveToCart(product)}>
                  Move to Cart
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleRemove(product.id as string)}>
                  Remove
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
