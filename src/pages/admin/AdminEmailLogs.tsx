import { useState, useEffect, useMemo } from "react";
import { Mail, RefreshCw, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type EmailLog = {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-500/10 text-green-600 border-green-500/30",
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  failed: "bg-red-500/10 text-red-600 border-red-500/30",
  dlq: "bg-red-500/10 text-red-600 border-red-500/30",
  suppressed: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  bounced: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  complained: "bg-rose-500/10 text-rose-600 border-rose-500/30",
};

const TIME_RANGES = [
  { label: "Last 24h", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
];

const PAGE_SIZE = 50;

const AdminEmailLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState(7);
  const [page, setPage] = useState(0);
  const [templates, setTemplates] = useState<string[]>([]);

  const loadLogs = async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - timeRange);

    let query = supabase
      .from("email_send_log")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (templateFilter !== "all") query = query.eq("template_name", templateFilter);

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error loading logs", description: error.message, variant: "destructive" });
    }
    setLogs((data as EmailLog[]) || []);
    setLoading(false);
  };

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("email_send_log")
      .select("template_name")
      .order("template_name");
    if (data) {
      const unique = [...new Set(data.map(d => d.template_name))];
      setTemplates(unique);
    }
  };

  useEffect(() => { loadLogs(); }, [statusFilter, templateFilter, timeRange, page]);
  useEffect(() => { loadTemplates(); }, []);

  const deduped = useMemo(() => {
    const map = new Map<string, EmailLog>();
    for (const log of logs) {
      const key = log.message_id || log.id;
      const existing = map.get(key);
      if (!existing || new Date(log.created_at) > new Date(existing.created_at)) {
        map.set(key, log);
      }
    }
    return [...map.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [logs]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return deduped;
    const q = searchQuery.toLowerCase();
    return deduped.filter(l =>
      l.recipient_email.toLowerCase().includes(q) ||
      l.template_name.toLowerCase().includes(q) ||
      (l.error_message || '').toLowerCase().includes(q)
    );
  }, [deduped, searchQuery]);

  const stats = useMemo(() => {
    const s = { total: filtered.length, sent: 0, failed: 0, pending: 0, suppressed: 0 };
    for (const l of filtered) {
      if (l.status === "sent") s.sent++;
      else if (l.status === "failed" || l.status === "dlq") s.failed++;
      else if (l.status === "pending") s.pending++;
      else if (l.status === "suppressed") s.suppressed++;
    }
    return s;
  }, [filtered]);

  const handleRetry = async (log: EmailLog) => {
    toast({ title: "Retry queued", description: `Retrying ${log.template_name} to ${log.recipient_email}` });
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: log.template_name,
          recipientEmail: log.recipient_email,
          idempotencyKey: `retry-${log.id}-${Date.now()}`,
        },
      });
      toast({ title: "Email re-queued" });
      await loadLogs();
    } catch (err) {
      toast({ title: "Retry failed", variant: "destructive" });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-bold uppercase">Email Logs</h1>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Sent", value: stats.sent, color: "text-green-600" },
            { label: "Failed", value: stats.failed, color: "text-red-600" },
            { label: "Pending", value: stats.pending, color: "text-yellow-600" },
            { label: "Suppressed", value: stats.suppressed, color: "text-orange-600" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {TIME_RANGES.map(r => (
              <Button
                key={r.days}
                variant={timeRange === r.days ? "default" : "outline"}
                size="sm"
                onClick={() => { setTimeRange(r.days); setPage(0); }}
                className="text-xs"
              >
                {r.label}
              </Button>
            ))}
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <Filter className="mr-1 h-3 w-3" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="dlq">DLQ</SelectItem>
              <SelectItem value="suppressed">Suppressed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={templateFilter} onValueChange={v => { setTemplateFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              {templates.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search recipient, template, error..."
              className="h-8 text-xs pl-8"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Template</TableHead>
                  <TableHead className="text-xs">Recipient</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Error</TableHead>
                  <TableHead className="text-xs w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                      {loading ? "Loading..." : "No email logs found for this period."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-medium">{log.template_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.recipient_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[log.status] || ''}`}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                        {log.error_message || '—'}
                      </TableCell>
                      <TableCell>
                        {(log.status === "failed" || log.status === "dlq") && (
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => handleRetry(log)}>
                            <RefreshCw className="mr-1 h-3 w-3" /> Retry
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} emails (page {page + 1})
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={logs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminEmailLogs;
