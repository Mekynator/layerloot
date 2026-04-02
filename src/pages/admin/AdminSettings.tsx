import { useEffect, useState } from "react";
import { Save, ChevronUp, ChevronDown, Eye, EyeOff, GripVertical, Package } from "lucide-react";
import type { AccountPageConfig } from "@/components/account/types";
import { DEFAULT_ACCOUNT_CONFIG } from "@/components/account/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { DEFAULT_SIDEBAR_CONFIG, SIDEBAR_ICON_MAP, type SidebarConfig } from "@/components/admin/AdminLayout";
import { DEFAULT_SHORTCUTS, ICON_MAP, type DashboardShortcut } from "@/pages/admin/Dashboard";
import { POLICY_KEYS } from "@/pages/Policies";

/* ─── Types ─── */
interface PromoConfig {
  enabled: boolean; title: string; message: string; button_text: string;
  button_link: string; image_url: string; dismiss_key: string;
}
interface FooterConfig {
  description: string; quick_links_title: string; account_title: string; contact_title: string;
  copyright_text: string; show_quick_links: boolean; show_account_links: boolean; show_contact_block: boolean;
  show_logo_icon: boolean; show_logo_text: boolean; logo_height_px: number;
  auth_link_label: string; account_link_label: string; orders_link_label: string;
}
interface FooterContactConfig {
  email: string; phone: string; address: string; contact_description: string;
  email_label: string; phone_label: string; address_label: string;
  instagram_url: string; facebook_url: string; social_title: string;
}
interface BrandingConfig {
  logo_text_left: string; logo_text_right: string; logo_image_url: string;
  logo_link: string; logo_alt: string;
}

const defaultPromo: PromoConfig = { enabled: false, title: "Welcome!", message: "Check out our latest 3D printed items.", button_text: "Shop Now", button_link: "/products", image_url: "", dismiss_key: "v1" };
const defaultFooter: FooterConfig = { description: "Premium 3D printing supplies and custom prints for makers, hobbyists, and professionals.", quick_links_title: "Quick Links", account_title: "Account", contact_title: "Contact", copyright_text: "All rights reserved.", show_quick_links: true, show_account_links: true, show_contact_block: true, show_logo_icon: true, show_logo_text: true, logo_height_px: 32, auth_link_label: "Login / Register", account_link_label: "My Account", orders_link_label: "Order History" };
const defaultFooterContact: FooterContactConfig = { email: "support@layerloot.lovable.app", phone: "+45 00 00 00 00", address: "Denmark", contact_description: "Questions, custom requests, or order help? Reach out anytime.", email_label: "Email", phone_label: "Phone", address_label: "Address", instagram_url: "", facebook_url: "", social_title: "Follow us" };
const defaultBranding: BrandingConfig = { logo_text_left: "Layer", logo_text_right: "Loot", logo_image_url: "", logo_link: "/", logo_alt: "LayerLoot" };

const AVAILABLE_ICONS = Object.keys({ ...ICON_MAP, ...SIDEBAR_ICON_MAP });

/* ─── Helper ─── */
const upsertSetting = async (key: string, value: any) => {
  const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
  if (existing) {
    await supabase.from("site_settings").update({ value: value as any }).eq("key", key);
  } else {
    await supabase.from("site_settings").insert({ key, value: value as any });
  }
};

