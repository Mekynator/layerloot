// Client-side utility to fetch products by IDs
import { supabase } from "@/integrations/supabase/client";

export async function fetchProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", ids);
  if (error) throw new Error(error.message);
  return data ?? [];
}
