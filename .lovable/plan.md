# One Hub for Everything Client-Related

Turn Client Retention into the single place for clients: queue stages, all-user management, surveys, and invites. Settings goes back to being app settings only.

## 1. New queue stages

Client Queue becomes six columns, in this order:

1. **Invited — No Show** (new, before Urgent) — people sent an invitation who never showed up.
2. Urgent — Act Today
3. Slipping — Watch This Week
4. Healthy & Stable
5. Ready for Expansion
6. **Continuity** (new, after Expansion) — clients who won't upsell but should renew or continue.

How a client lands in a new stage:
- Notes wording drives it, same as today's note detection. Phrases like "no show", "didn't show", "never showed", "invite sent, no response" put them in Invited — No Show. Phrases like "not upselling", "no upsell", "renewal", "continuity", "staying at current level" put them in Continuity.
- Dragging a card into either column still wins over automatic placement, and the move is recorded in that client's history.
- Upsell opportunity-cost text stays limited to Ready for Expansion; Continuity cards instead show renewal-focused guidance and an auto-drafted renewal message.

## 2. Page-level toggle: Clients / Surveys

A top toggle switches the page between the client view and the survey view. The survey view shows the same content as the current Surveys page (list, results, owner/admin-only visibility). The standalone Surveys page keeps working for anyone with a direct link.

## 3. Merge All Users Management into the page

The Clients view gets its own sub-tabs: **Queue** (board/table as today) and **All Users**. All Users renders the existing All Users Management with every current column, filter, bulk action, and per-person dialog intact — nothing removed or rebuilt. It is removed from Settings.

## 4. Invites button

Next to the sort/custom-order control, a single **Invites** button opens a popup with two tabs: Bulk Invite and Invite Links — the exact components used on the Settings Invites tab today. Those move off Settings.

## 5. Settings cleanup

Settings keeps Community, Content, Integrations, and Roles. Users and Invites tabs are removed and their entry points now live on Client Retention.

## 6. Mobile and tablet

- Stage columns scroll horizontally on tablet; mobile stays on table view as today, extended to the two new stages.
- Clients/Surveys toggle and Queue/All Users tabs scroll horizontally without cutting off.
- All Users tables keep their horizontal scroll with sticky first column.
- Invites popup becomes a full-height sheet-style dialog on small screens.

## Technical Details

- `Status` widens to `"invited_no_show" | "at_risk" | "slipping" | "stable" | "expansion_ready" | "renewal"`; `STATUS_ORDER`, `STATUS_META`, buckets, droppable columns, and the cache version (`client_retention_cache_v6`) update together so old snapshots are discarded.
- `analyzeNotes` gains `noShow` and `renewalOnly` flags; placement precedence stays: manual override > drag order > note-derived > score threshold. Score thresholds are unchanged for the four existing stages.
- `status_override` values are stored as text in `client_retention_notes`, so no migration is required; the edge function keeps emitting the four computed statuses and the page maps the two new ones.
- Reuse `AdminAllUsersManagement`, `AdminUserManagement`, `AdminInviteLinks`, and the Surveys page body as-is; the surveys view is extracted into a component so both the route and the tab share it.
