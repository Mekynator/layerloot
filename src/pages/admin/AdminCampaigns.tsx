import { useEffect, useState } from "react";
import {
  Megaphone, Plus, Calendar, Zap, Trash2, Edit,
  Snowflake, Sun, Leaf, Heart, Sparkles, PartyPopper, Gift,
  Palette, Clock, Power, PowerOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminColorPicker from "@/components/admin/AdminColorPicker";
import PromotionPopupBuilder from "@/components/admin/campaigns/PromotionPopupBuilder";
import { supabase } from "@/integrations/supabase/client";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  status: string;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  is_recurring: boolean;
  theme_overrides: any;
  effects: any;
  chat_overrides: any;
  banner_config: any;
  created_at: string;
}

const CAMPAIGN_TYPES = [
  { value: "seasonal", label: "Seasonal Theme", icon: Calendar },
  { value: "holiday", label: "Holiday Event", icon: Gift },
  { value: "sale", label: "Sale / Promo", icon: Megaphone },
  { value: "launch", label: "Product Launch", icon: Sparkles },
  { value: "custom", label: "Custom Campaign", icon: Palette },
];

const SEASONAL_PRESETS: Record<string, { name: string; icon: any; theme: any; effects: any; banner: any }> = {
  christmas: {
    name: "Christmas",
    icon: Snowflake,
    theme: { primaryColor: "0 72% 51%", accentColor: "142 71% 45%", buttonGlow: true },
    effects: { particles: "snow", particleDensity: 35, glowPulse: true },
    banner: { text: "🎄 Merry Christmas! Free shipping on all orders", bgColor: "hsl(0 72% 51%)", textColor: "#fff", enabled: true },
  },
  halloween: {
    name: "Halloween",
    icon: PartyPopper,
    theme: { primaryColor: "24 95% 53%", accentColor: "271 76% 53%", buttonGlow: true },
    effects: { particles: "sparkles", particleDensity: 20, animatedGradient: true },
    banner: { text: "🎃 Spooky deals are here! Up to 30% off", bgColor: "hsl(24 95% 53%)", textColor: "#fff", enabled: true },
  },
  valentines: {
    name: "Valentine's Day",
    icon: Heart,
    theme: { primaryColor: "340 82% 52%", accentColor: "330 70% 60%", buttonGlow: true },
    effects: { particles: "hearts", particleDensity: 25 },
    banner: { text: "💕 Valentine's Special - Perfect gifts for your loved one", bgColor: "hsl(340 82% 52%)", textColor: "#fff", enabled: true },
  },
  summer: {
    name: "Summer Sale",
    icon: Sun,
    theme: { primaryColor: "39 100% 50%", accentColor: "196 94% 48%", buttonGlow: false },
    effects: { particles: "sparkles", particleDensity: 15 },
    banner: { text: "☀️ Summer sale is live!", bgColor: "hsl(196 94% 48%)", textColor: "#fff", enabled: true },
  },
  autumn: {
    name: "Autumn / Fall",
    icon: Leaf,
    theme: { primaryColor: "25 95% 53%", accentColor: "39 100% 50%" },
    effects: { particles: "leaves", particleDensity: 20 },
    banner: { text: "🍂 Fall collection is here", bgColor: "hsl(25 95% 40%)", textColor: "#fff", enabled: true },
  },
  blackfriday: {
    name: "Black Friday",
    icon: Zap,
    theme: { primaryColor: "0 0% 100%", accentColor: "48 96% 53%", buttonGlow: true },
    effects: { particles: "confetti", particleDensity: 30, glowPulse: true },
    banner: { text: "⚡ BLACK FRIDAY — Massive discounts site-wide!", bgColor: "#000", textColor: "#fff", enabled: true },
  },
};

const defaultForm = {
  name: "",
  description: "",
  campaign_type: "seasonal",
  status: "draft",
  priority: 0,
  start_date: "",
  end_date: "",
  is_recurring: false,
  theme_overrides: {} as any,
  effects: {} as any,
  chat_overrides: {} as any,
  banner_config: {} as any,
};

const AdminCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns" as any)
      .select("*")
      .order("priority", { ascending: false });
    setCampaigns((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const openCreate = () => {
    setForm(defaultForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setForm({
      name: c.name,
      description: c.description || "",
      campaign_type: c.campaign_type,
      status: c.status,
      priority: c.priority,
      start_date: c.start_date ? c.start_date.split("T")[0] : "",
      end_date: c.end_date ? c.end_date.split("T")[0] : "",
      is_recurring: c.is_recurring,
      theme_overrides: c.theme_overrides || {},
      effects: c.effects || {},
      chat_overrides: c.chat_overrides || {},
      banner_config: c.banner_config || {},
    });
    setEditingId(c.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      campaign_type: form.campaign_type,
      status: form.status,
      priority: form.priority,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_recurring: form.is_recurring,
      theme_overrides: form.theme_overrides,
      effects: form.effects,
      chat_overrides: form.chat_overrides,
      banner_config: form.banner_config,
    };

    if (editingId) {
      const { error } = await supabase.from("campaigns" as any).update(payload).eq("id", editingId);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Campaign updated");
    } else {
      const { error } = await supabase.from("campaigns" as any).insert(payload);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Campaign created");
    }

    setDialogOpen(false);
    fetchCampaigns();
  };

  const toggleStatus = async (c: Campaign) => {
    const newStatus = c.status === "active" ? "draft" : "active";
    await supabase.from("campaigns" as any).update({ status: newStatus }).eq("id", c.id);
    fetchCampaigns();
    toast.success(newStatus === "active" ? "Campaign activated" : "Campaign deactivated");
  };

  const deleteCampaign = async (id: string) => {
    await supabase.from("campaigns" as any).delete().eq("id", id);
    fetchCampaigns();
    toast.success("Campaign deleted");
  };

  const applyPreset = (key: string) => {
    const preset = SEASONAL_PRESETS[key];
    if (!preset) return;
    setForm({
      ...form,
      name: form.name || preset.name,
      campaign_type: "seasonal",
      theme_overrides: preset.theme,
      effects: preset.effects,
      banner_config: preset.banner,
    });
    toast.success(`Applied "${preset.name}" preset`);
  };

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

  const statusColor = (s: string) => {
    if (s === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    if (s === "scheduled") return "border-blue-500/30 bg-blue-500/10 text-blue-400";
    if (s === "ended") return "border-red-500/30 bg-red-500/10 text-red-400";
    return "border-border/30 bg-muted/30 text-muted-foreground";
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
            Campaigns & Themes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create campaigns with visual themes, particle effects, and automated scheduling · {activeCampaigns} active
          </p>
        </div>
        <Button onClick={openCreate} className="font-display uppercase tracking-wider">
          <Plus className="mr-2 h-4 w-4" /> New Campaign
        </Button>
      </div>

      {/* Seasonal Presets */}
      <div className="mb-6">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Start — Seasonal Presets</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(SEASONAL_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => { openCreate(); setTimeout(() => applyPreset(key), 100); }}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border/30 bg-card/50 p-4 transition-all hover:border-primary/30 hover:bg-card/70 card-interactive"
            >
              <preset.icon className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
              <span className="text-xs font-medium text-foreground">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <PromotionPopupBuilder />

      {/* Campaign Cards */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Megaphone className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No campaigns yet. Use a preset or create from scratch.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="group relative overflow-hidden">
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">{c.campaign_type}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusColor(c.status)}`}>
                    {c.status}
                  </Badge>
                </div>

                <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{c.description || "No description"}</p>

                <div className="mb-3 flex flex-wrap gap-1.5">
                  {c.effects?.particles && c.effects.particles !== "none" && (
                    <Badge variant="outline" className="border-0 bg-primary/5 text-[10px] text-primary">
                      <Sparkles className="mr-1 h-3 w-3" /> {c.effects.particles}
                    </Badge>
                  )}
                  {c.banner_config?.enabled && (
                    <Badge variant="outline" className="border-0 bg-amber-500/10 text-[10px] text-amber-400">
                      <Megaphone className="mr-1 h-3 w-3" /> Banner
                    </Badge>
                  )}
                  {c.is_recurring && (
                    <Badge variant="outline" className="border-0 bg-blue-500/10 text-[10px] text-blue-400">
                      <Clock className="mr-1 h-3 w-3" /> Recurring
                    </Badge>
                  )}
                </div>

                {(c.start_date || c.end_date) && (
                  <p className="mb-3 text-[10px] text-muted-foreground">
                    <Calendar className="mr-1 inline h-3 w-3" />
                    {c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"} → {c.end_date ? new Date(c.end_date).toLocaleDateString() : "Ongoing"}
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-border/20 pt-3">
                  <Button
                    variant={c.status === "active" ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleStatus(c)}
                    className="gap-1 text-xs"
                  >
                    {c.status === "active" ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                    {c.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCampaign(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">
              {editingId ? "Edit Campaign" : "Create Campaign"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="mt-2">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="theme">Theme</TabsTrigger>
              <TabsTrigger value="effects">Effects</TabsTrigger>
              <TabsTrigger value="banner">Banner</TabsTrigger>
              <TabsTrigger value="chat">Chat AI</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Summer Sale 2026" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={form.campaign_type} onValueChange={(v) => setForm({ ...form, campaign_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} />
                <Label className="text-xs">Recurring yearly</Label>
              </div>

              {/* Quick preset apply */}
              <div>
                <Label className="mb-2 block text-xs">Apply Seasonal Preset</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SEASONAL_PRESETS).map(([key, preset]) => (
                    <Button key={key} variant="outline" size="sm" onClick={() => applyPreset(key)} className="gap-1 text-xs">
                      <preset.icon className="h-3 w-3" /> {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="theme" className="space-y-4 pt-2">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-3 rounded-xl border border-border/30 bg-muted/10 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Theme color controls</p>
                  <AdminColorPicker
                    label="Primary Color"
                    value={form.theme_overrides.primaryColor || ""}
                    onChange={(value) => setForm({ ...form, theme_overrides: { ...form.theme_overrides, primaryColor: value } })}
                    defaultValue="217 91% 60%"
                    placeholder="217 91% 60%"
                    format="hsl"
                    description="Used for the main campaign glow and brand emphasis."
                  />
                  <AdminColorPicker
                    label="Accent Color"
                    value={form.theme_overrides.accentColor || ""}
                    onChange={(value) => setForm({ ...form, theme_overrides: { ...form.theme_overrides, accentColor: value } })}
                    defaultValue="200 80% 55%"
                    placeholder="200 80% 55%"
                    format="hsl"
                    description="Secondary highlights for borders, badges, and supporting UI accents."
                  />
                </div>

                <div className="space-y-3 rounded-xl border border-border/30 bg-card/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live color preview</p>
                  <div className="rounded-xl border border-border/20 p-4" style={{
                    background: `linear-gradient(135deg, hsl(${form.theme_overrides.primaryColor || "217 91% 60%"}) 0%, hsl(${form.theme_overrides.accentColor || "200 80% 55%"}) 100%)`,
                  }}>
                    <p className="font-display text-lg font-semibold uppercase tracking-wide text-white">Campaign Preview</p>
                    <p className="mt-1 text-xs text-white/85">Your storefront theme updates instantly with the chosen primary and accent colors.</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
                    <Switch
                      checked={form.theme_overrides.buttonGlow || false}
                      onCheckedChange={(v) => setForm({ ...form, theme_overrides: { ...form.theme_overrides, buttonGlow: v } })}
                    />
                    <div>
                      <Label className="text-xs">Button glow effect</Label>
                      <p className="text-[10px] text-muted-foreground">Keeps the existing animated glow behavior while making the theme easier to tune.</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="effects" className="space-y-4 pt-2">
              <div>
                <Label className="text-xs">Particle Effect</Label>
                <Select
                  value={form.effects.particles || "none"}
                  onValueChange={(v) => setForm({ ...form, effects: { ...form.effects, particles: v } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="snow">❄ Snow</SelectItem>
                    <SelectItem value="leaves">🍂 Leaves</SelectItem>
                    <SelectItem value="sparkles">✦ Sparkles</SelectItem>
                    <SelectItem value="hearts">♥ Hearts</SelectItem>
                    <SelectItem value="confetti">● Confetti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.effects.particles && form.effects.particles !== "none" && (
                <div>
                  <Label className="text-xs">Particle Density ({form.effects.particleDensity || 30})</Label>
                  <Slider
                    value={[form.effects.particleDensity || 30]}
                    onValueChange={([v]) => setForm({ ...form, effects: { ...form.effects, particleDensity: v } })}
                    min={5} max={60} step={5}
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.effects.glowPulse || false}
                  onCheckedChange={(v) => setForm({ ...form, effects: { ...form.effects, glowPulse: v } })}
                />
                <Label className="text-xs">Glow pulse effect</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.effects.animatedGradient || false}
                  onCheckedChange={(v) => setForm({ ...form, effects: { ...form.effects, animatedGradient: v } })}
                />
                <Label className="text-xs">Animated gradient background</Label>
              </div>
            </TabsContent>

            <TabsContent value="banner" className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.banner_config.enabled || false}
                  onCheckedChange={(v) => setForm({ ...form, banner_config: { ...form.banner_config, enabled: v } })}
                />
                <Label className="text-xs">Enable promotional banner</Label>
              </div>
              {form.banner_config.enabled && (
                <>
                  <div>
                    <Label className="text-xs">Banner Text</Label>
                    <Input
                      value={form.banner_config.text || ""}
                      onChange={(e) => setForm({ ...form, banner_config: { ...form.banner_config, text: e.target.value } })}
                      placeholder="🎄 Holiday sale is live!"
                    />
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <AdminColorPicker
                      label="Background Color"
                      value={form.banner_config.bgColor || ""}
                      onChange={(value) => setForm({ ...form, banner_config: { ...form.banner_config, bgColor: value } })}
                      defaultValue="hsl(0 72% 51%)"
                      placeholder="hsl(0 72% 51%)"
                      format="css"
                      description="Shown behind the campaign banner across the storefront."
                    />
                    <AdminColorPicker
                      label="Text Color"
                      value={form.banner_config.textColor || ""}
                      onChange={(value) => setForm({ ...form, banner_config: { ...form.banner_config, textColor: value } })}
                      defaultValue="#ffffff"
                      placeholder="#ffffff"
                      format="css"
                      description="Use a high-contrast text color for readability."
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Link (optional)</Label>
                    <Input
                      value={form.banner_config.link || ""}
                      onChange={(e) => setForm({ ...form, banner_config: { ...form.banner_config, link: e.target.value } })}
                      placeholder="/products"
                    />
                  </div>
                  {form.banner_config.text && (
                    <div>
                      <Label className="mb-1 block text-xs">Preview</Label>
                      <div
                        className="rounded-lg px-4 py-2 text-center text-sm font-medium"
                        style={{
                          background: form.banner_config.bgColor || "hsl(var(--primary))",
                          color: form.banner_config.textColor || "#fff",
                        }}
                      >
                        {form.banner_config.text}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="chat" className="space-y-4 pt-2">
              <div>
                <Label className="text-xs">Campaign Greeting</Label>
                <Textarea
                  value={form.chat_overrides.greeting || ""}
                  onChange={(e) => setForm({ ...form, chat_overrides: { ...form.chat_overrides, greeting: e.target.value } })}
                  placeholder="🎄 Ho ho ho! Welcome to our holiday sale..."
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">AI Tone Override</Label>
                <Select
                  value={form.chat_overrides.tone || "default"}
                  onValueChange={(v) => setForm({ ...form, chat_overrides: { ...form.chat_overrides, tone: v } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="festive">Festive & Fun</SelectItem>
                    <SelectItem value="urgent">Urgent & Exciting</SelectItem>
                    <SelectItem value="warm">Warm & Personal</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <AdminColorPicker
                label="Chat Header Color"
                value={form.chat_overrides.headerColor || ""}
                onChange={(value) => setForm({ ...form, chat_overrides: { ...form.chat_overrides, headerColor: value } })}
                defaultValue="0 72% 51%"
                placeholder="0 72% 51%"
                format="hsl"
                description="Applies the campaign color treatment to the chat header while preserving the existing override format."
              />
            </TabsContent>
          </Tabs>

          <Button onClick={handleSave} className="mt-4 w-full font-display uppercase tracking-wider">
            {editingId ? "Update Campaign" : "Create Campaign"}
          </Button>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCampaigns;
