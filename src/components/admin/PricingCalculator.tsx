import { useState, useCallback } from "react";
import { Calculator, Save, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CalcInputs {
  materialCostPerKg: number;
  objectWeightGrams: number;
  printTimeHours: number;
  electricityCostPerHour: number;
  packagingCost: number;
  machineWearFactor: number;
  failureBuffer: number;
  finishingDifficulty: string;
  marginPercentage: number;
}

interface CalcResult {
  materialCost: number;
  electricityCost: number;
  machineWear: number;
  failureCost: number;
  finishingCost: number;
  productionCost: number;
  suggestedPrice: number;
}

const FINISHING_COSTS: Record<string, number> = {
  none: 0,
  basic: 5,
  moderate: 15,
  complex: 30,
  painted: 50,
};

const defaultInputs: CalcInputs = {
  materialCostPerKg: 250,
  objectWeightGrams: 50,
  printTimeHours: 4,
  electricityCostPerHour: 1.5,
  packagingCost: 10,
  machineWearFactor: 0.05,
  failureBuffer: 0.10,
  finishingDifficulty: "none",
  marginPercentage: 50,
};

export function calculatePrice(inputs: CalcInputs): CalcResult {
  const materialCost = (inputs.objectWeightGrams / 1000) * inputs.materialCostPerKg;
  const electricityCost = inputs.printTimeHours * inputs.electricityCostPerHour;
  const machineWear = (materialCost + electricityCost) * inputs.machineWearFactor;
  const subtotal = materialCost + electricityCost + machineWear + inputs.packagingCost;
  const finishingCost = FINISHING_COSTS[inputs.finishingDifficulty] || 0;
  const failureCost = subtotal * inputs.failureBuffer;
  const productionCost = subtotal + failureCost + finishingCost;
  const suggestedPrice = productionCost * (1 + inputs.marginPercentage / 100);

  return {
    materialCost,
    electricityCost,
    machineWear,
    failureCost,
    finishingCost,
    productionCost,
    suggestedPrice,
  };
}

interface PricingCalculatorProps {
  productId?: string | null;
  customOrderId?: string | null;
  onPriceCalculated?: (price: number) => void;
  compact?: boolean;
}

const PricingCalculator = ({
  productId = null,
  customOrderId = null,
  onPriceCalculated,
  compact = false,
}: PricingCalculatorProps) => {
  const [inputs, setInputs] = useState<CalcInputs>(defaultInputs);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCalculate = useCallback(() => {
    const r = calculatePrice(inputs);
    setResult(r);
    setFinalPrice(Math.ceil(r.suggestedPrice));
    onPriceCalculated?.(Math.ceil(r.suggestedPrice));
  }, [inputs, onPriceCalculated]);

  const handleSave = async () => {
    if (!result || !user) return;
    setSaving(true);
    const { error } = await supabase.from("price_calculations" as any).insert({
      product_id: productId,
      custom_order_id: customOrderId,
      admin_user_id: user.id,
      material_cost_per_kg: inputs.materialCostPerKg,
      object_weight_grams: inputs.objectWeightGrams,
      print_time_hours: inputs.printTimeHours,
      electricity_cost: inputs.electricityCostPerHour,
      packaging_cost: inputs.packagingCost,
      machine_wear_factor: inputs.machineWearFactor,
      failure_buffer: inputs.failureBuffer,
      finishing_difficulty: inputs.finishingDifficulty,
      margin_percentage: inputs.marginPercentage,
      production_cost: result.productionCost,
      suggested_price: result.suggestedPrice,
      final_price: finalPrice,
      notes: notes || null,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Calculation saved to history" });
    }
  };

  const update = (key: keyof CalcInputs, value: number | string) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <div className={`grid gap-4 ${compact ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        <div>
          <Label className="text-xs">Material Cost (kr/kg)</Label>
          <Input type="number" step="1" value={inputs.materialCostPerKg}
            onChange={(e) => update("materialCostPerKg", parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Object Weight (grams)</Label>
          <Input type="number" step="1" value={inputs.objectWeightGrams}
            onChange={(e) => update("objectWeightGrams", parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Print Time (hours)</Label>
          <Input type="number" step="0.5" value={inputs.printTimeHours}
            onChange={(e) => update("printTimeHours", parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Electricity Cost (kr/hour)</Label>
          <Input type="number" step="0.1" value={inputs.electricityCostPerHour}
            onChange={(e) => update("electricityCostPerHour", parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Packaging Cost (kr)</Label>
          <Input type="number" step="1" value={inputs.packagingCost}
            onChange={(e) => update("packagingCost", parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Machine Wear Factor (%)</Label>
          <Input type="number" step="1" value={Math.round(inputs.machineWearFactor * 100)}
            onChange={(e) => update("machineWearFactor", (parseFloat(e.target.value) || 0) / 100)} />
        </div>
        <div>
          <Label className="text-xs">Failure Buffer (%)</Label>
          <Input type="number" step="1" value={Math.round(inputs.failureBuffer * 100)}
            onChange={(e) => update("failureBuffer", (parseFloat(e.target.value) || 0) / 100)} />
        </div>
        <div>
          <Label className="text-xs">Finishing Difficulty</Label>
          <Select value={inputs.finishingDifficulty} onValueChange={(v) => update("finishingDifficulty", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Raw)</SelectItem>
              <SelectItem value="basic">Basic (Light sanding)</SelectItem>
              <SelectItem value="moderate">Moderate (Full sanding)</SelectItem>
              <SelectItem value="complex">Complex (Multi-step)</SelectItem>
              <SelectItem value="painted">Painted (Hand-painted)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Profit Margin (%)</Label>
          <Input type="number" step="5" value={inputs.marginPercentage}
            onChange={(e) => update("marginPercentage", parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      <Button onClick={handleCalculate} className="font-display uppercase tracking-wider">
        <Calculator className="mr-2 h-4 w-4" /> Calculate Price
      </Button>

      {result && (
        <>
          <Separator />
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Cost Breakdown
            </h4>
            <div className="space-y-2 text-sm">
              <Row label="Material Cost" value={result.materialCost} />
              <Row label="Electricity" value={result.electricityCost} />
              <Row label="Machine Wear" value={result.machineWear} />
              <Row label="Packaging" value={inputs.packagingCost} />
              <Row label="Finishing" value={result.finishingCost} />
              <Row label="Failure Buffer" value={result.failureCost} />
              <Separator className="my-2" />
              <Row label="Total Production Cost" value={result.productionCost} bold />
              <Row label={`+ ${inputs.marginPercentage}% Margin`} value={result.suggestedPrice - result.productionCost} />
              <Separator className="my-2" />
              <Row label="Suggested Retail Price" value={result.suggestedPrice} bold primary />
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <Label className="text-xs">Final Price (override)</Label>
                <Input
                  type="number"
                  step="1"
                  value={finalPrice ?? ""}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setFinalPrice(isNaN(v) ? null : v);
                    if (!isNaN(v)) onPriceCalculated?.(v);
                  }}
                  className="font-display text-lg font-bold"
                />
              </div>
              {!compact && (
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Cost calculation notes..."
                    rows={2}
                  />
                </div>
              )}
              <Button onClick={handleSave} disabled={saving} variant="secondary" className="font-display uppercase tracking-wider">
                <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save to History"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function Row({ label, value, bold, primary }: { label: string; value: number; bold?: boolean; primary?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? "font-semibold text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={`font-display ${bold ? "font-bold" : ""} ${primary ? "text-primary text-lg" : "text-foreground"}`}>
        {value.toFixed(2)} kr
      </span>
    </div>
  );
}

export default PricingCalculator;
