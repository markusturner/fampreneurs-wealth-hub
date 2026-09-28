# Stay signed in after updates

## The problem

Publishing an update does not erase sign-ins (verified: the app never clears the saved session on load, and the sign-in server keeps sessions alive indefinitely). The real cause of the sign-in screens: when a device sits idle, the app's saved sign-in key can go stale, and the moment one refresh attempt fails the app drops the session and sends you to the sign-in page. Using the app on both a phone and a computer makes these collisions more likely.

## What will change

1. **Self-healing session (main fix)**
   - Keep an encrypted-at-rest copy of the sign-in session in a separate storage slot (not the library's own key) in `src/contexts/AuthContext.tsx`.
   - When the app unexpectedly fires a signed-out event, and the backup exists, silently restore it and re-validate with the server (`getUser()`).
   - If the server says it is still valid, the user never sees the sign-in page. If it is truly expired, clear the backup and show the normal sign-in page.

2. **Refresh before the tab sleeps**
   - When a tab becomes visible again after being idle, refresh the token immediately instead of waiting for a failing background attempt.
   - This prevents the stale-key collision that happens after a device sleeps.

3. **Keep the phone and computer sessions independent**
   - Each device already has its own sign-in key; no change needed. The fix above means a failed refresh on one device never forces the other to sign in again.

## What will NOT change

- Publishing keeps working exactly as it does now (updates go live without touching saved sign-ins).
- The program-ended sign-out for expired clients stays as-is.
- Sign-out buttons keep working normally (real sign-outs clear the backup too, so users are not ghost-signed-in).

## Files touched

- `src/contexts/AuthContext.tsx` (backup, restore-on-signout, visibility refresh)
- `src/integrations/supabase/client.ts` (no change unless needed)

## Verification

- Build clean.
- Playwright check: open the app signed out, confirm the sign-in page; simulate a stale session and confirm the app restores instead of redirecting.
