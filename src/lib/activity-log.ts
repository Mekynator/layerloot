import { supabase } from "@/integrations/supabase/client";

interface LogActivityParams {
  userId: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  summary?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an admin activity to the admin_activity_log table.
 * Fire-and-forget — does not throw on failure.
 */
export async function logAdminActivity(params: LogActivityParams): Promise<void> {
  try {
    await supabase.from("admin_activity_log" as any).insert({
      user_id: params.userId,
      user_email: params.userEmail ?? null,
      user_role: params.userRole ?? null,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      summary: params.summary ?? null,
      metadata: params.metadata ?? {},
    } as any);
  } catch {
    // Fire-and-forget — don't crash the app for logging failures
  }
}
