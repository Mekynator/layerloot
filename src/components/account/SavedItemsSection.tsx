import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSavedProducts, unsaveProduct } from "@/lib/savedItems";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/currency";

interface SavedItemsSectionProps {}

export default function SavedItemsSection({}: SavedItemsSectionProps) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getSavedProducts(user.id)
      .then(async ({ data, error }) => {
        if (error) {
          setError("Could not load saved items");
          setItems([]);
        } else if (data && data.length > 0) {
          // Fetch product details for each saved item
          const ids = data.map((d: any) => d.product_id);
          // TODO: Replace with a single Supabase join if available
          const res = await fetch(`/api/products?ids=${ids.join(",")}`);
          const products = await res.json();
          setItems(products);
        } else {
          setItems([]);
        }
      })
      .catch(() => setError("Could not load saved items"))
      .finally(() => setLoading(false));
  }, [user]);

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

  if (loading) return <div className="py-6 text-center text-muted-foreground">Loading saved items...</div>;
  if (error) return <div className="py-6 text-center text-destructive">{error}</div>;
  if (!items.length) return <div className="py-6 text-center text-muted-foreground">No saved items yet</div>;

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold uppercase mb-4">Saved for Later</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((product) => (
          <Card key={product.id} className="flex flex-col md:flex-row items-center gap-4 p-4">
            <Link to={`/products/${product.slug}`} className="block w-24 h-24 overflow-hidden rounded-xl bg-muted">
              <img src={product.images?.[0] || "/placeholder.svg"} alt={product.name} className="h-full w-full object-cover" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/products/${product.slug}`} className="font-semibold uppercase tracking-wide hover:text-primary">
                {product.name}
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
                <Button size="sm" variant="outline" onClick={() => handleRemove(product.id)}>
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
