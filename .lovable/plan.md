
## Goal

Rebuild `/succession-planning` to mirror the Trust Creation page: header, badge-labeled steps, and clickable cards. Every item is an "info-only" card with a status tracker (Not Started → In Progress → Complete) that admins update and members view.

## Layout

```
Succession Planning
Plan your family's next chapter.

[Step 1] Family Constellation & Legacy Foundation
  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
  │ Family Constellation │  │ Legacy Videos        │  │ Course Creation      │
  │ Session w/ Ginger    │  │ (Done for you)       │  │ (Done for you)       │
  │ [Book — coming soon] │  │ Status: In Progress  │  │ Status: Not Started  │
  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘

[Step 2] First Family Legacy Meeting & Identity
  ┌─────────────────────┐ ┌──────────────────┐ ┌────────────┐ ┌──────────────┐
  │ Legacy Meeting      │ │ Identity Manual  │ │ Family     │ │ Family Bible │
  │ Uploads (existing)  │ │ (Done for you)   │ │ Crest (DFY)│ │ (Done for you)│
  └─────────────────────┘ └──────────────────┘ └────────────┘ └──────────────┘

[Step 3] Annual Family Retreat & Stewardship
  Annual Retreat · Trust Stewardship · Annual Trust Meeting · File Trust Taxes (upsell) ·
  Tax Strategy w/ Toni Simons (booking coming soon) · IP / Trademark (1 free, $1,297/class extra)
```

## Behavior

- **Access gate**: same `check-trust-access` pattern OR a new `succession_society` program check (confirm later — for now reuse current gating; admin can grant via existing unlock system).
- **Cards** open a detail view (like Trust Creation's selected section) that shows:
  - Description
  - Booking link if available (Ginger, Toni Simons — placeholder "Coming Soon" button)
  - Status badge: `Not Started` (gray), `In Progress` (gold), `Complete` (green)
  - Upsell CTA where relevant (file trust taxes, additional trademarks at $1,297/class) → button posts a request notification to admin
- **Legacy Meeting card** keeps the existing `FamilyLegacyMeetingUploads` component as its detail view.
- **Status tracker**: read-only for members, editable for admins/owners via inline select on each card.

## Data

New table `succession_progress`:
- `user_id` (uuid)
- `item_key` (text) — e.g. `legacy_videos`, `course_creation`, `identity_manual`, `family_crest`, `family_bible`, `annual_retreat`, `tax_strategy`, `trademark`, etc.
- `status` ('not_started' | 'in_progress' | 'complete')
- `notes` (text, optional admin note)
- timestamps
- Unique(user_id, item_key)

RLS: user can SELECT their own rows; admins/owners can SELECT/INSERT/UPDATE all (via `has_role`).

Upsell requests reuse existing admin notification edge function (`notify-admin-submission`) with a new `request_type`.

## Files

- Rewrite `src/pages/SuccessionPlanning.tsx` — new step-based layout, card grid, detail view, status badges.
- New `src/components/succession/SuccessionItemCard.tsx` — card with icon, title, status badge, lock/CTA.
- New `src/components/succession/SuccessionItemDetail.tsx` — detail view with description, booking link, upsell button, admin status editor.
- New migration for `succession_progress` table + RLS.
- Reuse `FamilyLegacyMeetingUploads` inside Step 2's Legacy Meeting detail.

## Open question I'll handle later

The two booking links (Ginger Gentile, Toni Simons) will render a disabled "Booking link coming soon" button until you provide the URLs.
