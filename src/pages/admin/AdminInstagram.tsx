import { useEffect, useState, useCallback } from "react";
import {
  Instagram, RefreshCw, Unplug, CheckCircle2, AlertTriangle,
  Loader2, Settings2, Eye, Grid3X3, Film, Image as ImageIcon,
  Clock, ExternalLink, Trash2, Link2,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type InstagramSettings = {
  id: string;
  is_connected: boolean;
  username: string | null;
  account_id: string | null;
  last_sync_at: string | null;
  sync_status: string;
  sync_error: string | null;
  display_config: Record<string, any>;
};

type MediaItem = {
  id: string;
  instagram_media_id: string;
  media_type: string;
  caption: string | null;
  permalink: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  timestamp: string | null;
  username: string | null;
  is_story: boolean;
  is_reel: boolean;
  sync_status: string;
};

const DEFAULT_DISPLAY_CONFIG = {
  content_types: ["IMAGE", "VIDEO", "CAROUSEL_ALBUM"],
  items_to_show: 12,
  layout: "grid",
  show_captions: false,
  show_dates: false,
  show_profile_header: true,
  show_cta: true,
  show_reel_badge: true,
  click_action: "instagram",
  autoplay_reels: false,
  aspect_ratio: "square",
};

export default function AdminInstagram() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<InstagramSettings | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [displayConfig, setDisplayConfig] = useState(DEFAULT_DISPLAY_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: m }] = await Promise.all([
      supabase.from("instagram_settings").select("*").limit(1).single(),
      supabase
        .from("instagram_media")
        .select("*")
        .eq("sync_status", "active")
        .order("timestamp", { ascending: false })
        .limit(50),
    ]);
    if (s) {
      setSettings(s as any);
      setDisplayConfig({ ...DEFAULT_DISPLAY_CONFIG, ...((s as any).display_config || {}) });
    }
    setMedia((m as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const callSync = async (action: string, extra: Record<string, any> = {}) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-sync`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ action, ...extra }),
    });
    return res.json();
  };

  const handleConnect = async () => {
    if (!tokenInput.trim()) {
      toast({ title: "Enter an access token", variant: "destructive" });
      return;
    }
    setConnecting(true);
    try {
      const result = await callSync("connect", { access_token: tokenInput.trim() });
      if (result.error) {
        toast({ title: "Connection failed", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Connected!", description: `@${result.username} linked successfully.` });
        setTokenInput("");
        await load();
      }
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setSyncing(true);
    try {
      await callSync("disconnect");
      toast({ title: "Disconnected" });
      await load();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await callSync("sync");
      if (result.error) {
        toast({ title: "Sync failed", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Synced", description: `${result.synced} items synced.` });
        await load();
      }
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshToken = async () => {
    setSyncing(true);
    try {
      const result = await callSync("refresh_token");
      toast({ title: result.success ? "Token refreshed" : "Refresh failed", variant: result.success ? "default" : "destructive" });
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const saveDisplayConfig = async () => {
    setSavingConfig(true);
    try {
      await supabase
        .from("instagram_settings")
        .update({ display_config: displayConfig as any })
        .not("id", "is", null);
      toast({ title: "Display settings saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  const isConnected = settings?.is_connected ?? false;

  const statusIcon = () => {
    if (!settings) return null;
    switch (settings.sync_status) {
      case "connected": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "syncing": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "error": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Unplug className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Instagram className="h-6 w-6 text-pink-500" />
            <div>
              <h1 className="text-2xl font-bold">Instagram Integration</h1>
              <p className="text-sm text-muted-foreground">
                Automatically sync your Instagram content to the website
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusIcon()}
            <Badge variant={isConnected ? "default" : "secondary"}>
              {settings?.sync_status || "disconnected"}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="connection">
          <TabsList>
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="display">Display Settings</TabsTrigger>
            <TabsTrigger value="media">Synced Media ({media.length})</TabsTrigger>
          </TabsList>

          {/* ─── Connection Tab ─── */}
          <TabsContent value="connection" className="space-y-4">
            {isConnected ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Connected to @{settings?.username}
                  </CardTitle>
                  <CardDescription>
                    Account ID: {settings?.account_id}
                    {settings?.last_sync_at && (
                      <> · Last synced: {format(new Date(settings.last_sync_at), "PPp")}</>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings?.sync_error && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertTriangle className="mb-1 inline h-4 w-4" /> {settings.sync_error}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSync} disabled={syncing}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                      Sync Now
                    </Button>
                    <Button variant="outline" onClick={handleRefreshToken} disabled={syncing}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Refresh Token
                    </Button>
                    <Button variant="destructive" onClick={handleDisconnect} disabled={syncing}>
                      <Unplug className="mr-2 h-4 w-4" /> Disconnect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Connect Instagram Account</CardTitle>
                  <CardDescription>
                    Use an Instagram Graph API / Basic Display API access token to connect your account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-muted/50 p-4 text-sm space-y-2">
                    <p className="font-medium">How to get your access token:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline text-primary">Meta for Developers</a></li>
                      <li>Create a Facebook App (type: Consumer or Business)</li>
                      <li>Add the "Instagram Basic Display" or "Instagram Graph API" product</li>
                      <li>Add your Instagram account as a test user and accept the invitation</li>
                      <li>Generate a User Token from the Basic Display → User Token Generator</li>
                      <li>Copy the token and paste it below</li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-2">
                      If you have an <strong>INSTAGRAM_APP_SECRET</strong> configured, the short-lived token will be automatically exchanged for a long-lived token (60 days).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram Access Token</Label>
                    <Input
                      type="password"
                      placeholder="Paste your access token here..."
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleConnect} disabled={connecting || !tokenInput.trim()}>
                    {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                    Connect Account
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* API Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">API & Stories Information</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Posts & Reels:</strong> Fully supported via the Instagram Graph API. Posts and Reels are synced automatically and cached in your database.
                </p>
                <p>
                  <strong>Stories:</strong> The Instagram Basic Display API does <strong>not</strong> support fetching Stories. The Graph API (Business/Creator accounts) supports Stories but they are only available for 24 hours and require the <code>instagram_manage_insights</code> permission. If your token has this scope, stories will sync automatically. Otherwise, stories are not available through this integration.
                </p>
                <p>
                  <strong>Token Refresh:</strong> Long-lived tokens last ~60 days. Use the "Refresh Token" button periodically, or we'll show a warning when your token is about to expire.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Display Tab ─── */}
          <TabsContent value="display" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Block Display Configuration</CardTitle>
                <CardDescription>
                  Configure how Instagram content appears on your website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Content Types */}
                <div className="space-y-3">
                  <Label className="font-medium">Content Types to Display</Label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: "IMAGE", label: "Posts", icon: ImageIcon },
                      { key: "VIDEO", label: "Reels", icon: Film },
                      { key: "CAROUSEL_ALBUM", label: "Carousels", icon: Grid3X3 },
                    ].map(({ key, label, icon: Icon }) => {
                      const active = displayConfig.content_types.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            const types = active
                              ? displayConfig.content_types.filter((t: string) => t !== key)
                              : [...displayConfig.content_types, key];
                            setDisplayConfig((c) => ({ ...c, content_types: types }));
                          }}
                          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
                            active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Layout */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Layout</Label>
                    <Select
                      value={displayConfig.layout}
                      onValueChange={(v) => setDisplayConfig((c) => ({ ...c, layout: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">Grid</SelectItem>
                        <SelectItem value="slider">Slider</SelectItem>
                        <SelectItem value="masonry">Masonry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Items to Show: {displayConfig.items_to_show}</Label>
                    <Slider
                      value={[displayConfig.items_to_show]}
                      onValueChange={([v]) => setDisplayConfig((c) => ({ ...c, items_to_show: v }))}
                      min={3}
                      max={24}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
                    <Select
                      value={displayConfig.aspect_ratio}
                      onValueChange={(v) => setDisplayConfig((c) => ({ ...c, aspect_ratio: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="square">Square (1:1)</SelectItem>
                        <SelectItem value="portrait">Portrait (4:5)</SelectItem>
                        <SelectItem value="landscape">Landscape (16:9)</SelectItem>
                        <SelectItem value="auto">Auto (Original)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Click Action</Label>
                    <Select
                      value={displayConfig.click_action}
                      onValueChange={(v) => setDisplayConfig((c) => ({ ...c, click_action: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Open on Instagram</SelectItem>
                        <SelectItem value="lightbox">Open Lightbox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Toggles */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { key: "show_captions", label: "Show Captions" },
                    { key: "show_dates", label: "Show Dates" },
                    { key: "show_profile_header", label: "Show Profile Header" },
                    { key: "show_cta", label: "Show Follow CTA" },
                    { key: "show_reel_badge", label: "Show Reel Badge" },
                    { key: "autoplay_reels", label: "Autoplay Reel Previews" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                      <Label>{label}</Label>
                      <Switch
                        checked={displayConfig[key as keyof typeof displayConfig] as boolean}
                        onCheckedChange={(v) => setDisplayConfig((c) => ({ ...c, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>

                <Button onClick={saveDisplayConfig} disabled={savingConfig}>
                  {savingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings2 className="mr-2 h-4 w-4" />}
                  Save Display Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Media Tab ─── */}
          <TabsContent value="media" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {media.length} items synced
                {settings?.last_sync_at && <> · Last sync: {format(new Date(settings.last_sync_at), "PPp")}</>}
              </p>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || !isConnected}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                Sync Now
              </Button>
            </div>

            {media.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Instagram className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p>{isConnected ? "No media synced yet. Click Sync Now." : "Connect your account first."}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {media.map((item) => (
                  <div key={item.id} className="group relative overflow-hidden rounded-xl border bg-card">
                    <div className="aspect-square">
                      {(item.media_url || item.thumbnail_url) ? (
                        <img
                          src={item.media_type === "VIDEO" ? (item.thumbnail_url || item.media_url || "") : (item.media_url || "")}
                          alt={item.caption || "Instagram media"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    {/* Overlay badges */}
                    <div className="absolute left-2 top-2 flex gap-1">
                      {item.is_reel && (
                        <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur">
                          <Film className="mr-1 h-3 w-3" /> Reel
                        </Badge>
                      )}
                      {item.media_type === "CAROUSEL_ALBUM" && (
                        <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur">
                          <Grid3X3 className="mr-1 h-3 w-3" /> Album
                        </Badge>
                      )}
                    </div>
                    {/* Bottom info */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                      <p className="line-clamp-2 text-xs text-white">
                        {item.caption || "No caption"}
                      </p>
                      {item.timestamp && (
                        <p className="mt-1 text-xs text-white/60">
                          {format(new Date(item.timestamp), "PP")}
                        </p>
                      )}
                    </div>
                    {/* Link icon */}
                    {item.permalink && (
                      <a
                        href={item.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 opacity-0 transition group-hover:opacity-100 hover:bg-background"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
