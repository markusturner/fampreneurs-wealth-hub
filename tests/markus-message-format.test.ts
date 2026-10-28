import { expect, test } from 'bun:test'
import { markusThoughts } from '../src/lib/markus-message-format'

test('new and saved replies show one paragraph thought per message', () => {
  expect(markusThoughts('Protect your assets.\n\nChoose your trustees.')).toEqual(['Protect your assets.', 'Choose your trustees.'])
})

test('older single-line breaks become separated paragraphs', () => {
  expect(markusThoughts('First thought.\nSecond thought.')).toEqual(['First thought.', 'Second thought.'])
})

test('lists, headings, code and links are kept together', () => {
  const code = '```js\nconst a = 1;\n\nconst b = 2;\n```'
  expect(markusThoughts(`## Next steps\n\n- Review assets\n- Pick trustees\n\n${code}\n\nRead [the plan](/protection-workbook).`)).toEqual([
    '## Next steps\n\n- Review assets\n- Pick trustees', code, 'Read [the plan](/protection-workbook).',
  ])
})

test('long prose splits at sentence boundaries without losing words', () => {
  const sentence = 'Gather each ownership record and review the details with your family before choosing what you want your team to prepare. '
  const original = sentence.repeat(6).trim()
  const thoughts = markusThoughts(original)
  expect(thoughts).toHaveLength(2)
  expect(thoughts.join(' ')).toBe(original)
})

test('reference links remain resolvable in separate thoughts', () => {
  expect(markusThoughts('Read [guide][plan].\n\nThen ask questions.\n\n[plan]: /protection-workbook')).toEqual([
    'Read [guide][plan].\n\n[plan]: /protection-workbook', 'Then ask questions.\n\n[plan]: /protection-workbook',
  ])
})