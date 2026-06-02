-- Configuration: role-based access control
-- Run this manually in the external Supabase SQL editor.

create table if not exists public.role_permissions (
  role text primary key check (role in ('ADMIN', 'SCRUM_MASTER', 'USER')),
  allowed_pages text[] not null default '{}',
  allowed_features text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

grant select on public.role_permissions to anon, authenticated;
grant insert, update on public.role_permissions to authenticated;

alter table public.role_permissions enable row level security;

drop policy if exists "role_permissions readable by authenticated" on public.role_permissions;
create policy "role_permissions readable by authenticated"
  on public.role_permissions for select
  to authenticated using (true);

drop policy if exists "role_permissions writable by admins" on public.role_permissions;
create policy "role_permissions writable by admins"
  on public.role_permissions for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN'));

-- Seed defaults (idempotent)
insert into public.role_permissions (role, allowed_pages, allowed_features) values
  ('ADMIN',
   array['dashboard','strategic_roadmap','team_management','project_management','daily_standup','timeline','template_settings','reports','raise_ticket'],
   array['create_project','delete_project','create_team','delete_team','create_global_template','delete_epic_feature','manage_strategic_roadmap','edit_client_details','manage_team_members','configure_smtp','assign_user_roles','change_assignee_epic_feature_story','change_assignee_task_bug']
  ),
  ('SCRUM_MASTER',
   array['dashboard','strategic_roadmap','team_management','project_management','daily_standup','timeline','template_settings','reports','raise_ticket'],
   array['create_project','create_team','manage_strategic_roadmap','edit_client_details','manage_team_members','change_assignee_epic_feature_story','change_assignee_task_bug']
  ),
  ('USER',
   array['dashboard','team_management','project_management','timeline','template_settings','reports','raise_ticket'],
   array['change_assignee_task_bug']
  )
on conflict (role) do nothing;

-- Patch existing rows to include assignee-change features (idempotent)
update public.role_permissions
  set allowed_features = (
    select array_agg(distinct f)
    from unnest(allowed_features || array['change_assignee_epic_feature_story','change_assignee_task_bug']) as f
  ),
  updated_at = now()
  where role in ('ADMIN','SCRUM_MASTER');

update public.role_permissions
  set allowed_features = (
    select array_agg(distinct f)
    from unnest(allowed_features || array['change_assignee_task_bug']) as f
  ),
  updated_at = now()
  where role = 'USER';
