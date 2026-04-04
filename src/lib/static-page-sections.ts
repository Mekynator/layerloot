/**
 * Phase 1: Static page section definitions.
 * These represent the hardcoded React content that certain pages render
 * independently of CMS blocks. They appear as locked/read-only preview
 * shells in the Visual Editor so admins can see the full page layout.
 */

export interface StaticSection {
  /** Stable identifier – must be unique per page */
  id: string;
  /** Human-readable label shown in editor */
  label: string;
  /** Short description of what this section contains */
  description: string;
  /** Icon hint (lucide icon name) */
  icon: string;
  /** Approximate height hint for the preview shell (px) */
  heightHint: number;
}

/**
 * Map of page editor keys → ordered static sections.
 * Only pages with hardcoded React content need entries here.
 * Pure CMS pages (home, about, …) have no static sections.
 */
const STATIC_SECTIONS: Record<string, StaticSection[]> = {
  products: [
    { id: "static_products_header", label: "Products Header", description: "Page title, search & category filters", icon: "Search", heightHint: 120 },
    { id: "static_products_grid", label: "Products Grid", description: "Product cards with pagination", icon: "LayoutGrid", heightHint: 400 },
  ],
  contact: [
    { id: "static_contact_form", label: "Contact Form", description: "Name, email, message form with submission", icon: "Mail", heightHint: 360 },
  ],
  gallery: [
    { id: "static_gallery_grid", label: "Gallery", description: "User-submitted gallery photos grid", icon: "Image", heightHint: 400 },
  ],
  create: [
    { id: "static_create_hero", label: "Create Your Own", description: "Custom order wizard / configurator", icon: "Palette", heightHint: 500 },
  ],
  creations: [
    { id: "static_creations_showcase", label: "Creations Showcase", description: "Community showcase gallery", icon: "Star", heightHint: 400 },
  ],
  "submit-design": [
    { id: "static_submit_form", label: "Submit Design Form", description: "File upload & design submission form", icon: "Upload", heightHint: 360 },
  ],
  cart: [
    { id: "static_cart_items", label: "Shopping Cart", description: "Cart items, totals & checkout flow", icon: "ShoppingCart", heightHint: 400 },
  ],
  account: [
    { id: "static_account_dashboard", label: "Account Dashboard", description: "Orders, settings & account overview", icon: "User", heightHint: 400 },
  ],
};

export function getStaticSections(pageKey: string): StaticSection[] {
  return STATIC_SECTIONS[pageKey] ?? [];
}

/**
 * Unified preview item combining static and dynamic blocks.
 */
export type PreviewItemSource = "static" | "dynamic";

export interface PreviewItem {
  id: string;
  source: PreviewItemSource;
  editable: boolean;
  blockType: string;
  label: string;
  sortKey: number;
  /** Only set for dynamic blocks */
  block?: any;
  /** Only set for static sections */
  staticSection?: StaticSection;
}

/**
 * Build a merged preview list: static sections first, then dynamic blocks.
 */
export function buildPreviewList(
  pageKey: string,
  dynamicBlocks: Array<{ id: string; block_type: string; title?: string | null; sort_order: number; [k: string]: any }>,
): PreviewItem[] {
  const statics = getStaticSections(pageKey);
  const items: PreviewItem[] = [];
  let sortKey = 0;

  // Static sections come first (they represent the page's native content)
  for (const section of statics) {
    items.push({
      id: section.id,
      source: "static",
      editable: false,
      blockType: section.icon,
      label: section.label,
      sortKey: sortKey++,
      staticSection: section,
    });
  }

  // Dynamic CMS blocks come after
  for (const block of dynamicBlocks) {
    items.push({
      id: block.id,
      source: "dynamic",
      editable: true,
      blockType: block.block_type,
      label: block.title || block.block_type.replace(/_/g, " "),
      sortKey: sortKey++,
      block,
    });
  }

  return items;
}
