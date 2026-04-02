import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductOptionsData {
  materials: string[];
  colors: string[];
  categories: { id: string; name: string; slug: string }[];
  priceRange: { min: number; max: number };
}

async function fetchProductOptions(): Promise<ProductOptionsData> {
  const [productsRes, categoriesRes] = await Promise.all([
    supabase.from("products").select("material, color, price").eq("is_active", true),
    supabase.from("categories").select("id, name, slug").order("sort_order"),
  ]);

  const products = (productsRes.data ?? []) as { material: string | null; color: string | null; price: number }[];
  const categories = (categoriesRes.data ?? []) as { id: string; name: string; slug: string }[];

  const materialSet = new Set<string>();
  const colorSet = new Set<string>();
  let min = Infinity;
  let max = 0;

  products.forEach((p) => {
    if (p.material) p.material.split(",").forEach((m) => { const v = m.trim(); if (v) materialSet.add(v); });
    if (p.color) p.color.split(",").forEach((c) => { const v = c.trim(); if (v) colorSet.add(v); });
    if (typeof p.price === "number") {
      if (p.price < min) min = p.price;
      if (p.price > max) max = p.price;
    }
  });

  return {
    materials: [...materialSet].sort(),
    colors: [...colorSet].sort(),
    categories,
    priceRange: { min: min === Infinity ? 0 : min, max: max || 1000 },
  };
}

export function useProductOptions() {
  return useQuery({
    queryKey: ["product-options"],
    queryFn: fetchProductOptions,
    staleTime: 1000 * 60 * 5,
  });
}
