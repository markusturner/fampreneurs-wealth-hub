# Switch bank connections from Plaid to Teller

## What you need to give me
1. A Teller account at teller.io (free to sign up).
2. Your Teller **Application ID** (shown in the Teller dashboard).
3. Your Teller **certificate and private key** files (downloaded from the dashboard). These are secret and saved securely, never in the app.
4. Which mode to start in: **Sandbox** (fake banks for testing) or **Development/Production** (real banks; Production needs Teller approval).
5. A **webhook signing secret** from Teller, so new transactions show up in real time. I will give you the web address to paste into Teller first.

## What I will build
- Replace the "Connect bank" button on the Digital Family Office page with Teller's connect window.
- Save each linked bank account with its live balance, same as today.
- Pull transactions right after linking, then keep them updated automatically when Teller sends new ones.
- Keep a "Refresh" button for manual updates.
- Existing Plaid accounts stay visible (marked as older connections) until you remove them; Plaid code is turned off.
- Demo mode stays untouched.

## Technical details
- New backend functions: `teller-enroll` (store access token from Teller Connect), `teller-sync` (accounts, balances, transactions via mTLS using cert/key secrets), `teller-webhook` (verify signature, trigger sync).
- Secrets: TELLER_APPLICATION_ID (public, can live in code), TELLER_CERTIFICATE, TELLER_PRIVATE_KEY, TELLER_ENV, TELLER_WEBHOOK_SECRET.
- Reuse `connected_accounts` (provider = 'teller', token stored server-side only) and existing transactions table; update account-integration.tsx and transaction-monitoring.tsx to call the new functions.
