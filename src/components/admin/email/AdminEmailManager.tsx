import { useEffect, useState } from "react";
import { Mail, Zap, Plus, Trash2, Save, ToggleLeft, ToggleRight, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { EmailTemplate } from "./types";
import { DEFAULT_TEMPLATE, TEMPLATE_DEFAULTS } from "./types";
import TemplateEditorModal from "./TemplateEditorModal";

interface AutomationRule {
  id: string;
  name: string;
  trigger_event: string;
  is_active: boolean;
}

export default function AdminEmailManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const { toast } = useToast();

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("custom_order_message_templates" as any)
      .select("*")
      .order("sort_order");
    const raw = (data as any as any[]) ?? [];

    const mapped: EmailTemplate[] = raw.map((r: any) => ({
      ...DEFAULT_TEMPLATE,
      id: r.id,
      name: r.title,
      trigger_key: r.trigger_key,
      is_active: r.is_active,
      sort_order: r.sort_order,
      body: r.template,
      created_at: r.created_at,
      updated_at: r.updated_at,
      ...(r.extended_config ? JSON.parse(r.extended_config) : {}),
      ...(TEMPLATE_DEFAULTS[r.trigger_key] || {}),
      ...(r.extended_config ? JSON.parse(r.extended_config) : {}),
    }));

    setTemplates(mapped);
  };

  const loadAutomations = async () => {
    const { data } = await supabase
      .from("custom_order_automation_rules" as any)
      .select("id, name, trigger_event, is_active")
      .order("sort_order");
    setAutomations((data as any as AutomationRule[]) ?? []);
  };

  useEffect(() => {
    Promise.all([loadTemplates(), loadAutomations()]).then(() => setLoading(false));
  }, []);

  const saveTemplate = async (t: EmailTemplate) => {
    const { id, name, trigger_key, is_active, body, sort_order, created_at, updated_at, ...extended } = t;
    const { error } = await supabase
      .from("custom_order_message_templates" as any)
      .update({
        title: name,
        trigger_key,
        is_active,
        template: body,
        extended_config: JSON.stringify(extended)
      } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template saved" });
      setEditingTemplate(null);
      loadTemplates();
    }
  };

  const addTemplate = async () => {
    const { error } = await supabase
      .from("custom_order_message_templates" as any)
      .insert({
        trigger_key: "custom",
        title: "New Template",
        template: "Enter message here...",
        sort_order: templates.length,
      } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Template added" }); loadTemplates(); }
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("custom_order_message_templates" as any).delete().eq("id", id);
    toast({ title: "Template deleted" });
    loadTemplates();
  };

  const duplicateTemplate = async (t: EmailTemplate) => {
    const { error } = await supabase
      .from("custom_order_message_templates" as any)
      .insert({
        trigger_key: t.trigger_key + "-copy",
        title: t.name + " (Copy)",
        template: t.body,
        sort_order: templates.length,
      } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Template duplicated" }); setEditingTemplate(null); loadTemplates(); }
  };

  const triggerLabel = (key: string) => {
    const map: Record<string, string> = {
      'status_changed': 'Status Change',
      'production_changed': 'Production Update',
      'quote_sent': 'Quote Sent',
      'no_customer_reply': 'No Reply (Timed)',
      'auto_close': 'Auto Close',
    };
    return map[key] || key;
  };

  const templateIcon = (key: string) => {
    if (key.includes('order') || key.includes('receipt')) return '📦';
    if (key.includes('welcome') || key.includes('account')) return '👋';
    if (key.includes('password') || key.includes('verification')) return '🔐';
    if (key.includes('contact') || key.includes('ticket')) return '💬';
    if (key.includes('shipping') || key.includes('delivered')) return '🚚';
    if (key.includes('gift')) return '🎁';
    if (key.includes('quote')) return '💰';
    if (key.includes('payment')) return '✅';
    return '✉️';
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading email manager...</div>;
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-lg font-bold uppercase flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Email & Automations
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage automations and message templates</p>
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-4 min-h-[600px]">
        <div className="space-y-3">
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30">
              <h3 className="font-display text-xs font-semibold uppercase flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-primary" /> Automations
              </h3>
            </div>
            <ScrollArea className="max-h-[540px]">
              <div className="p-2 space-y-1">
                {automations.map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors hover:bg-accent/10 ${!a.is_active ? 'opacity-50' : ''}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{a.name}</div>
                      <div className="text-[10px] text-muted-foreground">{triggerLabel(a.trigger_event)}</div>
                    </div>
                  </div>
                ))}
                {automations.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4">No automations yet</p>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xs font-semibold uppercase flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-primary" /> Message Templates
            </h3>
            <Button size="sm" variant="outline" onClick={addTemplate} className="h-7 text-[11px]">
              <Plus className="mr-1 h-3 w-3" /> Add Template
            </Button>
          </div>

          <div className="grid gap-2">
            {templates.map((t) => (
              <Card
                key={t.id}
                className={`cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg ${!t.is_active ? 'opacity-50' : ''}`}
                onClick={() => setEditingTemplate(t)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{templateIcon(t.trigger_key)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{t.name}</span>
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 shrink-0">
                          {t.trigger_key}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {t.subject || t.body?.slice(0, 80) || 'No content'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`w-2 h-2 rounded-full ${t.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {templates.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Mail className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No templates yet. Add one to get started.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {editingTemplate && (
        <TemplateEditorModal
          template={editingTemplate}
          open={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSave={saveTemplate}
          onDuplicate={duplicateTemplate}
        />
      )}
    </div>
  );
}
