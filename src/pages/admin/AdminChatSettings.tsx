import { useEffect, useState } from "react";
import { Save, Plus, Trash2, GripVertical, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminPageMultiSelect from "@/components/admin/AdminPageMultiSelect";
import AdminPageSelect from "@/components/admin/AdminPageSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_CHAT_CONFIG, type ChatConfig, type ChatQuickReply, type ChatPageRule } from "@/hooks/use-chat-settings";

function uid() { return Math.random().toString(36).slice(2, 10); }

const upsertSetting = async (key: string, value: any) => {
  const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
  if (existing) {
    await supabase.from("site_settings").update({ value: value as any }).eq("key", key);
  } else {
    await supabase.from("site_settings").insert({ key, value: value as any });
  }
};

/* Helper for localized text editing — just show EN for now */
function getStr(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.en ?? Object.values(val)[0] ?? "";
}
function setStr(val: any, text: string): any {
  if (!val || typeof val === "string") return text;
  return { ...val, en: text };
}

const AdminChatSettings = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CHAT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "chat_widget").maybeSingle();
      if (data?.value && typeof data.value === "object") {
        setConfig(prev => deepMerge(prev, data.value as any));
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await upsertSetting("chat_widget", config);
    setSaving(false);
    toast({ title: "Chat settings saved!" });
  };

  const set = <K extends keyof ChatConfig>(key: K, value: ChatConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const setNested = <K extends keyof ChatConfig>(section: K, field: string, value: any) => {
    setConfig(prev => ({ ...prev, [section]: { ...(prev[section] as any), [field]: value } }));
  };

  /* Quick reply helpers */
  const addQuickReply = () => {
    set("quickReplies", [...config.quickReplies, { id: uid(), label: "New action", message: "New action", sort_order: config.quickReplies.length }]);
  };
  const removeQuickReply = (id: string) => {
    set("quickReplies", config.quickReplies.filter(q => q.id !== id));
  };
  const updateQuickReply = (id: string, field: keyof ChatQuickReply, value: any) => {
    set("quickReplies", config.quickReplies.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  /* Page rule helpers */
  const addPageRule = () => {
    set("pageRules", [...config.pageRules, { page: "/new-page", enabled: true, focusArea: "general" }]);
  };
  const removePageRule = (idx: number) => {
    set("pageRules", config.pageRules.filter((_, i) => i !== idx));
  };
  const updatePageRule = (idx: number, field: keyof ChatPageRule, value: any) => {
    set("pageRules", config.pageRules.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading chat settings...</div>;
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-foreground">AI Chat Settings</h1>
          <p className="text-xs text-muted-foreground">Customize the AI assistant's appearance, behavior, tone, and context</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(!previewOpen)}>
            <Eye className="mr-1.5 h-4 w-4" /> Preview
          </Button>
          <Button onClick={save} disabled={saving} size="sm">
            <Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="launcher">Launcher</TabsTrigger>
          <TabsTrigger value="window">Window</TabsTrigger>
          <TabsTrigger value="bubbles">Bubbles</TabsTrigger>
          <TabsTrigger value="tone">Tone</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="greetings">Greetings</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="quickreplies">Quick Replies</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="responsive">Responsive</TabsTrigger>
        </TabsList>

        {/* ─── GENERAL ─── */}
        <TabsContent value="general" className="space-y-4">
          <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Global Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch checked={config.enabled} onCheckedChange={v => set("enabled", v)} />
                <Label>Enable AI Chat Widget</Label>
              </div>
              <div>
                <Label className="text-xs">Brand Name</Label>
                <Input value={getStr(config.window.brandName)} onChange={e => setNested("window", "brandName", setStr(config.window.brandName, e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">Avatar URL</Label>
                <Input value={config.window.avatarUrl ?? ""} onChange={e => setNested("window", "avatarUrl", e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">Disabled Pages (comma-separated paths)</Label>
                <AdminPageMultiSelect label="Disabled Pages" value={config.disabledPages} onChange={(v) => set("disabledPages", v)} allowAllPages={false} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── LAUNCHER ─── */}
        <TabsContent value="launcher" className="space-y-4">
          <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Launcher Button</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Position</Label>
                  <Select value={config.launcher.position} onValueChange={v => setNested("launcher", "position", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Icon Style</Label>
                  <Select value={config.launcher.icon} onValueChange={v => setNested("launcher", "icon", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message">Message</SelectItem>
                      <SelectItem value="bot">Bot</SelectItem>
                      <SelectItem value="sparkle">Sparkle</SelectItem>
                      <SelectItem value="custom">Custom Image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {config.launcher.icon === "custom" && (
                <div><Label className="text-xs">Custom Icon URL</Label><Input value={config.launcher.customIconUrl ?? ""} onChange={e => setNested("launcher", "customIconUrl", e.target.value)} /></div>
              )}
              <div>
                <Label className="text-xs">Size: {config.launcher.size}px</Label>
                <Slider value={[config.launcher.size]} onValueChange={([v]) => setNested("launcher", "size", v)} min={40} max={80} step={2} />
              </div>
              <div>
                <Label className="text-xs">Bottom Offset: {config.launcher.bottomOffset}px</Label>
                <Slider value={[config.launcher.bottomOffset]} onValueChange={([v]) => setNested("launcher", "bottomOffset", v)} min={8} max={80} step={4} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs">Background Color (HSL)</Label><Input value={config.launcher.bgColor ?? ""} onChange={e => setNested("launcher", "bgColor", e.target.value)} placeholder="var(--primary)" /></div>
                <div><Label className="text-xs">Icon Color (HSL)</Label><Input value={config.launcher.iconColor ?? ""} onChange={e => setNested("launcher", "iconColor", e.target.value)} placeholder="var(--primary-foreground)" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs">Glow Color (HSL)</Label><Input value={config.launcher.glowColor ?? ""} onChange={e => setNested("launcher", "glowColor", e.target.value)} /></div>
                <div><Label className="text-xs">Border Color (HSL)</Label><Input value={config.launcher.borderColor ?? ""} onChange={e => setNested("launcher", "borderColor", e.target.value)} /></div>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2"><Switch checked={config.launcher.shadow} onCheckedChange={v => setNested("launcher", "shadow", v)} /><Label className="text-xs">Shadow</Label></div>
                <div className="flex items-center gap-2"><Switch checked={config.launcher.pulseAnimation} onCheckedChange={v => setNested("launcher", "pulseAnimation", v)} /><Label className="text-xs">Pulse Animation</Label></div>
                <div className="flex items-center gap-2"><Switch checked={config.launcher.showUnreadBadge} onCheckedChange={v => setNested("launcher", "showUnreadBadge", v)} /><Label className="text-xs">Unread Badge</Label></div>
                <div className="flex items-center gap-2"><Switch checked={config.launcher.showLabel} onCheckedChange={v => setNested("launcher", "showLabel", v)} /><Label className="text-xs">Show Label</Label></div>
              </div>
              {config.launcher.showLabel && (
                <div><Label className="text-xs">Label Text</Label><Input value={getStr(config.launcher.labelText)} onChange={e => setNested("launcher", "labelText", e.target.value)} /></div>
              )}
              <div>
                <Label className="text-xs">Hover Animation</Label>
                <Select value={config.launcher.hoverAnimation} onValueChange={v => setNested("launcher", "hoverAnimation", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lift">Lift</SelectItem>
                    <SelectItem value="scale">Scale</SelectItem>
                    <SelectItem value="glow">Glow</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div><Label className="text-xs">Tooltip Text</Label><Input value={getStr(config.launcher.tooltipText)} onChange={e => setNested("launcher", "tooltipText", e.target.value)} /></div>
              <div>
                <Label className="text-xs">Tooltip Delay: {config.launcher.tooltipDelay / 1000}s</Label>
                <Slider value={[config.launcher.tooltipDelay]} onValueChange={([v]) => setNested("launcher", "tooltipDelay", v)} min={1000} max={30000} step={1000} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── WINDOW ─── */}
        <TabsContent value="window" className="space-y-4">
          <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Chat Window</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Width: {config.window.width}px</Label>
                  <Slider value={[config.window.width]} onValueChange={([v]) => setNested("window", "width", v)} min={300} max={600} step={10} />
                </div>
                <div><Label className="text-xs">Height</Label><Input value={config.window.height} onChange={e => setNested("window", "height", e.target.value)} placeholder="52vh" /></div>
              </div>
              <div>
                <Label className="text-xs">Border Radius: {config.window.borderRadius}px</Label>
                <Slider value={[config.window.borderRadius]} onValueChange={([v]) => setNested("window", "borderRadius", v)} min={0} max={40} step={2} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs">Background Color</Label><Input value={config.window.bgColor ?? ""} onChange={e => setNested("window", "bgColor", e.target.value)} /></div>
                <div><Label className="text-xs">Border Color</Label><Input value={config.window.borderColor ?? ""} onChange={e => setNested("window", "borderColor", e.target.value)} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs">Header BG Color</Label><Input value={config.window.headerBgColor ?? ""} onChange={e => setNested("window", "headerBgColor", e.target.value)} /></div>
                <div><Label className="text-xs">Send Button Color</Label><Input value={config.window.sendButtonColor ?? ""} onChange={e => setNested("window", "sendButtonColor", e.target.value)} /></div>
              </div>
              <div>
                <Label className="text-xs">Opacity: {config.window.opacity}%</Label>
                <Slider value={[config.window.opacity]} onValueChange={([v]) => setNested("window", "opacity", v)} min={50} max={100} step={5} />
              </div>
              <div className="flex items-center gap-2"><Switch checked={config.window.glassEffect} onCheckedChange={v => setNested("window", "glassEffect", v)} /><Label className="text-xs">Glass Effect</Label></div>
              <div><Label className="text-xs">Input Placeholder</Label><Input value={getStr(config.window.inputPlaceholder)} onChange={e => setNested("window", "inputPlaceholder", e.target.value)} placeholder="Ask me anything..." /></div>
              <div><Label className="text-xs">Empty State Text</Label><Input value={getStr(config.window.emptyStateText)} onChange={e => setNested("window", "emptyStateText", e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── BUBBLES ─── */}
        <TabsContent value="bubbles" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="font-display text-sm uppercase">AI Messages</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">BG Color</Label><Input value={config.bubbles.ai.bgColor ?? ""} onChange={e => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, ai: { ...p.bubbles.ai, bgColor: e.target.value } } }))} /></div>
                <div><Label className="text-xs">Text Color</Label><Input value={config.bubbles.ai.textColor ?? ""} onChange={e => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, ai: { ...p.bubbles.ai, textColor: e.target.value } } }))} /></div>
                <div>
                  <Label className="text-xs">Border Radius: {config.bubbles.ai.borderRadius}px</Label>
                  <Slider value={[config.bubbles.ai.borderRadius]} onValueChange={([v]) => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, ai: { ...p.bubbles.ai, borderRadius: v } } }))} min={0} max={24} step={2} />
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2"><Switch checked={config.bubbles.ai.showAvatar} onCheckedChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, ai: { ...p.bubbles.ai, showAvatar: v } } }))} /><Label className="text-xs">Avatar</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.bubbles.ai.showTimestamp} onCheckedChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, ai: { ...p.bubbles.ai, showTimestamp: v } } }))} /><Label className="text-xs">Timestamp</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.bubbles.ai.shadow} onCheckedChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, ai: { ...p.bubbles.ai, shadow: v } } }))} /><Label className="text-xs">Shadow</Label></div>
                </div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="font-display text-sm uppercase">User Messages</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">BG Color</Label><Input value={config.bubbles.user.bgColor ?? ""} onChange={e => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, user: { ...p.bubbles.user, bgColor: e.target.value } } }))} /></div>
                <div><Label className="text-xs">Text Color</Label><Input value={config.bubbles.user.textColor ?? ""} onChange={e => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, user: { ...p.bubbles.user, textColor: e.target.value } } }))} /></div>
                <div>
                  <Label className="text-xs">Border Radius: {config.bubbles.user.borderRadius}px</Label>
                  <Slider value={[config.bubbles.user.borderRadius]} onValueChange={([v]) => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, user: { ...p.bubbles.user, borderRadius: v } } }))} min={0} max={24} step={2} />
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2"><Switch checked={config.bubbles.user.showAvatar} onCheckedChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, user: { ...p.bubbles.user, showAvatar: v } } }))} /><Label className="text-xs">Avatar</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.bubbles.user.showTimestamp} onCheckedChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, user: { ...p.bubbles.user, showTimestamp: v } } }))} /><Label className="text-xs">Timestamp</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.bubbles.user.shadow} onCheckedChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, user: { ...p.bubbles.user, shadow: v } } }))} /><Label className="text-xs">Shadow</Label></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Effects</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Typing Indicator</Label>
                  <Select value={config.bubbles.typingIndicator} onValueChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, typingIndicator: v as any } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="dots">Dots</SelectItem><SelectItem value="pulse">Pulse</SelectItem><SelectItem value="wave">Wave</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Message Animation</Label>
                  <Select value={config.bubbles.messageAnimation} onValueChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, messageAnimation: v as any } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="fade">Fade</SelectItem><SelectItem value="slide">Slide</SelectItem><SelectItem value="none">None</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TONE ─── */}
        <TabsContent value="tone" className="space-y-4">
          <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Tone & Personality</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label className="text-xs">Personality</Label>
                  <Select value={config.tone.personality} onValueChange={v => setNested("tone", "personality", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="playful">Playful</SelectItem>
                      <SelectItem value="premium">Premium Brand Voice</SelectItem>
                      <SelectItem value="warm">Warm & Conversational</SelectItem>
                      <SelectItem value="concise">Concise & Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Response Length</Label>
                  <Select value={config.tone.responseLength} onValueChange={v => setNested("tone", "responseLength", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="short">Short</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="long">Long</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Conversation Style</Label>
                  <Select value={config.tone.conversationStyle} onValueChange={v => setNested("tone", "conversationStyle", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="direct">Direct</SelectItem><SelectItem value="conversational">Conversational</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Assistant Mode</Label>
                  <Select value={config.tone.assistantMode} onValueChange={v => setNested("tone", "assistantMode", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="support">Support Helper</SelectItem>
                      <SelectItem value="sales">Sales Assistant</SelectItem>
                      <SelectItem value="advisor">Product Advisor</SelectItem>
                      <SelectItem value="guide">Expert Guide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Formality</Label>
                  <Select value={config.tone.formalityLevel} onValueChange={v => setNested("tone", "formalityLevel", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="casual">Casual</SelectItem><SelectItem value="balanced">Balanced</SelectItem><SelectItem value="formal">Formal</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">CTA Style</Label>
                  <Select value={config.tone.ctaStyle} onValueChange={v => setNested("tone", "ctaStyle", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="soft">Soft</SelectItem><SelectItem value="direct">Direct</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Persuasive Style</Label>
                  <Select value={config.tone.persuasiveStyle} onValueChange={v => setNested("tone", "persuasiveStyle", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="subtle">Subtle</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="strong">Strong</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Upsell Intensity</Label>
                  <Select value={config.tone.upsellIntensity} onValueChange={v => setNested("tone", "upsellIntensity", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="light">Light</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="aggressive">Aggressive</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={config.tone.useEmoji} onCheckedChange={v => setNested("tone", "useEmoji", v)} /><Label className="text-xs">Use Emoji</Label></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PROMPTS ─── */}
        <TabsContent value="prompts" className="space-y-4">
          <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Training & Prompt Setup</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label className="text-xs">Brand Description</Label><Textarea value={config.prompts.brandDescription} onChange={e => setNested("prompts", "brandDescription", e.target.value)} rows={2} /></div>
              <div><Label className="text-xs">Assistant Role</Label><Textarea value={config.prompts.assistantRole} onChange={e => setNested("prompts", "assistantRole", e.target.value)} rows={2} /></div>
              <div><Label className="text-xs">Tone Instructions</Label><Textarea value={config.prompts.toneInstructions} onChange={e => setNested("prompts", "toneInstructions", e.target.value)} rows={2} /></div>
              <div><Label className="text-xs">Product Guidance</Label><Textarea value={config.prompts.productGuidance} onChange={e => setNested("prompts", "productGuidance", e.target.value)} rows={2} /></div>
              <div><Label className="text-xs">Support Instructions</Label><Textarea value={config.prompts.supportInstructions} onChange={e => setNested("prompts", "supportInstructions", e.target.value)} rows={2} /></div>
              <div><Label className="text-xs">Things to Avoid</Label><Textarea value={config.prompts.thingsToAvoid} onChange={e => setNested("prompts", "thingsToAvoid", e.target.value)} rows={2} /></div>
              <div><Label className="text-xs">Campaign Instructions</Label><Textarea value={config.prompts.campaignInstructions} onChange={e => setNested("prompts", "campaignInstructions", e.target.value)} rows={2} /></div>
              <div><Label className="text-xs">Escalation Rules</Label><Textarea value={config.prompts.escalationRules} onChange={e => setNested("prompts", "escalationRules", e.target.value)} rows={2} /></div>
              <div><Label className="text-xs">Fallback Response</Label><Input value={getStr(config.prompts.fallbackResponse)} onChange={e => setNested("prompts", "fallbackResponse", setStr(config.prompts.fallbackResponse, e.target.value))} /></div>
              <div><Label className="text-xs">Custom System Prompt Suffix (appended to auto-generated prompt)</Label><Textarea value={config.prompts.customSystemPromptSuffix} onChange={e => setNested("prompts", "customSystemPromptSuffix", e.target.value)} rows={3} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── GREETINGS ─── */}
        <TabsContent value="greetings" className="space-y-4">
          <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Greetings & Prompts</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label className="text-xs">Default Greeting</Label><Textarea value={getStr(config.greetings.defaultGreeting)} onChange={e => setNested("greetings", "defaultGreeting", setStr(config.greetings.defaultGreeting, e.target.value))} rows={2} /></div>
              <div><Label className="text-xs">Logged-in Greeting</Label><Textarea value={getStr(config.greetings.loggedInGreeting)} onChange={e => setNested("greetings", "loggedInGreeting", setStr(config.greetings.loggedInGreeting, e.target.value))} rows={2} /></div>
              <div><Label className="text-xs">Returning Visitor Greeting</Label><Textarea value={getStr(config.greetings.returningVisitorGreeting)} onChange={e => setNested("greetings", "returningVisitorGreeting", setStr(config.greetings.returningVisitorGreeting, e.target.value))} rows={2} /></div>
              <div><Label className="text-xs">First-time Visitor Greeting</Label><Textarea value={getStr(config.greetings.firstTimeVisitorGreeting)} onChange={e => setNested("greetings", "firstTimeVisitorGreeting", setStr(config.greetings.firstTimeVisitorGreeting, e.target.value))} rows={2} /></div>
              <Separator />
              <div><Label className="text-xs">Business Hours Greeting</Label><Input value={getStr(config.greetings.businessHoursGreeting)} onChange={e => setNested("greetings", "businessHoursGreeting", e.target.value)} /></div>
              <div><Label className="text-xs">Off-hours Greeting</Label><Input value={getStr(config.greetings.offHoursGreeting)} onChange={e => setNested("greetings", "offHoursGreeting", e.target.value)} /></div>
              <Separator />
              <div><Label className="text-xs">Prompt Bubble Title</Label><Input value={getStr(config.greetings.promptBubbleTitle)} onChange={e => setNested("greetings", "promptBubbleTitle", setStr(config.greetings.promptBubbleTitle, e.target.value))} /></div>
              <div><Label className="text-xs">Prompt Bubble Body</Label><Textarea value={getStr(config.greetings.promptBubbleBody)} onChange={e => setNested("greetings", "promptBubbleBody", setStr(config.greetings.promptBubbleBody, e.target.value))} rows={2} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Prompt Delay: {config.greetings.promptBubbleDelay / 1000}s</Label>
                  <Slider value={[config.greetings.promptBubbleDelay]} onValueChange={([v]) => setNested("greetings", "promptBubbleDelay", v)} min={2000} max={30000} step={1000} />
                </div>
                <div>
                  <Label className="text-xs">Reappear Delay: {config.greetings.promptBubbleReappear / 1000}s</Label>
                  <Slider value={[config.greetings.promptBubbleReappear]} onValueChange={([v]) => setNested("greetings", "promptBubbleReappear", v)} min={30000} max={600000} step={30000} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── BEHAVIOR ─── */}
        <TabsContent value="behavior" className="space-y-4">
          <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Response Behavior</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Prioritize</Label>
                <Select value={config.behavior.prioritize} onValueChange={v => setNested("behavior", "prioritize", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="support">Support</SelectItem><SelectItem value="selling">Selling</SelectItem><SelectItem value="balanced">Balanced</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(config.behavior) as (keyof typeof config.behavior)[]).filter(k => typeof config.behavior[k] === "boolean").map(key => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch checked={config.behavior[key] as boolean} onCheckedChange={v => setNested("behavior", key, v)} />
                    <Label className="text-xs">{key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── QUICK REPLIES ─── */}
        <TabsContent value="quickreplies" className="space-y-4">
          <Card><CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-sm uppercase">Quick Replies</CardTitle>
            <Button size="sm" variant="outline" onClick={addQuickReply}><Plus className="mr-1 h-3 w-3" /> Add</Button>
          </CardHeader>
            <CardContent className="space-y-3">
              {config.quickReplies.map((qr) => (
                <div key={qr.id} className="flex items-start gap-2 rounded-lg border border-border/30 bg-muted/30 p-3">
                  <GripVertical className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div><Label className="text-xs">Label</Label><Input value={getStr(qr.label)} onChange={e => updateQuickReply(qr.id, "label", e.target.value)} /></div>
                      <div><Label className="text-xs">Message sent</Label><Input value={getStr(qr.message)} onChange={e => updateQuickReply(qr.id, "message", e.target.value)} /></div>
                    </div>
                    <AdminPageMultiSelect label="Pages (empty = all)" value={qr.pages ?? []} onChange={(v) => updateQuickReply(qr.id, "pages", v.length > 0 ? v : undefined)} />
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeQuickReply(qr.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {config.quickReplies.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No quick replies configured</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PAGES ─── */}
        <TabsContent value="pages" className="space-y-4">
          <Card><CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-sm uppercase">Page-based Rules</CardTitle>
            <Button size="sm" variant="outline" onClick={addPageRule}><Plus className="mr-1 h-3 w-3" /> Add Rule</Button>
          </CardHeader>
            <CardContent className="space-y-3">
              {config.pageRules.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-lg border border-border/30 bg-muted/30 p-3">
                  <div className="flex-1 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <AdminPageSelect label="Page" value={rule.page} onChange={(v) => updatePageRule(idx, "page", v)} allowAdvanced={true} />
                      <div>
                        <Label className="text-xs">Focus Area</Label>
                        <Select value={rule.focusArea ?? "general"} onValueChange={v => updatePageRule(idx, "focusArea", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="product_help">Product Help</SelectItem>
                            <SelectItem value="checkout_assist">Checkout Assist</SelectItem>
                            <SelectItem value="account_support">Account Support</SelectItem>
                            <SelectItem value="custom_order_help">Custom Order Help</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-2 pb-1">
                        <Switch checked={rule.enabled} onCheckedChange={v => updatePageRule(idx, "enabled", v)} />
                        <Label className="text-xs">Enabled</Label>
                      </div>
                    </div>
                    <div><Label className="text-xs">Custom Welcome Text</Label><Input value={getStr(rule.welcomeText)} onChange={e => updatePageRule(idx, "welcomeText", e.target.value)} placeholder="Optional override" /></div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removePageRule(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── RESPONSIVE ─── */}
        <TabsContent value="responsive" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Desktop</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Position</Label><Input value={config.responsive.desktop.position} onChange={e => setConfig(p => ({ ...p, responsive: { ...p.responsive, desktop: { ...p.responsive.desktop, position: e.target.value } } }))} /></div>
                <div>
                  <Label className="text-xs">Size: {config.responsive.desktop.size}px</Label>
                  <Slider value={[config.responsive.desktop.size]} onValueChange={([v]) => setConfig(p => ({ ...p, responsive: { ...p.responsive, desktop: { ...p.responsive.desktop, size: v } } }))} min={40} max={80} step={2} />
                </div>
                <div><Label className="text-xs">Window Height</Label><Input value={config.responsive.desktop.windowHeight} onChange={e => setConfig(p => ({ ...p, responsive: { ...p.responsive, desktop: { ...p.responsive.desktop, windowHeight: e.target.value } } }))} /></div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Mobile</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Position</Label><Input value={config.responsive.mobile.position} onChange={e => setConfig(p => ({ ...p, responsive: { ...p.responsive, mobile: { ...p.responsive.mobile, position: e.target.value } } }))} /></div>
                <div>
                  <Label className="text-xs">Size: {config.responsive.mobile.size}px</Label>
                  <Slider value={[config.responsive.mobile.size]} onValueChange={([v]) => setConfig(p => ({ ...p, responsive: { ...p.responsive, mobile: { ...p.responsive.mobile, size: v } } }))} min={36} max={64} step={2} />
                </div>
                <div><Label className="text-xs">Window Height</Label><Input value={config.responsive.mobile.windowHeight} onChange={e => setConfig(p => ({ ...p, responsive: { ...p.responsive, mobile: { ...p.responsive.mobile, windowHeight: e.target.value } } }))} /></div>
                <div>
                  <Label className="text-xs">Minimized Style</Label>
                  <Select value={config.responsive.mobile.minimizedStyle} onValueChange={v => setConfig(p => ({ ...p, responsive: { ...p.responsive, mobile: { ...p.responsive.mobile, minimizedStyle: v as any } } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="fab">FAB</SelectItem><SelectItem value="bar">Bar</SelectItem></SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

function deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && typeof (target as any)[key] === "object" && !Array.isArray((target as any)[key])) {
      (result as any)[key] = deepMerge((target as any)[key], source[key]);
    } else if (source[key] !== undefined) {
      (result as any)[key] = source[key];
    }
  }
  return result;
}

export default AdminChatSettings;
