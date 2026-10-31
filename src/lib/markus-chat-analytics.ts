export type ChatRow = { user_id: string; role: string; content: string; created_at: string }

export const TOPICS: { label: string; words: RegExp }[] = [
  { label: 'Setting up trusts', words: /\b(trusts?|irrevocable|revocable|trustee|grantor|beneficiar(y|ies)|settlor)\b/i },
  { label: 'Asset protection', words: /\b(asset protection|protect(ing|ion)? (my )?assets|lawsuit|creditors?|sued|liability)\b/i },
  { label: 'Taxes', words: /\b(tax(es)?|irs|ein|deduct(ion|ions)?|write.?offs?|capital gains|1099|w-?2|estate tax)\b/i },
  { label: 'Business and LLC structure', words: /\b(llc|corporation|s.?corp|c.?corp|business entity|holding company|operating agreement)\b/i },
  { label: 'Estate and succession planning', words: /\b(will|estate plan(ning)?|succession|inherit(ance)?|heirs?|probate|legacy|pass (it )?down)\b/i },
  { label: 'Real estate', words: /\b(real estate|property|properties|house|home|deed|mortgage|rental)\b/i },
  { label: 'Banking and credit', words: /\b(bank(ing)?|bank account|credit|loan|debt|business credit)\b/i },
  { label: 'Insurance', words: /\b(insurance|life policy|whole life|iul|annuit(y|ies))\b/i },
  { label: 'Investing and wealth growth', words: /\b(invest(ing|ment|ments)?|stocks?|crypto|bitcoin|portfolio|gold|silver|commodit(y|ies)|retirement|401k|ira)\b/i },
  { label: 'Family and governance', words: /\b(family (meeting|constitution|office|governance)|kids|children|spouse|wife|husband|family members?)\b/i },
]

export function topicsOf(text: string): string[] {
  return TOPICS.filter(t => t.words.test(text)).map(t => t.label)
}

export function analyzeChats(rows: ChatRow[], now = new Date()) {
  const asks = rows.filter(r => r.role === 'user')
  const day = 86400000
  const topicCount = new Map<string, number>()
  for (const r of asks) for (const t of topicsOf(r.content)) topicCount.set(t, (topicCount.get(t) || 0) + 1)
  const topTopics = [...topicCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count]) => ({ label, count, share: asks.length ? count / asks.length : 0 }))

  const users = new Set(asks.map(r => r.user_id))
  const within = (d: number) => new Set(asks.filter(r => now.getTime() - new Date(r.created_at).getTime() <= d * day).map(r => r.user_id)).size
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const weekdays = new Array(7).fill(0)
  for (const r of asks) weekdays[new Date(r.created_at).getDay()]++
  const busiest = asks.length ? weekdayNames[weekdays.indexOf(Math.max(...weekdays))] : '-'

  const weeks: { label: string; count: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const end = now.getTime() - i * 7 * day, start = end - 7 * day
    weeks.push({ label: new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), count: asks.filter(r => { const t = new Date(r.created_at).getTime(); return t > start && t <= end }).length })
  }

  const perUser = new Map<string, number>()
  for (const r of asks) perUser.set(r.user_id, (perUser.get(r.user_id) || 0) + 1)
  const topUsers = [...perUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  return {
    totalQuestions: asks.length,
    totalClients: users.size,
    active7: within(7),
    active30: within(30),
    avgPerClient: users.size ? asks.length / users.size : 0,
    busiestDay: busiest,
    topTopics,
    weeks,
    topUsers,
  }
}
