## Plan

### 1. Recording posts (investigate)
Recordings are user-uploaded posts with `category='recordings'` in `community_posts` (Workspace Community). They still exist — the WorkspaceCommunity feed already filters by `category='recordings'`. Will check that no recent migration excluded `recordings` from the program-specific Community feed (`src/pages/Community.tsx`) and the FBA filter, and restore visibility if missing.

### 2. Welcome only onboarded members
In `community-manager-daily-post/index.ts`, update `getRecentNewMembers` to inner-join `onboarding_progress` (or check `user_onboarding_status`) so only members whose onboarding is `completed` are welcomed.

### 3. Trust-creation Community Win triggered by submission date
- `community_wins` template already lists members who completed both `family` + `business` trust submissions. Change it to detect *recent* completions (last 7d using `trust_submissions.created_at`, the same date that appears in All Users Management) and only post when there is a brand-new completer not previously celebrated (use `community_manager_post_log` `meta` to track celebrated user_ids).

### 4. Skip Trust-Creation Wins in TFFM (Succession Society)
Inside `community_wins.generate`, return `null` when `program === 'tffm'`.

### 5. New posting cadence (no daily posts)
Remove `daily` cadence entirely. Cadence becomes:
- `student_of_the_month` — monthly (kept)
- `welcome_new_members` / `new_member_orientation` — as needed (onboarded gate)
- `community_wins` — as needed (recent trust completion)
- `new_updates` — as needed (real new courses/meetings)
- `new_plays_gems` & `recommendations` — REMOVED from auto-cadence; only triggered manually or by big news event
- New cadence rule: when a member is *inactive* (per Client Retention `client_retention_cache` — `last_active_at` older than 30 days), call `community-manager-reply` to send them a personal check-in DM (insert into `messages` from persona). Add a new edge function `community-manager-inactive-checkin` invoked daily by cron.
- Existing `community-manager-reply` already handles replying when someone posts — confirm cron is wired to it.

### 6. Fathom "No transcripts" false negative
Root cause in `compute-client-health/index.ts`: meetings are fetched but the new "scored matching" requires email or strict tokenized first+last name on `external_invitees`; many Fathom calls (Robert Bayless, Nelson, Jamel, Terrence, Carol) likely lack invitee emails so they score 0 and the client shows zero transcripts.

Fix:
- Match against meeting `title`, `attendees[].name`, `host_name`, AND the transcript snippet text — not just invitee emails.
- Lower threshold: any single-name (first OR last) token match scores ≥ 30 (was 35 last-name only).
- Add fuzzy match (Levenshtein ≤ 1) for first names ≥ 4 chars to catch "Jamel"/"Jamal" style variance.
- When `meetings.length > 0` but `matched.length === 0`, signal becomes `Fathom — Scanned N meeting(s); none matched this client's name/email yet` instead of "No transcripts available yet".
- Bump cache key to `client_retention_cache_v5` and clear DB cache.

### Files
- `supabase/functions/community-manager-daily-post/index.ts` — gate welcomes, cadence overhaul, TFFM skip, recent-completion logic
- `supabase/functions/community-manager-inactive-checkin/index.ts` — NEW: personal DMs to inactive members
- `supabase/functions/compute-client-health/index.ts` — improved Fathom matching + better empty-state signal
- `src/pages/ClientRetention.tsx` — bump cache key to v5
- `src/pages/Community.tsx` — confirm `recordings` category visible (read-only check, edit if missing)
- Migration: clear `client_retention_cache`; add `community_manager_celebrated_users` table to avoid duplicate trust-wins posts
- Update `mem://features/community-manager/post-cadence.md`
