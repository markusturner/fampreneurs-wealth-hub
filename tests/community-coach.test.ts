import { expect, test } from 'bun:test'
import { withCoachMarkus } from '../src/lib/community-coach'

test('Coach Markus is restored for previously saved category lists', () => {
  const categories = [{ label: 'Wins', value: 'wins', emoji: '' }]
  expect(withCoachMarkus(categories).map(category => category.value)).toEqual(['wins', 'coach'])
  expect(categories).toHaveLength(1)
})

test('Coach Markus has one stable category even with an old custom category', () => {
  const categories = [{ label: 'Coach Markus', value: 'cat-old', emoji: '' }, { label: 'Coach Markus', value: 'coach', emoji: '' }]
  expect(withCoachMarkus(categories)).toEqual([{ label: 'Markus AI', value: 'coach', emoji: '' }])
})