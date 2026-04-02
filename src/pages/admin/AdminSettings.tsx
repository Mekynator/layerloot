import { useEffect, useState, lazy, Suspense } from "react";
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
import { useDraftSettings } from "@/hooks/use-draft-settings";
import DraftActionBar from "@/components/admin/DraftActionBar";
import { useAuth } from "@/contexts/AuthContext";

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

/* ─── Admin-only direct save helper ─── */
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
  const { user } = useAuth();
  const userId = user?.id;

  /* Draft-managed storefront settings */
  const contactDraft = useDraftSettings("contact", { email: "", phone: "", address: "", social: { instagram: "", facebook: "", youtube: "" } });
  const storeDraft = useDraftSettings("store", { name: "LayerLoot", currency: "DKK", currency_symbol: "kr" });
  const promoDraft = useDraftSettings<PromoConfig>("promotion_popup", defaultPromo);
  const footerDraft = useDraftSettings<FooterConfig>("footer_settings", defaultFooter);
  const brandingDraft = useDraftSettings<BrandingConfig>("branding", defaultBranding);
  const accountDraft = useDraftSettings<AccountPageConfig>("account_page_config", DEFAULT_ACCOUNT_CONFIG);

  /* Policy drafts — managed as individual keys */
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

  /* Compute combined draft status */
  const allDrafts = [contactDraft, storeDraft, promoDraft, footerDraft, brandingDraft, accountDraft, ...policyDrafts];
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
            <p className="text-xs text-muted-foreground">Store configuration, branding, dashboard & navigation</p>
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

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="account">Account Page</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
        </TabsList>

        {/* ─── GENERAL ─── */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Email</Label><Input value={contactDraft.value.email} onChange={e => contactDraft.setValue(prev => ({ ...prev, email: e.target.value }))} /></div>
                <div><Label className="text-xs">Phone</Label><Input value={contactDraft.value.phone} onChange={e => contactDraft.setValue(prev => ({ ...prev, phone: e.target.value }))} /></div>
                <div><Label className="text-xs">Address</Label><Input value={contactDraft.value.address} onChange={e => contactDraft.setValue(prev => ({ ...prev, address: e.target.value }))} /></div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Social Media</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Instagram URL</Label><Input value={contactDraft.value.social?.instagram ?? ""} onChange={e => contactDraft.setValue(prev => ({ ...prev, social: { ...prev.social, instagram: e.target.value } }))} /></div>
                <div><Label className="text-xs">Facebook URL</Label><Input value={contactDraft.value.social?.facebook ?? ""} onChange={e => contactDraft.setValue(prev => ({ ...prev, social: { ...prev.social, facebook: e.target.value } }))} /></div>
                <div><Label className="text-xs">YouTube URL</Label><Input value={contactDraft.value.social?.youtube ?? ""} onChange={e => contactDraft.setValue(prev => ({ ...prev, social: { ...prev.social, youtube: e.target.value } }))} /></div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Store Settings</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Store Name</Label><Input value={storeDraft.value.name} onChange={e => storeDraft.setValue(prev => ({ ...prev, name: e.target.value }))} /></div>
                <div><Label className="text-xs">Currency</Label><Input value={storeDraft.value.currency} onChange={e => storeDraft.setValue(prev => ({ ...prev, currency: e.target.value }))} /></div>
                <div><Label className="text-xs">Currency Symbol</Label><Input value={storeDraft.value.currency_symbol} onChange={e => storeDraft.setValue(prev => ({ ...prev, currency_symbol: e.target.value }))} /></div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Promotion Popup</CardTitle></CardHeader>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── POLICIES ─── */}
        <TabsContent value="policies" className="space-y-6">
          <p className="text-sm text-muted-foreground">Edit your store policies below. Content supports Markdown formatting.</p>
          <div className="grid gap-4">
            {POLICY_KEYS.map((policy, idx) => {
              const draft = policyDrafts[idx];
              return (
                <Card key={policy.settingKey}>
                  <CardHeader><CardTitle className="font-display text-sm uppercase">{policy.title}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div><Label className="text-xs">Page Title</Label>
                      <Input value={draft.value.title} onChange={e => draft.setValue(prev => ({ ...prev, title: e.target.value }))} />
                    </div>
                    <div><Label className="text-xs">Content (Markdown)</Label>
                      <Textarea value={draft.value.body} onChange={e => draft.setValue(prev => ({ ...prev, body: e.target.value }))} rows={10} className="font-mono text-xs" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Live at: <span className="font-mono text-primary">/policies/{policy.slug}</span></p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── DASHBOARD SHORTCUTS (admin-only, direct save) ─── */}
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

        {/* ─── NAVIGATION (sidebar editor, admin-only) ─── */}
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

        {/* ─── AUTOMATIONS ─── */}
        <TabsContent value="automations" className="space-y-6">
          <Suspense fallback={<p className="text-sm text-muted-foreground py-4">Loading...</p>}>
            <CustomOrderAutomationRulesEditor />
            <CustomOrderTemplatesEditor />
          </Suspense>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminSettings;
