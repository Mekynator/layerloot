import { type ReactNode, useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowUp, ArrowDown, Trash2, Type, ImageIcon, Link2, LayoutGrid, Database, Eye, Settings2 } from "lucide-react";
import AdminPageSelect from "@/components/admin/AdminPageSelect";
import { supabase } from "@/integrations/supabase/client";

// ─── Shared Constants ────────────────────────────────────────────

export const ICON_OPTIONS = [
  "Truck", "Shield", "Star", "ShoppingBag", "Palette", "Upload", "Package",
  "HelpCircle", "Gift", "Heart", "Sparkles", "BadgeCheck", "Printer", "Box",
  "Mail", "ExternalLink", "CheckCircle2", "Gem", "Wrench", "Home", "Instagram",
  "Users", "Clock", "Zap", "Award", "Target", "Layers",
];

// ─── Types ───────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "switch" | "slider" | "icon" | "image" | "datetime" | "number";
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  description?: string;
  helperText?: string;
  defaultValue?: string | number | boolean;
}

interface FieldGroup {
  id: string;
  label: string;
  icon: ReactNode;
  fields: FieldDef[];
  defaultOpen?: boolean;
}

interface RepeaterFieldConfig {
  key: string;
  label: string;
  itemLabel: string;
  titleKey: string;
  fields: FieldDef[];
  showActionEditor?: boolean;
}

interface BlockGroupConfig {
  groups: FieldGroup[];
  repeater?: RepeaterFieldConfig;
}

// ─── Alignment / Column option sets ──────────────────────────────

const ALIGN_OPTS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const VALIGN_OPTS = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
];

