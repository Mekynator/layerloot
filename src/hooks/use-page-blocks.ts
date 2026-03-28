import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SiteBlock } from "@/components/admin/BlockRenderer";

export type SitePageRecord = {
  id: string;
  name: string;
  title: string | null;
  slug: string;
  full_path: string;
  parent_id: string | null;
  page_type: "main" | "child" | "global";
  is_home: boolean;
  is_published: boolean;
  show_in_header: boolean;
  show_in_footer: boolean;
  is_system: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

const normalizePageSlug = (value?: string) => {
  if (!value || value === "/") return "home";
  return value.replace(/^\/+|\/+$/g, "") || "home";
};

async function fetchPageMeta(page: string) {
  const normalizedPage = normalizePageSlug(page);
  const fullPath = normalizedPage === "home" ? "/" : `/${normalizedPage}`;

  const { data, error } = await supabase
    .from("site_pages")
    .select("*")
    .or(`slug.eq.${normalizedPage},full_path.eq.${fullPath}`)
    .neq("page_type", "global")
    .order("is_home", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as SitePageRecord | null) ?? null;
}

async function fetchPageBlocks(page: string, includeUnpublished = false) {
  const normalizedPage = normalizePageSlug(page);

  const query = supabase
    .from("site_blocks")
    .select("*")
    .eq("page", normalizedPage)
    .eq("is_active", true)
    .order("sort_order");

  if (!includeUnpublished) {
    const pageMeta = await fetchPageMeta(normalizedPage);
    if (!pageMeta || pageMeta.is_published === false) {
      return [];
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as SiteBlock[]) ?? [];
}

export function usePageBlocks(page: string, enabled = true, includeUnpublished = false) {
  return useQuery({
    queryKey: ["site-blocks", page, includeUnpublished],
    queryFn: () => fetchPageBlocks(page, includeUnpublished),
    enabled: enabled && Boolean(page),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSitePage(page: string, enabled = true) {
  return useQuery({
    queryKey: ["site-page", page],
    queryFn: () => fetchPageMeta(page),
    enabled: enabled && Boolean(page),
    staleTime: 1000 * 60 * 5,
  });
}
