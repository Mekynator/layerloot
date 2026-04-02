import { useEffect, useState, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart3, MessageCircle, Users, TrendingUp, Brain, FlaskConical,
  Heart, AlertTriangle, Plus, Trash2, Edit, Flag, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronRight, Search, RefreshCw, Send, Bot, User,
  Activity, Zap, Target, HelpCircle, BookOpen, X,
} from "lucide-react";
import { format } from "date-fns";

/* ─── Types ─── */
type AnalyticsEvent = {
  id: string;
  session_id: string;
  event_type: string;
  event_data: any;
  page: string | null;
  campaign_id: string | null;
  user_id: string | null;
  created_at: string;
};

type Conversation = {
  id: string;
  session_id: string;
  user_id: string | null;
  messages: any[];
  page: string | null;
  campaign_id: string | null;
  language: string;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  outcome: string;
  metadata: any;
  admin_flags: any;
  created_at: string;
};

type KBEntry = {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const KB_CATEGORIES = ["general", "products", "shipping", "materials", "custom_orders", "rewards"];

/* ─── Dashboard Tab ─── */
function DashboardTab() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchEvents = async () => {
    setLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await supabase
      .from("chat_analytics_events")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    setEvents((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [days]);

  const stats = useMemo(() => {
    const sessions = new Set(events.map(e => e.session_id));
    const opens = events.filter(e => e.event_type === "open");
    const messages = events.filter(e => e.event_type === "message");
    const qrClicks = events.filter(e => e.event_type === "quick_reply_click");
    const productClicks = events.filter(e => e.event_type === "product_click");
    const conversions = events.filter(e => e.event_type === "conversion");
    const uniqueUsers = new Set(events.filter(e => e.user_id).map(e => e.user_id));

    return {
      totalSessions: sessions.size,
      totalOpens: opens.length,
      totalMessages: messages.length,
      uniqueUsers: uniqueUsers.size,
      quickReplyClicks: qrClicks.length,
      productClicks: productClicks.length,
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
    events.filter(e => e.event_type === "quick_reply_click").forEach(e => {
      const text = e.event_data?.text || "unknown";
      map[text] = (map[text] || 0) + 1;
    });
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
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Chat Sessions", value: stats.totalSessions, icon: MessageCircle, color: "text-primary" },
          { label: "Unique Users", value: stats.uniqueUsers, icon: Users, color: "text-blue-500" },
          { label: "Messages Sent", value: stats.totalMessages, icon: Send, color: "text-green-500" },
          { label: "Conversion Rate", value: `${stats.conversionRate}%`, icon: Target, color: "text-amber-500" },
          { label: "Avg Messages/Session", value: stats.avgMessages, icon: BarChart3, color: "text-purple-500" },
          { label: "Quick Reply Clicks", value: stats.quickReplyClicks, icon: Zap, color: "text-cyan-500" },
          { label: "Product Clicks", value: stats.productClicks, icon: TrendingUp, color: "text-rose-500" },
          { label: "Conversions", value: stats.conversions, icon: Heart, color: "text-emerald-500" },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-sm">Top Pages</CardTitle></CardHeader>
          <CardContent>
            {topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {topPages.map(([page, count]) => (
                  <div key={page} className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground">{page}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-sm">Top Quick Replies</CardTitle></CardHeader>
          <CardContent>
            {topQuickReplies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {topQuickReplies.map(([text, count]) => (
                  <div key={text} className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground">{text}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Conversations Tab ─── */
function ConversationsTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchConversations = async () => {
    setLoading(true);
    let query = supabase
      .from("chat_conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

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
      return msgs.some((m: any) => m.content?.toLowerCase().includes(q)) ||
        c.page?.toLowerCase().includes(q) ||
        c.session_id.toLowerCase().includes(q);
    });
  }, [conversations, search]);

  const toggleFlag = async (conv: Conversation, flag: string) => {
    const flags = conv.admin_flags || {};
    const updated = { ...flags, [flag]: !flags[flag] };
    await supabase.from("chat_conversations").update({ admin_flags: updated }).eq("id", conv.id);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, admin_flags: updated } : c));
    toast.success(`Conversation ${updated[flag] ? "flagged" : "unflagged"}`);
  };

  const outcomeColor: Record<string, string> = {
    converted: "bg-emerald-500/20 text-emerald-400",
    resolved: "bg-blue-500/20 text-blue-400",
    abandoned: "bg-amber-500/20 text-amber-400",
    unknown: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..." className="pl-9" />
        </div>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Outcome" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchConversations} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="border-border/50"><CardContent className="py-12 text-center text-muted-foreground">No conversations found</CardContent></Card>
        ) : filtered.map(conv => (
          <Card key={conv.id} className="border-border/50">
            <CardContent className="p-0">
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(expandedId === conv.id ? null : conv.id)}
              >
                {expandedId === conv.id ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{conv.page || "/"}</span>
                    <Badge className={`text-[10px] ${outcomeColor[conv.outcome] || outcomeColor.unknown}`}>{conv.outcome}</Badge>
                    <Badge variant="outline" className="text-[10px]">{conv.message_count} msgs</Badge>
                    {conv.admin_flags?.flagged && <Flag className="h-3 w-3 text-amber-500" />}
                    {conv.admin_flags?.useful && <ThumbsUp className="h-3 w-3 text-emerald-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(conv.started_at), "MMM d, yyyy HH:mm")} · {conv.language} · {conv.user_id ? "Logged in" : "Guest"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); toggleFlag(conv, "flagged"); }}>
                    <Flag className={`h-3.5 w-3.5 ${conv.admin_flags?.flagged ? "text-amber-500" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); toggleFlag(conv, "useful"); }}>
                    <ThumbsUp className={`h-3.5 w-3.5 ${conv.admin_flags?.useful ? "text-emerald-500" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); toggleFlag(conv, "not_useful"); }}>
                    <ThumbsDown className={`h-3.5 w-3.5 ${conv.admin_flags?.not_useful ? "text-rose-500" : ""}`} />
                  </Button>
                </div>
              </button>

              {expandedId === conv.id && (
                <div className="border-t border-border/30 bg-muted/20 p-4 space-y-2 max-h-[400px] overflow-y-auto">
                  {(Array.isArray(conv.messages) ? conv.messages : []).map((msg: any, i: number) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                      </div>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${msg.role === "user" ? "bg-primary/20 text-foreground" : "bg-muted text-foreground"}`}>
                        {msg.content}
                      </div>
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

/* ─── Knowledge Base Tab ─── */
function KnowledgeBaseTab() {
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState<Partial<KBEntry> | null>(null);
  const [catFilter, setCatFilter] = useState("all");

  const fetchEntries = async () => {
    setLoading(true);
    const { data } = await supabase.from("chat_knowledge_base").select("*").order("priority", { ascending: false });
    setEntries((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const filtered = catFilter === "all" ? entries : entries.filter(e => e.category === catFilter);

  const save = async () => {
    if (!editEntry?.question?.trim() || !editEntry?.answer?.trim()) { toast.error("Question and answer required"); return; }
    const payload = {
      question: editEntry.question,
      answer: editEntry.answer,
      category: editEntry.category || "general",
      priority: editEntry.priority || 0,
      is_active: editEntry.is_active ?? true,
    };

    if (editEntry.id) {
      await supabase.from("chat_knowledge_base").update(payload).eq("id", editEntry.id);
      toast.success("Entry updated");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("chat_knowledge_base").insert({ ...payload, created_by: user?.id });
      toast.success("Entry created");
    }
    setEditEntry(null);
    fetchEntries();
  };

  const remove = async (id: string) => {
    await supabase.from("chat_knowledge_base").delete().eq("id", id);
    toast.success("Entry deleted");
    fetchEntries();
  };

  const toggleActive = async (entry: KBEntry) => {
    await supabase.from("chat_knowledge_base").update({ is_active: !entry.is_active }).eq("id", entry.id);
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_active: !e.is_active } : e));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Knowledge Base</h2>
        <div className="flex items-center gap-2">
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {KB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setEditEntry({ question: "", answer: "", category: "general", priority: 0, is_active: true })}>
            <Plus className="h-4 w-4 mr-1" /> Add Entry
          </Button>
        </div>
      </div>

      {editEntry && (
        <Card className="border-primary/30">
          <CardContent className="space-y-3 p-4">
            <Input placeholder="Question / pattern..." value={editEntry.question || ""} onChange={e => setEditEntry({ ...editEntry, question: e.target.value })} />
            <Textarea placeholder="Preferred answer..." value={editEntry.answer || ""} onChange={e => setEditEntry({ ...editEntry, answer: e.target.value })} rows={3} />
            <div className="flex items-center gap-3">
              <Select value={editEntry.category || "general"} onValueChange={v => setEditEntry({ ...editEntry, category: v })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{KB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Priority" value={editEntry.priority || 0} onChange={e => setEditEntry({ ...editEntry, priority: Number(e.target.value) })} className="w-24" />
              <div className="flex items-center gap-2">
                <Switch checked={editEntry.is_active ?? true} onCheckedChange={v => setEditEntry({ ...editEntry, is_active: v })} />
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => setEditEntry(null)}>Cancel</Button>
              <Button size="sm" onClick={save}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <Card className="border-border/50"><CardContent className="py-12 text-center text-muted-foreground">No knowledge base entries yet. Add your first Q&A pair.</CardContent></Card>
        ) : filtered.map(entry => (
          <Card key={entry.id} className={`border-border/50 ${!entry.is_active ? "opacity-50" : ""}`}>
            <CardContent className="flex items-start gap-3 p-4">
              <HelpCircle className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{entry.question}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.answer}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px]">{entry.category}</Badge>
                  <Badge variant="secondary" className="text-[10px]">Priority: {entry.priority}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Switch checked={entry.is_active} onCheckedChange={() => toggleActive(entry)} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditEntry(entry)}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(entry.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Health Tab ─── */
function HealthTab() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    Promise.all([
      supabase.from("chat_analytics_events").select("*").gte("created_at", since).limit(1000),
      supabase.from("chat_conversations").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
    ]).then(([evRes, convRes]) => {
      setEvents((evRes.data as any[]) ?? []);
      setConversations((convRes.data as any[]) ?? []);
      setLoading(false);
    });
  }, []);

  const health = useMemo(() => {
    const sessions = new Set(events.map(e => e.session_id)).size;
    const messages = events.filter(e => e.event_type === "message").length;
    const conversions = events.filter(e => e.event_type === "conversion").length;
    const abandoned = conversations.filter(c => c.outcome === "abandoned").length;
    const total = conversations.length;

    const engagementScore = sessions > 0 ? Math.min(100, Math.round((messages / sessions) * 20)) : 0;
    const conversionScore = sessions > 0 ? Math.min(100, Math.round((conversions / sessions) * 100 * 5)) : 0;
    const abandonRate = total > 0 ? Math.round((abandoned / total) * 100) : 0;

    return { engagementScore, conversionScore, abandonRate, sessions, messages, conversions, abandoned, total };
  }, [events, conversations]);

  const alerts = useMemo(() => {
    const a: { type: "warn" | "error" | "info"; message: string }[] = [];
    if (health.abandonRate > 50) a.push({ type: "error", message: `High abandonment rate: ${health.abandonRate}% of conversations abandoned` });
    if (health.engagementScore < 30) a.push({ type: "warn", message: "Low engagement: users sending very few messages per session" });
    if (health.conversionScore < 10 && health.sessions > 10) a.push({ type: "warn", message: "Low conversion from AI chat interactions" });
    if (health.sessions === 0) a.push({ type: "info", message: "No chat sessions recorded yet. Data will appear as users interact with the chat." });
    return a;
  }, [health]);

  if (loading) return <p className="text-center text-muted-foreground py-12">Loading health data...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2"><Activity className="h-5 w-5" /> Performance Health</h2>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Engagement Score", value: health.engagementScore, color: health.engagementScore > 60 ? "text-emerald-400" : health.engagementScore > 30 ? "text-amber-400" : "text-rose-400" },
          { label: "Conversion Score", value: health.conversionScore, color: health.conversionScore > 20 ? "text-emerald-400" : health.conversionScore > 5 ? "text-amber-400" : "text-rose-400" },
          { label: "Abandonment Rate", value: `${health.abandonRate}%`, color: health.abandonRate < 30 ? "text-emerald-400" : health.abandonRate < 60 ? "text-amber-400" : "text-rose-400" },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-6 text-center">
              <p className={`text-4xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <Card key={i} className={`border-border/50 ${a.type === "error" ? "border-rose-500/30" : a.type === "warn" ? "border-amber-500/30" : ""}`}>
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle className={`h-5 w-5 shrink-0 ${a.type === "error" ? "text-rose-500" : a.type === "warn" ? "text-amber-500" : "text-blue-500"}`} />
                <p className="text-sm">{a.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Sandbox Tab ─── */
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
    setInput("");
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: next, page, cart: { item_count: 0, total: 0, items: [] }, test_mode: true }),
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text();
        setTestMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", content: "Error: " + errText }; return c; });
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let content = "";

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
    } catch (e) {
      setTestMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", content: "Connection error" }; return c; });
    }
    setLoading(false);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [testMessages]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><FlaskConical className="h-5 w-5" /> Testing Sandbox</h2>
        <div className="flex items-center gap-2">
          <Select value={page} onValueChange={setPage}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["/", "/products", "/products/example", "/cart", "/account", "/create", "/contact"].map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setTestMessages([])}>Clear</Button>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="bg-primary/90 px-4 py-2.5 rounded-t-lg flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">Sandbox — Page: {page}</span>
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
        </CardContent>
      </Card>
    </div>
  );
}

import { useRef } from "react";

/* ─── Main Page ─── */
export default function AdminChatAnalytics() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-primary" /> AI Chat Analytics & Training</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor performance, train responses, and optimize your AI assistant</p>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
            <TabsTrigger value="conversations" className="gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Conversations</TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Training</TabsTrigger>
            <TabsTrigger value="health" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Health</TabsTrigger>
            <TabsTrigger value="sandbox" className="gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> Sandbox</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="conversations"><ConversationsTab /></TabsContent>
          <TabsContent value="knowledge"><KnowledgeBaseTab /></TabsContent>
          <TabsContent value="health"><HealthTab /></TabsContent>
          <TabsContent value="sandbox"><SandboxTab /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
