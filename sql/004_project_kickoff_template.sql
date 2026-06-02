-- ─────────────────────────────────────────────────────────────────────────────
-- 004_project_kickoff_template.sql
-- Seeds the locked global "Project Kick-Off" template.
-- Triggered automatically by the Create Project flow.
-- Run manually in the external Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.work_item_templates (name, description, is_locked, scope, created_by, tasks)
SELECT v.name, v.description, true, 'GLOBAL',
       (SELECT id FROM public.profiles WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1),
       v.tasks::jsonb
  FROM (VALUES
    ('Project Kick-Off',
     'Activities triggered automatically when a new project is created.',
     '[{"id":1,"title":"Kick-off Call with Client","itemOrder":1,"isActive":true,"estimatedHours":2},
       {"id":2,"title":"Project Charter & Scope Document","itemOrder":2,"isActive":true,"estimatedHours":4},
       {"id":3,"title":"Team Onboarding & Role Assignment","itemOrder":3,"isActive":true,"estimatedHours":3},
       {"id":4,"title":"Tools & Repository Setup","itemOrder":4,"isActive":true,"estimatedHours":4},
       {"id":5,"title":"Stakeholder Map & Comms Plan","itemOrder":5,"isActive":true,"estimatedHours":2},
       {"id":6,"title":"Initial Status Report to Client","itemOrder":6,"isActive":true,"estimatedHours":2}]')
  ) AS v(name, description, tasks)
 WHERE NOT EXISTS (
   SELECT 1 FROM public.work_item_templates t
    WHERE t.scope = 'GLOBAL' AND t.name = v.name
 );
