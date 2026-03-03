

## Current State

Right now, your app has **no revision/versioning support**. Each uploaded contract is stored as a standalone row in the `contracts` table with no link to previous versions. If you upload "Contract_v0.pdf" and then "Contract_v1.pdf", they appear as two completely separate contracts on the dashboard with no relationship between them.

## What Needs to Change

To support revisions (Revision 0, Revision 1, etc.), we need:

### 1. Database Changes
- Add a `parent_contract_id` column (nullable UUID, self-referencing foreign key) to the `contracts` table — links a revision to the original contract
- Add a `revision_number` column (integer, default 0) to track which revision this is

### 2. Upload Flow Update
- On the Upload page, add an option: "Is this a revision of an existing contract?"
- If yes, show a dropdown to select the parent contract
- Auto-calculate the next revision number (e.g., if parent has max revision 1, new one becomes revision 2)

### 3. Dashboard Updates
- Group revisions together or show the revision number in the table
- Option A: Show only the latest revision per contract group, with an expand to see history
- Option B: Show all contracts but display a "Rev 0", "Rev 1" badge

### 4. Contract Detail Page
- Show revision history: list all revisions of the same contract with links
- Highlight which revision is currently being viewed

### 5. Diff/Comparison (Optional Enhancement)
- Side-by-side comparison of extracted fields between two revisions to see what changed

## Technical Summary

```text
contracts table changes:
  + parent_contract_id  UUID  nullable  FK → contracts.id
  + revision_number     INT   default 0
```

- Migration adds columns + updates RLS policies
- Upload page gets a "revision of" selector
- Dashboard shows revision badges
- Detail page shows revision timeline

