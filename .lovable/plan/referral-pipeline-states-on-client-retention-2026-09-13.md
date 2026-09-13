# Referral Pipeline States on Client Retention

Handle the middle case: a client gave referrals, but none have closed yet (e.g. DeAndre Jenkins gave 5).

## What changes

1. **Detect referral counts from notes** (`analyzeNotes` in `src/pages/ClientRetention.tsx`)
   - New patterns catch phrases like "gave me 5 referrals", "sent 2 referrals", "referred 3 people".
   - Track two numbers per client: referrals given and referrals closed/converted.
   - Notes like "already referred me to..." count as "given"; "paid/closed/converted referral" counts as "closed".

2. **Three referral badges instead of two**
   - `Ask for referral` (gold) — strong client, no referrals yet, trust not finished. Unchanged.
   - `Referral in progress` (sky blue) — gave referrals, none closed yet. Replaces the "ask" badge so you follow up on the open ones instead of asking again.
   - `Successful referral` (green) — at least one referral closed. Unchanged.
   - Badges show on board cards, table rows, and the client popup.

3. **Draft message adapts**
   - Referrals in progress: the auto-drafted message becomes a referral follow-up ("How did it go with the folks you sent over? Anything I can do to help them get started?") instead of a new referral ask.

4. **Small score boost**
   - Giving referrals (even unclosed) counts as engagement and adds a modest boost, but does not by itself move a client to Expansion Ready — trust completion still rules that section.

## Technical notes

- All changes in `src/pages/ClientRetention.tsx` (`analyzeNotes`, `guidanceFor`, badge renders, `referralPipeline` on the client type).
- No database changes — everything is read from the existing notes text.
- Verify with `bunx tsgo --noEmit -p tsconfig.json`.
