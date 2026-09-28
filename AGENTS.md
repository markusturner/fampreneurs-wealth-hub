
## Teller bank connections
- New bank connections use Teller (mTLS), not Plaid. Why: user switched providers; Plaid stays only for existing linked accounts (update-mode) until removed.
- Teller access tokens are stored in connected_accounts.plaid_access_token with provider=teller; enrollment id in plaid_item_id. Sync logic shared in supabase/functions/_shared/teller.ts (teller-enroll, teller-sync, teller-webhook).
- Webhook endpoint: https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/teller-webhook (Teller-Signature HMAC verification, TELLER_WEBHOOK_SECRET).

## Session self-healing
- AuthContext keeps a refresh-token backup under localStorage key `truheirs_session_backup` and silently restores the session on unexpected SIGNED_OUT (failed token refresh). Intentional sign-outs (user button, SecurityActions, Auth pages, expired-program check) must clear the backup or set the intentionalSignOut flag. Why: users were being dropped to sign-in after idle/refresh failures; publishing never invalidates sessions.
