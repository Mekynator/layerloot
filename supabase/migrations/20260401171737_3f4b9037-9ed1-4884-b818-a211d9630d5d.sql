
-- Create trigger function to prevent voucher fraud
CREATE OR REPLACE FUNCTION public.prevent_voucher_fraud()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role to modify anything
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block changes to sensitive fields for regular users
  IF OLD.is_used IS DISTINCT FROM NEW.is_used OR
     OLD.balance IS DISTINCT FROM NEW.balance OR
     OLD.gift_status IS DISTINCT FROM NEW.gift_status OR
     OLD.claimed_at IS DISTINCT FROM NEW.claimed_at OR
     OLD.used_at IS DISTINCT FROM NEW.used_at THEN
    RAISE EXCEPTION 'Unauthorized modification of protected voucher fields';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_prevent_voucher_fraud
  BEFORE UPDATE ON public.user_vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_voucher_fraud();
