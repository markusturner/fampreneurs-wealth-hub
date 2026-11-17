import { describe, it, expect } from 'vitest'
import { hasMarkusCommunityAccess } from '../src/lib/markus-member'

describe('Markus AI community access', () => {
  it('lets a Markus-only member open the Markus AI Members community', () => {
    expect(hasMarkusCommunityAccess('Markus AI')).toBe(true)
  })
  it('lets a member with Markus AI plus another program open it', () => {
    expect(hasMarkusCommunityAccess('The Trust Vault, Markus AI')).toBe(true)
  })
  it('allows access when the server lists markusai', () => {
    expect(hasMarkusCommunityAccess('The Trust Vault', ['tfv', 'markusai'])).toBe(true)
  })
  it('keeps other program members out', () => {
    expect(hasMarkusCommunityAccess('The Private Estate Accelerator', ['fbu', 'tfv', 'tfba'])).toBe(false)
  })
})
