import { expect, test } from 'bun:test'
import { normalizeSecurityPhone, isSecurityCode } from '../src/lib/two-factor-validation'

test('phone security setup requires an international number', () => {
  expect(normalizeSecurityPhone('+1 (404) 555-1234')).toBe('+14045551234')
  expect(() => normalizeSecurityPhone('4045551234')).toThrow()
  expect(() => normalizeSecurityPhone('+0 123')).toThrow()
})
test('security verification accepts exactly six digits', () => {
  expect(isSecurityCode('123456')).toBe(true)
  expect(isSecurityCode('12345')).toBe(false)
  expect(isSecurityCode('abcdef')).toBe(false)
})