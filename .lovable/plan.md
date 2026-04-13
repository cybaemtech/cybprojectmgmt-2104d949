

## Problem

When the "Client Requirement" (FEATURE) automation chain runs, the auto-created STORY ("Initial Requirement Gathering") and child TASKs are not assigned to the user who triggered the automation. The Change Request (STORY) chain already does this correctly.

## Plan

**File: `src/components/modals/create-item-modal.tsx`**

1. Before the FEATURE automation block (around line 355), capture the creator's ID:
   ```ts
   const creatorId = currentUser?.id || currentLocalUser?.id || null;
   ```

2. Add `assigneeId: creatorId` to the STORY creation at line 388 (the "Initial Requirement Gathering" story).

3. Add `assigneeId: creatorId` to each TASK creation at line 404 (the template tasks loop).

This mirrors the existing pattern already used in the Change Request automation (lines 423-448).

