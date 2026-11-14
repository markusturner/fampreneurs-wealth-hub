// Removes spoken delivery cues like "[warmly]" or "[chuckles]" so call transcripts show only the words.
export function stripDeliveryCues(text: string): string {
  return text.replace(/\[[^\]\n]{1,40}\]/g, '').replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').trim()
}
