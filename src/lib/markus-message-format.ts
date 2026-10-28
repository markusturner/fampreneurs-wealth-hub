import { unified } from 'unified'
import remarkParse from 'remark-parse'

const parser = unified().use(remarkParse)

/** Presentation only: saved replies and the context sent to AI remain untouched. */
export function markusThoughts(content: string): string[] {
  if (!content.trim()) return []
  const tree = parser.parse(content)
  const definitions = tree.children.filter(node => node.type === 'definition')
    .map(node => content.slice(node.position?.start.offset, node.position?.end.offset)).join('\n')
  const thoughts: string[] = []
  let heading = ''

  for (const node of tree.children) {
    if (node.type === 'definition') continue
    const source = content.slice(node.position?.start.offset, node.position?.end.offset).trim()
    if (node.type === 'heading') {
      heading += `${source}\n\n`
      continue
    }
    let parts = [source]
    if (node.type === 'paragraph') {
      // Soft line breaks in older replies become visibly separate paragraphs.
      parts = source.split(/\n+/).filter(Boolean)
      // Break up dense plain prose, never cut a Markdown link or formatting span.
      if (node.children.every(child => child.type === 'text')) {
        parts = parts.flatMap(paragraph => {
          if (paragraph.length <= 420) return [paragraph]
          const sentences = Array.from(new Intl.Segmenter('en', { granularity: 'sentence' }).segment(paragraph), item => item.segment)
          const chunks: string[] = []
          for (let i = 0; i < sentences.length; i += 3) chunks.push(sentences.slice(i, i + 3).join('').trim())
          return chunks
        })
      }
    }
    // Lists, code, quotes and their internal paragraphs stay intact.
    parts.forEach(part => {
      thoughts.push(`${heading}${part}${definitions ? `\n\n${definitions}` : ''}`)
      heading = ''
    })
  }
  if (heading) thoughts.push(heading.trim())
  return thoughts
}