const COL_2_4 = [{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }];
const COL_1_4 = [{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }];
const COL_2_5 = [{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5" }];
const COL_1_3 = [{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }];

const LAYOUT_MODE = [{ value: "grid", label: "Grid" }, { value: "carousel", label: "Carousel" }];

// ─── Block Group Configs ─────────────────────────────────────────

function getBlockGroupConfig(blockType: string): BlockGroupConfig {
  const contentIcon = <Type className="h-3.5 w-3.5" />;
  const mediaIcon = <ImageIcon className="h-3.5 w-3.5" />;
  const linkIcon = <Link2 className="h-3.5 w-3.5" />;
  const layoutIcon = <LayoutGrid className="h-3.5 w-3.5" />;
  const dataIcon = <Database className="h-3.5 w-3.5" />;
  const visIcon = <Eye className="h-3.5 w-3.5" />;
  const settingsIcon = <Settings2 className="h-3.5 w-3.5" />;

  switch (blockType) {
    case "hero":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "eyebrow", label: "Eyebrow text", type: "text", placeholder: "e.g. 3D Printing" },
            { key: "heading", label: "Heading", type: "text", placeholder: "Main title" },
            { key: "subheading", label: "Subheading", type: "textarea", rows: 3, placeholder: "Description" },
          ]},
          { id: "buttons", label: "Buttons & Links", icon: linkIcon, fields: [
            { key: "button_text", label: "Primary button text", type: "text" },
            { key: "button_link", label: "Primary button link", type: "text", placeholder: "/products" },
            { key: "secondary_button_text", label: "Secondary button text", type: "text" },
            { key: "secondary_button_link", label: "Secondary button link", type: "text" },
          ]},
          { id: "media", label: "Media", icon: mediaIcon, fields: [
            { key: "bg_image", label: "Background image URL", type: "image", placeholder: "https://..." },
            { key: "icon", label: "Eyebrow icon", type: "icon" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "alignment", label: "Content alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
      };

    case "cta":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "subheading", label: "Subheading", type: "textarea", rows: 3 },
          ]},
          { id: "buttons", label: "Buttons & Links", icon: linkIcon, fields: [
            { key: "button_text", label: "Button text", type: "text" },
            { key: "button_link", label: "Button link", type: "text" },
          ]},
          { id: "media", label: "Media", icon: mediaIcon, fields: [
            { key: "bg_image", label: "Background image URL", type: "image", placeholder: "https://..." },
            { key: "icon", label: "Icon", type: "icon" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
      };

    case "banner":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Banner text", type: "text" },
            { key: "badge", label: "Badge text", type: "text", placeholder: "e.g. NEW" },
          ]},
          { id: "buttons", label: "Buttons & Links", icon: linkIcon, fields: [
            { key: "button_text", label: "Button text", type: "text" },
            { key: "button_link", label: "Button link", type: "text" },
          ]},
          { id: "media", label: "Media", icon: mediaIcon, fields: [
            { key: "bg_image", label: "Banner image", type: "image" },
            { key: "icon", label: "Banner icon", type: "icon" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
      };

    case "shipping_banner":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "text", label: "Banner text", type: "text", placeholder: "Free shipping on orders over 500 kr" },
            { key: "icon", label: "Banner icon", type: "icon" },
          ]},
        ],
      };

    case "text":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "body", label: "Body text", type: "textarea", rows: 6 },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
      };

    case "video":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "caption", label: "Caption", type: "text" },
          ]},
          { id: "media", label: "Media", icon: mediaIcon, fields: [
            { key: "video_url", label: "Video URL", type: "text", placeholder: "YouTube, Vimeo, or direct URL" },
            { key: "poster_image", label: "Poster image URL", type: "image", placeholder: "https://..." },
          ]},
        ],
      };

    case "newsletter":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "subheading", label: "Subheading", type: "textarea", rows: 3 },
          ]},
          { id: "buttons", label: "Form Settings", icon: linkIcon, fields: [
            { key: "submit_text", label: "Submit button text", type: "text" },
            { key: "placeholder_text", label: "Input placeholder", type: "text", placeholder: "Enter your email" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
      };

    case "countdown":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "subheading", label: "Subheading", type: "textarea", rows: 2 },
            { key: "target_date", label: "Target date", type: "datetime" },
            { key: "expired_text", label: "Expired text", type: "text" },
          ]},
          { id: "buttons", label: "Buttons & Links", icon: linkIcon, fields: [
            { key: "button_text", label: "Button text", type: "text" },
            { key: "button_link", label: "Button link", type: "text" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
      };

    case "divider":
      return {
        groups: [
          { id: "settings", label: "Settings", icon: settingsIcon, defaultOpen: true, fields: [
            { key: "style", label: "Style", type: "select", options: [
              { value: "line", label: "Line" }, { value: "dots", label: "Dots" },
              { value: "gradient", label: "Gradient" }, { value: "space", label: "Space Only" },
            ]},
            { key: "height", label: "Height (px)", type: "number", min: 8, max: 200, defaultValue: 40 },
          ]},
        ],
      };

    case "button":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "text", label: "Button text", type: "text" },
            { key: "link", label: "Link", type: "text" },
            { key: "button_icon", label: "Button icon", type: "icon" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
      };

    case "html":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "html", label: "HTML Code", type: "textarea", rows: 8 },
          ]},
        ],
      };

    case "embed":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "embed_url", label: "Embed URL", type: "text" },
          ]},
        ],
      };

    case "spacer":
      return {
        groups: [
          { id: "settings", label: "Settings", icon: settingsIcon, defaultOpen: true, fields: [
            { key: "height", label: "Height (px)", type: "number", min: 8, max: 200, defaultValue: 40 },
          ]},
        ],
      };

    case "featured_products":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "subheading", label: "Subheading", type: "text" },
            { key: "view_all_text", label: "View all text", type: "text", placeholder: "View All" },
            { key: "view_all_link", label: "View all link", type: "text", placeholder: "/products" },
          ]},
          { id: "data", label: "Data Source", icon: dataIcon, fields: [
            { key: "limit", label: "Product limit", type: "select", options: [
              { value: "4", label: "4" }, { value: "6", label: "6" }, { value: "8", label: "8" }, { value: "12", label: "12" },
            ]},
            { key: "tileShowTitle", label: "Show title", type: "switch" },
            { key: "tileShowSubtitle", label: "Show subtitle", type: "switch" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "tileGridColumns", label: "Grid columns", type: "select", options: COL_2_5 },
            { key: "tileLayoutMode", label: "Layout mode", type: "select", options: LAYOUT_MODE },
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
      };

    case "categories":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "subheading", label: "Subheading", type: "text" },
          ]},
          { id: "data", label: "Data Source", icon: dataIcon, fields: [
            { key: "limit", label: "Category limit", type: "select", options: [
              { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "6", label: "6" }, { value: "8", label: "8" },
            ]},
            { key: "tileShowTitle", label: "Show title", type: "switch" },
            { key: "tileShowSubtitle", label: "Show subtitle", type: "switch" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "tileGridColumns", label: "Grid columns", type: "select", options: COL_2_5 },
            { key: "tileLayoutMode", label: "Layout mode", type: "select", options: LAYOUT_MODE },
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
      };

    case "recently_viewed":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "subheading", label: "Subheading", type: "text" },
          ]},
          { id: "data", label: "Data Source", icon: dataIcon, fields: [
            { key: "maxItems", label: "Max items", type: "select", options: [
              { value: "4", label: "4" }, { value: "6", label: "6" }, { value: "8", label: "8" },
            ]},
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "columns", label: "Columns", type: "select", options: COL_2_4 },
          ]},
        ],
      };

    case "gift_finder":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "subheading", label: "Subheading", type: "textarea", rows: 2 },
            { key: "button_text", label: "Button text", type: "text" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
      };

    case "instagram_auto_feed":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "title", label: "Title", type: "text" },
            { key: "subtitle", label: "Subtitle", type: "text" },
            { key: "instagramUsername", label: "Username", type: "text" },
            { key: "icon", label: "Section icon", type: "icon" },
          ]},
        ],
      };

    // ─── Repeater block types ────────────────────────────────────

    case "faq":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Section heading", type: "text" },
            { key: "subheading", label: "Section subtitle", type: "text" },
          ]},
          { id: "visibility", label: "Visibility", icon: visIcon, fields: [
            { key: "visibility", label: "Show section on page", type: "switch", defaultValue: true },
          ]},
        ],
        repeater: { key: "items", label: "FAQ Items", itemLabel: "FAQ item", titleKey: "question", fields: [
          { key: "question", label: "Question", type: "text" },
          { key: "answer", label: "Answer", type: "textarea", rows: 4 },
        ]},
      };

    case "how_it_works":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "subheading", label: "Subheading", type: "text" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "columns", label: "Columns", type: "select", options: COL_1_4 },
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
          { id: "visibility", label: "Visibility", icon: visIcon, fields: [
            { key: "visibility", label: "Show section on page", type: "switch", defaultValue: true },
          ]},
        ],
        repeater: { key: "steps", label: "Steps", itemLabel: "Step", titleKey: "title", showActionEditor: true, fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "icon", label: "Icon", type: "icon" },
          { key: "desc", label: "Description", type: "textarea", rows: 3 },
        ]},
      };

    case "trust_badges":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "subheading", label: "Subheading", type: "text" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "columns", label: "Columns", type: "select", options: COL_2_4 },
            { key: "verticalAlignment", label: "Vertical alignment", type: "select", options: VALIGN_OPTS },
          ]},
        ],
        repeater: { key: "badges", label: "Badges", itemLabel: "Badge", titleKey: "title", showActionEditor: true, fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "icon", label: "Icon", type: "icon" },
          { key: "desc", label: "Description", type: "text" },
        ]},
      };

    case "entry_cards":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "subheading", label: "Subheading", type: "text" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "columns", label: "Columns", type: "select", options: COL_1_4 },
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
        repeater: { key: "cards", label: "Cards", itemLabel: "Card", titleKey: "title", showActionEditor: true, fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "icon", label: "Icon", type: "icon" },
          { key: "desc", label: "Description", type: "textarea", rows: 3 },
          { key: "cta", label: "Button label", type: "text" },
        ]},
      };

    case "image":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "columns", label: "Columns", type: "select", options: COL_1_4 },
          ]},
          { id: "visibility", label: "Visibility", icon: visIcon, fields: [
            { key: "visibility", label: "Show section on page", type: "switch", defaultValue: true },
          ]},
        ],
        repeater: { key: "items", label: "Image Tiles", itemLabel: "Image", titleKey: "title", showActionEditor: true, fields: [
          { key: "image", label: "Image URL", type: "image", placeholder: "https://..." },
          { key: "title", label: "Title", type: "text" },
          { key: "subtitle", label: "Subtitle", type: "text" },
          { key: "colSpan", label: "Col span", type: "number", min: 1, max: 4, defaultValue: 1 },
          { key: "rowSpan", label: "Row span", type: "number", min: 1, max: 4, defaultValue: 1 },
          { key: "objectFit", label: "Object fit", type: "select", options: [
            { value: "cover", label: "Cover" }, { value: "contain", label: "Contain" }, { value: "fill", label: "Fill" },
          ]},
        ]},
      };

    case "carousel":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
          ]},
          { id: "settings", label: "Settings", icon: settingsIcon, fields: [
            { key: "autoplay", label: "Autoplay slides", type: "switch" },
          ]},
          { id: "visibility", label: "Visibility", icon: visIcon, fields: [
            { key: "visibility", label: "Show section on page", type: "switch", defaultValue: true },
          ]},
        ],
        repeater: { key: "slides", label: "Slides", itemLabel: "Slide", titleKey: "title", showActionEditor: true, fields: [
          { key: "image", label: "Image URL", type: "image", placeholder: "https://..." },
          { key: "title", label: "Title", type: "text" },
          { key: "subtitle", label: "Subtitle", type: "text" },
        ]},
      };

    case "social_proof":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "subheading", label: "Subheading", type: "text" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "columns", label: "Columns", type: "select", options: COL_2_4 },
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
        repeater: { key: "items", label: "Proof Items", itemLabel: "Item", titleKey: "label", fields: [
          { key: "label", label: "Label", type: "text" },
          { key: "value", label: "Value / Counter", type: "text" },
          { key: "icon", label: "Icon", type: "icon" },
        ]},
      };

    case "testimonials":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "subheading", label: "Subheading", type: "text" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "columns", label: "Columns", type: "select", options: COL_1_3 },
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
        repeater: { key: "items", label: "Testimonials", itemLabel: "Testimonial", titleKey: "name", fields: [
          { key: "name", label: "Customer name", type: "text" },
          { key: "rating", label: "Rating (1-5)", type: "number", min: 1, max: 5, defaultValue: 5 },
          { key: "quote", label: "Quote", type: "textarea", rows: 3 },
          { key: "avatar", label: "Avatar URL", type: "image", placeholder: "https://..." },
        ]},
      };

    case "gallery":
      return {
        groups: [
          { id: "content", label: "Content", icon: contentIcon, defaultOpen: true, fields: [
            { key: "heading", label: "Heading", type: "text" },
            { key: "subheading", label: "Subheading", type: "text" },
          ]},
          { id: "layout", label: "Layout", icon: layoutIcon, fields: [
            { key: "columns", label: "Columns", type: "select", options: COL_2_4 },
            { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTS },
          ]},
        ],
        repeater: { key: "images", label: "Images", itemLabel: "Image", titleKey: "caption", fields: [
          { key: "url", label: "Image URL", type: "image", placeholder: "https://..." },
          { key: "caption", label: "Caption", type: "text" },
          { key: "alt", label: "Alt text", type: "text" },
        ]},
      };

    default:
      return { groups: [] };
  }
}

