import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
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

    const metadataRole = user.app_metadata?.role;
    const metadataRoles = Array.isArray(user.app_metadata?.roles) ? user.app_metadata.roles : [];

    let isAdmin = metadataRole === "admin" || metadataRoles.includes("admin");

    if (!isAdmin) {
      const { data: roleRow, error: roleError } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) {
        return jsonResponse({ error: roleError.message }, 403);
      }

      isAdmin = !!roleRow;
    }

    if (!isAdmin) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

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
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
