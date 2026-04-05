/**
 * Reusable product tile section settings schema.
 * Used across homepage recommendation sections, featured products blocks,
 * Products page grids, and any future product listing sections.
 */

export interface ProductTileSectionSettings {
  /** Layout mode */
  layoutMode: "grid" | "carousel";

  /** Grid columns (1-6) */
  gridColumns: number;

  /** Max products to display */
  maxItems: number;

  /** Gap between cards in px */
  spacing: number;

  /** Show section title */
  showTitle: boolean;

  /** Show section subtitle/description */
  showSubtitle: boolean;

  /** Show badge/label above title */
  showBadge: boolean;

  /** Show navigation arrows (carousel) */
  showArrows: boolean;

  /** Show dot indicators (carousel) */
  showDots: boolean;

  /** Auto-play carousel */
  autoSlideshow: boolean;

  /** Slideshow speed in ms */
  slideshowSpeed: number;

  /** Loop carousel */
  loop: boolean;

  /** Enable drag/scroll (carousel) */
  dragEnabled: boolean;

  /** Card minimum width in px (carousel) */
  cardMinWidth: number;

  /** Card height in px (0 = auto) */
  cardHeight: number;

  /** Mobile columns override */
  mobileColumns: number;

  /** Mobile layout mode override */
  mobileLayoutMode: "grid" | "carousel";
}

export const DEFAULT_TILE_SECTION_SETTINGS: ProductTileSectionSettings = {
  layoutMode: "grid",
  gridColumns: 4,
  maxItems: 8,
  spacing: 16,
  showTitle: true,
  showSubtitle: true,
  showBadge: false,
  showArrows: true,
  showDots: true,
  autoSlideshow: false,
  slideshowSpeed: 5000,
  loop: true,
  dragEnabled: true,
  cardMinWidth: 260,
  cardHeight: 0,
  mobileColumns: 2,
  mobileLayoutMode: "carousel",
};

/** Merge partial settings with defaults */
export function mergeTileSettings(
  partial?: Partial<ProductTileSectionSettings> | null,
): ProductTileSectionSettings {
  return { ...DEFAULT_TILE_SECTION_SETTINGS, ...partial };
}
