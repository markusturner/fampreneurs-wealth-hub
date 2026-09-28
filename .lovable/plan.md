# Switch bank connections from Plaid to Teller

## What you have given me
- Teller Application ID: app_pr23ur1i79tq045oi0000 (goes in the app, it is not secret)
- Certificate public key (goes in the Teller Connect window, also not secret)

## What is still needed (I will ask securely right after approval)
- The **private key** that Teller gave you alongside that certificate (the file that starts with "-----BEGIN RSA PRIVATE KEY-----" or similar). This is secret and must never be pasted in chat; I will open a secure form for it.
- Start in **Development** (real banks, no approval needed) and switch to Production later once Teller approves your app.

## What I will build
- Replace the "Connect bank" button on the Digital Family Office page with Teller's connect window.
- Save each linked bank account with its live balance, same as today.
- Pull transactions right after linking, then keep them updated automatically when Teller sends new ones (real-time via webhooks).
- Keep a "Refresh" button for manual updates.
- Existing Plaid accounts stay visible (marked as older connections) until you remove them; Plaid connecting is turned off.
- Demo mode stays untouched.

## Technical details
- New backend functions:
  - `teller-connect-token` - validates the signed-in user, returns the Teller Connect config
  - `teller-enroll` - receives the enrollment token from Teller Connect, calls Teller server-to-server (with the private key) to fetch accounts, saves them in `connected_accounts` with provider = 'teller'
  - `teller-sync` - pulls accounts, balances, and transactions using mTLS with the private key
  - `teller-webhook` - verifies Teller's signature, updates balances and adds new transactions automatically
- Secrets: TELLER_PRIVATE_KEY (secure form), TELLER_ENV (set to development), TELLER_WEBHOOK_SECRET (after you add it in the Teller dashboard)
- Reuse the existing `connected_accounts` and transaction tables; update account-integration.tsx and transaction-monitoring.tsx to call the new functions.
- Teller webhooks need a public web address; I will give you the URL to paste into the Teller dashboard when I open the secrets form.
