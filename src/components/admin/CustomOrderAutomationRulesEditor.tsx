import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AutomationRule {
  id: string;
  name: string;
  trigger_event: string;
  trigger_config: any;
  actions: any[];
  is_active: boolean;
  sort_order: number;
}

const TRIGGER_EVENTS = [
  { value: "status_changed", label: "Status Changed" },
  { value: "production_changed", label: "Production Updated" },
  { value: "quote_sent", label: "Quote Sent" },
  { value: "no_customer_reply", label: "No Customer Reply (timed)" },
  { value: "auto_close", label: "Auto-Close Conversation (timed)" },
];

export default function CustomOrderAutomationRulesEditor() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("custom_order_automation_rules" as any)
      .select("*")
      .order("sort_order");
    setRules((data as any as AutomationRule[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateField = (id: string, field: keyof AutomationRule, value: any) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const updateConfig = (id: string, key: string, value: any) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, trigger_config: { ...r.trigger_config, [key]: value } } : r));
  };

  const saveRule = async (r: AutomationRule) => {
    const { error } = await supabase
      .from("custom_order_automation_rules" as any)
      .update({
        name: r.name,
        trigger_event: r.trigger_event,
        trigger_config: r.trigger_config,
        actions: r.actions,
        is_active: r.is_active,
      } as any)
      .eq("id", r.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Rule saved" });
  };

  const addRule = async () => {
    const { error } = await supabase
      .from("custom_order_automation_rules" as any)
      .insert({
        name: "New Rule",
        trigger_event: "status_changed",
        trigger_config: {},
        actions: [{ type: "notify_user" }],
        sort_order: rules.length,
      } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Rule added" }); load(); }
  };

  const deleteRule = async (id: string) => {
    await supabase.from("custom_order_automation_rules" as any).delete().eq("id", id);
    toast({ title: "Rule deleted" });
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground py-4">Loading rules...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Automation Rules
        </h3>
        <Button size="sm" variant="outline" onClick={addRule}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Rule
        </Button>
      </div>

      {rules.map((r) => (
        <Card key={r.id} className={!r.is_active ? "opacity-60" : ""}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Rule Name</Label>
                    <Input value={r.name} onChange={e => updateField(r.id, "name", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="w-48">
                    <Label className="text-xs">Trigger Event</Label>
                    <Select value={r.trigger_event} onValueChange={v => updateField(r.id, "trigger_event", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRIGGER_EVENTS.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Condition fields */}
                <div className="flex gap-2 flex-wrap">
                  {(r.trigger_event === "status_changed" || r.trigger_event === "production_changed") && (
                    <div className="w-40">
                      <Label className="text-xs">To Status</Label>
                      <Input
                        value={r.trigger_config?.to_status || ""}
                        onChange={e => updateConfig(r.id, "to_status", e.target.value)}
                        className="h-8 text-sm font-mono"
                        placeholder="e.g. reviewing"
                      />
                    </div>
                  )}
                  {(r.trigger_event === "no_customer_reply" || r.trigger_event === "auto_close") && (
                    <>
                      <div className="w-32">
                        <Label className="text-xs">Delay (days)</Label>
                        <Input
                          type="number"
                          value={r.trigger_config?.delay_days ?? 3}
                          onChange={e => updateConfig(r.id, "delay_days", parseInt(e.target.value) || 3)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="w-40">
                        <Label className="text-xs">Required Status</Label>
                        <Input
                          value={r.trigger_config?.required_status || ""}
                          onChange={e => updateConfig(r.id, "required_status", e.target.value)}
                          className="h-8 text-sm font-mono"
                          placeholder="e.g. quoted"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Actions summary */}
                <div className="flex gap-1 flex-wrap">
                  {(r.actions as any[]).map((a: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{a.type}{a.template_key ? `: ${a.template_key}` : ""}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={r.is_active} onCheckedChange={v => updateField(r.id, "is_active", v)} />
                <span className="text-xs text-muted-foreground">{r.is_active ? "Active" : "Inactive"}</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => saveRule(r)} className="h-7 text-xs">
                  <Save className="mr-1 h-3 w-3" /> Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteRule(r.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {rules.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No automation rules yet.</p>
      )}
    </div>
  );
}
