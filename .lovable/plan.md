# Markus AI Landing Page with GoHighLevel

## What you get
- A dark landing page matching your photo: gold eyebrow line, big headline, video box, "What you get" list, Monthly $1,000 and Annual $7,997 price cards.
- Clicking Start Monthly or Start Annual opens a short 2-3 question qualifier (name, email, phone, asset range, biggest concern).
- On submit, the lead goes into GoHighLevel tagged "markusai", with their answers saved on the contact.
- Then they are sent to your GoHighLevel checkout page (monthly or annual) with name, email and phone already filled in.
- A copy of each lead is also saved in the app so nothing is lost if GoHighLevel is down.
- No em dashes or emojis in the page text.

## What I need from you
- Your two GoHighLevel checkout page links (monthly and annual).
- A GoHighLevel Private Integration token and your Location ID (I will ask for these in a secure form).
- The explainer video link, if you have one.

## Web address
- truheirs.markusturnerai.app needs to be connected as a custom domain in Project Settings, Domains. The page will show when people visit that address.
- Until then it will also work at truheirs.app/markus.

## Technical details
- New page `src/pages/MarkusLanding.tsx`, route `/markus`; when hostname is `truheirs.markusturnerai.app`, `/` renders this page.
- New table `markus_leads` (insert via edge function only, admin read).
- New edge function `markus-lead`: validates input, stores the lead, upserts GHL contact via `services.leadconnectorhq.com/contacts/upsert` with tag `markusai` and notes, returns redirect URL.
- Redirect appends `?name=&email=&phone=` so GHL order forms prefill.
- Secrets: `GHL_PRIVATE_TOKEN`, `GHL_LOCATION_ID`.
