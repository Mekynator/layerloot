import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatSettings {
  position?: "bottom-right" | "bottom-left";
  launcherSize?: number;
  headerColor?: string;
  userBubbleColor?: string;
  aiBubbleColor?: string;
  avatarUrl?: string;
  brandName?: string;
  greeting?: string;
  tone?: "friendly" | "professional" | "playful" | "warm";
  showOnMobile?: boolean;
  defaultOpen?: boolean;
}

const DEFAULT_SETTINGS: ChatSettings = {
  position: "bottom-right",
  launcherSize: 56,
  brandName: "LayerLoot Assistant",
  tone: "friendly",
  showOnMobile: true,
  defaultOpen: false,
};

export function useChatSettings() {
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "chat_widget")
          .maybeSingle();
        if (data?.value) {
          setSettings({ ...DEFAULT_SETTINGS, ...(data.value as any) });
        }
      } catch { /* keep defaults */ }
      setLoading(false);
    };
    load();
  }, []);

  return { settings, loading };
}
