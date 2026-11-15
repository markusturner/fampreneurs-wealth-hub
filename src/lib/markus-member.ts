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
