import { expect, test } from 'bun:test'
import { mentionOptions } from '../src/lib/community-mentions'

const members = [
  { user_id: '1', display_name: "D'Juan Smith", avatar_url: null },
  { user_id: '2', display_name: 'Markus Turner', avatar_url: null },
]
test('@ opens everyone and individual member choices', () => {
  expect(mentionOptions(members, '').map(m => m.display_name)).toEqual(['everyone', "D'Juan Smith", 'Markus Turner'])
})
test('member search is case insensitive and preserves full names', () => {
  expect(mentionOptions(members, "D'JUAN").map(m => m.user_id)).toEqual(['1'])
})
test('everyone can be searched even before members load', () => {
  expect(mentionOptions([], 'every').map(m => m.user_id)).toEqual(['everyone'])
})