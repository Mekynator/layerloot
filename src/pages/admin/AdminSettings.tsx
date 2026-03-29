import { useEffect, useState } from "react";
import { Save, Palette, Footprints } from "lucide-react";
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

interface ThemeConfig {
  preset: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  card: string;
  card_foreground: string;
  background_image_url: string;
  background_pattern: string;
  background_effect: string;
  enable_motion: boolean;
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

const defaultTheme: ThemeConfig = {
  preset: "default",
  primary: "24 95% 53%",
  secondary: "220 15% 16%",
  accent: "24 95% 53%",
  background: "220 20% 10%",
  foreground: "0 0% 95%",
  muted: "220 15% 20%",
  border: "220 15% 22%",
  card: "220 15% 14%",
  card_foreground: "0 0% 95%",
  background_image_url: "",
  background_pattern: "none",
  background_effect: "none",
  enable_motion: true,
};

const SEASONAL_PRESETS: Record<string, Partial<ThemeConfig> & { label: string }> = {
  default: {
    label: "Default (Dark Industrial)",
    primary: "24 95% 53%",
    secondary: "220 15% 16%",
    accent: "24 95% 53%",
    background: "220 20% 10%",
    foreground: "0 0% 95%",
    muted: "220 15% 20%",
    border: "220 15% 22%",
    card: "220 15% 14%",
    card_foreground: "0 0% 95%",
    background_pattern: "none",
    background_effect: "none",
  },
  spring: {
    label: "🌸 Spring Bloom",
    primary: "142 60% 45%",
    secondary: "142 20% 92%",
    accent: "330 70% 60%",
    background: "90 30% 96%",
    foreground: "142 30% 15%",
    muted: "142 15% 90%",
    border: "142 20% 85%",
    card: "0 0% 100%",
    card_foreground: "142 30% 15%",
    background_pattern: "dots",
    background_effect: "particles",
  },
  summer: {
    label: "☀️ Summer Vibes",
    primary: "35 95% 55%",
    secondary: "200 60% 92%",
    accent: "190 80% 45%",
    background: "45 40% 97%",
    foreground: "35 40% 12%",
    muted: "35 20% 90%",
    border: "35 20% 85%",
    card: "0 0% 100%",
    card_foreground: "35 40% 12%",
    background_pattern: "waves",
    background_effect: "shimmer",
  },
  autumn: {
    label: "🍂 Autumn Warmth",
    primary: "15 80% 50%",
    secondary: "30 25% 18%",
    accent: "40 85% 55%",
    background: "25 25% 10%",
    foreground: "35 30% 90%",
    muted: "25 20% 18%",
    border: "25 20% 25%",
    card: "25 20% 14%",
    card_foreground: "35 30% 90%",
    background_pattern: "grain",
    background_effect: "falling-leaves",
  },
  winter: {
    label: "❄️ Winter Frost",
    primary: "210 70% 55%",
    secondary: "210 25% 15%",
    accent: "195 80% 65%",
    background: "215 30% 8%",
    foreground: "210 20% 95%",
    muted: "210 20% 18%",
    border: "210 20% 25%",
    card: "210 25% 12%",
    card_foreground: "210 20% 95%",
    background_pattern: "snowflakes",
    background_effect: "snow",
  },
};

const AdminSettings = () => {
  const { toast } = useToast();
  const [contact, setContact] = useState({ email: "", phone: "", address: "", social: { instagram: "", facebook: "", youtube: "" } });
  const [store, setStore] = useState({ name: "LayerLoot", currency: "DKK", currency_symbol: "kr" });
  const [promo, setPromo] = useState<PromoConfig>(defaultPromo);
  const [footer, setFooter] = useState<FooterConfig>(defaultFooter);
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("site_settings").select("*");
      if (data) {
        data.forEach((s: any) => {
          if (s.key === "contact") setContact(s.value as any);
          if (s.key === "store") setStore(s.value as any);
          if (s.key === "promotion_popup") setPromo({ ...defaultPromo, ...(s.value as any) });
          if (s.key === "footer_settings") setFooter({ ...defaultFooter, ...(s.value as any) });
          if (s.key === "theme") setTheme({ ...defaultTheme, ...(s.value as any) });
        });
      }
    };
    fetch();
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
    await Promise.all([
      upsertSetting("contact", contact),
      upsertSetting("store", store),
      upsertSetting("promotion_popup", promo),
      upsertSetting("footer_settings", footer),
      upsertSetting("theme", theme),
    ]);
    setSaving(false);
    toast({ title: "Settings saved!" });
  };

  const applyPreset = (presetKey: string) => {
    const preset = SEASONAL_PRESETS[presetKey];
    if (!preset) return;
    setTheme((prev) => ({
      ...prev,
      preset: presetKey,
      primary: preset.primary ?? prev.primary,
      secondary: preset.secondary ?? prev.secondary,
      accent: preset.accent ?? prev.accent,
      background: preset.background ?? prev.background,
      foreground: preset.foreground ?? prev.foreground,
      muted: preset.muted ?? prev.muted,
      border: preset.border ?? prev.border,
      card: preset.card ?? prev.card,
      card_foreground: preset.card_foreground ?? prev.card_foreground,
      background_pattern: preset.background_pattern ?? prev.background_pattern,
      background_effect: preset.background_effect ?? prev.background_effect,
    }));
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Settings</h1>
        <Button onClick={save} disabled={saving} className="font-display uppercase tracking-wider">
          <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
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
                <div><Label>Dismiss Key (change to re-show popup)</Label><Input value={promo.dismiss_key} onChange={(e) => setPromo({ ...promo, dismiss_key: e.target.value })} /></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="footer" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-display uppercase">Footer Content</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Description</Label><Textarea value={footer.description} onChange={(e) => setFooter({ ...footer, description: e.target.value })} rows={3} /></div>
                <div><Label>Copyright Text</Label><Input value={footer.copyright_text} onChange={(e) => setFooter({ ...footer, copyright_text: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Logo Height (px)</Label><Input type="number" value={footer.logo_height_px} onChange={(e) => setFooter({ ...footer, logo_height_px: parseInt(e.target.value) || 32 })} /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display uppercase">Section Visibility</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2"><Switch checked={footer.show_logo_icon} onCheckedChange={(v) => setFooter({ ...footer, show_logo_icon: v })} /><Label>Show Logo Icon</Label></div>
                <div className="flex items-center gap-2"><Switch checked={footer.show_logo_text} onCheckedChange={(v) => setFooter({ ...footer, show_logo_text: v })} /><Label>Show Logo Text</Label></div>
                <div className="flex items-center gap-2"><Switch checked={footer.show_quick_links} onCheckedChange={(v) => setFooter({ ...footer, show_quick_links: v })} /><Label>Show Quick Links</Label></div>
                <div className="flex items-center gap-2"><Switch checked={footer.show_account_links} onCheckedChange={(v) => setFooter({ ...footer, show_account_links: v })} /><Label>Show Account Links</Label></div>
                <div className="flex items-center gap-2"><Switch checked={footer.show_contact_block} onCheckedChange={(v) => setFooter({ ...footer, show_contact_block: v })} /><Label>Show Contact Block</Label></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display uppercase">Section Titles</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Quick Links Title</Label><Input value={footer.quick_links_title} onChange={(e) => setFooter({ ...footer, quick_links_title: e.target.value })} /></div>
                <div><Label>Account Title</Label><Input value={footer.account_title} onChange={(e) => setFooter({ ...footer, account_title: e.target.value })} /></div>
                <div><Label>Contact Title</Label><Input value={footer.contact_title} onChange={(e) => setFooter({ ...footer, contact_title: e.target.value })} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display uppercase">Account Link Labels</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Auth Link Label</Label><Input value={footer.auth_link_label} onChange={(e) => setFooter({ ...footer, auth_link_label: e.target.value })} /></div>
                <div><Label>Account Link Label</Label><Input value={footer.account_link_label} onChange={(e) => setFooter({ ...footer, account_link_label: e.target.value })} /></div>
                <div><Label>Orders Link Label</Label><Input value={footer.orders_link_label} onChange={(e) => setFooter({ ...footer, orders_link_label: e.target.value })} /></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="font-display uppercase">Seasonal Presets</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {Object.entries(SEASONAL_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      theme.preset === key
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-display text-sm font-semibold uppercase text-foreground">{preset.label}</p>
                    <div className="mt-2 flex gap-1">
                      {[preset.primary, preset.accent, preset.background].filter(Boolean).map((color, i) => (
                        <div key={i} className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: `hsl(${color})` }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-display uppercase">Core Colors (HSL)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {([
                  ["primary", "Primary"],
                  ["secondary", "Secondary"],
                  ["accent", "Accent"],
                  ["background", "Background"],
                  ["foreground", "Foreground"],
                  ["muted", "Muted"],
                  ["border", "Border"],
                  ["card", "Card"],
                  ["card_foreground", "Card Foreground"],
                ] as [keyof ThemeConfig, string][]).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="h-8 w-8 shrink-0 rounded-lg border border-border" style={{ backgroundColor: `hsl(${theme[key]})` }} />
                    <div className="flex-1">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={theme[key] as string}
                        onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                        placeholder="H S% L%"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display uppercase">Background & Effects</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Background Image URL</Label>
                  <Input value={theme.background_image_url} onChange={(e) => setTheme({ ...theme, background_image_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label>Background Pattern</Label>
                  <Select value={theme.background_pattern} onValueChange={(v) => setTheme({ ...theme, background_pattern: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="dots">Dots</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="waves">Waves</SelectItem>
                      <SelectItem value="grain">Grain / Noise</SelectItem>
                      <SelectItem value="snowflakes">Snowflakes</SelectItem>
                      <SelectItem value="diagonal">Diagonal Lines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Background Effect</Label>
                  <Select value={theme.background_effect} onValueChange={(v) => setTheme({ ...theme, background_effect: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="particles">Floating Particles</SelectItem>
                      <SelectItem value="shimmer">Shimmer / Glow</SelectItem>
                      <SelectItem value="snow">Snowfall</SelectItem>
                      <SelectItem value="falling-leaves">Falling Leaves</SelectItem>
                      <SelectItem value="fireflies">Fireflies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={theme.enable_motion} onCheckedChange={(v) => setTheme({ ...theme, enable_motion: v })} />
                  <Label>Enable Motion & Animations</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminSettings;
