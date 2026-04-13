
-- Enums
CREATE TYPE public.user_role    AS ENUM ('ADMIN','SCRUM_MASTER','USER');
CREATE TYPE public.team_role    AS ENUM ('ADMIN','MEMBER','VIEWER');
CREATE TYPE public.project_status   AS ENUM ('PLANNING','ACTIVE','ARCHIVED','COMPLETED');
CREATE TYPE public.project_category AS ENUM ('CLIENT','IN_HOUSE');
CREATE TYPE public.item_type    AS ENUM ('EPIC','FEATURE','STORY','TASK','BUG');
CREATE TYPE public.item_status  AS ENUM ('TODO','IN_PROGRESS','ON_HOLD','DONE');
CREATE TYPE public.priority_level   AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE public.client_status    AS ENUM ('LEAD','ONBOARDING','ACTIVE','CHURNED');

-- Profiles
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT,
  email       TEXT,
  full_name   TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT true,
  role        public.user_role DEFAULT 'USER',
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Teams
CREATE TABLE public.teams (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID REFERENCES auth.users(id),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Team Members
CREATE TABLE public.team_members (
  id          SERIAL PRIMARY KEY,
  team_id     INT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.team_role DEFAULT 'MEMBER',
  joined_at   TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Projects
CREATE TABLE public.projects (
  id                    SERIAL PRIMARY KEY,
  key                   TEXT NOT NULL,
  name                  TEXT NOT NULL,
  description           TEXT,
  category              public.project_category DEFAULT 'IN_HOUSE',
  status                public.project_status DEFAULT 'ACTIVE',
  created_by            UUID REFERENCES auth.users(id),
  created_by_name       TEXT,
  created_by_email      TEXT,
  team_id               INT REFERENCES public.teams(id) ON DELETE SET NULL,
  start_date            DATE,
  target_date           DATE,
  github_url            TEXT,
  client_company_name   TEXT,
  client_industry       TEXT,
  client_website        TEXT,
  client_contact_name   TEXT,
  client_contact_email  TEXT,
  client_contact_phone  TEXT,
  client_account_manager UUID REFERENCES auth.users(id),
  client_status         public.client_status,
  client_notes          TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Project Members
CREATE TABLE public.project_members (
  id          SERIAL PRIMARY KEY,
  project_id  INT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.team_role DEFAULT 'MEMBER',
  expires_at  TIMESTAMPTZ,
  joined_at   TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Work Items
CREATE TABLE public.work_items (
  id                SERIAL PRIMARY KEY,
  external_id       TEXT,
  title             TEXT NOT NULL,
  description       TEXT,
  tags              TEXT,
  type              public.item_type NOT NULL,
  status            public.item_status DEFAULT 'TODO',
  priority          public.priority_level DEFAULT 'MEDIUM',
  project_id        INT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id         INT REFERENCES public.work_items(id) ON DELETE SET NULL,
  assignee_id       UUID REFERENCES auth.users(id),
  reporter_id       UUID REFERENCES auth.users(id),
  created_by_name   TEXT,
  created_by_email  TEXT,
  updated_by        UUID REFERENCES auth.users(id),
  updated_by_name   TEXT,
  estimate          TEXT,
  actual_hours      TEXT,
  start_date        DATE,
  end_date          DATE,
  completed_at      TIMESTAMPTZ,
  bug_type          TEXT,
  severity          TEXT,
  current_behavior  TEXT,
  expected_behavior TEXT,
  reference_url     TEXT,
  screenshot_path   TEXT,
  screenshot        TEXT,
  screenshot_blob   TEXT,
  github_url        TEXT,
  prototype_link    TEXT,
  prototype_status  TEXT,
  pdf_upload_path   TEXT,
  pdf_upload_blob   TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Comments
CREATE TABLE public.comments (
  id            SERIAL PRIMARY KEY,
  work_item_id  INT NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Attachments
CREATE TABLE public.attachments (
  id            SERIAL PRIMARY KEY,
  work_item_id  INT NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  file_name     TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  file_size     INT,
  mime_type     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Work Item History
CREATE TABLE public.work_item_history (
  id            SERIAL PRIMARY KEY,
  work_item_id  INT NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id),
  field_name    TEXT NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Activity Logs
CREATE TABLE public.activity_logs (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   INT,
  details     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Templates
CREATE TABLE public.templates (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  tasks       JSONB DEFAULT '[]'::jsonb,
  created_by  UUID REFERENCES auth.users(id),
  is_locked   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "auth_read_profiles"       ON public.profiles        FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_teams"          ON public.teams           FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_team_members"   ON public.team_members    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_projects"       ON public.projects        FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_project_members" ON public.project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_work_items"     ON public.work_items      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_comments"       ON public.comments        FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_attachments"    ON public.attachments     FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_history"        ON public.work_item_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_activity"       ON public.activity_logs   FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_templates"      ON public.templates       FOR SELECT TO authenticated USING (true);

-- Write policies
CREATE POLICY "auth_insert_profiles"     ON public.profiles        FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_own_profile"  ON public.profiles        FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "auth_insert_teams"        ON public.teams           FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_teams"        ON public.teams           FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_teams"        ON public.teams           FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_insert_team_members" ON public.team_members    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_team_members" ON public.team_members    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_team_members" ON public.team_members    FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_insert_projects"     ON public.projects        FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_projects"     ON public.projects        FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_projects"     ON public.projects        FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_insert_project_members" ON public.project_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_project_members" ON public.project_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_project_members" ON public.project_members FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_insert_work_items"   ON public.work_items      FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_work_items"   ON public.work_items      FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_work_items"   ON public.work_items      FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_insert_comments"     ON public.comments        FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_comments"     ON public.comments        FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_comments"     ON public.comments        FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_insert_attachments"  ON public.attachments     FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_delete_attachments"  ON public.attachments     FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_insert_history"      ON public.work_item_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_insert_activity"     ON public.activity_logs   FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_insert_templates"    ON public.templates       FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_templates"    ON public.templates       FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_templates"    ON public.templates       FOR DELETE TO authenticated USING (true);

-- Auto-create profile on signup
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
