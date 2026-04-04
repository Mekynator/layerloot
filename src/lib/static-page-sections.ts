/**
 * Static page section definitions + unified layout ordering.
 * Static sections represent hardcoded React content on pages.
 * They appear as read-only previews in the Visual Editor.
 */

export interface StaticSection {
  id: string;
  label: string;
  description: string;
  icon: string;
  /** Component hint for rendering a real preview */
  previewType: string;
}

export type PreviewItemSource = "static" | "dynamic";

export interface PreviewItem {
  id: string;
  source: PreviewItemSource;
  editable: boolean;
  blockType: string;
  label: string;
  sortKey: number;
  block?: any;
  staticSection?: StaticSection;
}

/** Ordered layout entry stored in site_settings */
export interface LayoutEntry {
  id: string;
  source: PreviewItemSource;
}

const STATIC_SECTIONS: Record<string, StaticSection[]> = {
  home: [],
  products: [
    { id: "static_products_header", label: "Products Header", description: "Page title, search & category filters", icon: "Search", previewType: "products_header" },
    { id: "static_products_grid", label: "Products Grid", description: "Product cards with pagination", icon: "LayoutGrid", previewType: "products_grid" },
  ],
  contact: [
    { id: "static_contact_form", label: "Contact Form", description: "Name, email, message form with submission", icon: "Mail", previewType: "contact_form" },
  ],
  gallery: [
    { id: "static_gallery_grid", label: "Gallery", description: "User-submitted gallery photos grid", icon: "Image", previewType: "gallery_grid" },
  ],
  create: [
    { id: "static_create_hero", label: "Create Your Own Hero", description: "Product configurator intro section", icon: "Palette", previewType: "create_hero" },
    { id: "static_create_tools", label: "Creation Tools", description: "Custom order wizard, lithophane tool, design submission", icon: "Wrench", previewType: "create_tools" },
  ],
  creations: [
    { id: "static_creations_showcase", label: "Creations Showcase", description: "Community showcase gallery with filters", icon: "Star", previewType: "creations_gallery" },
  ],
  "submit-design": [
    { id: "static_submit_form", label: "Submit Design Form", description: "File upload & design submission form", icon: "Upload", previewType: "submit_form" },
  ],
  cart: [
    { id: "static_cart_items", label: "Shopping Cart", description: "Cart items, totals & checkout flow", icon: "ShoppingCart", previewType: "cart_view" },
  ],
  account: [
    { id: "static_account_dashboard", label: "Account Dashboard", description: "Orders, settings & account overview", icon: "User", previewType: "account_dashboard" },
  ],
  "order-tracking": [
    { id: "static_order_tracking", label: "Order Tracking", description: "Order status lookup and timeline", icon: "Package", previewType: "order_tracking" },
  ],
  about: [],
  policies: [],
};

export function getStaticSections(pageKey: string): StaticSection[] {
  return STATIC_SECTIONS[pageKey] ?? [];
}

/**
 * Build unified preview list using a saved layout order.
 * If no layout exists, statics come first then dynamics.
 */
export function buildPreviewList(
  pageKey: string,
  dynamicBlocks: Array<{ id: string; block_type: string; title?: string | null; sort_order: number; [k: string]: any }>,
  layoutOrder?: LayoutEntry[] | null,
): PreviewItem[] {
  const statics = getStaticSections(pageKey);
  const staticMap = new Map(statics.map(s => [s.id, s]));
  const dynamicMap = new Map(dynamicBlocks.map(b => [b.id, b]));

  if (layoutOrder && layoutOrder.length > 0) {
    const items: PreviewItem[] = [];
    let sortKey = 0;

    for (const entry of layoutOrder) {
      if (entry.source === "static") {
        const section = staticMap.get(entry.id);
        if (section) {
          items.push({ id: section.id, source: "static", editable: false, blockType: section.icon, label: section.label, sortKey: sortKey++, staticSection: section });
          staticMap.delete(entry.id);
        }
      } else {
        const block = dynamicMap.get(entry.id);
        if (block) {
          items.push({ id: block.id, source: "dynamic", editable: true, blockType: block.block_type, label: block.title || block.block_type.replace(/_/g, " "), sortKey: sortKey++, block });
          dynamicMap.delete(entry.id);
        }
      }
    }

    // Append any new items not in saved layout
    for (const [, section] of staticMap) {
      items.push({ id: section.id, source: "static", editable: false, blockType: section.icon, label: section.label, sortKey: sortKey++, staticSection: section });
    }
    for (const [, block] of dynamicMap) {
      items.push({ id: block.id, source: "dynamic", editable: true, blockType: block.block_type, label: block.title || block.block_type.replace(/_/g, " "), sortKey: sortKey++, block });
    }
    return items;
  }

  // Default: statics first, then dynamics
  const items: PreviewItem[] = [];
  let sortKey = 0;
  for (const section of statics) {
    items.push({ id: section.id, source: "static", editable: false, blockType: section.icon, label: section.label, sortKey: sortKey++, staticSection: section });
  }
  for (const block of dynamicBlocks) {
    items.push({ id: block.id, source: "dynamic", editable: true, blockType: block.block_type, label: block.title || block.block_type.replace(/_/g, " "), sortKey: sortKey++, block });
  }
  return items;
}

/** Extract layout entries from a preview list (for persistence) */
export function previewListToLayout(items: PreviewItem[]): LayoutEntry[] {
  return items.map(i => ({ id: i.id, source: i.source }));
}
