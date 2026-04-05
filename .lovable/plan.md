

## Complete Page Editor — Remaining Gaps & Polish

### Current State (Already Working)

After thorough analysis, the system is far more complete than the request implies:

- **27 block types** all have renderers, editable schemas, field group configs, icons, colors, and default content
- **Global sections**: header, footer, and 6 global slots (above/below header, before/after content, above/below footer) with auto-creation
- **Background editor**: full side-by-side layout with live preview, all visual controls
- **Draft/publish/schedule** workflow with undo/redo, unsaved warnings, keyboard shortcuts
- **Desktop/tablet/mobile** viewport toggle
- **Categorized Add Block dialog** with search and descriptions
- **Element-level selection** with inline editing
- **Unified layout ordering** for static + dynamic blocks with drag-and-drop

### Actual Remaining Gaps

#### 1. SettingsPanel ContentEditor doesn't use BlockFieldGroups
The `SettingsPanel.tsx` (1082 lines) has its own `ContentEditor` function with ~700 lines of per-block rendering that duplicates `BlockFieldGroups.tsx`. The BlockEditorPanel already uses BlockFieldGroups cleanly.

**Fix**: Replace `ContentEditor` internals in SettingsPanel with `<BlockFieldGroups>` (same as BlockEditorPanel does), keeping the element-selection integration and hero-button special case.

#### 2. Missing block types in BLOCK_TYPES list
`VisualEditorContext.tsx` line 131 lists only 20 block types in `BLOCK_TYPES` — missing: `social_proof`, `testimonials`, `gallery`, `recently_viewed`, `gift_finder`, `countdown`, `divider`. These can be added via AddBlockDialog (which has them) but `addBlock()` uses `BLOCK_TYPES` for label lookup, falling back to raw type name.

**Fix**: Add the 7 missing entries to `BLOCK_TYPES`.

#### 3. SettingsPanel responsive/style tabs redundancy
The SettingsPanel has `ResponsiveEditor` and `AdvancedStyleEditor` components (~400 lines) with hardcoded per-block logic that could be streamlined.

**Fix**: Clean up unused branches, ensure all block types get proper style/responsive controls.

#### 4. Preview click-to-select for global sections
EditorCanvas renders global section blocks identically to page blocks, but global section preview doesn't show the page's actual header/footer context.

**Fix**: Minor — the canvas already works for global pages. No structural change needed, just ensure global blocks render correctly in preview (they do).

### Changes

#### File 1: `src/contexts/VisualEditorContext.tsx`
- Add 7 missing entries to `BLOCK_TYPES`: social_proof, testimonials, gallery, recently_viewed, gift_finder, countdown, divider

#### File 2: `src/components/admin/editor/SettingsPanel.tsx`
- Replace `ContentEditor` function (~700 lines) with `<BlockFieldGroups>` usage
- Keep element-selection overlay and hero buttons special case
- Keep existing tabs (Content, Style, Border, Device, More) structure
- Reduce file from ~1082 lines to ~600 lines

### What Does NOT Need Changing

| Area | Status |
|------|--------|
| BlockRenderer.tsx | All 27 blocks render correctly |
| BlockFieldGroups.tsx | All block configs present |
| editable-schema.ts | All block schemas defined |
| AddBlockDialog.tsx | Categorized with all blocks |
| LayersPanel.tsx | Icons/colors for all blocks |
| EditorToolbar.tsx | Global slots, background button, viewport toggle |
| VisualEditor.tsx | Background editor integrated |
| EditorCanvas.tsx | Unified layout, drag-and-drop, click-to-select |
| PageBackgroundEditor.tsx | Side-by-side live preview |
| Draft/publish workflow | Fully implemented |
| Undo/redo | Working |

### Files

| File | Action |
|------|--------|
| `src/contexts/VisualEditorContext.tsx` | Add 7 missing block types to BLOCK_TYPES |
| `src/components/admin/editor/SettingsPanel.tsx` | Replace ContentEditor with BlockFieldGroups, reduce ~400 lines |

### Technical Notes
- No database changes
- No new dependencies
- Consolidates duplicate code between two editor systems
- All existing functionality preserved

