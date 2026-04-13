import { useMemo, useState } from "react";
import { Activity, BarChart3, Box, LayoutTemplate, MousePointerClick, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalyticsDashboard, type AnalyticsFilters } from "@/hooks/use-analytics-dashboard";

const formatNumber = (value: number) => new Intl.NumberFormat().format(Math.round(value || 0));
const formatPercent = (value: number) => `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;
const formatDuration = (value: number) => {
  if (!value) return "0s";
  const seconds = Math.max(0, Math.round(value / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
};

function DeltaBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <Badge variant="outline" className={positive ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"}>
      {positive ? "+" : ""}{value.toFixed(1)}%
    </Badge>
  );
}

function StatCard({ title, value, delta, description, icon: Icon }: { title: string; value: string; delta?: number; description?: string; icon: any }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-[0.18em]">
          <Icon className="h-3.5 w-3.5 text-primary" /> {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          {typeof delta === "number" && <DeltaBadge value={delta} />}
        </div>
      </CardContent>
    </Card>
  );
}

function RankedTable({
  items,
  title,
  subtitle,
  valueKey,
  valueLabel,
}: {
  items: Array<Record<string, any>>;
  title: string;
  subtitle: string;
  valueKey: string;
  valueLabel: string;
}) {
  const max = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet for this filter.</p>
        ) : items.map((item) => (
          <div key={`${item.id || item.pagePath || item.label}`} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{item.label || item.pagePath || item.id}</p>
                {(item.pagePath || item.kind) && <p className="truncate text-[11px] text-muted-foreground">{item.pagePath || item.kind}</p>}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatNumber(Number(item[valueKey] || 0))} {valueLabel}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted/40">
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${(Number(item[valueKey] || 0) / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    range: "30d",
    page: "all",
    device: "all",
    surface: "storefront",
  });

  const { data, isLoading } = useAnalyticsDashboard(filters);
  const current = data?.current;
  const comparison = data?.comparison;
  const pages = data?.filtersMeta.pages ?? [];

  const topPages = useMemo(() => current?.pageStats.slice(0, 6) ?? [], [current?.pageStats]);
  const topSections = useMemo(() => current?.sectionStats.slice(0, 6) ?? [], [current?.sectionStats]);
  const topComponents = useMemo(() => current?.componentStats.slice(0, 6) ?? [], [current?.componentStats]);
  const topProducts = useMemo(() => current?.commerceStats.slice(0, 6) ?? [], [current?.commerceStats]);
  const popupStats = useMemo(() => current?.popupStats.slice(0, 6) ?? [], [current?.popupStats]);
  const editorStats = useMemo(() => current?.editorStats.slice(0, 8) ?? [], [current?.editorStats]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border/30 bg-card/50 p-4 backdrop-blur-xl lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground">Analytics Layer</h1>
                <p className="text-sm text-muted-foreground">Measure page, section, popup, component, commerce, and editor performance from one dashboard.</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">Engagement</Badge>
              <Badge variant="outline">Commerce</Badge>
              <Badge variant="outline">Editor usage</Badge>
              <Badge variant="outline">Reusable sections + components</Badge>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={filters.range} onValueChange={(value) => setFilters((prev) => ({ ...prev, range: value as AnalyticsFilters["range"] }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.page} onValueChange={(value) => setFilters((prev) => ({ ...prev, page: value }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Page" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All pages</SelectItem>
                {pages.map((page) => <SelectItem key={page.value} value={page.value}>{page.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.device} onValueChange={(value) => setFilters((prev) => ({ ...prev, device: value as AnalyticsFilters["device"] }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.surface} onValueChange={(value) => setFilters((prev) => ({ ...prev, surface: value as AnalyticsFilters["surface"] }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All surfaces</SelectItem>
                <SelectItem value="storefront">Storefront</SelectItem>
                <SelectItem value="admin">Admin / editor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading || !current || !comparison ? (
          <div className="rounded-xl border border-border/30 bg-card/40 p-6 text-sm text-muted-foreground">Loading analytics…</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <StatCard title="Total views" value={formatNumber(current.overview.totalViews)} delta={comparison.totalViews} description="Pages, sections, popups, and products" icon={Activity} />
              <StatCard title="Unique visitors" value={formatNumber(current.overview.uniqueVisitors)} delta={comparison.uniqueVisitors} description={`Avg engagement ${formatDuration(current.overview.avgEngagementMs)}`} icon={TrendingUp} />
              <StatCard title="Total clicks" value={formatNumber(current.overview.totalClicks)} delta={comparison.totalClicks} description={`CTR ${formatPercent(current.overview.ctr)}`} icon={MousePointerClick} />
              <StatCard title="Add to carts" value={formatNumber(current.overview.addToCarts)} delta={comparison.addToCarts} description={`Checkouts ${formatNumber(current.overview.checkouts)}`} icon={ShoppingCart} />
              <StatCard title="Purchases" value={formatNumber(current.overview.purchases)} delta={comparison.purchases} description={`Conversion ${formatPercent(current.overview.conversionRate)}`} icon={Package} />
              <StatCard title="Page depth" value={formatPercent(current.overview.maxScrollDepth)} delta={comparison.conversionRate} description="Highest recorded scroll milestone" icon={LayoutTemplate} />
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid h-10 w-full grid-cols-6 lg:grid-cols-6">
                <TabsTrigger value="overview" className="text-[10px]">Overview</TabsTrigger>
                <TabsTrigger value="pages" className="text-[10px]">Pages</TabsTrigger>
                <TabsTrigger value="sections" className="text-[10px]">Sections</TabsTrigger>
                <TabsTrigger value="components" className="text-[10px]">Components</TabsTrigger>
                <TabsTrigger value="commerce" className="text-[10px]">Commerce</TabsTrigger>
                <TabsTrigger value="editor" className="text-[10px]">Editor</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="grid gap-4 xl:grid-cols-2">
                <RankedTable items={topPages} title="Top pages" subtitle="Most-viewed pages in the selected period." valueKey="views" valueLabel="views" />
                <RankedTable items={topSections} title="Top sections" subtitle="Best-performing blocks and reusable sections." valueKey="views" valueLabel="views" />
                <RankedTable items={popupStats} title="Popups & campaigns" subtitle="Which popups and campaign touches are getting attention." valueKey="views" valueLabel="views" />
                <RankedTable items={topProducts} title="Commerce movers" subtitle="Products leading page views and cart actions." valueKey="views" valueLabel="views" />
              </TabsContent>

              <TabsContent value="pages">
                <Card>
                  <CardHeader>
                    <CardTitle>Page performance</CardTitle>
                    <CardDescription>Views, unique visitors, CTR, engagement time, and conversions by page.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {current.pageStats.length === 0 ? <p className="text-sm text-muted-foreground">No page data yet.</p> : current.pageStats.map((page) => (
                      <div key={page.pagePath} className="grid gap-2 rounded-xl border border-border/30 p-3 md:grid-cols-[1.5fr_repeat(5,0.8fr)] md:items-center">
                        <div>
                          <p className="font-medium text-foreground">{page.label || page.pagePath}</p>
                          <p className="text-[11px] text-muted-foreground">{page.pagePath}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatNumber(page.views)} views</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(page.uniqueVisitors)} visitors</p>
                        <p className="text-xs text-muted-foreground">{formatPercent(page.ctr)} CTR</p>
                        <p className="text-xs text-muted-foreground">{formatDuration(page.avgEngagementMs)}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(page.conversions)} conversions</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sections">
                <Card>
                  <CardHeader>
                    <CardTitle>Sections and blocks</CardTitle>
                    <CardDescription>Impressions, clicks, CTR, and assisted conversions for page sections and synced components.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {current.sectionStats.length === 0 ? <p className="text-sm text-muted-foreground">No section data yet.</p> : current.sectionStats.map((section) => (
                      <div key={`${section.entityType}:${section.id}`} className="grid gap-2 rounded-xl border border-border/30 p-3 md:grid-cols-[1.5fr_repeat(4,0.9fr)] md:items-center">
                        <div>
                          <p className="font-medium text-foreground">{section.label}</p>
                          <p className="text-[11px] text-muted-foreground">{section.entityType} · {section.pagePath}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatNumber(section.views)} views</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(section.clicks)} clicks</p>
                        <p className="text-xs text-muted-foreground">{formatPercent(section.ctr)} CTR</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(section.conversions)} assists</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="components">
                <Card>
                  <CardHeader>
                    <CardTitle>Reusable sections & global components</CardTitle>
                    <CardDescription>Cross-page performance for shared building blocks and synced components.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {current.componentStats.length === 0 ? <p className="text-sm text-muted-foreground">No component analytics yet.</p> : current.componentStats.map((component) => (
                      <div key={component.id} className="grid gap-2 rounded-xl border border-border/30 p-3 md:grid-cols-[1.4fr_repeat(5,0.8fr)] md:items-center">
                        <div>
                          <p className="font-medium text-foreground">{component.label}</p>
                          <p className="text-[11px] text-muted-foreground">{component.kind}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatNumber(component.pageCount)} pages</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(component.instanceCount)} instances</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(component.views)} views</p>
                        <p className="text-xs text-muted-foreground">{formatPercent(component.ctr)} CTR</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(component.conversions)} assists</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="commerce">
                <div className="grid gap-4 xl:grid-cols-2">
                  <RankedTable items={topProducts} title="Top products" subtitle="Measured from views, clicks, and commerce actions." valueKey="views" valueLabel="views" />
                  <Card>
                    <CardHeader>
                      <CardTitle>Commerce funnel</CardTitle>
                      <CardDescription>Track how visitors move from browsing into cart and checkout.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-xl border border-border/30 p-3">
                        <div className="flex items-center justify-between"><span>Views</span><strong>{formatNumber(current.overview.totalViews)}</strong></div>
                        <div className="mt-2 h-2 rounded-full bg-muted/40"><div className="h-full rounded-full bg-primary/70" style={{ width: "100%" }} /></div>
                      </div>
                      <div className="rounded-xl border border-border/30 p-3">
                        <div className="flex items-center justify-between"><span>Add to carts</span><strong>{formatNumber(current.overview.addToCarts)}</strong></div>
                        <div className="mt-2 h-2 rounded-full bg-muted/40"><div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, current.overview.totalViews ? (current.overview.addToCarts / current.overview.totalViews) * 100 : 0)}%` }} /></div>
                      </div>
                      <div className="rounded-xl border border-border/30 p-3">
                        <div className="flex items-center justify-between"><span>Checkouts</span><strong>{formatNumber(current.overview.checkouts)}</strong></div>
                        <div className="mt-2 h-2 rounded-full bg-muted/40"><div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, current.overview.addToCarts ? (current.overview.checkouts / current.overview.addToCarts) * 100 : 0)}%` }} /></div>
                      </div>
                      <div className="rounded-xl border border-border/30 p-3">
                        <div className="flex items-center justify-between"><span>Purchases</span><strong>{formatNumber(current.overview.purchases)}</strong></div>
                        <div className="mt-2 h-2 rounded-full bg-muted/40"><div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, current.overview.checkouts ? (current.overview.purchases / current.overview.checkouts) * 100 : 0)}%` }} /></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="editor">
                <div className="grid gap-4 xl:grid-cols-2">
                  <RankedTable items={editorStats} title="Most-used editor actions" subtitle="Save, publish, block insertion, reusable usage, and preset workflows." valueKey="count" valueLabel="events" />
                  <Card>
                    <CardHeader>
                      <CardTitle>Editor insight summary</CardTitle>
                      <CardDescription>What builders are doing most often in the admin experience.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>• Saves and publishes are now tracked as first-class admin events.</p>
                      <p>• Reusable section inserts and synced component usage feed the same analytics layer.</p>
                      <p>• Selected section analytics can also be viewed directly inside the Page Editor side panel.</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </>
  );
}
