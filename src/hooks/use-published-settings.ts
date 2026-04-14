/**
 * Storefront-safe hook for consuming published site settings.
 *
 * This hook reads ONLY the `value` column from `site_settings` — never
 * `draft_value`. Admins write drafts via the Admin Studio; those drafts
 * are promoted to `value` on publish. The public storefront must never
 * read `draft_value` directly.
 *
 * Usage:
 *   const { data: branding } = usePublishedSetting<BrandingSettings>("branding");
 *   const settings = usePublishedSettings(["branding", "footer_settings", "contact"]);
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Single setting ───────────────────────────────────────────────
export function usePublishedSetting<T = unknown>(key: string, enabled = true) {
  return useQuery({
    queryKey: ["published-setting", key],
    queryFn: async (): Promise<T | null> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return (data?.value as T) ?? null;
    },
    enabled: enabled && Boolean(key),
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Multiple settings in one call ────────────────────────────────
export function usePublishedSettings<T extends Record<string, unknown> = Record<string, unknown>>(
  keys: string[],
  enabled = true,
) {
  return useQuery({
    queryKey: ["published-settings", ...keys],
    queryFn: async (): Promise<T> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", keys);
      if (error) throw error;
      const result: Record<string, unknown> = {};
      for (const row of data ?? []) {
        result[row.key] = row.value;
      }
      return result as T;
    },
    enabled: enabled && keys.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Imperative fetch (for one-off loads outside React Query) ─────
export async function fetchPublishedSetting<T = unknown>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return (data?.value as T) ?? null;
}

export async function fetchPublishedSettings(keys: string[]): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", keys);
  if (error) throw error;
  const result: Record<string, unknown> = {};
  for (const row of data ?? []) {
    result[row.key] = row.value;
  }
  return result;
}
