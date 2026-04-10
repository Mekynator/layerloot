import { useEffect, useState } from "react";
import { Truck, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface ShippingProvider {
  id: string;
  name: string;
  description: string | null;
  base_cost: number;
  cost_per_kg: number;
  free_threshold: number | null;
  estimated_days: string | null;
  is_active: boolean;
  sort_order: number;
}

type ShippingProviderUpdateField = "base_cost" | "cost_per_kg" | "free_threshold" | "estimated_days";

type ShippingProviderUpdate = {
  base_cost?: number;
  cost_per_kg?: number;
  free_threshold?: number | null;
  estimated_days?: string | null;
};

const AdminShipping = () => {
  const [threshold, setThreshold] = useState(75);
  const [flatRate, setFlatRate] = useState(5.99);
  const [configId, setConfigId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ShippingProvider[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: "", description: "", base_cost: 0, cost_per_kg: 0, free_threshold: "", estimated_days: "" });
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("shipping_config").select("*").limit(1).single().then(({ data }) => {
      if (data) { setThreshold(Number(data.free_shipping_threshold)); setFlatRate(Number(data.flat_rate)); setConfigId(data.id); }
    });
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    const { data } = await supabase.from("shipping_providers").select("*").order("sort_order");
    setProviders((data as ShippingProvider[]) ?? []);
  };

  const saveConfig = async () => {
    if (!configId) return;
    const { error } = await supabase.from("shipping_config").update({ free_shipping_threshold: threshold, flat_rate: flatRate }).eq("id", configId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Settings saved!" });
  };

  const addProvider = async () => {
    const { error } = await supabase.from("shipping_providers").insert({
      name: newProvider.name,
      description: newProvider.description || null,
      base_cost: newProvider.base_cost,
      cost_per_kg: newProvider.cost_per_kg,
      free_threshold: newProvider.free_threshold ? parseFloat(newProvider.free_threshold) : null,
      estimated_days: newProvider.estimated_days || null,
      sort_order: providers.length,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Provider added!" });
    setAddOpen(false);
    setNewProvider({ name: "", description: "", base_cost: 0, cost_per_kg: 0, free_threshold: "", estimated_days: "" });
    fetchProviders();
  };

  const toggleProvider = async (id: string, active: boolean) => {
    await supabase.from("shipping_providers").update({ is_active: active }).eq("id", id);
    fetchProviders();
  };

  const deleteProvider = async (id: string) => {
    await supabase.from("shipping_providers").delete().eq("id", id);
    toast({ title: "Provider deleted" });
    fetchProviders();
  };

  const updateProvider = async (id: string, field: ShippingProviderUpdateField, value: number | string | null) => {
    const payload: ShippingProviderUpdate =
      field === "base_cost"
        ? { base_cost: Number(value) || 0 }
        : field === "cost_per_kg"
          ? { cost_per_kg: Number(value) || 0 }
          : field === "free_threshold"
            ? { free_threshold: typeof value === "number" ? value : null }
            : { estimated_days: typeof value === "string" ? value : null };

    await supabase.from("shipping_providers").update(payload).eq("id", id);
    fetchProviders();
  };

  return (
    <AdminLayout>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase text-foreground">Shipping Settings</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Global Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display uppercase">
              <Truck className="h-5 w-5 text-primary" /> Global Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Free Shipping Threshold ($)</Label>
              <Input type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Default Flat Rate ($)</Label>
              <Input type="number" step="0.01" value={flatRate} onChange={(e) => setFlatRate(parseFloat(e.target.value) || 0)} />
            </div>
            <Button onClick={saveConfig} className="w-full font-display uppercase tracking-wider">Save Global Settings</Button>
          </CardContent>
        </Card>

        {/* Providers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display uppercase">Shipping Providers</CardTitle>
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add Provider</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {providers.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="font-display text-sm font-semibold uppercase">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={p.is_active} onCheckedChange={(v) => toggleProvider(p.id, v)} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteProvider(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Base Cost ($)</Label>
                    <Input type="number" step="0.01" value={p.base_cost} className="h-8 text-xs"
                      onChange={(e) => updateProvider(p.id, "base_cost", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">Per Kg ($)</Label>
                    <Input type="number" step="0.01" value={p.cost_per_kg} className="h-8 text-xs"
                      onChange={(e) => updateProvider(p.id, "cost_per_kg", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">Free Above ($)</Label>
                    <Input type="number" step="0.01" value={p.free_threshold ?? ""} placeholder="None" className="h-8 text-xs"
                      onChange={(e) => updateProvider(p.id, "free_threshold", e.target.value ? parseFloat(e.target.value) : null)} />
                  </div>
                </div>
                <div className="mt-2">
                  <Label className="text-xs">Est. Delivery</Label>
                  <Input value={p.estimated_days ?? ""} placeholder="e.g. 3-5 days" className="h-8 text-xs"
                    onChange={(e) => updateProvider(p.id, "estimated_days", e.target.value)} />
                </div>
              </div>
            ))}
            {providers.length === 0 && <p className="text-sm text-muted-foreground">No providers yet.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Add Provider Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display uppercase">Add Shipping Provider</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={newProvider.name} onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })} placeholder="e.g. DHL Express" /></div>
            <div><Label>Description</Label><Input value={newProvider.description} onChange={(e) => setNewProvider({ ...newProvider, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Base Cost ($)</Label><Input type="number" step="0.01" value={newProvider.base_cost} onChange={(e) => setNewProvider({ ...newProvider, base_cost: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Cost per Kg ($)</Label><Input type="number" step="0.01" value={newProvider.cost_per_kg} onChange={(e) => setNewProvider({ ...newProvider, cost_per_kg: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>Free Shipping Above ($)</Label><Input value={newProvider.free_threshold} onChange={(e) => setNewProvider({ ...newProvider, free_threshold: e.target.value })} placeholder="Leave empty for none" /></div>
            <div><Label>Estimated Delivery</Label><Input value={newProvider.estimated_days} onChange={(e) => setNewProvider({ ...newProvider, estimated_days: e.target.value })} placeholder="e.g. 2-3 business days" /></div>
            <Button onClick={addProvider} disabled={!newProvider.name.trim()} className="w-full font-display uppercase tracking-wider">Add Provider</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminShipping;
