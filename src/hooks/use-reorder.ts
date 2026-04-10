import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

export function useReorder() {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const reorder = useCallback(async (orderId: string) => {
    setReorderingId(orderId);
    try {
      const { data: orderItems, error } = await supabase
        .from("order_items")
        .select("product_id, product_name, quantity, unit_price")
        .eq("order_id", orderId);

      if (error) throw error;
      if (!orderItems || orderItems.length === 0) {
        toast({ title: "No items found", description: "This order has no items to reorder.", variant: "destructive" });
        return;
      }

      // Fetch current product info for images/slugs
      const productIds = orderItems.map((i) => i.product_id).filter(Boolean) as string[];
      const productMap: Record<string, { slug: string; images: string[] | null; price: number; is_active: boolean }> = {};

      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, slug, images, price, is_active")
          .in("id", productIds);

        if (products) {
          products.forEach((p) => {
            productMap[p.id] = { slug: p.slug, images: p.images, price: Number(p.price), is_active: p.is_active };
          });
        }
      }

      let added = 0;
      let unavailable = 0;

      for (const item of orderItems) {
        const product = item.product_id ? productMap[item.product_id] : null;

        if (product && !product.is_active) {
          unavailable++;
          continue;
        }

        const id = item.product_id || `reorder-${item.product_name}`;
        const image = product?.images?.[0] || "/placeholder.svg";
        const slug = product?.slug || "";
        const price = product?.price ?? Number(item.unit_price);

        for (let q = 0; q < item.quantity; q++) {
          addItem({ id, name: item.product_name, price, image, slug });
        }
        added++;
      }

      if (unavailable > 0 && added > 0) {
        toast({
          title: "Partially reordered",
          description: `${added} item(s) added. ${unavailable} item(s) no longer available.`,
        });
      } else if (unavailable > 0 && added === 0) {
        toast({ title: "Items unavailable", description: "None of the items are available anymore.", variant: "destructive" });
      } else {
        toast({ title: "Reordered!", description: `${added} item(s) added to your cart.` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not reorder", variant: "destructive" });
    } finally {
      setReorderingId(null);
    }
  }, [addItem, toast]);

  return { reorder, reorderingId };
}
