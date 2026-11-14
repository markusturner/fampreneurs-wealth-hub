import { describe, expect, it } from 'vitest'
import { stripDeliveryCues } from '../src/lib/voice-transcript'

describe('stripDeliveryCues', () => {
  it('removes bracketed narration from the transcript', () => {
    expect(stripDeliveryCues('[warmly] Hey, what is going on. [smiling] How can I help?')).toBe('Hey, what is going on. How can I help?')
  })
  it('returns empty text when the line is only a cue', () => {
    expect(stripDeliveryCues('[chuckles]')).toBe('')
  })
})
