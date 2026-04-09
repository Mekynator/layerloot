import React, { useEffect, useState, useMemo, useRef, useCallback, useTransition } from "react";

const LazyPersonalization = React.lazy(() => import("./AdminPersonalization"));
const LazyActivityLog = React.lazy(() => import("./AdminActivity"));
import {
  Save, Plus, Trash2, GripVertical, Eye, MessageCircle,
  BarChart3, Users, TrendingUp, Brain, FlaskConical,
  Heart, AlertTriangle, Edit, Flag, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronRight, Search, RefreshCw, Send, Bot, User,
  Activity, Zap, Target, HelpCircle, BookOpen, X, Undo2,
  Settings2, Palette, Volume2, FileText, Sparkles, Megaphone,
  Gauge, Wand2, LayoutTemplate, Check, Copy, ArrowRight,
  ChevronsUpDown, ChevronsDownUp,
} from "lucide-react";
import ChatLivePreview from "@/components/admin/ChatLivePreview";
import ColorPickerField from "@/components/admin/editor/controls/ColorPickerField";
import ImageUploadPlaceholder from "@/components/admin/editor/controls/ImageUploadPlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { DEFAULT_CHAT_CONFIG, BUILT_IN_PRESETS, type ChatConfig, type ChatQuickReply, type ChatPageRule, type ChatPreset } from "@/hooks/use-chat-settings";
import { format } from "date-fns";

/* ─── Helpers ─── */
function uid() { return Math.random().toString(36).slice(2, 10); }

const upsertSetting = async (key: string, value: any) => {
  const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
  if (existing) {
    await supabase.from("site_settings").update({ value: value as any }).eq("key", key);
  } else {
    await supabase.from("site_settings").insert({ key, value: value as any });
  }
};

function getStr(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.en ?? Object.values(val)[0] ?? "";
}
function setStr(val: any, text: string): any {
  if (!val || typeof val === "string") return text;
  return { ...val, en: text };
}

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

