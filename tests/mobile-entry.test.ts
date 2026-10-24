import { test, expect } from 'bun:test'
import { mobileEntryPath } from '../src/lib/mobile-entry'

test('mobile Trust Vault members enter their community instead of Welcome', () => {
  expect(mobileEntryPath({ programName: 'The Trust Vault', isAdminOrOwner: false })).toBe('/workspace-community?program=tfv')
})
test('mobile Accelerator members enter their assigned community', () => {
  expect(mobileEntryPath({ programName: 'The Private Estate Accelerator', isAdminOrOwner: false })).toBe('/workspace-community?program=tfba')
})
test('VIP clients never enter an Accelerator community', () => {
  expect(mobileEntryPath({ programName: 'The Private Estate Accelerator (VIP Weekend)', isAdminOrOwner: false, lastCommunity: 'tfba' })).toBe('/protection-workbook')
})
test('software-only clients retain DFO-only entry', () => {
  expect(mobileEntryPath({ isAdminOrOwner: false, softwareOnly: true, programs: ['tfv'] })).toBe('/dashboard')
})
test('last community is reused only when eligible', () => {
  expect(mobileEntryPath({ programName: 'The Trust Vault', isAdminOrOwner: false, lastCommunity: 'tffm' })).toBe('/workspace-community?program=tfv')
})
test('owners can return to their last community', () => {
  expect(mobileEntryPath({ isAdminOrOwner: true, lastCommunity: 'tfba' })).toBe('/workspace-community?program=tfba')
})