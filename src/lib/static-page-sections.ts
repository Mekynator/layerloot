import { tr } from "@/lib/translate";

/**
 * Static page section definitions + unified layout ordering.
 * Static sections represent hardcoded React content on pages.
 * They are configurable (heading, visibility, layout) via the Visual Editor.
 */

export interface StaticSectionField {
  key: string;
  label: string;
  type: "text" | "textarea" | "switch" | "select" | "number";
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
}

export interface StaticSection {
  id: string;
  label: string;
  description: string;
  icon: string;
  /** Component hint for rendering a real preview */
  previewType: string;
  /** Configurable fields exposed in the editor settings panel */
  fields: StaticSectionField[];
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

type LocalizedLabel = string | Record<string, string> | null | undefined;

const getBlockPreviewLabel = (blockType: string, title?: LocalizedLabel) => {
  const fallback = blockType.replace(/_/g, " ");

  if (typeof title === "string") {
    return tr(title, fallback);
  }

  if (title && typeof title === "object" && !Array.isArray(title)) {
    return tr(title, fallback);
  }

  return fallback;
};

/** Ordered layout entry stored in site_settings */
export interface LayoutEntry {
  id: string;
  source: PreviewItemSource;
}

/* ─── Common field presets ─── */

const headingField = (placeholder = "Section heading"): StaticSectionField => ({
  key: "heading", label: "Heading", type: "text", placeholder,
});

const subheadingField = (placeholder = "Section subheading"): StaticSectionField => ({
  key: "subheading", label: "Subheading", type: "textarea", placeholder,
});

const visibilityField: StaticSectionField = {
  key: "visible", label: "Visible on site", type: "switch", defaultValue: true,
};

const columnsField: StaticSectionField = {
  key: "columns", label: "Columns", type: "select",
  options: [
    { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5" },
  ],
  defaultValue: "4",
};

const limitField = (defaultValue = 8): StaticSectionField => ({
  key: "limit", label: "Max items", type: "number", defaultValue,
});

/* ─── Section definitions ─── */

const STATIC_SECTIONS: Record<string, StaticSection[]> = {
  home: [
    {
      id: "static_home_smart_sections",
      label: "Smart Recommendations",
      description: "Personalized product recommendations based on user activity",
      icon: "Sparkles",
      previewType: "home_smart_sections",
      fields: [
        headingField("Recommended for You"),
        visibilityField,
        columnsField,
        limitField(4),
      ],
    },
    {
      id: "static_home_social_proof",
      label: "Social Proof",
      description: "Customer reviews, trust badges, and social proof section",
      icon: "Star",
      previewType: "home_social_proof",
      fields: [
        headingField("What Our Customers Say"),
        visibilityField,
        columnsField,
      ],
    },
  ],
  products: [
    {
      id: "static_products_header",
      label: "Products Header",
      description: "Page title, search & category filters",
      icon: "Search",
      previewType: "products_header",
      fields: [
        headingField("Our Products"),
        { key: "show_search", label: "Show search bar", type: "switch", defaultValue: true },
        { key: "show_categories", label: "Show category filters", type: "switch", defaultValue: true },
        visibilityField,
      ],
    },
    {
      id: "static_products_grid",
      label: "Products Grid",
      description: "Product cards with pagination",
      icon: "LayoutGrid",
      previewType: "products_grid",
      fields: [
        columnsField,
        limitField(12),
        visibilityField,
      ],
    },
  ],
  contact: [
    {
      id: "static_contact_form",
      label: "Contact Form",
      description: "Name, email, message form with submission",
      icon: "Mail",
      previewType: "contact_form",
      fields: [
        headingField("Get In Touch"),
        subheadingField("We'd love to hear from you"),
        visibilityField,
      ],
    },
  ],
  gallery: [
    {
      id: "static_gallery_grid",
      label: "Gallery",
      description: "User-submitted gallery photos grid",
      icon: "Image",
      previewType: "gallery_grid",
      fields: [
        headingField("Community Gallery"),
        columnsField,
        limitField(9),
        visibilityField,
      ],
    },
  ],
  create: [
    {
      id: "static_create_hero",
      label: "Create Your Own Hero",
      description: "Product configurator intro section",
      icon: "Palette",
      previewType: "create_hero",
      fields: [
        headingField("Bring Your Ideas to Life"),
        subheadingField("Choose from our creation tools below"),
        visibilityField,
      ],
    },
    {
      id: "static_create_tools",
      label: "Creation Tools",
      description: "Custom order wizard, lithophane tool, design submission",
      icon: "Wrench",
      previewType: "create_tools",
      fields: [visibilityField],
    },
  ],
  creations: [
    {
      id: "static_creations_showcase",
      label: "Creations Showcase",
      description: "Community showcase gallery with filters",
      icon: "Star",
      previewType: "creations_gallery",
      fields: [
        headingField("Community Creations"),
        columnsField,
        visibilityField,
      ],
    },
  ],
  "submit-design": [
    {
      id: "static_submit_form",
      label: "Submit Design Form",
      description: "File upload & design submission form",
      icon: "Upload",
      previewType: "submit_form",
      fields: [
        headingField("Submit Your Design"),
        subheadingField("Upload your 3D model and let us bring it to life"),
        visibilityField,
      ],
    },
  ],
  cart: [
    {
      id: "static_cart_items",
      label: "Shopping Cart",
      description: "Cart items, totals & checkout flow",
      icon: "ShoppingCart",
      previewType: "cart_view",
      fields: [visibilityField],
    },
  ],
  account: [
    {
      id: "static_account_dashboard",
      label: "Account Dashboard",
      description: "Orders, settings & account overview",
      icon: "User",
      previewType: "account_dashboard",
      fields: [visibilityField],
    },
  ],
  "order-tracking": [
    {
      id: "static_order_tracking",
      label: "Order Tracking",
      description: "Order status lookup and timeline",
      icon: "Package",
      previewType: "order_tracking",
      fields: [
        headingField("Track Your Order"),
        visibilityField,
      ],
    },
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
  dynamicBlocks: Array<{ id: string; block_type: string; title?: string | Record<string, string> | null; sort_order: number; [k: string]: unknown }>,
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
          items.push({ id: section.id, source: "static", editable: true, blockType: section.icon, label: section.label, sortKey: sortKey++, staticSection: section });
          staticMap.delete(entry.id);
        }
      } else {
        const block = dynamicMap.get(entry.id);
        if (block) {
          items.push({ id: block.id, source: "dynamic", editable: true, blockType: block.block_type, label: getBlockPreviewLabel(block.block_type, block.title), sortKey: sortKey++, block });
          dynamicMap.delete(entry.id);
        }
      }
    }

    // Append any new items not in saved layout
    for (const [, section] of staticMap) {
      items.push({ id: section.id, source: "static", editable: true, blockType: section.icon, label: section.label, sortKey: sortKey++, staticSection: section });
    }
    for (const [, block] of dynamicMap) {
      items.push({ id: block.id, source: "dynamic", editable: true, blockType: block.block_type, label: getBlockPreviewLabel(block.block_type, block.title), sortKey: sortKey++, block });
    }
    return items;
  }

  // Default: statics first, then dynamics
  const items: PreviewItem[] = [];
  let sortKey = 0;
  for (const section of statics) {
    items.push({ id: section.id, source: "static", editable: true, blockType: section.icon, label: section.label, sortKey: sortKey++, staticSection: section });
  }
  for (const block of dynamicBlocks) {
    items.push({ id: block.id, source: "dynamic", editable: true, blockType: block.block_type, label: getBlockPreviewLabel(block.block_type, block.title), sortKey: sortKey++, block });
  }
  return items;
}

/** Extract layout entries from a preview list (for persistence) */
export function previewListToLayout(items: PreviewItem[]): LayoutEntry[] {
  return items.map(i => ({ id: i.id, source: i.source }));
}
