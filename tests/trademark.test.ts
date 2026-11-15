import { test, expect } from 'bun:test';
import { addTrademarks } from '../src/lib/trademark';
test('TruHeirs and Markus AI get a trademark mark once', () => {
  expect(addTrademarks('Welcome to TruHeirs and Markus AI')).toBe('Welcome to TruHeirs™ and Markus AI™');
  expect(addTrademarks('TruHeirs™')).toBe('TruHeirs™');
});
