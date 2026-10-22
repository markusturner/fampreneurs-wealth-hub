import { test, expect } from 'bun:test';
import { isTrustVaultRecording } from '../supabase/functions/ttv-recordings-sync/filter';

test('Trust Vault imports Q&A Accountability Calls', () => {
  expect(isTrustVaultRecording('Q&A Accountability Call')).toBe(true);
  expect(isTrustVaultRecording('Q&A Accountability Calls')).toBe(true);
  expect(isTrustVaultRecording('Markus: Q&A Accountability Call')).toBe(true);
});
test('Trust Vault never imports either Accelerator program', () => {
  expect(isTrustVaultRecording('The Family Business Accelerator')).toBe(false);
  expect(isTrustVaultRecording('Joe: The Private Estate Accelerator')).toBe(false);
  expect(isTrustVaultRecording('Q&A Accountability Call - The Private Estate Accelerator')).toBe(false);
  expect(isTrustVaultRecording('The Trust Vault')).toBe(false);
});