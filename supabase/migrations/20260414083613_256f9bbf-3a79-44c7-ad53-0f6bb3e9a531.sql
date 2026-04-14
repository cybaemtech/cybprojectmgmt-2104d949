DROP TRIGGER IF EXISTS on_user_confirm_update_invitation ON auth.users;
DROP FUNCTION IF EXISTS public.update_invitation_on_confirm();