/* ─── Main ─── */
const AdminSettings = () => {
  const { toast } = useToast();
  const [contact, setContact] = useState({ email: "", phone: "", address: "", social: { instagram: "", facebook: "", youtube: "" } });
  const [store, setStore] = useState({ name: "LayerLoot", currency: "DKK", currency_symbol: "kr" });
  const [promo, setPromo] = useState<PromoConfig>(defaultPromo);
  const [footer, setFooter] = useState<FooterConfig>(defaultFooter);
  const [footerContact, setFooterContact] = useState<FooterContactConfig>(defaultFooterContact);
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState<Record<string, { title: string; body: string }>>({});
  const [shortcuts, setShortcuts] = useState<DashboardShortcut[]>(DEFAULT_SHORTCUTS);
  const [sidebarConfig, setSidebarConfig] = useState<SidebarConfig>(DEFAULT_SIDEBAR_CONFIG);
  const [accountConfig, setAccountConfig] = useState<AccountPageConfig>(DEFAULT_ACCOUNT_CONFIG);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("site_settings").select("*");
      if (data) {
        const policyData: Record<string, { title: string; body: string }> = {};
        data.forEach((s: any) => {
          if (s.key === "contact") { setContact(prev => ({ ...prev, ...(s.value as any) })); setFooterContact(prev => ({ ...prev, ...(s.value as any) })); }
          if (s.key === "store") setStore(s.value as any);
          if (s.key === "promotion_popup") setPromo({ ...defaultPromo, ...(s.value as any) });
          if (s.key === "footer_settings") setFooter({ ...defaultFooter, ...(s.value as any) });
          if (s.key === "branding") setBranding({ ...defaultBranding, ...(s.value as any) });
          if (s.key === "admin_dashboard_shortcuts" && Array.isArray(s.value)) setShortcuts(s.value as unknown as DashboardShortcut[]);
          if (s.key === "admin_sidebar_config" && (s.value as any)?.groups) setSidebarConfig(s.value as unknown as SidebarConfig);
          if (s.key === "account_page_config" && s.value) setAccountConfig({ ...DEFAULT_ACCOUNT_CONFIG, ...(s.value as any) });
          if (s.key.startsWith("policy_") && s.value) policyData[s.key] = s.value as { title: string; body: string };
        });
        setPolicies(policyData);
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const mergedContact = {
      ...contact, email: footerContact.email, phone: footerContact.phone, address: footerContact.address,
      contact_description: footerContact.contact_description, email_label: footerContact.email_label,
      phone_label: footerContact.phone_label, address_label: footerContact.address_label,
      instagram_url: footerContact.instagram_url, facebook_url: footerContact.facebook_url,
      social_title: footerContact.social_title,
      social: { ...(contact as any).social, instagram: footerContact.instagram_url, facebook: footerContact.facebook_url },
    };
    const policyUpserts = Object.entries(policies).map(([key, val]) => upsertSetting(key, val));
    await Promise.all([
      upsertSetting("contact", mergedContact),
      upsertSetting("store", store),
      upsertSetting("promotion_popup", promo),
      upsertSetting("footer_settings", footer),
      upsertSetting("branding", branding),
      upsertSetting("admin_dashboard_shortcuts", shortcuts),
      upsertSetting("admin_sidebar_config", sidebarConfig),
      upsertSetting("account_page_config", accountConfig),
      ...policyUpserts,
    ]);
    setSaving(false);
    toast({ title: "Settings saved!" });
  };

  /* Shortcut helpers */
  const moveShortcut = (idx: number, dir: -1 | 1) => {
    const arr = [...shortcuts];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setShortcuts(arr);
  };

  const updateShortcut = (idx: number, field: keyof DashboardShortcut, value: any) => {
    const arr = [...shortcuts];
    arr[idx] = { ...arr[idx], [field]: value };
    setShortcuts(arr);
  };

  /* Sidebar helpers */
  const moveSidebarItem = (gi: number, ii: number, dir: -1 | 1) => {
    const groups = JSON.parse(JSON.stringify(sidebarConfig.groups));
    const items = groups[gi].items;
    const target = ii + dir;
    if (target < 0 || target >= items.length) return;
    [items[ii], items[target]] = [items[target], items[ii]];
    setSidebarConfig({ groups });
  };

  const updateSidebarItem = (gi: number, ii: number, field: string, value: any) => {
    const groups = JSON.parse(JSON.stringify(sidebarConfig.groups));
    groups[gi].items[ii][field] = value;
    setSidebarConfig({ groups });
  };

  const moveSidebarItemToGroup = (fromGi: number, ii: number, toGi: number) => {
    const groups = JSON.parse(JSON.stringify(sidebarConfig.groups));
    const [item] = groups[fromGi].items.splice(ii, 1);
    groups[toGi].items.push(item);
    setSidebarConfig({ groups });
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground">Store configuration, branding, dashboard & navigation</p>
        </div>
        <Button onClick={save} disabled={saving} size="sm" className="font-display text-xs uppercase tracking-wider">
          <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
        </TabsList>

        {/* ─── GENERAL ─── */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Email</Label><Input value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} /></div>
                <div><Label className="text-xs">Phone</Label><Input value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} /></div>
                <div><Label className="text-xs">Address</Label><Input value={contact.address} onChange={e => setContact({ ...contact, address: e.target.value })} /></div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Social Media</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Instagram URL</Label><Input value={contact.social?.instagram ?? ""} onChange={e => setContact({ ...contact, social: { ...contact.social, instagram: e.target.value } })} /></div>
                <div><Label className="text-xs">Facebook URL</Label><Input value={contact.social?.facebook ?? ""} onChange={e => setContact({ ...contact, social: { ...contact.social, facebook: e.target.value } })} /></div>
                <div><Label className="text-xs">YouTube URL</Label><Input value={contact.social?.youtube ?? ""} onChange={e => setContact({ ...contact, social: { ...contact.social, youtube: e.target.value } })} /></div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Store Settings</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Store Name</Label><Input value={store.name} onChange={e => setStore({ ...store, name: e.target.value })} /></div>
                <div><Label className="text-xs">Currency</Label><Input value={store.currency} onChange={e => setStore({ ...store, currency: e.target.value })} /></div>
                <div><Label className="text-xs">Currency Symbol</Label><Input value={store.currency_symbol} onChange={e => setStore({ ...store, currency_symbol: e.target.value })} /></div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Promotion Popup</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2"><Switch checked={promo.enabled} onCheckedChange={v => setPromo({ ...promo, enabled: v })} /><Label className="text-xs">Enable popup</Label></div>
                <div><Label className="text-xs">Title</Label><Input value={promo.title} onChange={e => setPromo({ ...promo, title: e.target.value })} /></div>
                <div><Label className="text-xs">Message</Label><Textarea value={promo.message} onChange={e => setPromo({ ...promo, message: e.target.value })} rows={2} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-xs">Button Text</Label><Input value={promo.button_text} onChange={e => setPromo({ ...promo, button_text: e.target.value })} /></div>
                  <div><Label className="text-xs">Button Link</Label><Input value={promo.button_link} onChange={e => setPromo({ ...promo, button_link: e.target.value })} /></div>
                </div>
                <div><Label className="text-xs">Image URL</Label><Input value={promo.image_url} onChange={e => setPromo({ ...promo, image_url: e.target.value })} /></div>
                <div><Label className="text-xs">Dismiss Key</Label><Input value={promo.dismiss_key} onChange={e => setPromo({ ...promo, dismiss_key: e.target.value })} /></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── POLICIES ─── */}
        <TabsContent value="policies" className="space-y-6">
          <p className="text-sm text-muted-foreground">Edit your store policies below. Content supports Markdown formatting.</p>
          <div className="grid gap-4">
            {POLICY_KEYS.map(policy => {
              const current = policies[policy.settingKey] || { title: policy.title, body: "" };
              return (
                <Card key={policy.settingKey}>
                  <CardHeader><CardTitle className="font-display text-sm uppercase">{policy.title}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div><Label className="text-xs">Page Title</Label>
                      <Input value={current.title} onChange={e => setPolicies(prev => ({ ...prev, [policy.settingKey]: { ...current, title: e.target.value } }))} />
                    </div>
                    <div><Label className="text-xs">Content (Markdown)</Label>
                      <Textarea value={current.body} onChange={e => setPolicies(prev => ({ ...prev, [policy.settingKey]: { ...current, body: e.target.value } }))} rows={10} className="font-mono text-xs" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Live at: <span className="font-mono text-primary">/policies/{policy.slug}</span></p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── DASHBOARD SHORTCUTS ─── */}
        <TabsContent value="dashboard" className="space-y-6">
          <p className="text-sm text-muted-foreground">Manage shortcuts shown on the admin dashboard. Reorder, rename, change icons, or hide them.</p>
          <div className="space-y-2">
            {shortcuts.map((sc, idx) => {
              const Icon = ICON_MAP[sc.icon] || SIDEBAR_ICON_MAP[sc.icon] || Package;
              return (
                <Card key={sc.id} className={`transition-opacity ${!sc.visible ? "opacity-50" : ""}`}>
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <Input value={sc.label} onChange={e => updateShortcut(idx, "label", e.target.value)} className="h-8 max-w-[160px] text-sm" />
                    <Select value={sc.icon} onValueChange={v => updateShortcut(idx, "icon", v)}>
                      <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{AVAILABLE_ICONS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input value={sc.to} onChange={e => updateShortcut(idx, "to", e.target.value)} className="h-8 max-w-[160px] text-xs font-mono" />
                    <div className="ml-auto flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveShortcut(idx, -1)} disabled={idx === 0}><ChevronUp className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveShortcut(idx, 1)} disabled={idx === shortcuts.length - 1}><ChevronDown className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateShortcut(idx, "visible", !sc.visible)}>
                        {sc.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShortcuts([...shortcuts, { id: `custom-${Date.now()}`, label: "New Shortcut", icon: "Package", to: "/admin", visible: true }])}>
            + Add Shortcut
          </Button>
        </TabsContent>

        {/* ─── NAVIGATION (sidebar editor) ─── */}
        <TabsContent value="navigation" className="space-y-6">
          <p className="text-sm text-muted-foreground">Manage the left admin sidebar. Reorder, rename, hide, or move items between groups.</p>
          {sidebarConfig.groups.map((group, gi) => (
            <div key={group.name}>
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{group.name}</h3>
              <div className="space-y-2">
                {group.items.map((item, ii) => {
                  const Icon = SIDEBAR_ICON_MAP[item.icon] || ICON_MAP[item.icon] || Package;
                  return (
                    <Card key={item.id} className={`transition-opacity ${!item.visible ? "opacity-50" : ""}`}>
                      <CardContent className="flex items-center gap-3 py-3 px-4">
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <Input value={item.label} onChange={e => updateSidebarItem(gi, ii, "label", e.target.value)} className="h-8 max-w-[160px] text-sm" />
                        <Select value={item.icon} onValueChange={v => updateSidebarItem(gi, ii, "icon", v)}>
                          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{AVAILABLE_ICONS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={String(gi)} onValueChange={v => moveSidebarItemToGroup(gi, ii, Number(v))}>
                          <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{sidebarConfig.groups.map((g, i) => <SelectItem key={i} value={String(i)}>{g.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <div className="ml-auto flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSidebarItem(gi, ii, -1)} disabled={ii === 0}><ChevronUp className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSidebarItem(gi, ii, 1)} disabled={ii === group.items.length - 1}><ChevronDown className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateSidebarItem(gi, ii, "visible", !item.visible)}>
                            {item.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminSettings;
