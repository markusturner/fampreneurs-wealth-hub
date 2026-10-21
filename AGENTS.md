
## Teller bank connections
- New bank connections use Teller (mTLS), not Plaid. Why: user switched providers; Plaid stays only for existing linked accounts (update-mode) until removed.
- Teller access tokens are stored in connected_accounts.plaid_access_token with provider=teller; enrollment id in plaid_item_id. Sync logic shared in supabase/functions/_shared/teller.ts (teller-enroll, teller-sync, teller-webhook).
- Webhook endpoint: https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/teller-webhook (Teller-Signature HMAC verification, TELLER_WEBHOOK_SECRET).

## Session self-healing
- AuthContext keeps a refresh-token backup under localStorage key `truheirs_session_backup` and silently restores the session on unexpected SIGNED_OUT (failed token refresh). Intentional sign-outs (user button, SecurityActions, Auth pages, expired-program check) must clear the backup or set the intentionalSignOut flag. Why: users were being dropped to sign-in after idle/refresh failures; publishing never invalidates sessions.

## Markus knowledge ingestion
- Store incremental source content separately from persona uploads and retrieve bounded, approved excerpts through a service-role-only search function; this preserves existing knowledge without growing every chat prompt indefinitely.
- Ingest only configured owner profiles and exact owner teaching-call titles; Fathom material requires owner privacy approval before shared retrieval because teaching calls can contain private client questions.
- Run imports only behind admin validation or the internal scheduler secret, with a database lease, source checkpoints, deduplication, spending caps, and persistent access pauses; this prevents duplicate work and unattended failure loops.
