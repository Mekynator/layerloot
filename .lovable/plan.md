

# Translation Management System & Multilingual CMS

## Current State
- 5 locale files (en, da, de, es, ro) with ~575 keys each for static UI text
- `tr()` helper resolves multilingual objects `{ en: "...", da: "..." }` in CMS content
- `ai_translations` table exists but is unused in frontend code
- CMS blocks store content as JSON — some fields already use multilingual objects
- Draft/publish system operates on `content` / `draft_content` columns with no locale dimension
- No admin UI for managing translations

## Architecture

### Data Model
CMS content already supports multilingual via `tr()` — block content fields can be `string` or `{ en: "...", da: "..." }`. The system needs:

1. **`translation_entries` table** — central registry for static UI translation keys (mirrors locale JSON files but allows DB-backed admin editing with draft/publish)
2. Extend `ai_translations` table with `status`, `is_published`, `draft_text`, `source_hash` fields for tracking staleness and draft state
3. No schema changes to `site_blocks` or `site_settings` — locale data lives inside the existing JSON content fields

### Database Migration

```sql
-- Translation entries for static UI keys (database-backed locale management)
CREATE TABLE public.translation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace text NOT NULL DEFAULT 'common',
  key text NOT NULL,
  locale text NOT NULL,
  value text NOT NULL DEFAULT '',
  draft_value text,
  has_draft boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  source_hash text,
  status text NOT NULL DEFAULT 'published', -- published, draft, missing, outdated
  updated_by uuid,
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (namespace, key, locale)
);
ALTER TABLE public.translation_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage translations" ON public.translation_entries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Public read published translations" ON public.translation_entries
  FOR SELECT TO public USING (is_published = true AND has_draft = false);

CREATE TRIGGER set_translation_entries_updated_at
  BEFORE UPDATE ON public.translation_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed translations.manage permission
INSERT INTO public.admin_permissions (role, permission) VALUES
  ('super_admin', 'translations.manage'),
  ('admin', 'translations.manage'),
  ('editor', 'translations.manage')
ON CONFLICT DO NOTHING;
```

### New Files

**1. `src/pages/admin/AdminTranslations.tsx`**
Main translation management page with:
- Tab layout: "Static Keys" | "CMS Content" | "Overview"
- Static Keys tab: table of all translation keys grouped by namespace, editable per locale, shows status badges (published/draft/missing/outdated)
- CMS Content tab: list of pages/blocks with their translatable fields, per-locale editing
- Overview tab: completion progress per language, missing/outdated counts
- Filters: by locale, status, namespace, search
- Bulk actions: mark outdated, publish all drafts for a locale
- Import from locale JSON files (seed DB from existing files)
- Draft/publish per entry via DraftActionBar pattern

**2. `src/hooks/use-translation-manager.ts`**
Hook for translation CRUD:
- `useTranslationEntries(filters)` — paginated query
- `useTranslationStats()` — per-locale completion stats
- `saveDraftTranslation(key, locale, value)` — draft save
- `publishTranslations(locale?, namespace?)` — publish drafts
- `discardDraftTranslations(locale?, namespace?)` — discard
- `markOutdated(key)` — when source content changes, mark all non-source locales as outdated
- `importFromLocaleFiles()` — seed DB from JSON files
- `getCmsTranslatableFields(page)` — extract translatable text fields from block content

**3. `src/components/admin/translations/TranslationKeyEditor.tsx`**
Inline editor component for a single translation key across all locales:
- Shows source (EN) text
- Side-by-side locale inputs
- Status badges per locale
- Save draft / publish actions

**4. `src/components/admin/translations/CmsTranslationPanel.tsx`**
Panel for editing CMS block content translations:
- Lists translatable fields from block content
- Per-locale text inputs
- Shows when a field is using fallback (EN) vs has a real translation
- Integrates with `updateBlockContent` from VisualEditorContext

**5. `src/components/admin/translations/TranslationOverview.tsx`**
Dashboard showing:
- Per-language completion percentage
- Missing translations count
- Outdated translations count
- Quick links to fix issues

### Modified Files

**`src/App.tsx`**
- Add route: `/admin/translations` → `AdminTranslations` with `requiredPermission="translations.manage"`

**`src/components/admin/AdminLayout.tsx`**
- Add "Translations" sidebar item under Core group (icon: `Globe`, permission: `translations.manage`)

**`src/contexts/VisualEditorContext.tsx`**
- Add `previewLocale` state (defaults to current i18n language)
- Add `setPreviewLocale(locale)` action
- Pass preview locale to EditorCanvas for locale-aware rendering

**`src/components/admin/editor/EditorToolbar.tsx`**
- Add locale switcher dropdown in toolbar for preview locale selection
- Shows current preview language with flag/label

**`src/components/admin/BlockRenderer.tsx`**
- Update `tr()` calls to respect preview locale when in editor context
- Add `previewLocale` prop support for rendering blocks in a specific language

**`src/lib/translate.ts`**
- Add `trWithLocale(value, locale, fallback)` variant that accepts explicit locale override
- Used by editor preview to render in selected locale without changing global i18n state

**`src/hooks/use-draft-publish.ts`**
- No structural changes — CMS locale content lives inside the existing `content`/`draft_content` JSON fields as multilingual objects

### How It Works

**Static UI text flow:**
1. Admin opens Translations page → sees all keys from locale files
2. Edits a value for DA → saved as `draft_value` in `translation_entries`
3. Preview shows draft value for DA
4. Publishes → `value` updated, `draft_value` cleared
5. Public site reads published `value` (or falls back to locale JSON files)

**CMS content flow:**
1. Block content field `heading` stores `{ en: "Hello", da: "Hej" }`
2. Admin switches preview locale to DA → sees "Hej" in canvas
3. Admin edits DA text in CMS Translation Panel → updates draft_content's multilingual object
4. Draft save preserves changes; publish promotes to live content
5. Public `tr()` resolves correct locale from published `content` field

**Fallback chain:**
Published locale-specific text → Published EN text → Empty string

**Outdated detection:**
When EN source text changes, compute hash comparison against stored `source_hash` → mark other locales as "outdated"

### Permission Mapping
| Action | Permission |
|---|---|
| View/edit translations | `translations.manage` |
| Publish translations | `content.publish` |
| Import/seed from files | `translations.manage` |

### Files Summary
| Action | File |
|---|---|
| Create | `src/pages/admin/AdminTranslations.tsx` |
| Create | `src/hooks/use-translation-manager.ts` |
| Create | `src/components/admin/translations/TranslationKeyEditor.tsx` |
| Create | `src/components/admin/translations/CmsTranslationPanel.tsx` |
| Create | `src/components/admin/translations/TranslationOverview.tsx` |
| Modify | `src/App.tsx` (add route) |
| Modify | `src/components/admin/AdminLayout.tsx` (add sidebar item) |
| Modify | `src/contexts/VisualEditorContext.tsx` (add previewLocale) |
| Modify | `src/components/admin/editor/EditorToolbar.tsx` (add locale switcher) |
| Modify | `src/lib/translate.ts` (add trWithLocale) |

### Database Changes Summary
- Create `translation_entries` table with draft/publish columns + RLS
- Seed `translations.manage` permission for admin roles

