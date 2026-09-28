# Keep TruHeirs subscribers: card updates, Family Report, and Pause

Done already: the Family Trust circle on the ownership map is now yellow (#ffb500).

## 1. Card updates and 3 retry emails
- In your Stripe dashboard, turn on: automatic card updates, Smart Retries (3 tries), and failed-payment emails to customers. I will give you the exact clicks.
- In the app, a "Update card" button on the account page opens Stripe's secure billing page.
- A daily check sends up to 3 branded reminder emails (day 1, 3, 7) when a payment fails, each with the update-card link.

## 2. Quarterly Family Report email
- Sent to each TruHeirs subscriber the first week of every quarter.
- Shows: net worth change vs last quarter, trust progress, family activity (members, documents, meetings), and next steps.
- Owner/admin can send a test report to themselves from Admin Settings.

## 3. Pause instead of cancel ($29/mo)
- New $29/mo "TruHeirs Paused" price in Stripe.
- The cancel button becomes "Pause or cancel": Pause is shown first; Cancel stays available below it.
- Paused: no app access, all data kept. Sign-in shows "Your account is paused" with a Resume button that switches back to the normal plan.
- Client Retention shows paused clients with a "Paused" badge.

## Technical details
- Edge functions: `billing-portal`, `pause-subscription`, `resume-subscription`, `payment-retry-reminders` (daily cron), `family-report` (quarterly cron). Emails go through your existing Resend setup.
- Stripe: swap subscription item price for pause/resume; read `invoice.payment_failed` via Stripe API in the daily check.
- DB: add `subscription_paused` + `paused_at` to profiles, `payment_reminders_sent` reuse for the 3 emails, `family_report_log` table (with grants + RLS).
- Access gate in AppLayout treats paused as locked.
