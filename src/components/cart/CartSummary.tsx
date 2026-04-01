import { ShieldCheck, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/currency";
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
  const { t } = useTranslation("common");

  return (
    <aside className="sticky top-24 rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="text-xl font-bold uppercase tracking-wide">{t("cart.orderSummary")}</h2>

      <div className="mt-5 space-y-4">
        <div className="space-y-2 rounded-xl border p-3">
          <div className="text-sm font-medium">{t("cart.discountCode")}</div>
          {availableCodes.length ? (
            <Select
              value={selectedDiscountId ?? "none"}
              onValueChange={(value) => onDiscountChange(value === "none" ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("cart.chooseVoucher")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("cart.noDiscount")}</SelectItem>
                {availableCodes.map((code) => (
                  <SelectItem key={code.id} value={code.id}>
                    {code.title || code.code} — {code.discount_type === "percent" ? `${code.discount_value}%` : formatPrice(code.discount_value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-muted-foreground">{t("cart.noDiscountCodes")}</div>
          )}
        </div>

        <div className="space-y-2 rounded-xl border p-3">
          <div className="text-sm font-medium">{t("cart.rewards")}</div>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={usePoints} onCheckedChange={(checked) => onUsePointsChange(Boolean(checked))} />
            <span>
              {t("cart.usePoints", { count: availablePoints })}
            </span>
          </label>
        </div>

        <div className="space-y-3 border-t pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("cart.subtotal")}</span>
            <span className="font-semibold">{formatPrice(pricing.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("cart.shipping")}</span>
            <span className="font-semibold">{pricing.shipping === 0 ? t("cart.free") : formatPrice(pricing.shipping)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("cart.discount")}</span>
            <span className="font-semibold">-{formatPrice(pricing.discountAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("cart.points")}</span>
            <span className="font-semibold">-{formatPrice(pricing.pointsDiscount)}</span>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>{t("cart.buildPlateUsage")}</span>
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
          <span className="text-lg font-bold uppercase tracking-wide">{t("cart.total")}</span>
          <span className="text-3xl font-extrabold text-orange-500">{formatPrice(pricing.total)}</span>
        </div>

        <Button
          className="h-12 w-full text-sm font-bold uppercase tracking-wide"
          onClick={onCheckout}
          disabled={isCheckoutDisabled}
        >
          {t("cart.continueSecureCheckout")}
        </Button>

        <div className="space-y-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            {t("cart.securePayments")}
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            {t("cart.fastTurnaround")}
          </div>
        </div>
      </div>
    </aside>
  );
}
