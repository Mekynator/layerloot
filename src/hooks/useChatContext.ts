import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

const FREE_SHIPPING_THRESHOLD = 500;

export function useChatContext() {
  const { user } = useAuth();
  const { items, totalPrice } = useCart();
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setContext({
          user: null,
          cart: {
            item_count: items.length,
            total: totalPrice,
            free_shipping_gap: Math.max(0, FREE_SHIPPING_THRESHOLD - totalPrice),
          },
        });
        return;
      }

      setLoading(true);

      const { data, error } = await supabase.functions.invoke("chat-context", {
        body: {},
      });

      if (!error && data) {
        setContext({
          ...data,
          cart: {
            item_count: items.reduce((acc, item) => acc + item.quantity, 0),
            total: totalPrice,
            free_shipping_gap: Math.max(0, FREE_SHIPPING_THRESHOLD - totalPrice),
          },
        });
      }

      setLoading(false);
    };

    load();
  }, [user, items, totalPrice]);

  return { context, loading };
}
