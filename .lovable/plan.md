

## LayerLoot: Final Admin Migration & Public App Cleanup

### Current State Assessment

**Public LayerLoot app (this project):**
- `App.tsx` is already clean — only storefront routes, no admin routes
- However, ~50 admin page files remain in `src/pages/admin/`
- ~40+ admin component files remain in `src/components/admin/`
- Some admin components are **legitimately used by the storefront** (shared rendering utilities):
  - `BlockRenderer.tsx` — used by 10+ storefront pages/components for CMS block rendering
  - `NavLinkEditor.tsx` — exports `useNavLinks` and `useFooterNavLinks` used by Header/Footer
  - `PageBackgroundEditor.tsx` — exports type definitions used by `PageBackgroundSlideshow`
- The admin pages/routes are already unreachable (not in `App.tsx`), but the files still exist

**Admin Studio ([Admin Layerloot](/projects/4e63a586-cdcf-4507-a677-b399efb6e145)):**
- Has basic admin routes but is still using an older/simpler set of admin pages (16 pages vs 50+ in this project)
- Missing many modules that exist in this public project: Analytics, AI Tools, Campaigns, Rewards, Backgrounds, Automations, Design System, Financial, etc.

### Plan

#### Phase 1: Extract shared storefront utilities from `src/components/admin/`

Move the storefront-consumed exports out of the `admin` directory so the public app no longer imports from `@/components/admin/`:

1. **Create `src/lib/block-renderer.ts`** — Move the `SiteBlock` type and `renderBlock` function from `BlockRenderer.tsx` into a dedicated storefront-safe module. Update all 10+ storefront imports.

2. **Create `src/hooks/use-nav-links.ts`** — Extract `useNavLinks`, `useFooterNavLinks`, and related types/defaults from `NavLinkEditor.tsx`. Update Header and Footer imports.

3. **Create `src/lib/page-background-types.ts`** — Extract the type exports (`PageBackgroundSettings`, `BackgroundSizeMode`, etc.) from `PageBackgroundEditor.tsx`. Update `PageBackgroundSlideshow` import.

#### Phase 2: Remove dead admin files from the public app

After Phase 1 decouples storefront code from admin components:

1. **Delete all files in `src/pages/admin/`** — These are unreachable (no routes point to them). All 50+ files.

2. **Delete admin-only components from `src/components/admin/`** — Remove everything except the files that still export storefront-consumed code (which will be empty after Phase 1). This includes:
   - `AdminLayout.tsx`, `AdminStudioLayout.tsx`, `AdminStudioShell.tsx`, `AdminShell.tsx`
   - `AdminRoute.tsx`, `AdminPageShell.tsx`, `AdminColorPicker.tsx`
   - `AdminPageSelect.tsx`, `AdminPageMultiSelect.tsx`
   - All editor/, dashboard/, campaigns/, declaration/, media/, reusable/, translations/, funnel/, shared/ subdirectories
   - All remaining admin-only components (DraftActionBar, InlineEditor, RevisionHistoryPanel, etc.)

3. **Clean up orphaned imports** in hooks like `use-draft-publish.ts` — redirect `SiteBlock` type import to the new location.

#### Phase 3: Copy critical missing modules to Admin Studio

Use `cross_project--copy_project_asset` to copy the 30+ admin pages and components that don't exist yet in the Admin Studio, including:

- Pages: `AdminAnalytics`, `AdminAutomations`, `AdminBackgrounds`, `AdminCampaigns`, `AdminChat`, `AdminChatAnalytics`, `AdminChatSettings`, `AdminDeclaration`, `AdminDesignSystem`, `AdminEmailLogs`, `AdminGrowth`, `AdminInstagram`, `AdminMedia`, `AdminPersonalization`, `AdminPricing`, `AdminReferrals`, `AdminReports`, `AdminRevenue`, `AdminTranslations`, `FinancialWorkspace`, `VisualEditor`, `EditorWorkspace`, `ABTestingDashboard`, `AIInsightsDashboard`, `UsersWorkspace`
- Components: `dashboard/*`, `editor/*`, `campaigns/*`, `declaration/*`, `media/*`, `reusable/*`, `translations/*`, `shared/*`
- Supporting files: `AdminPageShell.tsx`, `DraftActionBar.tsx`, `RevisionHistoryPanel.tsx`, `AdminColorPicker.tsx`, etc.

#### Phase 4: Verify build stability

- Run TypeScript compilation check on the public app after all removals
- Fix any broken references
- Ensure no admin imports remain in storefront code

### Summary of Changes

| Area | Action |
|---|---|
| `src/lib/block-renderer.ts` | New — storefront block rendering extracted from admin |
| `src/hooks/use-nav-links.ts` | New — nav link hooks extracted from NavLinkEditor |
| `src/lib/page-background-types.ts` | New — type exports extracted from PageBackgroundEditor |
| `src/pages/admin/*` (50 files) | Delete — unreachable from public routes |
| `src/components/admin/*` (40+ files) | Delete — admin-only, no longer needed |
| 10+ storefront files | Update imports to use new extracted locations |
| Admin Studio project | Receive ~30 missing admin modules via copy |

### Risks & Mitigations

- **BlockRenderer is 2845 lines** — extracting only the `SiteBlock` type and `renderBlock` export keeps it in the public app initially; the full file stays until we confirm no storefront code uses admin-only parts of it. If storefront rendering depends on the full file, we keep `BlockRenderer.tsx` in place but move it to `src/components/blocks/` instead.
- **NavLinkEditor** has both storefront hooks and admin UI — clean split into two files.
- **Draft/publish hooks** (`use-draft-publish.ts`) are admin-side but exist in `src/hooks/` — these stay for now since Admin Studio will need equivalent logic, and they don't affect storefront weight if tree-shaken.

