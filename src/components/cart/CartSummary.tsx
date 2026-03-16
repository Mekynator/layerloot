import { ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { PricingResult, UserDiscountCode } from "@/types/cart";

interface CartSummaryProps {
  pricing: PricingResult;
  availableCodes: UserDiscountCode[];
  selectedDiscountId?: string;
  onDiscountChange: (discountId: string | undefined) => void;
  availablePoints: number;
  usePoints: boolean;
  onUsePointsChange: (checked: boolean) => void;
  isCheckoutDisabled?: boolean;
  onCheckout: () => void;
}

export default function CartSummary({
  pricing,
  availableCodes,
  selectedDiscountId,
  onDiscountChange,
  availablePoints,
  usePoints,
  onUsePointsChange,
  isCheckoutDisabled,
  onCheckout,
}: CartSummaryProps) {
  return (
    <aside className="sticky top-24 rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="text-xl font-bold uppercase tracking-wide">Order summary</h2>

      <div className="mt-5 space-y-4">
        <div className="space-y-2 rounded-xl border p-3">
          <div className="text-sm font-medium">Discount code</div>
          {availableCodes.length ? (
            <Select
              value={selectedDiscountId ?? "none"}
              onValueChange={(value) => onDiscountChange(value === "none" ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a discount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No discount</SelectItem>
                {availableCodes.map((code) => (
                  <SelectItem key={code.id} value={code.id}>
                    {code.title || code.code} — {code.discount_type === "percent" ? `${code.discount_value}%` : `${code.discount_value} DKK`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-muted-foreground">No saved discount codes available.</div>
          )}
        </div>

        <div className="space-y-2 rounded-xl border p-3">
          <div className="text-sm font-medium">Rewards</div>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={usePoints} onCheckedChange={(checked) => onUsePointsChange(Boolean(checked))} />
            <span>
              Use <strong>{availablePoints}</strong> points toward this order.
            </span>
          </label>
        </div>

        <div className="space-y-3 border-t pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{pricing.subtotal.toFixed(2)} DKK</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-semibold">{pricing.shipping === 0 ? "Free" : `${pricing.shipping.toFixed(2)} DKK`}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-semibold">-{pricing.discountAmount.toFixed(2)} DKK</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Points</span>
            <span className="font-semibold">-{pricing.pointsDiscount.toFixed(2)} DKK</span>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>Build plate usage</span>
              <span>{pricing.buildPlateUsagePercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-orange-500 transition-all duration-500"
                style={{ width: `${pricing.buildPlateUsagePercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-lg font-bold uppercase tracking-wide">Total</span>
          <span className="text-3xl font-extrabold text-orange-500">{pricing.total.toFixed(2)} DKK</span>
        </div>

        <Button
          className="h-12 w-full text-sm font-bold uppercase tracking-wide"
          onClick={onCheckout}
          disabled={isCheckoutDisabled}
        >
          Continue to secure checkout
        </Button>

        <div className="space-y-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Secure checkout and protected payments
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            Fast production turnaround for ready-to-print orders
          </div>
        </div>
      </div>
    </aside>
  );
}
