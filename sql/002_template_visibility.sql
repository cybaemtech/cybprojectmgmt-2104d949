-- =============================================================================
-- Template visibility model: GLOBAL (admin-owned, shared) vs PRIVATE (per-user)
-- Run this on the external Supabase project once. Idempotent where possible.
-- =============================================================================

-- 1. Scope column
ALTER TABLE public.work_item_templates
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'PRIVATE'
    CHECK (scope IN ('GLOBAL','PRIVATE'));

-- 2. Only one row per global template name
CREATE UNIQUE INDEX IF NOT EXISTS work_item_templates_global_name_uidx
  ON public.work_item_templates (name)
  WHERE scope = 'GLOBAL';

-- 3. Backfill: promote one copy of each built-in to GLOBAL, drop the rest.
WITH first_admin AS (
  SELECT id FROM public.profiles WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1
),
keepers AS (
  SELECT DISTINCT ON (name) id
    FROM public.work_item_templates
   WHERE name IN ('Requirement Gathering','Developer Checklist','QA & Testing')
   ORDER BY name, created_at
)
UPDATE public.work_item_templates t
   SET scope = 'GLOBAL',
       is_locked = true,
       created_by = COALESCE((SELECT id FROM first_admin), t.created_by)
 WHERE t.id IN (SELECT id FROM keepers);

DELETE FROM public.work_item_templates
 WHERE name IN ('Requirement Gathering','Developer Checklist','QA & Testing')
   AND scope <> 'GLOBAL';

-- 4. Rewrite RLS so the DB enforces visibility (not just the UI).
ALTER TABLE public.work_item_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_templates"                ON public.work_item_templates;
DROP POLICY IF EXISTS "auth_insert_templates"              ON public.work_item_templates;
DROP POLICY IF EXISTS "auth_update_templates"              ON public.work_item_templates;
DROP POLICY IF EXISTS "auth_delete_templates"              ON public.work_item_templates;
DROP POLICY IF EXISTS "read_global_or_own_private"         ON public.work_item_templates;
DROP POLICY IF EXISTS "insert_own_private_or_admin_global" ON public.work_item_templates;
DROP POLICY IF EXISTS "update_own_private_or_admin_global" ON public.work_item_templates;
DROP POLICY IF EXISTS "delete_own_private_or_admin_global" ON public.work_item_templates;

-- SELECT: globals visible to all; private rows ONLY to creator. Admins are NOT exempt.
CREATE POLICY "read_global_or_own_private"
  ON public.work_item_templates FOR SELECT TO authenticated
  USING (scope = 'GLOBAL' OR created_by = auth.uid());

-- INSERT: anyone can create a PRIVATE row for themselves; only admins can create GLOBAL.
CREATE POLICY "insert_own_private_or_admin_global"
  ON public.work_item_templates FOR INSERT TO authenticated
  WITH CHECK (
    (scope = 'PRIVATE' AND created_by = auth.uid())
    OR (scope = 'GLOBAL' AND EXISTS (
          SELECT 1 FROM public.profiles p
           WHERE p.id = auth.uid() AND p.role = 'ADMIN'))
  );

-- UPDATE: owner can edit their PRIVATE row; admins can edit GLOBAL rows.
CREATE POLICY "update_own_private_or_admin_global"
  ON public.work_item_templates FOR UPDATE TO authenticated
  USING (
    (scope = 'PRIVATE' AND created_by = auth.uid())
    OR (scope = 'GLOBAL' AND EXISTS (
          SELECT 1 FROM public.profiles p
           WHERE p.id = auth.uid() AND p.role = 'ADMIN'))
  );

-- DELETE: same logic as UPDATE.
CREATE POLICY "delete_own_private_or_admin_global"
  ON public.work_item_templates FOR DELETE TO authenticated
  USING (
    (scope = 'PRIVATE' AND created_by = auth.uid())
    OR (scope = 'GLOBAL' AND EXISTS (
          SELECT 1 FROM public.profiles p
           WHERE p.id = auth.uid() AND p.role = 'ADMIN'))
  );

-- 5. Seed the three GLOBAL templates if the backfill found nothing.
--    Run only if your DB doesn't already contain them.
INSERT INTO public.work_item_templates (name, description, is_locked, scope, created_by, tasks)
SELECT v.name, v.description, true, 'GLOBAL',
       (SELECT id FROM public.profiles WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1),
       v.tasks::jsonb
  FROM (VALUES
    ('Requirement Gathering',
     'Tasks for initial requirement analysis and client sign-off.',
     '[{"id":1,"title":"Client Requirement Call","itemOrder":1,"isActive":true,"estimatedHours":4},
       {"id":2,"title":"Prepare Requirement Document","itemOrder":2,"isActive":true,"estimatedHours":8},
       {"id":3,"title":"Feasibility Analysis","itemOrder":3,"isActive":true,"estimatedHours":6},
       {"id":4,"title":"Design Review / Wireframes","itemOrder":4,"isActive":true,"estimatedHours":8},
       {"id":5,"title":"Estimation & Timeline","itemOrder":5,"isActive":true,"estimatedHours":4},
       {"id":6,"title":"Client Sign-Off","itemOrder":6,"isActive":true,"estimatedHours":2}]'),
    ('Developer Checklist',
     'Standard development workflow tasks.',
     '[{"id":1,"title":"Setup Development Branch","itemOrder":1,"isActive":true,"estimatedHours":2},
       {"id":2,"title":"Database Schema Changes","itemOrder":2,"isActive":true,"estimatedHours":8},
       {"id":3,"title":"Backend API Implementation","itemOrder":3,"isActive":true,"estimatedHours":16},
       {"id":4,"title":"Frontend UI Development","itemOrder":4,"isActive":true,"estimatedHours":16},
       {"id":5,"title":"Unit Tests","itemOrder":5,"isActive":true,"estimatedHours":8},
       {"id":6,"title":"Code Review","itemOrder":6,"isActive":true,"estimatedHours":4},
       {"id":7,"title":"Deploy to Staging","itemOrder":7,"isActive":true,"estimatedHours":2}]'),
    ('QA & Testing',
     'Quality assurance and testing workflow.',
     '[{"id":1,"title":"Create Test Plan","itemOrder":1,"isActive":true,"estimatedHours":4},
       {"id":2,"title":"Write Test Cases","itemOrder":2,"isActive":true,"estimatedHours":8},
       {"id":3,"title":"Functional Testing","itemOrder":3,"isActive":true,"estimatedHours":8},
       {"id":4,"title":"Regression Testing","itemOrder":4,"isActive":true,"estimatedHours":6},
       {"id":5,"title":"Performance Testing","itemOrder":5,"isActive":true,"estimatedHours":4},
       {"id":6,"title":"Bug Reporting","itemOrder":6,"isActive":true,"estimatedHours":4},
       {"id":7,"title":"Sign-Off","itemOrder":7,"isActive":true,"estimatedHours":2}]')
  ) AS v(name, description, tasks)
 WHERE NOT EXISTS (
   SELECT 1 FROM public.work_item_templates t
    WHERE t.scope = 'GLOBAL' AND t.name = v.name
 );
