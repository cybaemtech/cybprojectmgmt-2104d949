
-- Create invitation status enum
CREATE TYPE public.invitation_status AS ENUM ('PENDING', 'SIGNED_UP', 'CONFIRMED', 'ACTIVE');

-- Create invitations table
CREATE TABLE public.invitations (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  team_id INTEGER,
  team_role TEXT DEFAULT 'MEMBER',
  global_role TEXT DEFAULT 'USER',
  invited_by UUID,
  status invitation_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_invitations" ON public.invitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_invitations" ON public.invitations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_invitations" ON public.invitations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_invitations" ON public.invitations FOR DELETE TO authenticated USING (true);

-- Auto-update invitation status when a user signs up
CREATE OR REPLACE FUNCTION public.update_invitation_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.invitations 
  SET status = 'SIGNED_UP', updated_at = now()
  WHERE email = NEW.email AND status = 'PENDING';
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_signup_update_invitation
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_invitation_on_signup();

-- Auto-update invitation status when user confirms email
CREATE OR REPLACE FUNCTION public.update_invitation_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.invitations
    SET status = 'ACTIVE', updated_at = now()
    WHERE email = NEW.email AND status IN ('PENDING', 'SIGNED_UP');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_confirm_update_invitation
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.update_invitation_on_confirm();
