# Push delivery follow-up

## Findings (test alert 99cb093e, sent 21:56 UTC)
- Sent to 4 devices: 1 successful, 0 failed, 3 errored.
- Chrome web push: 1 successful. Google accepted it for delivery, but the browser did not report back that it got it ("received" is 0). So it was handed off, not confirmed shown.
- iPhone/iPad: all 3 errored, the same kind of error as this morning's test.

## Next steps (no changes yet)
1. Desktop: owner checks that Chrome is allowed to show alerts in Mac System Settings > Notifications > Google Chrome, and that Focus is off. Then I resend and check "received" again.
2. Phones: look up the exact Apple error in OneSignal for the 3 iOS sign-ups. Most likely the Apple push key in OneSignal is wrong or expired, or these are old test-mode sign-ups. Fix the key or remove the dead sign-ups based on what it shows.
