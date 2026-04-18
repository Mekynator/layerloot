import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type SectionSettings = Record<string, Record<string, unknown>>;

async function fetchStaticSectionSettings(page: string): Promise<SectionSettings> {
  const key = `static_section_settings_${page}`;
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
    return data.value as SectionSettings;
  }
  return {};
}

/**
 * Returns static section settings for a page.
 * Use `isVisible(sectionId)` to check if a static section should render.
 */
export function useStaticSectionSettings(page: string) {
  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["static-section-settings", page],
    queryFn: () => fetchStaticSectionSettings(page),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
    enabled: Boolean(page),
  });

  const isVisible = (sectionId: string): boolean => {
    const sectionConf = settings[sectionId];
    if (!sectionConf) return true; // default visible
    return sectionConf.visible !== false;
  };

  const getSetting = <T = unknown>(sectionId: string, key: string, fallback?: T): T => {
    const val = settings[sectionId]?.[key];
    return (val !== undefined ? val : fallback) as T;
  };

  return { settings, isLoading, isVisible, getSetting };
}
