

## Plan: Add Documentation Tab to Project Details

### What it does
Adds a new "Documentation" tab between "Board" and "Settings" in the project details view. This tab aggregates all documents (PDFs) attached to Client Requirement (FEATURE) and Change Request (STORY) work items, showing file name, the parent work item, who attached it, and when — providing a centralized audit view of all project documents.

### Technical approach

**1. Update project view state type and tab navigation**
- File: `src/pages/project-details.tsx`
- Add `'documentation'` to the `projectView` state union type
- Add a new tab link between "Board" and "Settings" in the nav bar

**2. Build the Documentation tab content**
- File: `src/pages/project-details.tsx` (inline, before the Settings tab block)
- Filter `workItems` for items that have `pdfUploadBlob` or `pdfUploadPath` set
- Render a table with columns:
  - **Document Name** — from `pdfUploadPath` (cleaned filename)
  - **Work Item** — title + externalId of the parent work item, with type badge (Client Requirement / Change Request)
  - **Uploaded By** — `createdByName` or `createdByEmail` from the work item
  - **Date Attached** — `createdAt` or `updatedAt` of the work item
  - **Action** — Download/View button to open the PDF
- Include an empty state when no documents exist
- Add a search/filter bar to filter documents by name or work item title
- Show total document count as a badge on the tab or in the header

**3. Include screenshot attachments too**
- Also check for `screenshotBlob`/`screenshotPath` on BUG items so the documentation tab truly captures all attachments across the project

### Files to modify
- `src/pages/project-details.tsx` — add tab, state type, and documentation view content

### No database changes needed
Documents are already stored as blobs on work items. This is purely a read-only aggregation view.

