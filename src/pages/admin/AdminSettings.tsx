import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { POLICY_KEYS } from "@/pages/Policies";

interface PromoConfig {
  enabled: boolean;
  title: string;
  message: string;
  button_text: string;
  button_link: string;
  image_url: string;
  dismiss_key: string;
}

interface FooterConfig {
  description: string;
  quick_links_title: string;
  account_title: string;
  contact_title: string;
  copyright_text: string;
  show_quick_links: boolean;
  show_account_links: boolean;
  show_contact_block: boolean;
  show_logo_icon: boolean;
  show_logo_text: boolean;
  logo_height_px: number;
  auth_link_label: string;
  account_link_label: string;
  orders_link_label: string;
}

interface FooterContactConfig {
  email: string;
  phone: string;
  address: string;
  contact_description: string;
  email_label: string;
  phone_label: string;
  address_label: string;
  instagram_url: string;
  facebook_url: string;
  social_title: string;
}

interface BrandingConfig {
  logo_text_left: string;
  logo_text_right: string;
  logo_image_url: string;
  logo_link: string;
  logo_alt: string;
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

const defaultFooter: FooterConfig = {
  description: "Premium 3D printing supplies and custom prints for makers, hobbyists, and professionals.",
  quick_links_title: "Quick Links",
  account_title: "Account",
  contact_title: "Contact",
  copyright_text: "All rights reserved.",
  show_quick_links: true,
  show_account_links: true,
  show_contact_block: true,
  show_logo_icon: true,
  show_logo_text: true,
  logo_height_px: 32,
  auth_link_label: "Login / Register",
  account_link_label: "My Account",
  orders_link_label: "Order History",
};

const defaultFooterContact: FooterContactConfig = {
  email: "support@layerloot.lovable.app",
  phone: "+45 00 00 00 00",
  address: "Denmark",
  contact_description: "Questions, custom requests, or order help? Reach out anytime.",
  email_label: "Email",
  phone_label: "Phone",
  address_label: "Address",
  instagram_url: "",
  facebook_url: "",
  social_title: "Follow us",
};

const defaultBranding: BrandingConfig = {
  logo_text_left: "Layer",
  logo_text_right: "Loot",
  logo_image_url: "",
  logo_link: "/",
  logo_alt: "LayerLoot",
};

const FooterPreview = ({
  branding,
  footer,
  footerContact,
}: {
  branding: BrandingConfig;
  footer: FooterConfig;
  footerContact: FooterContactConfig;
}) => (
  <div className="overflow-hidden rounded-xl bg-secondary/60">
    <div className="grid gap-6 p-5 md:grid-cols-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {footer.show_logo_icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">✦</div>
          )}
          {footer.show_logo_text && (
            <div className="font-display text-lg font-bold uppercase tracking-wider text-secondary-foreground">
              {branding.logo_text_left || "Layer"}
              <span className="text-primary">{branding.logo_text_right || "Loot"}</span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{footer.description}</p>
      </div>
      {footer.show_quick_links && (
        <div>
          <p className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">{footer.quick_links_title}</p>
          <div className="space-y-2 text-sm text-muted-foreground"><p>Products</p><p>Gallery</p><p>Create Your Own</p></div>
        </div>
      )}
      {footer.show_account_links && (
        <div>
          <p className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">{footer.account_title}</p>
          <div className="space-y-2 text-sm text-muted-foreground"><p>{footer.auth_link_label}</p><p>{footer.account_link_label}</p><p>{footer.orders_link_label}</p></div>
        </div>
      )}
      {footer.show_contact_block && (
        <div>
          <p className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-secondary-foreground">{footer.contact_title}</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{footerContact.contact_description}</p>
            <p>{footerContact.email_label}: {footerContact.email}</p>
            <p>{footerContact.phone_label}: {footerContact.phone}</p>
            <p>{footerContact.address_label}: {footerContact.address}</p>
          </div>
        </div>
      )}
    </div>
    <div className="border-t border-border/30 px-5 py-3 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} {branding.logo_text_left || "Layer"}{branding.logo_text_right || "Loot"}. {footer.copyright_text}
    </div>
  </div>
);

const AdminSettings = () => {
  const { toast } = useToast();
  const [contact, setContact] = useState({
    email: "",
    phone: "",
    address: "",
    social: { instagram: "", facebook: "", youtube: "" },
  });
  const [store, setStore] = useState({ name: "LayerLoot", currency: "DKK", currency_symbol: "kr" });
  const [promo, setPromo] = useState<PromoConfig>(defaultPromo);
  const [footer, setFooter] = useState<FooterConfig>(defaultFooter);
  const [footerContact, setFooterContact] = useState<FooterContactConfig>(defaultFooterContact);
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("site_settings").select("*");
      if (data) {
        data.forEach((s: any) => {
          if (s.key === "contact") {
            setContact((prev) => ({ ...prev, ...(s.value as any) }));
            setFooterContact((prev) => ({ ...prev, ...(s.value as any) }));
          }
          if (s.key === "store") setStore(s.value as any);
          if (s.key === "promotion_popup") setPromo({ ...defaultPromo, ...(s.value as any) });
          if (s.key === "footer_settings") setFooter({ ...defaultFooter, ...(s.value as any) });
          if (s.key === "branding") setBranding({ ...defaultBranding, ...(s.value as any) });
        });
      }
    };
    load();
  }, []);

  const upsertSetting = async (key: string, value: any) => {
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
    if (existing) {
      await supabase.from("site_settings").update({ value: value as any }).eq("key", key);
    } else {
      await supabase.from("site_settings").insert({ key, value: value as any });
    }
  };

  const save = async () => {
    setSaving(true);
    const mergedContact = {
      ...contact,
      email: footerContact.email,
      phone: footerContact.phone,
      address: footerContact.address,
      contact_description: footerContact.contact_description,
      email_label: footerContact.email_label,
      phone_label: footerContact.phone_label,
      address_label: footerContact.address_label,
      instagram_url: footerContact.instagram_url,
      facebook_url: footerContact.facebook_url,
      social_title: footerContact.social_title,
      social: {
        ...(contact as any).social,
        instagram: footerContact.instagram_url,
        facebook: footerContact.facebook_url,
      },
    };
    await Promise.all([
      upsertSetting("contact", mergedContact),
      upsertSetting("store", store),
      upsertSetting("promotion_popup", promo),
      upsertSetting("footer_settings", footer),
      upsertSetting("branding", branding),
    ]);
    setSaving(false);
    toast({ title: "Settings saved!" });
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground">Store configuration, branding, and footer</p>
        </div>
        <Button onClick={save} disabled={saving} size="sm" className="font-display text-xs uppercase tracking-wider">
          <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Email</Label><Input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></div>
                <div><Label className="text-xs">Phone</Label><Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></div>
                <div><Label className="text-xs">Address</Label><Input value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Social Media</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Instagram URL</Label><Input value={contact.social?.instagram ?? ""} onChange={(e) => setContact({ ...contact, social: { ...contact.social, instagram: e.target.value } })} /></div>
                <div><Label className="text-xs">Facebook URL</Label><Input value={contact.social?.facebook ?? ""} onChange={(e) => setContact({ ...contact, social: { ...contact.social, facebook: e.target.value } })} /></div>
                <div><Label className="text-xs">YouTube URL</Label><Input value={contact.social?.youtube ?? ""} onChange={(e) => setContact({ ...contact, social: { ...contact.social, youtube: e.target.value } })} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Store Settings</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Store Name</Label><Input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} /></div>
                <div><Label className="text-xs">Currency</Label><Input value={store.currency} onChange={(e) => setStore({ ...store, currency: e.target.value })} /></div>
                <div><Label className="text-xs">Currency Symbol</Label><Input value={store.currency_symbol} onChange={(e) => setStore({ ...store, currency_symbol: e.target.value })} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Promotion Popup</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2"><Switch checked={promo.enabled} onCheckedChange={(v) => setPromo({ ...promo, enabled: v })} /><Label className="text-xs">Enable popup</Label></div>
                <div><Label className="text-xs">Title</Label><Input value={promo.title} onChange={(e) => setPromo({ ...promo, title: e.target.value })} /></div>
                <div><Label className="text-xs">Message</Label><Textarea value={promo.message} onChange={(e) => setPromo({ ...promo, message: e.target.value })} rows={2} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-xs">Button Text</Label><Input value={promo.button_text} onChange={(e) => setPromo({ ...promo, button_text: e.target.value })} /></div>
                  <div><Label className="text-xs">Button Link</Label><Input value={promo.button_link} onChange={(e) => setPromo({ ...promo, button_link: e.target.value })} /></div>
                </div>
                <div><Label className="text-xs">Image URL</Label><Input value={promo.image_url} onChange={(e) => setPromo({ ...promo, image_url: e.target.value })} /></div>
                <div><Label className="text-xs">Dismiss Key</Label><Input value={promo.dismiss_key} onChange={(e) => setPromo({ ...promo, dismiss_key: e.target.value })} /></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="footer" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="font-display text-sm uppercase">Footer Preview</CardTitle></CardHeader>
            <CardContent>
              <FooterPreview branding={branding} footer={footer} footerContact={footerContact} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Footer Content</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Description</Label><Textarea value={footer.description} onChange={(e) => setFooter({ ...footer, description: e.target.value })} rows={2} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-xs">Quick Links Title</Label><Input value={footer.quick_links_title} onChange={(e) => setFooter({ ...footer, quick_links_title: e.target.value })} /></div>
                  <div><Label className="text-xs">Account Title</Label><Input value={footer.account_title} onChange={(e) => setFooter({ ...footer, account_title: e.target.value })} /></div>
                </div>
                <div><Label className="text-xs">Contact Title</Label><Input value={footer.contact_title} onChange={(e) => setFooter({ ...footer, contact_title: e.target.value })} /></div>
                <div><Label className="text-xs">Copyright Text</Label><Input value={footer.copyright_text} onChange={(e) => setFooter({ ...footer, copyright_text: e.target.value })} /></div>
                <div><Label className="text-xs">Logo Height (px)</Label><Input type="number" value={footer.logo_height_px} onChange={(e) => setFooter({ ...footer, logo_height_px: parseInt(e.target.value, 10) || 32 })} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Logo & Branding</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-xs">Logo Text Left</Label><Input value={branding.logo_text_left} onChange={(e) => setBranding({ ...branding, logo_text_left: e.target.value })} /></div>
                  <div><Label className="text-xs">Logo Text Right</Label><Input value={branding.logo_text_right} onChange={(e) => setBranding({ ...branding, logo_text_right: e.target.value })} /></div>
                </div>
                <div><Label className="text-xs">Logo Image URL</Label><Input value={branding.logo_image_url} onChange={(e) => setBranding({ ...branding, logo_image_url: e.target.value })} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-xs">Logo Link</Label><Input value={branding.logo_link} onChange={(e) => setBranding({ ...branding, logo_link: e.target.value })} /></div>
                  <div><Label className="text-xs">Logo Alt</Label><Input value={branding.logo_alt} onChange={(e) => setBranding({ ...branding, logo_alt: e.target.value })} /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Footer Links</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Login / Register Label</Label><Input value={footer.auth_link_label} onChange={(e) => setFooter({ ...footer, auth_link_label: e.target.value })} /></div>
                <div><Label className="text-xs">My Account Label</Label><Input value={footer.account_link_label} onChange={(e) => setFooter({ ...footer, account_link_label: e.target.value })} /></div>
                <div><Label className="text-xs">Order History Label</Label><Input value={footer.orders_link_label} onChange={(e) => setFooter({ ...footer, orders_link_label: e.target.value })} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Contact Block</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Contact Description</Label><Textarea value={footerContact.contact_description} onChange={(e) => setFooterContact({ ...footerContact, contact_description: e.target.value })} rows={2} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-xs">Email Label</Label><Input value={footerContact.email_label} onChange={(e) => setFooterContact({ ...footerContact, email_label: e.target.value })} /></div>
                  <div><Label className="text-xs">Email</Label><Input value={footerContact.email} onChange={(e) => setFooterContact({ ...footerContact, email: e.target.value })} /></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-xs">Phone Label</Label><Input value={footerContact.phone_label} onChange={(e) => setFooterContact({ ...footerContact, phone_label: e.target.value })} /></div>
                  <div><Label className="text-xs">Phone</Label><Input value={footerContact.phone} onChange={(e) => setFooterContact({ ...footerContact, phone: e.target.value })} /></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-xs">Address Label</Label><Input value={footerContact.address_label} onChange={(e) => setFooterContact({ ...footerContact, address_label: e.target.value })} /></div>
                  <div><Label className="text-xs">Address</Label><Input value={footerContact.address} onChange={(e) => setFooterContact({ ...footerContact, address: e.target.value })} /></div>
                </div>
                <div><Label className="text-xs">Social Title</Label><Input value={footerContact.social_title} onChange={(e) => setFooterContact({ ...footerContact, social_title: e.target.value })} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-xs">Instagram URL</Label><Input value={footerContact.instagram_url} onChange={(e) => setFooterContact({ ...footerContact, instagram_url: e.target.value })} /></div>
                  <div><Label className="text-xs">Facebook URL</Label><Input value={footerContact.facebook_url} onChange={(e) => setFooterContact({ ...footerContact, facebook_url: e.target.value })} /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Section Visibility</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2"><Switch checked={footer.show_logo_icon} onCheckedChange={(v) => setFooter({ ...footer, show_logo_icon: v })} /><Label className="text-xs">Show Logo Icon</Label></div>
                <div className="flex items-center gap-2"><Switch checked={footer.show_logo_text} onCheckedChange={(v) => setFooter({ ...footer, show_logo_text: v })} /><Label className="text-xs">Show Logo Text</Label></div>
                <div className="flex items-center gap-2"><Switch checked={footer.show_quick_links} onCheckedChange={(v) => setFooter({ ...footer, show_quick_links: v })} /><Label className="text-xs">Show Quick Links</Label></div>
                <div className="flex items-center gap-2"><Switch checked={footer.show_account_links} onCheckedChange={(v) => setFooter({ ...footer, show_account_links: v })} /><Label className="text-xs">Show Account Links</Label></div>
                <div className="flex items-center gap-2"><Switch checked={footer.show_contact_block} onCheckedChange={(v) => setFooter({ ...footer, show_contact_block: v })} /><Label className="text-xs">Show Contact Block</Label></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminSettings;
