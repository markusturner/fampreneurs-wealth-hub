import { expect, test } from 'bun:test'
import { extraHeadingPositions } from '../src/lib/community-heading-limit'

test('each message allows one heading, not multiple headings', () => {
  expect(extraHeadingPositions([0, 12, 35])).toEqual([12, 35])
  expect(extraHeadingPositions([0])).toEqual([])
  expect(extraHeadingPositions([])).toEqual([])
})