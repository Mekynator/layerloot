import { supabase } from "@/integrations/supabase/client";

interface SignedUrlCache {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, SignedUrlCache>();
const CACHE_BUFFER_SECONDS = 300; // refresh 5 min before expiry

/**
 * Get a signed URL for a 3D model stored in the private 3d-models bucket.
 * Results are cached in memory to avoid repeated requests.
 */
export async function getSignedModelUrl(
  modelUrl: string,
  productId?: string | null
): Promise<string | null> {
  if (!modelUrl) return null;

  // Only process 3d-models bucket URLs
  if (!modelUrl.includes("3d-models")) return modelUrl;

  const cacheKey = modelUrl;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() / 1000 + CACHE_BUFFER_SECONDS) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.functions.invoke("get-signed-model-url", {
      body: { model_url: modelUrl, product_id: productId ?? null },
    });

    if (error || !data?.signed_url) {
      console.error("Failed to get signed model URL:", error ?? data?.error);
      return null;
    }

    cache.set(cacheKey, {
      url: data.signed_url,
      expiresAt: Date.now() / 1000 + (data.expires_in ?? 3600),
    });

    return data.signed_url;
  } catch {
    return null;
  }
}
