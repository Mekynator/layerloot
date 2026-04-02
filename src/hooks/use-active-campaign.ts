import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignTheme {
  id: string;
  name: string;
  campaign_type: string;
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

const POLL_INTERVAL = 60_000; // check every 60s

export function useActiveCampaign() {
  const [campaign, setCampaign] = useState<CampaignTheme | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActive = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("campaigns" as any)
        .select("*")
        .eq("status", "active")
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order("priority", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setCampaign(data as any);
      } else {
        setCampaign(null);
      }
    } catch {
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
