import { supabase } from "@/integrations/supabase/client";

export async function payCustomOrder(customOrderId: string) {
  const { data, error } = await supabase.functions.invoke("create-custom-order-checkout", {
    body: { customOrderId },
  });

  if (error) {
    throw new Error(error.message || "Failed to start checkout");
  }

  if (!data?.url) {
    throw new Error("Stripe checkout URL was not returned");
  }

  window.location.href = data.url;
}
