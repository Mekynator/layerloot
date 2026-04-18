import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useBehaviorTracking } from "./use-behavior-tracking";
import { useRememberedChoices } from "./use-remembered-choices";

function parseStored(val?: string): string[] {
  if (!val) return [];
  return val.split(",").map((v) => v.trim()).filter(Boolean);
}

/**
 * Builds the live AI chat context.
 *
 * Rules:
 * - Free-shipping threshold comes from real `shipping_config` row, never hardcoded.
 * - Personalization signals are sourced from real behavior tracking + remembered choices.
 *   No misnamed mappings (e.g. lastSize → categories) that would mislead the AI.
 * - Backend personal context (loyalty/last order/etc.) is loaded via the `chat-context`
 *   edge function which itself uses Promise.allSettled for partial-failure resilience.
 */
export function useChatContext() {
  const { user } = useAuth();
  const { items, totalPrice } = useCart();
  const { getInterestProfile } = useBehaviorTracking();
  const { choices } = useRememberedChoices();

  const profile = getInterestProfile();
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  // Live shipping config (admin-managed). 30s stale, refresh on focus.
  const { data: shipping } = useQuery({
    queryKey: ["chat-shipping-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_config")
        .select("free_shipping_threshold, flat_rate")
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  // Authenticated personal context (loyalty, last order, last viewed product)
  const { data: personalContext, isLoading } = useQuery({
    queryKey: ["chat-personal-context", user?.id ?? "guest"],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.functions.invoke("chat-context", {
        body: {},
      });
      if (error) return null;
      return data;
    },
    enabled: Boolean(user),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const freeShippingThreshold = Number(shipping?.free_shipping_threshold) || null;
  const freeShippingGap = freeShippingThreshold
    ? Math.max(0, freeShippingThreshold - totalPrice)
    : null;

  const personalization = {
    preferences: {
      materials: parseStored(choices.lastMaterial),
      colors: parseStored(choices.lastColor),
    },
    interests: {
      topCategories: profile.topCategories.slice(0, 3),
      isReturningUser: profile.isReturningUser,
      usesCustomTools: profile.usesCustomTools,
      isGiftShopper: profile.isGiftShopper,
    },
  };

  const cart = {
    item_count: itemCount,
    total: totalPrice,
    ...(freeShippingGap !== null && { free_shipping_gap: freeShippingGap }),
    ...(freeShippingThreshold !== null && { free_shipping_threshold: freeShippingThreshold }),
  };

  const context = user
    ? { ...(personalContext ?? {}), cart, ...personalization }
    : { user: null, cart, ...personalization };

  return { context, loading: isLoading };
}
