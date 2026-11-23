import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const fn = (name: string) => readFileSync(join(__dirname, '..', 'supabase', 'functions', name, 'index.ts'), 'utf8')

// Functions that only our database jobs, other server functions, or admins/owners may call
const internalOnly = [
  'send-push-notification', 'test-program-assignment', 'notify-community-post-email', 'community-manager-reply',
  'community-manager-daily-post', 'community-manager-inactive-checkin', 'autopilot-send-retention', 'send-weekly-survey',
  'pending-users-daily-reminder', 'payment-retry-reminders', 'handoff-reminders', 'process-payment-reminders',
  'send-payment-reminders', 'detect-user-program', 'notify-message-email', 'notify-video-call-start',
  'send-login-credentials', 'send-meeting-reminders', 'send-onboarding-emails', 'send-sms-verification',
  'send-trust-email', 'ttv-recordings-sync', 'family-report', 'test-notifications', 'send-gohighlevel-email',
]

describe('server functions check who is calling', () => {
  for (const name of internalOnly) {
    it(`${name} rejects callers that are not jobs or staff`, () => {
      const src = fn(name)
      expect(src).toContain(`authorizeInternalOrStaff(req, "${name}")`)
    })
  }

  it('test-program-assignment checks the caller before changing any program', () => {
    const src = fn('test-program-assignment')
    expect(src.indexOf('authorizeInternalOrStaff')).toBeLessThan(src.indexOf("update({ program_name"))
  })

  it('only the meeting creator can send meeting alerts', () => {
    expect(fn('notify-meeting-creation')).toMatch(/callerId !== createdBy/)
  })

  it('only staff can send retention emails', () => {
    expect(fn('send-retention-email')).toMatch(/isStaff\(user\.id\)/)
  })

  it('family invites check who added the family member', () => {
    expect(fn('send-family-member-invitation')).toMatch(/memberRow!?\.added_by === callerId/)
  })
})
