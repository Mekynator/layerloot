

# Finance System Expansion Plan

## What Already Exists
- `business_expenses` table with basic CRUD
- 2-tab admin page (Preview + Expenses)
- Aggregation hook pulling from orders, custom_orders, business_expenses
- HTML-based print/PDF and CSV export
- DeclarationPreview and ExpenseManager components

## What Needs to Be Built

### 1. Database Changes (Migration)

**Enhance `business_expenses`** — add missing columns rather than creating a parallel `monthly_expenses` table (avoids data migration complexity):
- `month_key` (text, computed from expense_date, e.g. "2026-04")
- `subcategory` (text, nullable)
- `currency` (text, default "DKK")
- `payment_method` (text, nullable)
- `receipt_file_name` (text, nullable)
- `no_receipt_required` (boolean, default false)
- `source` (text, default "manual" — values: manual/recurring/system)

**New table: `recurring_expenses`**
- id, title, vendor_name, category, subcategory, default_net_amount, default_vat_amount, default_gross_amount, billing_day, is_active, created_at, updated_at
- RLS: admin/super_admin/owner only

**New table: `monthly_reports`**
- id, month_key, year, month, generated_at, pdf_file_url, csv_file_url, snapshot_json (jsonb), notes, created_at
- RLS: admin/super_admin/owner only

**New table: `expense_categories`**
- id, name, sort_order, is_active, created_at
- RLS: admin read/write, public read active
- Seed with: Electricity, Internet, Software, Marketing, Shipping, Packaging, Materials, Tools, Accounting, Office, Misc

### 2. Hooks (Data Layer)

**`use-recurring-expenses.ts`** — CRUD for recurring expenses + "apply to month" function that inserts entries into business_expenses with source="recurring" (with duplicate prevention check).

**`use-monthly-reports.ts`** — CRUD for monthly_reports + generate snapshot function that captures current aggregated data as JSON.

**`use-expense-categories.ts`** — fetch/manage dynamic categories (replaces hardcoded EXPENSE_CATEGORIES).

**Enhance `use-monthly-declaration.ts`** — use dynamic categories from expense_categories table instead of hardcoded list.

### 3. Admin UI — 4 Tabs

Refactor `AdminDeclaration.tsx` from 2 tabs to 4:

**Tab 1: Overview** (existing DeclarationPreview, enhanced)
- Summary cards (Income, Expenses, VAT In, VAT Out, Result)
- YTD totals
- Previous month comparison
- Warnings panel

**Tab 2: Expenses** (existing ExpenseManager, enhanced)
- Add subcategory, payment_method, no_receipt_required fields to form
- Category filter dropdown
- Status badges (missing receipt, categorized)
- Use dynamic categories from expense_categories

**Tab 3: Recurring** (new component)
- `RecurringExpenseManager.tsx`
- List recurring expenses with activate/deactivate toggle
- Add/edit/delete recurring entries
- "Apply to [month]" button that copies recurring entries into business_expenses for selected month
- Duplicate prevention indicator

**Tab 4: Reports** (new component)
- `ReportsManager.tsx`
- List of previously generated monthly reports
- "Generate Report" button → saves snapshot_json to monthly_reports
- Download PDF / CSV from saved report
- Regenerate option
- View snapshot summary inline

### 4. PDF Generator Enhancement

Update `generate-declaration-pdf.ts`:
- Black/white professional print layout (remove dark theme for PDF)
- Numbers right-aligned with DKK currency
- Section C shows Net | VAT | Gross columns per category
- Receipt Index shows vendor column + status checkmark/missing icon
- Add source column to CSV (system/manual/recurring)

### 5. Snapshot System

When "Generate Report" is clicked:
- Aggregate all current month data
- Store as `snapshot_json` in `monthly_reports`
- Optionally store PDF/CSV file URLs if uploaded to storage
- Historical reports remain stable even if underlying data changes

### 6. Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create (alter business_expenses + 3 new tables + seed) |
| `src/hooks/use-recurring-expenses.ts` | Create |
| `src/hooks/use-monthly-reports.ts` | Create |
| `src/hooks/use-expense-categories.ts` | Create |
| `src/hooks/use-monthly-declaration.ts` | Modify (dynamic categories) |
| `src/components/admin/declaration/RecurringExpenseManager.tsx` | Create |
| `src/components/admin/declaration/ReportsManager.tsx` | Create |
| `src/components/admin/declaration/ExpenseManager.tsx` | Modify (new fields + filters) |
| `src/pages/admin/AdminDeclaration.tsx` | Modify (4 tabs) |
| `src/lib/generate-declaration-pdf.ts` | Modify (B&W layout, 3-col expenses) |

### 7. Validation Rules
- gross = net + vat (auto-calculated in form)
- Category required (enforced in form)
- month_key auto-derived from expense_date
- Warn if missing receipt (unless no_receipt_required)
- Prevent duplicate recurring insert per month

