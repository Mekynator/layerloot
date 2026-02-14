import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

const AdminShipping = () => {
  const [threshold, setThreshold] = useState(75);
  const [flatRate, setFlatRate] = useState(5.99);
  const [configId, setConfigId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("shipping_config").select("*").limit(1).single().then(({ data }) => {
      if (data) {
        setThreshold(Number(data.free_shipping_threshold));
        setFlatRate(Number(data.flat_rate));
        setConfigId(data.id);
      }
    });
  }, []);

  const save = async () => {
    if (!configId) return;
    const { error } = await supabase.from("shipping_config").update({ free_shipping_threshold: threshold, flat_rate: flatRate }).eq("id", configId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Shipping settings saved!" });
  };

  return (
    <AdminLayout>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase text-foreground">Shipping Settings</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display uppercase">
            <Truck className="h-5 w-5 text-primary" /> Shipping Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Free Shipping Threshold ($)</Label>
            <Input type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)} />
            <p className="mt-1 text-xs text-muted-foreground">Orders above this amount get free shipping</p>
          </div>
          <div>
            <Label>Flat Rate ($)</Label>
            <Input type="number" step="0.01" value={flatRate} onChange={(e) => setFlatRate(parseFloat(e.target.value) || 0)} />
            <p className="mt-1 text-xs text-muted-foreground">Shipping cost for orders below the threshold</p>
          </div>
          <Button onClick={save} className="w-full font-display uppercase tracking-wider">Save Settings</Button>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminShipping;
