import { useEffect, useState } from "react";
import { Calculator, History, TrendingUp, AlertTriangle, CheckCircle, Zap, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import PricingCalculator from "@/components/admin/PricingCalculator";
import ChartCard from "@/components/admin/dashboard/ChartCard";
import InsightCard from "@/components/admin/dashboard/InsightCard";

interface PriceCalcRecord {
  id: string;
  product_id: string | null;
  custom_order_id: string | null;
  material_cost_per_kg: number;
  object_weight_grams: number;
  print_time_hours: number;
  production_cost: number;
  suggested_price: number;
  final_price: number | null;
  finishing_difficulty: string;
  margin_percentage: number;
  notes: string | null;
  created_at: string;
}

function getPriceHealth(production: number, final: number | null, suggested: number) {
  const price = final ?? suggested;
  const margin = ((price - production) / price) * 100;
  if (margin >= 50) return { label: "Premium", color: "bg-blue-500/10 text-blue-400", icon: "🔵" };
  if (margin >= 35) return { label: "Optimal", color: "bg-emerald-500/10 text-emerald-400", icon: "🟢" };
  if (margin >= 15) return { label: "Low Margin", color: "bg-amber-500/10 text-amber-400", icon: "🟡" };
  return { label: "Underpriced", color: "bg-red-500/10 text-red-400", icon: "🔴" };
}

const AdminPricing = () => {
  const [history, setHistory] = useState<PriceCalcRecord[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});
  const [productPrices, setProductPrices] = useState<{ id: string; name: string; price: number; cost: number; margin: number }[]>([]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("price_calculations" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data as any as PriceCalcRecord[]) ?? []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, price");
    const map: Record<string, string> = {};
    const prices: typeof productPrices = [];
    (data ?? []).forEach((p: any) => {
      map[p.id] = p.name;
      prices.push({ id: p.id, name: p.name, price: Number(p.price), cost: 0, margin: 0 });
    });
    setProducts(map);
    setProductPrices(prices);
  };

  useEffect(() => {
    fetchHistory();
    fetchProducts();
  }, []);

  // Compute pricing insights from history
  const avgMargin = history.length > 0
    ? history.reduce((s, h) => s + h.margin_percentage, 0) / history.length
    : 0;
  const underpricedCount = history.filter(h => {
    const price = h.final_price ?? h.suggested_price;
    return ((price - h.production_cost) / price) * 100 < 15;
  }).length;
  const premiumCount = history.filter(h => {
    const price = h.final_price ?? h.suggested_price;
    return ((price - h.production_cost) / price) * 100 >= 50;
  }).length;

  const insights: { message: string; type: "positive" | "neutral" | "warning" }[] = [];
  if (history.length > 0) {
    insights.push({ message: `Average margin across ${history.length} calculations: ${avgMargin.toFixed(0)}%.`, type: avgMargin >= 35 ? "positive" : "warning" });
  }
  if (underpricedCount > 0) {
    insights.push({ message: `${underpricedCount} calculation(s) flagged as underpriced (<15% margin).`, type: "warning" });
  }
  if (premiumCount > 0) {
    insights.push({ message: `${premiumCount} item(s) in premium pricing tier (≥50% margin).`, type: "positive" });
  }

  return (
    <AdminLayout>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase text-foreground">
        Pricing Intelligence
      </h1>

      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calculator" className="font-display uppercase tracking-wider">
            <Calculator className="mr-2 h-4 w-4" /> Calculator
          </TabsTrigger>
          <TabsTrigger value="health" className="font-display uppercase tracking-wider">
            <TrendingUp className="mr-2 h-4 w-4" /> Price Health
          </TabsTrigger>
          <TabsTrigger value="history" className="font-display uppercase tracking-wider">
            <History className="mr-2 h-4 w-4" /> Cost History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator">
          <Card>
            <CardHeader>
              <CardTitle className="font-display uppercase">Price Estimator</CardTitle>
              <p className="text-sm text-muted-foreground">
                Calculate production costs and suggested retail prices in DKK for 3D printed items.
              </p>
            </CardHeader>
            <CardContent>
              <PricingCalculator onPriceCalculated={() => fetchHistory()} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          {/* Pricing Insights */}
          <ChartCard title="Pricing Insights" icon={Zap}>
            <div className="space-y-2">
              {insights.length > 0 ? insights.map((ins, i) => (
                <InsightCard key={i} message={ins.message} type={ins.type} />
              )) : (
                <p className="py-6 text-center text-sm text-muted-foreground">Run some calculations to see pricing insights.</p>
              )}
            </div>
          </ChartCard>

          {/* Health Legend */}
          <div className="flex flex-wrap gap-3">
            {[
              { icon: "🟢", label: "Optimal (35-50%)" },
              { icon: "🟡", label: "Low Margin (15-35%)" },
              { icon: "🔴", label: "Underpriced (<15%)" },
              { icon: "🔵", label: "Premium (≥50%)" },
            ].map((h) => (
              <div key={h.label} className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-muted-foreground">
                <span>{h.icon}</span> {h.label}
              </div>
            ))}
          </div>

          {/* History with health indicators */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display uppercase text-sm">Calculation Health Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Production</TableHead>
                    <TableHead>Suggested</TableHead>
                    <TableHead>Final</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.slice(0, 20).map((row) => {
                    const finalP = row.final_price ?? row.suggested_price;
                    const margin = ((finalP - row.production_cost) / finalP) * 100;
                    const health = getPriceHealth(row.production_cost, row.final_price, row.suggested_price);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(row.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-display text-sm">
                          {row.product_id ? products[row.product_id] || "—" : row.custom_order_id ? "Custom Order" : "Standalone"}
                        </TableCell>
                        <TableCell className="text-sm">{Number(row.production_cost).toFixed(2)} DKK</TableCell>
                        <TableCell className="text-sm">{Number(row.suggested_price).toFixed(2)} DKK</TableCell>
                        <TableCell className="font-display text-sm font-bold text-primary">
                          {row.final_price ? `${Number(row.final_price).toFixed(2)} DKK` : "—"}
                        </TableCell>
                        <TableCell className="font-display text-sm font-semibold">{margin.toFixed(0)}%</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${health.color} border-0 text-[10px]`}>
                            {health.icon} {health.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        No calculations yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="font-display uppercase">Calculation History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Print Time</TableHead>
                    <TableHead>Finishing</TableHead>
                    <TableHead>Production</TableHead>
                    <TableHead>Suggested</TableHead>
                    <TableHead>Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-display text-sm">
                        {row.product_id ? products[row.product_id] || "—" : row.custom_order_id ? "Custom Order" : "Standalone"}
                      </TableCell>
                      <TableCell className="text-sm">{row.object_weight_grams}g</TableCell>
                      <TableCell className="text-sm">{row.print_time_hours}h</TableCell>
                      <TableCell className="text-xs uppercase">{row.finishing_difficulty}</TableCell>
                      <TableCell className="font-display text-sm font-semibold">
                        {Number(row.production_cost).toFixed(2)} DKK
                      </TableCell>
                      <TableCell className="font-display text-sm">
                        {Number(row.suggested_price).toFixed(2)} DKK
                      </TableCell>
                      <TableCell className="font-display text-sm font-bold text-primary">
                        {row.final_price ? `${Number(row.final_price).toFixed(2)} DKK` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No calculations yet. Use the calculator to generate pricing.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminPricing;
