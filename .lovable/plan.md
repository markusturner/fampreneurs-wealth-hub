# VIP Weekend Family Protection Workbook

## What the user sees
- **Welcome page**
  - Admin / Owner: 4 buttons - Community, Content, Digital Family Office, **Protection Workbook**.
  - VIP Weekend clients: only **Digital Family Office** and **Protection Workbook**.
  - Everyone else: unchanged (no workbook button).
- **New page `/protection-workbook`** (VIP Weekend + admin/owner only). Called "Family Protection Workbook - VIP Weekend Prep". Step-by-step sections with a progress bar, autosave, and a final "Create My Workbook" button.

## Workbook sections
1. **About You** - all 20 current Family Protection Plan questions (kept exactly).
2. **Existing Revocable Trust** - "Do you have a revocable trust?" If yes only: name, date created, state, who is trustee, what assets are in it, attorney who drafted it, do you have the signed copy. (Goal: we know what to move into the irrevocable trusts.)
3. **Real Estate** - each property: address, owner on deed, mortgage lender + balance, rental or primary. Docs to bring: deed, mortgage statement, tax bill, insurance, leases.
4. **Business** - entity name, type, state, EIN, ownership %. Docs: articles, operating agreement, EIN letter, bank statements.
5. **Bank and Investment Accounts** - institution, type, approx value. Docs: recent statements.
6. **Retirement and Life Insurance** - 401k/IRA, policies, beneficiaries. Docs: policy pages, beneficiary forms.
7. **Commodities** - gold, silver, other metals, crypto, oil/gas or ag interests: type, amount, where held, proof of ownership. Docs: purchase receipts, vault/custodian statements, wallet info.
8. **Vehicles and Valuables** - titles, art, jewelry, IP-free collectibles. Docs: titles, appraisals.
9. **Debts and Liabilities** - loans, liens, lawsuits.
10. **IDs and Personal Docs** - government ID, SSN cards, marriage/divorce papers, birth certificates of kids, trustee IDs.
11. **Structure Preview Question** - "Which assets do you want protected first and kept private vs. used for growth?" Used to map assets into our 3 domestic irrevocable trusts (Family Trust, Business Trust, Ministry Trust) plus optional offshore.

## Output (end of workbook)
- Same PDF output as today's Family Protection Plan, plus:
  - **Personalized "Bring to VIP Weekend" checklist** built only from their answers (example: owns a home -> deed, mortgage statement).
  - **Visual structure chart** using our framework: Offshore (if any) on top, Family Trust, Ministry Trust, Business Trust, then Holding / Management / Operating companies, personal assets outside. Each of their assets shown in the trust it goes into.
- Saved to their account and visible to admins in Trust Form Submissions.

## Technical details
- New `src/pages/ProtectionWorkbook.tsx` reusing `FamilyProtectionPlanForm` questions (extract question block into shared component) plus new sections; autosave to existing submissions table with a new `form_type = 'vip_workbook'`.
- Asset-to-trust mapping reuses `getStructureLayer` in `src/lib/entities.ts`; chart rendered like `ownership-map.tsx` and embedded in the PDF.
- Extend `generate-family-protection-plan` edge function with a `workbook` mode that adds the checklist and structure sections.
- Welcome page: detect VIP Weekend via program name ("VIP Weekend"), hide Community/Content, add workbook button; admins/owners see all 4.
- Route guarded: VIP Weekend or admin/owner.
- Add a test for the "who sees which Welcome buttons" rule.
