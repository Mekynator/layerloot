import { useMemo } from "react";

interface SizePreviewProps {
  dimensionsCm?: { length?: number; width?: number; height?: number } | null;
}

const SizePreview = ({ dimensionsCm }: SizePreviewProps) => {
  if (!dimensionsCm) return null;
  const h = dimensionsCm.height ?? 10;
  const w = dimensionsCm.length ?? dimensionsCm.width ?? 10;

  // Hand silhouette is ~18cm tall for reference
  const handHeightCm = 18;
  const containerPx = 180;
  const scale = containerPx / Math.max(handHeightCm, h, w);
  const handPx = handHeightCm * scale;
  const objHPx = h * scale;
  const objWPx = Math.max(w * scale, 20);

  return (
    <div className="rounded-2xl bg-card/60 p-4 shadow-[0_4px_24px_-4px_hsl(225_44%_4%/0.4)] backdrop-blur-md">
      <h4 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Size Comparison
      </h4>
      <div className="flex items-end justify-center gap-6" style={{ height: `${containerPx + 20}px` }}>
        {/* Hand silhouette */}
        <div className="flex flex-col items-center">
          <svg
            viewBox="0 0 60 100"
            style={{ height: `${handPx}px` }}
            className="text-muted-foreground/30"
            fill="currentColor"
          >
            <path d="M30 5 C25 5 22 10 22 18 L22 35 C18 33 14 34 12 38 C10 42 12 46 16 48 L22 52 L22 80 C22 90 26 95 30 95 C34 95 38 90 38 80 L38 52 L44 48 C48 46 50 42 48 38 C46 34 42 33 38 35 L38 18 C38 10 35 5 30 5Z" />
          </svg>
          <span className="mt-1 font-display text-[10px] uppercase text-muted-foreground">Hand (~18cm)</span>
        </div>
        {/* Product */}
        <div className="flex flex-col items-center">
          <div
            className="rounded-md border-2 border-dashed border-primary/40 bg-primary/5"
            style={{ width: `${objWPx}px`, height: `${objHPx}px` }}
          />
          <span className="mt-1 font-display text-[10px] uppercase text-primary">
            {h}×{w} cm
          </span>
        </div>
      </div>
    </div>
  );
};

export default SizePreview;