// ─── Props ───────────────────────────────────────────────────────

interface BlockFieldGroupsProps {
  blockType: string;
  content: Record<string, unknown>;
  patchContent: (key: string, value: unknown) => void;
  repeaterItems: Record<string, unknown>[];
  patchItem: (index: number, patch: Record<string, unknown>) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  moveItem: (index: number, dir: -1 | 1) => void;
  compact?: boolean;
  pages?: string[];
}

// ─── Component ───────────────────────────────────────────────────

export default function BlockFieldGroups({
  blockType, content, patchContent,
  repeaterItems, patchItem, addItem, removeItem, moveItem,
  compact = false, pages = [],
}: BlockFieldGroupsProps) {
  const config = getBlockGroupConfig(blockType);
  const inputH = compact ? "h-8 text-xs" : "h-11";
  const labelCls = compact ? "text-[10px] uppercase tracking-wider text-muted-foreground" : "text-sm font-medium";

  // If no config found, render generic editor
  if (config.groups.length === 0 && !config.repeater) {
    return <GenericEditor content={content} patchContent={patchContent} compact={compact} />;
  }

  const defaultOpenGroups = config.groups.filter(g => g.defaultOpen).map(g => g.id);
  if (config.repeater) defaultOpenGroups.push("items");

  return (
    <Accordion type="multiple" defaultValue={defaultOpenGroups} className="space-y-1">
      {config.groups.map((group) => (
        <AccordionItem key={group.id} value={group.id} className="rounded-lg border border-border/40 px-3">
          <AccordionTrigger className="py-2.5 text-sm font-medium gap-2">
            <span className="flex items-center gap-2">
              {group.icon}
              {group.label}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            {group.fields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={content[field.key]}
                onChange={(v) => patchContent(field.key, v)}
                inputH={inputH}
                labelCls={labelCls}
                compact={compact}
              />
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}

      {config.repeater && (
        <AccordionItem value="items" className="rounded-lg border border-border/40 px-3">
          <AccordionTrigger className="py-2.5 text-sm font-medium gap-2">
            <span className="flex items-center gap-2">
              <LayoutGrid className="h-3.5 w-3.5" />
              {config.repeater.label}
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                {repeaterItems.length}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pb-3">
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" onClick={addItem} className={compact ? "h-6 gap-1 text-[10px]" : "h-8 gap-1 text-xs"}>
                <Plus className="h-3 w-3" /> Add {config.repeater.itemLabel.toLowerCase()}
              </Button>
            </div>

            <Accordion type="multiple" className="space-y-1">
              {repeaterItems.map((item, index) => (
                <RepeaterItemEditor
                  key={`${blockType}-item-${index}`}
                  item={item}
                  index={index}
                  total={repeaterItems.length}
                  config={config.repeater!}
                  patchItem={patchItem}
                  removeItem={removeItem}
                  moveItem={moveItem}
                  inputH={inputH}
                  labelCls={labelCls}
                  compact={compact}
                  pages={pages}
                />
              ))}
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}

// ─── Field Renderer ──────────────────────────────────────────────

function FieldRenderer({
  field, value, onChange, inputH, labelCls, compact,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  inputH: string;
  labelCls: string;
  compact: boolean;
}) {
  switch (field.type) {
    case "text":
    case "image":
      return (
        <div>
          <Label className={labelCls}>{field.label}</Label>
          <Input
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className={inputH}
            placeholder={field.placeholder}
          />
        </div>
      );

    case "textarea":
      return (
        <div>
          <Label className={labelCls}>{field.label}</Label>
          <Textarea
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            rows={field.rows ?? 3}
            className={compact ? "text-xs" : ""}
            placeholder={field.placeholder}
          />
        </div>
      );

    case "select":
      return (
        <div>
          <Label className={labelCls}>{field.label}</Label>
          <Select value={String(value ?? field.options?.[0]?.value ?? "")} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className={inputH}><SelectValue /></SelectTrigger>
            <SelectContent>
              {field.options?.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "switch":
      return (
        <div className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2">
          <p className={compact ? "text-xs font-medium" : "text-sm font-medium"}>{field.label}</p>
          <Switch
            checked={value !== undefined ? Boolean(value) : (field.defaultValue !== undefined ? Boolean(field.defaultValue) : true)}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      );

    case "number":
      return (
        <div>
          <Label className={labelCls}>{field.label}</Label>
          <Input
            type="number"
            min={field.min}
            max={field.max}
            value={Number(value ?? field.defaultValue ?? 0)}
            onChange={(e) => onChange(Number(e.target.value))}
            className={inputH}
          />
        </div>
      );

    case "datetime":
      return (
        <div>
          <Label className={labelCls}>{field.label}</Label>
          <Input
            type="datetime-local"
            value={value ? String(value).substring(0, 16) : ""}
            onChange={(e) => onChange(new Date(e.target.value).toISOString())}
            className={inputH}
          />
        </div>
      );

    case "icon":
      return (
        <div>
          <Label className={labelCls}>{field.label}</Label>
          <Select value={String(value || "Star")} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className={inputH}><SelectValue /></SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map((icon) => (
                <SelectItem key={icon} value={icon}>{icon}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    default:
      return null;
  }
}

// ─── Repeater Item Editor ────────────────────────────────────────

function RepeaterItemEditor({
  item, index, total, config,
  patchItem, removeItem, moveItem,
  inputH, labelCls, compact, pages,
}: {
  item: Record<string, unknown>;
  index: number;
  total: number;
  config: RepeaterFieldConfig;
  patchItem: (index: number, patch: Record<string, unknown>) => void;
  removeItem: (index: number) => void;
  moveItem: (index: number, dir: -1 | 1) => void;
  inputH: string;
  labelCls: string;
  compact: boolean;
  pages: string[];
}) {
  const titleValue = String(item[config.titleKey] || `${config.itemLabel} ${index + 1}`);
  const btnH = compact ? "h-6 text-[10px]" : "h-8 text-xs";

  return (
    <AccordionItem value={`item-${index}`} className="rounded-md border border-border/30 px-2">
      <AccordionTrigger className={compact ? "py-2 text-[11px]" : "py-3 text-left text-sm"}>
        {titleValue}
      </AccordionTrigger>
      <AccordionContent className="space-y-3 pb-3">
        {config.fields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={item[field.key]}
            onChange={(v) => patchItem(index, { [field.key]: v })}
            inputH={inputH}
            labelCls={labelCls}
            compact={compact}
          />
        ))}

        {config.showActionEditor && (
          <ActionEditor
            item={item}
            index={index}
            patchItem={patchItem}
            inputH={inputH}
            labelCls={labelCls}
            compact={compact}
            pages={pages}
          />
        )}

        {/* Visible toggle */}
        <div className="flex items-center justify-between rounded-md border border-border/30 px-3 py-2">
          <div>
            <p className={compact ? "text-xs font-medium" : "text-sm font-medium"}>Visible</p>
            <p className="text-[10px] text-muted-foreground">Hide without deleting</p>
          </div>
          <Switch
            checked={item.visible !== false}
            onCheckedChange={(checked) => patchItem(index, { visible: checked })}
          />
        </div>

        {/* Move / Delete */}
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => moveItem(index, -1)} disabled={index === 0} className={btnH}>
            <ArrowUp className="mr-1 h-3 w-3" /> Up
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => moveItem(index, 1)} disabled={index === total - 1} className={btnH}>
            <ArrowDown className="mr-1 h-3 w-3" /> Down
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={() => removeItem(index)} className={`ml-auto ${btnH}`}>
            <Trash2 className="mr-1 h-3 w-3" /> Delete
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Action Editor ───────────────────────────────────────────────

function ActionEditor({
  item, index, patchItem, inputH, labelCls, compact, pages,
}: {
  item: Record<string, unknown>;
  index: number;
  patchItem: (index: number, patch: Record<string, unknown>) => void;
  inputH: string;
  labelCls: string;
  compact: boolean;
  pages: string[];
}) {
  const actionType = String(item.actionType || "none");
  const [products, setProducts] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [pageForAnchors, setPageForAnchors] = useState<string>(String(item.actionTarget || ""));
  const [pageAnchors, setPageAnchors] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await (supabase as any).from("products").select("id,title,slug").order("title");
        if (!mounted) return;
        setProducts((data || []) as any);
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const pg = pageForAnchors || String(item.actionTarget || "");
    if (!pg) return;
    (async () => {
      try {
        const slug = pg.replace(/^\//, "").replace(/^home$/, "");
        const { data } = await (supabase as any).from("site_blocks").select("id,content").eq("page", slug || "home");
        if (!mounted || !data) return;
        const anchors = (data as any[])
          .map((r) => (r.content && (r.content.anchorId || r.content.anchor)) || `section-${r.id}`)
          .filter(Boolean);
        setPageAnchors(Array.from(new Set(anchors)));
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [pageForAnchors]);

  return (
    <div className="space-y-2 rounded-md border border-border/30 p-2.5">
      <div>
        <Label className={labelCls}>Click action</Label>
        <Select value={actionType} onValueChange={(v) => patchItem(index, { actionType: v })}>
          <SelectTrigger className={inputH}><SelectValue placeholder="Select action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No action</SelectItem>
            <SelectItem value="internal_link">Internal page</SelectItem>
            <SelectItem value="external_link">External URL</SelectItem>
            <SelectItem value="anchor">Section on this page</SelectItem>
            <SelectItem value="page_anchor">Section on another page</SelectItem>
            <SelectItem value="product">Product page</SelectItem>
            <SelectItem value="product_anchor">Product page + section</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {actionType === "internal_link" && (
        <div>
          <Label className={labelCls}>Target page</Label>
          <Select value={String(item.actionTarget || "")} onValueChange={(v) => patchItem(index, { actionTarget: v })}>
            <SelectTrigger className={inputH}><SelectValue placeholder="Choose page" /></SelectTrigger>
            <SelectContent>
              {pages.map((page) => (
                <SelectItem key={page} value={page}>{page}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {actionType === "anchor" && (
        <div>
          <Label className={labelCls}>Anchor ID (same page)</Label>
          <div className="flex gap-2">
            <Input value={String(item.actionTarget || item.anchorId || "")} onChange={(e) => patchItem(index, { anchorId: e.target.value, actionTarget: `#${e.target.value}` })} className={inputH} placeholder="e.g. about-section" />
            <Button type="button" variant="ghost" size="icon" onClick={() => { /* keep simple */ }} title="Pick from page">
              <Link2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {actionType === "page_anchor" && (
        <div>
          <Label className={labelCls}>Target page</Label>
          <div className="flex gap-2">
            <AdminPageSelect label="Page" value={String(item.actionTarget || "")} onChange={(v) => { patchItem(index, { actionTarget: v }); setPageForAnchors(v); }} />
          </div>
          <div className="mt-2">
            <Label className={labelCls}>Section on page (anchor)</Label>
            <Select value={String(item.anchorId || item.actionAnchor || "")} onValueChange={(v) => patchItem(index, { anchorId: v })}>
              <SelectTrigger className={inputH}><SelectValue placeholder="Choose section or enter id" /></SelectTrigger>
              <SelectContent>
                {pageAnchors.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                <SelectItem value="__custom__">Enter custom...</SelectItem>
              </SelectContent>
            </Select>
            {String(item.anchorId || "") === "__custom__" && (
              <Input className="mt-2" value={String(item.actionAnchor || "")} onChange={(e) => patchItem(index, { actionAnchor: e.target.value, anchorId: e.target.value })} />
            )}
          </div>
        </div>
      )}

      {actionType === "external_link" && (
        <div>
          <Label className={labelCls}>External URL</Label>
          <Input
            value={String(item.actionTarget || "")}
            onChange={(e) => patchItem(index, { actionTarget: e.target.value })}
            className={inputH}
            placeholder="https://..."
          />
        </div>
      )}

      {actionType === "product" && (
        <div>
          <Label className={labelCls}>Product</Label>
          <Select value={String(item.actionTarget || "")} onValueChange={(v) => patchItem(index, { actionTarget: v })}>
            <SelectTrigger className={inputH}><SelectValue placeholder="Choose product" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => (<SelectItem key={p.id} value={p.slug}>{p.title}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}

      {actionType === "product_anchor" && (
        <div>
          <Label className={labelCls}>Product</Label>
          <Select value={String(item.actionTarget || "")} onValueChange={(v) => patchItem(index, { actionTarget: v })}>
            <SelectTrigger className={inputH}><SelectValue placeholder="Choose product" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => (<SelectItem key={p.id} value={p.slug}>{p.title}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="mt-2">
            <Label className={labelCls}>Anchor on product page</Label>
            <Input value={String(item.anchorId || "")} onChange={(e) => patchItem(index, { anchorId: e.target.value })} className={inputH} placeholder="e.g. specs" />
          </div>
        </div>
      )}

      {actionType !== "none" && (
        <div className="flex items-center justify-between rounded-md border border-border/30 px-3 py-2">
          <p className={compact ? "text-xs" : "text-sm"}>Open in new tab</p>
          <Switch
            checked={Boolean(item.openInNewTab)}
            onCheckedChange={(checked) => patchItem(index, { openInNewTab: checked })}
          />
        </div>
      )}
    </div>
  );
}

// ─── Generic Editor (fallback for unknown blocks) ────────────────

function GenericEditor({
  content, patchContent, compact,
}: {
  content: Record<string, unknown>;
  patchContent: (key: string, value: unknown) => void;
  compact: boolean;
}) {
  const inputH = compact ? "h-8 text-xs" : "h-11";

  return (
    <div className="space-y-3">
      {Object.entries(content).map(([key, value]) => {
        if (Array.isArray(value) || key.startsWith("_")) return null;
        if (typeof value === "boolean") {
          return (
            <div key={key} className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2">
              <p className="text-sm font-medium capitalize">{key.replace(/_/g, " ")}</p>
              <Switch checked={value} onCheckedChange={(checked) => patchContent(key, checked)} />
            </div>
          );
        }
        if (typeof value === "string" && value.length > 100) {
          return (
            <div key={key}>
              <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
              <Textarea value={value} onChange={(e) => patchContent(key, e.target.value)} rows={4} />
            </div>
          );
        }
        if (typeof value === "object") return null;
        return (
          <div key={key}>
            <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
            <Input value={String(value ?? "")} onChange={(e) => patchContent(key, e.target.value)} className={inputH} />
          </div>
        );
      })}
    </div>
  );
}
