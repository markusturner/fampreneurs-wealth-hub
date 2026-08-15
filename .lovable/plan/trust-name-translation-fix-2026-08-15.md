# Trust Name Translation Fix

## Changes
- Show saved names from earlier Business, Ministry, and Family Trust steps in the translator.
- Keep the saved history after refresh by loading prior trust-name submissions.
- Update translation instructions so French, Spanish, and Portuguese translate descriptive trust-name words while preserving true proper names.

## Technical details
- Extend the translator state and save flow with per-trust history records.
- Update and deploy the existing translation edge function, then test it with a real request.
