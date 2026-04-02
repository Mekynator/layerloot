

# Mega Menu Navigation System

## Current State
- Header renders flat nav links from `site_settings.nav_links` via `useNavLinks()` hook
- Each nav item is a simple `{label, to, source, pageId, visible}` — no dropdown config
- Categories table exists with `parent_id` for hierarchy, products have `category_id`
- MiniCart already demonstrates the hover-open/delay-close pattern to reuse
- No mega menu, no dropdown content, no featured products in nav

## Plan

### 1. Extend NavItem Data Model (No DB Migration)
Nav items are stored as JSON in `site_settings.nav_links`. Extend the `NavItem` type to include optional mega menu config:

```ts
interface NavItem {
  // existing fields...
  megaMenu?: {
    enabled: boolean;
    layout: "categories" | "featured" | "full"; // which columns to show
    featuredProductIds?: string[];  // admin-selected products (up to 4)
    bannerImageUrl?: string;
    bannerLink?: string;
    bannerText?: string;
    showCategories?: boolean;
    showNewArrivals?: boolean;
    showBestSellers?: boolean;
  };
}
```

No migration needed — this is JSONB stored in `site_settings`.

### 2. New Component: `MegaMenuDropdown.tsx`
Single component handling the hover mega menu panel for a nav item.

**Hover logic**: Same pattern as MiniCart — `onMouseEnter`/`onMouseLeave` with 250ms close delay, `AnimatePresence` fade+slide animation.

**Layout** (3-column grid inside a full-width dropdown below header):
- **Left column**: Categories list from `categories` table (with subcategories indented). Hovering a category shows its products in the center column.
- **Center column**: 2–4 product cards (image + name + price). Source: admin-selected `featuredProductIds`, or auto-populated from featured/newest products in that category.
- **Right column**: Promotional banner (admin-uploaded image), CTA button, quick action links ("Shop All", "Best Sellers", "New Arrivals").

**Campaign integration**: If an active campaign exists (from `useActiveCampaign`), apply campaign theme colors to the mega menu border/accent and optionally swap the banner.

**Data fetching**: Use `useQuery` with `staleTime: 5min` to lazy-load categories + featured products. Only fetch when dropdown opens (enabled by `enabled: open` in query options).

**Mobile**: On mobile, mega menu items render as accordion sections inside the existing mobile nav panel — categories expand/collapse, no hover behavior.

### 3. Modify `Header.tsx`
- Replace the flat `<Link>` desktop nav loop with a new loop that wraps each link in a `MegaMenuDropdown` container (only if `megaMenu?.enabled`)
- Non-mega items remain as plain links
- Add a full-width dropdown container positioned below the header bar using `absolute` positioning

### 4. Extend `NavLinkEditor.tsx` (Admin Control)
Add a collapsible "Mega Menu Settings" section per nav item when editing:
- Toggle: "Enable Mega Menu"
- Layout selector (categories / featured / full)
- Product picker: search products, select up to 4 featured products
- Banner image upload (using existing `ImageUploadField`)
- Banner link + CTA text inputs
- Toggles: show categories, show new arrivals, show best sellers

### 5. Product Preview on Category Hover
Inside the mega menu left column, hovering a category name triggers a query (or filters pre-loaded products) to show 2–3 product thumbnails in the center column. Uses the same delayed-hover pattern.

### Files Changed

| File | Change |
|------|--------|
| `src/components/layout/MegaMenuDropdown.tsx` | **New** — mega menu panel with 3-column layout, hover logic, lazy data loading |
| `src/components/layout/Header.tsx` | Wrap desktop nav items with MegaMenuDropdown when enabled |
| `src/components/admin/NavLinkEditor.tsx` | Add mega menu config fields per nav item |
| `src/components/admin/NavLinkEditor.tsx` types | Extend `NavItem` / `NavEditorItem` with `megaMenu` field |

### Deferred
- Campaign-specific nav banner swaps (requires campaign → nav mapping)
- Analytics tracking on mega menu interactions
- Keyboard navigation / accessibility for mega menu

