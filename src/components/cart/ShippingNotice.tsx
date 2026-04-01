import { CheckCircle2, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";

interface ShippingNoticeProps {
  qualifies: boolean;
  amountUntilFreeShipping: number;
  threshold?: number;
}

export default function ShippingNotice({
  qualifies,
  amountUntilFreeShipping,
  threshold = 499,
}: ShippingNoticeProps) {
  const { t } = useTranslation("common");
  const progress = qualifies
    ? 100
    : Math.max(8, Math.min(100, Math.round(((threshold - amountUntilFreeShipping) / threshold) * 100)));

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm",
        qualifies ? "border-emerald-200" : "border-border",
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        {qualifies ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700">{t("shipping.qualifies")}</span>
          </>
        ) : (
          <>
            <Truck className="h-4 w-4 text-orange-500" />
            <span>
              {t("shipping.addMore", { amount: formatPrice(amountUntilFreeShipping) })}
            </span>
          </>
        )}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            qualifies ? "bg-emerald-500" : "bg-orange-500",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
