import { describe, it, expect } from 'vitest'
import { isMarkusMemberProgram, markusPathAllowed, MARKUS_PLANS, MARKUS_NAV } from '../src/lib/markus-member'

describe('Markus AI members', () => {
  it('prices are $1,000 monthly and $8,997 annual', () => {
    expect(MARKUS_PLANS.monthly.amount).toBe(1000)
    expect(MARKUS_PLANS.annual.amount).toBe(8997)
  })
  it('only Markus-only accounts are restricted', () => {
    expect(isMarkusMemberProgram('Markus AI')).toBe(true)
    expect(isMarkusMemberProgram('The Trust Vault, Markus AI')).toBe(false)
    expect(isMarkusMemberProgram(null)).toBe(false)
  })
  it('allows Markus AI, the family office and the Markus community only', () => {
    expect(markusPathAllowed('/markus-ai', '')).toBe(true)
    expect(markusPathAllowed('/digital-family-office', '')).toBe(true)
    expect(markusPathAllowed('/workspace-community', '?program=markusai')).toBe(true)
    expect(markusPathAllowed('/workspace-community', '?program=tfv')).toBe(false)
    expect(markusPathAllowed('/classroom', '')).toBe(false)
    expect(markusPathAllowed('/trust-creation', '')).toBe(false)
  })
  it('lets Markus members open their own course lessons and Markus tool pages', () => {
    expect(markusPathAllowed('/classroom/abc', '')).toBe(true)
    expect(markusPathAllowed('/markus-ai/memories', '')).toBe(true)
    expect(markusPathAllowed('/markus-ai/skills', '')).toBe(true)
  })
  it('left menu follows the requested order', () => {
    expect(MARKUS_NAV.map((n) => n.label)).toEqual(['Markus AI', 'Voice Call', 'Digital Family Office', 'Community', 'Courses', 'Knowledge Base', 'Memories', 'Skills'])
  })
})

import { mobileEntryPath } from '../src/lib/mobile-entry'
describe('Markus AI member entry', () => {
  it('phones open Markus AI first for Markus-only members', () => {
    expect(mobileEntryPath({ programName: 'Markus AI', isAdminOrOwner: false, softwareOnly: true })).toBe('/markus-ai')
  })
})
