

## Notification System — Production-Ready Implementation

### Summary of Issues Found

1. **No `link` column** on the `notifications` table — navigation is hardcoded in the bell component
2. **No browser notifications** — Web Notifications API not wired up
3. **Feedback & checkin edge functions insert into `family_notifications`** (wrong table!) instead of `notifications` — so they never appear in the bell or trigger push
4. **No `tutorial_reminder` edge function** exists at all
5. **Push notification payload** lacks `link` for deep linking
6. **All DB triggers** (`notify_community_post`, `notify_direct_message`, etc.) don't set a `link` value
7. **`video_call_started`** is manually triggered via an edge function (not a DB trigger) — this is fine but needs `link` added

### Implementation Steps

#### Step 1 — Database Migration: Add `link` column

Add `link TEXT` to the `notifications` table. Update all 7 existing DB trigger functions to populate it:

| Trigger | Link Value |
|---|---|
| `notify_community_post` | `/workspace-community?program=<program>` |
| `notify_direct_message` | `/messenger` |
| `notify_group_message` | `/community` |
| `notify_meeting_created` | `/workspace-calendar` |
| `notify_course_created` | `/classroom` |
| `notify_new_member` | `/workspace-members` |
| `notify_trust_created` | `/workspace-community?program=tfv` |

Also add logging: each trigger will `RAISE LOG` with the notification type, recipient, and reference_id.

#### Step 2 — Fix Edge Functions

**`feedback-notifications`** and **`weekly-checkin-notifications`**: Change from inserting into `family_notifications` to inserting into `notifications` (with `sender_id`, `link`). This ensures they appear in the bell and trigger push.

**`notify-video-call-start`**: Add `link: '/community'` to the notification insert.

**`send-push-notification`**: Accept and forward `link` in the APNs payload for deep linking. Log every dispatch attempt with user_id, type, and result.

#### Step 3 — Create Tutorial Reminder Edge Function

New edge function `send-tutorial-reminder` that inserts into `notifications` with:
- `notification_type: 'tutorial_reminder'`
- `title: 'Watch Your Tutorial Video'`
- `message: 'Complete your tutorial video to get the most out of TruHeirs.'`
- `link: '/tutorial-videos'`
- `sender_id`: the admin user_id calling the function

#### Step 4 — Browser Notifications (useNotifications.ts)

- On mount, request `Notification.permission` if not already granted
- On real-time INSERT event, check `document.visibilityState !== 'visible'` before firing `new Notification()`
- This prevents duplicate in-app + browser alerts when the user is actively looking at the app
- On browser notification click: `window.focus()` then navigate to `notification.link`
- Add the `link` field to the `Notification` TypeScript interface

#### Step 5 — Update Notification Bell (notification-bell.tsx)

- Simplify `handleNotificationClick` to use `notification.link` when available, with fallback to current type-based routing
- Remove the `postProgramCache` logic since `link` is now pre-computed
- Dialog-based types (`satisfaction_survey`, `weekly_checkin`, `tutorial_reminder`) continue to open dialogs instead of navigating

#### Step 6 — Update Push Notification Client (push-notifications.ts)

- On notification tap, use `data.link` for navigation with fallback to current type-based routing

#### Step 7 — Generate Reference Document

Create both `/mnt/documents/notification-system-reference.md` and `.pdf` documenting all 11 types with trigger source, recipients, content, link, delivery channels, and logging behavior.

### Files Changed

| File | Change |
|---|---|
| Migration SQL | Add `link` column, update 7 trigger functions with `link` + logging |
| `supabase/functions/feedback-notifications/index.ts` | Insert into `notifications` instead of `family_notifications`, add `link` |
| `supabase/functions/weekly-checkin-notifications/index.ts` | Same fix |
| `supabase/functions/notify-video-call-start/index.ts` | Add `link` to notification insert |
| `supabase/functions/send-push-notification/index.ts` | Accept `link`, include in APNs payload, add logging |
| New: `supabase/functions/send-tutorial-reminder/index.ts` | New edge function |
| `src/hooks/useNotifications.ts` | Add browser notification support with visibility check + click handler |
| `src/components/dashboard/notification-bell.tsx` | Use `link` field for navigation |
| `src/lib/push-notifications.ts` | Use `data.link` for deep linking |
| `/mnt/documents/notification-system-reference.md` | Reference document |
| `/mnt/documents/notification-system-reference.pdf` | PDF version |

