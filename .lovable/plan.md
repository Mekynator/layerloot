

## Fix Background Editor Preview — Side-by-Side Layout with Live Updates

### Problem
The `PageBackgroundEditor` currently renders inside a `<Dialog>` modal that covers the entire screen. The small inline preview (h-48 div) doesn't accurately represent the real page. There's no way to see changes reflected on the actual editor canvas, and the preview disappears when scrolling through settings.

### Solution
Replace the Dialog-based layout with a **Sheet panel** (sliding from the right) that coexists with the editor canvas, OR convert the background editor into a **side-by-side split layout** where settings scroll on the left and a sticky live preview sits on the right within the same dialog.

Given the existing architecture (background editor opens from the VisualEditor toolbar), the cleanest approach is:

**Convert the Dialog into a full-height Sheet/panel that replaces the SettingsPanel area temporarily**, keeping the editor canvas visible as the live preview. This way the actual page preview in `EditorCanvas` serves as the real-time preview.

However, the canvas preview (iframe) won't reflect unsaved background changes since `PageBackgroundSlideshow` reads from the database. So the better approach is:

**Redesign the Dialog into a two-column layout with a large sticky preview panel on the right.**

### Changes

#### 1. Redesign `PageBackgroundEditor` layout
**File:** `src/components/admin/PageBackgroundEditor.tsx`

- Change `DialogContent` from `sm:max-w-3xl` to `sm:max-w-6xl` (or `max-w-[90vw]`) to give room for side-by-side.
- Split interior into two columns: left = scrollable settings form, right = sticky live preview.
- Move the existing preview div from inline (between settings) to a **sticky right column** that stays visible while scrolling.
- Make the right preview column take ~45% width and render at a taller aspect ratio (e.g., h-[60vh]) to better simulate the real page.
- Apply ALL form settings to the preview: opacity, blur, brightness, contrast, saturation, blend mode, color overlay, gradient overlay, motion effect — the current preview only uses opacity, blur, position, and size.
- Add desktop/mobile toggle buttons on the preview panel (mobile = narrower preview container width).

#### 2. Fix preview to reflect ALL settings
**File:** `src/components/admin/PageBackgroundEditor.tsx`

Currently the inline preview only applies `opacity`, `blur`, `backgroundPosition`, and `sizeCSS`. Missing from preview:
- `brightness` / `contrast` / `saturation` → add to `filter` string
- `blendMode` → add `mixBlendMode`
- `colorOverlay` + `colorOverlayOpacity` → already has dark overlay, add color overlay div
- `gradientStart` / `gradientEnd` / `gradientOpacity` → add gradient overlay div
- `motionEffect` → add CSS animation
- `transitionDurationMs` → use in opacity transition

Update the preview rendering to match `PageBackgroundSlideshow.tsx` exactly.

#### 3. Make settings form more compact for side-by-side
- Keep all existing controls but ensure they fit well in a ~55% width left column.
- The left column scrolls independently with `overflow-y-auto`.
- The right preview column uses `sticky top-0` positioning.

### Layout Structure
```text
┌─────────────────────────────────────────────────────┐
│ Dialog (max-w-6xl, h-[85vh])                        │
│ ┌──────────────────────┬───────────────────────────┐ │
│ │ Settings (scroll)    │ Preview (sticky)          │ │
│ │                      │                           │ │
│ │ Enable toggle        │  ┌─────────────────────┐  │ │
│ │ Images manager       │  │                     │  │ │
│ │ Visual settings      │  │  Live background    │  │ │
│ │ Size & position      │  │  with all effects   │  │ │
│ │ Effects controls     │  │                     │  │ │
│ │ Save button          │  │  [Desktop] [Mobile] │  │ │
│ │                      │  └─────────────────────┘  │ │
│ └──────────────────────┴───────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Files

| File | Action |
|------|--------|
| `src/components/admin/PageBackgroundEditor.tsx` | Redesign to two-column layout with sticky preview, fix preview to reflect all settings |

### Technical Notes
- No database changes
- No new dependencies
- Reuses existing Dialog/Slider/Select/Switch components
- Preview accuracy matches `PageBackgroundSlideshow.tsx` rendering logic
- Desktop/mobile preview toggle is purely a CSS width change on the preview container

