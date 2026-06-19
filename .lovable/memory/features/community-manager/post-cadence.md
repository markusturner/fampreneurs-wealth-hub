---
name: Community Manager Post Cadence
description: Posting frequency for each community manager auto-post template
type: feature
---
Cadence per template (community-manager-daily-post edge function):

- student_of_the_month (wins) — monthly
- welcome_new_members (discussion) — as needed; only for members in that program's community who have completed onboarding (onboarding_responses)
- new_member_orientation (discussion) — as needed (replies to welcome_new_members; same onboarded gate)
- community_wins (wins) — as needed; only when a member newly completes all required trust submissions. Skipped in TFFM (Succession Society) since those members already completed trust creation. Dedupes via community_manager_celebrated_users.
- new_updates (updates) — as needed (only when new courses/meetings exist)

Removed daily templates (no more daily posts): new_plays_gems, recommendations.

Inactive check-in (community-manager-inactive-checkin edge function):
- Reads platform_settings.client_retention_cache and DMs at_risk/slipping members who have been inactive ≥21d
- Sent from persona_user_id to direct_messages
- Deduped via community_manager_checkin_log (no repeat within 14d)
- Run manually or via cron
