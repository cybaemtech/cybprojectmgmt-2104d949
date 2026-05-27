# Access cleanup: Templates & Roadmap

## What's already correct (no change needed)

- **Per-project Roadmap**: rendered inside `src/pages/project-details.tsx` via `<ProjectRoadmap projectId=… />`, persisted per `project_id` in `project_roadmaps`. Every project member can view it; `canEdit` controls editing.
- **Template Settings page logic** (`src/pages/template-settings.tsx`):
  - `createTemplate(...)` force-downgrades any non-admin attempt to `PRIVATE` (`finalScope = scope === 'GLOBAL' && isAdmin ? 'GLOBAL' : 'PRIVATE'`).
  - Edit/delete of GLOBAL templates is blocked for non-admins (`readOnly = isGlobal && !isAdmin`; guard at line 211).
  - Global/Private toggle in the Create dialog only renders when `isAdmin`.
  - Private templates remain user-scoped (RLS in `sql/002_template_visibility.sql`).

## Changes

### 1. `src/components/layout/sidebar.tsx`
- Remove `"Template Settings"` from the admin/scrum-master gate so every signed-in user sees the entry and can manage their own private templates. (Keep `"Daily Standup"` admin/scrum-master only.)
- Add `"Strategic Roadmap"` to the admin/scrum-master gate so non-admins don't see the portfolio-level `/roadmap` entry. Per-project roadmap remains available to them inside each project's "Roadmap" tab.

No other files change. No DB / RLS / route changes — the `/roadmap` route stays mounted so admins keep portfolio access, and non-admins simply lose the sidebar shortcut.

## Verification

- Sign in as a non-admin: sidebar shows **Template Settings** but not **Strategic Roadmap** or **Daily Standup**.
- On `/templates` as a non-admin: GLOBAL templates render read-only (no edit/delete/duplicate-into-global); "Create Template" dialog has no Global toggle and any created template is PRIVATE.
- Open any project → Roadmap tab works as before for all members.
- Sign in as admin: all three entries visible; full edit rights on GLOBAL templates preserved.
