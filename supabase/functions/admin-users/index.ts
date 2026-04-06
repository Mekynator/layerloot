import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_ROLES = [
  "owner", "super_admin", "admin", "editor", "support",
  "content_admin", "orders_admin", "support_admin", "marketing_admin", "custom",
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Check if user has any admin role
    const { data: roleRows } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ADMIN_ROLES);

    const hasAdminRole = (roleRows ?? []).length > 0;

    if (!hasAdminRole) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // Parse body for action routing
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* empty body OK for default list */ }
    const action = (body.action as string) ?? "list_users";

    // Action: lookup_by_email
    if (action === "lookup_by_email") {
      const email = body.email as string;
      if (!email) return jsonResponse({ error: "Email required" }, 400);

      const { data: lookupData } = await serviceClient.auth.admin.listUsers({ perPage: 1 });
      // Search through users for email match
      let page = 1;
      while (true) {
        const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 200 });
        if (error) return jsonResponse({ error: error.message }, 500);
        const batch = data?.users ?? [];
        const found = batch.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (found) return jsonResponse({ user_id: found.id, email: found.email });
        if (batch.length < 200) break;
        page++;
      }
      return jsonResponse({ error: "User not found" }, 404);
    }

    // Action: list_users (default)
    const users: Array<{
      id: string;
      email: string | null;
      created_at: string;
      last_sign_in_at: string | null;
      role: string | null;
      user_metadata: Record<string, unknown> | null;
    }> = [];

    let page = 1;

    while (true) {
      const { data, error } = await serviceClient.auth.admin.listUsers({
        page,
        perPage: 200,
      });

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      const batch = data?.users ?? [];
      users.push(
        ...batch.map((listedUser) => ({
          id: listedUser.id,
          email: listedUser.email ?? null,
          created_at: listedUser.created_at,
          last_sign_in_at: listedUser.last_sign_in_at ?? null,
          role:
            (typeof listedUser.app_metadata?.role === "string" && listedUser.app_metadata.role) ||
            (Array.isArray(listedUser.app_metadata?.roles) && listedUser.app_metadata.roles.includes("admin")
              ? "admin"
              : null),
          user_metadata:
            listedUser.user_metadata && typeof listedUser.user_metadata === "object"
              ? listedUser.user_metadata as Record<string, unknown>
              : null,
        })),
      );

      if (batch.length < 200) break;
      page += 1;
    }

    return jsonResponse({ users });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
