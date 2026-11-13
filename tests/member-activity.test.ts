import { describe, expect, it } from 'vitest'
import { activityGroup, lastActiveLabel } from '../src/lib/member-activity'

const now = new Date(2026, 10, 12, 15, 0, 0)

describe('member activity', () => {
  it('online members are active now', () => {
    expect(activityGroup(null, true, now)).toBe('now')
    expect(lastActiveLabel(null, true, now)).toBe('Active now')
  })
  it('seen since midnight counts as active today', () => {
    expect(activityGroup(new Date(2026, 10, 12, 0, 5).toISOString(), false, now)).toBe('today')
    expect(activityGroup(new Date(2026, 10, 11, 23, 55).toISOString(), false, now)).toBe('earlier')
  })
  it('shows how long ago', () => {
    expect(lastActiveLabel(new Date(2026, 10, 12, 14, 45).toISOString(), false, now)).toBe('15m ago')
    expect(lastActiveLabel(new Date(2026, 10, 12, 12, 0).toISOString(), false, now)).toBe('3h ago')
    expect(lastActiveLabel(new Date(2026, 10, 9, 15, 0).toISOString(), false, now)).toBe('3d ago')
    expect(lastActiveLabel(new Date(2026, 9, 22, 15, 0).toISOString(), false, now)).toBe('3w ago')
  })
})
