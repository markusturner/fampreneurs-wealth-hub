import { expect, test } from 'bun:test'
import { hasEveryoneMention, postingCategory } from '../src/lib/community-posting'

test('messages follow each selected community category', () => {
  for (const category of ['discussion', 'wins', 'updates', 'gems', 'recordings', 'custom-category']) {
    expect(postingCategory(category, 'discussion')).toBe(category)
  }
})

test('All keeps the composer category instead of broadcasting to other communities', () => {
  expect(postingCategory('all', 'wins')).toBe('wins')
})

test('Coach Markus is never a public posting destination', () => {
  expect(postingCategory('coach', 'discussion')).toBe('discussion')
})

test('@everyone works with punctuation, capitalization and rich text', () => {
  for (const content of ['@everyone hello', 'Hi @EVERYONE!', '<p><strong>@everyone</strong></p>']) {
    expect(hasEveryoneMention(content)).toBe(true)
  }
})

test('@everyone does not match email addresses or longer handles', () => {
  for (const content of ['name@everyone.com', '@everyones', '@@everyone', 'hello everyone']) {
    expect(hasEveryoneMention(content)).toBe(false)
  }
})