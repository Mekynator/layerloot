import { memo } from "react";
import type { SnapSettings } from "@/lib/snap-engine";
import { getGridLines } from "@/lib/snap-engine";

interface GridOverlayProps {
  settings: SnapSettings;
}

/**
 * Renders a CSS grid overlay on the editor canvas.
 * Click-through (pointer-events: none) so it never blocks interaction.
 */
export const GridOverlay = memo(function GridOverlay({ settings }: GridOverlayProps) {
  if (!settings.showGrid) return null;

  const lines = getGridLines(settings.gridSize);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[90]"
      aria-hidden="true"
    >
      <svg className="h-full w-full" preserveAspectRatio="none">
        {lines.map((pos) => (
          <line
            key={`vg-${pos}`}
            x1={`${pos}%`} y1="0" x2={`${pos}%`} y2="100%"
            stroke="rgba(148,163,184,0.15)"
            strokeWidth="0.5"
          />
        ))}
        {lines.map((pos) => (
          <line
            key={`hg-${pos}`}
            x1="0" y1={`${pos}%`} x2="100%" y2={`${pos}%`}
            stroke="rgba(148,163,184,0.15)"
            strokeWidth="0.5"
          />
        ))}
      </svg>
    </div>
  );
});
