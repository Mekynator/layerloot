/**
 * Editable Node Schema System
 * 
 * Defines all editable elements (text, icon, button, media, layout) per block type.
 * Each block type declares its "editable nodes" so the editor can:
 * - Highlight individual elements on hover/click
 * - Show element-specific controls in the settings panel
 * - Enable inline double-click editing for text nodes
 */

export type EditableNodeType = "text" | "icon" | "button" | "media" | "layout";

export interface EditableTextNode {
  type: "text";
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
}

export interface EditableIconNode {
  type: "icon";
  key: string;
  label: string;
  sizeKey?: string;
  colorKey?: string;
}

export interface EditableButtonNode {
  type: "button";
  key: string;
  label: string;
  textKey: string;
  linkKey?: string;
  variantKey?: string;
  iconKey?: string;
}

export interface EditableMediaNode {
  type: "media";
  key: string;
  label: string;
  acceptTypes?: string[];
}

export interface EditableLayoutNode {
  type: "layout";
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export type EditableNode = 
  | EditableTextNode 
  | EditableIconNode 
  | EditableButtonNode 
  | EditableMediaNode 
  | EditableLayoutNode;

export interface BlockEditableSchema {
  blockType: string;
  nodes: EditableNode[];
  /** For repeater blocks, defines editable nodes per item */
  repeaterKey?: string;
  repeaterItemNodes?: EditableNode[];
}

const ALIGNMENT_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const VERTICAL_ALIGNMENT_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
];

