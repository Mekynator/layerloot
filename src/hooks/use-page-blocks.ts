import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SiteBlock } from "@/components/admin/BlockRenderer";

async function fetchPageBlocks(page: string) {
  const { data, error } = await supabase
    .from("site_blocks")
    .select("*")
    .eq("page", page)
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return (data as SiteBlock[]) ?? [];
}

export function usePageBlocks(page: string, enabled = true) {
  return useQuery({
    queryKey: ["site-blocks", page],
    queryFn: () => fetchPageBlocks(page),
    enabled: enabled && Boolean(page),
    staleTime: 1000 * 60 * 5,
  });
}
