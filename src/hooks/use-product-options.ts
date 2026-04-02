import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductOptionsData {
  materials: string[];
  finishes: string[];
  colors: string[];
  categories: { id: string; name: string; slug: string }[];
  priceRange: { min: number; max: number };
}

async function fetchProductOptions(): Promise<ProductOptionsData> {
  const [productsRes, variantsRes, categoriesRes] = await Promise.all([
    supabase.from("products").select("material_type, finish_type, price").eq("is_active", true),
    supabase.from("product_variants").select("attributes").eq("is_active", true),
    supabase.from("categories").select("id, name, slug").order("sort_order"),
  ]);

  const products = (productsRes.data ?? []) as { material_type: string | null; finish_type: string | null; price: number }[];
  const variants = (variantsRes.data ?? []) as { attributes: Record<string, unknown> | null }[];
  const categories = (categoriesRes.data ?? []) as { id: string; name: string; slug: string }[];

  const materialSet = new Set<string>();
  const finishSet = new Set<string>();
  const colorSet = new Set<string>();
  let min = Infinity;
  let max = 0;

  products.forEach((p) => {
    if (p.material_type) p.material_type.split(",").forEach((m) => { const v = m.trim(); if (v) materialSet.add(v); });
    if (p.finish_type) p.finish_type.split(",").forEach((f) => { const v = f.trim(); if (v) finishSet.add(v); });
    if (typeof p.price === "number") {
      if (p.price < min) min = p.price;
      if (p.price > max) max = p.price;
    }
  });

  variants.forEach((v) => {
    if (v.attributes && typeof v.attributes === "object") {
      const attrs = v.attributes as Record<string, unknown>;
      const color = attrs.color || attrs.Color;
      if (typeof color === "string" && color.trim()) colorSet.add(color.trim());
      const mat = attrs.material || attrs.Material;
      if (typeof mat === "string" && mat.trim()) materialSet.add(mat.trim());
    }
  });

  return {
    materials: [...materialSet].sort(),
    finishes: [...finishSet].sort(),
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
