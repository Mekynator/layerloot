import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";

interface ActivityEntry {
  id: string;
  user_id: string;
  user_email: string | null;
  user_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string | null;
  created_at: string;
}

const PAGE_SIZE = 30;

const ACTION_COLORS: Record<string, string> = {
  publish: "success",
  revert: "destructive",
  draft_save: "secondary",
  login: "outline",
  role_change: "default",
};

export default function AdminActivity() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const load = async (pageNum = 0) => {
    setLoading(true);
    let query = supabase
      .from("admin_activity_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (actionFilter && actionFilter !== "all") {
      query = query.eq("action", actionFilter);
    }
    if (searchTerm.trim()) {
      query = query.or(
        `summary.ilike.%${searchTerm}%,user_email.ilike.%${searchTerm}%,entity_type.ilike.%${searchTerm}%`
      );
    }

    const { data } = await query;
    const rows = (data ?? []) as unknown as ActivityEntry[];
    setEntries(rows);
    setHasMore(rows.length === PAGE_SIZE);
    setPage(pageNum);
    setLoading(false);
  };

  useEffect(() => { load(0); }, [actionFilter, searchTerm]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Activity Log
          </h1>
          <Button variant="outline" size="sm" onClick={() => load(page)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, summary, entity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="publish">Publish</SelectItem>
              <SelectItem value="draft_save">Draft save</SelectItem>
              <SelectItem value="revert">Revert</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="role_change">Role change</SelectItem>
              <SelectItem value="settings_publish">Settings publish</SelectItem>
              <SelectItem value="order_status_change">Order status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border/50 bg-card/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="max-w-[300px]">Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No activity found
                  </TableCell>
                </TableRow>
              )}
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.created_at), "MMM d, HH:mm:ss")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.user_email || entry.user_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    {entry.user_role && (
                      <Badge variant="outline" className="text-[10px]">
                        {entry.user_role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={(ACTION_COLORS[entry.action] as any) ?? "secondary"}
                      className="text-[10px]"
                    >
                      {entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.entity_type && (
                      <span>
                        {entry.entity_type}
                        {entry.entity_id && <span className="ml-1 opacity-60">#{entry.entity_id.slice(0, 8)}</span>}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm max-w-[300px] truncate">
                    {entry.summary || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || loading}
            onClick={() => load(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore || loading}
            onClick={() => load(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
