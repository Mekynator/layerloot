

## Redesign Page Editor Settings UI

### Problem
Both editor panels (`BlockEditorPanel.tsx` at 1362 lines and `SettingsPanel.tsx` at 1008 lines) contain massive per-block render functions with flat, ungrouped fields. `BlockEditorPanel` has no tabs or sections — just one long scrolling form. Fields are inconsistently ordered across block types.

### Architecture

Extract a shared `BlockFieldGroups` component that both panels use. This component takes a block type + content and renders fields organized into standard collapsible groups. Each block type declares which groups it uses via a config map.

```text
BlockFieldGroups
├── Content group (heading, subheading, body text)
├── Media group (images, videos, backgrounds)
├── Buttons / Links group (CTAs, actions)
├── Data Source group (product source, category source, limits)
├── Layout group (columns, alignment, layout mode)
├── Repeater Items group (FAQ items, badges, slides, etc.)
└── Visibility group (active, visible toggles)
```

### Changes

#### 1. New shared component: `src/components/admin/editor/BlockFieldGroups.tsx`

A single reusable component that renders organized, collapsible accordion sections for any block type. It uses the existing `editable-schema.ts` to know which nodes exist, plus a new config map that assigns each field to a group.

- **Content**: text nodes (heading, subheading, body, eyebrow, caption, etc.)
- **Media**: media nodes (bg_image, poster_image, image uploads)
- **Buttons & Links**: button text/link pairs, action editors, CTA fields
- **Data Source**: product source, category source, limits, filters (block-specific)
- **Layout**: alignment, columns, layout mode, vertical alignment, width
- **Items**: repeater section (FAQ items, badges, cards, slides, testimonials, gallery images)
- **Visibility**: active toggle, section visibility, anchor ID

Each group is a collapsible `AccordionItem`. Groups with no applicable fields are hidden. The "Content" group defaults open; others collapsed.

#### 2. Refactor `BlockEditorPanel.tsx`

Replace all 19 `render*Editor()` functions (~900 lines) with a single `<BlockFieldGroups>` call. Keep the Sheet wrapper, block header (title + active toggle), and save button.

**New block header**: Shows block type badge, title input, active/inactive toggle, and save button in a compact sticky header area.

**Before**: 1362 lines with 19 render functions
**After**: ~200 lines — Sheet + header + `<BlockFieldGroups>` + save

#### 3. Refactor `SettingsPanel.tsx` ContentEditor

Replace the `ContentEditor` function's schema-driven rendering + block-specific cases (~400 lines) with the same `<BlockFieldGroups>` component (content-only mode, since Style/Border/Device/More tabs already exist in SettingsPanel).

#### 4. Field group config per block type

A simple config object mapping block types to their group overrides:

```typescript
const BLOCK_GROUP_CONFIG: Record<string, GroupConfig> = {
  hero: {
    content: ["eyebrow", "heading", "subheading"],
    media: ["bg_image"],
    buttons: ["buttons"], // special hero buttons array
    layout: ["alignment", "buttonAlignment", "verticalAlignment"],
    dataSource: [],
    extra: [{ key: "overlayOpacity", type: "slider", min: 0, max: 100 }],
  },
  featured_products: {
    content: ["heading", "subheading", "view_all_text", "view_all_link"],
    dataSource: ["productSource", "limit", "tileShowTitle", "tileShowSubtitle"],
    layout: ["alignment", "tileLayoutMode", "tileGridColumns"],
  },
  // ... etc for each block type
};
```

Fields not in any group fall to a generic "Advanced" accordion at the bottom.

### Files

| File | Action |
|------|--------|
| `src/components/admin/editor/BlockFieldGroups.tsx` | **New** — shared grouped field renderer |
| `src/components/admin/BlockEditorPanel.tsx` | **Refactor** — replace 19 render functions with BlockFieldGroups |
| `src/components/admin/editor/SettingsPanel.tsx` | **Refactor** — replace ContentEditor internals with BlockFieldGroups |

### Technical Notes
- No database changes
- No new dependencies — uses existing Accordion, Input, Select, Switch, Slider components
- Existing `editable-schema.ts` is used as the field registry; the new config adds grouping metadata on top
- All current editing capabilities preserved — just reorganized into collapsible groups
- Desktop behavior unchanged; the grouped layout actually helps on smaller admin screens too

