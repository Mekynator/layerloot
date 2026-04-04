import { Clock, Ruler, Weight, Paintbrush } from "lucide-react";

interface PrintInfoProps {
  printTimeHours?: number | null;
  dimensionsCm?: { length?: number; width?: number; height?: number } | null;
  weightGrams?: number | null;
  finishType?: string | null;
  materialType?: string | null;
}

const FINISH_LABELS: Record<string, string> = {
  raw: "Raw — Straight from the printer",
  cleaned: "Cleaned — Sanded & support-free",
  painted: "Painted — Hand-finished with color",
};

const PrintInfo = ({ printTimeHours, dimensionsCm, weightGrams, finishType, materialType }: PrintInfoProps) => {
  const items = [
    printTimeHours != null && {
      icon: Clock,
      label: "Est. Print Time",
      value: printTimeHours < 1
        ? `${Math.round(printTimeHours * 60)} min`
        : `${printTimeHours}h`,
    },
    materialType && {
      icon: Paintbrush,
      label: "Material",
      value: materialType,
    },
    dimensionsCm && (dimensionsCm.length || dimensionsCm.width || dimensionsCm.height) && {
      icon: Ruler,
      label: "Dimensions",
      value: `${dimensionsCm.length ?? "—"} × ${dimensionsCm.width ?? "—"} × ${dimensionsCm.height ?? "—"} cm`,
    },
    weightGrams != null && {
      icon: Weight,
      label: "Weight",
      value: weightGrams >= 1000 ? `${(weightGrams / 1000).toFixed(1)} kg` : `${weightGrams}g`,
    },
    finishType && {
      icon: Paintbrush,
      label: "Finish",
      value: FINISH_LABELS[finishType] || finishType,
    },
  ].filter(Boolean) as { icon: any; label: string; value: string }[];

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl bg-card/60 p-3 shadow-[0_4px_24px_-4px_hsl(225_44%_4%/0.4)] backdrop-blur-md md:rounded-2xl md:p-4">
      <h4 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Craftsmanship Details
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="font-display text-sm font-semibold text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrintInfo;
