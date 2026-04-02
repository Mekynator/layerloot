

# Global Website Background Editor — Per-Page + Slideshow System

## Current State
- A global background slideshow already exists (`PageBackgroundEditor.tsx` + `PageBackgroundSlideshow.tsx`)
- It stores settings under `site_settings` key `page_background_global`
- Supports: enable/disable, multi-image upload, opacity, blur, interval, size mode, position, overlay opacity
- Renders as a fixed `z-0` layer in `Layout.tsx` behind all content
- Missing: per-page overrides, advanced effects (brightness/contrast/saturation/blend/vignette), transition types, attachment modes, campaign/seasonal scheduling, dedicated admin page

## Architecture

Expand the single `page_background_global` key into a multi-key system:
- `page_background_global` — default background for all pages (existing, extended)
- `page_background_override_{pageName}` — per-page overrides (e.g. `page_background_override_products`)
- Each override stores: `{ mode: "inherit" | "custom" | "disabled", ...fullSettings }`

The `PageBackgroundSlideshow` component reads the current route, checks for a page-specific override, falls back to global.

## Implementation Plan

### 1. Extend the settings type
Add to `PageBackgroundSettings`:
- `brightness` (0–200, default 100)
- `contrast` (0–200, default 100)
- `saturation` (0–200, default 100)
- `transitionType` ("fade" | "slide" | "zoom" | "crossfade" | "kenBurns", default "fade")
- `transitionDurationMs` (200–3000, default 1200)
- `attachment` ("scroll" | "fixed", default "fixed")
- `autoplay` (boolean, default true)
- `loop` (boolean, default true)
- `randomOrder` (boolean, default false)
- `colorOverlay` (hex string, default "")
- `colorOverlayOpacity` (0–1, default 0)
- `gradientStart` / `gradientEnd` (hex strings)
- `gradientOpacity` (0–1, default 0)
- `blendMode` ("normal" | "multiply" | "screen" | "overlay", default "normal")
- `motionEffect` ("none" | "slowZoom" | "kenBurns" | "drift", default "slowZoom")
- `motionSpeed` (2–60s, default 12)

Update `normalizeSettings()` to handle all new fields with backwards-compatible defaults.

### 2. Create dedicated admin page: Website Backgrounds
New file `src/pages/admin/AdminBackgrounds.tsx` — a full admin page (not a dialog) with:

**Page selector** at the top: dropdown to pick "Global (All Pages)" or a specific page (home, products, about, contact, gallery, create-your-own, submit-design, account, cart, policies, etc.)

**Per-page mode selector**: Inherit Global / Custom / Disabled

**When Custom is selected**, show the full editor (migrated from the existing dialog):
- Image upload area with drag-and-drop, thumbnails, reorder, remove
- Live preview window with play/pause and slide indicators
- Visual Settings section: opacity, blur, brightness, contrast, saturation sliders
- Overlay section: dark overlay, color overlay + opacity, gradient overlay (start/end/opacity), blend mode
- Timing section: autoplay toggle, interval, transition duration, transition type dropdown, loop, random order
- Size & Position section: size mode, position, attachment (fixed/scroll)
- Motion section: motion effect dropdown, motion speed slider

**Copy/Reset buttons**: "Copy Global to This Page", "Reset to Inherit"

### 3. Update PageBackgroundSlideshow component
- Accept current pathname from `useLocation()`
- Map pathname to page key (e.g. `/products` → `products`, `/` → `home`)
- Fetch both global and page-specific settings
- If page override exists and mode is "custom", use it; if "disabled", show nothing; if "inherit" or missing, use global
- Apply new CSS filters: `brightness()`, `contrast()`, `saturate()`
- Apply color/gradient overlays as additional `<div>` layers
- Apply `blendMode` via `mixBlendMode` CSS
- Support transition types by varying the CSS transition/animation
- Support `attachment: "scroll"` by switching from `fixed` to `absolute` positioning

### 4. Add route and sidebar entry
- Add route in `App.tsx`: `/admin/backgrounds` → `AdminBackgrounds`
- Add to admin sidebar/dashboard shortcuts as "Backgrounds"

### 5. Remove old dialog trigger
- The existing `PageBackgroundEditor` dialog can remain as a shared component but the primary access point becomes the new full admin page

## Files to create
| File | Purpose |
|---|---|
| `src/pages/admin/AdminBackgrounds.tsx` | Full admin page for background management with page selector and all controls |

## Files to modify
| File | Change |
|---|---|
| `src/components/admin/PageBackgroundEditor.tsx` | Extend `PageBackgroundSettings` type and `normalizeSettings` with new fields |
| `src/components/layout/PageBackgroundSlideshow.tsx` | Route-aware loading, per-page override resolution, new CSS filters/effects |
| `src/App.tsx` | Add `/admin/backgrounds` route |
| `src/components/admin/AdminLayout.tsx` | Add "Backgrounds" to default sidebar config |
| `src/pages/admin/Dashboard.tsx` | Add "Backgrounds" to default shortcuts |

## No database changes needed
Uses existing `site_settings` table with new keys per page.

