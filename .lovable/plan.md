

## End-to-End Supabase Database Setup

This is a large migration from localStorage to an external Supabase database. The app currently has 15 files importing from `local-store.ts` and uses hardcoded login credentials.

### Prerequisites

You need to connect your Supabase project to Lovable. I'll prompt the connection setup when we begin implementation.

### Database Schema (SQL Migrations)

**Tables to create:**

1. **profiles** - Synced from `auth.users` via trigger. Columns: `id (uuid, FK auth.users)`, `username`, `email`, `full_name`, `avatar_url`, `is_active`, `role (user_role enum)`, `last_login`, timestamps.

2. **teams** - `id (serial)`, `name`, `description`, `created_by (uuid)`, `is_active`, timestamps.

3. **team_members** - `id (serial)`, `team_id`, `user_id (uuid)`, `role (team_role enum)`, `joined_at`, `updated_at`.

4. **projects** - `id (serial)`, `key`, `name`, `description`, `category (project_category enum)`, `status (project_status enum)`, `created_by (uuid)`, `team_id`, `start_date`, `target_date`, `github_url`, all `client_*` fields, timestamps.

5. **project_members** - `id (serial)`, `project_id`, `user_id (uuid)`, `role (team_role enum)`, `expires_at`, timestamps.

6. **work_items** - `id (serial)`, `external_id`, `title`, `description`, `tags`, `type (item_type enum)`, `status (item_status enum)`, `priority (priority enum)`, `project_id`, `parent_id (self-ref)`, `assignee_id (uuid)`, `reporter_id (uuid)`, all bug/prototype/pdf fields, timestamps.

7. **comments** - `id (serial)`, `work_item_id`, `user_id (uuid)`, `content`, timestamps.

8. **attachments** - `id (serial)`, `work_item_id`, `user_id (uuid)`, `file_name`, `file_path`, `file_size`, `mime_type`, `created_at`.

9. **work_item_history** - `id (serial)`, `work_item_id`, `user_id (uuid)`, `field_name`, `old_value`, `new_value`, `created_at`.

10. **activity_logs** - `id (serial)`, `user_id (uuid)`, `action`, `entity_type`, `entity_id`, `details`, `created_at`.

11. **templates** - `id (serial)`, `name`, `description`, `tasks (jsonb)`, `created_by (uuid)`, `is_locked`, timestamps. (Currently in localStorage separately.)

**Enums:** `user_role`, `team_role`, `project_status`, `project_category`, `item_type`, `item_status`, `priority_level`, `client_status`.

**RLS Policies:** All tables will have RLS enabled. Authenticated users can read all data; write operations restricted to owners/admins via a `has_role` security definer function.

**Trigger:** Auto-create a `profiles` row when a new `auth.users` entry is created.

### Application Code Changes

**Step 1: Connect Supabase and run migrations** (5 migrations for enums, tables, RLS, triggers, seed data)

**Step 2: Create Supabase client** - New `src/integrations/supabase/client.ts` with typed client.

**Step 3: Create data service layer** - New `src/lib/supabase-store.ts` that mirrors the `local-store.ts` API but calls Supabase. Functions like `projectStore.all()`, `workItemStore.save()`, etc. will use `supabase.from('projects').select()` instead of localStorage.

**Step 4: Replace auth** - Update `src/hooks/useAuth.tsx` to use Supabase Auth (`signInWithPassword`, `signUp`, `signOut`) instead of hardcoded credentials. Update `login.tsx` and `register.tsx`.

**Step 5: Migrate all 15 consumer files** - Replace `import { ... } from "@/lib/local-store"` with imports from `supabase-store.ts`. Key files:
- `projects.tsx`, `project-details.tsx`, `teams.tsx`, `team-details.tsx`
- `reports.tsx`, `timeline.tsx`, `dashboard.tsx`
- `create-project.tsx`, `create-team.tsx`
- `create-item-modal.tsx`, `edit-item-modal.tsx`, `delete-item-modal.tsx`
- `team-members-modal.tsx`, `manage-team-modal.tsx`
- `authenticated-layout.tsx`, `template-settings.tsx`

**Step 6: Seed demo data** - Migration to insert the 15 users, 5 teams, 5 projects, and 49 work items into Supabase.

### Technical Details

- TypeScript types in `schema.ts` will be updated: `id` changes from `number` to `number` (serial) but user references become `uuid` strings to match Supabase auth.
- The supabase-store will use React Query for caching and invalidation, matching existing patterns.
- File uploads (screenshots, PDFs) will use Supabase Storage buckets instead of base64 blobs.

### Files Created/Modified

| Action | File |
|--------|------|
| Create | 5 SQL migration files |
| Create | `src/integrations/supabase/client.ts` |
| Create | `src/lib/supabase-store.ts` |
| Modify | `src/hooks/useAuth.tsx` |
| Modify | `src/types/schema.ts` |
| Modify | 15 consumer files (pages + components) |

This is a significant migration. I recommend doing it in phases: first connect Supabase and set up the schema, then migrate auth, then migrate data access file by file.