/* ─── Types ─── */
type AnalyticsEvent = { id: string; session_id: string; event_type: string; event_data: any; page: string | null; campaign_id: string | null; user_id: string | null; created_at: string; };
type Conversation = { id: string; session_id: string; user_id: string | null; messages: any[]; page: string | null; campaign_id: string | null; language: string; started_at: string; ended_at: string | null; message_count: number; outcome: string; metadata: any; admin_flags: any; created_at: string; };
type KBEntry = { id: string; question: string; answer: string; category: string; is_active: boolean; priority: number; created_by: string | null; created_at: string; updated_at: string; };
const KB_CATEGORIES = ["general", "products", "shipping", "materials", "custom_orders", "rewards"];

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════════════════════ */
function OverviewTab({ config, setTab }: { config: ChatConfig; setTab: (t: string) => void }) {
  const [stats, setStats] = useState({ opens: 0, messages: 0, conversions: 0, sessions: 0 });

  useEffect(() => {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    supabase.from("chat_analytics_events").select("event_type, session_id").gte("created_at", since).limit(1000)
      .then(({ data }) => {
        const events = (data as any[]) ?? [];
        setStats({
          opens: events.filter(e => e.event_type === "open").length,
          messages: events.filter(e => e.event_type === "message").length,
          conversions: events.filter(e => e.event_type === "conversion").length,
          sessions: new Set(events.map(e => e.session_id)).size,
        });
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Status", value: config.enabled ? "Enabled" : "Disabled", color: config.enabled ? "text-emerald-400" : "text-rose-400" },
          { label: "Chat Opens (7d)", value: String(stats.opens), color: "text-primary" },
          { label: "Messages (7d)", value: String(stats.messages), color: "text-blue-400" },
          { label: "Conversions (7d)", value: String(stats.conversions), color: "text-amber-400" },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Personality</p>
            <p className="text-sm capitalize">{config.tone.personality} · {config.tone.assistantMode}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Welcome Message</p>
            <p className="text-sm line-clamp-2">{getStr(config.greetings.defaultGreeting) || "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Quick Replies</p>
            <p className="text-sm">{config.quickReplies.length} configured</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Edit UI", tab: "appearance" },
          { label: "Edit Tone", tab: "tone" },
          { label: "Edit Prompts", tab: "training" },
          { label: "View Analytics", tab: "analytics" },
          { label: "Test Chat", tab: "sandbox" },
          { label: "View Logs", tab: "logs" },
        ].map(a => (
          <Button key={a.tab} variant="outline" size="sm" onClick={() => setTab(a.tab)}>{a.label}</Button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANALYTICS TAB (from AdminChatAnalytics DashboardTab)
   ═══════════════════════════════════════════════════════════════ */
function AnalyticsTab() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchEvents = async () => {
    setLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await supabase.from("chat_analytics_events").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(1000);
    setEvents((data as any[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchEvents(); }, [days]);

  const stats = useMemo(() => {
    const sessions = new Set(events.map(e => e.session_id));
    const messages = events.filter(e => e.event_type === "message");
    const conversions = events.filter(e => e.event_type === "conversion");
    const uniqueUsers = new Set(events.filter(e => e.user_id).map(e => e.user_id));
    return {
      totalSessions: sessions.size, totalMessages: messages.length,
      uniqueUsers: uniqueUsers.size,
      quickReplyClicks: events.filter(e => e.event_type === "quick_reply_click").length,
      productClicks: events.filter(e => e.event_type === "product_click").length,
      conversions: conversions.length,
      conversionRate: sessions.size > 0 ? ((conversions.length / sessions.size) * 100).toFixed(1) : "0",
      avgMessages: sessions.size > 0 ? (messages.length / sessions.size).toFixed(1) : "0",
    };
  }, [events]);

  const topPages = useMemo(() => {
    const map: Record<string, number> = {};
    events.filter(e => e.event_type === "open" && e.page).forEach(e => { map[e.page!] = (map[e.page!] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [events]);

  const topQuickReplies = useMemo(() => {
    const map: Record<string, number> = {};
    events.filter(e => e.event_type === "quick_reply_click").forEach(e => { const t = e.event_data?.text || "unknown"; map[t] = (map[t] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analytics Overview</h2>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem><SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchEvents} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Chat Sessions", value: stats.totalSessions, icon: MessageCircle, color: "text-primary" },
          { label: "Unique Users", value: stats.uniqueUsers, icon: Users, color: "text-blue-500" },
          { label: "Messages Sent", value: stats.totalMessages, icon: Send, color: "text-green-500" },
          { label: "Conversion Rate", value: `${stats.conversionRate}%`, icon: Target, color: "text-amber-500" },
          { label: "Avg Msgs/Session", value: stats.avgMessages, icon: BarChart3, color: "text-purple-500" },
          { label: "Quick Reply Clicks", value: stats.quickReplyClicks, icon: Zap, color: "text-cyan-500" },
          { label: "Product Clicks", value: stats.productClicks, icon: TrendingUp, color: "text-rose-500" },
          { label: "Conversions", value: stats.conversions, icon: Heart, color: "text-emerald-500" },
        ].map(s => (
          <Card key={s.label} className="border-border/50"><CardContent className="flex items-center gap-3 p-4">
            <s.icon className={`h-8 w-8 ${s.color}`} /><div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Top Pages</CardTitle></CardHeader><CardContent>
          {topPages.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : <div className="space-y-2">{topPages.map(([p, c]) => <div key={p} className="flex items-center justify-between text-sm"><span className="truncate text-muted-foreground">{p}</span><Badge variant="secondary">{c}</Badge></div>)}</div>}
        </CardContent></Card>
        <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Top Quick Replies</CardTitle></CardHeader><CardContent>
          {topQuickReplies.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : <div className="space-y-2">{topQuickReplies.map(([t, c]) => <div key={t} className="flex items-center justify-between text-sm"><span className="truncate text-muted-foreground">{t}</span><Badge variant="secondary">{c}</Badge></div>)}</div>}
        </CardContent></Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONVERSATIONS TAB
   ═══════════════════════════════════════════════════════════════ */
function ConversationsTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchConversations = async () => {
    setLoading(true);
    let query = supabase.from("chat_conversations").select("*").order("created_at", { ascending: false }).limit(200);
    if (outcomeFilter !== "all") query = query.eq("outcome", outcomeFilter);
    const { data } = await query;
    setConversations((data as any[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchConversations(); }, [outcomeFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(c => {
      const msgs = Array.isArray(c.messages) ? c.messages : [];
      return msgs.some((m: any) => m.content?.toLowerCase().includes(q)) || c.page?.toLowerCase().includes(q) || c.session_id.toLowerCase().includes(q);
    });
  }, [conversations, search]);

  const toggleFlag = async (conv: Conversation, flag: string) => {
    const flags = conv.admin_flags || {};
    const updated = { ...flags, [flag]: !flags[flag] };
    await supabase.from("chat_conversations").update({ admin_flags: updated }).eq("id", conv.id);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, admin_flags: updated } : c));
    sonnerToast.success(`Conversation ${updated[flag] ? "flagged" : "unflagged"}`);
  };

  const outcomeColor: Record<string, string> = { converted: "bg-emerald-500/20 text-emerald-400", resolved: "bg-blue-500/20 text-blue-400", abandoned: "bg-amber-500/20 text-amber-400", unknown: "bg-muted text-muted-foreground" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..." className="pl-9" />
        </div>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Outcome" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="converted">Converted</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="abandoned">Abandoned</SelectItem><SelectItem value="unknown">Unknown</SelectItem></SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchConversations} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
      </div>
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="border-border/50"><CardContent className="py-12 text-center text-muted-foreground">No conversations found</CardContent></Card>
        ) : filtered.map(conv => (
          <Card key={conv.id} className="border-border/50">
            <CardContent className="p-0">
              <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors" onClick={() => setExpandedId(expandedId === conv.id ? null : conv.id)}>
                {expandedId === conv.id ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{conv.page || "/"}</span>
                    <Badge className={`text-[10px] ${outcomeColor[conv.outcome] || outcomeColor.unknown}`}>{conv.outcome}</Badge>
                    <Badge variant="outline" className="text-[10px]">{conv.message_count} msgs</Badge>
                    {conv.admin_flags?.flagged && <Flag className="h-3 w-3 text-amber-500" />}
                    {conv.admin_flags?.useful && <ThumbsUp className="h-3 w-3 text-emerald-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(conv.started_at), "MMM d, yyyy HH:mm")} · {conv.language} · {conv.user_id ? "Logged in" : "Guest"}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); toggleFlag(conv, "flagged"); }}><Flag className={`h-3.5 w-3.5 ${conv.admin_flags?.flagged ? "text-amber-500" : ""}`} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); toggleFlag(conv, "useful"); }}><ThumbsUp className={`h-3.5 w-3.5 ${conv.admin_flags?.useful ? "text-emerald-500" : ""}`} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); toggleFlag(conv, "not_useful"); }}><ThumbsDown className={`h-3.5 w-3.5 ${conv.admin_flags?.not_useful ? "text-rose-500" : ""}`} /></Button>
                </div>
              </button>
              {expandedId === conv.id && (
                <div className="border-t border-border/30 bg-muted/20 p-4 space-y-2 max-h-[400px] overflow-y-auto">
                  {(Array.isArray(conv.messages) ? conv.messages : []).map((msg: any, i: number) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                      </div>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${msg.role === "user" ? "bg-primary/20 text-foreground" : "bg-muted text-foreground"}`}>{msg.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KNOWLEDGE BASE TAB
   ═══════════════════════════════════════════════════════════════ */
function KnowledgeBaseTab() {
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState<Partial<KBEntry> | null>(null);
  const [catFilter, setCatFilter] = useState("all");

  const fetchEntries = async () => { setLoading(true); const { data } = await supabase.from("chat_knowledge_base").select("*").order("priority", { ascending: false }); setEntries((data as any[]) ?? []); setLoading(false); };
  useEffect(() => { fetchEntries(); }, []);

  const filtered = catFilter === "all" ? entries : entries.filter(e => e.category === catFilter);

  const save = async () => {
    if (!editEntry?.question?.trim() || !editEntry?.answer?.trim()) { sonnerToast.error("Question and answer required"); return; }
    const payload = { question: editEntry.question, answer: editEntry.answer, category: editEntry.category || "general", priority: editEntry.priority || 0, is_active: editEntry.is_active ?? true };
    if (editEntry.id) { await supabase.from("chat_knowledge_base").update(payload).eq("id", editEntry.id); sonnerToast.success("Entry updated"); }
    else { const { data: { user } } = await supabase.auth.getUser(); await supabase.from("chat_knowledge_base").insert({ ...payload, created_by: user?.id }); sonnerToast.success("Entry created"); }
    setEditEntry(null); fetchEntries();
  };

  const remove = async (id: string) => { await supabase.from("chat_knowledge_base").delete().eq("id", id); sonnerToast.success("Entry deleted"); fetchEntries(); };
  const toggleActive = async (entry: KBEntry) => { await supabase.from("chat_knowledge_base").update({ is_active: !entry.is_active }).eq("id", entry.id); setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_active: !e.is_active } : e)); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Knowledge Base</h2>
        <div className="flex items-center gap-2">
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Categories</SelectItem>{KB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={() => setEditEntry({ question: "", answer: "", category: "general", priority: 0, is_active: true })}><Plus className="h-4 w-4 mr-1" /> Add Entry</Button>
        </div>
      </div>
      {editEntry && (
        <Card className="border-primary/30"><CardContent className="space-y-3 p-4">
          <Input placeholder="Question / pattern..." value={editEntry.question || ""} onChange={e => setEditEntry({ ...editEntry, question: e.target.value })} />
          <Textarea placeholder="Preferred answer..." value={editEntry.answer || ""} onChange={e => setEditEntry({ ...editEntry, answer: e.target.value })} rows={3} />
          <div className="flex items-center gap-3">
            <Select value={editEntry.category || "general"} onValueChange={v => setEditEntry({ ...editEntry, category: v })}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{KB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent></Select>
            <Input type="number" placeholder="Priority" value={editEntry.priority || 0} onChange={e => setEditEntry({ ...editEntry, priority: Number(e.target.value) })} className="w-24" />
            <div className="flex items-center gap-2"><Switch checked={editEntry.is_active ?? true} onCheckedChange={v => setEditEntry({ ...editEntry, is_active: v })} /><span className="text-xs text-muted-foreground">Active</span></div>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setEditEntry(null)}>Cancel</Button>
            <Button size="sm" onClick={save}>Save</Button>
          </div>
        </CardContent></Card>
      )}
      <div className="space-y-2">
        {loading ? <p className="text-center text-muted-foreground py-8">Loading...</p> : filtered.length === 0 ? (
          <Card className="border-border/50"><CardContent className="py-12 text-center text-muted-foreground">No knowledge base entries yet.</CardContent></Card>
        ) : filtered.map(entry => (
          <Card key={entry.id} className={`border-border/50 ${!entry.is_active ? "opacity-50" : ""}`}>
            <CardContent className="flex items-start gap-3 p-4">
              <HelpCircle className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{entry.question}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.answer}</p>
                <div className="flex items-center gap-2 mt-2"><Badge variant="outline" className="text-[10px]">{entry.category}</Badge><Badge variant="secondary" className="text-[10px]">Priority: {entry.priority}</Badge></div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Switch checked={entry.is_active} onCheckedChange={() => toggleActive(entry)} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditEntry(entry)}><Edit className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(entry.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PRESETS TAB
   ═══════════════════════════════════════════════════════════════ */
function PresetsTab({ config, setConfig }: { config: ChatConfig; setConfig: React.Dispatch<React.SetStateAction<ChatConfig>> }) {
  const allPresets = [...BUILT_IN_PRESETS, ...(config.presets || [])];
  const activePreset = config.activePreset;

  const applyPreset = (preset: ChatPreset) => {
    setConfig(prev => ({
      ...prev,
      activePreset: preset.id,
      tone: { ...prev.tone, ...preset.tone },
      behavior: { ...prev.behavior, ...preset.behavior },
      ...(preset.prompts ? { prompts: { ...prev.prompts, ...preset.prompts } } : {}),
    }));
    sonnerToast.success(`Applied "${preset.name}" preset`);
  };

  const clearPreset = () => {
    setConfig(prev => ({ ...prev, activePreset: undefined }));
    sonnerToast.info("Switched to custom configuration");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><LayoutTemplate className="h-5 w-5" /> AI Preset Templates</h2>
          <p className="text-xs text-muted-foreground mt-1">Choose a preset mode or create custom configurations. Presets control tone, behavior, and prompts simultaneously.</p>
        </div>
        {activePreset && (
          <Badge variant="outline" className="gap-1.5">
            Active: {allPresets.find(p => p.id === activePreset)?.name ?? activePreset}
            <button onClick={clearPreset} className="ml-1 opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Custom mode card */}
        <Card className={`border-2 transition-colors cursor-pointer ${!activePreset ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"}`} onClick={clearPreset}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🔧</span>
              {!activePreset && <Check className="h-4 w-4 text-primary" />}
            </div>
            <h3 className="font-semibold text-sm">Custom</h3>
            <p className="text-xs text-muted-foreground">Manually configure all tone and behavior settings</p>
          </CardContent>
        </Card>

        {/* Preset cards */}
        {allPresets.map(preset => (
          <Card key={preset.id} className={`border-2 transition-colors cursor-pointer ${activePreset === preset.id ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"}`} onClick={() => applyPreset(preset)}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{preset.icon || "🤖"}</span>
                {activePreset === preset.id && <Check className="h-4 w-4 text-primary" />}
              </div>
              <h3 className="font-semibold text-sm">{preset.name}</h3>
              <p className="text-xs text-muted-foreground">{preset.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {preset.tone.personality && <Badge variant="secondary" className="text-[10px]">{preset.tone.personality}</Badge>}
                {preset.tone.assistantMode && <Badge variant="secondary" className="text-[10px]">{preset.tone.assistantMode}</Badge>}
                {preset.tone.ctaStyle && <Badge variant="outline" className="text-[10px]">CTA: {preset.tone.ctaStyle}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active preset details */}
      {activePreset && (() => {
        const preset = allPresets.find(p => p.id === activePreset);
        if (!preset) return null;
        return (
          <Card className="border-primary/30">
            <CardHeader><CardTitle className="font-display text-sm uppercase flex items-center gap-2"><span>{preset.icon}</span> Active Preset: {preset.name}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(preset.tone).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs bg-muted/40 rounded px-3 py-2">
                    <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
                {Object.entries(preset.behavior || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs bg-muted/40 rounded px-3 py-2">
                    <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">These settings override your manual tone/behavior configuration while this preset is active. Switch tabs to fine-tune individual values.</p>
            </CardContent>
          </Card>
        );
      })()}

      {/* Dynamic switching info */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Wand2 className="h-4 w-4" /> Dynamic Preset Switching</h3>
          <p className="text-xs text-muted-foreground">Presets can be activated automatically using the Automation Engine. Create workflows that switch presets based on page context, campaign, user type, or time of day via the <strong>Automations</strong> admin page.</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   OPTIMIZATION TAB
   ═══════════════════════════════════════════════════════════════ */
function OptimizationTab({ config, setConfig }: { config: ChatConfig; setConfig: React.Dispatch<React.SetStateAction<ChatConfig>> }) {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<{ total: number; positive: number; negative: number; conversionRate: string }>({ total: 0, positive: 0, negative: 0, conversionRate: "0" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [snapRes, fbRes] = await Promise.all([
        supabase.from("chat_optimization_snapshots").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("chat_response_feedback").select("rating, led_to_conversion").limit(1000),
      ]);
      setSnapshots((snapRes.data as any[]) ?? []);
      const fb = (fbRes.data as any[]) ?? [];
      setFeedback({
        total: fb.length,
        positive: fb.filter(f => f.rating === "positive").length,
        negative: fb.filter(f => f.rating === "negative").length,
        conversionRate: fb.length > 0 ? ((fb.filter(f => f.led_to_conversion).length / fb.length) * 100).toFixed(1) : "0",
      });
      setLoading(false);
    };
    load();
  }, []);

  const opt = config.optimization;
  const setOpt = (field: string, value: any) => setConfig(prev => ({ ...prev, optimization: { ...prev.optimization, [field]: value } }));
  const setMetric = (field: string, value: boolean) => setConfig(prev => ({ ...prev, optimization: { ...prev.optimization, metrics: { ...prev.optimization.metrics, [field]: value } } }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Gauge className="h-5 w-5" /> Self-Optimization Engine</h2>
          <p className="text-xs text-muted-foreground mt-1">AI analyzes its own performance and automatically fine-tunes responses for better engagement and conversions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={opt.enabled} onCheckedChange={v => setOpt("enabled", v)} />
          <Label className="text-xs font-medium">{opt.enabled ? "Active" : "Disabled"}</Label>
        </div>
      </div>

      {/* Performance summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Feedback", value: feedback.total, icon: Activity, color: "text-primary" },
          { label: "Positive Ratings", value: feedback.positive, icon: ThumbsUp, color: "text-emerald-500" },
          { label: "Negative Ratings", value: feedback.negative, icon: ThumbsDown, color: "text-rose-500" },
          { label: "Conversion Rate", value: `${feedback.conversionRate}%`, icon: Target, color: "text-amber-500" },
        ].map(s => (
          <Card key={s.label} className="border-border/50"><CardContent className="flex items-center gap-3 p-4">
            <s.icon className={`h-8 w-8 ${s.color}`} /><div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {/* Auto-adjustment controls */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="font-display text-sm uppercase">Auto-Adjustment Rules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">When enabled, the AI will gradually adjust these parameters based on measured performance. Changes are small and incremental.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2"><Switch checked={opt.autoAdjustTone} onCheckedChange={v => setOpt("autoAdjustTone", v)} /><Label className="text-xs">Auto-adjust tone warmth</Label></div>
            <div className="flex items-center gap-2"><Switch checked={opt.autoAdjustLength} onCheckedChange={v => setOpt("autoAdjustLength", v)} /><Label className="text-xs">Auto-adjust response length</Label></div>
            <div className="flex items-center gap-2"><Switch checked={opt.autoAdjustCta} onCheckedChange={v => setOpt("autoAdjustCta", v)} /><Label className="text-xs">Auto-adjust CTA strength</Label></div>
            <div className="flex items-center gap-2"><Switch checked={opt.autoAdjustRecommendations} onCheckedChange={v => setOpt("autoAdjustRecommendations", v)} /><Label className="text-xs">Auto-adjust recommendation frequency</Label></div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2"><Switch checked={opt.requireApproval} onCheckedChange={v => setOpt("requireApproval", v)} /><Label className="text-xs">Require admin approval for changes</Label></div>
            <div>
              <Label className="text-xs">Optimization Interval</Label>
              <Select value={opt.optimizationInterval} onValueChange={v => setOpt("optimizationInterval", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics tracking */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="font-display text-sm uppercase">Tracked Metrics</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2"><Switch checked={opt.metrics.trackEngagement} onCheckedChange={v => setMetric("trackEngagement", v)} /><Label className="text-xs">Engagement (clicks, follow-ups)</Label></div>
            <div className="flex items-center gap-2"><Switch checked={opt.metrics.trackConversions} onCheckedChange={v => setMetric("trackConversions", v)} /><Label className="text-xs">Conversions</Label></div>
            <div className="flex items-center gap-2"><Switch checked={opt.metrics.trackBounce} onCheckedChange={v => setMetric("trackBounce", v)} /><Label className="text-xs">Bounce after response</Label></div>
            <div className="flex items-center gap-2"><Switch checked={opt.metrics.trackFollowUps} onCheckedChange={v => setMetric("trackFollowUps", v)} /><Label className="text-xs">Follow-up interactions</Label></div>
          </div>
        </CardContent>
      </Card>

      {/* Snapshots */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="font-display text-sm uppercase">Performance Snapshots</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground text-center py-6">Loading...</p> :
            snapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No optimization snapshots yet. Snapshots are generated automatically based on your optimization interval.</p>
            ) : (
              <div className="space-y-2">
                {snapshots.map(snap => (
                  <div key={snap.id} className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/30 p-3 text-xs">
                    <div>
                      <span className="font-medium">{format(new Date(snap.period_start), "MMM d")} – {format(new Date(snap.period_end), "MMM d, yyyy")}</span>
                      <span className="ml-3 text-muted-foreground">{snap.total_sessions} sessions · {snap.total_messages} msgs · {Number(snap.conversion_rate).toFixed(1)}% conversion</span>
                    </div>
                    <Badge variant={snap.applied ? "default" : "outline"} className="text-[10px]">{snap.applied ? "Applied" : "Pending"}</Badge>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SANDBOX TAB
   ═══════════════════════════════════════════════════════════════ */
function SandboxTab() {
  const [testMessages, setTestMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState("/");
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const next = [...testMessages, userMsg];
    setTestMessages([...next, { role: "assistant", content: "" }]);
    setInput(""); setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}) },
        body: JSON.stringify({ messages: next, page, cart: { item_count: 0, total: 0, items: [] }, test_mode: true }),
      });
      if (!resp.ok || !resp.body) { const errText = await resp.text(); setTestMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", content: "Error: " + errText }; return c; }); setLoading(false); return; }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", content = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) { content += c; setTestMessages(prev => { const msgs = [...prev]; msgs[msgs.length - 1] = { role: "assistant", content }; return msgs; }); } } catch {}
        }
      }
    } catch { setTestMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", content: "Connection error" }; return c; }); }
    setLoading(false);
  };

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [testMessages]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><FlaskConical className="h-5 w-5" /> Testing Sandbox</h2>
        <div className="flex items-center gap-2">
          <Select value={page} onValueChange={setPage}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>
            {["/", "/products", "/products/example", "/cart", "/account", "/create", "/contact"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent></Select>
          <Button variant="outline" size="sm" onClick={() => setTestMessages([])}>Clear</Button>
        </div>
      </div>
      <Card className="border-border/50"><CardContent className="p-0">
        <div className="bg-primary/90 px-4 py-2.5 rounded-t-lg flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary-foreground" /><span className="text-sm font-medium text-primary-foreground">Sandbox — Page: {page}</span>
          <Badge variant="secondary" className="ml-auto text-[10px]">Test Mode</Badge>
        </div>
        <div ref={scrollRef} className="h-[400px] overflow-y-auto p-4 space-y-3">
          {testMessages.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">Send a message to test the AI assistant</p>}
          {testMessages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
              </div>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary/20" : "bg-muted"}`}>
                {msg.content || (loading && i === testMessages.length - 1 ? <span className="text-xs text-muted-foreground">Thinking...</span> : "")}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-border/30 p-3">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Test a message..." className="flex-1" disabled={loading} />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}><Send className="h-4 w-4" /></Button>
        </form>
      </CardContent></Card>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
/* ─── Collapsible Section wrapper ─── */
function CollapsibleSection({ title, icon: Icon, defaultOpen = true, children }: { title: string; icon?: React.ElementType; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border/50">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors rounded-t-lg">
            <span className="font-display text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 text-primary" />}
              {title}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function AdminChat() {
  const { toast } = useToast();
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CHAT_CONFIG);
  const [savedConfig, setSavedConfig] = useState<ChatConfig>(DEFAULT_CHAT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const isDirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(savedConfig), [config, savedConfig]);

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "chat_widget").maybeSingle().then(({ data }) => {
      if (data?.value && typeof data.value === "object") {
        const merged = deepMerge(DEFAULT_CHAT_CONFIG, data.value as any);
        setConfig(merged);
        setSavedConfig(merged);
      }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    await upsertSetting("chat_widget", config);
    setSavedConfig(config);
    setSaving(false);
    toast({ title: "Chat settings saved!" });
  };

  const revert = useCallback(() => {
    setConfig(savedConfig);
    sonnerToast.info("Reverted to last saved state");
  }, [savedConfig]);

  const set = <K extends keyof ChatConfig>(key: K, value: ChatConfig[K]) => setConfig(prev => ({ ...prev, [key]: value }));
  const setNested = <K extends keyof ChatConfig>(section: K, field: string, value: any) => setConfig(prev => ({ ...prev, [section]: { ...(prev[section] as any), [field]: value } }));

  const addQuickReply = () => set("quickReplies", [...config.quickReplies, { id: uid(), label: "New action", message: "New action", sort_order: config.quickReplies.length }]);
  const removeQuickReply = (id: string) => set("quickReplies", config.quickReplies.filter(q => q.id !== id));
  const updateQuickReply = (id: string, field: keyof ChatQuickReply, value: any) => set("quickReplies", config.quickReplies.map(q => q.id === id ? { ...q, [field]: value } : q));
  const addPageRule = () => set("pageRules", [...config.pageRules, { page: "/new-page", enabled: true, focusArea: "general" }]);
  const removePageRule = (idx: number) => set("pageRules", config.pageRules.filter((_, i) => i !== idx));
  const updatePageRule = (idx: number, field: keyof ChatPageRule, value: any) => set("pageRules", config.pageRules.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  if (loading) return <AdminLayout><div className="flex items-center justify-center py-12 text-muted-foreground">Loading chat settings...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-foreground flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" /> AI Chat
          </h1>
          <p className="text-xs text-muted-foreground">Manage your AI assistant — appearance, behavior, training, analytics & testing</p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <>
              <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500 animate-pulse">Unsaved changes</Badge>
              <Button variant="outline" size="sm" onClick={revert}><Undo2 className="mr-1.5 h-3.5 w-3.5" /> Revert</Button>
            </>
          )}
          <Button onClick={save} disabled={saving || !isDirty} size="sm"><Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving..." : "Save Settings"}</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="presets" className="gap-1.5"><LayoutTemplate className="h-3.5 w-3.5" /> Presets</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5"><Palette className="h-3.5 w-3.5" /> Appearance</TabsTrigger>
          <TabsTrigger value="tone" className="gap-1.5"><Volume2 className="h-3.5 w-3.5" /> Tone</TabsTrigger>
          <TabsTrigger value="context" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Context</TabsTrigger>
          <TabsTrigger value="quickreplies" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Quick Replies</TabsTrigger>
          <TabsTrigger value="training" className="gap-1.5"><Brain className="h-3.5 w-3.5" /> Training</TabsTrigger>
          <TabsTrigger value="optimization" className="gap-1.5"><Gauge className="h-3.5 w-3.5" /> Optimization</TabsTrigger>
          <TabsTrigger value="campaign" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" /> Campaign</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Logs</TabsTrigger>
          <TabsTrigger value="personalization" className="gap-1.5"><Brain className="h-3.5 w-3.5" /> Personalization</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Activity Log</TabsTrigger>
          <TabsTrigger value="sandbox" className="gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> Sandbox</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW ─── */}
        <TabsContent value="overview"><OverviewTab config={config} setTab={setActiveTab} /></TabsContent>

        {/* ─── PRESETS ─── */}
        <TabsContent value="presets"><PresetsTab config={config} setConfig={setConfig} /></TabsContent>

        {/* ─── APPEARANCE ─── */}
        <TabsContent value="appearance">
          <div className="flex gap-6">
            <div className="flex-1 min-w-0 space-y-4">

              <CollapsibleSection title="Global" icon={Settings2} defaultOpen={true}>
                <div className="flex items-center gap-3"><Switch checked={config.enabled} onCheckedChange={v => set("enabled", v)} /><Label>Enable AI Chat Widget</Label></div>
                <div><Label className="text-xs">Brand Name</Label><Input value={getStr(config.window.brandName)} onChange={e => setNested("window", "brandName", setStr(config.window.brandName, e.target.value))} /></div>
                <ImageUploadPlaceholder label="Avatar" value={config.window.avatarUrl ?? ""} onChange={v => setNested("window", "avatarUrl", v)} />
                <div><Label className="text-xs">Disabled Pages</Label><Input value={config.disabledPages.join(", ")} onChange={e => set("disabledPages", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="/admin, /auth" /></div>
              </CollapsibleSection>

              <CollapsibleSection title="Launcher Button" icon={MessageCircle} defaultOpen={false}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs">Position</Label>
                    <Select value={config.launcher.position} onValueChange={v => setNested("launcher", "position", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bottom-right">Bottom Right</SelectItem><SelectItem value="bottom-left">Bottom Left</SelectItem></SelectContent></Select></div>
                  <div><Label className="text-xs">Icon Style</Label>
                    <Select value={config.launcher.icon} onValueChange={v => setNested("launcher", "icon", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="message">Message</SelectItem><SelectItem value="bot">Bot</SelectItem><SelectItem value="sparkle">Sparkle</SelectItem><SelectItem value="custom">Custom Image</SelectItem></SelectContent></Select></div>
                </div>
                {config.launcher.icon === "custom" && <ImageUploadPlaceholder label="Custom Icon" value={config.launcher.customIconUrl ?? ""} onChange={v => setNested("launcher", "customIconUrl", v)} />}
                <div><Label className="text-xs">Size: {config.launcher.size}px</Label><Slider value={[config.launcher.size]} onValueChange={([v]) => setNested("launcher", "size", v)} min={40} max={80} step={2} /></div>
                <div><Label className="text-xs">Bottom Offset: {config.launcher.bottomOffset}px</Label><Slider value={[config.launcher.bottomOffset]} onValueChange={([v]) => setNested("launcher", "bottomOffset", v)} min={8} max={80} step={4} /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorPickerField label="Background Color" value={config.launcher.bgColor ?? ""} onChange={v => setNested("launcher", "bgColor", v)} placeholder="var(--primary)" />
                  <ColorPickerField label="Icon Color" value={config.launcher.iconColor ?? ""} onChange={v => setNested("launcher", "iconColor", v)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorPickerField label="Glow Color" value={config.launcher.glowColor ?? ""} onChange={v => setNested("launcher", "glowColor", v)} />
                  <ColorPickerField label="Border Color" value={config.launcher.borderColor ?? ""} onChange={v => setNested("launcher", "borderColor", v)} />
                </div>
                <Separator />
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2"><Switch checked={config.launcher.shadow} onCheckedChange={v => setNested("launcher", "shadow", v)} /><Label className="text-xs">Shadow</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.launcher.pulseAnimation} onCheckedChange={v => setNested("launcher", "pulseAnimation", v)} /><Label className="text-xs">Pulse</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.launcher.showUnreadBadge} onCheckedChange={v => setNested("launcher", "showUnreadBadge", v)} /><Label className="text-xs">Unread Badge</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.launcher.showLabel} onCheckedChange={v => setNested("launcher", "showLabel", v)} /><Label className="text-xs">Show Label</Label></div>
                </div>
                {config.launcher.showLabel && <div><Label className="text-xs">Label Text</Label><Input value={getStr(config.launcher.labelText)} onChange={e => setNested("launcher", "labelText", e.target.value)} /></div>}
                <div><Label className="text-xs">Hover Animation</Label>
                  <Select value={config.launcher.hoverAnimation} onValueChange={v => setNested("launcher", "hoverAnimation", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lift">Lift</SelectItem><SelectItem value="scale">Scale</SelectItem><SelectItem value="glow">Glow</SelectItem><SelectItem value="none">None</SelectItem></SelectContent></Select></div>
                <Separator />
                <div><Label className="text-xs">Tooltip Text</Label><Input value={getStr(config.launcher.tooltipText)} onChange={e => setNested("launcher", "tooltipText", e.target.value)} /></div>
                <div><Label className="text-xs">Tooltip Delay: {config.launcher.tooltipDelay / 1000}s</Label><Slider value={[config.launcher.tooltipDelay]} onValueChange={([v]) => setNested("launcher", "tooltipDelay", v)} min={1000} max={30000} step={1000} /></div>
              </CollapsibleSection>

              <CollapsibleSection title="Chat Window" icon={Eye} defaultOpen={false}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs">Width: {config.window.width}px</Label><Slider value={[config.window.width]} onValueChange={([v]) => setNested("window", "width", v)} min={300} max={600} step={10} /></div>
                  <div><Label className="text-xs">Height</Label><Input value={config.window.height} onChange={e => setNested("window", "height", e.target.value)} placeholder="52vh" /></div>
                </div>
                <div><Label className="text-xs">Border Radius: {config.window.borderRadius}px</Label><Slider value={[config.window.borderRadius]} onValueChange={([v]) => setNested("window", "borderRadius", v)} min={0} max={40} step={2} /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorPickerField label="Background Color" value={config.window.bgColor ?? ""} onChange={v => setNested("window", "bgColor", v)} />
                  <ColorPickerField label="Border Color" value={config.window.borderColor ?? ""} onChange={v => setNested("window", "borderColor", v)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorPickerField label="Header BG" value={config.window.headerBgColor ?? ""} onChange={v => setNested("window", "headerBgColor", v)} />
                  <ColorPickerField label="Send Button Color" value={config.window.sendButtonColor ?? ""} onChange={v => setNested("window", "sendButtonColor", v)} />
                </div>
                <div><Label className="text-xs">Opacity: {config.window.opacity}%</Label><Slider value={[config.window.opacity]} onValueChange={([v]) => setNested("window", "opacity", v)} min={50} max={100} step={5} /></div>
                <div className="flex items-center gap-2"><Switch checked={config.window.glassEffect} onCheckedChange={v => setNested("window", "glassEffect", v)} /><Label className="text-xs">Glass Effect</Label></div>
                <div><Label className="text-xs">Input Placeholder</Label><Input value={getStr(config.window.inputPlaceholder)} onChange={e => setNested("window", "inputPlaceholder", e.target.value)} /></div>
                <div><Label className="text-xs">Empty State Text</Label><Input value={getStr(config.window.emptyStateText)} onChange={e => setNested("window", "emptyStateText", e.target.value)} /></div>
              </CollapsibleSection>

              <CollapsibleSection title="AI Message Bubbles" icon={Bot} defaultOpen={false}>
                <ColorPickerField label="BG Color" value={config.bubbles.ai.bgColor ?? ""} onChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, ai: { ...p.bubbles.ai, bgColor: v } } }))} />
                <ColorPickerField label="Text Color" value={config.bubbles.ai.textColor ?? ""} onChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, ai: { ...p.bubbles.ai, textColor: v } } }))} />
                <div><Label className="text-xs">Border Radius: {config.bubbles.ai.borderRadius}px</Label><Slider value={[config.bubbles.ai.borderRadius]} onValueChange={([v]) => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, ai: { ...p.bubbles.ai, borderRadius: v } } }))} min={0} max={24} step={2} /></div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2"><Switch checked={config.bubbles.ai.showAvatar} onCheckedChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, ai: { ...p.bubbles.ai, showAvatar: v } } }))} /><Label className="text-xs">Avatar</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.bubbles.ai.showTimestamp} onCheckedChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, ai: { ...p.bubbles.ai, showTimestamp: v } } }))} /><Label className="text-xs">Timestamp</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.bubbles.ai.shadow} onCheckedChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, ai: { ...p.bubbles.ai, shadow: v } } }))} /><Label className="text-xs">Shadow</Label></div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="User Message Bubbles" icon={User} defaultOpen={false}>
                <ColorPickerField label="BG Color" value={config.bubbles.user.bgColor ?? ""} onChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, user: { ...p.bubbles.user, bgColor: v } } }))} />
                <ColorPickerField label="Text Color" value={config.bubbles.user.textColor ?? ""} onChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, user: { ...p.bubbles.user, textColor: v } } }))} />
                <div><Label className="text-xs">Border Radius: {config.bubbles.user.borderRadius}px</Label><Slider value={[config.bubbles.user.borderRadius]} onValueChange={([v]) => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, user: { ...p.bubbles.user, borderRadius: v } } }))} min={0} max={24} step={2} /></div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2"><Switch checked={config.bubbles.user.showAvatar} onCheckedChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, user: { ...p.bubbles.user, showAvatar: v } } }))} /><Label className="text-xs">Avatar</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.bubbles.user.showTimestamp} onCheckedChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, user: { ...p.bubbles.user, showTimestamp: v } } }))} /><Label className="text-xs">Timestamp</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.bubbles.user.shadow} onCheckedChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, user: { ...p.bubbles.user, shadow: v } } }))} /><Label className="text-xs">Shadow</Label></div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Effects & Animations" icon={Sparkles} defaultOpen={false}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs">Typing Indicator</Label>
                    <Select value={config.bubbles.typingIndicator} onValueChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, typingIndicator: v as any } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dots">Dots</SelectItem><SelectItem value="pulse">Pulse</SelectItem><SelectItem value="wave">Wave</SelectItem></SelectContent></Select></div>
                  <div><Label className="text-xs">Message Animation</Label>
                    <Select value={config.bubbles.messageAnimation} onValueChange={v => setConfig(p => ({ ...p, bubbles: { ...p.bubbles, messageAnimation: v as any } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fade">Fade</SelectItem><SelectItem value="slide">Slide</SelectItem><SelectItem value="none">None</SelectItem></SelectContent></Select></div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Responsive / Desktop & Mobile" icon={Sparkles} defaultOpen={false}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Desktop</p>
                    <div><Label className="text-xs">Position</Label><Input value={config.responsive.desktop.position} onChange={e => setConfig(p => ({ ...p, responsive: { ...p.responsive, desktop: { ...p.responsive.desktop, position: e.target.value } } }))} /></div>
                    <div><Label className="text-xs">Size: {config.responsive.desktop.size}px</Label><Slider value={[config.responsive.desktop.size]} onValueChange={([v]) => setConfig(p => ({ ...p, responsive: { ...p.responsive, desktop: { ...p.responsive.desktop, size: v } } }))} min={40} max={80} step={2} /></div>
                    <div><Label className="text-xs">Window Height</Label><Input value={config.responsive.desktop.windowHeight} onChange={e => setConfig(p => ({ ...p, responsive: { ...p.responsive, desktop: { ...p.responsive.desktop, windowHeight: e.target.value } } }))} /></div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Mobile</p>
                    <div><Label className="text-xs">Position</Label><Input value={config.responsive.mobile.position} onChange={e => setConfig(p => ({ ...p, responsive: { ...p.responsive, mobile: { ...p.responsive.mobile, position: e.target.value } } }))} /></div>
                    <div><Label className="text-xs">Size: {config.responsive.mobile.size}px</Label><Slider value={[config.responsive.mobile.size]} onValueChange={([v]) => setConfig(p => ({ ...p, responsive: { ...p.responsive, mobile: { ...p.responsive.mobile, size: v } } }))} min={36} max={64} step={2} /></div>
                    <div><Label className="text-xs">Window Height</Label><Input value={config.responsive.mobile.windowHeight} onChange={e => setConfig(p => ({ ...p, responsive: { ...p.responsive, mobile: { ...p.responsive.mobile, windowHeight: e.target.value } } }))} /></div>
                    <div><Label className="text-xs">Minimized Style</Label>
                      <Select value={config.responsive.mobile.minimizedStyle} onValueChange={v => setConfig(p => ({ ...p, responsive: { ...p.responsive, mobile: { ...p.responsive.mobile, minimizedStyle: v as any } } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fab">FAB</SelectItem><SelectItem value="bar">Bar</SelectItem></SelectContent></Select></div>
                  </div>
                </div>
              </CollapsibleSection>

            </div>
            <div className="hidden xl:block w-[400px] shrink-0">
              <div className="sticky top-4">
                <ChatLivePreview config={config} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── TONE ─── */}
        <TabsContent value="tone">
          <div className="flex gap-6">
            <div className="flex-1 min-w-0 space-y-4">
          <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Tone & Personality</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div><Label className="text-xs">Personality</Label>
                  <Select value={config.tone.personality} onValueChange={v => setNested("tone", "personality", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem><SelectItem value="professional">Professional</SelectItem><SelectItem value="playful">Playful</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem><SelectItem value="warm">Warm</SelectItem><SelectItem value="concise">Concise</SelectItem>
                  </SelectContent></Select></div>
                <div><Label className="text-xs">Response Length</Label>
                  <Select value={config.tone.responseLength} onValueChange={v => setNested("tone", "responseLength", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="short">Short</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="long">Long</SelectItem></SelectContent></Select></div>
                <div><Label className="text-xs">Conversation Style</Label>
                  <Select value={config.tone.conversationStyle} onValueChange={v => setNested("tone", "conversationStyle", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="direct">Direct</SelectItem><SelectItem value="conversational">Conversational</SelectItem></SelectContent></Select></div>
                <div><Label className="text-xs">Assistant Mode</Label>
                  <Select value={config.tone.assistantMode} onValueChange={v => setNested("tone", "assistantMode", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="support">Support</SelectItem><SelectItem value="sales">Sales</SelectItem><SelectItem value="advisor">Advisor</SelectItem><SelectItem value="guide">Guide</SelectItem></SelectContent></Select></div>
                <div><Label className="text-xs">Formality</Label>
                  <Select value={config.tone.formalityLevel} onValueChange={v => setNested("tone", "formalityLevel", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="casual">Casual</SelectItem><SelectItem value="balanced">Balanced</SelectItem><SelectItem value="formal">Formal</SelectItem></SelectContent></Select></div>
                <div><Label className="text-xs">CTA Style</Label>
                  <Select value={config.tone.ctaStyle} onValueChange={v => setNested("tone", "ctaStyle", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="soft">Soft</SelectItem><SelectItem value="direct">Direct</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs">Persuasive Style</Label>
                  <Select value={config.tone.persuasiveStyle} onValueChange={v => setNested("tone", "persuasiveStyle", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="subtle">Subtle</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="strong">Strong</SelectItem></SelectContent></Select></div>
                <div><Label className="text-xs">Upsell Intensity</Label>
                  <Select value={config.tone.upsellIntensity} onValueChange={v => setNested("tone", "upsellIntensity", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="light">Light</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="aggressive">Aggressive</SelectItem></SelectContent></Select></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={config.tone.useEmoji} onCheckedChange={v => setNested("tone", "useEmoji", v)} /><Label className="text-xs">Use Emoji</Label></div>
            </CardContent>
          </Card>
            </div>
            <div className="hidden xl:block w-[400px] shrink-0">
              <div className="sticky top-4">
                <ChatLivePreview config={config} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── CONTEXT RULES ─── */}
        <TabsContent value="context">
          <div className="flex gap-6">
            <div className="flex-1 min-w-0 space-y-4">
          <Card><CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-sm uppercase">Page-based Context Rules</CardTitle>
            <Button size="sm" variant="outline" onClick={addPageRule}><Plus className="mr-1 h-3 w-3" /> Add Rule</Button>
          </CardHeader>
            <CardContent className="space-y-3">
              {config.pageRules.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-lg border border-border/30 bg-muted/30 p-3">
                  <div className="flex-1 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div><Label className="text-xs">Page Pattern</Label><Input value={rule.page} onChange={e => updatePageRule(idx, "page", e.target.value)} /></div>
                      <div><Label className="text-xs">Focus Area</Label>
                        <Select value={rule.focusArea ?? "general"} onValueChange={v => updatePageRule(idx, "focusArea", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                          <SelectItem value="general">General</SelectItem><SelectItem value="product_help">Product Help</SelectItem><SelectItem value="checkout_assist">Checkout Assist</SelectItem><SelectItem value="account_support">Account Support</SelectItem><SelectItem value="custom_order_help">Custom Order Help</SelectItem>
                        </SelectContent></Select></div>
                      <div className="flex items-end gap-2 pb-1"><Switch checked={rule.enabled} onCheckedChange={v => updatePageRule(idx, "enabled", v)} /><Label className="text-xs">Enabled</Label></div>
                    </div>
                    <div><Label className="text-xs">Custom Welcome Text</Label><Input value={getStr(rule.welcomeText)} onChange={e => updatePageRule(idx, "welcomeText", e.target.value)} placeholder="Optional override" /></div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removePageRule(idx)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {config.pageRules.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No page rules configured</p>}
            </CardContent>
          </Card>

          {/* Greetings */}
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
                <div><Label className="text-xs">Prompt Delay: {config.greetings.promptBubbleDelay / 1000}s</Label><Slider value={[config.greetings.promptBubbleDelay]} onValueChange={([v]) => setNested("greetings", "promptBubbleDelay", v)} min={2000} max={30000} step={1000} /></div>
                <div><Label className="text-xs">Reappear Delay: {config.greetings.promptBubbleReappear / 1000}s</Label><Slider value={[config.greetings.promptBubbleReappear]} onValueChange={([v]) => setNested("greetings", "promptBubbleReappear", v)} min={30000} max={600000} step={30000} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Behavior */}
          <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Response Behavior</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label className="text-xs">Prioritize</Label>
                <Select value={config.behavior.prioritize} onValueChange={v => setNested("behavior", "prioritize", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="support">Support</SelectItem><SelectItem value="selling">Selling</SelectItem><SelectItem value="balanced">Balanced</SelectItem></SelectContent></Select></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(config.behavior) as (keyof typeof config.behavior)[]).filter(k => typeof config.behavior[k] === "boolean").map(key => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch checked={config.behavior[key] as boolean} onCheckedChange={v => setNested("behavior", key, v)} />
                    <Label className="text-xs">{String(key).replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
            </div>
            <div className="hidden xl:block w-[400px] shrink-0">
              <div className="sticky top-4">
                <ChatLivePreview config={config} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── QUICK REPLIES ─── */}
        <TabsContent value="quickreplies">
          <div className="flex gap-6">
            <div className="flex-1 min-w-0 space-y-4">
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
                    <div><Label className="text-xs">Pages (comma-separated, empty = all)</Label><Input value={qr.pages?.join(", ") ?? ""} onChange={e => updateQuickReply(qr.id, "pages", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="*, /products, /cart" /></div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeQuickReply(qr.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {config.quickReplies.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No quick replies configured</p>}
            </CardContent>
          </Card>
            </div>
            <div className="hidden xl:block w-[400px] shrink-0">
              <div className="sticky top-4">
                <ChatLivePreview config={config} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── TRAINING ─── */}
        <TabsContent value="training" className="space-y-6">
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
              <div><Label className="text-xs">Custom System Prompt Suffix</Label><Textarea value={config.prompts.customSystemPromptSuffix} onChange={e => setNested("prompts", "customSystemPromptSuffix", e.target.value)} rows={3} /></div>
            </CardContent>
          </Card>
          <KnowledgeBaseTab />
        </TabsContent>

        {/* ─── CAMPAIGN SYNC ─── */}
        <TabsContent value="campaign" className="space-y-4">
          <Card><CardHeader><CardTitle className="font-display text-sm uppercase">Campaign & Theme Sync</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">When a campaign is active, chat UI and behavior can adapt automatically. Configure campaign-specific overrides in the Campaigns page, and use the Campaign Instructions prompt field in the Training tab for response guidance.</p>
              <Separator />
              <div><Label className="text-xs">Campaign Instructions (synced from Training tab)</Label>
                <Textarea value={config.prompts.campaignInstructions} onChange={e => setNested("prompts", "campaignInstructions", e.target.value)} rows={3} placeholder="How should the assistant reference campaigns?" /></div>
              <div className="flex items-center gap-2"><Switch checked={(config.behavior as any).campaignAware ?? false} onCheckedChange={v => setNested("behavior", "campaignAware", v)} /><Label className="text-xs">Campaign-aware responses</Label></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── OPTIMIZATION ─── */}
        <TabsContent value="optimization"><OptimizationTab config={config} setConfig={setConfig} /></TabsContent>

        {/* ─── ANALYTICS ─── */}
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>

        {/* ─── CONVERSATION LOGS ─── */}
        <TabsContent value="logs"><ConversationsTab /></TabsContent>

        {/* ─── PERSONALIZATION (AI Personalization) ─── */}
        <TabsContent value="personalization">
          <LazyPersonalization />
        </TabsContent>

        {/* ─── ACTIVITY LOG ─── */}
        <TabsContent value="activity">
          <LazyActivityLog />
        </TabsContent>

        {/* ─── SANDBOX ─── */}
        <TabsContent value="sandbox"><SandboxTab /></TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
