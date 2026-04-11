import { memo } from "react";
import type { SnapGuide } from "@/lib/snap-engine";

interface AlignmentGuidesOverlayProps {
  guides: SnapGuide[];
}

/**
 * Renders alignment guide lines over the canvas.
 * Click-through (pointer-events: none).
 */
export const AlignmentGuidesOverlay = memo(function AlignmentGuidesOverlay({ guides }: AlignmentGuidesOverlayProps) {
  if (guides.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[95]"
      aria-hidden="true"
    >
      <svg className="h-full w-full" preserveAspectRatio="none">
        {guides.map((guide, i) => {
          const color = guide.type === "center" ? "#6366f1"
            : guide.type === "spacing" ? "#f59e0b"
            : guide.type === "safe-area" ? "#ef4444"
            : "#3b82f6";

          return guide.axis === "x" ? (
            <line
              key={`g-${i}`}
              x1={`${guide.position}%`} y1="0"
              x2={`${guide.position}%`} y2="100%"
              stroke={color}
              strokeWidth="1"
              strokeDasharray={guide.type === "spacing" ? "4 3" : guide.type === "center" ? "6 4" : "none"}
              opacity="0.7"
            />
          ) : (
            <line
              key={`g-${i}`}
              x1="0" y1={`${guide.position}%`}
              x2="100%" y2={`${guide.position}%`}
              stroke={color}
              strokeWidth="1"
              strokeDasharray={guide.type === "spacing" ? "4 3" : guide.type === "center" ? "6 4" : "none"}
              opacity="0.7"
            />
          );
        })}
      </svg>
    </div>
  );
});
