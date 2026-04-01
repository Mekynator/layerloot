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
  key: string;            // content key path e.g. "heading", "subheading"
  label: string;          // display name e.g. "Heading"
  multiline?: boolean;    // textarea vs input
  placeholder?: string;
}

export interface EditableIconNode {
  type: "icon";
  key: string;
  label: string;
  sizeKey?: string;       // optional content key for icon size
  colorKey?: string;      // optional content key for icon color
}

export interface EditableButtonNode {
  type: "button";
  key: string;            // content key e.g. "buttons[0]" or "button_text"
  label: string;
  textKey: string;        // key for button text
  linkKey?: string;       // key for button link
  variantKey?: string;
  iconKey?: string;
}

export interface EditableMediaNode {
  type: "media";
  key: string;
  label: string;
  acceptTypes?: string[]; // e.g. ["image/png", "image/jpeg"]
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

export const BLOCK_EDITABLE_SCHEMAS: Record<string, BlockEditableSchema> = {
  hero: {
    blockType: "hero",
    nodes: [
      { type: "text", key: "eyebrow", label: "Eyebrow Text", placeholder: "e.g. New Collection" },
      { type: "text", key: "heading", label: "Heading", placeholder: "Main title" },
      { type: "text", key: "subheading", label: "Subheading", multiline: true, placeholder: "Description text" },
      { type: "icon", key: "icon", label: "Hero Icon", sizeKey: "iconSize", colorKey: "iconColor" },
      { type: "media", key: "bg_image", label: "Background Image" },
      { type: "layout", key: "alignment", label: "Content Alignment", options: ALIGNMENT_OPTIONS },
      { type: "layout", key: "buttonAlignment", label: "Button Alignment", options: ALIGNMENT_OPTIONS },
    ],
  },
  shipping_banner: {
    blockType: "shipping_banner",
    nodes: [
      { type: "text", key: "text", label: "Banner Text" },
      { type: "icon", key: "icon", label: "Banner Icon" },
    ],
  },
  banner: {
    blockType: "banner",
    nodes: [
      { type: "text", key: "heading", label: "Banner Text" },
      { type: "text", key: "badge", label: "Badge Text" },
      { type: "text", key: "button_text", label: "Button Text" },
      { type: "text", key: "button_link", label: "Button Link" },
      { type: "media", key: "bg_image", label: "Banner Image" },
    ],
  },
  text: {
    blockType: "text",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "body", label: "Body Text", multiline: true },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
  },
  cta: {
    blockType: "cta",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "subheading", label: "Subheading" },
      { type: "text", key: "button_text", label: "Button Text" },
      { type: "text", key: "button_link", label: "Button Link" },
      { type: "media", key: "bg_image", label: "Background Image" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
  },
  entry_cards: {
    blockType: "entry_cards",
    nodes: [
      { type: "text", key: "heading", label: "Section Heading" },
      { type: "text", key: "subheading", label: "Section Subheading" },
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
      { type: "icon", key: "icon", label: "Card Icon" },
      { type: "media", key: "image", label: "Card Image" },
    ],
  },
  categories: {
    blockType: "categories",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "subheading", label: "Subheading" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
  },
  featured_products: {
    blockType: "featured_products",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "subheading", label: "Subheading" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
  },
  how_it_works: {
    blockType: "how_it_works",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "subheading", label: "Subheading" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
      { type: "layout", key: "columns", label: "Columns", options: [
        { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" },
      ]},
    ],
    repeaterKey: "steps",
    repeaterItemNodes: [
      { type: "text", key: "title", label: "Step Title" },
      { type: "text", key: "desc", label: "Description", multiline: true },
      { type: "icon", key: "icon", label: "Step Icon" },
      { type: "media", key: "image", label: "Step Image" },
    ],
  },
  faq: {
    blockType: "faq",
    nodes: [
      { type: "text", key: "heading", label: "Section Heading" },
      { type: "text", key: "subheading", label: "Section Subheading" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
    repeaterKey: "items",
    repeaterItemNodes: [
      { type: "text", key: "question", label: "Question" },
      { type: "text", key: "answer", label: "Answer", multiline: true },
    ],
  },
  trust_badges: {
    blockType: "trust_badges",
    nodes: [
      { type: "text", key: "heading", label: "Section Heading" },
      { type: "text", key: "subheading", label: "Section Subheading" },
      { type: "layout", key: "columns", label: "Columns", options: [
        { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" },
      ]},
    ],
    repeaterKey: "badges",
    repeaterItemNodes: [
      { type: "text", key: "title", label: "Badge Title" },
      { type: "text", key: "desc", label: "Description" },
      { type: "icon", key: "icon", label: "Badge Icon" },
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
    ],
  },
  video: {
    blockType: "video",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "video_url", label: "Video URL" },
      { type: "text", key: "caption", label: "Caption" },
    ],
  },
  newsletter: {
    blockType: "newsletter",
    nodes: [
      { type: "text", key: "heading", label: "Heading" },
      { type: "text", key: "subheading", label: "Subheading" },
      { type: "text", key: "button_text", label: "Button Text" },
      { type: "text", key: "submit_text", label: "Submit Button Text" },
      { type: "layout", key: "alignment", label: "Alignment", options: ALIGNMENT_OPTIONS },
    ],
  },
  button: {
    blockType: "button",
    nodes: [
      { type: "text", key: "text", label: "Button Text" },
      { type: "text", key: "link", label: "Link" },
      { type: "icon", key: "button_icon", label: "Button Icon" },
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
