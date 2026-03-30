import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@/types/cart";

interface CartItemCardProps {
  item: CartItem;
  isUpdating?: boolean;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
  onSaveForLater: (id: string) => void;
}

export default function CartItemCard({
  item,
  isUpdating,
  onIncrease,
  onDecrease,
  onRemove,
  onSaveForLater,
}: CartItemCardProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), 350);
    return () => window.clearTimeout(timer);
  }, [item.quantity]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      className="rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No preview</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold uppercase tracking-wide">{item.title}</h3>

              <div className="mt-1 text-sm text-muted-foreground">
                {[item.variant_label, item.material, item.color].filter(Boolean).join(" • ") || "Standard setup"}
              </div>

              {item.custom_note ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.custom_note}</p>
              ) : null}

              {(item.print_time_hours || item.material_grams || item.dispatch_note) && (
                <div className="mt-3 grid gap-1 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground sm:grid-cols-3">
                  <div>
                    <span className="font-medium text-foreground">Print time:</span>{" "}
                    {item.print_time_hours ? `${item.print_time_hours}h` : "—"}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Material:</span>{" "}
                    {item.material_grams ? `${item.material_grams}g` : "—"}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Dispatch:</span> {item.dispatch_note ?? "—"}
                  </div>
                </div>
              )}
            </div>

            <motion.div animate={pulse ? { scale: [1, 1.04, 1] } : { scale: 1 }} className="text-right">
              <div className="text-2xl font-bold">{(item.price * item.quantity).toFixed(2)} DKK</div>
              <div className="text-xs text-muted-foreground">{item.price.toFixed(2)} DKK each</div>
            </motion.div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <motion.div
              animate={pulse ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              className="flex items-center gap-2 rounded-xl border p-1"
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => onDecrease(item.id)}
                disabled={isUpdating || item.quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="min-w-8 text-center text-sm font-semibold">{item.quantity}</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => onIncrease(item.id)}
                disabled={isUpdating}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </motion.div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="text-sm text-muted-foreground"
                onClick={() => onSaveForLater(item.id)}
                disabled={isUpdating}
              >
                Save for later
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() => onRemove(item.id)}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
