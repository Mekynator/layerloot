import {
  DollarSign, Users, TrendingUp, Repeat, Gift, TicketPercent, AlertTriangle,
  UserMinus, Target, Zap, ArrowUpRight, Crown, ShoppingCart, Package, Heart,
  Lightbulb,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import StatTile from "@/components/admin/dashboard/StatTile";
import ChartCard from "@/components/admin/dashboard/ChartCard";
import InsightCard from "@/components/admin/dashboard/InsightCard";
import { useRevenueEngine, type CustomerSegment, type RevenueOpportunity } from "@/hooks/use-revenue-engine";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(160,60%,45%)", "hsl(45,90%,55%)",
  "hsl(280,60%,55%)", "hsl(0,70%,55%)", "hsl(200,70%,50%)",
];

const TIER_COLORS: Record<CustomerSegment["tier"], string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  loyal: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  vip: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  dormant: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  at_risk: "bg-red-500/10 text-red-400 border-red-500/20",
};

const PRIORITY_COLORS = {
  high: "bg-red-500/10 text-red-400",
  medium: "bg-amber-500/10 text-amber-400",
  low: "bg-primary/10 text-primary",
};

const OPP_ICONS: Record<RevenueOpportunity["type"], typeof DollarSign> = {
  reorder: Repeat,
  winback: UserMinus,
  upsell: TrendingUp,
  bundle: Package,
  loyalty: Gift,
  custom_followup: Target,
};

const AdminRevenue = () => {
  const { data, loading } = useRevenueEngine();

  const segmentChartData = Object.entries(data.segments)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "), value }));

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
          Revenue Engine
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue optimization, customer intelligence & growth opportunities
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* KPI Tiles */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Total Revenue" value={`${data.totalRevenue.toFixed(0)} kr`} icon={DollarSign} accent="green" />
            <StatTile label="Avg Order Value" value={`${data.avgOrderValue.toFixed(0)} kr`} icon={ShoppingCart} />
            <StatTile label="Repeat Rate" value={`${data.repeatCustomerRate.toFixed(0)}%`} icon={Repeat} accent="purple"
              sub={`${data.segments.loyal + data.segments.vip} loyal/VIP`} />
            <StatTile label="Custom Revenue" value={`${data.customOrderRevenue.toFixed(0)} kr`} icon={Package} accent="amber" />
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="At-Risk Customers" value={data.atRiskCustomers} icon={AlertTriangle} accent="red"
              sub="High-value, inactive 60+ days" />
            <StatTile label="Dormant Customers" value={data.dormantCustomers} icon={UserMinus}
              sub="Inactive 90+ days" />
            <StatTile label="VIP Customers" value={data.segments.vip} icon={Crown} accent="amber"
              sub="Top spenders & frequent buyers" />
            <StatTile label="Active Customers" value={data.segments.active + data.segments.loyal} icon={Users} accent="green" />
          </div>

          {/* Opportunities */}
          <div className="mb-8">
            <ChartCard title="Revenue Opportunities" icon={Target}>
              {data.opportunities.length > 0 ? (
                <div className="space-y-3">
                  {data.opportunities.map((opp) => {
                    const Icon = OPP_ICONS[opp.type] ?? Zap;
                    return (
                      <div key={opp.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 rounded-lg p-2 ${PRIORITY_COLORS[opp.priority]}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-foreground">{opp.title}</p>
                              <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[opp.priority]}`}>
                                {opp.priority}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">{opp.description}</p>
                            <div className="mt-2 flex items-center gap-3 flex-wrap">
                              <span className="text-xs font-semibold text-primary">
                                Est. {opp.estimatedValue.toFixed(0)} kr
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                → {opp.suggestedAction}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No opportunities identified yet — check back as more data comes in.</p>
              )}
            </ChartCard>
          </div>

          {/* Charts Row */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            {/* Customer Segments */}
            <ChartCard title="Customer Segments" icon={Users}>
              {segmentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={segmentChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                      paddingAngle={3} stroke="none">
                      {segmentChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">No customer data yet.</p>
              )}
            </ChartCard>

            {/* Revenue by Product */}
            <ChartCard title="Revenue by Product" icon={TrendingUp}>
              {data.revenueByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.revenueByCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={100} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(v: number) => `${v.toFixed(0)} kr`} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">No product revenue data yet.</p>
              )}
            </ChartCard>
          </div>

          {/* Top Spenders & Win-back */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <ChartCard title="Top Spenders" icon={Crown}>
              <div className="space-y-2">
                {data.topSpenders.length > 0 ? data.topSpenders.slice(0, 6).map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.orderCount} orders · AOV {c.avgOrderValue.toFixed(0)} kr</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{c.totalSpent.toFixed(0)} kr</p>
                      <Badge variant="outline" className={`text-[9px] ${TIER_COLORS[c.tier]}`}>{c.tier}</Badge>
                    </div>
                  </div>
                )) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">No customer data yet.</p>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Win-Back Candidates" icon={Heart}>
              <div className="space-y-2">
                {data.winbackCandidates.length > 0 ? data.winbackCandidates.slice(0, 6).map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.daysSinceLastPurchase}d since last order · {c.totalSpent.toFixed(0)} kr total
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[9px] ${TIER_COLORS[c.tier]}`}>{c.tier}</Badge>
                      {c.unusedVouchers > 0 && (
                        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-[9px] text-amber-400">
                          {c.unusedVouchers} voucher{c.unusedVouchers > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <Zap className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-foreground">No dormant or at-risk customers — great retention!</span>
                  </div>
                )}
              </div>
            </ChartCard>
          </div>

          {/* Retention Insights */}
          <div className="mb-8">
            <ChartCard title="Retention & Revenue Insights" icon={Lightbulb}>
              <div className="space-y-2">
                {data.retentionInsights.length > 0 ? data.retentionInsights.map((ins, i) => (
                  <InsightCard key={i} message={ins.message} type={ins.type} />
                )) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">Not enough data for insights yet.</p>
                )}
              </div>
            </ChartCard>
          </div>

          {/* Quick Nav */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: "/admin/financial?section=growth", label: "Growth & Marketing", icon: TrendingUp },
              { to: "/admin/campaigns", label: "Campaigns", icon: Target },
              { to: "/admin/users?section=customers", label: "Customer CRM", icon: Users },
              { to: "/admin/financial?section=reports", label: "Reports & Export", icon: DollarSign },
            ].map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}
                className="glass-card flex items-center gap-3 rounded-xl border border-white/[0.06] p-4 transition-all hover:border-primary/30 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{label}</span>
                <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default AdminRevenue;
