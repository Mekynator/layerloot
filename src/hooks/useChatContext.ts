import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useBehaviorTracking } from "./use-behavior-tracking";
import { useRememberedChoices } from "./use-remembered-choices";

const FREE_SHIPPING_THRESHOLD = 500;

function parseStored(val?: string): string[] {
  if (!val) return [];
  return val.split(",").map((v) => v.trim()).filter(Boolean);
}

export function useChatContext() {
  const { user } = useAuth();
  const { items, totalPrice } = useCart();
  const { getInterestProfile } = useBehaviorTracking();
  const { choices } = useRememberedChoices();
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const profile = getInterestProfile();

  const personalizationContext = {
    preferences: {
      materials: parseStored(choices.lastMaterial),
      colors: parseStored(choices.lastColor),
      categories: parseStored(choices.lastSize),
    },
    interests: {
      topCategories: profile.topCategories.slice(0, 3),
      isReturningUser: profile.isReturningUser,
      usesCustomTools: profile.usesCustomTools,
      isGiftShopper: profile.isGiftShopper,
    },
  };

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
          ...personalizationContext,
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
          ...personalizationContext,
        });
      }

      setLoading(false);
    };

    load();
  }, [user, items, totalPrice]);

  return { context, loading };
}
