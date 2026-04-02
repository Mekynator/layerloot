import { supabase } from "@/integrations/supabase/client";

interface AutomationContext {
  orderId: string;
  triggerEvent: "status_changed" | "production_changed" | "quote_sent" | "message_sent";
  fromStatus?: string;
  toStatus?: string;
  userId?: string;
}

async function getTemplate(key: string): Promise<string | null> {
  const { data } = await supabase
    .from("custom_order_message_templates" as any)
    .select("template")
    .eq("trigger_key", key)
    .eq("is_active", true)
    .maybeSingle();
  return (data as any)?.template ?? null;
}

export async function executeAutomation(ctx: AutomationContext) {
  try {
    // Load matching active rules
    const { data: rules } = await supabase
      .from("custom_order_automation_rules" as any)
      .select("*")
      .eq("trigger_event", ctx.triggerEvent)
      .eq("is_active", true)
      .order("sort_order");

    if (!rules || rules.length === 0) return;

    for (const rule of rules) {
      const config = (rule as any).trigger_config as any;

      // Check conditions
      if (ctx.triggerEvent === "status_changed" || ctx.triggerEvent === "production_changed") {
        if (config?.to_status && config.to_status !== ctx.toStatus) continue;
        if (config?.from_status && config.from_status !== ctx.fromStatus) continue;
      }

      // Execute actions
      const actions = ((rule as any).actions as any[]) || [];
      for (const action of actions) {
        if (action.type === "system_message") {
          const template = await getTemplate(action.template_key);
          if (template) {
            await supabase.from("custom_order_messages").insert({
              custom_order_id: ctx.orderId,
              sender_role: "system",
              message: template,
              message_type: "status_update",
            });
          }
        }
        if (action.type === "notify_user") {
          await supabase.from("custom_orders").update({ unread_by_user: true } as any).eq("id", ctx.orderId);
        }
        if (action.type === "notify_admin") {
          await supabase.from("custom_orders").update({ unread_by_admin: true } as any).eq("id", ctx.orderId);
        }
        if (action.type === "close_conversation") {
          const { data: order } = await supabase.from("custom_orders").select("metadata").eq("id", ctx.orderId).maybeSingle();
          const meta = (order?.metadata as any) || {};
          await supabase.from("custom_orders").update({
            metadata: { ...meta, conversation_status: "closed" },
          }).eq("id", ctx.orderId);
        }
      }
    }
  } catch (err) {
    console.error("Automation execution error:", err);
  }
}

export async function trackSlaStage(orderId: string, stage: string, deadlineHours?: number) {
  try {
    // Resolve any existing open SLA for this order
    await supabase
      .from("custom_order_sla_tracking" as any)
      .update({ resolved_at: new Date().toISOString() })
      .eq("custom_order_id", orderId)
      .is("resolved_at", null);

    // Insert new SLA stage
    const deadlineAt = deadlineHours
      ? new Date(Date.now() + deadlineHours * 3600000).toISOString()
      : null;

    await supabase.from("custom_order_sla_tracking" as any).insert({
      custom_order_id: orderId,
      stage,
      deadline_at: deadlineAt,
      sla_status: "on_track",
    });
  } catch (err) {
    console.error("SLA tracking error:", err);
  }
}

// Default SLA deadlines per stage (hours)
export const DEFAULT_SLA_HOURS: Record<string, number> = {
  pending: 24,
  reviewing: 48,
  quoted: 72,
  in_production: 168, // 7 days
  completed: 48,
};
