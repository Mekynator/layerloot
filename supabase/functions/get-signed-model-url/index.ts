import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SIGNED_URL_EXPIRY = 3600; // 1 hour

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

    const { model_url, product_id } = await req.json();

    if (!model_url || typeof model_url !== "string") {
      return json({ error: "model_url is required" }, 400);
    }

    // Extract the storage path from the full URL
    // URLs look like: https://<ref>.supabase.co/storage/v1/object/public/3d-models/<path>
    // or just the path itself
    let storagePath: string;
    if (model_url.includes("/storage/v1/object/")) {
      const match = model_url.match(/\/storage\/v1\/object\/(?:public|sign)\/3d-models\/(.+)/);
      if (!match) {
        return json({ error: "Invalid 3d-models URL format" }, 400);
      }
      storagePath = decodeURIComponent(match[1].split("?")[0]);
    } else {
      // Assume it's already just the path
      storagePath = model_url;
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Check access: if product_id provided, verify product is public (is_active + published)
    if (product_id) {
      const { data: product } = await serviceClient
        .from("products")
        .select("id, is_active, status")
        .eq("id", product_id)
        .maybeSingle();

      if (product && product.is_active && product.status === "published") {
        // Public product — allow access
      } else {
        // Product not public — check if caller is authenticated admin or owner
        const authHeader = req.headers.get("Authorization") ?? "";
        if (!authHeader) return json({ error: "Unauthorized" }, 401);

        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (!user) return json({ error: "Unauthorized" }, 401);

        // Check admin role
        const { data: roleRow } = await serviceClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "super_admin", "editor"])
          .maybeSingle();

        if (!roleRow) return json({ error: "Forbidden" }, 403);
      }
    }
    // If no product_id, allow access (admin uploads, custom order views, etc.)
    // Custom order files use a different bucket; 3d-models are product models

    // Generate signed URL
    const { data, error } = await serviceClient.storage
      .from("3d-models")
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (error || !data?.signedUrl) {
      return json({ error: error?.message ?? "Failed to generate signed URL" }, 500);
    }

    return json({ signed_url: data.signedUrl, expires_in: SIGNED_URL_EXPIRY });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
