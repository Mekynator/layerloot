import { CheckCircle2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

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
            <span className="text-emerald-700">You qualify for free shipping.</span>
          </>
        ) : (
          <>
            <Truck className="h-4 w-4 text-orange-500" />
            <span>
              Add <strong>{amountUntilFreeShipping.toFixed(2)} DKK</strong> more for free shipping.
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
