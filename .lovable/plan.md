## Goal

Add a **Project Roadmap** tab to every project (between **Board** and **Documentation**) that works like the existing Strategic Roadmap but is scoped to a single project. Each project starts with an empty roadmap; the PM can either build one from scratch or load one SDLC-style sample template.

## Scope

```text
Project tabs (current):  Overview | Backlog View | Board | Documentation | Settings
Project tabs (new):      Overview | Backlog View | Board | Project Roadmap | Documentation | Settings
```

## What changes

### 1. New tab in `src/pages/project-details.tsx`
- Insert a `Project Roadmap` tab link between Board and Documentation, wired to `projectView === 'roadmap'`.
- Add a matching `TabsContent`-style block that renders the new `<ProjectRoadmap projectId={project.id} />` component.

### 2. New component `src/components/projects/project-roadmap.tsx`
Reuses the visual building blocks from `src/pages/strategic-roadmap.tsx` (gallery card, `RoadmapEditor`, `NewTemplateModal`), but is single-project:
- Loads/saves **one** roadmap document per project (no multi-template gallery, no "duplicate").
- Initial state: empty placeholder with two CTAs — **Create Roadmap** (opens `NewTemplateModal`) and **Load Sample Template**.
- Once a roadmap exists, render the timeline editor for it. Allow Edit / Delete (back to empty state).
- Read-only for non-admins/non-managers; PM/Admin/Scrum Master can create, edit, delete.

To keep the file lean, refactor the shared parts of `strategic-roadmap.tsx` into `src/components/roadmap/*` (RoadmapEditor, NewTemplateModal, color palette, types) and import them in both pages. The existing Strategic Roadmap page continues to work unchanged.

### 3. Single SDLC sample template
Hard-coded constant in the roadmap component (one template only). Streams + project items, e.g.:
- **Streams:** Planning, Development, QA, Delivery
- **Projects:**
  - Kick-off Planning (Planning) — action points: stakeholder intro, scope alignment, success criteria
  - Requirement Gathering (Planning) — workshops, BRD, sign-off
  - SDLC – Design (Development) — architecture, wireframes
  - SDLC – Build (Development) — sprints, code reviews
  - SDLC – Testing (QA) — test plan, automation, UAT
  - Demo to Client (Delivery) — staging demo, feedback log
  - Next Feature Implementation (Development) — backlog grooming, rollout plan

"Load Sample Template" populates the current project's roadmap with this exactly (dates auto-anchored to the project's start/target dates when present, otherwise current month).

### 4. Persistence (per-project)

Add a new table on the external Supabase project (user runs SQL manually, as per the project's backend rules):

```sql
CREATE TABLE public.project_roadmaps (
  id          SERIAL PRIMARY KEY,
  project_id  INT NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Project Roadmap',
  description TEXT DEFAULT '',
  tasks       JSONB DEFAULT '{"streams":[],"projects":[]}'::jsonb,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_roadmaps TO authenticated;
GRANT ALL ON public.project_roadmaps TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.project_roadmaps_id_seq TO authenticated;
ALTER TABLE public.project_roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_project_roadmaps"   ON public.project_roadmaps FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_project_roadmaps" ON public.project_roadmaps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_project_roadmaps" ON public.project_roadmaps FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_project_roadmaps" ON public.project_roadmaps FOR DELETE TO authenticated USING (true);
```

Client queries via `supabaseCustom` against `project_roadmaps`:
- `select * where project_id = :id` on load
- `insert` on create / load sample
- `update tasks` on every edit (debounced)
- `delete where project_id = :id` on reset

`UNIQUE(project_id)` guarantees one roadmap per project.

### 5. Type system
Add a `ProjectRoadmap` interface to `src/types/schema.ts` (`{ id; projectId; name; description; tasks: { streams: string[]; projects: RoadmapProject[] } }`).

## Out of scope
- Touching the Strategic Roadmap (org-level) page behavior — only its reusable internals get extracted.
- Demo-mode data for the new tab beyond a no-op empty state.
- Reorganizing the existing `Documentation` or `Settings` tab content.

## User responsibility
- Run the SQL block above in the external Supabase project before using the new tab (matches the existing "manual schema" rule for this project).
