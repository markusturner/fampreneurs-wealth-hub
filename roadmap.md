# Roadmap

## Teller bank connections (in progress)
- [x] Research Teller API details
- [x] Request TELLER_CERTIFICATE + TELLER_PRIVATE_KEY via add_secret; set TELLER_ENV=development
- [x] Edge functions: teller-connect-token, teller-enroll, teller-sync, teller-webhook
- [x] Frontend: Teller Connect button replaces Plaid in account-integration.tsx
- [x] Frontend: Sync/Refresh flows include Teller accounts (account-integration.tsx, transaction-monitoring.tsx)
- [x] Verify build clean and functions deployed

## Open items (blocked / awaiting user)
- Stripe webhook confirmation for TruHeirs subscription payments (user to run a small test payment)
- Resend sending domain verification (Yahoo may block client emails)
