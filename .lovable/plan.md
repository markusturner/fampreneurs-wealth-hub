# Constitution menu, Handoff invites, Layered Ownership Map

## 1. Transactions (answer only, no change)
Yes. When a bank is linked with Teller, the last 90 days of transactions are pulled in right away, and new ones arrive on their own through Teller updates. The Refresh button pulls again on demand.

## 2. Governance > Constitution: sticky side menu + cleaner layout
- Sticky left menu (desktop) listing: Identity & Core Documents, Governance & Authority, Three Branches, Legacy & Development, Family Education, Quick Actions. Clicking scrolls smoothly; the section in view is highlighted.
- On mobile the menu becomes a slim horizontal pill row that sticks to the top.
- Calmer reading: left-aligned section headers with a small icon, one short line under each, more spacing between sections, fewer borders and colored icons, cards grouped in simple grids. No content removed.

## 3. Handoff: successor invites with deadlines and tracking
- Only family council members (from Governance) or the business owner can add successors.
- Add as many successors as needed: name, email, role they inherit, and a deadline picked each time.
- Saving sends each person a branded email with a link to accept and complete their handoff steps.
- If not done by the deadline: 3 reminder emails, then marked Overdue and the owner is alerted in the app and by email.
- "My Handoffs" list shows every invite with status (Sent, Opened, In progress, Completed, Overdue), a progress bar, deadline, and Resend / Remove buttons.
- Existing check-in and readiness checklist stay below.

## 4. Dashboard: Ownership Map as the Unified Trust Structure
Layered layout based on the attached framework, filled from how accounts are assigned on the Family Office Accounts tab:

```text
                 [ Offshore Trust ]            (always on top when present)
     [ Family Trust ] ------------ [ Ministry Trust ]
            |                              |
     [ Business Trust ]            [ Charity / Non-Profit ]
            |
   [ Holding Co (Active) ] : [ Holding Co (Passive) ]
     [Mgmt Cos]  [Operating Cos]   [Operating / RE Cos]  [Mgmt Co]
-----------------------------------------------------------------
  Personal Name (outside the structure, red dashed, "Not protected")
```
- Colors follow the legend: trusts dark purple, holding purple, operating light blue, management gold, non-profit blue. Each box shows total value and asset count.
- Empty layers show faint placeholders so the framework stays intact.
- The Family Office stays as a small hub badge at the top of the structure, connected to the top trust.
- Add "Offshore Trust", "Operating Company LLC", "Management Company" to the account owner options so accounts can be placed in every layer. "Living Trust" still never shows.
- Demo mode shows a filled example.

## Technical details
- Documents.tsx: add section ids, IntersectionObserver for active item, sticky `top-4` aside in a `lg:grid-cols-[200px_1fr]` layout.
- New table `handoff_successors` (owner_id, name, email, role, deadline, status, progress, token, reminders_sent, opened_at, completed_at) with grants + RLS (owner manages own; successor completes via token through an edge function).
- Edge functions: `handoff-invite` (send/resend via Resend), `handoff-accept` (token lookup/progress update), `handoff-reminders` (daily cron: reminders on days before deadline, then Overdue + owner alert).
- ownership-map.tsx rewritten as a tiered SVG; entity-to-layer mapping in src/lib/entities.ts.
