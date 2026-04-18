import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { diag } from "@/lib/storefront-diagnostics";

export interface CampaignCTA {
  label?: string;
  href?: string;
  variant?: string;
}

export interface CampaignTheme {
  id: string;
  name: string;
  campaign_type: string;
  status?: string;
  is_active?: boolean;
  priority?: number;
  homepage_placement?: boolean;
  homepage_sort_order?: number;
  start_date?: string | null;
  end_date?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  banner_title?: string | null;
  banner_subtitle?: string | null;
  banner_image_url?: string | null;
  linked_product_ids?: string[] | null;
  linked_category_ids?: string[] | null;
  linked_discount_id?: string | null;
  /** Free-form Admin content payload (CTAs, body text, media, etc.) */
  content?: Record<string, unknown> & { cta?: CampaignCTA; ctas?: CampaignCTA[] };
  theme_overrides: {
    primaryColor?: string;
    accentColor?: string;
    buttonGlow?: boolean;
    borderColor?: string;
    fontAccent?: string;
  };
  effects: {
    particles?: "snow" | "leaves" | "sparkles" | "hearts" | "confetti" | "none";
    particleDensity?: number;
    glowPulse?: boolean;
    animatedGradient?: boolean;
    overlayColor?: string;
    overlayOpacity?: number;
  };
  chat_overrides: {
    greeting?: string;
    tone?: string;
    headerColor?: string;
    accentColor?: string;
  };
  banner_config: {
    text?: string;
    bgColor?: string;
    textColor?: string;
    icon?: string;
    link?: string;
    enabled?: boolean;
  };
}

function isWithinSchedule(c: any, now: number): boolean {
  const start = c.starts_at ?? c.start_date ?? null;
  const end = c.ends_at ?? c.end_date ?? null;
  if (start && new Date(start).getTime() > now) return false;
  if (end && new Date(end).getTime() < now) return false;
  return true;
}

/** Ensure JSON config fields are always objects so consumers can safely read .x */
function normalizeCampaign(raw: any): CampaignTheme {
  const safeObj = (v: any) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
  return {
    ...raw,
    theme_overrides: safeObj(raw.theme_overrides),
    effects: safeObj(raw.effects),
    chat_overrides: safeObj(raw.chat_overrides),
    banner_config: safeObj(raw.banner_config),
  } as CampaignTheme;
}

async function fetchActiveCampaign(): Promise<CampaignTheme | null> {
  const { data, error } = await supabase
    .from("campaigns" as any)
    .select("*")
    .eq("status", "active")
    .order("priority", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    diag("campaigns", "fetch failed", error.message);
    throw error;
  }

  const now = Date.now();
  const match = (data ?? []).find((c: any) => isWithinSchedule(c, now)) ?? null;

  if (!match) {
    diag("campaigns", "no active campaign within schedule window", { count: data?.length ?? 0 });
    return null;
  }

  return normalizeCampaign(match);
}

export function useActiveCampaign() {
  const query = useQuery({
    queryKey: ["active-campaign"],
    queryFn: fetchActiveCampaign,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  return {
    campaign: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
