
## Teller bank connections
- New bank connections use Teller (mTLS), not Plaid. Why: user switched providers; Plaid stays only for existing linked accounts (update-mode) until removed.
- Teller access tokens are stored in connected_accounts.plaid_access_token with provider=teller; enrollment id in plaid_item_id. Sync logic shared in supabase/functions/_shared/teller.ts (teller-enroll, teller-sync, teller-webhook).
- Webhook endpoint: https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/teller-webhook (Teller-Signature HMAC verification, TELLER_WEBHOOK_SECRET).

## Session self-healing
- AuthContext holds route guards during deduplicated server-validated recovery using `session-persistence`; preserve backups on transient failures but discard rejected tokens. Why: recovery must finish before navigation and must never bypass revocation.
- Login handlers never clear auth storage or sign out before password login; personal/expiry logout uses local scope, while explicit account-security lockdown retains global scope and clears the backup. Why: signing in or out on one device must not revoke unrelated device sessions.

- The session recovery token is mirrored to IndexedDB and native app storage and reseeds localStorage when it is wiped; every copy is cleared on personal logout or security lockdown. Why: republishing or app updates can erase web storage, and copies only request server-validated refreshes.

## VIP workbook navigation
- Keep the mastermind navigation destination on the existing protection-workbook route and use workbook eligibility helpers rather than creating community records; this preserves workbook submissions and onboarding.

## Welcome AI chat
- History navigation uses an inline bounded list, not a portal or overlay, so opening history cannot cover the welcome content or composer. This navigation-only change leaves transcript, composer, and chat transport intact.
- Welcome chat uses the existing chat_projects, chat_conversations, and ai_chat_history tables with the rachel persona and explicit user filters, so its projects and history stay shared with the full AI chat page.
- Mobile Welcome redirects through the shared mobile-entry helper after account setup checks; keep VIP and software-only destinations separate to preserve access restrictions.

## Community presentation
- Community feeds render from a per-user cached copy first and refresh in the background; phones render the newest window first. Why: opening a community must feel instant without changing post data.
- Workspace communities share a full-height message shell with category navigation and a docked composer; reuse existing post handlers and event/leaderboard compact views so presentation does not fork community data.
- Community reply threads reuse the existing comment state and handlers in a separate sheet, and message order uses the shared chronological helper to keep all category feeds consistent.

## Markus knowledge ingestion
- Store incremental source content separately from persona uploads and retrieve bounded, approved excerpts through a service-role-only search function; this preserves existing knowledge without growing every chat prompt indefinitely.
- Ingest only configured owner profiles and exact owner teaching-call titles; Fathom material requires owner privacy approval before shared retrieval because teaching calls can contain private client questions.
- Run imports only behind admin validation or the internal scheduler secret, with a database lease, source checkpoints, deduplication, spending caps, and persistent access pauses; this prevents duplicate work and unattended failure loops.

## Community recording imports
- Mirror PEA community recording posts into Trust Vault using a database trigger and a unique source-post link, so copies are immediate and media updates cannot create duplicates; direct Fathom polling is disabled.
