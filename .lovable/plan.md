# Build Plan

Five separate changes. I'll confirm a couple of decisions first so I don't go the wrong way.

---

## 1) Admin Metrics — "#1 Reason People Joined"

Add a new card above the Course Completion section on the Metrics tab that analyzes all `onboarding_responses` and surfaces the top reason people decided to work with us.

- Pull from fields: `decision_reason`, `investment_reason`, `why_markus`, `why_choose_me`, `final_push`, `join_elaboration`.
- Group similar themes using simple keyword clustering (family, legacy, trust, protection, taxes, business, kids/children, freedom, generational, mentorship, community, Markus, results, etc.).
- Show: #1 reason (theme + sample quotes), then runner-ups #2 and #3, and total responses analyzed.
- Live data — re-queries on tab open.

---

## 2) Auto-link SOPs ↔ Course Lessons by Name

Add a lightweight name-match link so an SOP and a lesson with the same / very similar title surface each other.

- New table `sop_lesson_links` (sop_id, lesson_id, link_type: 'auto'|'manual').
- Background match on save (both sides): normalize titles (lowercase, strip punctuation) and link when titles match or one contains the other.
- On the **SOP page**: show a "Linked Lessons" section listing matched lessons with a link to open them.
- On the **Lesson page Resources section**: show linked SOPs as clickable resource cards.
- Admins/Owners can manually link/unlink from either side.

**Decision needed:** Should match be exact-title only, or fuzzy (e.g. "Trust Funding" ↔ "How to Fund Your Trust")? I'd default to **fuzzy + normalized contains**, with a manual override.

---

## 3) Restrict SOPs to TFV, TFBA, TFFM (program-gated visibility)

- Add `program_tags text[]` to `sops` (values: 'tfv', 'tfba', 'tffm').
- Sidebar "SOPs & Playbooks" link only shows for users in at least one of those 3 programs (or admin/owner).
- `/sops` list filters to SOPs tagged with a program the user belongs to.
- `/sops/:id` view: blocked if user is not in any of the SOP's tagged programs (admin/owner bypass).
- Editor (admin/owner) gets a multi-select for which programs see each SOP.

---

## 4) Succession Planning page + sidebar button

- Add new sidebar item **"Succession Planning"** styled like Trust Creation but using a distinct on-brand color (proposing a deep emerald/teal `hsl(160 60% 35%)` so it's clearly different from AI Chat blue and Trust Creation gold).
- New page `/succession-planning`.
- **Move** the Family Legacy Meeting section (component `FamilyLegacyMeetingUploads`) off the Trust Creation page and onto the new Succession Planning page. (Trust Creation will no longer show it.)

---

## 5) Per-program lesson/module locking + rename FFM → "The Succession Society"

**Rename FFM group:**
- In `community_groups`, rename "The Family Fortune Mastermind" → "The Succession Society".
- Update all program-name mappings, admin settings labels, signup labels, triggers, and any hardcoded strings to display "The Succession Society" for `tffm`. Underlying program code stays `tffm` so existing data still works.

**Per-program locking on courses (Legacy Launchpad / Team course):**
- Add `required_programs text[]` to `course_modules` and `course_lessons`.
- If set, only members of one of those programs (or admin/owner) can open it — others see it greyed out with a 🔒 and an "Available to {Program Name} members" message.
- Admin UI: on the module/lesson edit dialogs add a "Restrict to programs" multi-select (FBU, TFV, TFBA, TFFM/Succession Society).
- Pre-assign: Legacy Launchpad **modules 7, 8, 9, 10** → restricted to `tffm` (Succession Society) only.

---

## Questions before I build (please answer):

1. **SOP↔Lesson matching:** fuzzy contains-match (recommended) or exact title only?
2. **Succession Planning page color:** emerald/teal as I proposed, or pick another (e.g. burgundy, copper, forest)?
3. **FFM rename:** rename everywhere user-facing (community channel, badges, dropdowns, admin tabs) — confirm you want the program code to stay `tffm` internally so we don't break Stripe/onboarding mappings?
4. **Legacy Launchpad locking:** confirm modules 7–10 lock means **the entire module and all its lessons** are locked to non-TFFM members.
