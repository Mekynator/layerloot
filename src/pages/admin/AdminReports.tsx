import { useState, useEffect, useMemo } from "react";
import {
  FileText, Download, Calendar, Filter, DollarSign, Package, ShoppingCart,
  TicketPercent, Users, TrendingUp, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ChartCard from "@/components/admin/dashboard/ChartCard";
import InsightCard from "@/components/admin/dashboard/InsightCard";

type ReportPeriod = "7d" | "30d" | "90d" | "all";

function getDateCutoff(period: ReportPeriod): string | null {
  if (period === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - (period === "7d" ? 7 : period === "30d" ? 30 : 90));
  return d.toISOString();
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

const AdminReports = () => {
  const [period, setPeriod] = useState<ReportPeriod>("30d");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [customOrders, setCustomOrders] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const cutoff = getDateCutoff(period);
      const [ordRes, itemsRes, coRes, vRes, dcRes] = await Promise.all([
        cutoff
          ? supabase.from("orders").select("*").gte("created_at", cutoff).order("created_at", { ascending: false })
          : supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("order_items").select("*"),
        cutoff
          ? supabase.from("custom_orders").select("*").gte("created_at", cutoff).order("created_at", { ascending: false })
          : supabase.from("custom_orders").select("*").order("created_at", { ascending: false }),
        supabase.from("user_vouchers").select("*, vouchers(name, discount_value, discount_type)"),
        supabase.from("discount_codes").select("*"),
      ]);
      setOrders(ordRes.data ?? []);
      setOrderItems(itemsRes.data ?? []);
      setCustomOrders(coRes.data ?? []);
      setVouchers(vRes.data ?? []);
      setDiscountCodes(dcRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [period]);

  // Sales summary
  const salesSummary = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
    const avg = orders.length > 0 ? revenue / orders.length : 0;
    const completed = orders.filter((o) => o.status === "completed").length;
    return { revenue, avg, count: orders.length, completed };
  }, [orders]);

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; rev: number }> = {};
    const orderIds = new Set(orders.map((o) => o.id));
    orderItems.filter((i) => orderIds.has(i.order_id)).forEach((i) => {
      const key = i.product_name;
      if (!map[key]) map[key] = { name: key, qty: 0, rev: 0 };
      map[key].qty += Number(i.quantity);
      map[key].rev += Number(i.total_price);
    });
    return Object.values(map).sort((a, b) => b.rev - a.rev).slice(0, 10);
  }, [orders, orderItems]);

  // Custom orders summary
  const customSummary = useMemo(() => {
    const total = customOrders.length;
    const quoted = customOrders.filter((c) => c.status === "quoted").length;
    const accepted = customOrders.filter((c) => c.status === "accepted" || c.status === "completed").length;
    const totalValue = customOrders.reduce((s, c) => s + Number(c.final_agreed_price || c.quoted_price || 0), 0);
    return { total, quoted, accepted, totalValue };
  }, [customOrders]);

  // Voucher summary
  const voucherSummary = useMemo(() => {
    const used = vouchers.filter((v) => v.is_used).length;
    const unused = vouchers.filter((v) => !v.is_used).length;
    return { total: vouchers.length, used, unused };
  }, [vouchers]);

  // Insights
  const insights = useMemo(() => {
    const ins: { message: string; type: "positive" | "neutral" | "warning" }[] = [];
    if (salesSummary.count > 0) {
      ins.push({ message: `${salesSummary.count} orders generated ${salesSummary.revenue.toFixed(0)} kr in revenue.`, type: "positive" });
    }
    if (salesSummary.avg > 0) {
      ins.push({ message: `Average order value: ${salesSummary.avg.toFixed(0)} kr.`, type: "neutral" });
    }
    if (customSummary.accepted > 0) {
      const rate = customSummary.total > 0 ? ((customSummary.accepted / customSummary.total) * 100).toFixed(0) : "0";
      ins.push({ message: `Custom order acceptance rate: ${rate}%.`, type: Number(rate) > 50 ? "positive" : "neutral" });
    }
    if (voucherSummary.unused > 5) {
      ins.push({ message: `${voucherSummary.unused} vouchers remain unused — consider a redemption push.`, type: "warning" });
    }
    return ins;
  }, [salesSummary, customSummary, voucherSummary]);

  const exportSalesReport = () => {
    const rows = [["Order ID", "Total (DKK)", "Status", "Date"]];
    orders.forEach((o) => rows.push([o.id, Number(o.total).toFixed(2), o.status, new Date(o.created_at).toLocaleDateString()]));
    downloadCSV(rows, `sales-report-${period}.csv`);
  };

  const exportCustomOrdersReport = () => {
    const rows = [["ID", "Customer", "Status", "Quoted", "Final", "Date"]];
    customOrders.forEach((c) => rows.push([
      c.id, c.name, c.status,
      c.quoted_price ? Number(c.quoted_price).toFixed(2) : "-",
      c.final_agreed_price ? Number(c.final_agreed_price).toFixed(2) : "-",
      new Date(c.created_at).toLocaleDateString(),
    ]));
    downloadCSV(rows, `custom-orders-report-${period}.csv`);
  };

  const exportVoucherReport = () => {
    const rows = [["Code", "Used", "Redeemed At", "Used At"]];
    vouchers.forEach((v) => rows.push([
      v.code, v.is_used ? "Yes" : "No",
      new Date(v.redeemed_at).toLocaleDateString(),
      v.used_at ? new Date(v.used_at).toLocaleDateString() : "-",
    ]));
    downloadCSV(rows, `voucher-report-${period}.csv`);
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
            Smart Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Filtered reports with downloadable summaries</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
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
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Summary Tiles */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-emerald-500/10 p-2.5"><DollarSign className="h-5 w-5 text-emerald-400" /></div>
                <div>
                  <p className="font-display text-xl font-bold text-foreground">{salesSummary.revenue.toFixed(0)} kr</p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-primary/10 p-2.5"><ShoppingCart className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="font-display text-xl font-bold text-foreground">{salesSummary.count}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-purple-500/10 p-2.5"><Package className="h-5 w-5 text-purple-400" /></div>
                <div>
                  <p className="font-display text-xl font-bold text-foreground">{customSummary.total}</p>
                  <p className="text-xs text-muted-foreground">Custom Orders</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-amber-500/10 p-2.5"><Gift className="h-5 w-5 text-amber-400" /></div>
                <div>
                  <p className="font-display text-xl font-bold text-foreground">{voucherSummary.used}/{voucherSummary.total}</p>
                  <p className="text-xs text-muted-foreground">Vouchers Used</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="mb-8">
              <ChartCard title="Report Insights" icon={TrendingUp}>
                <div className="space-y-2">
                  {insights.map((ins, i) => <InsightCard key={i} message={ins.message} type={ins.type} />)}
                </div>
              </ChartCard>
            </div>
          )}

          {/* Reports Tabs */}
          <Tabs defaultValue="sales" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sales" className="font-display uppercase tracking-wider">
                <DollarSign className="mr-1 h-4 w-4" /> Sales
              </TabsTrigger>
              <TabsTrigger value="products" className="font-display uppercase tracking-wider">
                <Package className="mr-1 h-4 w-4" /> Products
              </TabsTrigger>
              <TabsTrigger value="custom" className="font-display uppercase tracking-wider">
                <FileText className="mr-1 h-4 w-4" /> Custom Orders
              </TabsTrigger>
              <TabsTrigger value="vouchers" className="font-display uppercase tracking-wider">
                <TicketPercent className="mr-1 h-4 w-4" /> Vouchers
              </TabsTrigger>
            </TabsList>

            {/* Sales Report */}
            <TabsContent value="sales">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="font-display text-sm uppercase">Sales Report</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportSalesReport} className="font-display text-xs uppercase tracking-wider">
                    <Download className="mr-1 h-4 w-4" /> Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.slice(0, 25).map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-display text-sm">#{o.id.slice(0, 8)}</TableCell>
                          <TableCell className="font-display font-bold text-primary">{Number(o.total).toFixed(2)} kr</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] uppercase ${
                              o.status === "completed" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                              o.status === "pending" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" :
                              "border-primary/30 bg-primary/10 text-primary"
                            }`}>{o.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                      {orders.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No orders in this period.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Report */}
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-sm uppercase">Top Products by Revenue</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Units Sold</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((p, i) => (
                        <TableRow key={p.name}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-display text-sm font-semibold">{p.name}</TableCell>
                          <TableCell>{p.qty}</TableCell>
                          <TableCell className="font-display font-bold text-primary">{p.rev.toFixed(2)} kr</TableCell>
                        </TableRow>
                      ))}
                      {topProducts.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No product data.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Custom Orders Report */}
            <TabsContent value="custom">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="font-display text-sm uppercase">Custom Orders Report</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportCustomOrdersReport} className="font-display text-xs uppercase tracking-wider">
                    <Download className="mr-1 h-4 w-4" /> Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Quoted</TableHead>
                        <TableHead>Final</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customOrders.slice(0, 25).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-display text-sm">{c.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] uppercase">{c.status}</Badge>
                          </TableCell>
                          <TableCell>{c.quoted_price ? `${Number(c.quoted_price).toFixed(2)} kr` : "-"}</TableCell>
                          <TableCell className="font-display font-bold text-primary">
                            {c.final_agreed_price ? `${Number(c.final_agreed_price).toFixed(2)} kr` : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                      {customOrders.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No custom orders.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vouchers Report */}
            <TabsContent value="vouchers">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="font-display text-sm uppercase">Voucher Usage Report</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportVoucherReport} className="font-display text-xs uppercase tracking-wider">
                    <Download className="mr-1 h-4 w-4" /> Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Redeemed</TableHead>
                        <TableHead>Used At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vouchers.slice(0, 25).map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-display text-sm font-semibold">{v.code}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${
                              v.is_used ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                              "border-amber-500/30 bg-amber-500/10 text-amber-400"
                            }`}>{v.is_used ? "Used" : "Unused"}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(v.redeemed_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{v.used_at ? new Date(v.used_at).toLocaleDateString() : "-"}</TableCell>
                        </TableRow>
                      ))}
                      {vouchers.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No vouchers.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminReports;
