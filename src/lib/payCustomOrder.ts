import { supabase } from "@/integrations/supabase/client";

export async function payCustomOrder(customOrderId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Please sign in again to continue with payment");
  }

  const { data, error } = await supabase.functions.invoke("create-custom-order-checkout", {
    body: { customOrderId },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to start checkout");
  }

  if (data?.autoPaid) {
    return;
  }

  if (!data?.url) {
    throw new Error("Stripe checkout URL was not returned");
  }

  window.location.href = data.url;
}
