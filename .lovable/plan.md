# Markus AI Landing Page with Built-in Checkout and GoHighLevel

## What you get
- A dark landing page matching your photo: gold eyebrow line, big headline, video box, "What you get" list, Monthly $1,000 and Annual $8,997 price cards.
- Clicking Start Monthly or Start Annual opens our own checkout page: name, email, phone, the 2-3 qualifier questions (asset range, biggest concern), then card payment.
- Payments run through your existing Stripe account as a monthly or yearly subscription.
- Every lead goes into GoHighLevel tagged "markusai" with name, email, phone, plan picked and qualifier answers, even if they do not finish paying.
- When they pay, the GoHighLevel contact also gets a "markusai-paid" tag and the plan details.
- A copy of each lead and payment is saved in the app so nothing is lost.
- A thank-you page after payment.
- No em dashes or emojis in the page text.

## What I need from you
- GoHighLevel token and Location ID: received, will be stored securely.
- Explainer video: you will send it later; the page shows a placeholder until then.

## Web address
- The page lives at truheirs.app/markusturnerai. No new domain setup needed.

## Technical details
- Pages: `src/pages/MarkusLanding.tsx` (/markusturnerai), `MarkusCheckout.tsx` (/markusturnerai/checkout?plan=), `MarkusThankYou.tsx` (/markusturnerai/thank-you); public routes, no login.
- Stripe: create products "Markus AI Monthly" $1,000/mo and "Markus AI Annual" $8,997/yr; edge function `markus-checkout` creates a Stripe Checkout session prefilled with the customer email.
- Edge function `markus-lead`: validates input, inserts into new `markus_leads` table (service-role insert, admin read), upserts GHL contact via `services.leadconnectorhq.com/contacts/upsert` with tag `markusai` and notes.
- Stripe webhook (existing or new) marks lead paid and adds `markusai-paid` tag in GHL.
- Secrets: `GHL_PRIVATE_TOKEN`, `GHL_LOCATION_ID`.
