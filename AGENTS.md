
## Client Queue
- Define manual queue stages and bucket creation in the shared client-queue helper, and store placements in existing retention status overrides; this keeps drag-and-drop and selectors consistent without changing automatic health scoring.
- Pending queue cards require an explicit needs_profile_completion flag and incomplete activation; display names must not revive cleared invites.
- Profiles sharing the same email and name collapse to one queue card (newest program start wins) via duplicateClientIds; duplicate logins stay intact. Why: duplicate signups must not show one person twice.
- Program run-out placement lives in programRanOut (client-queue helper) and is applied after manual status overrides, before health stages. Why: an admin's manual move must still win over automatic placement.

## Teller bank connections
- New bank connections use Teller (mTLS), not Plaid. Why: user switched providers; Plaid stays only for existing linked accounts (update-mode) until removed.
- Teller access tokens are stored in connected_accounts.plaid_access_token with provider=teller; enrollment id in plaid_item_id. Sync logic shared in supabase/functions/_shared/teller.ts (teller-enroll, teller-sync, teller-webhook).
- Webhook endpoint: https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/teller-webhook (Teller-Signature HMAC verification, TELLER_WEBHOOK_SECRET).

## Session self-healing
- Profile security phone/app enrollment uses Supabase Auth MFA verification, never custom OTP hashes or external QR services; onboarding email identity verification stays separate from login MFA enforcement.
- AuthContext holds route guards during deduplicated server-validated recovery using `session-persistence`; preserve backups on transient failures but discard rejected tokens. Why: recovery must finish before navigation and must never bypass revocation.
- Login handlers never clear auth storage or sign out before password login; personal/expiry logout uses local scope, while explicit account-security lockdown retains global scope and clears the backup. Why: signing in or out on one device must not revoke unrelated device sessions.

- The session recovery token is mirrored to IndexedDB and native app storage and reseeds localStorage when it is wiped; every copy is cleared on personal logout or security lockdown. Why: republishing or app updates can erase web storage, and copies only request server-validated refreshes.

## VIP workbook navigation
- Keep the mastermind navigation destination on the existing protection-workbook route and use workbook eligibility helpers rather than creating community records; this preserves workbook submissions and onboarding.
- Account Record All Forms reads workbook submissions from the existing user-scoped trust_submissions query and separates completed workbooks from other trust forms; this includes past and future submissions without duplicating private records.

## Welcome AI chat
- Markus replies use shared Markdown presentation blocks on Welcome, Coach Markus and AI Chat; stored messages stay untouched. Why: old chats gain readability without rewrites.
- History navigation uses an inline bounded list, not a portal or overlay, so opening history cannot cover the welcome content or composer. This navigation-only change leaves transcript, composer, and chat transport intact.
- Welcome chat uses the existing chat_projects, chat_conversations, and ai_chat_history tables with the rachel persona and explicit user filters, so its projects and history stay shared with the full AI chat page.
- Community Coach Markus reuses useWelcomeChat/WelcomeChatLibrary private conversations; never public posts. Why: shared history and folders.
- Mobile Welcome redirects through the shared mobile-entry helper after account setup checks; keep VIP and software-only destinations separate to preserve access restrictions.

## Community presentation
- Community message composition and editing share PostRichEditor with a single-heading guard and non-emitting external value sync; this preserves post/comment storage and reliably clears sent drafts.
- Community composers share a membership-scoped mention picker; post and reply triggers resolve tagged recipients atomically so client failures cannot drop or duplicate alerts.
- Published update alerts enter through a Standard Webhooks-verified Lovable event receiver with a service-only event ledger; never send release alerts from development edits or browser startup.
- Community posting uses the open category as the destination, with fixed category labels and no composer category picker; All remains the combined feed with the existing default posting behavior, and server-side membership selection scopes alerts to the community.
- Community feeds render from a per-user cached copy first and refresh in the background; phones render the newest window first. Why: opening a community must feel instant without changing post data.
- Workspace communities share a full-height message shell with category navigation and a docked composer; reuse existing post handlers and event/leaderboard compact views so presentation does not fork community data.
- Community replies remain in community_comments and render chronologically alongside posts using the main composer; this preserves existing replies and notification triggers without separate thread windows.
- Discord reply references use the shared presentation component pointing to the existing parent post across category feeds; presentation never duplicates stored posts or comments.

## Markus knowledge ingestion
- Store source content apart from persona uploads; retrieve bounded approved excerpts via a service-role-only search. Why: prompts stay small.
- Ingest only owner profiles, owner-chosen Drive folders, exact teaching-call titles and owner-listed sales-call fragments; Fathom calls become AI-redacted notes needing owner approval. Why: calls hold private client details.
- Skills: markus_skills table (owner-only writes); markus-skills.ts is fallback. Why: no-code edits.
- Sync runs in ai-chat (mode knowledge, daily refresh on chat) via _shared/markus-knowledge-sync.ts: admin or trusted schedule, lease, checkpoints, dedupe, spend caps, pauses. Why: new functions 404; npm: imports fail deploy.

## Community recording imports
- Mirror PEA community recording posts into Trust Vault using a database trigger and a unique source-post link, so copies are immediate and media updates cannot create duplicates; direct Fathom polling is disabled.
- Copied recording updates allow server-validated admins and owners, but direct source-link creation or changes remain blocked; source edits still synchronize content while local pins remain independent.

## Legal compliance
- Consent, communication preferences, reports, blocks, DMCA notices, security incidents and privacy requests each have their own table; consent is append-only and versioned by LEGAL_DOCUMENT_VERSION in src/lib/legal.ts. Why: provable, auditable consent history.
- LegalConsentGate (mounted in main.tsx) is the single place that enforces 18+ and Terms acceptance for all account-creation paths. Why: invites and admin-created accounts skip the signup page.
- Self-service export/deletion runs through the deployed delete-user function (shared handler in _shared/account-privacy.ts) with a browser export and pending-request fallback. Why: new edge functions on this external project return 404.


## Community data access
- Community reads are RLS-scoped by current_user_community_programs() (tiered like expandProgramCodes); child tables check their parent row. Why: open sign-up must not expose every community.
- "Active now" uses one presence room; "last active" is community_member_activity. Why: presence forgets visits.

## Markus AI
- Voice: ai-chat mode voice_session; checkout: signup-create-checkout flow=markus + stripe-webhook. Why: new functions 404.
- Tools under /markus-ai/* reuse CoachMarkusChat; notes/memories in markus_user_knowledge. Why: shared history, one gated prefix.
- Markus-only members finish /markus-ai/start (goals + Terms) before Markus pages. Why: Markus knows goals at first chat.
