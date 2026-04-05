import { useEffect, useState, useMemo } from "react";
import { Search, UserPlus, Users, ShoppingCart, Star, Filter, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface ReferralRow {
  id: string;
  invite_code: string;
  inviter_user_id: string;
  invited_email: string | null;
  invited_user_id: string | null;
  status: string;
  inviter_points_granted: boolean;
  invited_points_granted: boolean;
  inviter_points_amount: number;
  invited_points_amount: number;
  created_at: string;
  account_created_at: string | null;
  first_order_at: string | null;
}

interface ProfileMap {
  [userId: string]: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  registered: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  ordered: "bg-green-500/10 text-green-600 border-green-500/30",
  rewarded: "bg-purple-500/10 text-purple-600 border-purple-500/30",
};

type SortKey = "newest" | "oldest" | "most_points";

const AdminReferrals = () => {
  const [invites, setInvites] = useState<ReferralRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  useEffect(() => {
    const load = async () => {
      const [{ data: inviteData }, { data: profileData }] = await Promise.all([
        supabase.from("referral_invites").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name"),
      ]);

      setInvites((inviteData ?? []) as ReferralRow[]);

      const map: ProfileMap = {};
      (profileData ?? []).forEach((p: { user_id: string; full_name: string | null }) => {
        if (p.full_name) map[p.user_id] = p.full_name;
      });
      setProfiles(map);
      setLoading(false);
    };
    load();
  }, []);

  const totalInvites = invites.length;
  const accountsCreated = invites.filter((i) => i.status === "registered" || i.status === "ordered").length;
  const firstOrders = invites.filter((i) => i.status === "ordered").length;
  const totalPoints = invites.reduce((sum, i) => {
    let pts = 0;
    if (i.inviter_points_granted) pts += i.inviter_points_amount ?? 25;
    if (i.invited_points_granted) pts += i.invited_points_amount ?? 15;
    return sum + pts;
  }, 0);

  const filtered = useMemo(() => {
    let list = invites;

    if (statusFilter !== "all") {
      list = list.filter((i) => i.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => {
        const inviterName = profiles[i.inviter_user_id] ?? "";
        const invitedName = i.invited_user_id ? (profiles[i.invited_user_id] ?? "") : "";
        return (
          (i.invited_email ?? "").toLowerCase().includes(q) ||
          i.invite_code.toLowerCase().includes(q) ||
          i.inviter_user_id.toLowerCase().includes(q) ||
          inviterName.toLowerCase().includes(q) ||
          invitedName.toLowerCase().includes(q)
        );
      });
    }

    if (sortKey === "oldest") {
      list = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortKey === "most_points") {
      list = [...list].sort((a, b) => {
        const ptsA = (a.inviter_points_granted ? (a.inviter_points_amount ?? 25) : 0);
        const ptsB = (b.inviter_points_granted ? (b.inviter_points_amount ?? 25) : 0);
        return ptsB - ptsA;
      });
    }

    return list;
  }, [invites, statusFilter, search, sortKey, profiles]);

  const getUserLabel = (userId: string): string => {
    return profiles[userId] ?? userId.slice(0, 8) + "…";
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Referral Management</h1>
        <p className="text-sm text-muted-foreground">Track all invites, conversions, and reward payouts.</p>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {[
            { icon: UserPlus, label: "Total Invites", value: totalInvites },
            { icon: Users, label: "Accounts Created", value: accountsCreated },
            { icon: ShoppingCart, label: "First Orders", value: firstOrders },
            { icon: Star, label: "Points Granted", value: totalPoints },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="border-primary/10">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-display text-xl font-bold text-foreground">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, code, or user..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-40">
            <ArrowUpDown className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="most_points">Most points</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inviter</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited At</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>First Order</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No referral invites found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((invite) => {
                  const sc = statusColors[invite.status] ?? statusColors.pending;
                  const pts = invite.inviter_points_granted ? (invite.inviter_points_amount ?? 25) : 0;
                  return (
                    <TableRow key={invite.id}>
                      <TableCell className="text-sm">{getUserLabel(invite.inviter_user_id)}</TableCell>
                      <TableCell className="text-sm">{invite.invited_email || (invite.invited_user_id ? getUserLabel(invite.invited_user_id) : "—")}</TableCell>
                      <TableCell><code className="font-mono text-xs">{invite.invite_code}</code></TableCell>
                      <TableCell><Badge variant="outline" className={sc}>{invite.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(invite.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{invite.account_created_at ? new Date(invite.account_created_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{invite.first_order_at ? new Date(invite.first_order_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right font-display font-bold text-sm">{pts > 0 ? `+${pts}` : "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminReferrals;
