## Goal

Replace the current "every user gets their own clone of the 3 samples" behavior with a true two-tier visibility model:

- **Global templates** (`Requirement Gathering`, `Developer Checklist`, `QA & Testing`) — one shared row each, owned by an admin, visible to everyone, editable by admins only.
- **Private templates** — created by any user, visible **only to the creator** (hidden from peers AND from admins).

## 1. Database changes (external Supabase — user runs SQL)

Add a scope column + a global-uniqueness guard, then rewrite RLS so visibility is enforced server-side (not just in UI).

```sql
-- 1. New column distinguishing global vs private rows
ALTER TABLE public.work_item_templates
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'PRIVATE'
    CHECK (scope IN ('GLOBAL','PRIVATE'));

-- 2. Only one row per global template name
CREATE UNIQUE INDEX IF NOT EXISTS work_item_templates_global_name_uidx
  ON public.work_item_templates (name)
  WHERE scope = 'GLOBAL';

-- 3. Backfill: mark the three built-ins as GLOBAL, keep first admin copy, delete the rest
WITH first_admin AS (
  SELECT id FROM public.users WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1
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
       created_by = (SELECT id FROM first_admin)
 WHERE t.id IN (SELECT id FROM keepers);

DELETE FROM public.work_item_templates
 WHERE name IN ('Requirement Gathering','Developer Checklist','QA & Testing')
   AND scope <> 'GLOBAL';

-- 4. Replace RLS
ALTER TABLE public.work_item_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_read_templates"   ON public.work_item_templates;
DROP POLICY IF EXISTS "auth_insert_templates" ON public.work_item_templates;
DROP POLICY IF EXISTS "auth_update_templates" ON public.work_item_templates;
DROP POLICY IF EXISTS "auth_delete_templates" ON public.work_item_templates;

-- SELECT: globals visible to all; private rows only to creator (admins NOT exempt)
CREATE POLICY "read_global_or_own_private"
  ON public.work_item_templates FOR SELECT TO authenticated
  USING (scope = 'GLOBAL' OR created_by = auth.uid());

-- INSERT: anyone can create a PRIVATE row for themselves; only admins can create GLOBAL
CREATE POLICY "insert_own_private_or_admin_global"
  ON public.work_item_templates FOR INSERT TO authenticated
  WITH CHECK (
    (scope = 'PRIVATE' AND created_by = auth.uid())
    OR (scope = 'GLOBAL' AND EXISTS (
          SELECT 1 FROM public.users u
           WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  );

-- UPDATE: owner can edit their PRIVATE row; admins can edit GLOBAL rows
CREATE POLICY "update_own_private_or_admin_global"
  ON public.work_item_templates FOR UPDATE TO authenticated
  USING (
    (scope = 'PRIVATE' AND created_by = auth.uid())
    OR (scope = 'GLOBAL' AND EXISTS (
          SELECT 1 FROM public.users u
           WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  );

-- DELETE: same as UPDATE, but GLOBAL rows are also is_locked = true → blocked in UI
CREATE POLICY "delete_own_private_or_admin_global"
  ON public.work_item_templates FOR DELETE TO authenticated
  USING (
    (scope = 'PRIVATE' AND created_by = auth.uid())
    OR (scope = 'GLOBAL' AND EXISTS (
          SELECT 1 FROM public.users u
           WHERE u.id = auth.uid() AND u.role = 'ADMIN'))
  );
```

Result: the database itself prevents peer-to-peer or admin-to-user snooping on private templates — even a hand-crafted client cannot bypass it.

## 2. App logic (`src/pages/template-settings.tsx`)

Remove the per-user "seed three samples on first load" block — globals are now real shared rows seeded once by the migration.

- **Load:** `select * where scope = 'GLOBAL' or created_by = current_user` (RLS makes the filter redundant but keeps the query explicit). Drop the "if empty then insert samples" branch.
- **Create:** new templates always insert with `scope: 'PRIVATE'`, `created_by: userId`, `is_locked: false`.
- **Update / delete / task edits on GLOBAL rows:** gated by `currentUser.role === 'ADMIN'`. Non-admins see the global cards as read-only (hide pencil / trash / Add Task / toggle; render `Switch` as `disabled`). The existing `isLocked` flag already blocks rename/delete; extend it to block task mutations for non-admin viewers of GLOBAL rows.
- **Duplicate on a GLOBAL row by a non-admin:** allowed, but the new row is inserted as `PRIVATE` owned by the current user (so the user gets a personal editable copy).
- **Demo mode:** keep current in-memory seeding unchanged.

## 3. Type system (`src/types/schema.ts`)

Add to the `Template`/row mapping:

```ts
export type TemplateScope = 'GLOBAL' | 'PRIVATE';
// in Template interface:
scope: TemplateScope;
```

Update `mapRow` in `template-settings.tsx` to carry `scope` through.

## 4. UI affordances

- Global cards: small "Global" badge in the header; non-admin sees lock icon + "Read-only" tooltip; admin sees normal edit controls.
- Private cards: small "Private" badge; only the creator ever sees them.
- "New Template" button always creates a private template for the current user.

## Out of scope

- Sharing/permissions UI (no team-level templates).
- Migrating historical per-user duplicates of the three built-ins into private renamed copies — they are simply deleted by step 3 of the migration. If you want them preserved instead, say so and I'll change the backfill to rename + keep them as private rows.

## User responsibility

Run the SQL block in section 1 on the external Supabase project before deploying the code changes (matches this project's manual-schema rule).
