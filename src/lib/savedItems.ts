import { supabase } from "@/integrations/supabase/client";

// Save a product for a user
export async function saveProduct(productId: string, userId: string) {
  // Prevent duplicate
  const { data, error } = await supabase
    .from("saved_items")
    .insert({ product_id: productId, user_id: userId }, { upsert: true, onConflict: "user_id,product_id" });
  return { data, error };
}

// Remove a saved product for a user
export async function unsaveProduct(productId: string, userId: string) {
  const { data, error } = await supabase
    .from("saved_items")
    .delete()
    .eq("product_id", productId)
    .eq("user_id", userId);
  return { data, error };
}

// Check if a product is saved for a user
export async function isProductSaved(productId: string, userId: string) {
  const { data, error } = await supabase
    .from("saved_items")
    .select("id")
    .eq("product_id", productId)
    .eq("user_id", userId)
    .maybeSingle();
  return { saved: !!data && !error, error };
}

// Get all saved products for a user
export async function getSavedProducts(userId: string) {
  const { data, error } = await supabase
    .from("saved_items")
    .select("product_id")
    .eq("user_id", userId);
  return { data, error };
}
