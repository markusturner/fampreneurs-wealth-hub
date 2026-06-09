# Client Retention Page (Admin)

A new admin-only page at `/client-retention` (sidebar entry placed right after Admin Settings) that scores every active client into **At Risk / Slipping / Stable / Expansion Ready**, surfaces a daily action queue, and drafts the exact outreach message to send — modeled after the Latch AI screens.

## Inputs (signals used to score health)

Pulled from existing Supabase tables — no new external integrations required up front:

- **Zoom group coaching attendance** → `meetings` + `session_attendance` (consecutive missed calls, last attended date).
- **Fathom accountability + Trust coaching calls** → `call_recordings` + `coaching_call_recordings` (last recording, presence trend).
- **Community engagement** → `community_posts`, `community_comments`, `community_reactions`, `direct_messages`, `group_messages` (last post date, posting frequency drop, response latency).
- **Trust Creation progress** → `trust_submissions` + `trust_page_locks` (stalled steps, days since last update, missing Schedule B / funding step).
- **Succession Planning progress** → `succession_progress` (stalled items, completion %, days since last activity).
- **Billing / renewal window** → `subscribers` + `user_payment_plans` (days until renewal, overdue payment flags).

## Program duration windows (drives renewal & expansion timing)

- **TFV (Family Vault)** — 6-month track.
- **TFBA (Family Business Accelerator)** — **3 months**.
- **TFFM (The Succession Society)** — **12 months**.

FBU and TruHeirs Lite members are excluded from the retention scoring (community-only tiers). "Renewal Due" + "Expansion Ready" triggers fire inside the last 30 days of each program's duration window.

## Health Score & Categories

Each client gets a **1–10 score** (one decimal place), recomputed on page load (cached 1h in `client_health_snapshots`):

| Status | Score | Trigger examples |
|---|---|---|
| At Risk (red) | 1.0 – 3.9 | Missed 3+ coaching calls, no community activity 21+ days, trust progress stalled 14+ days, overdue payment, login gap 18+ days |
| Slipping (orange) | 4.0 – 6.4 | Missed 1–2 calls, response time doubled, posting cadence dropped 50%, trust step stuck 7–13 days |
| Stable (green) | 6.5 – 8.4 | On cadence, active in community, trust/succession moving forward |
| Expansion Ready (purple) | 8.5 – 10.0 | Trust fully funded, high engagement, posted a win, OR inside last 30 days of their program window (TFBA day 60+, TFFM day 335+) |

Weighted sum on the 1–10 scale: attendance 25%, community 20%, trust progress 20%, succession progress 15%, response time 10%, tenure/renewal proximity 10%. Weights live in a tunable `client_health_weights` config row.

## Page Layout (mirrors the Latch screens)

### Tabs: Today · Movement · Wins

**Top banner** — "{N} clients need attention. Here's what Client Retention is doing." Lists at-risk + slipping names with quick tags.

**Client Health Pulse (KPI strip)**
- Average Health Score (x.x / 10, +/- vs last week)
- Active % (engaged last 14d) / Inactive % (no activity 14d+)
- Four counters: At Risk / Slipping / Expansion Ready / Stable (count + $ ARR from plan price)

**Charts row**
- Health Score Trend (6-week line, y-axis 1–10) — from `client_health_snapshots`
- Status Distribution by Week (stacked bar)

**Today's Queue (two-pane)**
- Left: grouped list — *Urgent – Act Today* (At Risk), *Slipping – Watch This Week*, *Renewals Due Within 14 Days*
- Right: selected client → **Signals Detected** (bulleted reasons) + **Drafted Save Play** with `Approve & send` (gold for At Risk, green for recovery), `Edit message`, `Schedule`. Sending writes to `messages` and queues an email via existing `notify-message-email` edge function.

**Wins tab** — "Ready for Referral Ask" + "Ready for Testimonial" cards for Expansion Ready clients, each with drafted message. Upsell ladder: TFV $5k → TFBA $9k → TFFM Succession Society $40k → $45k peer mastermind.

**Autopilot toggle** — when on, approved templates auto-send on schedule (reuses `community-manager-daily-post` pattern). Off by default.

## Message Drafting

New edge function `draft-retention-message` using **Lovable AI gateway** (`google/gemini-3-flash-preview`). Inputs `{ clientId, status, signals[] }`, returns message in the admin's voice. Templates per status follow the transcript examples (empathetic check-in, light re-engagement, referral ask, upsell to next tier, testimonial ask).

## Access & Routing

- Route `/client-retention` in `src/main.tsx`, wrapped in `WithLayout`, gated by `useIsAdminOrOwner` (non-admins → `/dashboard`).
- Sidebar item **"Client Retention"** placed directly after **Admin Settings** in `src/components/layout/AppSidebar.tsx` (dark sidebar styling, gold active highlight).

## Database (new tables)

```text
client_health_snapshots
  id, user_id, score numeric(3,1)  -- 1.0 to 10.0
  status text, signals jsonb,
  arr_value numeric, computed_at timestamptz
  -- one row per client per day for trend charts

client_health_weights         (single-row admin-editable config)
  attendance, community, trust, succession, response, tenure

retention_messages
  id, client_id, status, channel (email|inapp),
  draft text, sent_at, sent_by, response_received_at
```

All three: `GRANT` to `authenticated` + `service_role`, RLS limited to admins/owners via `has_role(auth.uid(), 'admin'|'owner')`.

## Technical Notes

- Scoring runs in new edge function `compute-client-health` (Deno.serve + esm.sh), invoked on page load if latest snapshot >1h old; also scheduled nightly via existing cron pattern.
- Follows light-mode theme. Status colors: red `#ef4444`, orange `#f59e0b`, green `#10b981`, purple `#8b5cf6`. Primary CTAs use brand Gold `#ffb500`.
- Charts use existing `recharts` setup (same as `admin-analytics-overview.tsx`).
- Mobile-responsive; horizontal scroll for the queue table on small screens.

## Out of Scope (v1)
- Direct Fathom API pull for transcript sentiment (would need Fathom connector).
- SMS sending (only email + in-app).
- Per-client custom scoring overrides.