# Push notifications: where it breaks

## Findings (investigation only, no changes made)

1. **Phone sign-ups (push_tokens):** 7 rows, 5 members, all from the iOS app wrapper ("natively"). Newest: Sep 24. IDs are 36 characters long, which is the right format for OneSignal subscription IDs. Phones are signing up, but only 5 members are on the list.
2. **Send function:** It uses **OneSignal**, not Apple's push service directly. It has **zero runs in the last 7 days** and no logs at all, so it is not being called.
3. **Keys:** ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY are both set. The older Apple push keys (APNS_*) are also set, but the function never uses them. The keys' values and validity can't be checked until the function actually runs.
4. **What triggers a push:** Every new row in the notifications list should start a push, and that trigger is on. But **no notifications have been created since Aug 28** (11,696 in total, the newest from Aug 28), even though members kept posting through Oct 2.
5. **App sign-up for alerts:** Runs right after login and asks for permission correctly, through the app wrapper or the OneSignal plugin.
6. **Notification preferences:** There is no preferences table and nothing in the code that blocks pushes.

## The exact break

The two community-post triggers send alerts only to members of a group with a matching name. They still look for the **old group names** ("The Family Business Accelerator", "The Family Vault", "Family Business University", "The Family Fortune Mastermind"). Those groups were renamed (Private Estate Accelerator, Trust Vault, Succession Society, Community), so each search finds 0 members. That means no notification is created, the push trigger never fires, and OneSignal is never called.

## Fix (when approved)

- Update both post triggers to match groups by their current names, and keep the old names as fallbacks.
- Check other database functions for old group names and fix them the same way.
- Send one test post, then confirm a notification is created, the send function runs, and OneSignal reports at least 1 recipient.

## What members should check on their phones

Allow notifications for TruHeirs in iPhone Settings. Turn off Focus or Do Not Disturb. Open the app once while signed in so their phone gets registered.
