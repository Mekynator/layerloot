import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Load active time-based rules
    const { data: rules } = await supabase
      .from("custom_order_automation_rules")
      .select("*")
      .eq("is_active", true)
      .in("trigger_event", ["no_customer_reply", "auto_close"]);

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const rule of rules) {
      const config = rule.trigger_config as any;
      const delayDays = config?.delay_days ?? 3;
      const cutoff = new Date(Date.now() - delayDays * 86400000).toISOString();

      if (rule.trigger_event === "no_customer_reply") {
        // Find quoted orders where last message is older than cutoff and no reminder sent recently
        const requiredStatus = config?.required_status ?? "quoted";
        const { data: orders } = await supabase
          .from("custom_orders")
          .select("id, status, customer_response_status, updated_at")
          .eq("status", requiredStatus)
          .eq("customer_response_status", "pending");

        if (!orders) continue;

        for (const order of orders) {
          // Check last message date
          const { data: lastMsg } = await supabase
            .from("custom_order_messages")
            .select("created_at, sender_role, message_type")
            .eq("custom_order_id", order.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!lastMsg || lastMsg.created_at > cutoff) continue;
          // Don't send if last message was already a reminder
          if (lastMsg.message_type === "reminder") continue;

          // Execute actions
          const actions = (rule.actions as any[]) || [];
          for (const action of actions) {
            if (action.type === "system_message") {
              const template = await getTemplate(supabase, action.template_key);
              await supabase.from("custom_order_messages").insert({
                custom_order_id: order.id,
                sender_role: "system",
                message: template || "Reminder: You have a pending quote waiting for your response.",
                message_type: "reminder",
              });
            }
            if (action.type === "notify_user") {
              await supabase.from("custom_orders").update({ unread_by_user: true }).eq("id", order.id);
            }
            if (action.type === "notify_admin") {
              await supabase.from("custom_orders").update({ unread_by_admin: true }).eq("id", order.id);
            }
          }
          processed++;
        }
      }

      if (rule.trigger_event === "auto_close") {
        const requiredStatus = config?.required_status ?? "completed";
        const { data: orders } = await supabase
          .from("custom_orders")
          .select("id, metadata")
          .eq("status", requiredStatus);

        if (!orders) continue;

        for (const order of orders) {
          const meta = order.metadata as any;
          if (meta?.conversation_status === "closed") continue;

          // Check last message
          const { data: lastMsg } = await supabase
            .from("custom_order_messages")
            .select("created_at")
            .eq("custom_order_id", order.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!lastMsg || lastMsg.created_at > cutoff) continue;

          // Close conversation
          await supabase.from("custom_orders").update({
            metadata: { ...meta, conversation_status: "closed" },
          }).eq("id", order.id);

          const template = await getTemplate(supabase, "conversation_closed");
          await supabase.from("custom_order_messages").insert({
            custom_order_id: order.id,
            sender_role: "system",
            message: template || "This conversation has been automatically closed.",
            message_type: "status_update",
          });
          processed++;
        }
      }
    }

    // Update SLA statuses
    await updateSlaStatuses(supabase);

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Automation error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getTemplate(supabase: any, key: string): Promise<string | null> {
  const { data } = await supabase
    .from("custom_order_message_templates")
    .select("template")
    .eq("trigger_key", key)
    .eq("is_active", true)
    .maybeSingle();
  return data?.template ?? null;
}

async function updateSlaStatuses(supabase: any) {
  const now = new Date();
  // Warning threshold: 80% of deadline reached
  const { data: slaRecords } = await supabase
    .from("custom_order_sla_tracking")
    .select("*")
    .is("resolved_at", null)
    .not("deadline_at", "is", null);

  if (!slaRecords) return;

  for (const sla of slaRecords) {
    const deadline = new Date(sla.deadline_at);
    const entered = new Date(sla.entered_at);
    const totalMs = deadline.getTime() - entered.getTime();
    const elapsedMs = now.getTime() - entered.getTime();

    let newStatus = "on_track";
    if (now >= deadline) {
      newStatus = "overdue";
    } else if (elapsedMs / totalMs >= 0.8) {
      newStatus = "warning";
    }

    if (newStatus !== sla.sla_status) {
      await supabase.from("custom_order_sla_tracking").update({ sla_status: newStatus }).eq("id", sla.id);
    }
  }
}
