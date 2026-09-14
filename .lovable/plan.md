# Instant, Stable Client Retention Loading

## Goal
Show the Client Retention page immediately with every client already in the correct queue, without cards changing columns after the page appears.

## Changes
- Save one complete display snapshot containing the final merged households, scores, statuses, milestones, and card order.
- Read that snapshot once during page startup so the queue paints immediately.
- Load notes, attendance, client profiles, partner links, history, and the latest health scores together in the background.
- Build the final client list off-screen, then replace the visible list once in a single update.
- Prevent partial profile, history, or health responses from temporarily moving cards or creating duplicate partner cards.
- Keep manual status overrides and drag-and-drop placement authoritative during refreshes.

## Verification
- Open Client Retention with a saved snapshot and confirm cards appear without placeholders or column movement.
- Refresh the page and confirm client counts, partner cards, and stages remain unchanged while background data refreshes.
- Confirm clicking Refresh updates the queue once rather than in several visible steps.
- Check desktop board view and mobile table view.

## Technical Details
- Refactor the loading helpers to return data rather than committing each response directly to visible state.
- Use one hydration coordinator to merge all inputs and commit a single finalized snapshot.
- Version the browser snapshot so older partial cache entries are discarded safely.
