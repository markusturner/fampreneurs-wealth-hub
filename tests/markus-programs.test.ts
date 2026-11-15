import { test, expect } from 'bun:test';
import { MARKUS_TRUST_PROGRAMS, MARKUS_TRUST_RULE } from '../supabase/functions/_shared/markus-programs';

test('trust answers offer only The Private Estate Accelerator and The VIP Weekend Mastermind', () => {
  expect(MARKUS_TRUST_PROGRAMS.map((p) => p.name)).toEqual(['The Private Estate Accelerator', 'The VIP Weekend Mastermind']);
});

test('The Private Estate Accelerator is $12,000 and The VIP Weekend Mastermind is $45,000', () => {
  expect(MARKUS_TRUST_PROGRAMS[0].price).toBe('$12,000');
  expect(MARKUS_TRUST_PROGRAMS[1].price).toBe('$45,000');
});

test('trust answers never present The Trust Vault as an option', () => {
  expect(MARKUS_TRUST_RULE).not.toContain('- The Trust Vault');
  expect(MARKUS_TRUST_RULE).toContain('Never mention The Trust Vault');
});
