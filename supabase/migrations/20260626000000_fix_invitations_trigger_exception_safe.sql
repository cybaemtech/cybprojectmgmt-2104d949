-- Migration to make invitation trigger functions exception-safe
-- This prevents database errors from blocking user registration and confirmation

-- 1. Make update_invitation_on_signup function exception-safe
CREATE OR REPLACE FUNCTION public.update_invitation_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  BEGIN
    UPDATE public.invitations 
    SET status = 'SIGNED_UP', updated_at = now()
    WHERE email = NEW.email AND status = 'PENDING';
  EXCEPTION WHEN OTHERS THEN
    -- Log warning but do not abort the transaction
    RAISE WARNING 'Failed to update invitation status to SIGNED_UP for email %: %', NEW.email, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 2. Make update_invitation_on_confirm function exception-safe
CREATE OR REPLACE FUNCTION public.update_invitation_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    BEGIN
      UPDATE public.invitations
      SET status = 'ACTIVE', updated_at = now()
      WHERE email = NEW.email AND status IN ('PENDING', 'SIGNED_UP');
    EXCEPTION WHEN OTHERS THEN
      -- Log warning but do not abort the transaction
      RAISE WARNING 'Failed to update invitation status to ACTIVE for email %: %', NEW.email, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;
