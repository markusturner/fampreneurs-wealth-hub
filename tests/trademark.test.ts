import { test, expect } from 'bun:test';
import { addTrademarks } from '../src/lib/trademark';
test('TruHeirs and Markus AI get a trademark mark once', () => {
  expect(addTrademarks('Welcome to TruHeirs and Markus AI')).toBe('Welcome to TruHeirs™ and Markus AI™');
  expect(addTrademarks('TruHeirs™')).toBe('TruHeirs™');
});

test('emails and web links stay unchanged', () => {
  expect(addTrademarks('Contact support@truheirs.com now')).toBe('Contact support@truheirs.com now');
  expect(addTrademarks('Email privacy@truheirs.com.')).toBe('Email privacy@truheirs.com.');
  expect(addTrademarks('Visit https://truheirs.app/survey/1')).toBe('Visit https://truheirs.app/survey/1');
  expect(addTrademarks('Go to truheirs.app today')).toBe('Go to truheirs.app today');
  expect(addTrademarks('Thanks for joining TruHeirs.')).toBe('Thanks for joining TruHeirs™.');
});
