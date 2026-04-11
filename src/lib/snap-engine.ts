/**
 * Snap-engine – shared snapping, alignment guides, and positioning logic.
 *
 * Works in percentage-based coordinate systems (0-100) as used by the
 * popup builder, or pixel-based systems used by block-level spacing.
 */

/* ── Types ── */

export interface SnapRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapGuide {
  axis: "x" | "y";
  position: number;
  type: "edge" | "center" | "spacing" | "grid" | "safe-area";
  label?: string;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

export interface SnapSettings {
  enabled: boolean;
  showGuides: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  snapThreshold: number;
  gridSize: number;
  showSafeArea: boolean;
  showSpacingGuides: boolean;
}

export interface SafeArea {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: true,
  showGuides: true,
  showGrid: false,
  snapToGrid: false,
  snapThreshold: 2.5,
  gridSize: 5,
  showSafeArea: false,
  showSpacingGuides: true,
};

/* ── Grid helpers ── */

export function getGridLines(gridSize: number, containerSize = 100): number[] {
  const lines: number[] = [];
  for (let i = gridSize; i < containerSize; i += gridSize) {
    lines.push(i);
  }
  return lines;
}

/* ── Safe area defaults per device ── */

export function getSafeArea(device: "desktop" | "tablet" | "mobile"): SafeArea {
  switch (device) {
    case "mobile":
      return { left: 4, right: 4, top: 3, bottom: 6 };
    case "tablet":
      return { left: 5, right: 5, top: 3, bottom: 4 };
    default:
      return { left: 6, right: 6, top: 3, bottom: 4 };
  }
}

/* ── Core snap calculation ── */

/**
 * Calculate snapped position for a dragged element.
 *
 * @param dragRect The element being dragged (proposed position)
 * @param siblings Other elements on the canvas (potential snap targets)
 * @param settings Snap configuration
 * @param containerWidth Container logical width (default 100 for percentage)
 * @param containerHeight Container logical height (default 100 for percentage)
 */
export function calculateSnap(
  dragRect: SnapRect,
  siblings: SnapRect[],
  settings: SnapSettings,
  containerWidth = 100,
  containerHeight = 100,
): SnapResult {
  if (!settings.enabled) {
    return { x: dragRect.x, y: dragRect.y, guides: [] };
  }

  const threshold = settings.snapThreshold;
  const guides: SnapGuide[] = [];

  // Edges and center of the dragged element
  const dragLeft = dragRect.x;
  const dragRight = dragRect.x + dragRect.width;
  const dragCenterX = dragRect.x + dragRect.width / 2;
  const dragTop = dragRect.y;
  const dragBottom = dragRect.y + dragRect.height;
  const dragCenterY = dragRect.y + dragRect.height / 2;

  let snappedX = dragRect.x;
  let snappedY = dragRect.y;
  let bestDeltaX = Infinity;
  let bestDeltaY = Infinity;

  const trySnapX = (target: number, source: number, guide: SnapGuide) => {
    const delta = Math.abs(target - source);
    if (delta < threshold && delta < bestDeltaX) {
      bestDeltaX = delta;
      snappedX = dragRect.x + (target - source);
      // Remove old X guides of same type, keep only best
      for (let i = guides.length - 1; i >= 0; i--) {
        if (guides[i].axis === "x") guides.splice(i, 1);
      }
      guides.push(guide);
    } else if (delta < threshold && Math.abs(delta - bestDeltaX) < 0.01) {
      guides.push(guide);
    }
  };

  const trySnapY = (target: number, source: number, guide: SnapGuide) => {
    const delta = Math.abs(target - source);
    if (delta < threshold && delta < bestDeltaY) {
      bestDeltaY = delta;
      snappedY = dragRect.y + (target - source);
      for (let i = guides.length - 1; i >= 0; i--) {
        if (guides[i].axis === "y") guides.splice(i, 1);
      }
      guides.push(guide);
    } else if (delta < threshold && Math.abs(delta - bestDeltaY) < 0.01) {
      guides.push(guide);
    }
  };

  // 1) Container edges
  trySnapX(0, dragLeft, { axis: "x", position: 0, type: "edge", label: "Left edge" });
  trySnapX(containerWidth, dragRight, { axis: "x", position: containerWidth, type: "edge", label: "Right edge" });
  trySnapX(containerWidth / 2, dragCenterX, { axis: "x", position: containerWidth / 2, type: "center", label: "Center" });
  trySnapY(0, dragTop, { axis: "y", position: 0, type: "edge", label: "Top edge" });
  trySnapY(containerHeight, dragBottom, { axis: "y", position: containerHeight, type: "edge", label: "Bottom edge" });
  trySnapY(containerHeight / 2, dragCenterY, { axis: "y", position: containerHeight / 2, type: "center", label: "Center" });

  // 2) Sibling edges and centers
  for (const sib of siblings) {
    if (sib.id === dragRect.id) continue;

    const sibLeft = sib.x;
    const sibRight = sib.x + sib.width;
    const sibCenterX = sib.x + sib.width / 2;
    const sibTop = sib.y;
    const sibBottom = sib.y + sib.height;
    const sibCenterY = sib.y + sib.height / 2;

    // Left-to-left, right-to-right, left-to-right, right-to-left, center-to-center
    trySnapX(sibLeft, dragLeft, { axis: "x", position: sibLeft, type: "edge" });
    trySnapX(sibRight, dragRight, { axis: "x", position: sibRight, type: "edge" });
    trySnapX(sibLeft, dragRight, { axis: "x", position: sibLeft, type: "edge" });
    trySnapX(sibRight, dragLeft, { axis: "x", position: sibRight, type: "edge" });
    trySnapX(sibCenterX, dragCenterX, { axis: "x", position: sibCenterX, type: "center" });

    trySnapY(sibTop, dragTop, { axis: "y", position: sibTop, type: "edge" });
    trySnapY(sibBottom, dragBottom, { axis: "y", position: sibBottom, type: "edge" });
    trySnapY(sibTop, dragBottom, { axis: "y", position: sibTop, type: "edge" });
    trySnapY(sibBottom, dragTop, { axis: "y", position: sibBottom, type: "edge" });
    trySnapY(sibCenterY, dragCenterY, { axis: "y", position: sibCenterY, type: "center" });
  }

  // 3) Spacing guides
  if (settings.showSpacingGuides && siblings.length >= 2) {
    const sortedX = [...siblings].filter(s => s.id !== dragRect.id).sort((a, b) => a.x - b.x);
    for (let i = 1; i < sortedX.length; i++) {
      const gap = sortedX[i].x - (sortedX[i - 1].x + sortedX[i - 1].width);
      if (gap > 0) {
        // Try matching this gap on the left side of dragged element
        const targetX = sortedX[i - 1].x + sortedX[i - 1].width + gap;
        trySnapX(targetX, dragLeft, { axis: "x", position: targetX, type: "spacing", label: `${Math.round(gap)}%` });
      }
    }
  }

  // 4) Grid
  if (settings.snapToGrid && settings.showGrid) {
    const gs = settings.gridSize;
    const gridX = Math.round(dragRect.x / gs) * gs;
    const gridY = Math.round(dragRect.y / gs) * gs;
    trySnapX(gridX, dragLeft, { axis: "x", position: gridX, type: "grid" });
    trySnapY(gridY, dragTop, { axis: "y", position: gridY, type: "grid" });
  }

  return { x: snappedX, y: snappedY, guides };
}

/* ── Alignment actions ── */

export type AlignAction =
  | "left" | "center-x" | "right"
  | "top" | "center-y" | "bottom"
  | "distribute-x" | "distribute-y"
  | "match-width" | "match-height"
  | "tidy";

/**
 * Align a single element within its parent container.
 */
export function alignSingle(
  rect: SnapRect,
  action: AlignAction,
  containerWidth = 100,
  containerHeight = 100,
): Partial<SnapRect> {
  switch (action) {
    case "left":
      return { x: 0 };
    case "center-x":
      return { x: (containerWidth - rect.width) / 2 };
    case "right":
      return { x: containerWidth - rect.width };
    case "top":
      return { y: 0 };
    case "center-y":
      return { y: (containerHeight - rect.height) / 2 };
    case "bottom":
      return { y: containerHeight - rect.height };
    default:
      return {};
  }
}

/**
 * Align multiple elements relative to each other.
 */
export function alignMultiple(
  rects: SnapRect[],
  action: AlignAction,
  containerWidth = 100,
  containerHeight = 100,
): Map<string, Partial<SnapRect>> {
  const result = new Map<string, Partial<SnapRect>>();
  if (rects.length === 0) return result;

  if (rects.length === 1) {
    result.set(rects[0].id, alignSingle(rects[0], action, containerWidth, containerHeight));
    return result;
  }

  switch (action) {
    case "left": {
      const minX = Math.min(...rects.map(r => r.x));
      rects.forEach(r => result.set(r.id, { x: minX }));
      break;
    }
    case "center-x": {
      const minX = Math.min(...rects.map(r => r.x));
      const maxRight = Math.max(...rects.map(r => r.x + r.width));
      const center = (minX + maxRight) / 2;
      rects.forEach(r => result.set(r.id, { x: center - r.width / 2 }));
      break;
    }
    case "right": {
      const maxRight = Math.max(...rects.map(r => r.x + r.width));
      rects.forEach(r => result.set(r.id, { x: maxRight - r.width }));
      break;
    }
    case "top": {
      const minY = Math.min(...rects.map(r => r.y));
      rects.forEach(r => result.set(r.id, { y: minY }));
      break;
    }
    case "center-y": {
      const minY = Math.min(...rects.map(r => r.y));
      const maxBottom = Math.max(...rects.map(r => r.y + r.height));
      const center = (minY + maxBottom) / 2;
      rects.forEach(r => result.set(r.id, { y: center - r.height / 2 }));
      break;
    }
    case "bottom": {
      const maxBottom = Math.max(...rects.map(r => r.y + r.height));
      rects.forEach(r => result.set(r.id, { y: maxBottom - r.height }));
      break;
    }
    case "distribute-x": {
      if (rects.length < 3) break;
      const sorted = [...rects].sort((a, b) => a.x - b.x);
      const totalWidth = sorted.reduce((sum, r) => sum + r.width, 0);
      const first = sorted[0].x;
      const last = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width;
      const gap = (last - first - totalWidth) / (sorted.length - 1);
      let currentX = first;
      sorted.forEach((r, i) => {
        if (i === 0) { currentX += r.width; return; }
        currentX += gap;
        result.set(r.id, { x: currentX });
        currentX += r.width;
      });
      break;
    }
    case "distribute-y": {
      if (rects.length < 3) break;
      const sorted = [...rects].sort((a, b) => a.y - b.y);
      const totalHeight = sorted.reduce((sum, r) => sum + r.height, 0);
      const first = sorted[0].y;
      const last = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
      const gap = (last - first - totalHeight) / (sorted.length - 1);
      let currentY = first;
      sorted.forEach((r, i) => {
        if (i === 0) { currentY += r.height; return; }
        currentY += gap;
        result.set(r.id, { y: currentY });
        currentY += r.height;
      });
      break;
    }
    case "match-width": {
      const maxW = Math.max(...rects.map(r => r.width));
      rects.forEach(r => result.set(r.id, { width: maxW }));
      break;
    }
    case "match-height": {
      const maxH = Math.max(...rects.map(r => r.height));
      rects.forEach(r => result.set(r.id, { height: maxH }));
      break;
    }
    case "tidy": {
      // Auto-tidy: distribute evenly in a grid pattern
      const cols = Math.ceil(Math.sqrt(rects.length));
      const rows = Math.ceil(rects.length / cols);
      const cellW = containerWidth / cols;
      const cellH = containerHeight / rows;
      rects.forEach((r, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        result.set(r.id, {
          x: col * cellW + (cellW - r.width) / 2,
          y: row * cellH + (cellH - r.height) / 2,
        });
      });
      break;
    }
  }

  return result;
}

/* ── Nudge helpers ── */

export function nudge(
  rect: SnapRect,
  direction: "up" | "down" | "left" | "right",
  step: number,
  containerWidth = 100,
  containerHeight = 100,
): Partial<SnapRect> {
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  switch (direction) {
    case "up":
      return { y: clamp(rect.y - step, 0, containerHeight - rect.height) };
    case "down":
      return { y: clamp(rect.y + step, 0, containerHeight - rect.height) };
    case "left":
      return { x: clamp(rect.x - step, 0, containerWidth - rect.width) };
    case "right":
      return { x: clamp(rect.x + step, 0, containerWidth - rect.width) };
  }
}
