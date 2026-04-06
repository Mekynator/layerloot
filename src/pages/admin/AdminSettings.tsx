import { useEffect, useState, lazy, Suspense } from "react";
import { Save, ChevronUp, ChevronDown, Eye, EyeOff, GripVertical, Package, Plus, Trash2 } from "lucide-react";
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
import { useDraftSettings } from "@/hooks/use-draft-settings";
import DraftActionBar from "@/components/admin/DraftActionBar";
import { useAuth } from "@/contexts/AuthContext";
import AdminEmailManager from "@/components/admin/email/AdminEmailManager";
import { Slider } from "@/components/ui/slider";
import { parsePersonalizationWeights, type PersonalizationWeights } from "@/hooks/use-personalization-engine";

/* ─── Personalization Settings Component ─── */
const PersonalizationSettings = () => {
  const { toast } = useToast();
  const [weights, setWeights] = useState<PersonalizationWeights>({ behavior: 1, preference: 1, popularity: 1, recency: 1, adminBoostIds: [], enabled: true });
  const [boostInput, setBoostInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "personalization_weights").maybeSingle();
      if (data?.value) {
        const parsed = parsePersonalizationWeights(data.value);
        setWeights(parsed);
        setBoostInput(parsed.adminBoostIds.join(", "));
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const toSave = { ...weights, adminBoostIds: boostInput.split(",").map((s) => s.trim()).filter(Boolean) };
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "personalization_weights").maybeSingle();
    if (existing) {
      await supabase.from("site_settings").update({ value: toSave as any }).eq("key", "personalization_weights");
    } else {
      await supabase.from("site_settings").insert({ key: "personalization_weights", value: toSave as any });
    }
    setSaving(false);
    toast({ title: "Personalization settings saved" });
  };

  const sliders: { key: keyof Pick<PersonalizationWeights, "behavior" | "preference" | "popularity" | "recency">; label: string; desc: string }[] = [
    { key: "behavior", label: "Behavior Weight", desc: "How much browsing history affects recommendations" },
    { key: "preference", label: "Preference Weight", desc: "How much saved preferences affect recommendations" },
    { key: "popularity", label: "Popularity Weight", desc: "How much ratings and featured status affect ranking" },
    { key: "recency", label: "Recency Weight", desc: "How much new arrivals are boosted" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Control how the AI personalization engine ranks products across the site.</p>
        <Button onClick={save} disabled={saving} size="sm" className="font-display text-xs uppercase tracking-wider">
          <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display text-sm uppercase">Engine Settings</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <Switch checked={weights.enabled} onCheckedChange={(v) => setWeights((p) => ({ ...p, enabled: v }))} />
            <Label className="text-xs">Enable personalization globally</Label>
          </div>
          {sliders.map((s) => (
            <div key={s.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">{s.label}</Label>
                <span className="text-xs text-muted-foreground">{weights[s.key].toFixed(1)}×</span>
              </div>
              <Slider min={0} max={3} step={0.1} value={[weights[s.key]]} onValueChange={([v]) => setWeights((p) => ({ ...p, [s.key]: v }))} />
              <p className="text-[10px] text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-sm uppercase">Admin Boost Products</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[10px] text-muted-foreground">Enter product IDs (comma-separated) to boost in all recommendation sections.</p>
          <Input value={boostInput} onChange={(e) => setBoostInput(e.target.value)} placeholder="product-id-1, product-id-2" className="font-mono text-xs" />
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── Types ─── */
interface ContactConfig {
  email: string;
  phone: string;
  address: string;
  contact_description: string;
  email_label: string;
  phone_label: string;
  address_label: string;
  social_title: string;
  social: { instagram: string; facebook: string; youtube: string };
}

interface PromoConfig {
  enabled: boolean; title: string; message: string; button_text: string;
  button_link: string; image_url: string; dismiss_key: string;
}

interface FooterConfig {
  description: string; quick_links_title: string; account_title: string; contact_title: string;
  policies_title: string; copyright_text: string;
  show_quick_links: boolean; show_account_links: boolean; show_contact_block: boolean; show_policies: boolean;
  show_logo_icon: boolean; show_logo_text: boolean; logo_height_px: number;
  footer_height_px: number;
  auth_link_label: string; account_link_label: string; orders_link_label: string;
  policy_links: Array<{ label: string; path: string }>;
  contact_description: string; contact_email_label: string; contact_email: string;
  contact_phone_label: string; contact_phone: string;
  contact_address_label: string; contact_address: string;
  contact_social_title: string;
  contact_social_instagram: string; contact_social_facebook: string; contact_social_youtube: string;
}

interface HeaderConfig {
  show_logo_icon: boolean; show_logo_text: boolean;
  show_cart_icon: boolean; show_account_icon: boolean; show_admin_icon: boolean;
  show_mobile_menu: boolean; desktop_nav_enabled: boolean; mobile_nav_enabled: boolean;
  logo_height_px: number; logo_text_class: string;
  account_label: string; auth_label: string; admin_label: string; sign_out_label: string;
  mobile_account_label: string; mobile_admin_label: string;
}

interface BrandingConfig {
  logo_text_left: string; logo_text_right: string; logo_image_url: string;
  logo_link: string; logo_alt: string;
}

const defaultContact: ContactConfig = {
  email: "support@layerloot.lovable.app", phone: "+45 00 00 00 00", address: "Denmark",
  contact_description: "Questions, custom requests, or order help? Reach out anytime.",
  email_label: "Email", phone_label: "Phone", address_label: "Address", social_title: "Follow us",
  social: { instagram: "", facebook: "", youtube: "" },
};

const defaultPromo: PromoConfig = { enabled: false, title: "Welcome!", message: "Check out our latest 3D printed items.", button_text: "Shop Now", button_link: "/products", image_url: "", dismiss_key: "v1" };

const defaultFooter: FooterConfig = {
  description: "Premium 3D printing supplies and custom prints for makers, hobbyists, and professionals.",
  quick_links_title: "Quick Links", account_title: "Account", contact_title: "Contact",
  policies_title: "Policies", copyright_text: "All rights reserved.",
  show_quick_links: true, show_account_links: true, show_contact_block: true, show_policies: true,
  show_logo_icon: true, show_logo_text: true, logo_height_px: 32,
  footer_height_px: 0,
  auth_link_label: "Login / Register", account_link_label: "My Account", orders_link_label: "Order History",
  contact_description: "", contact_email_label: "Email", contact_email: "",
  contact_phone_label: "Phone", contact_phone: "",
  contact_address_label: "Address", contact_address: "",
  contact_social_title: "Follow us",
  contact_social_instagram: "", contact_social_facebook: "", contact_social_youtube: "",
  policy_links: [
    { label: "Returns Policy", path: "/policies/returns-policy" },
    { label: "Cancellation Policy", path: "/policies/cancellation-policy" },
    { label: "Refund Policy", path: "/policies/refund-policy" },
    { label: "Privacy Policy", path: "/policies/privacy-policy" },
    { label: "Terms of Service", path: "/policies/terms-of-service" },
    { label: "Safety Regulations", path: "/policies/safety-regulations" },
    { label: "Intellectual Property", path: "/policies/intellectual-property" },
    { label: "Shipping Policy", path: "/policies/shipping-policy" },
  ],
};

const defaultHeader: HeaderConfig = {
  show_logo_icon: true, show_logo_text: true,
  show_cart_icon: true, show_account_icon: true, show_admin_icon: true,
  show_mobile_menu: true, desktop_nav_enabled: true, mobile_nav_enabled: true,
  logo_height_px: 36, logo_text_class: "font-display text-2xl font-bold uppercase tracking-wider text-foreground",
  account_label: "My Account", auth_label: "Login / Register", admin_label: "Admin Dashboard",
  sign_out_label: "Sign Out", mobile_account_label: "My Account", mobile_admin_label: "Admin",
};

const defaultBranding: BrandingConfig = { logo_text_left: "Layer", logo_text_right: "Loot", logo_image_url: "", logo_link: "/", logo_alt: "LayerLoot" };

const AVAILABLE_ICONS = Object.keys({ ...ICON_MAP, ...SIDEBAR_ICON_MAP });

/* ─── Admin-only direct save helper ─── */
const upsertSetting = async (key: string, value: any) => {
  const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
  if (existing) {
    await supabase.from("site_settings").update({ value: value as any }).eq("key", key);
  } else {
    await supabase.from("site_settings").insert({ key, value: value as any });
  }
};

/* ─── Helpers ─── */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/60 mb-2 mt-4 first:mt-0">{children}</p>
);

/* ─── Main ─── */
const AdminSettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = user?.id;

  /* Draft-managed storefront settings */
  const contactDraft = useDraftSettings<ContactConfig>("contact", defaultContact);
  const storeDraft = useDraftSettings("store", { name: "LayerLoot", currency: "DKK", currency_symbol: "kr" });
  const promoDraft = useDraftSettings<PromoConfig>("promotion_popup", defaultPromo);
  const footerDraft = useDraftSettings<FooterConfig>("footer_settings", defaultFooter);
  const headerDraft = useDraftSettings<HeaderConfig>("header_settings", defaultHeader);
  const brandingDraft = useDraftSettings<BrandingConfig>("branding", defaultBranding);
  const accountDraft = useDraftSettings<AccountPageConfig>("account_page_config", DEFAULT_ACCOUNT_CONFIG);

  /* Policy drafts */
  const policyDrafts = POLICY_KEYS.map(p => useDraftSettings<{ title: string; body: string }>(p.settingKey, { title: p.title, body: "" }));

  /* Admin-only settings (direct save, not draft) */
  const [shortcuts, setShortcuts] = useState<DashboardShortcut[]>(DEFAULT_SHORTCUTS);
  const [sidebarConfig, setSidebarConfig] = useState<SidebarConfig>(DEFAULT_SIDEBAR_CONFIG);
  const [adminSaving, setAdminSaving] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftPublishing, setDraftPublishing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ["admin_dashboard_shortcuts", "admin_sidebar_config"]);
      data?.forEach((s: any) => {
        if (s.key === "admin_dashboard_shortcuts" && Array.isArray(s.value)) setShortcuts(s.value as unknown as DashboardShortcut[]);
        if (s.key === "admin_sidebar_config" && (s.value as any)?.groups) setSidebarConfig(s.value as unknown as SidebarConfig);
      });
    };
    load();
  }, []);

  /* Combined draft status */
  const allDrafts = [contactDraft, storeDraft, promoDraft, footerDraft, headerDraft, brandingDraft, accountDraft, ...policyDrafts];
  const anyDirty = allDrafts.some(d => d.dirty);
  const anyHasDraft = allDrafts.some(d => d.hasDraft);
  const combinedStatus = anyDirty ? "draft" as const : anyHasDraft ? "draft" as const : "published" as const;

  const saveAllDrafts = async () => {
    setDraftSaving(true);
    await Promise.all(allDrafts.map(d => d.saveDraft(userId)));
    setDraftSaving(false);
    toast({ title: "Drafts saved" });
  };

  const publishAll = async () => {
    setDraftPublishing(true);
    await Promise.all(allDrafts.map(d => d.publish(userId)));
    setDraftPublishing(false);
    toast({ title: "All storefront settings published!" });
  };

  const discardAll = async () => {
    await Promise.all(allDrafts.map(d => d.discard()));
    toast({ title: "Drafts discarded" });
  };

  const saveAdminSettings = async () => {
    setAdminSaving(true);
    await Promise.all([
      upsertSetting("admin_dashboard_shortcuts", shortcuts),
      upsertSetting("admin_sidebar_config", sidebarConfig),
    ]);
    setAdminSaving(false);
    toast({ title: "Admin settings saved!" });
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
    const arr = [...shortcuts]; arr[idx] = { ...arr[idx], [field]: value }; setShortcuts(arr);
  };

  /* Sidebar helpers */
  const moveSidebarItem = (gi: number, ii: number, dir: -1 | 1) => {
    const groups = JSON.parse(JSON.stringify(sidebarConfig.groups));
    const items = groups[gi].items; const target = ii + dir;
    if (target < 0 || target >= items.length) return;
    [items[ii], items[target]] = [items[target], items[ii]];
    setSidebarConfig({ groups });
  };
  const updateSidebarItem = (gi: number, ii: number, field: string, value: any) => {
    const groups = JSON.parse(JSON.stringify(sidebarConfig.groups));
    groups[gi].items[ii][field] = value; setSidebarConfig({ groups });
  };
  const moveSidebarItemToGroup = (fromGi: number, ii: number, toGi: number) => {
    const groups = JSON.parse(JSON.stringify(sidebarConfig.groups));
    const [item] = groups[fromGi].items.splice(ii, 1);
    groups[toGi].items.push(item); setSidebarConfig({ groups });
  };

  /* Policy link helpers */
  const addPolicyLink = () => {
    footerDraft.setValue(prev => ({
      ...prev,
      policy_links: [...(prev.policy_links ?? []), { label: "New Policy", path: "/policies/new" }],
    }));
  };
  const removePolicyLink = (idx: number) => {
    footerDraft.setValue(prev => ({
      ...prev,
      policy_links: (prev.policy_links ?? []).filter((_, i) => i !== idx),
    }));
  };
  const updatePolicyLink = (idx: number, field: "label" | "path", value: string) => {
    footerDraft.setValue(prev => {
      const links = [...(prev.policy_links ?? [])];
      links[idx] = { ...links[idx], [field]: value };
      return { ...prev, policy_links: links };
    });
  };
  const movePolicyLink = (idx: number, dir: -1 | 1) => {
    footerDraft.setValue(prev => {
      const links = [...(prev.policy_links ?? [])];
      const target = idx + dir;
      if (target < 0 || target >= links.length) return prev;
      [links[idx], links[target]] = [links[target], links[idx]];
      return { ...prev, policy_links: links };
    });
  };

  const loading = allDrafts.some(d => d.loading);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12 text-muted-foreground">Loading settings...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold uppercase text-foreground">Settings</h1>
            <p className="text-xs text-muted-foreground">Store configuration, branding, layout & navigation — all connected to the live website</p>
          </div>
        </div>
        <DraftActionBar
          status={combinedStatus}
          dirty={anyDirty}
          saving={draftSaving}
          publishing={draftPublishing}
          onSaveDraft={saveAllDrafts}
          onPublish={publishAll}
          onDiscard={discardAll}
        />
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="header">Header</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="store">Store & Contact</TabsTrigger>
          <TabsTrigger value="promo">Promotion</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="account">Account Page</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="personalization">Personalization</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
        </TabsList>

        {/* ─── BRANDING ─── */}
        <TabsContent value="branding" className="space-y-6">
          <p className="text-sm text-muted-foreground">Controls the logo and brand identity across Header, Footer, and all pages.</p>
          <Card>
            <CardHeader><CardTitle className="font-display text-sm uppercase">Logo & Brand</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label className="text-xs">Logo Text (Left)</Label><Input value={brandingDraft.value.logo_text_left} onChange={e => brandingDraft.setValue(prev => ({ ...prev, logo_text_left: e.target.value }))} placeholder="Layer" /></div>
                <div><Label className="text-xs">Logo Text (Right / Accent)</Label><Input value={brandingDraft.value.logo_text_right} onChange={e => brandingDraft.setValue(prev => ({ ...prev, logo_text_right: e.target.value }))} placeholder="Loot" /></div>
              </div>
              <div><Label className="text-xs">Custom Logo Image URL</Label><Input value={brandingDraft.value.logo_image_url} onChange={e => brandingDraft.setValue(prev => ({ ...prev, logo_image_url: e.target.value }))} placeholder="https://... (overrides text logo)" /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label className="text-xs">Logo Link</Label><Input value={brandingDraft.value.logo_link} onChange={e => brandingDraft.setValue(prev => ({ ...prev, logo_link: e.target.value }))} placeholder="/" /></div>
                <div><Label className="text-xs">Logo Alt Text</Label><Input value={brandingDraft.value.logo_alt} onChange={e => brandingDraft.setValue(prev => ({ ...prev, logo_alt: e.target.value }))} placeholder="LayerLoot" /></div>
              </div>
              <p className="text-[10px] text-muted-foreground">→ Affects: Header logo, Footer logo, page title</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── HEADER ─── */}
        <TabsContent value="header" className="space-y-6">
          <p className="text-sm text-muted-foreground">Controls the website header bar — logo display, navigation, cart icon, and account dropdown.</p>

          <Card>
            <CardHeader><CardTitle className="font-display text-sm uppercase">Visibility</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2"><Switch checked={headerDraft.value.show_logo_icon} onCheckedChange={v => headerDraft.setValue(p => ({ ...p, show_logo_icon: v }))} /><Label className="text-xs">Show Logo Icon</Label></div>
                <div className="flex items-center gap-2"><Switch checked={headerDraft.value.show_logo_text} onCheckedChange={v => headerDraft.setValue(p => ({ ...p, show_logo_text: v }))} /><Label className="text-xs">Show Logo Text</Label></div>
                <div className="flex items-center gap-2"><Switch checked={headerDraft.value.show_cart_icon} onCheckedChange={v => headerDraft.setValue(p => ({ ...p, show_cart_icon: v }))} /><Label className="text-xs">Show Cart Icon</Label></div>
                <div className="flex items-center gap-2"><Switch checked={headerDraft.value.show_account_icon} onCheckedChange={v => headerDraft.setValue(p => ({ ...p, show_account_icon: v }))} /><Label className="text-xs">Show Account Dropdown</Label></div>
                <div className="flex items-center gap-2"><Switch checked={headerDraft.value.show_admin_icon} onCheckedChange={v => headerDraft.setValue(p => ({ ...p, show_admin_icon: v }))} /><Label className="text-xs">Show Admin Link</Label></div>
                <div className="flex items-center gap-2"><Switch checked={headerDraft.value.show_mobile_menu} onCheckedChange={v => headerDraft.setValue(p => ({ ...p, show_mobile_menu: v }))} /><Label className="text-xs">Show Mobile Menu</Label></div>
                <div className="flex items-center gap-2"><Switch checked={headerDraft.value.desktop_nav_enabled} onCheckedChange={v => headerDraft.setValue(p => ({ ...p, desktop_nav_enabled: v }))} /><Label className="text-xs">Desktop Navigation</Label></div>
                <div className="flex items-center gap-2"><Switch checked={headerDraft.value.mobile_nav_enabled} onCheckedChange={v => headerDraft.setValue(p => ({ ...p, mobile_nav_enabled: v }))} /><Label className="text-xs">Mobile Navigation</Label></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-sm uppercase">Logo Size</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Logo Height (px)</Label>
                <span className="text-xs text-muted-foreground">{headerDraft.value.logo_height_px}px</span>
              </div>
              <Slider min={20} max={80} step={2} value={[headerDraft.value.logo_height_px]} onValueChange={([v]) => headerDraft.setValue(p => ({ ...p, logo_height_px: v }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-sm uppercase">Labels</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label className="text-xs">Account Label</Label><Input value={headerDraft.value.account_label} onChange={e => headerDraft.setValue(p => ({ ...p, account_label: e.target.value }))} /></div>
                <div><Label className="text-xs">Auth Label</Label><Input value={headerDraft.value.auth_label} onChange={e => headerDraft.setValue(p => ({ ...p, auth_label: e.target.value }))} /></div>
                <div><Label className="text-xs">Admin Label</Label><Input value={headerDraft.value.admin_label} onChange={e => headerDraft.setValue(p => ({ ...p, admin_label: e.target.value }))} /></div>
                <div><Label className="text-xs">Sign Out Label</Label><Input value={headerDraft.value.sign_out_label} onChange={e => headerDraft.setValue(p => ({ ...p, sign_out_label: e.target.value }))} /></div>
                <div><Label className="text-xs">Mobile Account Label</Label><Input value={headerDraft.value.mobile_account_label} onChange={e => headerDraft.setValue(p => ({ ...p, mobile_account_label: e.target.value }))} /></div>
                <div><Label className="text-xs">Mobile Admin Label</Label><Input value={headerDraft.value.mobile_admin_label} onChange={e => headerDraft.setValue(p => ({ ...p, mobile_admin_label: e.target.value }))} /></div>
              </div>
              <p className="text-[10px] text-muted-foreground">→ Affects: Header account dropdown, mobile navigation labels</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── FOOTER ─── */}
        <TabsContent value="footer" className="space-y-6">
          <p className="text-sm text-muted-foreground">Controls the website footer — sections, contact info, policy links, and social icons.</p>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Footer Layout</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Description</Label><Textarea value={footerDraft.value.description} onChange={e => footerDraft.setValue(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
                <div><Label className="text-xs">Copyright Text</Label><Input value={footerDraft.value.copyright_text} onChange={e => footerDraft.setValue(p => ({ ...p, copyright_text: e.target.value }))} /></div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Footer Height (px) — 0 = auto</Label>
                    <span className="text-xs text-muted-foreground">{footerDraft.value.footer_height_px || 0}px</span>
                  </div>
                  <Slider min={0} max={600} step={10} value={[footerDraft.value.footer_height_px || 0]} onValueChange={([v]) => footerDraft.setValue(p => ({ ...p, footer_height_px: v }))} />
                </div>
                <div className="space-y-2 pt-2">
                  <SectionLabel>Section Visibility</SectionLabel>
                  <div className="flex items-center gap-2"><Switch checked={footerDraft.value.show_quick_links} onCheckedChange={v => footerDraft.setValue(p => ({ ...p, show_quick_links: v }))} /><Label className="text-xs">Quick Links column</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={footerDraft.value.show_account_links} onCheckedChange={v => footerDraft.setValue(p => ({ ...p, show_account_links: v }))} /><Label className="text-xs">Account column</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={footerDraft.value.show_policies} onCheckedChange={v => footerDraft.setValue(p => ({ ...p, show_policies: v }))} /><Label className="text-xs">Policies column</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={footerDraft.value.show_contact_block} onCheckedChange={v => footerDraft.setValue(p => ({ ...p, show_contact_block: v }))} /><Label className="text-xs">Contact column</Label></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Footer Logo</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2"><Switch checked={footerDraft.value.show_logo_icon} onCheckedChange={v => footerDraft.setValue(p => ({ ...p, show_logo_icon: v }))} /><Label className="text-xs">Show Logo Icon</Label></div>
                <div className="flex items-center gap-2"><Switch checked={footerDraft.value.show_logo_text} onCheckedChange={v => footerDraft.setValue(p => ({ ...p, show_logo_text: v }))} /><Label className="text-xs">Show Logo Text</Label></div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Logo Height (px)</Label>
                  <span className="text-xs text-muted-foreground">{footerDraft.value.logo_height_px}px</span>
                </div>
                <Slider min={16} max={64} step={2} value={[footerDraft.value.logo_height_px]} onValueChange={([v]) => footerDraft.setValue(p => ({ ...p, logo_height_px: v }))} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="font-display text-sm uppercase">Section Titles</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><Label className="text-xs">Quick Links Title</Label><Input value={footerDraft.value.quick_links_title} onChange={e => footerDraft.setValue(p => ({ ...p, quick_links_title: e.target.value }))} /></div>
              <div><Label className="text-xs">Account Title</Label><Input value={footerDraft.value.account_title} onChange={e => footerDraft.setValue(p => ({ ...p, account_title: e.target.value }))} /></div>
              <div><Label className="text-xs">Policies Title</Label><Input value={footerDraft.value.policies_title} onChange={e => footerDraft.setValue(p => ({ ...p, policies_title: e.target.value }))} /></div>
              <div><Label className="text-xs">Contact Title</Label><Input value={footerDraft.value.contact_title} onChange={e => footerDraft.setValue(p => ({ ...p, contact_title: e.target.value }))} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-sm uppercase">Footer Contact Fields</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[10px] text-muted-foreground">These values are displayed in the footer contact block. Leave empty to hide a field.</p>
              <div><Label className="text-xs">Contact Description</Label><Textarea value={footerDraft.value.contact_description || ""} onChange={e => footerDraft.setValue(p => ({ ...p, contact_description: e.target.value }))} rows={2} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label className="text-xs">Email Label</Label><Input value={footerDraft.value.contact_email_label || ""} onChange={e => footerDraft.setValue(p => ({ ...p, contact_email_label: e.target.value }))} /></div>
                <div><Label className="text-xs">Email Value</Label><Input value={footerDraft.value.contact_email || ""} onChange={e => footerDraft.setValue(p => ({ ...p, contact_email: e.target.value }))} /></div>
                <div><Label className="text-xs">Phone Label</Label><Input value={footerDraft.value.contact_phone_label || ""} onChange={e => footerDraft.setValue(p => ({ ...p, contact_phone_label: e.target.value }))} /></div>
                <div><Label className="text-xs">Phone Value</Label><Input value={footerDraft.value.contact_phone || ""} onChange={e => footerDraft.setValue(p => ({ ...p, contact_phone: e.target.value }))} /></div>
                <div><Label className="text-xs">Address Label</Label><Input value={footerDraft.value.contact_address_label || ""} onChange={e => footerDraft.setValue(p => ({ ...p, contact_address_label: e.target.value }))} /></div>
                <div><Label className="text-xs">Address Value</Label><Input value={footerDraft.value.contact_address || ""} onChange={e => footerDraft.setValue(p => ({ ...p, contact_address: e.target.value }))} /></div>
              </div>
              <SectionLabel>Social Links</SectionLabel>
              <div><Label className="text-xs">Social Section Title</Label><Input value={footerDraft.value.contact_social_title || ""} onChange={e => footerDraft.setValue(p => ({ ...p, contact_social_title: e.target.value }))} /></div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><Label className="text-xs">Instagram URL</Label><Input value={footerDraft.value.contact_social_instagram || ""} onChange={e => footerDraft.setValue(p => ({ ...p, contact_social_instagram: e.target.value }))} placeholder="https://instagram.com/..." /></div>
                <div><Label className="text-xs">Facebook URL</Label><Input value={footerDraft.value.contact_social_facebook || ""} onChange={e => footerDraft.setValue(p => ({ ...p, contact_social_facebook: e.target.value }))} placeholder="https://facebook.com/..." /></div>
                <div><Label className="text-xs">YouTube URL</Label><Input value={footerDraft.value.contact_social_youtube || ""} onChange={e => footerDraft.setValue(p => ({ ...p, contact_social_youtube: e.target.value }))} placeholder="https://youtube.com/..." /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-sm uppercase">Account Links</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div><Label className="text-xs">Auth Link Label</Label><Input value={footerDraft.value.auth_link_label} onChange={e => footerDraft.setValue(p => ({ ...p, auth_link_label: e.target.value }))} /></div>
              <div><Label className="text-xs">Account Link Label</Label><Input value={footerDraft.value.account_link_label} onChange={e => footerDraft.setValue(p => ({ ...p, account_link_label: e.target.value }))} /></div>
              <div><Label className="text-xs">Orders Link Label</Label><Input value={footerDraft.value.orders_link_label} onChange={e => footerDraft.setValue(p => ({ ...p, orders_link_label: e.target.value }))} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-sm uppercase">Policy Links</CardTitle>
              <Button variant="ghost" size="sm" onClick={addPolicyLink}><Plus className="mr-1 h-3 w-3" />Add Link</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(footerDraft.value.policy_links ?? []).map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input value={link.label} onChange={e => updatePolicyLink(idx, "label", e.target.value)} className="h-8 text-sm" placeholder="Label" />
                  <Input value={link.path} onChange={e => updatePolicyLink(idx, "path", e.target.value)} className="h-8 text-xs font-mono max-w-[200px]" placeholder="/policies/..." />
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => movePolicyLink(idx, -1)} disabled={idx === 0}><ChevronUp className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => movePolicyLink(idx, 1)} disabled={idx === (footerDraft.value.policy_links?.length ?? 0) - 1}><ChevronDown className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removePolicyLink(idx)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground">→ These links appear in the Footer "Policies" column</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── STORE & CONTACT ─── */}
        <TabsContent value="store" className="space-y-6">
          <p className="text-sm text-muted-foreground">Store identity and contact information — used by the Contact page, Footer, and email templates.</p>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Store Settings</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Store Name</Label><Input value={storeDraft.value.name} onChange={e => storeDraft.setValue(prev => ({ ...prev, name: e.target.value }))} /></div>
                <div><Label className="text-xs">Currency</Label><Input value={storeDraft.value.currency} onChange={e => storeDraft.setValue(prev => ({ ...prev, currency: e.target.value }))} /></div>
                <div><Label className="text-xs">Currency Symbol</Label><Input value={storeDraft.value.currency_symbol} onChange={e => storeDraft.setValue(prev => ({ ...prev, currency_symbol: e.target.value }))} /></div>
                <p className="text-[10px] text-muted-foreground">→ Affects: Product prices, cart, checkout, invoices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Email</Label><Input value={contactDraft.value.email} onChange={e => contactDraft.setValue(prev => ({ ...prev, email: e.target.value }))} /></div>
                <div><Label className="text-xs">Phone</Label><Input value={contactDraft.value.phone} onChange={e => contactDraft.setValue(prev => ({ ...prev, phone: e.target.value }))} /></div>
                <div><Label className="text-xs">Address</Label><Input value={contactDraft.value.address} onChange={e => contactDraft.setValue(prev => ({ ...prev, address: e.target.value }))} /></div>
                <p className="text-[10px] text-muted-foreground">→ Affects: Contact page, Footer contact block</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Footer Contact Display</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Contact Description</Label><Textarea value={contactDraft.value.contact_description} onChange={e => contactDraft.setValue(prev => ({ ...prev, contact_description: e.target.value }))} rows={2} /></div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div><Label className="text-xs">Email Label</Label><Input value={contactDraft.value.email_label} onChange={e => contactDraft.setValue(prev => ({ ...prev, email_label: e.target.value }))} /></div>
                  <div><Label className="text-xs">Phone Label</Label><Input value={contactDraft.value.phone_label} onChange={e => contactDraft.setValue(prev => ({ ...prev, phone_label: e.target.value }))} /></div>
                  <div><Label className="text-xs">Address Label</Label><Input value={contactDraft.value.address_label} onChange={e => contactDraft.setValue(prev => ({ ...prev, address_label: e.target.value }))} /></div>
                </div>
                <p className="text-[10px] text-muted-foreground">→ Affects: Footer contact column labels and description text</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Social Media</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Social Section Title</Label><Input value={contactDraft.value.social_title} onChange={e => contactDraft.setValue(prev => ({ ...prev, social_title: e.target.value }))} placeholder="Follow us" /></div>
                <div><Label className="text-xs">Instagram URL</Label><Input value={contactDraft.value.social?.instagram ?? ""} onChange={e => contactDraft.setValue(prev => ({ ...prev, social: { ...prev.social, instagram: e.target.value } }))} placeholder="https://instagram.com/..." /></div>
                <div><Label className="text-xs">Facebook URL</Label><Input value={contactDraft.value.social?.facebook ?? ""} onChange={e => contactDraft.setValue(prev => ({ ...prev, social: { ...prev.social, facebook: e.target.value } }))} placeholder="https://facebook.com/..." /></div>
                <div><Label className="text-xs">YouTube URL</Label><Input value={contactDraft.value.social?.youtube ?? ""} onChange={e => contactDraft.setValue(prev => ({ ...prev, social: { ...prev.social, youtube: e.target.value } }))} placeholder="https://youtube.com/..." /></div>
                <p className="text-[10px] text-muted-foreground">→ Affects: Footer social icons (Instagram, Facebook)</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── PROMOTION ─── */}
        <TabsContent value="promo" className="space-y-6">
          <p className="text-sm text-muted-foreground">Controls the promotion popup that appears on the website.</p>
          <Card>
            <CardHeader><CardTitle className="font-display text-sm uppercase">Promotion Popup</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2"><Switch checked={promoDraft.value.enabled} onCheckedChange={v => promoDraft.setValue(prev => ({ ...prev, enabled: v }))} /><Label className="text-xs">Enable popup</Label></div>
              <div><Label className="text-xs">Title</Label><Input value={promoDraft.value.title} onChange={e => promoDraft.setValue(prev => ({ ...prev, title: e.target.value }))} /></div>
              <div><Label className="text-xs">Message</Label><Textarea value={promoDraft.value.message} onChange={e => promoDraft.setValue(prev => ({ ...prev, message: e.target.value }))} rows={2} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label className="text-xs">Button Text</Label><Input value={promoDraft.value.button_text} onChange={e => promoDraft.setValue(prev => ({ ...prev, button_text: e.target.value }))} /></div>
                <div><Label className="text-xs">Button Link</Label><Input value={promoDraft.value.button_link} onChange={e => promoDraft.setValue(prev => ({ ...prev, button_link: e.target.value }))} /></div>
              </div>
              <div><Label className="text-xs">Image URL</Label><Input value={promoDraft.value.image_url} onChange={e => promoDraft.setValue(prev => ({ ...prev, image_url: e.target.value }))} /></div>
              <div><Label className="text-xs">Dismiss Key</Label><Input value={promoDraft.value.dismiss_key} onChange={e => promoDraft.setValue(prev => ({ ...prev, dismiss_key: e.target.value }))} /></div>
              <p className="text-[10px] text-muted-foreground">→ Affects: Promotion popup on all pages. Change dismiss key to re-show to returning visitors.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── POLICIES ─── */}
        <TabsContent value="policies" className="space-y-6">
          <p className="text-sm text-muted-foreground">Edit your store policies below. Content supports Markdown formatting. Linked from the Footer policies column.</p>
          <div className="grid gap-4">
            {POLICY_KEYS.map((policy, idx) => {
              const draft = policyDrafts[idx];
              return (
                <Card key={policy.settingKey}>
                  <CardHeader><CardTitle className="font-display text-sm uppercase">{policy.title}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div><Label className="text-xs">Page Title</Label><Input value={draft.value.title} onChange={e => draft.setValue(prev => ({ ...prev, title: e.target.value }))} /></div>
                    <div><Label className="text-xs">Content (Markdown)</Label><Textarea value={draft.value.body} onChange={e => draft.setValue(prev => ({ ...prev, body: e.target.value }))} rows={10} className="font-mono text-xs" /></div>
                    <p className="text-[10px] text-muted-foreground">Live at: <span className="font-mono text-primary">/policies/{policy.slug}</span></p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── DASHBOARD SHORTCUTS ─── */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage shortcuts shown on the admin dashboard.</p>
            <Button onClick={saveAdminSettings} disabled={adminSaving} size="sm" className="font-display text-xs uppercase tracking-wider">
              <Save className="mr-1 h-4 w-4" /> {adminSaving ? "Saving..." : "Save"}
            </Button>
          </div>
          <div className="space-y-2">
            {shortcuts.map((sc, idx) => {
              const Icon = ICON_MAP[sc.icon] || SIDEBAR_ICON_MAP[sc.icon] || Package;
              return (
                <Card key={sc.id} className={`transition-opacity ${!sc.visible ? "opacity-50" : ""}`}>
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
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

        {/* ─── NAVIGATION ─── */}
        <TabsContent value="navigation" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage the left admin sidebar.</p>
            <Button onClick={saveAdminSettings} disabled={adminSaving} size="sm" className="font-display text-xs uppercase tracking-wider">
              <Save className="mr-1 h-4 w-4" /> {adminSaving ? "Saving..." : "Save"}
            </Button>
          </div>
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
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0"><Icon className="h-3.5 w-3.5 text-primary" /></div>
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

        {/* ─── ACCOUNT PAGE ─── */}
        <TabsContent value="account" className="space-y-6">
          <p className="text-sm text-muted-foreground">Manage the account page modules, layout, and behavior.</p>

          <Card>
            <CardHeader><CardTitle className="font-display text-sm uppercase">Modules</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[...accountDraft.value.modules].sort((a, b) => a.order - b.order).map((mod, idx) => {
                const Icon = { ...ICON_MAP, ...SIDEBAR_ICON_MAP }[mod.icon] || Package;
                return (
                  <div key={mod.id} className={`flex items-center gap-3 rounded-lg border border-border p-3 transition-opacity ${!mod.visible ? "opacity-50" : ""}`}>
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0"><Icon className="h-3.5 w-3.5 text-primary" /></div>
                    <Input value={mod.label} onChange={e => {
                      accountDraft.setValue(prev => {
                        const modules = [...prev.modules];
                        const i = modules.findIndex(m => m.id === mod.id);
                        modules[i] = { ...modules[i], label: e.target.value };
                        return { ...prev, modules };
                      });
                    }} className="h-8 max-w-[160px] text-sm" />
                    <Select value={mod.icon} onValueChange={v => {
                      accountDraft.setValue(prev => {
                        const modules = [...prev.modules];
                        const i = modules.findIndex(m => m.id === mod.id);
                        modules[i] = { ...modules[i], icon: v };
                        return { ...prev, modules };
                      });
                    }}>
                      <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{AVAILABLE_ICONS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="ml-auto flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => {
                        accountDraft.setValue(prev => {
                          const modules = [...prev.modules].sort((a, b) => a.order - b.order);
                          if (idx === 0) return prev;
                          const temp = modules[idx].order;
                          modules[idx] = { ...modules[idx], order: modules[idx - 1].order };
                          modules[idx - 1] = { ...modules[idx - 1], order: temp };
                          return { ...prev, modules };
                        });
                      }}><ChevronUp className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === accountDraft.value.modules.length - 1} onClick={() => {
                        accountDraft.setValue(prev => {
                          const modules = [...prev.modules].sort((a, b) => a.order - b.order);
                          if (idx >= modules.length - 1) return prev;
                          const temp = modules[idx].order;
                          modules[idx] = { ...modules[idx], order: modules[idx + 1].order };
                          modules[idx + 1] = { ...modules[idx + 1], order: temp };
                          return { ...prev, modules };
                        });
                      }}><ChevronDown className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        accountDraft.setValue(prev => ({
                          ...prev,
                          modules: prev.modules.map(m => m.id === mod.id ? { ...m, visible: !m.visible } : m),
                        }));
                      }}>
                        {mod.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Behavior</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Default Tab</Label>
                  <Select value={accountDraft.value.defaultTab} onValueChange={v => accountDraft.setValue(prev => ({ ...prev, defaultTab: v as any }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{accountDraft.value.modules.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={accountDraft.value.showLoyaltySummary} onCheckedChange={v => accountDraft.setValue(prev => ({ ...prev, showLoyaltySummary: v }))} />
                  <Label className="text-xs">Show Loyalty Summary</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Overview Tiles</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {["points", "activeVouchers", "totalOrders", "giftCardBalance"].map(tile => (
                  <div key={tile} className="flex items-center gap-2">
                    <Switch checked={accountDraft.value.overviewTiles.includes(tile)} onCheckedChange={v => {
                      accountDraft.setValue(prev => ({
                        ...prev,
                        overviewTiles: v ? [...prev.overviewTiles, tile] : prev.overviewTiles.filter(t => t !== tile),
                      }));
                    }} />
                    <Label className="text-xs capitalize">{tile.replace(/([A-Z])/g, " $1").trim()}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-sm uppercase">Style</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Hover Animation</Label>
                  <Select value={accountDraft.value.style.hoverAnimation} onValueChange={v => accountDraft.setValue(prev => ({ ...prev, style: { ...prev.style, hoverAnimation: v } }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lift">Lift</SelectItem>
                      <SelectItem value="glow">Glow</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tab Style</Label>
                  <Select value={accountDraft.value.style.tabStyle} onValueChange={v => accountDraft.setValue(prev => ({ ...prev, style: { ...prev.style, tabStyle: v } }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pills">Pills</SelectItem>
                      <SelectItem value="underline">Underline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── PERSONALIZATION ─── */}
        <TabsContent value="personalization" className="space-y-6">
          <PersonalizationSettings />
        </TabsContent>

        {/* ─── AUTOMATIONS ─── */}
        <TabsContent value="automations" className="space-y-6">
          <Suspense fallback={<p className="text-sm text-muted-foreground py-4">Loading...</p>}>
            <AdminEmailManager />
          </Suspense>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminSettings;
