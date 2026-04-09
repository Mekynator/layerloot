import { supabase } from "@/integrations/supabase/client";

// Save a product for a user
export async function saveProduct(productId: string, userId: string) {
  const { data, error } = await (supabase
    .from("saved_items" as never)
    .insert({ product_id: productId, user_id: userId } as never) as unknown as Promise<{ data: unknown; error: { message: string } | null }>);
  return { data, error };
}

// Remove a saved product for a user
export async function unsaveProduct(productId: string, userId: string) {
  const { data, error } = await (supabase
    .from("saved_items" as never)
    .delete()
    .eq("product_id", productId)
    .eq("user_id", userId) as unknown as Promise<{ data: unknown; error: { message: string } | null }>);
  return { data, error };
}

// Check if a product is saved for a user
export async function isProductSaved(productId: string, userId: string) {
  const { data, error } = await (supabase
    .from("saved_items" as never)
    .select("id")
    .eq("product_id", productId)
    .eq("user_id", userId)
    .maybeSingle() as unknown as Promise<{ data: { id: string } | null; error: { message: string } | null }>);
  return { saved: !!data && !error, error };
}

// Get all saved products for a user
export async function getSavedProducts(userId: string) {
  const { data, error } = await (supabase
    .from("saved_items" as never)
    .select("product_id, created_at")
    .eq("user_id", userId) as unknown as Promise<{ data: Array<{ product_id: string; created_at: string }> | null; error: { message: string } | null }>);
  return { data, error };
}
