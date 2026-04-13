

## Plan: Template-Level Estimated Hours & Hide Dates on Auto-Create

### What it does
1. Adds an **Estimated Hours** field to each task in Template Settings, so users can pre-configure hours per task.
2. When "Auto-create Template Tasks" is ticked, the automation uses each template task's configured hours instead of splitting the parent estimate evenly.
3. Hides **Scheduled Start Date** and **Scheduled End Date** fields from the creation form for **Change Request (STORY)** and **Task** when "Auto-create Template Tasks" is checked. Also makes the **Estimated Hours** field on the parent read-only and auto-summed from template task hours.

### Technical approach

**1. Update TemplateTask type and storage** (`src/pages/template-settings.tsx`)
- Add `estimatedHours?: number` to the `TemplateTask` interface
- Add an inline editable hours input next to each task row in the template card (small numeric input, e.g. "9h")
- Update `addTask` to accept a default of 0 hours
- Update `handleEditTask` to save hours changes
- Update sample data to include reasonable default hours per task

**2. Mirror the type in create-item-modal** (`src/components/modals/create-item-modal.tsx`)
- Add `estimatedHours?: number` to `TemplateTaskOption` interface
- In FEATURE and STORY automation chains: use `tTask.estimatedHours` for each created task instead of the even-split calculation
- Auto-sum template task hours and set as the parent's estimate when auto-create is on
- When `autoCreateTemplateTasks` is checked for STORY: hide the Scheduled Start Date, Scheduled End Date, and make Estimated Hours read-only (showing the sum)
- Same behavior for FEATURE: dates hidden when auto-create is on, estimate becomes sum of template hours

### Files to modify
- `src/pages/template-settings.tsx` — add `estimatedHours` to task model, UI input per task
- `src/components/modals/create-item-modal.tsx` — use per-task hours from template, hide date fields when auto-create is ticked, auto-sum estimate

