import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

const AdminSettings = () => {
  const { toast } = useToast();
  const [contact, setContact] = useState({ email: "", phone: "", address: "", social: { instagram: "", facebook: "", youtube: "" } });
  const [store, setStore] = useState({ name: "LayerLoot", currency: "DKK", currency_symbol: "kr" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("site_settings").select("*");
      if (data) {
        data.forEach((s: any) => {
          if (s.key === "contact") setContact(s.value as any);
          if (s.key === "store") setStore(s.value as any);
        });
      }
    };
    fetch();
  }, []);

  const save = async () => {
    setSaving(true);
    await Promise.all([
      supabase.from("site_settings").update({ value: contact as any }).eq("key", "contact"),
      supabase.from("site_settings").update({ value: store as any }).eq("key", "store"),
    ]);
    setSaving(false);
    toast({ title: "Settings saved!" });
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Settings</h1>
        <Button onClick={save} disabled={saving} className="font-display uppercase tracking-wider">
          <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="font-display uppercase">Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Email</Label><Input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display uppercase">Social Media</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Instagram URL</Label><Input value={contact.social?.instagram ?? ""} onChange={(e) => setContact({ ...contact, social: { ...contact.social, instagram: e.target.value } })} /></div>
            <div><Label>Facebook URL</Label><Input value={contact.social?.facebook ?? ""} onChange={(e) => setContact({ ...contact, social: { ...contact.social, facebook: e.target.value } })} /></div>
            <div><Label>YouTube URL</Label><Input value={contact.social?.youtube ?? ""} onChange={(e) => setContact({ ...contact, social: { ...contact.social, youtube: e.target.value } })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display uppercase">Store Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Store Name</Label><Input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} /></div>
            <div><Label>Currency</Label><Input value={store.currency} onChange={(e) => setStore({ ...store, currency: e.target.value })} /></div>
            <div><Label>Currency Symbol</Label><Input value={store.currency_symbol} onChange={(e) => setStore({ ...store, currency_symbol: e.target.value })} /></div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