export const BLOCK_EDITABLE_SCHEMAS: Record<string, BlockEditableSchema> = {
  hero: {
    blockType: "hero",
    nodes: [
      { type: "text", key: "eyebrow", label: "Eyebrow Text", placeholder: "e.g. 3D Printing Essentials" },
      { type: "icon", key: "icon", label: "Eyebrow Icon", sizeKey: "iconSize", colorKey: "iconColor" },
      { type: "text", key: "heading", label: "Heading", placeholder: "Main title" },
      { type: "text", key: "subheading", label: "Subheading", multiline: true, placeholder: "Description text" },
      { type: "media", key: "bg_image", label: "Background Image" },
      { type: "layout", key: "alignment", label: "Content Alignment", options: ALIGNMENT_OPTIONS },
      { type: "layout", key: "buttonAlignment", label: "Button Alignment", options: ALIGNMENT_OPTIONS },
      { type: "layout", key: "verticalAlignment", label: "Vertical Alignment", options: VERTICAL_ALIGNMENT_OPTIONS },
    ],
  },
  shipping_banner: {
    blockType: "shipping_banner",
    nodes: [
      { type: "text", key: "text", label: "Banner Text", placeholder: "Free shipping on orders over 500 kr" },
      { type: "icon", key: "icon", label: "Banner Icon", sizeKey: "iconSize", colorKey: "iconColor" },
    ],
  },
  banner: {
    blockType: "banner",
    nodes: [
      { type: "text", key: "heading", label: "Banner Text", placeholder: "Your banner headline" },
      { type: "text", key: "badge", label: "Badge Text", placeholder: "e.g. NEW" },
      { type: "text", key: "button_text", label: "Button Text" },
      { type: "text", key: "button_link", label: "Button Link" },
      { type: "media", key: "bg_image", label: "Banner Image" },
      { type: "icon", key: "icon", label: "Banner Icon", sizeKey: "iconSize", colorKey: "iconColor" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
  },
  text: {
    blockType: "text",
    nodes: [
      { type: "text", key: "heading", label: "Heading", placeholder: "Section title" },
      { type: "text", key: "body", label: "Body Text", multiline: true, placeholder: "Your content here" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
  },
  cta: {
    blockType: "cta",
    nodes: [
      { type: "text", key: "heading", label: "Heading", placeholder: "Call to action title" },
      { type: "text", key: "subheading", label: "Subheading", multiline: true },
      { type: "text", key: "button_text", label: "Button Text" },
      { type: "text", key: "button_link", label: "Button Link" },
      { type: "media", key: "bg_image", label: "Background Image" },
      { type: "icon", key: "icon", label: "CTA Icon", sizeKey: "iconSize", colorKey: "iconColor" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
  },
  entry_cards: {
    blockType: "entry_cards",
    nodes: [
      { type: "text", key: "heading", label: "Section Heading" },
      { type: "text", key: "subheading", label: "Section Subheading", multiline: true },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
      { type: "layout", key: "columns", label: "Columns", options: [
        { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" },
      ]},
    ],
    repeaterKey: "cards",
    repeaterItemNodes: [
      { type: "text", key: "title", label: "Card Title" },
      { type: "text", key: "desc", label: "Description", multiline: true },
      { type: "text", key: "cta", label: "Button Label" },
      { type: "text", key: "link", label: "Link" },
      { type: "icon", key: "icon", label: "Card Icon", sizeKey: "iconSize", colorKey: "iconColor" },
      { type: "media", key: "image", label: "Card Image" },
    ],
  },
  categories: {
    blockType: "categories",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "subheading", label: "Subheading", multiline: true },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
      { type: "layout", key: "tileLayoutMode", label: "Layout Mode", options: [
        { value: "grid", label: "Grid" },
        { value: "carousel", label: "Carousel" },
      ]},
      { type: "layout", key: "tileGridColumns", label: "Columns", options: [
        { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5" },
      ]},
    ],
  },
  featured_products: {
    blockType: "featured_products",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "subheading", label: "Subheading", multiline: true },
      { type: "text", key: "view_all_text", label: "View All Text", placeholder: "View All" },
      { type: "text", key: "view_all_link", label: "View All Link", placeholder: "/products" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
      { type: "layout", key: "tileLayoutMode", label: "Layout Mode", options: [
        { value: "grid", label: "Grid" },
        { value: "carousel", label: "Carousel" },
      ]},
      { type: "layout", key: "tileGridColumns", label: "Columns", options: [
        { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5" },
      ]},
    ],
  },
  how_it_works: {
    blockType: "how_it_works",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "subheading", label: "Subheading", multiline: true },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
      { type: "layout", key: "columns", label: "Columns", options: [
        { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" },
      ]},
    ],
    repeaterKey: "steps",
    repeaterItemNodes: [
      { type: "text", key: "title", label: "Step Title" },
      { type: "text", key: "desc", label: "Description", multiline: true },
      { type: "icon", key: "icon", label: "Step Icon", sizeKey: "iconSize", colorKey: "iconColor" },
      { type: "media", key: "image", label: "Step Image" },
    ],
  },
  faq: {
    blockType: "faq",
    nodes: [
      { type: "text", key: "heading", label: "Section Heading" },
      { type: "text", key: "subheading", label: "Section Subheading", multiline: true },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
    repeaterKey: "items",
    repeaterItemNodes: [
      { type: "text", key: "question", label: "Question" },
      { type: "text", key: "answer", label: "Answer", multiline: true },
      { type: "icon", key: "icon", label: "Icon" },
    ],
  },
  trust_badges: {
    blockType: "trust_badges",
    nodes: [
      { type: "text", key: "heading", label: "Section Heading" },
      { type: "text", key: "subheading", label: "Section Subheading", multiline: true },
      { type: "layout", key: "columns", label: "Columns", options: [
        { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" },
      ]},
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
    repeaterKey: "badges",
    repeaterItemNodes: [
      { type: "text", key: "title", label: "Badge Title" },
      { type: "text", key: "desc", label: "Description", multiline: true },
      { type: "icon", key: "icon", label: "Badge Icon", sizeKey: "iconSize", colorKey: "iconColor" },
      { type: "media", key: "image", label: "Badge Image" },
    ],
  },
  image: {
    blockType: "image",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "layout", key: "columns", label: "Columns", options: [
        { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" },
      ]},
    ],
    repeaterKey: "items",
    repeaterItemNodes: [
      { type: "media", key: "image", label: "Image" },
      { type: "text", key: "title", label: "Title" },
      { type: "text", key: "subtitle", label: "Subtitle" },
      { type: "text", key: "alt", label: "Alt Text" },
    ],
  },
  carousel: {
    blockType: "carousel",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
    ],
    repeaterKey: "slides",
    repeaterItemNodes: [
      { type: "media", key: "image", label: "Slide Image" },
      { type: "text", key: "title", label: "Title" },
      { type: "text", key: "subtitle", label: "Subtitle" },
      { type: "text", key: "caption", label: "Caption" },
    ],
  },
  video: {
    blockType: "video",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "video_url", label: "Video URL" },
      { type: "text", key: "caption", label: "Caption" },
      { type: "media", key: "poster_image", label: "Poster Image" },
    ],
  },
  newsletter: {
    blockType: "newsletter",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "subheading", label: "Subheading", multiline: true },
      { type: "text", key: "button_text", label: "Button Text" },
      { type: "text", key: "submit_text", label: "Submit Button Text" },
      { type: "text", key: "placeholder_text", label: "Input Placeholder", placeholder: "Enter your email" },
      { type: "icon", key: "icon", label: "Section Icon", sizeKey: "iconSize", colorKey: "iconColor" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
  },
  button: {
    blockType: "button",
    nodes: [
      { type: "text", key: "text", label: "Button Text" },
      { type: "text", key: "link", label: "Link" },
      { type: "icon", key: "button_icon", label: "Button Icon", sizeKey: "iconSize", colorKey: "iconColor" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
  },
  spacer: {
    blockType: "spacer",
    nodes: [],
  },
  html: {
    blockType: "html",
    nodes: [
      { type: "text", key: "html", label: "HTML Code", multiline: true },
    ],
  },
  embed: {
    blockType: "embed",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "embed_url", label: "Embed URL" },
    ],
  },
  instagram_auto_feed: {
    blockType: "instagram_auto_feed",
    nodes: [
      { type: "text", key: "title", label: "Title" },
      { type: "text", key: "subtitle", label: "Subtitle" },
      { type: "text", key: "instagramUsername", label: "Username" },
      { type: "icon", key: "icon", label: "Section Icon" },
    ],
  },
  // ─── New block types ───
  social_proof: {
    blockType: "social_proof",
    nodes: [
      { type: "text", key: "heading", label: "Section Heading" },
      { type: "text", key: "subheading", label: "Section Subheading", multiline: true },
      { type: "layout", key: "columns", label: "Columns", options: [
        { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" },
      ]},
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
    repeaterKey: "items",
    repeaterItemNodes: [
      { type: "text", key: "label", label: "Label" },
      { type: "text", key: "value", label: "Value / Counter" },
      { type: "icon", key: "icon", label: "Icon" },
    ],
  },
  testimonials: {
    blockType: "testimonials",
    nodes: [
      { type: "text", key: "heading", label: "Section Heading" },
      { type: "text", key: "subheading", label: "Subheading", multiline: true },
      { type: "layout", key: "columns", label: "Columns", options: [
        { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" },
      ]},
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
    repeaterKey: "items",
    repeaterItemNodes: [
      { type: "text", key: "name", label: "Customer Name" },
      { type: "text", key: "quote", label: "Quote", multiline: true },
      { type: "text", key: "rating", label: "Rating (1-5)" },
      { type: "media", key: "avatar", label: "Avatar Image" },
    ],
  },
  gallery: {
    blockType: "gallery",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "subheading", label: "Subheading", multiline: true },
      { type: "layout", key: "columns", label: "Columns", options: [
        { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" },
      ]},
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
    repeaterKey: "images",
    repeaterItemNodes: [
      { type: "media", key: "url", label: "Image" },
      { type: "text", key: "caption", label: "Caption" },
      { type: "text", key: "alt", label: "Alt Text" },
    ],
  },
  recently_viewed: {
    blockType: "recently_viewed",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "subheading", label: "Subheading", multiline: true },
      { type: "layout", key: "maxItems", label: "Max Items", options: [
        { value: "4", label: "4" }, { value: "6", label: "6" }, { value: "8", label: "8" },
      ]},
      { type: "layout", key: "columns", label: "Columns", options: [
        { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" },
      ]},
    ],
  },
  gift_finder: {
    blockType: "gift_finder",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "subheading", label: "Subheading", multiline: true },
      { type: "text", key: "button_text", label: "Button Text" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
  },
  countdown: {
    blockType: "countdown",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "subheading", label: "Subheading", multiline: true },
      { type: "text", key: "target_date", label: "Target Date (ISO)" },
      { type: "text", key: "expired_text", label: "Expired Text" },
      { type: "text", key: "button_text", label: "Button Text" },
      { type: "text", key: "button_link", label: "Button Link" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
  },
  divider: {
    blockType: "divider",
    nodes: [
      { type: "layout", key: "style", label: "Style", options: [
        { value: "line", label: "Line" },
        { value: "dots", label: "Dots" },
        { value: "gradient", label: "Gradient" },
        { value: "space", label: "Space Only" },
      ]},
    ],
  },
  // Header global section
  header: {
    blockType: "header",
    nodes: [
      { type: "media", key: "logo", label: "Logo Image" },
      { type: "text", key: "site_title", label: "Site Title" },
      { type: "text", key: "announcement_text", label: "Announcement Bar Text" },
      { type: "icon", key: "announcement_icon", label: "Announcement Icon" },
      { type: "layout", key: "sticky", label: "Sticky Behavior", options: [
        { value: "always", label: "Always Sticky" }, { value: "scroll", label: "Sticky on Scroll" }, { value: "none", label: "Not Sticky" },
      ]},
      { type: "layout", key: "style", label: "Header Style", options: [
        { value: "solid", label: "Solid" }, { value: "transparent", label: "Transparent" }, { value: "glass", label: "Glass" },
      ]},
    ],
    repeaterKey: "nav_items",
    repeaterItemNodes: [
      { type: "text", key: "label", label: "Nav Label" },
      { type: "text", key: "link", label: "Nav Link" },
      { type: "icon", key: "icon", label: "Nav Icon" },
    ],
  },
  // Footer global section
  footer: {
    blockType: "footer",
    nodes: [
      { type: "media", key: "logo", label: "Footer Logo" },
      { type: "text", key: "description", label: "Footer Description", multiline: true },
      { type: "text", key: "copyright", label: "Copyright Text" },
      { type: "media", key: "bg_image", label: "Background Image" },
    ],
    repeaterKey: "columns",
    repeaterItemNodes: [
      { type: "text", key: "title", label: "Column Title" },
      { type: "text", key: "links", label: "Links (one per line)", multiline: true },
      { type: "icon", key: "icon", label: "Column Icon" },
    ],
  },
};

export function getBlockSchema(blockType: string): BlockEditableSchema {
  return BLOCK_EDITABLE_SCHEMAS[blockType] || {
    blockType,
    nodes: [],
  };
}

/** Get all inline-editable text keys for a block type (for double-click editing) */
export function getInlineTextKeys(blockType: string): string[] {
  const schema = getBlockSchema(blockType);
  return schema.nodes
    .filter((n): n is EditableTextNode => n.type === "text")
    .map(n => n.key);
}
