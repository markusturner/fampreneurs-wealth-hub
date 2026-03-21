

## Enable Native Push Notifications

Since you already configured push notifications in BuildNatively (APNs certificates, capabilities, etc.), the only missing pieces are on the code side:

1. **The app never registers for push notifications** — `@capacitor/push-notifications` is installed but never imported or used
2. **No device token storage** — when Apple gives your app a device token, it needs to be saved so the server can send pushes to it
3. **No server-side push sending** — when a notification row is inserted in the database, nothing sends it to Apple's servers

### Step 1: Create `push_tokens` table (Migration)

Create a table to store device tokens:
- `id` (uuid, PK)
- `user_id` (uuid, references auth.users, not null)
- `token` (text, not null)
- `platform` (text — 'ios' or 'android')
- `created_at`, `updated_at`
- Unique constraint on `(user_id, token)` to avoid duplicates
- RLS: users can only insert/update/delete their own tokens

### Step 2: Create `src/lib/push-notifications.ts`

- Import `PushNotifications` from `@capacitor/push-notifications`
- Accept a `userId` parameter (called after auth)
- Request permission, register with Apple
- On `registration` event: upsert the token into `push_tokens` table
- On `pushNotificationReceived` (foreground): show in-app toast
- On `pushNotificationActionPerformed` (tapped): navigate to the relevant page based on notification data

### Step 3: Initialize push after authentication

- In `src/lib/mobile.ts` or `src/contexts/AuthContext.tsx`: after user is authenticated and on a native platform, call the push notification setup with the user's ID
- This ensures tokens are always fresh and tied to the correct user

### Step 4: Create `send-push-notification` edge function

- Triggered by a database webhook on `notifications` table INSERT
- Looks up the target user's device token(s) from `push_tokens`
- Sends the push via **APNs HTTP/2** using the APNs auth key
- Requires secrets: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APP_BUNDLE_ID`

### Step 5: Add database webhook trigger

- Add config in `supabase/config.toml` for the new edge function
- Create a database trigger on `notifications` INSERT that calls the edge function via `pg_net`

### What You'll Need to Provide

Since BuildNatively handles the Apple side, you'll need to add 4 secrets to Supabase:
- **APNS_KEY_ID** — from the APNs key you created in Apple Developer
- **APNS_TEAM_ID** — your Apple Developer Team ID
- **APNS_PRIVATE_KEY** — the `.p8` file contents from Apple
- **APP_BUNDLE_ID** — your app's bundle ID (likely `app.lovable.27136ee712594a9a98641109582fab4d`)

### Technical Details

**Files to create:**
- `supabase/migrations/add_push_tokens.sql` — new table + RLS
- `src/lib/push-notifications.ts` — Capacitor push setup
- `supabase/functions/send-push-notification/index.ts` — APNs sender

**Files to modify:**
- `src/contexts/AuthContext.tsx` — call push init after auth
- `src/lib/mobile.ts` — export helper
- `supabase/config.toml` — register new edge function

**Flow:**
```text
User opens app → Capacitor requests permission → Apple returns token
  → Token saved to push_tokens table

New notification inserted → DB trigger → send-push-notification edge function
  → Lookup token → Send to APNs → User's phone buzzes
```

