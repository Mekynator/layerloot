
-- 1. Add columns to business_expenses
ALTER TABLE public.business_expenses
  ADD COLUMN IF NOT EXISTS month_key text,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'DKK',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS receipt_file_name text,
  ADD COLUMN IF NOT EXISTS no_receipt_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- Auto-set month_key from expense_date
CREATE OR REPLACE FUNCTION public.set_expense_month_key()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.month_key := to_char(NEW.expense_date, 'YYYY-MM');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_expense_month_key
  BEFORE INSERT OR UPDATE OF expense_date ON public.business_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_expense_month_key();

-- Backfill existing rows
UPDATE public.business_expenses SET month_key = to_char(expense_date, 'YYYY-MM') WHERE month_key IS NULL;

-- 2. recurring_expenses
CREATE TABLE public.recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  vendor_name text,
  category text NOT NULL DEFAULT 'Miscellaneous',
  subcategory text,
  default_net_amount numeric NOT NULL DEFAULT 0,
  default_vat_amount numeric NOT NULL DEFAULT 0,
  default_gross_amount numeric NOT NULL DEFAULT 0,
  billing_day integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage recurring expenses" ON public.recurring_expenses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));
CREATE TRIGGER set_recurring_expenses_updated_at BEFORE UPDATE ON public.recurring_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. monthly_reports
CREATE TABLE public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  pdf_file_url text,
  csv_file_url text,
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage monthly reports" ON public.monthly_reports FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- 4. expense_categories
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expense categories" ON public.expense_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "Public read active expense categories" ON public.expense_categories FOR SELECT TO public USING (is_active = true);

INSERT INTO public.expense_categories (name, sort_order) VALUES
  ('Electricity', 1), ('Internet/Phone', 2), ('Software', 3), ('Marketing', 4),
  ('Shipping', 5), ('Packaging', 6), ('Materials', 7), ('Tools/Equipment', 8),
  ('Accounting/Legal', 9), ('Office', 10), ('Miscellaneous', 11);
