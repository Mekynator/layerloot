
-- Invoice number sequence
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1 INCREMENT BY 1;

-- Invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_date timestamptz NOT NULL DEFAULT now(),
  pdf_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_order_id_key UNIQUE (order_id),
  CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number)
);

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = invoices.order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Storage bucket for invoices (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);

-- Storage RLS: owners can read their own invoice files
CREATE POLICY "Users can read own invoices"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'invoices'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE ('invoices/' || o.id::text) = SUBSTRING(name FROM 1 FOR LENGTH('invoices/') + 36)
        AND o.user_id = auth.uid()
    )
  );

-- Storage RLS: admins can read all invoice files
CREATE POLICY "Admins can read all invoices"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seq_val bigint;
BEGIN
  seq_val := nextval('public.invoice_number_seq');
  RETURN 'LL-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 4, '0');
END;
$$;
