import { useEffect, useState } from "react";
import { UserPlus, Users, ShoppingCart, Star, TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface ReferralStats {
  totalInvites: number;
  accountsCreated: number;
  firstOrders: number;
  pointsGranted: number;
  topInviters: { user_id: string; count: number; email?: string }[];
}

type DateRange = "today" | "week" | "all";

const ReferralStatsWidget = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [range, setRange] = useState<DateRange>("all");

  useEffect(() => {
    const load = async () => {
      let query = supabase
        .from("referral_invites")
        .select("inviter_user_id, status, inviter_points_granted, invited_points_granted, inviter_points_amount, invited_points_amount, created_at");

      if (range === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte("created_at", today.toISOString());
      } else if (range === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte("created_at", weekAgo.toISOString());
      }

      const { data: invites } = await query;
      if (!invites) return;

      const totalInvites = invites.length;
      const accountsCreated = invites.filter((i) => i.status === "registered" || i.status === "ordered").length;
      const firstOrders = invites.filter((i) => i.status === "ordered").length;

      const inviterPoints = invites
        .filter((i) => i.inviter_points_granted)
        .reduce((sum, i) => sum + ((i as Record<string, unknown>).inviter_points_amount as number ?? 25), 0);
      const invitedPoints = invites
        .filter((i) => i.invited_points_granted)
        .reduce((sum, i) => sum + ((i as Record<string, unknown>).invited_points_amount as number ?? 15), 0);

      const inviterCounts = new Map<string, number>();
      invites.forEach((i) => {
        inviterCounts.set(i.inviter_user_id, (inviterCounts.get(i.inviter_user_id) ?? 0) + 1);
      });
      const topInviters = Array.from(inviterCounts.entries())
        .map(([user_id, count]) => ({ user_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalInvites,
        accountsCreated,
        firstOrders,
        pointsGranted: inviterPoints + invitedPoints,
        topInviters,
      });
    };
    load();
  }, [range]);

  if (!stats) return null;

  const tiles = [
    { icon: UserPlus, label: "Invites Sent", value: stats.totalInvites },
    { icon: Users, label: "Accounts Created", value: stats.accountsCreated },
    { icon: ShoppingCart, label: "First Orders", value: stats.firstOrders },
    { icon: Star, label: "Points Granted", value: stats.pointsGranted },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-display uppercase">
            <TrendingUp className="h-4 w-4 text-primary" />
            Referral Program
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
              <SelectTrigger className="h-7 w-24 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Link to="/referrals">
              <Button variant="ghost" size="sm" className="h-7 text-[11px]">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {tiles.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg border border-border/20 bg-background/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</span>
              </div>
              <p className="font-display text-lg font-bold">{value}</p>
            </div>
          ))}
        </div>

        {stats.topInviters.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Top Inviters</p>
            <div className="space-y-1.5">
              {stats.topInviters.map((inv, i) => (
                <div key={inv.user_id} className="flex items-center justify-between text-sm rounded-md bg-muted/20 px-2 py-1.5">
                  <span className="text-muted-foreground text-xs">#{i + 1}</span>
                  <span className="flex-1 ml-2 truncate text-xs font-mono">{inv.user_id.slice(0, 8)}…</span>
                  <span className="font-display font-bold text-xs">{inv.count} invites</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralStatsWidget;
