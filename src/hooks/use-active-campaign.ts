import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignTheme {
  id: string;
  name: string;
  campaign_type: string;
  status?: string;
  is_active?: boolean;
  priority?: number;
  homepage_placement?: boolean;
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

const POLL_INTERVAL = 60_000;

function isWithinSchedule(c: any, now: number): boolean {
  const start = c.starts_at ?? c.start_date ?? null;
  const end = c.ends_at ?? c.end_date ?? null;
  if (start && new Date(start).getTime() > now) return false;
  if (end && new Date(end).getTime() < now) return false;
  return true;
}

export function useActiveCampaign() {
  const [campaign, setCampaign] = useState<CampaignTheme | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActive = async () => {
    try {
      // Fetch all active campaigns and filter the schedule window in JS so we
      // robustly handle Admin's dual schema (start_date/end_date + starts_at/ends_at).
      const { data, error } = await supabase
        .from("campaigns" as any)
        .select("*")
        .eq("status", "active")
        .order("priority", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) {
        if (import.meta.env.DEV) console.warn("[campaigns] fetch failed:", error.message);
        setCampaign(null);
        return;
      }

      const now = Date.now();
      const match = (data ?? []).find((c: any) => isWithinSchedule(c, now)) ?? null;

      if (!match && import.meta.env.DEV) {
        console.warn("[campaigns] no active campaign within schedule window");
      }

      setCampaign(match as unknown as CampaignTheme | null);
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[campaigns] unexpected error:", err);
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActive();
    const interval = setInterval(fetchActive, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return { campaign, loading };
}
