import { useMemo } from "react";
import { motion } from "framer-motion";
import { Package, Printer, Paintbrush, Truck, Check, Clock } from "lucide-react";

export interface TimelineStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  active: boolean;
  timestamp?: string | null;
}

const STEP_DEFINITIONS = [
  { key: "received", label: "Received", icon: <Package className="h-4 w-4" /> },
  { key: "printing", label: "Printing", icon: <Printer className="h-4 w-4" /> },
  { key: "finishing", label: "Finishing", icon: <Paintbrush className="h-4 w-4" /> },
  { key: "shipped", label: "Shipped", icon: <Truck className="h-4 w-4" /> },
];

const ADMIN_STEP_DEFINITIONS = [
  { key: "received", label: "Received", icon: <Package className="h-4 w-4" /> },
  { key: "review", label: "Review", icon: <Clock className="h-4 w-4" /> },
  { key: "printing", label: "Printing", icon: <Printer className="h-4 w-4" /> },
  { key: "finishing", label: "Finishing", icon: <Paintbrush className="h-4 w-4" /> },
  { key: "quality_check", label: "QC", icon: <Check className="h-4 w-4" /> },
  { key: "packed", label: "Packed", icon: <Package className="h-4 w-4" /> },
  { key: "shipped", label: "Shipped", icon: <Truck className="h-4 w-4" /> },
];

const STATUS_TO_STEP_INDEX: Record<string, number> = {
  pending: 0,
  confirmed: 0,
  received: 0,
  processing: 1,
  printing: 1,
  in_production: 1,
  queued: 1,
  finishing: 2,
  completed: 2,
  shipped: 3,
  delivered: 3,
};

export function mapOrderToTimelineSteps(
  status: string,
  productionStatus?: string,
  timestamps?: Record<string, string | null>,
): TimelineStep[] {
  const effectiveStatus = productionStatus || status || "pending";
  const activeIdx = STATUS_TO_STEP_INDEX[effectiveStatus.toLowerCase()] ?? 0;

  return STEP_DEFINITIONS.map((step, idx) => ({
    ...step,
    completed: idx < activeIdx || effectiveStatus.toLowerCase() === "delivered",
    active: idx === activeIdx,
    timestamp: timestamps?.[step.key] ?? null,
  }));
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function OrderTimeline({
  status,
  productionStatus,
  timestamps,
  variant = "horizontal",
}: {
  status: string;
  productionStatus?: string;
  timestamps?: Record<string, string | null>;
  variant?: "horizontal" | "vertical";
}) {
  const steps = useMemo(
    () => mapOrderToTimelineSteps(status, productionStatus, timestamps),
    [status, productionStatus, timestamps],
  );

  if (variant === "vertical") {
    return (
      <div className="flex flex-col gap-0">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                  step.completed
                    ? "border-primary bg-primary text-primary-foreground"
                    : step.active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {step.completed ? <Check className="h-3.5 w-3.5" /> : step.icon}
              </motion.div>
              {idx < steps.length - 1 && (
                <div
                  className={`h-8 w-0.5 ${step.completed ? "bg-primary" : "bg-border"}`}
                />
              )}
            </div>
            <div className="pb-6 pt-1">
              <p
                className={`text-sm font-medium ${
                  step.completed || step.active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </p>
              {step.timestamp && (
                <p className="text-[11px] text-muted-foreground">{formatShortDate(step.timestamp)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full items-start justify-between gap-1">
      {steps.map((step, idx) => (
        <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full items-center">
            {idx > 0 && (
              <div
                className={`h-0.5 flex-1 transition-colors ${step.completed ? "bg-primary" : "bg-border"}`}
              />
            )}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.08 }}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                step.completed
                  ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : step.active
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                    : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {step.completed ? <Check className="h-4 w-4" /> : step.icon}
            </motion.div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 transition-colors ${
                  steps[idx + 1]?.completed ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
          <p
            className={`text-center text-[11px] font-medium leading-tight ${
              step.completed || step.active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {step.label}
          </p>
          {step.timestamp && (
            <p className="text-[10px] text-muted-foreground">{formatShortDate(step.timestamp)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
