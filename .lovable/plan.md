## Goal
After clicking **Create Project**, automatically trigger the **Project Kick-Off** template chain and show a circular progress modal (hybrid 0→90% over ~10s, snap to 100% on completion) instead of the current toast/alert.

## 1. Seed the "Project Kick-Off" global template
In `src/pages/template-settings.tsx` (`buildSamples`), add a new locked global template:
- Name: **Project Kick-Off**
- Locked, shared with all users
- Default tasks (hours):
  1. Kick-off Call with Client (2h)
  2. Project Charter & Scope Document (4h)
  3. Team Onboarding & Role Assignment (3h)
  4. Tools & Repository Setup (4h)
  5. Stakeholder Map & Comms Plan (2h)
  6. Initial Status Report to Client (2h)

This template will appear in the global templates list and is editable only by admins (same pattern as Requirement Gathering).

## 2. Circular progress component
Create `src/components/ui/circular-progress.tsx`:
- SVG-based ring (two stacked `<circle>` elements, stroke-dasharray driven by `value` prop)
- Centered numeric label, smooth `transition: stroke-dashoffset 200ms`
- Sized + themed via semantic tokens (`stroke-primary`, `stroke-muted`), matches the reference image (thin ring, large centered number)

Create `src/components/modals/kickoff-progress-modal.tsx`:
- Non-dismissible `<Dialog>` with `<CircularProgress value={progress} />`
- Caption: "Setting up Project Kick-Off…"
- Hybrid progress driver:
  - On mount, animate `progress` from 0 → 90 over ~10s using `requestAnimationFrame` (eased)
  - Expose `markComplete()` which jumps to 100, waits 400ms, then calls `onDone()`
  - If completion happens before 10s, still animate smoothly to 100; if it takes longer, hold at 90 until done

## 3. Wire automation into Create Project
In `src/components/projects/create-project.tsx` `onSubmit`:
1. Save the project (existing logic).
2. Open the Kick-Off progress modal (lifted via local state in this component).
3. Run the kick-off automation chain in parallel with the 10s animation:
   - Reuse or create an **EPIC** (Client Details) for the new project — populate CRM fields from project form (mirrors existing FEATURE automation in `create-item-modal.tsx`).
   - Create a **FEATURE** titled `Project Kick-Off` under the EPIC, assignee = current user.
   - Create a **STORY** titled `Project Kick-Off` under the FEATURE.
   - Look up the **Project Kick-Off** template; for each active task (ordered) create a **TASK** under the STORY with `estimate = estimatedHours`, assignee = current user.
4. On success, call `markComplete()` on the modal; on error, close modal and show destructive toast.
5. After modal closes, call existing `onSuccess()` + `onClose()` to refresh the projects list.

Replace the current "Project created" toast with a single success toast emitted after the chain completes (e.g. "Project ready — X kick-off tasks created").

## 4. Edge cases
- If the **Project Kick-Off** template is missing (admin deleted it), still create EPIC/FEATURE/STORY, skip tasks, and show a non-blocking toast: "Project Kick-Off template not found — created shell only."
- If EPIC creation fails, surface error and abort chain (project itself is already saved).
- All work-item writes use `workItemStore.saveAsync` (same pattern as existing automation).

## Technical notes
- Files changed: `src/pages/template-settings.tsx`, `src/components/projects/create-project.tsx`
- Files added: `src/components/ui/circular-progress.tsx`, `src/components/modals/kickoff-progress-modal.tsx`
- No DB schema changes; templates and work items already use existing tables.
- No changes to `create-item-modal.tsx` — kick-off automation lives in `create-project.tsx` so it always fires on project creation regardless of manual item creation flows.