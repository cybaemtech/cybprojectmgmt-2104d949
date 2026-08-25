-- Migration to confirm all existing users and ensure they have profiles
-- This helps resolve "Email not confirmed" errors and missing profile issues

-- 1. Confirm all existing users in Supabase Auth
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    confirmation_token = NULL,
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 2. Ensure all users have a profile entry
INSERT INTO public.profiles (id, email, full_name, username, role, is_active, created_at, updated_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)),
    'USER',
    true,
    created_at,
    updated_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. Also ensure the trigger exists (as a safety measure)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'USER'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
