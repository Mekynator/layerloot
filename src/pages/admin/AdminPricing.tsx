import { useEffect, useState } from "react";
import { Calculator, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import PricingCalculator from "@/components/admin/PricingCalculator";

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

const AdminPricing = () => {
  const [history, setHistory] = useState<PriceCalcRecord[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("price_calculations" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data as any as PriceCalcRecord[]) ?? []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("id, name");
    const map: Record<string, string> = {};
    (data ?? []).forEach((p: any) => { map[p.id] = p.name; });
    setProducts(map);
  };

  useEffect(() => {
    fetchHistory();
    fetchProducts();
  }, []);

  return (
    <AdminLayout>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase text-foreground">
        Pricing Calculator
      </h1>

      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calculator" className="font-display uppercase tracking-wider">
            <Calculator className="mr-2 h-4 w-4" /> Calculator
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
                        {Number(row.production_cost).toFixed(2)} kr
                      </TableCell>
                      <TableCell className="font-display text-sm">
                        {Number(row.suggested_price).toFixed(2)} kr
                      </TableCell>
                      <TableCell className="font-display text-sm font-bold text-primary">
                        {row.final_price ? `${Number(row.final_price).toFixed(2)} kr` : "—"}
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
