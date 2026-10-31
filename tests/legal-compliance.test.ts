import { test, expect } from 'bun:test'
import { ageOn, isAdult, isConsentExemptRoute } from '../src/lib/legal'

const today = new Date(Date.UTC(2026, 9, 31)) // Oct 31 2026

test('someone who turns 18 today can sign up', () => {
  expect(isAdult('2008-10-31', today)).toBe(true)
})

test('someone who turns 18 tomorrow is blocked', () => {
  expect(isAdult('2008-11-01', today)).toBe(false)
  expect(ageOn('2008-11-01', today)).toBe(17)
})

test('a 13 year old is blocked', () => {
  expect(isAdult('2013-05-01', today)).toBe(false)
})

test('invalid or missing birth dates are blocked', () => {
  expect(isAdult('', today)).toBe(false)
  expect(isAdult('2000-02-30', today)).toBe(false)
  expect(isAdult('2030-01-01', today)).toBe(false)
})

test('legal pages stay readable before accepting terms, app pages do not', () => {
  expect(isConsentExemptRoute('/privacy-policy')).toBe(true)
  expect(isConsentExemptRoute('/terms-of-service')).toBe(true)
  expect(isConsentExemptRoute('/welcome')).toBe(false)
  expect(isConsentExemptRoute('/workspace-community')).toBe(false)
})
