import { useEffect, useState } from "react";
import { Save, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Template {
  id: string;
  trigger_key: string;
  title: string;
  template: string;
  is_active: boolean;
  sort_order: number;
}

export default function CustomOrderTemplatesEditor() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("custom_order_message_templates" as any)
      .select("*")
      .order("sort_order");
    setTemplates((data as any as Template[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateField = (id: string, field: keyof Template, value: any) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const saveTemplate = async (t: Template) => {
    const { error } = await supabase
      .from("custom_order_message_templates" as any)
      .update({ title: t.title, template: t.template, trigger_key: t.trigger_key, is_active: t.is_active } as any)
      .eq("id", t.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Template saved" });
  };

  const addTemplate = async () => {
    const { error } = await supabase
      .from("custom_order_message_templates" as any)
      .insert({ trigger_key: "custom", title: "New Template", template: "Enter message here...", sort_order: templates.length } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Template added" }); load(); }
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("custom_order_message_templates" as any).delete().eq("id", id);
    toast({ title: "Template deleted" });
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground py-4">Loading templates...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase">Message Templates</h3>
        <Button size="sm" variant="outline" onClick={addTemplate}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Template
        </Button>
      </div>

      {templates.map((t) => (
        <Card key={t.id} className={!t.is_active ? "opacity-60" : ""}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={t.title} onChange={e => updateField(t.id, "title", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="w-40">
                    <Label className="text-xs">Trigger Key</Label>
                    <Input value={t.trigger_key} onChange={e => updateField(t.id, "trigger_key", e.target.value)} className="h-8 text-sm font-mono" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Message Template</Label>
                  <Textarea value={t.template} onChange={e => updateField(t.id, "template", e.target.value)} rows={2} className="text-sm" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={t.is_active} onCheckedChange={v => updateField(t.id, "is_active", v)} />
                <span className="text-xs text-muted-foreground">{t.is_active ? "Active" : "Inactive"}</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => saveTemplate(t)} className="h-7 text-xs">
                  <Save className="mr-1 h-3 w-3" /> Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteTemplate(t.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {templates.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No templates yet. Add one to get started.</p>
      )}
    </div>
  );
}
