import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SocialProofData = {
  viewingNow: number;
  viewedRecently: number;
  lastPurchasedAt: string | null;
  purchaseCountThisWeek: number;
};

// Deterministic pseudo-random from product ID for consistent "live" counts
function pseudoViewing(productId: string): number {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = ((hash << 5) - hash + productId.charCodeAt(i)) | 0;
  }
  const minute = Math.floor(Date.now() / 60000);
  const seed = Math.abs(hash ^ minute);
  return 3 + (seed % 18); // 3-20 range
}

function pseudoRecentViews(productId: string): number {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = ((hash << 5) - hash + productId.charCodeAt(i)) | 0;
  }
  const hour = Math.floor(Date.now() / 3600000);
  const seed = Math.abs(hash ^ hour);
  return 8 + (seed % 35); // 8-42 range
}

async function fetchProductSocialProofData(productId: string): Promise<SocialProofData> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let lastPurchasedAt: string | null = null;
  let purchaseCountThisWeek = 0;

  try {
    const { data: recentItems } = await supabase
      .from("order_items")
      .select("id, orders!inner(created_at)")
      .eq("product_id", productId)
      .gte("orders.created_at", oneWeekAgo)
      .limit(20);

    const items = (recentItems as any[]) ?? [];
    purchaseCountThisWeek = items.length;
    if (items.length > 0) {
      const dates = items
        .map((i) => i.orders?.created_at)
        .filter(Boolean)
        .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());
      lastPurchasedAt = dates[0] ?? null;
    }
  } catch {
    // Gracefully degrade if join fails
  }

  return {
    viewingNow: pseudoViewing(productId),
    viewedRecently: pseudoRecentViews(productId),
    lastPurchasedAt,
    purchaseCountThisWeek,
  };
}

export function useSocialProof(productId?: string) {
  return useQuery({
    queryKey: ["social-proof", productId],
    queryFn: () => fetchProductSocialProofData(productId!),
    enabled: Boolean(productId),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
  });
}

export function useSocialProofCompact(productId?: string) {
  const result = useMemo(() => {
    if (!productId) return { viewingNow: 0, purchaseHint: null };
    return {
      viewingNow: pseudoViewing(productId),
      purchaseHint: null as string | null,
    };
  }, [productId]);

  return result;
}

export function formatRelativePurchaseTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
