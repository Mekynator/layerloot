import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface PromoConfig {
  enabled: boolean;
  title: string;
  message: string;
  button_text: string;
  button_link: string;
  image_url: string;
  dismiss_key: string;
}

const defaultPromo: PromoConfig = {
  enabled: false,
  title: "Welcome!",
  message: "Check out our latest 3D printed items.",
  button_text: "Shop Now",
  button_link: "/products",
  image_url: "",
  dismiss_key: "v1",
};

const AdminSettings = () => {
  const { toast } = useToast();
  const [contact, setContact] = useState({ email: "", phone: "", address: "", social: { instagram: "", facebook: "", youtube: "" } });
  const [store, setStore] = useState({ name: "LayerLoot", currency: "DKK", currency_symbol: "kr" });
  const [promo, setPromo] = useState<PromoConfig>(defaultPromo);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("site_settings").select("*");
      if (data) {
        data.forEach((s: any) => {
          if (s.key === "contact") setContact(s.value as any);
          if (s.key === "store") setStore(s.value as any);
          if (s.key === "promotion_popup") setPromo({ ...defaultPromo, ...(s.value as any) });
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

    // Upsert promotion popup
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "promotion_popup").maybeSingle();
    if (existing) {
      await supabase.from("site_settings").update({ value: promo as any }).eq("key", "promotion_popup");
    } else {
      await supabase.from("site_settings").insert({ key: "promotion_popup", value: promo as any });
    }

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

        <Card>
          <CardHeader><CardTitle className="font-display uppercase">Promotion Popup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch checked={promo.enabled} onCheckedChange={(v) => setPromo({ ...promo, enabled: v })} />
              <Label>Enable promotion popup</Label>
            </div>
            <div><Label>Title</Label><Input value={promo.title} onChange={(e) => setPromo({ ...promo, title: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea value={promo.message} onChange={(e) => setPromo({ ...promo, message: e.target.value })} rows={3} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Button Text</Label><Input value={promo.button_text} onChange={(e) => setPromo({ ...promo, button_text: e.target.value })} /></div>
              <div><Label>Button Link</Label><Input value={promo.button_link} onChange={(e) => setPromo({ ...promo, button_link: e.target.value })} placeholder="/products" /></div>
            </div>
            <div><Label>Image URL (optional)</Label><Input value={promo.image_url} onChange={(e) => setPromo({ ...promo, image_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Dismiss Key (change to re-show popup to users)</Label><Input value={promo.dismiss_key} onChange={(e) => setPromo({ ...promo, dismiss_key: e.target.value })} /></div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
