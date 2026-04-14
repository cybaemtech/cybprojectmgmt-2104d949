
-- Drop tables in dependency order
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TABLE IF EXISTS public.work_item_history CASCADE;
DROP TABLE IF EXISTS public.attachments CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.work_items CASCADE;
DROP TABLE IF EXISTS public.work_item_templates CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.email_rate_limits CASCADE;
DROP TABLE IF EXISTS public.smtp_config CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS public.invitation_status CASCADE;
DROP TYPE IF EXISTS public.email_status CASCADE;
DROP TYPE IF EXISTS public.item_status CASCADE;
DROP TYPE IF EXISTS public.item_type CASCADE;
DROP TYPE IF EXISTS public.priority_level CASCADE;
DROP TYPE IF EXISTS public.project_category CASCADE;
DROP TYPE IF EXISTS public.project_status CASCADE;
DROP TYPE IF EXISTS public.team_role CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.client_status CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_invitation_on_signup() CASCADE;
