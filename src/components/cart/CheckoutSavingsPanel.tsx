import { useState } from "react";
import {
  Tag,
  Gift,
  Truck,
  CreditCard,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Percent,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { formatPrice } from "@/lib/currency";
import type { CartDiscountCode } from "@/hooks/use-cart-account-data";
import type { AppliedSaving, SavingsSummary } from "@/hooks/useCheckoutSavings";

interface CheckoutSavingsPanelProps {
  available: CartDiscountCode[];
  applied: AppliedSaving[];
  summary: SavingsSummary;
  categorized: {
    vouchers: CartDiscountCode[];
    giftCards: CartDiscountCode[];
    freeShipping: CartDiscountCode[];
  };
  bestSuggestion: CartDiscountCode | null;
  canApply: (item: CartDiscountCode) => { allowed: boolean; reason?: string };
  onApply: (item: CartDiscountCode) => string | null;
  onRemove: (code: string) => void;
  onManualCode: (code: string) => void;
  manualCodeError?: string;
  manualCodeLoading?: boolean;
  giftCardSliderValue: number | null;
  onGiftCardSliderChange: (val: number | null) => void;
}

const CATEGORY_ICON = {
  voucher: Tag,
  discount: Percent,
  gift_card: CreditCard,
  free_shipping: Truck,
};

const CATEGORY_COLOR = {
  voucher: "text-primary",
  discount: "text-primary",
  gift_card: "text-amber-500",
  free_shipping: "text-emerald-500",
};

export default function CheckoutSavingsPanel({
  available,
  applied,
  summary,
  categorized,
  bestSuggestion,
  canApply,
  onApply,
  onRemove,
  onManualCode,
  manualCodeError,
  manualCodeLoading,
  giftCardSliderValue,
  onGiftCardSliderChange,
}: CheckoutSavingsPanelProps) {
  const { t } = useTranslation("common");
  const [manualCode, setManualCode] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleApplyManual = () => {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    setLocalError(null);
    onManualCode(trimmed);
    setManualCode("");
  };

  const handleApplyCard = (item: CartDiscountCode) => {
    setLocalError(null);
    const err = onApply(item);
    if (err) setLocalError(err);
  };

  const displayError = manualCodeError || localError;

  return (
    <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-display text-base font-bold uppercase tracking-wide text-foreground">
            {t("cart.savingsAndRewards", "Savings & Rewards")}
          </span>
          {summary.totalSavings > 0 && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500">
              -{formatPrice(summary.totalSavings)}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-5 pb-5">
              {/* Best suggestion banner */}
              {bestSuggestion && applied.length === 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  <p className="flex-1 text-sm text-foreground">
                    <span className="font-semibold">{t("cart.bestValue", "Best value:")}</span>{" "}
                    {bestSuggestion.label}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs"
                    onClick={() => handleApplyCard(bestSuggestion)}
                  >
                    {t("cart.apply", "Apply")}
                  </Button>
                </div>
              )}

              {/* Manual code input */}
              <div className="flex gap-2">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={t("cart.enterDiscountCode", "Enter discount or gift card code")}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyManual()}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleApplyManual}
                  disabled={!manualCode.trim() || manualCodeLoading}
                  className="shrink-0"
                >
                  {manualCodeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("cart.apply", "Apply")}
                </Button>
              </div>

              {displayError && (
                <p className="text-sm text-destructive">{displayError}</p>
              )}

              {/* Available vouchers */}
              {categorized.vouchers.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("cart.availableRewards", "Available Rewards")}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {categorized.vouchers.map((v) => {
                      const { allowed, reason } = canApply(v);
                      const isApplied = applied.some((a) => a.code === v.code);
                      return (
                        <button
                          key={v.code}
                          disabled={!allowed && !isApplied}
                          onClick={() => isApplied ? onRemove(v.code) : handleApplyCard(v)}
                          className={`group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all
                            ${isApplied
                              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                              : allowed
                                ? "border-border/40 hover:border-primary/30 hover:bg-primary/5"
                                : "border-border/20 opacity-50 cursor-not-allowed"
                            }`}
                        >
                          <Tag className={`h-4 w-4 shrink-0 ${isApplied ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{v.code}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {v.type === "percent" ? `${v.value}% off` : formatPrice(v.value) + " off"}
                            </p>
                          </div>
                          {isApplied && (
                            <X className="h-4 w-4 shrink-0 text-muted-foreground hover:text-destructive" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Free shipping rewards */}
              {categorized.freeShipping.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("cart.shippingRewards", "Shipping Rewards")}
                  </p>
                  {categorized.freeShipping.map((v) => {
                    const { allowed } = canApply(v);
                    const isApplied = applied.some((a) => a.code === v.code);
                    return (
                      <button
                        key={v.code}
                        disabled={!allowed && !isApplied}
                        onClick={() => isApplied ? onRemove(v.code) : handleApplyCard(v)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all
                          ${isApplied
                            ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                            : allowed
                              ? "border-border/40 hover:border-emerald-500/30 hover:bg-emerald-500/5"
                              : "border-border/20 opacity-50 cursor-not-allowed"
                          }`}
                      >
                        <Truck className={`h-4 w-4 shrink-0 ${isApplied ? "text-emerald-500" : "text-muted-foreground"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{t("cart.freeShipping", "Free Shipping")}</p>
                          <p className="text-xs text-muted-foreground">{v.label}</p>
                        </div>
                        {isApplied && <X className="h-4 w-4 shrink-0 text-muted-foreground hover:text-destructive" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Gift cards */}
              {categorized.giftCards.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("cart.giftCards", "Gift Cards")}
                  </p>
                  {categorized.giftCards.map((gc) => {
                    const { allowed } = canApply(gc);
                    const isApplied = applied.some((a) => a.code === gc.code);
                    const appliedItem = applied.find((a) => a.code === gc.code);
                    return (
                      <div
                        key={gc.code}
                        className={`rounded-xl border p-3 transition-all
                          ${isApplied
                            ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20"
                            : "border-border/40"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className={`h-4 w-4 shrink-0 ${isApplied ? "text-amber-500" : "text-muted-foreground"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{gc.code}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("cart.balance", "Balance:")} {formatPrice(gc.value)}
                            </p>
                          </div>
                          {isApplied ? (
                            <Button size="sm" variant="ghost" onClick={() => onRemove(gc.code)}>
                              <X className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!allowed}
                              onClick={() => handleApplyCard(gc)}
                              className="shrink-0 text-xs"
                            >
                              {t("cart.apply", "Apply")}
                            </Button>
                          )}
                        </div>

                        {/* Partial apply slider (before applying) */}
                        {!isApplied && allowed && gc.value > 1 && (
                          <div className="mt-3 space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{t("cart.amountToUse", "Amount to use")}</span>
                              <span className="font-semibold text-foreground">
                                {formatPrice(giftCardSliderValue ?? gc.value)}
                              </span>
                            </div>
                            <Slider
                              min={1}
                              max={gc.value}
                              step={0.5}
                              value={[giftCardSliderValue ?? gc.value]}
                              onValueChange={([val]) => onGiftCardSliderChange(val)}
                            />
                          </div>
                        )}

                        {/* Applied summary */}
                        {isApplied && appliedItem && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {t("cart.using", "Using")} {formatPrice(appliedItem.appliedAmount)} ·{" "}
                            {t("cart.remaining", "Remaining:")} {formatPrice(gc.value - appliedItem.appliedAmount)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Applied savings summary */}
              {applied.length > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    {t("cart.appliedSavings", "Applied Savings")}
                  </p>
                  <div className="space-y-1.5">
                    {applied.map((a) => {
                      const Icon = CATEGORY_ICON[a.category] || Tag;
                      const color = CATEGORY_COLOR[a.category] || "text-primary";
                      return (
                        <div key={a.code} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-3.5 w-3.5 ${color}`} />
                            <span className="text-foreground">{a.code}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-emerald-600">-{formatPrice(a.appliedAmount)}</span>
                            <button onClick={() => onRemove(a.code)} className="text-muted-foreground hover:text-destructive">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
