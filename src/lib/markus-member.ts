// Markus AI members get Markus AI tools, the Digital Family Office, their own community and their own courses.
export const MARKUS_COMMUNITY = 'markusai'

export const MARKUS_PLANS = {
  monthly: { label: 'Monthly', price: '$1,000', per: 'per month', amount: 1000 },
  annual: { label: 'Annual', price: '$8,997', per: 'per year', amount: 8997 },
} as const
export type MarkusPlan = keyof typeof MARKUS_PLANS

export function isMarkusMemberProgram(programName?: string | null): boolean {
  if (!programName) return false
  const names = programName.split(',').map((n) => n.trim()).filter(Boolean)
  // Only a Markus-only account is restricted; members of other programs keep their access.
  return names.length > 0 && names.every((n) => /^markus ai$/i.test(n))
}

const ALLOWED_PREFIXES = ['/markus-ai', '/dashboard', '/digital-family-office', '/documents', '/family-constitution', '/calendar', '/members', '/investments', '/profile-settings', '/handoff']

export function markusPathAllowed(pathname: string, search: string): boolean {
  if (pathname === '/workspace-community') return new URLSearchParams(search).get('program') === MARKUS_COMMUNITY
  // Course lessons open on the classroom detail page; the full classroom list stays hidden.
  if (pathname.startsWith('/classroom/')) return true
  return ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

// Left navigation for Markus-only members, in the order the owner asked for.
export const MARKUS_NAV = [
  { key: 'chat', label: 'Markus AI', href: '/markus-ai' },
  { key: 'voice', label: 'Voice Call', href: '/markus-ai/voice' },
  { key: 'dfo', label: 'Digital Family Office', href: '/markus-ai/family-office' },
  { key: 'community', label: 'Community', href: '/markus-ai/community' },
  { key: 'courses', label: 'Courses', href: '/markus-ai/courses' },
  { key: 'knowledge', label: 'Knowledge Base', href: '/markus-ai/knowledge' },
  { key: 'memories', label: 'Memories', href: '/markus-ai/memories' },
  { key: 'skills', label: 'Skills', href: '/markus-ai/skills' },
] as const
export type MarkusNavKey = typeof MARKUS_NAV[number]['key']

// Pinned to the bottom of the Markus menu, apart from the main tools.
export const MARKUS_GETTING_STARTED = { label: 'Getting Started', href: '/markus-ai/getting-started' } as const

export const MARKUS_GETTING_STARTED_STEPS: { key: MarkusNavKey; title: string; body: string; action: string; href: string }[] = [
  { key: 'chat', title: 'Say hi to Markus AI', body: 'Ask Markus anything about your family, your assets or your goals. Start simple and go from there.', action: 'Open chat', href: '/markus-ai' },
  { key: 'knowledge', title: 'Add to your Knowledge Base', body: 'Upload notes or files about your family and what you own. Markus uses them to give you better answers.', action: 'Open Knowledge Base', href: '/markus-ai/knowledge' },
  { key: 'dfo', title: 'Set up your Digital Family Office', body: 'List your assets so you can see what you own, what it is worth and what is at risk.', action: 'Open Family Office', href: '/markus-ai/family-office' },
  { key: 'voice', title: 'Try a voice call', body: 'Talk to Markus out loud, just like a phone call. Your call notes save to your chats.', action: 'Start a call', href: '/markus-ai/voice' },
  { key: 'courses', title: 'Watch a course', body: 'Learn the basics of mapping and protecting your family wealth at your own pace.', action: 'Open Courses', href: '/markus-ai/courses' },
  { key: 'community', title: 'Introduce yourself', body: 'Say hello to other members in the private Markus AI community.', action: 'Open Community', href: '/markus-ai/community' },
  { key: 'skills', title: 'Make your own skill', body: 'Create a skill so Markus handles a task the way you like it, every time.', action: 'Open Skills', href: '/markus-ai/skills' },
  { key: 'memories', title: 'Check your memories', body: 'See what Markus remembers about you. You can edit, delete or turn memory off.', action: 'Open Memories', href: '/markus-ai/memories' },
]
