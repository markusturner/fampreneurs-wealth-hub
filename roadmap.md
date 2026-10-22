# Roadmap

## Welcome Markus AI projects and history
- [ ] Add compact projects, saved chats, and back navigation to welcome chat
- [ ] Verify chat controls on desktop, tablet, and phone; real-account checks depend on external sign-in access

## VIP Weekend Mastermind navigation
- [x] Move workbook entry into Community choices for admins and owners, and show only Mastermind and DFO for VIP clients
- [x] Check navigation rules and page compilation; mocked-account navigation passes, real signed-in checks unavailable on external backend

## Markus AI daily knowledge updates
- [x] Add source storage, bounded importer, admin knowledge tab, and chat retrieval while preserving existing AI knowledge
- [x] Connect Apify and Inngest, save owner social profiles, and configure safe Fathom title matching
- [ ] Activate new update functions and scheduler: deployed source is uploaded but new function URLs return 404; external deployment availability blocks live verification
- [ ] Verify real imports and signed-in chat retrieval after function availability is restored; signed-in testing is unavailable for this external backend
- [ ] Complete Instagram/TikTok spoken-video transcription after validating importer output and actual runs; current adapters import captions only
- [x] Explain and collect the teaching-call names and Fathom recorder email
- [x] Apply exact teaching-title allowlist for the owner Fathom account
- [ ] Get one teaching recording link if Fathom uses client-name prefixes; initial recent page contains no exact teaching-title matches

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
