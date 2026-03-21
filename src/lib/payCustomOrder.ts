import { supabase } from "@/integrations/supabase/client";

const readFunctionErrorMessage = async (error: any) => {
  try {
    const context = error?.context;
    if (context && typeof context.text === "function") {
      const body = await context.text();
      if (body) {
        try {
          const parsed = JSON.parse(body);
          return parsed?.error || parsed?.message || body;
        } catch {
          return body;
        }
      }
    }
  } catch {
    // ignore context parse failures
  }

  return error?.message || "Failed to start checkout";
};

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
    const message = await readFunctionErrorMessage(error);
    throw new Error(message || "Failed to start checkout");
  }

  if (data?.autoPaid) {
    return;
  }

  if (!data?.url) {
    throw new Error("Stripe checkout URL was not returned");
  }

  window.location.href = data.url;
}
