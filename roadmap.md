# Roadmap

## Legal compliance
- [x] Privacy Policy, Terms, Guidelines, Disclaimer, DMCA pages; signup + one-time consent window with 18+ check
- [x] Privacy settings: message switches, data download, account deletion (with admin-completed fallback)
- [x] Report/block in community, admin Compliance tab (reports, DMCA, breach log, deletion requests)
- [x] Education-only notices on trust/wealth/AI screens; removed specific investment picks and return targets
- [x] Push and community emails respect opt-outs; 5 age/consent tests pass
- [ ] Server tool updates (delete-user, send-push-notification, notify-community-post-email) not live: external deploys keep running old code
- [ ] Verify signed-in flows: external unmanaged authentication prevents real-account checks
- [x] Cookie banner (GPC honored), AI chat disclosure, auto-renew terms and direct cancel button
- [ ] Turn on Stripe renewal reminder emails (owner setting in Stripe)
- [ ] Attorney review items listed in /mnt/documents/TruHeirs-Legal-Compliance-Checklist_v2.md

## Duplicate invited client
- [x] Stop cleared Invited User placeholders from appearing in Non-Active; preserve the signed-up account's stage
- [x] Live corrected invite query returns no D'Juan placeholder; all 6 queue tests pass and build OK
- [ ] Verify signed-in queue display: external unmanaged authentication prevents real-account browser checks

## Client Queue stages and page width
- [x] Add Follow-up and Deal Lost to queue columns, status choices and history, preserving manual placements
- [x] Extend the queue across the available page width and give columns more vertical room
- [x] Run 3 passing stage tests and sample browser saves/reloads for both stages; queue fills available width with no page overflow and build OK
- [ ] Verify real-account stage saving: external unmanaged authentication prevents signed-in checks

## Workbook account records
- [x] Show completed Family Protection Workbooks in their own section under Account Record All Forms, including existing submissions, dates, and answers; surface loading errors instead of empty records
- [x] Check D'Juan's live records: no trust submissions exist for his account, so no completed workbook is saved
- [x] Run focused form-record and workbook tests: 12 passed; preview build OK; live data confirms existing completed workbooks are stored in the queried table
- [ ] Verify Account Record through a real signed-in browser: external unmanaged authentication prevents authenticated checks

## Profile security section
- [x] Match the section width to other settings
- [x] Replace simulated phone/app setup in the profile panel with Supabase MFA verification, local QR display, saved factor status, and working skip/back controls
- [x] Run 2 validation tests and sample-service checks for equal widths, method tabs, email send/back, SMS verification and authenticator completion
- [ ] Verify live SMS/email/app setup and hosted MFA availability: external unmanaged authentication prevents real-account checks; email identity verification is not login MFA and login enforcement is unchanged

## Software update alerts and member mentions
- [ ] Activate mobile/desktop published-update alerts: receiver and duplicate-safe fan-out are ready, but external endpoint returns 404; Events & Hooks destination and signing secret must be connected once live
- [x] Show community members and everyone when typing @ in messages and replies
- [x] Deliver tagged alerts using community-scoped, server-validated recipients
- [x] Run 8 focused tests, rolled-back database audience/deduplication tests, and sample picker interactions on desktop and phone
- [ ] Verify real-device alert delivery: external unmanaged sign-in prevents authenticated end-to-end checks

## Category posting and everyone mentions
- [x] Make the composer follow the selected category and keep All as the combined feed
- [x] Notify only the current community for @everyone in messages and replies; scope existing post emails to saved-post membership
- [x] Test category routing with 8 passing tests and community-scoped recipients with rolled-back database tests across all four communities and replies
- [ ] Verify real signed-in posting and delivered alerts; external unmanaged authentication prevents this check

## Markus AI readable thoughts
- [x] Separate assistant thoughts and space paragraphs across Welcome, Coach Markus and AI Chat, including saved replies
- [x] Verify formatting with 7 passing tests and sample desktop/phone rendering, including 24px paragraph spacing, without changing saved conversations

## Copied Trust Vault recording controls
- [x] Allow admins and owners to pin and edit copied recordings while protecting source links
- [x] Verify admin/owner pin, unpin and edit, member restrictions, source-link protection and continued mirroring with rolled-back database tests
- [ ] Verify through a real signed-in browser; external unmanaged authentication prevents this check

## Shared community Coach Markus
- [x] Restore blue Coach Markus category and add shared Welcome chats, folders, and new-chat controls
- [x] Verify shared history, follow-up conversation IDs, folders, and new chats using sample services on desktop, tablet, and phone; 3 unit tests pass
- [ ] Verify live AI replies and saving with a real account; external unmanaged authentication prevents signed-in checks

## Persistent login
- [x] Keep login through republish by saving a backup outside web storage; sample check stayed signed in after storage wipe on all sizes
- [x] Remove login-time global sign-outs and prevent redirects while session recovery runs
- [x] Test recovery, reload persistence, and explicit local sign-out: 12 unit tests pass; synthetic browser sessions pass on desktop, phone, and tablet
- [ ] Verify real-device persistence and hosted session limits: external unmanaged authentication prevents real-account testing; hosted session-settings read is unavailable

## Community message redesign
- [x] Instant mobile message loading from last-seen copy, newest 40 first with Show earlier; checked on phone
- [x] Select from the message menu (3 dots or hold), then Select all and multi-select delete; checked on desktop, tablet, and phone
- [x] Replace the plus dialog with compact posting options and move Events/Leaderboard to the right rail; sample posting and layout checks passed on desktop, tablet, and phone
- [x] Add desktop Reply menus and mobile hold-to-open actions with original-message context; checked using sample accounts on desktop, tablet, and phone
- [x] Put newest messages at the bottom with automatic scrolling, separate reply threads, and distinct All/Discussion colors; sample-account checks passed on desktop, tablet, and phone
- [x] Remove events, leaderboard, and recordings from the right sidebar; live database confirms Trust Vault has 29 posts by Markus only, while other authors' posts are in Accelerator and InnerCircle
- [x] Preserve full posting tools, match message and top bar colors, and clean up the right sidebar; checked with sample accounts on desktop, tablet, and phone
- [x] Match desktop and phone community references while preserving post tools and comments
- [x] Skip mobile Welcome and open an eligible community, keeping VIP/software-only restrictions
- [x] Verify entry rules and desktop/tablet/phone layouts with sample accounts
- [ ] Verify posting with a real account; external unmanaged sign-in prevents authenticated checks

## Welcome Markus AI projects and history
- [x] Replace the overlapping history window with a compact inline list; desktop, tablet, and phone checks confirm it never covers the question box
- [x] Add compact projects, saved chats, and back navigation to welcome chat
- [x] Check project creation, saved chat reopening, follow-ups, search, reload, and layout at desktop, tablet, and phone sizes using mocked services
- [ ] Verify real-account chat saving and replies; external unmanaged sign-in prevents authenticated testing

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

## Oct 22 batch
- [x] Set and test Trust Vault Q&A-only selection; remove 58 wrongly imported Accelerator recordings
- [x] Copy 17 existing PEA community recording posts into Trust Vault with original dates and add immediate future-post mirroring
- [x] Rename programs (Legacy InnerCircle, Trust Vault merge, FBU removed), Markus AI support wording, VIP clients out of PEA lists, Wins show full, post viewers, All chats compacts welcome
- [x] Disable direct Trust Vault Fathom polling in favor of community-post mirroring
