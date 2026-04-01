import { useState } from "react";
import {
  TrendingUp, DollarSign, Users, ShoppingCart, BarChart3, Zap,
  Target, Megaphone, Gift, TicketPercent, Package, AlertTriangle,
  CheckCircle, ArrowUpRight, ArrowDownRight, Lightbulb, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin/AdminLayout";
import StatTile from "@/components/admin/dashboard/StatTile";
import ChartCard from "@/components/admin/dashboard/ChartCard";
import InsightCard from "@/components/admin/dashboard/InsightCard";
import { useAdminDashboard, Period } from "@/hooks/use-admin-dashboard";
import { useAdminGrowth } from "@/hooks/use-admin-growth";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";
import { Link } from "react-router-dom";

const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(160,60%,45%)", "hsl(45,90%,55%)",
  "hsl(280,60%,55%)", "hsl(0,70%,55%)", "hsl(200,70%,50%)",
];

const AdminGrowth = () => {
  const [period, setPeriod] = useState<Period>("30d");
  const { data, loading } = useAdminDashboard(period);
  const { marketing, actionItems, loading: growthLoading } = useAdminGrowth();

  const revenuePerUser = data.clientsCount > 0 ? data.revenue / data.clientsCount : 0;

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
            Growth & Marketing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Revenue intelligence, marketing suggestions & action center</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-36 glass-card border-white/[0.06]">
            <Calendar className="mr-1 h-4 w-4 text-primary" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Revenue KPIs */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Total Revenue" value={`${data.revenue.toFixed(0)} kr`} icon={DollarSign} accent="green"
              sub={`${data.ordersCount} orders`} />
            <StatTile label="Avg Order Value" value={`${data.avgOrderValue.toFixed(0)} kr`} icon={TrendingUp}
              sub="Per transaction" />
            <StatTile label="Revenue per User" value={`${revenuePerUser.toFixed(0)} kr`} icon={Users}
              sub={`${data.clientsCount} users`} />
            <StatTile label="Custom Orders Active" value={data.customOrdersActive} icon={Package}
              sub={`${data.quotesAwaiting} quotes pending`} accent="purple" />
          </div>

          {/* Revenue Chart */}
          <div className="mb-8">
            <ChartCard title="Revenue Trend" icon={TrendingUp}>
              {data.revenueByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.revenueByDay}>
                    <defs>
                      <linearGradient id="growthRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(v: number) => `${v.toFixed(2)} kr`} />
                    <Area type="monotone" dataKey="revenue" fill="url(#growthRevGrad)" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">No revenue data yet.</p>
              )}
            </ChartCard>
          </div>

          {/* Marketing Suggestions & Action Center */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            {/* AI Marketing Suggestions */}
            <ChartCard title="Marketing Suggestions" icon={Megaphone}>
              <div className="space-y-3">
                {growthLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
                ) : marketing.length > 0 ? marketing.map((s, i) => (
                  <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{s.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{s.reason}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {s.impact}
                          </span>
                          {s.action && (
                            <Link to={s.action.to} className="text-[10px] font-semibold text-primary hover:underline">
                              {s.action.label} →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">Not enough data for suggestions yet.</p>
                )}
              </div>
            </ChartCard>

            {/* Action Center */}
            <ChartCard title="Action Center" icon={Target}>
              <div className="space-y-2">
                {growthLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
                ) : actionItems.length > 0 ? actionItems.map((item, i) => (
                  <Link key={i} to={item.to}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-1.5 ${
                        item.severity === "urgent" ? "bg-red-500/10" :
                        item.severity === "warning" ? "bg-amber-500/10" : "bg-primary/10"
                      }`}>
                        <item.icon className={`h-4 w-4 ${
                          item.severity === "urgent" ? "text-red-400" :
                          item.severity === "warning" ? "text-amber-400" : "text-primary"
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      item.severity === "urgent" ? "bg-red-500/10 text-red-400" :
                      item.severity === "warning" ? "bg-amber-500/10 text-amber-400" : "bg-primary/10 text-primary"
                    }`}>{item.count}</span>
                  </Link>
                )) : (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-foreground">All clear — nothing needs your attention!</span>
                  </div>
                )}
              </div>
            </ChartCard>
          </div>

          {/* Revenue Insights */}
          <div className="mb-8">
            <ChartCard title="Revenue Insights" icon={Zap}>
              <div className="space-y-2">
                {data.insights.length > 0 ? data.insights.map((ins, i) => (
                  <InsightCard key={i} message={ins.message} type={ins.type} />
                )) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">Not enough data for insights yet.</p>
                )}
              </div>
            </ChartCard>
          </div>

          {/* Top Products + Loyalty */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <ChartCard title="Top Products by Revenue" icon={BarChart3}>
              {data.topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.topProducts} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(v: number) => `${v.toFixed(2)} kr`} />
                    <Bar dataKey="rev" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">No product data yet.</p>
              )}
            </ChartCard>

            <ChartCard title="Loyalty & Rewards" icon={Gift}>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                  <p className="font-display text-2xl font-bold text-primary">{data.loyaltyPointsIssued.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Points Issued</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                  <p className="font-display text-2xl font-bold text-foreground">{data.vouchersRedeemed}</p>
                  <p className="text-xs text-muted-foreground">Vouchers Redeemed</p>
                </div>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminGrowth;
